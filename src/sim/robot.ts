/**
 * Robot agent. Each robot is fully self-contained.
 * v2: conditional broadcast (COMM_HORIZON=4), comm_events counter, mode-aware.
 */

import { astar } from './astar';
import { Warehouse } from './warehouse';
import { chooseReciprocalCell } from './localAvoidance';
import type { ReservationTable } from './reservation';
import type { NetworkBus, StateMsg } from './network';
import type { Task } from './tasks';
import type { Pos, RobotLifecycleState, SimEvent } from './types';
import {
  DEFAULT_DECISION_DEBUG,
  formatPriority,
  resourceIdForMove,
  type DecisionDebug,
  type PriorityClaim,
  type ResourcePhase,
} from './coordination';

export const MAX_BATTERY = 100.0;
export const BATTERY_DRAIN_PER_MOVE = 0.35;
export const BATTERY_DRAIN_IDLE = 0.02;
export const COMM_HORIZON = 4; // v2: only broadcast within this many Manhattan hops

export interface StepResult {
  id: number;
  event: 'idle' | 'move' | 'wait' | 'stuck' | 'failed' | 'blocked_local';
  pos: Pos;
  arrived_leg?: boolean;
  waiting_on?: number | null;
  prevPos?: Pos;
}

export class Robot {
  readonly id: number;
  readonly priority: number;
  pos: Pos;
  readonly wh: Warehouse;
  readonly bus: NetworkBus;
  readonly res: ReservationTable;
  readonly logEvents: SimEvent[];
  readonly mode: 'harmoni' | 'baseline';

  path: Pos[];
  goal: Pos | null;
  task_id: number | null;
  leg: 'to_pickup' | 'to_dropoff' | null;
  battery: number;
  active: boolean;
  state: RobotLifecycleState;
  waiting_on: number | null;
  consecutive_wait: number;
  taskUrgency: number;
  stats: {
    ticks_waiting: number; ticks_moving: number;
    tasks_completed: number; replans: number;
    comm_events: number; // v2
  };

  private _localAvoid: Set<string>;
  heading: number;
  decisionDebug: DecisionDebug;
  private commitment: {
    resourceId: string;
    from: Pos;
    to: Pos;
    phase: ResourcePhase;
    expiresTick: number;
    lockedUntilTick: number;
    reason: string;
  } | null;

  constructor(
    robotId: number, start: Pos, wh: Warehouse, bus: NetworkBus,
    res: ReservationTable, logEvents: SimEvent[],
    mode: 'harmoni' | 'baseline' = 'harmoni'
  ) {
    this.id = robotId;
    this.priority = robotId;
    this.pos = start;
    this.wh = wh;
    this.bus = bus;
    this.res = res;
    this.logEvents = logEvents;
    this.mode = mode;
    this.path = [start];
    this.goal = null;
    this.task_id = null;
    this.leg = null;
    this.battery = MAX_BATTERY;
    this.active = true;
    this.state = 'idle';
    this.waiting_on = null;
    this.consecutive_wait = 0;
    this.taskUrgency = 0;
    this.stats = { ticks_waiting: 0, ticks_moving: 0, tasks_completed: 0, replans: 0, comm_events: 0 };
    this._localAvoid = new Set();
    this.heading = 0;
    this.decisionDebug = { ...DEFAULT_DECISION_DEBUG };
    this.commitment = null;
  }

  // ── planning ──────────────────────────────────────────────────────────────
  assignTask(task: Task, tick: number): void {
    this.task_id = task.task_id;
    this.taskUrgency = Math.max(1, 1000 - task.task_id);
    this.goal = task.pickup;
    this.leg = 'to_pickup';
    this._planTo(this.goal);
    this.state = 'moving';
    this._setDecision('MISSION', 'GO', 'task assigned', null, null, 'NONE', tick);
  }

  private _planTo(goal: Pos): void {
    const p = astar(this.wh, this.pos, goal, this._localAvoid);
    this.path = p === null ? [this.pos] : p;
  }

  _replan(): void {
    if (this.goal !== null) {
      this._clearCommitment();
      this._planTo(this.goal);
      this.stats.replans++;
    }
  }

  private _priorityClaim(): PriorityClaim {
    return {
      robotId: this.id,
      taskUrgency: this.taskUrgency,
      waitingTicks: this.consecutive_wait,
      progressRemaining: Math.max(0, this.path.length - 1),
    };
  }

  private _setDecision(
    hierarchy_level: DecisionDebug['hierarchy_level'],
    decision: DecisionDebug['decision'],
    reason: string,
    requested: string | null,
    owned: string | null,
    phase: ResourcePhase,
    tick: number
  ): void {
    this.decisionDebug = {
      decision,
      hierarchy_level,
      requested_resource: requested,
      owned_resource: owned,
      resource_phase: phase,
      reason,
      committed_until: this.commitment?.expiresTick ?? null,
      locked: this.commitment !== null && tick <= this.commitment.lockedUntilTick,
      priority_key: formatPriority(this._priorityClaim()),
    };
  }

  private _clearCommitment(): void {
    if (this.commitment) this.res.releaseResource(this.commitment.resourceId, this.id);
    this.commitment = null;
  }

  private _finishCrossingIfNeeded(tick: number): void {
    if (!this.commitment || this.commitment.phase !== 'CROSS') return;
    if (Warehouse.posKey(this.pos) !== Warehouse.posKey(this.commitment.to)) return;
    const resourceId = this.commitment.resourceId;
    this.res.releaseResource(resourceId, this.id);
    this.commitment = null;
    this._setDecision('RESOURCE', 'RELEASE', 'resource released after crossing', null, null, 'RELEASE', tick);
  }

  private _commitmentStillValid(tick: number, occupancy: Map<string, number>): boolean {
    if (!this.commitment) return false;
    const owner = this.res.ownerOfResource(this.commitment.resourceId, tick);
    if (owner !== this.id) {
      this._setDecision('RESOURCE', 'REROUTE', 'resource lease lost', this.commitment.resourceId, null, 'NONE', tick);
      this.commitment = null;
      return false;
    }
    if (tick > this.commitment.expiresTick) {
      this._clearCommitment();
      this._setDecision('RESOURCE', 'REROUTE', 'commitment lease expired', null, null, 'NONE', tick);
      return false;
    }
    if (this.wh.edgeBlocked(this.pos, this.commitment.to) || this._localAvoid.has(Warehouse.edgeKey(this.pos, this.commitment.to))) {
      this._clearCommitment();
      this._replan();
      this._setDecision('SAFETY', 'REROUTE', 'committed path blocked', null, null, 'NONE', tick);
      return false;
    }
    const occupantId = occupancy.get(Warehouse.posKey(this.commitment.to));
    if (occupantId !== undefined && occupantId !== this.id) {
      this.waiting_on = occupantId;
      this._setDecision('SAFETY', 'WAIT', `committed target occupied by AMR #${occupantId}`, this.commitment.resourceId, this.commitment.resourceId, this.commitment.phase, tick);
      return false;
    }
    return true;
  }

  private _findPreemptiveReroute(
    originalNext: Pos,
    occupancy: Map<string, number>,
    peers: Map<number, StateMsg>
  ): Pos | null {
    if (this.goal === null) return null;

    const riskyNodes = new Set<string>([Warehouse.posKey(originalNext)]);
    for (const peer of peers.values()) {
      riskyNodes.add(Warehouse.posKey(peer.intent_next));
      const edgeSwap = Warehouse.posKey(peer.pos) === Warehouse.posKey(originalNext)
        && Warehouse.posKey(peer.intent_next) === Warehouse.posKey(this.pos);
      if (edgeSwap) riskyNodes.add(Warehouse.posKey(peer.pos));
    }

    const ranked = this.wh.neighbors(this.pos)
      .filter(candidate => Warehouse.posKey(candidate) !== Warehouse.posKey(this.pos))
      .filter(candidate => !riskyNodes.has(Warehouse.posKey(candidate)))
      .filter(candidate => !occupancy.has(Warehouse.posKey(candidate)))
      .map(candidate => {
        const suffix = astar(this.wh, candidate, this.goal!, this._localAvoid);
        if (!suffix) return null;
        return {
          candidate,
          suffix,
          score: suffix.length * 10 + Warehouse.dist(candidate, this.goal!),
        };
      })
      .filter((item): item is { candidate: Pos; suffix: Pos[]; score: number } => item !== null)
      .sort((a, b) => a.score - b.score || a.candidate[0] - b.candidate[0] || a.candidate[1] - b.candidate[1]);

    const best = ranked[0];
    if (!best) return null;
    this.path = [this.pos, ...best.suffix];
    return best.candidate;
  }

  // ── comms ─────────────────────────────────────────────────────────────────
  private _nextPlannedNode(): Pos {
    return this.path.length > 1 ? this.path[1] : this.pos;
  }

  /** v2: selective broadcast — only when communication adds value */
  private _shouldBroadcast(peerStates: Map<number, StateMsg>): boolean {
    if (this.mode === 'baseline') return true; // always-on beacon

    // Safety: always broadcast when waiting (needed for deadlock graph)
    if (this.state === 'waiting') return true;
    if (this.commitment !== null || this.state === 'requesting' || this.state === 'committed' || this.state === 'crossing') return true;

    // Broadcast when a peer is within COMM_HORIZON hops
    for (const msg of peerStates.values()) {
      if (Warehouse.dist(this.pos, msg.pos) <= COMM_HORIZON) return true;
    }

    // Broadcast when approaching an intersection
    if (this.wh.isIntersection(this._nextPlannedNode())) return true;

    return false;
  }

  senseAndSync(tick: number): void {
    const events = this.bus.recentObstacleEvents(tick - 1);
    let changed = false;
    for (const e of events) {
      const edgeKey = Warehouse.edgeKey(e.edge[0], e.edge[1]);
      if (e.type === 'blocked' && !this._localAvoid.has(edgeKey)) {
        this._localAvoid.add(edgeKey); changed = true;
      } else if (e.type === 'cleared' && this._localAvoid.has(edgeKey)) {
        this._localAvoid.delete(edgeKey); changed = true;
      }
    }
    if (changed && this.path.length >= 2) {
      const pathEdgeKeys = new Set<string>();
      for (let i = 0; i < this.path.length - 1; i++)
        pathEdgeKeys.add(Warehouse.edgeKey(this.path[i], this.path[i+1]));
      const eventEdgeKeys = new Set(events.map(e => Warehouse.edgeKey(e.edge[0], e.edge[1])));
      for (const k of pathEdgeKeys) { if (eventEdgeKeys.has(k)) { this._replan(); break; } }
    }
  }

  publishState(tick: number): void {
    const peerStates = this.bus.peerStates(this.id, this.pos);
    if (!this._shouldBroadcast(peerStates)) return; // v2: selective broadcast

    const nextNode = this.path.length > 1 ? this.path[1] : this.pos;
    this.bus.publishState(this.id, {
      tick,
      id: this.id,
      pos: this.pos,
      goal: this.goal,
      intent_next: nextNode,
      eta: this.path.length - 1,
      priority: this.priority,
      task_id: this.task_id,
      battery: Math.round(this.battery * 10) / 10,
      state: this.state,
      timestamp: tick,
      ttl: 4,
      confidence: 1.0,
      zone: this.wh.getZone(this.pos),
    });
    this.stats.comm_events++; // v2: track
  }

  getOpticalSignal(): 'normal_green' | 'intent_cyan' | 'conflict_amber' | 'failed_red' {
    if (!this.active) return 'failed_red';
    if (this.state === 'waiting') return 'conflict_amber';
    if (this.stats.comm_events > 0 && this.state === 'moving') return 'intent_cyan';
    return 'normal_green';
  }

  // ── per-tick step ─────────────────────────────────────────────────────────
  step(tick: number, occupancy: Map<string, number>): StepResult {
    if (!this.active) return { id: this.id, event: 'failed', pos: this.pos };

    this.battery = Math.max(0, this.battery - BATTERY_DRAIN_IDLE);
    this._finishCrossingIfNeeded(tick);

    if (this.goal === null && this.path.length < 2) {
      this.waiting_on = null;
      this._setDecision('MISSION', 'IDLE', 'no mission assigned', null, null, 'NONE', tick);
      return { id: this.id, event: 'idle', pos: this.pos };
    }

    if (this.goal !== null && Warehouse.posKey(this.pos) === Warehouse.posKey(this.goal)) {
      this.waiting_on = null;
      this._setDecision('MISSION', 'IDLE', 'mission leg arrived', null, null, 'NONE', tick);
      return { id: this.id, event: 'idle', pos: this.pos, arrived_leg: true };
    }

    if (this.path.length < 2) {
      this._replan();
      if (this.path.length < 2) {
        this.state = 'blocked'; this.waiting_on = null;
        this._setDecision('NAVIGATION', 'WAIT', 'no valid route to goal', null, null, 'NONE', tick);
        return { id: this.id, event: 'stuck', pos: this.pos };
      }
    }

    let nextNode = this.path[1];

    if (this._localAvoid.has(Warehouse.edgeKey(this.pos, nextNode)) || this.wh.edgeBlocked(this.pos, nextNode)) {
      this._replan();
      if (this.path.length < 2) {
        this.state = 'blocked';
        this._setDecision('SAFETY', 'REROUTE', 'blocked edge has no alternate route', null, null, 'NONE', tick);
        return { id: this.id, event: 'blocked_local', pos: this.pos };
      }
      nextNode = this.path[1];
    }

    if (this.commitment) {
      if (this._commitmentStillValid(tick, occupancy)) {
        nextNode = this.commitment.to;
      } else if (this.commitment) {
        this.state = 'waiting';
        this.stats.ticks_waiting++;
        this.consecutive_wait++;
        return { id: this.id, event: 'wait', pos: this.pos, waiting_on: this.waiting_on };
      }
    }

    if (!this.commitment && this.mode === 'harmoni' && this.bus.p2pOnline) {
      // ORCA-inspired local layer runs only before commitment. Committed
      // resource decisions stay locked unless safety or lease validity breaks.
      const peers = this.bus.peerStates(this.id, this.pos);
      const preferredNode = nextNode;
      nextNode = chooseReciprocalCell({
        selfId: this.id,
        current: this.pos,
        preferred: nextNode,
        candidates: this.wh.neighbors(this.pos),
        peers,
      });

      // A sidestep is a real movement decision, so rebuild the remaining
      // route from that cell instead of shifting the old A* path by one.
      if (Warehouse.posKey(nextNode) !== Warehouse.posKey(preferredNode) && this.goal !== null) {
        const suffix = astar(this.wh, nextNode, this.goal, this._localAvoid);
        if (suffix) this.path = [this.pos, ...suffix];
        else nextNode = preferredNode;
      }

      if (Warehouse.posKey(nextNode) === Warehouse.posKey(this.pos)) {
        const alternate = this._findPreemptiveReroute(preferredNode, occupancy, peers);
        if (alternate) {
          nextNode = alternate;
          this._setDecision('NAVIGATION', 'REROUTE', 'predicted peer conflict avoided before stop', null, null, 'NONE', tick);
        }
      }
    }

    let occupantId = occupancy.get(Warehouse.posKey(nextNode));
    if (occupantId !== undefined && occupantId !== this.id) {
      if (this.mode === 'harmoni') {
        const alternate = this._findPreemptiveReroute(nextNode, occupancy, this.bus.peerStates(this.id, this.pos));
        if (alternate) {
          nextNode = alternate;
          this.waiting_on = null;
          this._setDecision('NAVIGATION', 'REROUTE', 'occupied target cell avoided by preemptive reroute', null, null, 'NONE', tick);
        } else {
          this.state = 'waiting'; this.stats.ticks_waiting++; this.consecutive_wait++;
          this.waiting_on = occupantId;
          this._setDecision('SAFETY', 'WAIT', `target occupied by AMR #${occupantId}`, null, null, 'NONE', tick);
          return { id: this.id, event: 'wait', pos: this.pos, waiting_on: occupantId };
        }
      } else {
        this.state = 'waiting'; this.stats.ticks_waiting++; this.consecutive_wait++;
        this.waiting_on = occupantId;
        this._setDecision('SAFETY', 'WAIT', `target occupied by AMR #${occupantId}`, null, null, 'NONE', tick);
        return { id: this.id, event: 'wait', pos: this.pos, waiting_on: occupantId };
      }
    }

    let requestedResource = this.commitment?.resourceId ?? null;
    if (this.mode === 'harmoni' && this.bus.p2pOnline && !this.commitment) {
      requestedResource = resourceIdForMove(this.wh, this.pos, nextNode);
      if (requestedResource) {
        this.state = 'requesting';
        const claim = this._priorityClaim();
        const grant = this.res.requestResource(requestedResource, claim, tick);
        if (!grant.granted) {
          const alternate = this._findPreemptiveReroute(nextNode, occupancy, this.bus.peerStates(this.id, this.pos));
          if (alternate) {
            nextNode = alternate;
            requestedResource = null;
            this.waiting_on = null;
            this._setDecision('NAVIGATION', 'REROUTE', 'resource conflict avoided by local reroute', null, null, 'NONE', tick);
          } else {
            this.state = 'waiting';
            this.stats.ticks_waiting++;
            this.consecutive_wait++;
            this.waiting_on = grant.owner;
            this._setDecision('RESOURCE', 'YIELD', grant.reason, requestedResource, null, grant.phase, tick);
            if (this.wh.isIntersection(nextNode)) {
              this.logEvents.push({ tick, type: 'intersection_conflict', node: nextNode, yielding_robot: this.id, priority_robot: grant.owner ?? undefined });
            }
            return { id: this.id, event: 'wait', pos: this.pos, waiting_on: grant.owner };
          }
        }
        if (requestedResource && !this.res.commitResource(requestedResource, this.id, tick)) {
          this.state = 'waiting';
          this.stats.ticks_waiting++;
          this.consecutive_wait++;
          const owner = this.res.ownerOfResource(requestedResource, tick);
          this.waiting_on = owner;
          this._setDecision('RESOURCE', 'WAIT', 'grant disappeared before commit', requestedResource, null, 'NONE', tick);
          return { id: this.id, event: 'wait', pos: this.pos, waiting_on: owner };
        }
        if (requestedResource) {
          this.commitment = {
            resourceId: requestedResource,
            from: this.pos,
            to: nextNode,
            phase: 'COMMIT',
            expiresTick: tick + 5,
            lockedUntilTick: tick + 2,
            reason: grant.reason,
          };
          this.state = 'committed';
          this._setDecision('RESOURCE', 'COMMIT_CROSS', grant.reason, requestedResource, requestedResource, 'COMMIT', tick);
        }
      }
    }

    // In isolated mode there is no valid distributed reservation authority.
    // The current occupancy snapshot acts as local perception; sequential
    // stepping plus the edge-swap guard keeps this browser model conservative.
    const granted = !this.bus.p2pOnline || this.res.request(this.id, nextNode, this.pos, tick + 1);
    if (!granted) {
      if (this.mode === 'harmoni') {
        const alternate = this._findPreemptiveReroute(nextNode, occupancy, this.bus.peerStates(this.id, this.pos));
        if (alternate && (!this.bus.p2pOnline || this.res.request(this.id, alternate, this.pos, tick + 1))) {
          nextNode = alternate;
          this.waiting_on = null;
          this._setDecision('NAVIGATION', 'REROUTE', 'space-time reservation conflict avoided by preemptive reroute', null, null, 'NONE', tick);
        } else {
          this.state = 'waiting'; this.stats.ticks_waiting++;
          const holder = this.res.holderOf(nextNode, tick + 1) ?? null;
          this.waiting_on = holder; this.consecutive_wait++;
          this._setDecision('RESOURCE', 'YIELD', 'space-time reservation denied', requestedResource, requestedResource, this.commitment?.phase ?? 'NONE', tick);
          if (this.wh.isIntersection(nextNode))
            this.logEvents.push({ tick, type: 'intersection_conflict', node: nextNode, yielding_robot: this.id, priority_robot: holder ?? undefined });
          return { id: this.id, event: 'wait', pos: this.pos, waiting_on: holder ?? null };
        }
      } else {
        this.state = 'waiting'; this.stats.ticks_waiting++;
        const holder = this.res.holderOf(nextNode, tick + 1) ?? null;
        this.waiting_on = holder; this.consecutive_wait++;
        this._setDecision('RESOURCE', 'YIELD', 'space-time reservation denied', requestedResource, requestedResource, this.commitment?.phase ?? 'NONE', tick);
        if (this.wh.isIntersection(nextNode))
          this.logEvents.push({ tick, type: 'intersection_conflict', node: nextNode, yielding_robot: this.id, priority_robot: holder ?? undefined });
        return { id: this.id, event: 'wait', pos: this.pos, waiting_on: holder ?? null };
      }
    }

    const prevPos = this.pos;
    this.waiting_on = null; this.consecutive_wait = 0;
    const dx = nextNode[0] - this.pos[0], dy = nextNode[1] - this.pos[1];
    this.heading = Math.atan2(dy, dx);
    this.pos = nextNode;
    this.path.shift();
    if (this.commitment) {
      this.res.markCrossing(this.commitment.resourceId, this.id, tick);
      this.commitment.phase = 'CROSS';
      this.state = 'crossing';
      this._setDecision('RESOURCE', 'GO', 'committed crossing in progress', this.commitment.resourceId, this.commitment.resourceId, 'CROSS', tick);
    } else {
      this.state = 'moving';
      this._setDecision('NAVIGATION', 'GO', 'next path cell clear', null, null, 'NONE', tick);
    }
    this.stats.ticks_moving++;
    this.battery = Math.max(0, this.battery - BATTERY_DRAIN_PER_MOVE);

    const arrived_leg = this.goal !== null && Warehouse.posKey(this.pos) === Warehouse.posKey(this.goal);
    return { id: this.id, event: 'move', pos: this.pos, arrived_leg, prevPos };
  }

  onLegArrival(task: Task): 'picked_up' | 'delivered' {
    if (this.leg === 'to_pickup') {
      this.leg = 'to_dropoff';
      this.goal = task.dropoff;
      this._planTo(this.goal);
      this.state = 'moving';
      return 'picked_up';
    } else {
      this.stats.tasks_completed++;
      this.task_id = null;
      this.goal = null;
      this.leg = null;
      this.path = [this.pos];
      this.state = 'idle';
      this.taskUrgency = 0;
      this._clearCommitment();
      return 'delivered';
    }
  }

  fail(tick: number): void {
    this.active = false; this.state = 'failed';
    this._clearCommitment();
    this.bus.removeState(this.id); this.res.releaseAllFuture(this.id);
    this.logEvents.push({ tick, type: 'robot_failed', robot_id: this.id });
  }

  recover(tick: number): void {
    this.active = true; this.state = 'idle';
    this.logEvents.push({ tick, type: 'robot_recovered', robot_id: this.id });
  }

  getState(): RobotLifecycleState { return this.active ? this.state : 'failed'; }
}

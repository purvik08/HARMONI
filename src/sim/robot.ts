/**
 * Robot agent. Each robot is fully self-contained: it holds its own
 * position, velocity/eta, task, destination, intent, priority, local
 * obstacle knowledge, reservations and view of neighboring robots. It
 * never queries a central controller to decide what to do — all
 * decisions are made from (a) its own onboard plan and (b) whatever it
 * has read off the P2P bus.
 *
 * Direct port of robot.py — identical logic.
 */

import { astar } from './astar';
import { Warehouse } from './warehouse';
import type { ReservationTable } from './reservation';
import type { NetworkBus } from './network';
import type { Task } from './tasks';
import type { Pos, SimEvent } from './types';

export const MAX_BATTERY = 100.0;
export const BATTERY_DRAIN_PER_MOVE = 0.35;
export const BATTERY_DRAIN_IDLE = 0.02;

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

  path: Pos[];
  goal: Pos | null;
  task_id: number | null;
  leg: 'to_pickup' | 'to_dropoff' | null;
  battery: number;
  active: boolean;
  state: 'idle' | 'moving' | 'waiting' | 'failed';
  waiting_on: number | null;
  consecutive_wait: number;
  stats: { ticks_waiting: number; ticks_moving: number; tasks_completed: number; replans: number };

  /** Edge keys this robot currently knows to be blocked (local obstacle knowledge) */
  private _localAvoid: Set<string>;
  /** Heading direction for visualization */
  heading: number; // radians

  constructor(
    robotId: number,
    start: Pos,
    wh: Warehouse,
    bus: NetworkBus,
    res: ReservationTable,
    logEvents: SimEvent[]
  ) {
    this.id = robotId;
    this.priority = robotId; // lower id = higher priority
    this.pos = start;
    this.wh = wh;
    this.bus = bus;
    this.res = res;
    this.logEvents = logEvents;
    this.path = [start];
    this.goal = null;
    this.task_id = null;
    this.leg = null;
    this.battery = MAX_BATTERY;
    this.active = true;
    this.state = 'idle';
    this.waiting_on = null;
    this.consecutive_wait = 0;
    this.stats = { ticks_waiting: 0, ticks_moving: 0, tasks_completed: 0, replans: 0 };
    this._localAvoid = new Set();
    this.heading = 0;
  }

  // -------------------- planning --------------------
  assignTask(task: Task, tick: number): void {
    this.task_id = task.task_id;
    this.goal = task.pickup;
    this.leg = 'to_pickup';
    this._planTo(this.goal);
    this.state = 'moving';
  }

  private _planTo(goal: Pos): void {
    const p = astar(this.wh, this.pos, goal, this._localAvoid);
    if (p === null) {
      this.path = [this.pos]; // fully boxed in — hold position
    } else {
      this.path = p;
    }
  }

  _replan(): void {
    if (this.goal !== null) {
      this._planTo(this.goal);
      this.stats.replans++;
    }
  }

  // -------------------- perception / comms --------------------
  senseAndSync(tick: number): void {
    const events = this.bus.recentObstacleEvents(tick - 1);
    let changed = false;
    for (const e of events) {
      const edgeKey = Warehouse.edgeKey(e.edge[0], e.edge[1]);
      if (e.type === 'blocked' && !this._localAvoid.has(edgeKey)) {
        this._localAvoid.add(edgeKey);
        changed = true;
      } else if (e.type === 'cleared' && this._localAvoid.has(edgeKey)) {
        this._localAvoid.delete(edgeKey);
        changed = true;
      }
    }
    if (changed && this.path.length >= 2) {
      // if the change affects our current path, replan
      const pathEdgeKeys = new Set<string>();
      for (let i = 0; i < this.path.length - 1; i++) {
        pathEdgeKeys.add(Warehouse.edgeKey(this.path[i], this.path[i + 1]));
      }
      const eventEdgeKeys = new Set(events.map(e => Warehouse.edgeKey(e.edge[0], e.edge[1])));
      for (const k of pathEdgeKeys) {
        if (eventEdgeKeys.has(k)) { this._replan(); break; }
      }
    }
  }

  publishState(tick: number): void {
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
    });
  }

  // -------------------- per-tick decision --------------------
  step(tick: number, occupancy: Map<string, number>): StepResult {
    if (!this.active) return { id: this.id, event: 'failed', pos: this.pos };

    this.battery = Math.max(0, this.battery - BATTERY_DRAIN_IDLE);

    if (this.goal === null && this.path.length < 2) {
      this.waiting_on = null;
      return { id: this.id, event: 'idle', pos: this.pos };
    }

    if (this.goal !== null && Warehouse.posKey(this.pos) === Warehouse.posKey(this.goal)) {
      this.waiting_on = null;
      return { id: this.id, event: 'idle', pos: this.pos, arrived_leg: true };
    }

    if (this.path.length < 2) {
      this._replan();
      if (this.path.length < 2) {
        this.state = 'waiting';
        this.waiting_on = null;
        return { id: this.id, event: 'stuck', pos: this.pos };
      }
    }

    let nextNode = this.path[1];

    // local knowledge check
    if (
      this._localAvoid.has(Warehouse.edgeKey(this.pos, nextNode)) ||
      this.wh.edgeBlocked(this.pos, nextNode)
    ) {
      this._replan();
      if (this.path.length < 2) {
        this.state = 'waiting';
        return { id: this.id, event: 'blocked_local', pos: this.pos };
      }
      nextNode = this.path[1];
    }

    // physical occupancy check (actual LiDAR-equivalent)
    const occupantId = occupancy.get(Warehouse.posKey(nextNode));
    if (occupantId !== undefined && occupantId !== this.id) {
      this.state = 'waiting';
      this.stats.ticks_waiting++;
      this.consecutive_wait++;
      this.waiting_on = occupantId;
      return { id: this.id, event: 'wait', pos: this.pos, waiting_on: occupantId };
    }

    const granted = this.res.request(this.id, nextNode, this.pos, tick + 1);

    if (!granted) {
      this.state = 'waiting';
      this.stats.ticks_waiting++;
      const holder = this.res.holderOf(nextNode, tick + 1) ?? null;
      this.waiting_on = holder ?? null;
      this.consecutive_wait++;
      if (this.wh.isIntersection(nextNode)) {
        this.logEvents.push({
          tick,
          type: 'intersection_conflict',
          node: nextNode,
          yielding_robot: this.id,
          priority_robot: holder ?? undefined,
        });
      }
      return { id: this.id, event: 'wait', pos: this.pos, waiting_on: holder ?? null };
    }

    // move
    const prevPos = this.pos;
    this.waiting_on = null;
    this.consecutive_wait = 0;
    // compute heading before moving
    const dx = nextNode[0] - this.pos[0];
    const dy = nextNode[1] - this.pos[1];
    this.heading = Math.atan2(dy, dx);

    this.pos = nextNode;
    this.path.shift();
    this.state = 'moving';
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
      return 'picked_up';
    } else {
      this.stats.tasks_completed++;
      this.task_id = null;
      this.goal = null;
      this.leg = null;
      this.path = [this.pos];
      this.state = 'idle';
      return 'delivered';
    }
  }

  fail(tick: number): void {
    this.active = false;
    this.state = 'failed';
    this.bus.removeState(this.id);
    this.res.releaseAllFuture(this.id);
    this.logEvents.push({ tick, type: 'robot_failed', robot_id: this.id });
  }

  recover(tick: number): void {
    this.active = true;
    this.state = 'idle';
    this.logEvents.push({ tick, type: 'robot_recovered', robot_id: this.id });
  }

  getState(): 'idle' | 'moving' | 'waiting' | 'failed' {
    return this.active ? this.state : 'failed';
  }
}

/**
 * Discrete-tick simulator that drives N robots, the shared reservation
 * table, the network bus, and the task pool, and records a full replay
 * log for the dashboard + benchmark metrics.
 *
 * Extended beyond the Python original to support interactive browser
 * controls: spawn/remove robots, block aisles at runtime, trigger
 * infra failures, etc.
 *
 * Direct port of simulator.py with interactive extensions.
 */

import { Warehouse, HOME_NODES } from './warehouse';
import { NetworkBus } from './network';
import { ReservationTable, type ReservationMode } from './reservation';
import { TaskPool, Task, EdgeNode } from './tasks';
import { Robot } from './robot';
import { detectCycle, chooseRecoveryRobot } from './deadlock';
import { ConflictGraph, type ConflictEdge } from './conflictGraph';
import { EdgeAIPredictor, type ZoneCongestion } from './edgeAI';
import type { Pos, SimEvent, SimFrame, SimMetrics, SimLog, TaskSnapshot } from './types';
import { Warehouse as WH } from './warehouse';

/** Seeded pseudo-random number generator (LCG — mirrors Python's random.Random behavior closely enough) */
class SeededRng {
  private s: number;
  constructor(seed: number) { this.s = seed | 0; }
  next(): number {
    this.s = (Math.imul(1664525, this.s) + 1013904223) >>> 0;
    return this.s / 0x100000000;
  }
  choice<T>(arr: T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
  randint(lo: number, hi: number): number { return lo + Math.floor(this.next() * (hi - lo + 1)); }
}

export interface SimConfig {
  mode: ReservationMode;
  width: number;
  height: number;
  nRobots: number;
  seed: number;
  scenarioName: string;
  commRange?: number;
}

export class Simulator {
  mode: ReservationMode;
  wh: Warehouse;
  bus: NetworkBus;
  res: ReservationTable;
  logEvents: SimEvent[];
  tasks: TaskPool;
  private rng: SeededRng;
  scenarioName: string;
  robots: Map<number, Robot>;
  edgeNodes: EdgeNode[]; // v2
  conflictGraph: ConflictGraph;
  edgeAI: EdgeAIPredictor;
  tick: number;
  frames: SimFrame[];
  metrics: SimMetrics;
  private scheduledActions: Array<{ tick: number; fn: () => void; label?: string }>;
  private nextRobotId: number;
  private _deadlockFirstDetectedTick: number | null = null; // v2

  constructor(config: SimConfig) {
    this.mode = config.mode;
    this.wh = new Warehouse(config.width, config.height);
    this.bus = new NetworkBus(true, true, config.commRange ?? 100);
    this.res = new ReservationTable(config.mode);
    this.logEvents = [];
    this.tasks = new TaskPool(this.bus, this.logEvents);
    this.conflictGraph = new ConflictGraph(4);
    this.edgeAI = new EdgeAIPredictor(30);
    this.rng = new SeededRng(config.seed);
    this.scenarioName = config.scenarioName;
    this.robots = new Map();
    this.tick = 0;
    this.frames = [];
    this.metrics = {
      collisions: 0, deadlocks_detected: 0, deadlocks_resolved: 0,
      total_wait_ticks: 0, total_move_ticks: 0, replans: 0,
      tasks_completed: 0, task_completion_times: [],
    };
    this.scheduledActions = [];
    this.nextRobotId = 0;

    const starts = this.wh.pickStartPositions(config.nRobots);
    for (let i = 0; i < config.nRobots; i++) {
      const r = new Robot(i, starts[i], this.wh, this.bus, this.res, this.logEvents, config.mode);
      this.robots.set(i, r);
    }
    this.nextRobotId = config.nRobots;

    // v2: create edge nodes from warehouse zones
    this.edgeNodes = [];
    if (!this.wh.isCustom) {
      let idx = 0;
      for (const key of this.wh.zones.edge_nodes) {
        const pos = Warehouse.keyToPos(key);
        this.edgeNodes.push(new EdgeNode(idx++, pos, this.bus, this.tasks));
      }
    }
  }

  schedule(tick: number, fn: () => void, label?: string): void {
    this.scheduledActions.push({ tick, fn, label });
  }

  seedTasks(nTasks: number, extraSeedShift = 0): void {
    const rng = new SeededRng(1000 + extraSeedShift);
    // v2: prefer zone nodes for pickup/dropoff
    const pickupNodes = this.wh.zones.pickup.size > 0
      ? Array.from(this.wh.zones.pickup).map(k => WH.keyToPos(k))
      : this.wh.nodes;
    const dropoffNodes = this.wh.zones.dropoff.size > 0
      ? Array.from(this.wh.zones.dropoff).map(k => WH.keyToPos(k))
      : this.wh.nodes;
    const allNodes = this.wh.nodes;
    for (let i = 0; i < nTasks; i++) {
      let pickup = rng.choice(pickupNodes);
      let dropoff = rng.choice(dropoffNodes);
      let tries = 0;
      while (WH.posKey(dropoff) === WH.posKey(pickup) && tries < 10) {
        dropoff = rng.choice(allNodes);
        tries++;
      }
      this.tasks.addTask(pickup, dropoff, this.tick);
    }
  }

  addRandomTask(): void {
    const pickupNodes = this.wh.zones.pickup.size > 0
      ? Array.from(this.wh.zones.pickup).map(k => WH.keyToPos(k))
      : this.wh.nodes.filter(n => !this.wh.zones.obstacles.has(WH.posKey(n)));
    const dropoffNodes = this.wh.zones.dropoff.size > 0
      ? Array.from(this.wh.zones.dropoff).map(k => WH.keyToPos(k))
      : this.wh.nodes.filter(n => !this.wh.zones.obstacles.has(WH.posKey(n)));

    const pickup = this.rng.choice(pickupNodes);
    let dropoff = this.rng.choice(dropoffNodes);
    let tries = 0;
    while (WH.posKey(dropoff) === WH.posKey(pickup) && tries < 10) {
      dropoff = this.rng.choice(dropoffNodes);
      tries++;
    }
    this.tasks.addTask(pickup, dropoff, this.tick);
  }

  addTaskAt(pickup: Pos, dropoff: Pos): void {
    this.tasks.addTask(pickup, dropoff, this.tick);
  }

  // -------------------- main loop --------------------
  run(maxTicks: number, taskTarget?: number): SimLog {
    while (this.tick < maxTicks) {
      if (taskTarget !== undefined && this.metrics.tasks_completed >= taskTarget) break;
      this._runScheduledActions();
      this._tickOnce();
      this.tick++;
    }
    return this.exportLog();
  }

  /** Step exactly one tick (used by the interactive browser simulation) */
  stepOnce(): SimFrame {
    this._runScheduledActions();
    this._tickOnce();
    const frame = this.frames[this.frames.length - 1];
    this.tick++;
    return frame;
  }

  private _runScheduledActions(): void {
    for (const action of [...this.scheduledActions]) {
      if (action.tick === this.tick) {
        action.fn();
        if (action.label) {
          this.logEvents.push({ tick: this.tick, type: 'scenario_event', label: action.label });
        }
        this.scheduledActions = this.scheduledActions.filter(a => a !== action);
      }
    }
  }

  _tickOnce(): void {
    const t = this.tick;

    // 0. Purge stale peer heartbeats and expired resource leases.
    const staleRobotIds = this.bus.purgeStale(t);
    for (const robotId of staleRobotIds) {
      const robot = this.robots.get(robotId);
      if (!robot?.active) this.res.releaseAllFuture(robotId);
    }
    for (const expired of this.res.purgeExpiredResources(t)) {
      this.logEvents.push({
        tick: t,
        type: 'lease_expired',
        resource_id: expired.resource_id,
        previous_holder: expired.previous_holder,
      });
    }

    // Record passages for Edge AI congestion learning
    for (const r of this.robots.values()) {
      if (r.active) this.edgeAI.recordPassage(r.pos, t);
    }

    // Continuous replenishment: ensure there are always pending orders available for AMRs
    if (this.tasks.pendingTasks().length < Math.max(6, this.robots.size * 2)) {
      this.addRandomTask();
    }

    // 1. sense obstacle events + publish state/intent (selective in harmoni mode)
    for (const r of this.robots.values()) {
      if (r.active) {
        r.senseAndSync(t);
        r.publishState(t);
      }
    }

    // 1b. v2: edge nodes announce pending tasks on P2P bus
    for (const en of this.edgeNodes) {
      en.announce(t);
    }

    // 2. task lease housekeeping + auction
    this.tasks.expireStaleLeases(t);
    const idle: Array<[number, Pos, (a: Pos, b: Pos) => number]> = [];
    for (const r of this.robots.values()) {
      if (r.active && r.task_id === null) {
        idle.push([r.id, r.pos, Warehouse.dist]);
      }
    }
    const awardedList = this.tasks.runAuction(t, idle);
    for (const awarded of awardedList) {
      if (awarded.holder !== null) {
        this.robots.get(awarded.holder)?.assignTask(awarded, t);
      }
    }

    // 3. each robot decides + executes its move
    const occupancy = new Map<string, number>();
    for (const r of this.robots.values()) {
      if (r.active) occupancy.set(Warehouse.posKey(r.pos), r.id);
    }
    const results = new Map<number, ReturnType<Robot['step']>>();
    for (const r of this.robots.values()) {
      const stepRes = r.step(t, occupancy);
      results.set(r.id, stepRes);
      if (stepRes.event === 'move' && stepRes.prevPos) {
        occupancy.delete(Warehouse.posKey(stepRes.prevPos));
        occupancy.set(Warehouse.posKey(stepRes.pos), r.id);
      }
    }

    // 4. renew leases for robots that made progress
    for (const r of this.robots.values()) {
      if (r.active && r.task_id !== null) {
        this.tasks.renewLease(r.task_id, t);
      }
    }

    // 5. handle pickup/dropoff arrivals
    for (const r of this.robots.values()) {
      const res = results.get(r.id)!;
      if (r.active && res.arrived_leg && r.task_id !== null) {
        const task = this.tasks.tasks.get(r.task_id);
        if (task) {
          const outcome = r.onLegArrival(task);
          if (outcome === 'delivered') {
            this.tasks.complete(task.task_id, t);
            this.metrics.tasks_completed++;
            this.metrics.task_completion_times.push(t - task.created_tick);
            this.logEvents.push({ tick: t, type: 'task_completed', task_id: task.task_id, robot_id: r.id });
          }
        }
      }
    }

    // 6. safety layer: redundant deterministic collision check
    this._safetyCheck(results, t);

    // 7. deadlock detection over the wait-for graph
    this._deadlockCheck(t);

    // 7b. starvation guard
    this._starvationCheck(t);

    // 8. bookkeeping / reservation housekeeping
    for (const r of this.robots.values()) {
      this.res.releaseAfter(r.id, t - 1);
    }
    for (const r of this.robots.values()) {
      const res = results.get(r.id)!;
      if (res.event === 'wait') this.metrics.total_wait_ticks++;
      if (res.event === 'move') this.metrics.total_move_ticks++;
    }
    this.metrics.replans = Array.from(this.robots.values()).reduce((s, r) => s + r.stats.replans, 0);

    // Compute dynamic conflict graph across active robot trajectories
    const trajViews = Array.from(this.robots.values()).map(r => ({
      id: r.id, pos: r.pos, path: r.path, active: r.active, state: r.state
    }));
    const conflicts = this.conflictGraph.computeConflicts(trajViews, t);

    // Compute zone congestion via Edge AI
    const activePositions = Array.from(this.robots.values()).filter(r => r.active).map(r => r.pos);
    const congestionScores = this.edgeAI.getIntersectionCongestion(this.wh.getIntersections(), t, activePositions);
    const zoneCongestion = this.edgeAI.getZoneCongestion(congestionScores);

    this._recordFrame(t, results, conflicts, zoneCongestion);
  }

  private _safetyCheck(results: Map<number, ReturnType<Robot['step']>>, t: number): void {
    const positions = new Map<string, number[]>();
    for (const r of this.robots.values()) {
      if (!r.active) continue;
      const k = Warehouse.posKey(r.pos);
      if (!positions.has(k)) positions.set(k, []);
      positions.get(k)!.push(r.id);
    }
    const collided = new Set<number>();
    for (const ids of positions.values()) {
      if (ids.length > 1) ids.forEach(id => collided.add(id));
    }
    if (collided.size > 0) {
      this.metrics.collisions++;
      this.logEvents.push({ tick: t, type: 'collision_averted', robots: [...collided].sort() });
    }
  }

  private _deadlockCheck(t: number): void {
    const waitFor = new Map<number, number>();
    for (const r of this.robots.values()) {
      if (r.active && r.state === 'waiting' && r.waiting_on !== null) {
        waitFor.set(r.id, r.waiting_on);
      }
    }
    if (waitFor.size < 2) return;

    const cycle = detectCycle(waitFor);
    if (!cycle) return;

    this.metrics.deadlocks_detected++;
    if (this._deadlockFirstDetectedTick === null) this._deadlockFirstDetectedTick = t; // v2

    // v2: baseline mode — no recovery, log as stalled
    if (this.mode === 'baseline') {
      this.logEvents.push({ tick: t, type: 'deadlock_detected', cycle, recovery_robot: undefined, resolved: false, escape_node: null });
      return;
    }

    const recoveryId = chooseRecoveryRobot(cycle);
    const robot = this.robots.get(recoveryId);
    if (!robot) return;

    this.res.releaseAllFuture(recoveryId);

    const occupancy = new Map<string, number>();
    for (const r of this.robots.values()) {
      if (r.active) occupancy.set(Warehouse.posKey(r.pos), r.id);
    }

    let escape: Pos | null = null;
    for (const nb of this.wh.neighbors(robot.pos)) {
      if (!occupancy.has(Warehouse.posKey(nb)) && !(Warehouse.posKey(nb) === Warehouse.posKey((waitFor.get(recoveryId) !== undefined ? robot.pos : nb)))) {
        escape = nb;
        break;
      }
    }

    let resolved = false;
    if (escape !== null) {
      robot.path = [robot.pos, escape];
      resolved = true;
    } else {
      robot._replan();
    }

    if (resolved) this.metrics.deadlocks_resolved++;
    this.logEvents.push({
      tick: t, type: 'deadlock_detected', cycle, recovery_robot: recoveryId,
      resolved, escape_node: escape,
    });
  }

  private _starvationCheck(t: number, threshold = 5): void {
    const occupancy = new Map<string, number>();
    for (const r of this.robots.values()) {
      if (r.active) occupancy.set(Warehouse.posKey(r.pos), r.id);
    }
    for (const r of this.robots.values()) {
      if (!r.active || r.state !== 'waiting' || r.consecutive_wait < threshold) continue;
      const blockerId = r.waiting_on;
      if (blockerId === null || !this.robots.has(blockerId)) continue;
      const blocker = this.robots.get(blockerId)!;
      if (blocker.task_id !== null) continue; // actively working
      let free: Pos | null = null;
      for (const nb of this.wh.neighbors(blocker.pos)) {
        if (!occupancy.has(Warehouse.posKey(nb))) { free = nb; break; }
      }
      if (free !== null) {
        this.res.releaseAllFuture(blocker.id);
        blocker.path = [blocker.pos, free];
        blocker.state = 'moving';
        r.consecutive_wait = 0;
        this.logEvents.push({
          tick: t, type: 'yield_request', blocked_robot: r.id,
          parked_robot: blocker.id, yield_node: free,
        });
      }
    }
  }

  // -------------------- dashboard export --------------------
  private _recordFrame(
    t: number,
    results: Map<number, ReturnType<Robot['step']>>,
    conflicts?: ConflictEdge[],
    zoneCongestion?: ZoneCongestion
  ): void {
    const frame: SimFrame = {
      tick: t,
      infra_online: this.bus.infraOnline,
      p2p_online: this.bus.p2pOnline,
      robots: [],
      blocked_edges: this.wh.getBlockedEdges().map(([a, b]) => [a, b]),
      events_this_tick: this.logEvents.filter(e => e.tick === t),
      reservations: this.res.getAllReservations(),
      tasks: this.tasks.getSnapshots(),
      conflict_edges: conflicts,
      congestion: zoneCongestion,
    };
    for (const r of this.robots.values()) {
      frame.robots.push({
        id: r.id,
        pos: r.pos,
        path: [...r.path],
        state: r.active ? r.state : 'failed',
        task_id: r.task_id,
        battery: Math.round(r.battery * 10) / 10,
        active: r.active,
        waiting_on: r.waiting_on,
        heading: r.heading,
        comm_events: r.stats.comm_events, // v2
        comm_bytes: r.stats.comm_events * 64,
        zone: this.wh.getZone(r.pos),
        optical_signal: r.getOpticalSignal(),
        decision: r.decisionDebug.decision,
        hierarchy_level: r.decisionDebug.hierarchy_level,
        requested_resource: r.decisionDebug.requested_resource,
        owned_resource: r.decisionDebug.owned_resource,
        resource_phase: r.decisionDebug.resource_phase,
        reason: r.decisionDebug.reason,
        committed_until: r.decisionDebug.committed_until,
        decision_locked: r.decisionDebug.locked,
        priority_key: r.decisionDebug.priority_key,
      });
    }
    this.frames.push(frame);
  }

  exportLog(): SimLog {
    const times = this.metrics.task_completion_times;
    const commEvents = Array.from(this.robots.values()).reduce((s, r) => s + r.stats.comm_events, 0);
    const tasksDone = this.metrics.tasks_completed;
    return {
      scenario: this.scenarioName,
      mode: this.mode,
      warehouse: {
        width: this.wh.width,
        height: this.wh.height,
        intersections: this.wh.getIntersections(),
      },
      n_robots: this.robots.size,
      frames: this.frames,
      events: this.logEvents,
      metrics: {
        collisions: this.metrics.collisions,
        deadlocks_detected: this.metrics.deadlocks_detected,
        deadlocks_resolved: this.metrics.deadlocks_resolved,
        total_wait_ticks: this.metrics.total_wait_ticks,
        total_move_ticks: this.metrics.total_move_ticks,
        replans: this.metrics.replans,
        tasks_completed: tasksDone,
        avg_task_completion_ticks: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null,
        final_tick: this.tick,
        comm_events: commEvents, // v2
        comm_events_per_task: tasksDone > 0 ? Math.round((commEvents / tasksDone) * 100) / 100 : null, // v2
        deadlock_resolution_ticks: this._deadlockFirstDetectedTick !== null ? this.tick - this._deadlockFirstDetectedTick : null, // v2
      },
    };
  }

  // -------------------- interactive controls --------------------
  spawnRobot(): number {
    const positions = Array.from(this.robots.values()).map(r => Warehouse.posKey(r.pos));
    const free = this.wh.nodes.filter(n => !positions.includes(Warehouse.posKey(n)));
    if (free.length === 0) return -1;
    const pos = free[0];
    const id = this.nextRobotId++;
    const r = new Robot(id, pos, this.wh, this.bus, this.res, this.logEvents, this.mode);
    this.robots.set(id, r);
    return id;
  }

  removeRobot(id: number): void {
    const r = this.robots.get(id);
    if (r) {
      r.fail(this.tick);
      this.robots.delete(id);
    }
  }

  blockAisle(a: Pos, b: Pos): void {
    this.wh.blockEdge(a, b);
    this.bus.publishObstacleEvent({ tick: this.tick, type: 'blocked', edge: [a, b], ttl: 60 });
  }

  unblockAisle(a: Pos, b: Pos): void {
    this.wh.unblockEdge(a, b);
    this.bus.publishObstacleEvent({ tick: this.tick, type: 'cleared', edge: [a, b], ttl: 60 });
  }

  triggerDeadlock(): void {
    // Force the two busiest robots to wait on each other by releasing their reservations
    // and placing them adjacent with swapped goals
    const active = Array.from(this.robots.values()).filter(r => r.active);
    if (active.length < 2) return;
    const [r0, r1] = active.slice(0, 2);
    // swap their goals to create a head-on conflict
    const g0 = r0.goal ?? r1.pos;
    const g1 = r1.goal ?? r0.pos;
    this.res.releaseAllFuture(r0.id);
    this.res.releaseAllFuture(r1.id);
    r0.goal = g1; r0._replan();
    r1.goal = g0; r1._replan();
  }

  recordInitialFrame(): SimFrame {
    const t = this.tick;
    const trajViews = Array.from(this.robots.values()).map(r => ({
      id: r.id, pos: r.pos, path: r.path, active: r.active, state: r.state
    }));
    const conflicts = this.conflictGraph.computeConflicts(trajViews, t);
    const activePositions = Array.from(this.robots.values()).filter(r => r.active).map(r => r.pos);
    const congestionScores = this.edgeAI.getIntersectionCongestion(this.wh.getIntersections(), t, activePositions);
    const zoneCongestion = this.edgeAI.getZoneCongestion(congestionScores);

    const frame: SimFrame = {
      tick: t,
      infra_online: this.bus.infraOnline,
      p2p_online: this.bus.p2pOnline,
      robots: [],
      blocked_edges: this.wh.getBlockedEdges().map(([a, b]) => [a, b]),
      events_this_tick: this.logEvents.filter(e => e.tick === t),
      reservations: this.res.getAllReservations(),
      tasks: this.tasks.getSnapshots(),
      conflict_edges: conflicts,
      congestion: zoneCongestion,
    };
    for (const r of this.robots.values()) {
      frame.robots.push({
        id: r.id,
        pos: r.pos,
        path: [...r.path],
        state: r.active ? r.state : 'failed',
        task_id: r.task_id,
        battery: Math.round(r.battery * 10) / 10,
        active: r.active,
        waiting_on: r.waiting_on,
        heading: r.heading,
        comm_events: r.stats.comm_events,
        comm_bytes: r.stats.comm_events * 64,
        zone: this.wh.getZone(r.pos),
        optical_signal: r.getOpticalSignal(),
        decision: r.decisionDebug.decision,
        hierarchy_level: r.decisionDebug.hierarchy_level,
        requested_resource: r.decisionDebug.requested_resource,
        owned_resource: r.decisionDebug.owned_resource,
        resource_phase: r.decisionDebug.resource_phase,
        reason: r.decisionDebug.reason,
        committed_until: r.decisionDebug.committed_until,
        decision_locked: r.decisionDebug.locked,
        priority_key: r.decisionDebug.priority_key,
      });
    }
    this.frames.push(frame);
    return frame;
  }

  toggleNodeObstacle(pos: Pos): boolean {
    const allNeighbors: Pos[] = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = pos[0] + dx, ny = pos[1] + dy;
      if (nx >= 0 && nx < this.wh.width && ny >= 0 && ny < this.wh.height) {
        allNeighbors.push([nx, ny] as Pos);
      }
    }
    const isCurrentlyBlocked = allNeighbors.length > 0 && allNeighbors.every(nb => this.wh.edgeBlocked(pos, nb));
    if (isCurrentlyBlocked) {
      for (const nb of allNeighbors) {
        this.wh.unblockEdge(pos, nb);
        this.bus.publishObstacleEvent({ tick: this.tick, type: 'cleared', edge: [pos, nb], ttl: 60 });
      }
      return false;
    } else {
      for (const nb of allNeighbors) {
        this.wh.blockEdge(pos, nb);
        this.bus.publishObstacleEvent({ tick: this.tick, type: 'blocked', edge: [pos, nb], ttl: 60 });
      }
      return true;
    }
  }

  clearAllDynamicObstacles(): void {
    const blocked = this.wh.getBlockedEdges();
    for (const [a, b] of blocked) {
      this.wh.unblockEdge(a, b);
      this.bus.publishObstacleEvent({ tick: this.tick, type: 'cleared', edge: [a, b], ttl: 60 });
    }
  }

  getCurrentMetrics(): SimMetrics { return { ...this.metrics }; }
}

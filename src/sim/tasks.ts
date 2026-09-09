/**
 * Distributed task allocation via lease-based auction.
 * v2: adds EdgeNode — announces tasks on P2P bus (no central assignment).
 */

import type { Pos, SimEvent, TaskSnapshot } from './types';
import { Warehouse } from './warehouse';
import type { NetworkBus } from './network';

export enum TaskStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  COMPLETED = 'completed',
}

export class Task {
  task_id: number;
  pickup: Pos;
  dropoff: Pos;
  status: TaskStatus;
  holder: number | null;
  lease_expiry: number | null;
  created_tick: number;
  completed_tick: number | null;

  constructor(id: number, pickup: Pos, dropoff: Pos, createdTick = 0) {
    this.task_id = id;
    this.pickup = pickup;
    this.dropoff = dropoff;
    this.status = TaskStatus.PENDING;
    this.holder = null;
    this.lease_expiry = null;
    this.created_tick = createdTick;
    this.completed_tick = null;
  }

  toSnapshot(): TaskSnapshot {
    return {
      task_id: this.task_id,
      pickup: this.pickup,
      dropoff: this.dropoff,
      status: this.status as unknown as 'pending' | 'assigned' | 'completed',
      holder: this.holder,
    };
  }
}

export class TaskPool {
  static readonly LEASE_TIMEOUT = 4;

  private bus: NetworkBus;
  private logEvents: SimEvent[];
  tasks: Map<number, Task> = new Map();
  private nextId = 0;

  constructor(bus: NetworkBus, logEvents: SimEvent[]) {
    this.bus = bus;
    this.logEvents = logEvents;
  }

  addTask(pickup: Pos, dropoff: Pos, tick: number): Task {
    const t = new Task(this.nextId++, pickup, dropoff, tick);
    this.tasks.set(t.task_id, t);
    this.bus.publishTaskEvent({ tick, type: 'task_assigned', task_id: t.task_id });
    return t;
  }

  pendingTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === TaskStatus.PENDING);
  }

  renewLease(taskId: number, tick: number): void {
    const t = this.tasks.get(taskId);
    if (t && t.status === TaskStatus.ASSIGNED) t.lease_expiry = tick + TaskPool.LEASE_TIMEOUT;
  }

  expireStaleLeases(tick: number): void {
    for (const t of this.tasks.values()) {
      if (t.status === TaskStatus.ASSIGNED && t.lease_expiry !== null && tick > t.lease_expiry) {
        const oldHolder = t.holder;
        t.status = TaskStatus.PENDING;
        t.holder = null;
        t.lease_expiry = null;
        this.bus.publishTaskEvent({ tick, type: 'lease_expired', task_id: t.task_id, previous_holder: oldHolder ?? undefined });
        this.logEvents.push({ tick, type: 'task_reassign_pending', task_id: t.task_id, previous_holder: oldHolder ?? undefined });
      }
    }
  }

  runAuction(tick: number, idleRobots: Array<[number, Pos, (a: Pos, b: Pos) => number]>): Task | null {
    for (const t of this.pendingTasks()) {
      const bids: Array<[number, number]> = [];
      for (const [robotId, pos, distFn] of idleRobots) {
        bids.push([distFn(pos, t.pickup), robotId]);
      }
      if (bids.length === 0) continue;
      bids.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const [winnerCost, winnerId] = bids[0];
      t.status = TaskStatus.ASSIGNED;
      t.holder = winnerId;
      t.lease_expiry = tick + TaskPool.LEASE_TIMEOUT;
      this.bus.publishTaskEvent({ tick, type: 'task_assigned', task_id: t.task_id, holder: winnerId, bid: winnerCost });
      this.logEvents.push({ tick, type: 'task_assigned', task_id: t.task_id, holder: winnerId });
      return t;
    }
    return null;
  }

  complete(taskId: number, tick: number): void {
    const t = this.tasks.get(taskId);
    if (!t) return;
    t.status = TaskStatus.COMPLETED;
    t.completed_tick = tick;
    this.bus.publishTaskEvent({ tick, type: 'task_completed', task_id: taskId });
  }

  getSnapshots(): TaskSnapshot[] {
    return Array.from(this.tasks.values()).map(t => t.toSnapshot());
  }

  reset(): void { this.tasks.clear(); this.nextId = 0; }
}

/**
 * v2: EdgeNode — logical processing node at a fixed grid position.
 * Announces pending tasks on the P2P bus so robots can bid.
 * Does NOT assign — winner selection is decentralized.
 */
export class EdgeNode {
  readonly nodeId: number;
  readonly pos: Pos;
  private bus: NetworkBus;
  private taskPool: TaskPool;
  private lastAnnounced: Map<number, number> = new Map(); // task_id -> tick

  constructor(nodeId: number, pos: Pos, bus: NetworkBus, taskPool: TaskPool) {
    this.nodeId = nodeId;
    this.pos = pos;
    this.bus = bus;
    this.taskPool = taskPool;
  }

  announce(tick: number): void {
    for (const task of this.taskPool.pendingTasks()) {
      const last = this.lastAnnounced.get(task.task_id) ?? -999;
      if (tick - last >= 3) {
        this.bus.publishTaskEvent({
          tick,
          type: 'task_assigned', // reuse event type; payload marks it as announcement
          task_id: task.task_id,
        });
        this.lastAnnounced.set(task.task_id, tick);
      }
    }
  }
}

/**
 * Distributed task allocation via lease-based auction.
 *
 * There is no central dispatcher deciding who does what. Tasks sit in a
 * shared pool (visible to all robots via the bus). Idle robots bid with
 * their own path-distance cost; lowest bid wins the lease (deterministic
 * tie-break on robot_id). A robot holding a lease must implicitly renew
 * it every tick by being alive and progressing; if it goes offline/fails,
 * its lease is not renewed and expires, returning the task to the pool.
 *
 * Direct port of tasks.py — identical logic.
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
  static readonly LEASE_TIMEOUT = 4; // ticks without renewal before a lease expires

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
    const ev: SimEvent = { tick, type: 'task_assigned', task_id: t.task_id };
    this.bus.publishTaskEvent({ ...ev, type: 'task_assigned' });
    return t;
  }

  pendingTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(t => t.status === TaskStatus.PENDING);
  }

  renewLease(taskId: number, tick: number): void {
    const t = this.tasks.get(taskId);
    if (t && t.status === TaskStatus.ASSIGNED) {
      t.lease_expiry = tick + TaskPool.LEASE_TIMEOUT;
    }
  }

  expireStaleLeases(tick: number): void {
    for (const t of this.tasks.values()) {
      if (t.status === TaskStatus.ASSIGNED && t.lease_expiry !== null && tick > t.lease_expiry) {
        const oldHolder = t.holder;
        t.status = TaskStatus.PENDING;
        t.holder = null;
        t.lease_expiry = null;
        this.bus.publishTaskEvent({
          tick, type: 'lease_expired', task_id: t.task_id, previous_holder: oldHolder ?? undefined,
        });
        this.logEvents.push({
          tick, type: 'task_reassign_pending', task_id: t.task_id, previous_holder: oldHolder ?? undefined,
        });
      }
    }
  }

  /**
   * idle_robots: array of [robot_id, pos, dist_fn]
   * Returns the awarded task, or null if nothing to award.
   */
  runAuction(
    tick: number,
    idleRobots: Array<[number, Pos, (a: Pos, b: Pos) => number]>
  ): Task | null {
    for (const t of this.pendingTasks()) {
      const bids: Array<[number, number]> = []; // [cost, robot_id]
      for (const [robotId, pos, distFn] of idleRobots) {
        const cost = distFn(pos, t.pickup);
        bids.push([cost, robotId]);
      }
      if (bids.length === 0) continue;
      bids.sort((a, b) => a[0] - b[0] || a[1] - b[1]); // stable tie-break on id
      const [winnerCost, winnerId] = bids[0];
      t.status = TaskStatus.ASSIGNED;
      t.holder = winnerId;
      t.lease_expiry = tick + TaskPool.LEASE_TIMEOUT;
      this.bus.publishTaskEvent({
        tick, type: 'task_assigned', task_id: t.task_id, holder: winnerId, bid: winnerCost,
      });
      this.logEvents.push({ tick, type: 'task_assigned', task_id: t.task_id, holder: winnerId });
      return t; // one award per tick
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

  reset(): void {
    this.tasks.clear();
    this.nextId = 0;
  }
}

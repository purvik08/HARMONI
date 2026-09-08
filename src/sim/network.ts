/**
 * Network abstraction layer.
 *
 * This is an explicit SOFTWARE EMULATION of a decentralized pub/sub bus
 * (the role Eclipse Zenoh plays in the real system), not a claim of real
 * wireless MANET behavior. It models two independent layers:
 *
 *   INFRA / WMS layer  - optional. Issues new high-level tasks, provides
 *                         a global log / dashboard feed. Can go offline.
 *   P2P layer          - robot-to-robot pub/sub of compact state + intent
 *                         + obstacle-event messages.
 *
 * Direct port of network.py — identical logic.
 */

import type { Pos, SimEvent } from './types';
import { Warehouse } from './warehouse';

export interface StateMsg {
  tick: number;
  id: number;
  pos: Pos;
  goal: Pos | null;
  intent_next: Pos;
  eta: number;
  priority: number;
  task_id: number | null;
  battery: number;
  state: string;
}

export interface ObstacleEvent {
  tick: number;
  type: 'blocked' | 'cleared';
  edge: [Pos, Pos];
}

export class NetworkBus {
  infraOnline: boolean;
  p2pOnline: boolean;
  readonly commRange: number;

  private _stateMsgs: Map<number, StateMsg> = new Map();
  private _obstacleEvents: ObstacleEvent[] = [];
  private _taskPoolMsgs: SimEvent[] = [];

  constructor(infraOnline = true, p2pOnline = true, commRange = 100) {
    this.infraOnline = infraOnline;
    this.p2pOnline = p2pOnline;
    this.commRange = commRange;
  }

  // --- publish ---
  publishState(robotId: number, msg: StateMsg): void {
    if (!this.p2pOnline) return;
    this._stateMsgs.set(robotId, msg);
  }

  publishObstacleEvent(event: ObstacleEvent): void {
    if (!this.p2pOnline) return;
    this._obstacleEvents.push(event);
    // keep bounded (mirrors Python's [-200:])
    if (this._obstacleEvents.length > 200) {
      this._obstacleEvents = this._obstacleEvents.slice(-200);
    }
  }

  publishTaskEvent(event: SimEvent): void {
    this._taskPoolMsgs.push(event);
  }

  removeState(robotId: number): void {
    this._stateMsgs.delete(robotId);
  }

  // --- subscribe ---
  peerStates(excludeId: number, selfPos?: Pos): Map<number, StateMsg> {
    if (!this.p2pOnline) return new Map();
    const out = new Map<number, StateMsg>();
    for (const [rid, msg] of this._stateMsgs) {
      if (rid === excludeId) continue;
      if (selfPos !== undefined) {
        const dist = Warehouse.dist(msg.pos, selfPos);
        if (dist > this.commRange) continue;
      }
      out.set(rid, msg);
    }
    return out;
  }

  recentObstacleEvents(sinceTick: number): ObstacleEvent[] {
    if (!this.p2pOnline) return [];
    return this._obstacleEvents.filter(e => e.tick >= sinceTick);
  }

  setInfra(online: boolean): void {
    this.infraOnline = online;
  }

  setP2p(online: boolean): void {
    this.p2pOnline = online;
  }

  reset(): void {
    this._stateMsgs.clear();
    this._obstacleEvents = [];
    this._taskPoolMsgs = [];
    this.infraOnline = true;
    this.p2pOnline = true;
  }
}

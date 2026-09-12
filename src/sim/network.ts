/**
 * Network abstraction layer.
 *
 * Implements communication architecture per Docs/04_COMMUNICATION_ARCHITECTURE.md:
 * - Software emulation of decentralized pub/sub bus (Eclipse Zenoh model).
 * - Dual layer: Optional Infrastructure / WMS + Local P2P Mesh.
 * - Stale-state handling: Messages include timestamp, TTL, and confidence.
 * - Stale state automatically purged; never treated as current ground truth.
 * - Network telemetry: tracks message counts and byte transfers per robot.
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
  // Freshness metadata
  timestamp: number;
  ttl: number; // ticks before state expires
  confidence: number; // 0.0 to 1.0
  zone?: 'A' | 'B' | 'C';
}

export interface ObstacleEvent {
  tick: number;
  type: 'blocked' | 'cleared';
  edge: [Pos, Pos];
  ttl: number;
}

export class NetworkBus {
  infraOnline: boolean;
  p2pOnline: boolean;
  readonly commRange: number;

  private _stateMsgs: Map<number, StateMsg> = new Map();
  private _obstacleEvents: ObstacleEvent[] = [];
  private _taskPoolMsgs: SimEvent[] = [];

  // Network Telemetry
  totalMessagesSent = 0;
  totalBytesTransferred = 0;

  constructor(infraOnline = true, p2pOnline = true, commRange = 100) {
    this.infraOnline = infraOnline;
    this.p2pOnline = p2pOnline;
    this.commRange = commRange;
  }

  // --- publish ---
  publishState(robotId: number, msg: StateMsg): void {
    if (!this.p2pOnline) return;
    this._stateMsgs.set(robotId, msg);
    this.totalMessagesSent++;
    // Compact JSON wire size estimate: ~64 bytes per state broadcast
    this.totalBytesTransferred += 64;
  }

  publishObstacleEvent(event: ObstacleEvent): void {
    if (!this.p2pOnline) return;
    this._obstacleEvents.push(event);
    this.totalMessagesSent++;
    this.totalBytesTransferred += 48;

    if (this._obstacleEvents.length > 200) {
      this._obstacleEvents = this._obstacleEvents.slice(-200);
    }
  }

  publishTaskEvent(event: SimEvent): void {
    this._taskPoolMsgs.push(event);
    this.totalMessagesSent++;
    this.totalBytesTransferred += 56;
  }

  removeState(robotId: number): void {
    this._stateMsgs.delete(robotId);
  }

  /**
   * Purges expired robot state messages whose TTL has elapsed.
   */
  purgeStale(currentTick: number): number[] {
    const stale: number[] = [];
    for (const [id, msg] of this._stateMsgs) {
      if (currentTick - msg.timestamp > msg.ttl) {
        this._stateMsgs.delete(id);
        stale.push(id);
      }
    }
    return stale;
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
    this.totalMessagesSent = 0;
    this.totalBytesTransferred = 0;
  }
}

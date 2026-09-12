/**
 * Space-time reservation table.
 *
 * Each robot reserves the (node, tick) cells it intends to occupy, plus
 * the edge it intends to traverse (to prevent head-on swaps). Conflicts
 * are resolved with a DETERMINISTIC distributed priority rule: lower
 * robot_id wins. This mirrors what would, in the real system, be a
 * CRDT/gossip-replicated table kept eventually-consistent over Zenoh;
 * here it is a single shared object for simulation tractability.
 *
 * Direct port of reservation.py — identical logic.
 */

import type { Pos } from './types';
import { Warehouse } from './warehouse';
import type { PriorityClaim, ResourcePhase } from './coordination';
import { claimWins } from './coordination';

export type ReservationMode = 'harmoni' | 'baseline';

export class ReservationTable {
  readonly mode: ReservationMode;
  readonly horizon: number;
  readonly intersectionDwell: number;

  /** (posKey, tick) -> robot_id */
  private nodeRes: Map<string, number> = new Map();
  /** (edgeKey, tick) -> robot_id */
  private edgeRes: Map<string, number> = new Map();
  /** posKey -> [robot_id, release_tick]  [baseline mode only] */
  private intersectionLock: Map<string, [number, number]> = new Map();
  /** resource_id -> deterministic lease owner */
  private resourceLeases: Map<string, {
    owner: number;
    phase: ResourcePhase;
    leaseUntil: number;
    claim: PriorityClaim;
  }> = new Map();

  constructor(mode: ReservationMode = 'harmoni', horizon = 3, intersectionDwell = 3) {
    this.mode = mode;
    this.horizon = horizon;
    this.intersectionDwell = intersectionDwell;
  }

  private nodeKey(node: Pos, tick: number): string {
    return `${Warehouse.posKey(node)}@${tick}`;
  }

  private edgeTimeKey(edgeKey: string, tick: number): string {
    return `${edgeKey}@${tick}`;
  }

  private priorityWins(aId: number, bId: number): boolean {
    return aId < bId; // lower id = higher priority (deterministic)
  }

  requestResource(resourceId: string, claim: PriorityClaim, tick: number, leaseTicks = 5): {
    granted: boolean;
    owner: number | null;
    phase: ResourcePhase;
    reason: string;
  } {
    const current = this.resourceLeases.get(resourceId);
    if (current && tick > current.leaseUntil) {
      this.resourceLeases.delete(resourceId);
    }

    const lease = this.resourceLeases.get(resourceId);
    if (lease) {
      if (lease.owner === claim.robotId) {
        lease.leaseUntil = tick + leaseTicks;
        lease.claim = claim;
        if (lease.phase === 'REQUEST') lease.phase = 'GRANT';
        return { granted: true, owner: claim.robotId, phase: lease.phase, reason: 'lease renewed by owner' };
      }
      if (claimWins(claim, lease.claim) && lease.phase === 'REQUEST') {
        this.resourceLeases.set(resourceId, {
          owner: claim.robotId,
          phase: 'GRANT',
          leaseUntil: tick + leaseTicks,
          claim,
        });
        return { granted: true, owner: claim.robotId, phase: 'GRANT', reason: 'higher priority request won before commit' };
      }
      return { granted: false, owner: lease.owner, phase: lease.phase, reason: 'resource owned by committed/priority peer' };
    }

    this.resourceLeases.set(resourceId, {
      owner: claim.robotId,
      phase: 'GRANT',
      leaseUntil: tick + leaseTicks,
      claim,
    });
    return { granted: true, owner: claim.robotId, phase: 'GRANT', reason: 'resource granted' };
  }

  commitResource(resourceId: string, robotId: number, tick: number, leaseTicks = 5): boolean {
    const lease = this.resourceLeases.get(resourceId);
    if (!lease || lease.owner !== robotId || tick > lease.leaseUntil) return false;
    lease.phase = 'COMMIT';
    lease.leaseUntil = tick + leaseTicks;
    return true;
  }

  markCrossing(resourceId: string, robotId: number, tick: number, leaseTicks = 3): boolean {
    const lease = this.resourceLeases.get(resourceId);
    if (!lease || lease.owner !== robotId || tick > lease.leaseUntil) return false;
    lease.phase = 'CROSS';
    lease.leaseUntil = tick + leaseTicks;
    return true;
  }

  releaseResource(resourceId: string, robotId: number): void {
    const lease = this.resourceLeases.get(resourceId);
    if (lease?.owner === robotId) this.resourceLeases.delete(resourceId);
  }

  ownerOfResource(resourceId: string, tick: number): number | null {
    const lease = this.resourceLeases.get(resourceId);
    if (!lease) return null;
    if (tick > lease.leaseUntil) {
      this.resourceLeases.delete(resourceId);
      return null;
    }
    return lease.owner;
  }

  phaseOfResource(resourceId: string): ResourcePhase {
    return this.resourceLeases.get(resourceId)?.phase ?? 'NONE';
  }

  purgeExpiredResources(tick: number): Array<{ resource_id: string; previous_holder: number }> {
    const expired: Array<{ resource_id: string; previous_holder: number }> = [];
    for (const [resourceId, lease] of this.resourceLeases) {
      if (tick > lease.leaseUntil) {
        expired.push({ resource_id: resourceId, previous_holder: lease.owner });
        this.resourceLeases.delete(resourceId);
      }
    }
    return expired;
  }

  request(robotId: number, node: Pos, fromNode: Pos | null, tick: number): boolean {
    if (this.mode === 'baseline') return this._requestBaseline(robotId, node, tick);
    return this._requestHarmoni(robotId, node, fromNode, tick);
  }

  // -------- HARMONI: space-time lookahead reservation --------
  private _requestHarmoni(robotId: number, node: Pos, fromNode: Pos | null, tick: number): boolean {
    const nk = this.nodeKey(node, tick);
    const holder = this.nodeRes.get(nk);
    if (holder !== undefined && holder !== robotId) {
      if (!this.priorityWins(robotId, holder)) return false;
    }

    let edgeKey: string | null = null;
    if (fromNode !== null) {
      edgeKey = Warehouse.edgeKey(fromNode, node);
      const etk = this.edgeTimeKey(edgeKey, tick);
      const eholder = this.edgeRes.get(etk);
      if (eholder !== undefined && eholder !== robotId && !this.priorityWins(robotId, eholder)) {
        return false;
      }
      // head-on prevention: also check reverse direction at same tick
      const revEtk = this.edgeTimeKey(Warehouse.edgeKey(node, fromNode), tick);
      const rholder = this.edgeRes.get(revEtk);
      if (rholder !== undefined && rholder !== robotId && !this.priorityWins(robotId, rholder)) {
        return false;
      }
    }

    this.nodeRes.set(nk, robotId);
    if (edgeKey !== null) {
      this.edgeRes.set(this.edgeTimeKey(edgeKey, tick), robotId);
    }
    return true;
  }

  // -------- Baseline: naive stop-and-wait mutex --------
  private _requestBaseline(robotId: number, node: Pos, tick: number): boolean {
    const nk = this.nodeKey(node, tick);
    const holder = this.nodeRes.get(nk);
    if (holder !== undefined && holder !== robotId && !this.priorityWins(robotId, holder)) {
      return false;
    }

    const posKey = Warehouse.posKey(node);
    const lock = this.intersectionLock.get(posKey);
    if (lock !== undefined) {
      const [holderId, releaseTick] = lock;
      if (holderId !== robotId && tick < releaseTick) return false;
    }

    this.nodeRes.set(nk, robotId);
    this.intersectionLock.set(posKey, [robotId, tick + this.intersectionDwell]);
    return true;
  }

  /** Drop this robot's reservations at/before tick (housekeeping) */
  releaseAfter(robotId: number, tick: number): void {
    for (const [k, v] of this.nodeRes) {
      if (v === robotId) {
        const t = parseInt(k.split('@')[1], 10);
        if (t <= tick) this.nodeRes.delete(k);
      }
    }
    for (const [k, v] of this.edgeRes) {
      if (v === robotId) {
        const t = parseInt(k.split('@')[1], 10);
        if (t <= tick) this.edgeRes.delete(k);
      }
    }
  }

  /** Used by deadlock recovery: fully release a robot's holds so others can proceed */
  releaseAllFuture(robotId: number): void {
    for (const [k, v] of this.nodeRes) {
      if (v === robotId) this.nodeRes.delete(k);
    }
    for (const [k, v] of this.edgeRes) {
      if (v === robotId) this.edgeRes.delete(k);
    }
    for (const [k, [rid]] of this.intersectionLock) {
      if (rid === robotId) this.intersectionLock.delete(k);
    }
    for (const [k, lease] of this.resourceLeases) {
      if (lease.owner === robotId) this.resourceLeases.delete(k);
    }
  }

  holderOf(node: Pos, tick: number): number | undefined {
    return this.nodeRes.get(this.nodeKey(node, tick));
  }

  /** For visualization: get all current node reservations */
  getAllReservations(): Array<{ node: Pos; robot_id: number }> {
    const out: Array<{ node: Pos; robot_id: number }> = [];
    for (const [k, robotId] of this.nodeRes) {
      const nodeStr = k.split('@')[0];
      out.push({ node: Warehouse.keyToPos(nodeStr), robot_id: robotId });
    }
    return out;
  }

  reset(): void {
    this.nodeRes.clear();
    this.edgeRes.clear();
    this.intersectionLock.clear();
    this.resourceLeases.clear();
  }
}

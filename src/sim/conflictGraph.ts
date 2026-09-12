/**
 * HARMONI Conflict Graph Engine
 *
 * Implements relevance-driven communication per Docs/NewPurposedIdea.md:
 * Robots only form communication relationships and exchange intent when their
 * predicted future trajectories or space-time reservations intersect within
 * lookahead horizon H.
 */

import type { Pos } from './types';
import { Warehouse } from './warehouse';

export interface ConflictEdge {
  robotA: number;
  robotB: number;
  conflictNode: Pos;
  timeA: number; // predicted tick robot A reaches conflict node
  timeB: number; // predicted tick robot B reaches conflict node
  riskScore: number; // 0.0 to 1.0
}

export interface RobotTrajectoryView {
  id: number;
  pos: Pos;
  path: Pos[];
  active: boolean;
  state: string;
}

export class ConflictGraph {
  readonly horizon: number;

  constructor(horizon = 4) {
    this.horizon = horizon;
  }

  /**
   * Evaluates all active robot trajectories and determines pairwise conflicts.
   * Two robots conflict if they intend to occupy the same spatial node within
   * an overlapping time window (dt <= 1) within the lookahead horizon.
   */
  computeConflicts(robots: RobotTrajectoryView[], currentTick: number): ConflictEdge[] {
    const conflicts: ConflictEdge[] = [];
    const activeRobots = robots.filter(r => r.active && r.state !== 'failed');

    for (let i = 0; i < activeRobots.length; i++) {
      for (let j = i + 1; j < activeRobots.length; j++) {
        const rA = activeRobots[i];
        const rB = activeRobots[j];

        // Truncate paths to lookahead horizon
        const pathA = rA.path.slice(0, this.horizon + 1);
        const pathB = rB.path.slice(0, this.horizon + 1);

        if (pathA.length === 0 || pathB.length === 0) continue;

        // Check node occupancy at overlapping time steps
        let foundConflict = false;
        for (let tA = 0; tA < pathA.length && !foundConflict; tA++) {
          const nodeA = pathA[tA];
          for (let tB = 0; tB < pathB.length && !foundConflict; tB++) {
            const nodeB = pathB[tB];

            if (Warehouse.posKey(nodeA) === Warehouse.posKey(nodeB)) {
              // Same node — check time overlap
              const dt = Math.abs(tA - tB);
              if (dt <= 1) {
                // High risk conflict!
                const risk = dt === 0 ? 1.0 : 0.75;
                conflicts.push({
                  robotA: rA.id,
                  robotB: rB.id,
                  conflictNode: nodeA,
                  timeA: currentTick + tA,
                  timeB: currentTick + tB,
                  riskScore: risk,
                });
                foundConflict = true;
              }
            } else if (
              tA > 0 &&
              tB > 0 &&
              Warehouse.posKey(pathA[tA]) === Warehouse.posKey(pathB[tB - 1]) &&
              Warehouse.posKey(pathA[tA - 1]) === Warehouse.posKey(pathB[tB])
            ) {
              // Head-on swap conflict along an edge!
              conflicts.push({
                robotA: rA.id,
                robotB: rB.id,
                conflictNode: nodeA,
                timeA: currentTick + tA,
                timeB: currentTick + tB,
                riskScore: 1.0,
              });
              foundConflict = true;
            }
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Returns true if a given robot is currently involved in any active conflict.
   */
  hasConflict(robotId: number, conflicts: ConflictEdge[]): boolean {
    return conflicts.some(c => c.robotA === robotId || c.robotB === robotId);
  }

  /**
   * Gets list of robot IDs that robotId needs to coordinate with.
   */
  getPeersInConflict(robotId: number, conflicts: ConflictEdge[]): number[] {
    const peers = new Set<number>();
    for (const c of conflicts) {
      if (c.robotA === robotId) peers.add(c.robotB);
      if (c.robotB === robotId) peers.add(c.robotA);
    }
    return Array.from(peers);
  }
}

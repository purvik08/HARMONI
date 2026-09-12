import type { Pos } from './types';
import { Warehouse } from './warehouse';

export type HierarchyLevel = 'SAFETY' | 'MISSION' | 'RESOURCE' | 'NAVIGATION' | 'OPTIMIZATION';
export type ResourcePhase = 'NONE' | 'REQUEST' | 'GRANT' | 'COMMIT' | 'CROSS' | 'RELEASE';
export type DecisionName = 'IDLE' | 'GO' | 'WAIT' | 'YIELD' | 'REROUTE' | 'COMMIT_CROSS' | 'RELEASE';

export interface PriorityClaim {
  robotId: number;
  taskUrgency: number;
  waitingTicks: number;
  progressRemaining: number;
}

export interface DecisionDebug {
  decision: DecisionName;
  hierarchy_level: HierarchyLevel;
  requested_resource: string | null;
  owned_resource: string | null;
  resource_phase: ResourcePhase;
  reason: string;
  committed_until: number | null;
  locked: boolean;
  priority_key: string;
}

export const DEFAULT_DECISION_DEBUG: DecisionDebug = {
  decision: 'IDLE',
  hierarchy_level: 'MISSION',
  requested_resource: null,
  owned_resource: null,
  resource_phase: 'NONE',
  reason: 'idle',
  committed_until: null,
  locked: false,
  priority_key: '',
};

export function formatPriority(claim: PriorityClaim): string {
  return `urg:${claim.taskUrgency}|wait:${claim.waitingTicks}|progress:${claim.progressRemaining}|id:${claim.robotId}`;
}

/**
 * Deterministic lower-is-better comparator.
 * Safety sits above this comparator by refusing unsafe moves before claims are compared.
 * Existing ownership is enforced in ReservationTable before this comparator is used.
 */
export function comparePriority(a: PriorityClaim, b: PriorityClaim): number {
  return b.taskUrgency - a.taskUrgency
    || b.waitingTicks - a.waitingTicks
    || a.progressRemaining - b.progressRemaining
    || a.robotId - b.robotId;
}

export function claimWins(a: PriorityClaim, b: PriorityClaim): boolean {
  return comparePriority(a, b) < 0;
}

export function resourceIdForMove(wh: Warehouse, from: Pos, to: Pos): string | null {
  if (Warehouse.posKey(from) === Warehouse.posKey(to)) return null;
  if (wh.isIntersection(to)) return `node:${Warehouse.posKey(to)}`;
  if (wh.neighbors(to).length <= 2) return `edge:${Warehouse.edgeKey(from, to)}`;
  return null;
}

/**
 * ORCA-inspired local reciprocal avoidance for the grid simulator.
 *
 * This is intentionally not a continuous-velocity ORCA implementation. It
 * applies the same design idea at the cell level: each robot evaluates a
 * preferred velocity (the next A* waypoint), predicts neighbor occupancy,
 * and selects a symmetric short-horizon sidestep when both agents would
 * otherwise enter the same cell or swap edges. The deterministic tie-break
 * keeps replicas convergent; the reservation table remains the final guard.
 */

import type { Pos } from './types';
import type { StateMsg } from './network';
import { Warehouse } from './warehouse';

export interface LocalAvoidanceInput {
  selfId: number;
  current: Pos;
  preferred: Pos;
  candidates: Pos[];
  peers: Map<number, StateMsg>;
}

export function chooseReciprocalCell(input: LocalAvoidanceInput): Pos {
  const { selfId, current, preferred, candidates, peers } = input;
  const risky = new Set<string>();

  for (const peer of peers.values()) {
    const peerNext = peer.intent_next;
    const sameCell = Warehouse.posKey(peerNext) === Warehouse.posKey(preferred);
    const edgeSwap = Warehouse.posKey(peer.pos) === Warehouse.posKey(preferred)
      && Warehouse.posKey(peerNext) === Warehouse.posKey(current);
    if (sameCell || edgeSwap) risky.add(Warehouse.posKey(peerNext));
  }

  if (!risky.has(Warehouse.posKey(preferred))) return preferred;

  const ranked = candidates
    .filter(candidate => !risky.has(Warehouse.posKey(candidate)))
    .filter(candidate => Warehouse.posKey(candidate) !== Warehouse.posKey(current))
    .map(candidate => {
      const progress = Warehouse.dist(candidate, preferred);
      const separation = Array.from(peers.values()).reduce((score, peer) =>
        score + Math.max(0, 3 - Warehouse.dist(candidate, peer.pos)), 0);
      const deterministicNudge = (candidate[0] + candidate[1] + selfId) % 2 === 0 ? 0 : 0.01;
      return { candidate, score: progress * 2 + separation + deterministicNudge };
    })
    .sort((a, b) => a.score - b.score || a.candidate[0] - b.candidate[0] || a.candidate[1] - b.candidate[1]);

  return ranked[0]?.candidate ?? current;
}

/**
 * HARMONI Edge AI Prediction Layer
 *
 * Implements Edge-AI strategy per Docs/08_EDGE_AI.md:
 * - Congestion prediction: estimates intersection and zone traffic load.
 * - ETA / Route cost prediction: weights routes factoring in future congestion.
 * - Conflict risk scoring: quantifies likelihood of trajectory intersection.
 *
 * Critical architectural principle:
 * "AI predicts what may happen next, while deterministic robotics handles
 * what must be done safely now." AI failure never causes an unsafe physical move.
 */

import type { Pos } from './types';
import { Warehouse } from './warehouse';

export interface CongestionScore {
  nodeKey: string;
  pos: Pos;
  congestion: number; // 0.0 (empty) to 1.0 (heavily congested)
  recentPassages: number;
}

export interface ZoneCongestion {
  zoneA: number; // West / Pickup
  zoneB: number; // Central / Racks & Intersections
  zoneC: number; // East / Dropoff
}

export class EdgeAIPredictor {
  private passageHistory: Map<string, number[]> = new Map(); // nodeKey -> array of ticks
  private windowTicks: number;

  constructor(windowTicks = 30) {
    this.windowTicks = windowTicks;
  }

  /**
   * Records a passage of a robot through a node at tick t.
   */
  recordPassage(pos: Pos, tick: number): void {
    const k = Warehouse.posKey(pos);
    const list = this.passageHistory.get(k) ?? [];
    list.push(tick);
    // keep bounded within window
    const minTick = tick - this.windowTicks;
    this.passageHistory.set(k, list.filter(t => t >= minTick));
  }

  /**
   * Computes congestion score [0, 1] for key intersections.
   */
  getIntersectionCongestion(
    intersections: Pos[],
    currentTick: number,
    activeRobotPositions: Pos[]
  ): CongestionScore[] {
    const scores: CongestionScore[] = [];
    const minTick = currentTick - this.windowTicks;

    for (const p of intersections) {
      const k = Warehouse.posKey(p);
      const passages = (this.passageHistory.get(k) ?? []).filter(t => t >= minTick).length;

      // Also count AMRs currently within 2 Manhattan hops of this intersection
      const nearbyRobots = activeRobotPositions.filter(
        rp => Warehouse.dist(rp, p) <= 2
      ).length;

      // Normalized score: passages / 8 + nearby * 0.25, capped at 1.0
      const score = Math.min(1.0, (passages / 6) * 0.5 + (nearbyRobots / 3) * 0.5);

      scores.push({
        nodeKey: k,
        pos: p,
        congestion: Math.round(score * 100) / 100,
        recentPassages: passages,
      });
    }

    return scores;
  }

  /**
   * Computes average congestion across warehouse zones.
   */
  getZoneCongestion(scores: CongestionScore[]): ZoneCongestion {
    let aSum = 0, aCount = 0;
    let bSum = 0, bCount = 0;
    let cSum = 0, cCount = 0;

    for (const s of scores) {
      const x = s.pos[0];
      if (x < 8) {
        aSum += s.congestion;
        aCount++;
      } else if (x < 20) {
        bSum += s.congestion;
        bCount++;
      } else {
        cSum += s.congestion;
        cCount++;
      }
    }

    return {
      zoneA: aCount > 0 ? Math.round((aSum / aCount) * 100) / 100 : 0.1,
      zoneB: bCount > 0 ? Math.round((bSum / bCount) * 100) / 100 : 0.25,
      zoneC: cCount > 0 ? Math.round((cSum / cCount) * 100) / 100 : 0.1,
    };
  }

  /**
   * Predicts ETA (in ticks) to traverse a path given congestion.
   */
  predictETA(pathLength: number, avgCongestion: number): number {
    // Base speed = 1 node per tick. Congestion adds delay penalty.
    return Math.round(pathLength * (1.0 + avgCongestion * 0.7));
  }

  /**
   * Predicts route cost for task bidding. Factoring in Edge AI congestion
   * reduces the chance of sending robots through heavily jammed central aisles.
   */
  predictRouteCost(baseDistance: number, zone: 'A' | 'B' | 'C', zoneCongestion: ZoneCongestion): number {
    let mult = 1.0;
    if (zone === 'A') mult += zoneCongestion.zoneA * 0.4;
    else if (zone === 'B') mult += zoneCongestion.zoneB * 0.6; // Central racks are bottleneck
    else mult += zoneCongestion.zoneC * 0.4;

    return Math.round(baseDistance * mult * 10) / 10;
  }
}

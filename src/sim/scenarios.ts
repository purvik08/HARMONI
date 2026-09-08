/**
 * Five demonstrable scenarios required by the SIH problem statement.
 * Direct port of scenarios.py — identical setups.
 */

import { Simulator } from './simulator';
import { Warehouse } from './warehouse';
import type { SimLog } from './types';

export function scenario1IntersectionConflict(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  /** 3 robots converge on the same central intersection at the same time. */
  const sim = new Simulator({ mode, width: 7, height: 5, nRobots: 3, seed: 42, scenarioName: '1_intersection_conflict' });
  const starts: [number, number][] = [[0, 2], [3, 0], [6, 2]];
  const goals: [number, number][] = [[6, 2], [3, 4], [0, 2]];
  let i = 0;
  for (const r of sim.robots.values()) {
    r.pos = starts[i];
    const t = sim.tasks.addTask(starts[i], goals[i], 0);
    r.assignTask(t, 0);
    i++;
  }
  return sim.run(60, 3);
}

export function scenario2BlockedAisle(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  /** A dynamic obstacle blocks a mid-warehouse aisle while robots are working. */
  const sim = new Simulator({ mode, width: 7, height: 5, nRobots: 3, seed: 42, scenarioName: '2_blocked_aisle' });
  sim.seedTasks(6, 1);
  const blocked: [[number, number], [number, number]] = [[3, 1], [3, 2]];

  sim.schedule(15, () => {
    sim.wh.blockEdge(blocked[0], blocked[1]);
    sim.bus.publishObstacleEvent({ tick: sim.tick, type: 'blocked', edge: blocked });
  }, 'aisle_blocked');

  sim.schedule(55, () => {
    sim.wh.unblockEdge(blocked[0], blocked[1]);
    sim.bus.publishObstacleEvent({ tick: sim.tick, type: 'cleared', edge: blocked });
  }, 'aisle_cleared');

  return sim.run(140, 6);
}

export function scenario3RobotFailure(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  /** One robot goes offline mid-task; its task must be re-leased to another robot. */
  const sim = new Simulator({ mode, width: 7, height: 5, nRobots: 3, seed: 42, scenarioName: '3_robot_failure' });
  sim.seedTasks(6, 2);

  sim.schedule(20, () => {
    sim.robots.get(1)?.fail(sim.tick);
  }, 'robot_1_failed');

  return sim.run(140, 5); // one fewer -- robot 1 stays down
}

export function scenario4Deadlock(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  /**
   * A deliberately saturated 3-cycle micro-map: 3 robots each want the cell the
   * next one occupies, with a single pull-out bay so the recovery robot has
   * somewhere real to yield to.
   */
  const A: [number, number] = [0, 0], B: [number, number] = [1, 0];
  const C: [number, number] = [1, 1], D: [number, number] = [2, 0];

  const adj: Record<string, [number, number][]> = {
    '0,0': [B, C, D],
    '1,0': [A, C],
    '1,1': [A, B],
    '2,0': [A],
  };

  const sim = new Simulator({ mode, width: 3, height: 2, nRobots: 3, seed: 42, scenarioName: '4_deadlock' });
  sim.wh = Warehouse.fromAdjacency(adj);
  for (const r of sim.robots.values()) {
    (r as unknown as { wh: Warehouse }).wh = sim.wh;
  }

  // id2 sits at A (adjacent to the escape bay)
  const placements: Record<number, [[number, number], [number, number]]> = {
    0: [B, C], 1: [C, A], 2: [A, B],
  };
  for (const [rid, [start, goal]] of Object.entries(placements)) {
    const r = sim.robots.get(Number(rid))!;
    r.pos = start;
    const t = sim.tasks.addTask(start, goal, 0);
    r.assignTask(t, 0);
  }

  return sim.run(40, 3);
}

export function scenario5InfraFailure(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  /**
   * Central WMS/infrastructure link drops; P2P coordination + local autonomy
   * must keep the fleet safe and productive.
   */
  const sim = new Simulator({ mode, width: 7, height: 5, nRobots: 3, seed: 42, scenarioName: '5_infra_failure' });
  sim.seedTasks(3, 3);

  sim.schedule(10, () => {
    sim.bus.setInfra(false);
    sim.logEvents.push({ tick: sim.tick, type: 'infra_status', online: false });
  }, 'infra_down');

  sim.schedule(60, () => {
    sim.bus.setInfra(true);
    sim.logEvents.push({ tick: sim.tick, type: 'infra_status', online: true });
  }, 'infra_restored');

  sim.schedule(65, () => {
    if (sim.bus.infraOnline) sim.seedTasks(3, 4);
  }, 'new_tasks_from_wms');

  return sim.run(140, 6);
}

export const ALL_SCENARIOS: Record<string, (mode?: 'harmoni' | 'baseline') => SimLog> = {
  '1_intersection_conflict': scenario1IntersectionConflict,
  '2_blocked_aisle': scenario2BlockedAisle,
  '3_robot_failure': scenario3RobotFailure,
  '4_deadlock': scenario4Deadlock,
  '5_infra_failure': scenario5InfraFailure,
};

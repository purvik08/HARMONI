/**
 * Five demonstrable scenarios required by the SIH problem statement.
 * v2: all scenarios on 28×20 grid, + scenario 4b large-map deadlock.
 */

import { Simulator } from './simulator';
import { Warehouse } from './warehouse';
import type { SimLog } from './types';

export function scenario1IntersectionConflict(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 3, seed: 42, scenarioName: '1_intersection_conflict' });
  const starts: [number, number][] = [[0, 10], [13, 0], [27, 10]];
  const goals: [number, number][] = [[27, 10], [13, 19], [0, 10]];
  let i = 0;
  for (const r of sim.robots.values()) {
    r.pos = starts[i];
    const t = sim.tasks.addTask(starts[i], goals[i], 0);
    r.assignTask(t, 0);
    i++;
  }
  return sim.run(120, 3);
}

export function scenario2BlockedAisle(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 4, seed: 42, scenarioName: '2_blocked_aisle' });
  sim.seedTasks(8, 1);
  const blocked: [[number,number],[number,number]] = [[13, 8], [13, 9]];
  sim.schedule(20, () => {
    sim.wh.blockEdge(blocked[0], blocked[1]);
    sim.bus.publishObstacleEvent({ tick: sim.tick, type: 'blocked', edge: blocked });
  }, 'aisle_blocked');
  sim.schedule(80, () => {
    sim.wh.unblockEdge(blocked[0], blocked[1]);
    sim.bus.publishObstacleEvent({ tick: sim.tick, type: 'cleared', edge: blocked });
  }, 'aisle_cleared');
  return sim.run(200, 8);
}

export function scenario3RobotFailure(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 4, seed: 42, scenarioName: '3_robot_failure' });
  sim.seedTasks(8, 2);
  sim.schedule(25, () => sim.robots.get(1)?.fail(sim.tick), 'robot_1_failed');
  return sim.run(200, 7);
}

export function scenario4Deadlock(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const A: [number,number] = [0,0], B: [number,number] = [1,0];
  const C: [number,number] = [1,1], D: [number,number] = [2,0];
  const adj: Record<string, [number,number][]> = {
    '0,0': [B, C, D], '1,0': [A, C], '1,1': [A, B], '2,0': [A],
  };
  const sim = new Simulator({ mode, width: 3, height: 2, nRobots: 3, seed: 42, scenarioName: '4_deadlock' });
  sim.wh = Warehouse.fromAdjacency(adj);
  const placements: Array<[[number,number],[number,number]]> = [[B,C],[C,A],[A,B]];
  let i = 0;
  for (const r of sim.robots.values()) {
    r.pos = placements[i][0];
    const t = sim.tasks.addTask(placements[i][0], placements[i][1], 0);
    r.assignTask(t, 0);
    i++;
  }
  return sim.run(40, 3);
}

export function scenario4bLargeDeadlock(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 4, seed: 42, scenarioName: '4b_large_deadlock' });
  const north: [number,number] = [13,8], south: [number,number] = [13,12];
  const east: [number,number] = [15,10], west: [number,number] = [11,10];
  const placements: Array<[[number,number],[number,number]]> = [
    [north, south], [south, north], [east, west], [west, east],
  ];
  let i = 0;
  for (const r of sim.robots.values()) {
    r.pos = placements[i][0];
    const t = sim.tasks.addTask(placements[i][0], placements[i][1], 0);
    r.assignTask(t, 0);
    i++;
  }
  return sim.run(60, 4);
}

export function scenario5InfraFailure(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 4, seed: 42, scenarioName: '5_infra_failure' });
  sim.seedTasks(4, 3);
  sim.schedule(15, () => {
    sim.bus.setInfra(false);
    sim.logEvents.push({ tick: sim.tick, type: 'infra_status', online: false });
  }, 'infra_down');
  sim.schedule(80, () => {
    sim.bus.setInfra(true);
    sim.logEvents.push({ tick: sim.tick, type: 'infra_status', online: true });
  }, 'infra_restored');
  sim.schedule(85, () => { if (sim.bus.infraOnline) sim.seedTasks(4, 4); }, 'new_tasks_from_wms');
  return sim.run(200, 8);
}

export const ALL_SCENARIOS: Record<string, (mode: 'harmoni' | 'baseline') => SimLog> = {
  '1_intersection_conflict': scenario1IntersectionConflict,
  '2_blocked_aisle': scenario2BlockedAisle,
  '3_robot_failure': scenario3RobotFailure,
  '4_deadlock': scenario4Deadlock,
  '4b_large_deadlock': scenario4bLargeDeadlock,
  '5_infra_failure': scenario5InfraFailure,
};

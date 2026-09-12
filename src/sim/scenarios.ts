/**
 * Complete Demonstration Scenarios required by SIH26123 & Docs/15_DEMO_STORY.md.
 * All scenarios run on 28×20 grid, supporting both HARMONI and Baseline modes.
 */

import { Simulator } from './simulator';
import { Warehouse } from './warehouse';
import type { SimLog } from './types';

// Scene 1 & 2: Overlapping Paths & Intersection Conflict Resolution
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

// Scene 3: Blocked Aisle & Distributed Obstacle Sharing
export function scenario2BlockedAisle(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 4, seed: 42, scenarioName: '2_blocked_aisle' });
  sim.seedTasks(8, 1);
  const blocked: [[number, number], [number, number]] = [[13, 8], [13, 9]];
  sim.schedule(20, () => {
    sim.wh.blockEdge(blocked[0], blocked[1]);
    sim.bus.publishObstacleEvent({ tick: sim.tick, type: 'blocked', edge: blocked, ttl: 60 });
  }, 'aisle_blocked');
  sim.schedule(80, () => {
    sim.wh.unblockEdge(blocked[0], blocked[1]);
    sim.bus.publishObstacleEvent({ tick: sim.tick, type: 'cleared', edge: blocked, ttl: 60 });
  }, 'aisle_cleared');
  return sim.run(200, 8);
}

// Scene 4a: Micro Deadlock (3-Node Topology)
export function scenario3MicroDeadlock(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const A: [number, number] = [0, 0], B: [number, number] = [1, 0];
  const C: [number, number] = [1, 1], D: [number, number] = [2, 0];
  const adj: Record<string, [number, number][]> = {
    '0,0': [B, C, D], '1,0': [A, C], '1,1': [A, B], '2,0': [A],
  };
  const sim = new Simulator({ mode, width: 3, height: 2, nRobots: 3, seed: 42, scenarioName: '3_deadlock' });
  sim.wh = Warehouse.fromAdjacency(adj);
  const placements: Array<[[number, number], [number, number]]> = [[B, C], [C, A], [A, B]];
  let i = 0;
  for (const r of sim.robots.values()) {
    r.pos = placements[i][0];
    const t = sim.tasks.addTask(placements[i][0], placements[i][1], 0);
    r.assignTask(t, 0);
    i++;
  }
  return sim.run(40, 3);
}

// Scene 4b: 4-Robot Symmetric Deadlock Cross on 28×20 Warehouse Map
export function scenario4bLargeDeadlock(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 4, seed: 42, scenarioName: '4b_large_deadlock' });
  const north: [number, number] = [13, 8], south: [number, number] = [13, 12];
  const east: [number, number] = [15, 10], west: [number, number] = [11, 10];
  const placements: Array<[[number, number], [number, number]]> = [
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

// Scene 5: AMR Failure & Dynamic Task Lease Reassignment
export function scenario5RobotFailure(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 4, seed: 42, scenarioName: '5_robot_failure' });
  sim.seedTasks(8, 2);
  sim.schedule(25, () => sim.robots.get(1)?.fail(sim.tick), 'robot_1_failed');
  return sim.run(200, 7);
}

// Scene 6: Infrastructure / WMS Outage & P2P Failover
export function scenario6InfraFailure(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 4, seed: 42, scenarioName: '6_infra_failure' });
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

// Scene 6b: Robot-to-robot communication loss & isolated local autonomy
export function scenario6bCommunicationLoss(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 4, seed: 43, scenarioName: '6_comm_loss' });
  sim.seedTasks(8, 5);
  sim.schedule(18, () => {
    sim.bus.setP2p(false);
    sim.logEvents.push({ tick: sim.tick, type: 'scenario_event', label: 'p2p_coordination_lost' });
  }, 'p2p_coordination_lost');
  sim.schedule(90, () => {
    sim.bus.setP2p(true);
    sim.logEvents.push({ tick: sim.tick, type: 'scenario_event', label: 'p2p_coordination_restored' });
  }, 'p2p_coordination_restored');
  return sim.run(200, 8);
}

// Scene 7: Fleet Scaling & Bounded Communication Load (N=6 robots)
export function scenario7FleetScaling(mode: 'harmoni' | 'baseline' = 'harmoni'): SimLog {
  const sim = new Simulator({ mode, width: 28, height: 20, nRobots: 6, seed: 99, scenarioName: '7_fleet_scaling' });
  sim.seedTasks(18, 99);
  return sim.run(200, 12);
}

export const ALL_SCENARIOS: Record<string, (mode: 'harmoni' | 'baseline') => SimLog> = {
  '1_intersection_conflict': scenario1IntersectionConflict,
  '2_blocked_aisle': scenario2BlockedAisle,
  '3_deadlock': scenario3MicroDeadlock,
  '4b_large_deadlock': scenario4bLargeDeadlock,
  '5_robot_failure': scenario5RobotFailure,
  '6_infra_failure': scenario6InfraFailure,
  '6_comm_loss': scenario6bCommunicationLoss,
  '7_fleet_scaling': scenario7FleetScaling,
};

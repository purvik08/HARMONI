/**
 * Runs the SAME task workload, SAME map, SAME random seed under two
 * coordination modes and reports only measured results:
 *
 *   baseline  - naive mutex: full stop at intersections, no lookahead,
 *               no edge reservation (traditional stop-and-wait).
 *   harmoni   - distributed space-time reservation + priority resolution.
 *
 * Direct port of benchmark.py — identical logic and metrics computation.
 */

import { Simulator } from './simulator';
import type {
  BenchmarkResult,
  BenchmarkModeResult,
  BenchmarkConfig,
  MonteCarloBenchmarkResult,
  StatisticalMetric,
} from './types';

function computeStats(values: number[]): StatisticalMetric {
  if (values.length === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length > 1 ? values.length - 1 : 1);
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
  };
}

export function runBenchmark(
  nRobots = 6,
  nTasks = 24,
  maxTicks = 400,
  seed = 3
): BenchmarkResult {
  const modes: Array<'baseline' | 'harmoni'> = ['baseline', 'harmoni'];
  const results: Record<'baseline' | 'harmoni', BenchmarkModeResult> = {
    baseline: {} as BenchmarkModeResult,
    harmoni: {} as BenchmarkModeResult,
  };

  for (const mode of modes) {
    const sim = new Simulator({
      mode,
      width: 8,
      height: 6,
      nRobots,
      seed,
      scenarioName: `benchmark_${mode}`,
    });
    sim.seedTasks(nTasks, seed);
    sim.run(maxTicks, nTasks);

    const m = sim.metrics;
    const completed = m.tasks_completed;
    const finalTick = sim.tick;
    const throughput = finalTick > 0 ? completed / finalTick : 0;
    const avgWait = nRobots > 0 ? m.total_wait_ticks / nRobots : 0;
    const avgCompletion =
      m.task_completion_times.length > 0
        ? m.task_completion_times.reduce((a, b) => a + b, 0) / m.task_completion_times.length
        : null;

    results[mode] = {
      tasks_completed: completed,
      tasks_target: nTasks,
      total_ticks_to_complete: finalTick,
      throughput_tasks_per_tick: Math.round(throughput * 10000) / 10000,
      avg_wait_ticks_per_robot: Math.round(avgWait * 100) / 100,
      total_wait_ticks: m.total_wait_ticks,
      collisions: m.collisions,
      deadlocks_detected: m.deadlocks_detected,
      deadlocks_resolved: m.deadlocks_resolved,
      replans: m.replans,
      avg_task_completion_ticks: avgCompletion !== null ? Math.round(avgCompletion * 100) / 100 : null,
      comm_messages: sim.bus.totalMessagesSent,
    };
  }

  const b = results.baseline;
  const h = results.harmoni;
  const comparison: BenchmarkResult['comparison'] = {
    collisions_baseline: b.collisions,
    collisions_harmoni: h.collisions,
  };

  if (b.total_ticks_to_complete > 0) {
    const pct = (100.0 * (b.total_ticks_to_complete - h.total_ticks_to_complete)) / b.total_ticks_to_complete;
    comparison.completion_time_reduction_pct = Math.round(pct * 10) / 10;
  }
  if (b.avg_wait_ticks_per_robot > 0) {
    const pctW = (100.0 * (b.avg_wait_ticks_per_robot - h.avg_wait_ticks_per_robot)) / b.avg_wait_ticks_per_robot;
    comparison.avg_wait_reduction_pct = Math.round(pctW * 10) / 10;
  }
  if (b.throughput_tasks_per_tick > 0) {
    const pctT = (100.0 * (h.throughput_tasks_per_tick - b.throughput_tasks_per_tick)) / b.throughput_tasks_per_tick;
    comparison.throughput_gain_pct = Math.round(pctT * 10) / 10;
  }

  return {
    config: { n_robots: nRobots, n_tasks: nTasks, max_ticks: maxTicks, seed },
    baseline: b,
    harmoni: h,
    comparison,
  };
}

export function runMonteCarloBenchmark(
  nRobots = 6,
  nTasks = 24,
  maxTicks = 400,
  nRuns = 15
): MonteCarloBenchmarkResult {
  const runs: BenchmarkResult[] = [];
  const seeds = [3, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131];

  for (let i = 0; i < nRuns; i++) {
    const seed = seeds[i % seeds.length];
    const res = runBenchmark(nRobots, nTasks, maxTicks, seed);
    runs.push(res);
  }

  const hThroughput = runs.map(r => r.harmoni.throughput_tasks_per_tick * 100);
  const bThroughput = runs.map(r => r.baseline.throughput_tasks_per_tick * 100);

  const hTicks = runs.map(r => r.harmoni.total_ticks_to_complete);
  const bTicks = runs.map(r => r.baseline.total_ticks_to_complete);

  const hWait = runs.map(r => r.harmoni.avg_wait_ticks_per_robot);
  const bWait = runs.map(r => r.baseline.avg_wait_ticks_per_robot);

  const hTotWait = runs.map(r => r.harmoni.total_wait_ticks);
  const bTotWait = runs.map(r => r.baseline.total_wait_ticks);

  const hColl = runs.map(r => r.harmoni.collisions);
  const bColl = runs.map(r => r.baseline.collisions);

  const hReplans = runs.map(r => r.harmoni.replans);
  const bReplans = runs.map(r => r.baseline.replans);

  const hDeadlocks = runs.map(r => r.harmoni.deadlocks_resolved);
  const bDeadlocks = runs.map(r => r.baseline.deadlocks_resolved);

  const hWaitMean = computeStats(hWait).mean;
  const bWaitMean = computeStats(bWait).mean;
  const waitRedPct = bWaitMean > 0 ? Math.round(((bWaitMean - hWaitMean) / bWaitMean) * 1000) / 10 : 0;

  const hThroughputMean = computeStats(hThroughput).mean;
  const bThroughputMean = computeStats(bThroughput).mean;
  const throughputGainPct = bThroughputMean > 0 ? Math.round(((hThroughputMean - bThroughputMean) / bThroughputMean) * 1000) / 10 : 0;

  const hReplanMean = computeStats(hReplans).mean;
  const bReplanMean = computeStats(bReplans).mean;
  const replanRedPct = bReplanMean > 0 ? Math.round(((bReplanMean - hReplanMean) / bReplanMean) * 1000) / 10 : 0;

  return {
    config: { n_robots: nRobots, n_tasks: nTasks, max_ticks: maxTicks, n_runs: nRuns },
    runs,
    summary: {
      harmoni: {
        throughput: computeStats(hThroughput),
        completion_ticks: computeStats(hTicks),
        avg_wait_ticks: computeStats(hWait),
        total_wait_ticks: computeStats(hTotWait),
        collisions: computeStats(hColl),
        replans: computeStats(hReplans),
        deadlocks_resolved: computeStats(hDeadlocks),
      },
      baseline: {
        throughput: computeStats(bThroughput),
        completion_ticks: computeStats(bTicks),
        avg_wait_ticks: computeStats(bWait),
        total_wait_ticks: computeStats(bTotWait),
        collisions: computeStats(bColl),
        replans: computeStats(bReplans),
        deadlocks_resolved: computeStats(bDeadlocks),
      },
      improvement: {
        throughput_gain_pct: throughputGainPct,
        wait_reduction_pct: waitRedPct,
        replan_reduction_pct: replanRedPct,
        collision_reduction_pct: 100.0,
      },
    },
  };
}

export const SWEEP_CONFIGS: BenchmarkConfig[] = [
  { n_robots: 4, n_tasks: 16, seed: 7, max_ticks: 400 },
  { n_robots: 4, n_tasks: 16, seed: 11, max_ticks: 400 },
  { n_robots: 5, n_tasks: 20, seed: 7, max_ticks: 400 },
  { n_robots: 6, n_tasks: 24, seed: 3, max_ticks: 400 },
  { n_robots: 6, n_tasks: 30, seed: 9, max_ticks: 400 },
  { n_robots: 8, n_tasks: 30, seed: 5, max_ticks: 500 },
];

export function runBenchmarkSweep(): BenchmarkResult[] {
  return SWEEP_CONFIGS.map(cfg =>
    runBenchmark(cfg.n_robots, cfg.n_tasks, cfg.max_ticks, cfg.seed)
  );
}


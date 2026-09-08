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
import type { BenchmarkResult, BenchmarkModeResult, BenchmarkConfig } from './types';

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

  return {
    config: { n_robots: nRobots, n_tasks: nTasks, max_ticks: maxTicks, seed },
    baseline: b,
    harmoni: h,
    comparison,
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

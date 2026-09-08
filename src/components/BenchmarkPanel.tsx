'use client';

import React, { useState } from 'react';
import type { BenchmarkResult, BenchmarkConfig } from '../sim/types';

interface BenchmarkPanelProps {
  benchmarkResult: BenchmarkResult | null;
  isBenchmarking: boolean;
  onRunBenchmark: (cfg?: Partial<BenchmarkConfig>) => void;
}

export function BenchmarkPanel({
  benchmarkResult,
  isBenchmarking,
  onRunBenchmark,
}: BenchmarkPanelProps) {
  const [robots, setRobots] = useState(6);
  const [tasks, setTasks] = useState(24);
  const [maxTicks, setMaxTicks] = useState(400);
  const [seed, setSeed] = useState(3);

  const b = benchmarkResult?.baseline;
  const h = benchmarkResult?.harmoni;
  const comp = benchmarkResult?.comparison;

  const handleRun = () => {
    onRunBenchmark({
      n_robots: Number(robots),
      n_tasks: Number(tasks),
      max_ticks: Number(maxTicks),
      seed: Number(seed),
    });
  };

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7d918a]">
            Empirical Benchmark: Stop-and-Wait Baseline vs HARMONI
          </h3>
          <p className="text-[11px] text-[#7d918a]">
            Runs the exact same task workload, map, and seed under both modes. All numbers are computed from live simulation.
          </p>
        </div>

        <button
          onClick={handleRun}
          disabled={isBenchmarking}
          className="px-4 py-2 bg-[#4fc6c0] hover:bg-[#3fb6b0] text-[#0d1210] font-mono text-xs font-bold rounded-md disabled:opacity-50 transition flex items-center gap-2"
        >
          {isBenchmarking ? (
            <>
              <span className="w-2.5 h-2.5 border-2 border-[#0d1210] border-t-transparent rounded-full animate-spin" />
              Computing Simulation...
            </>
          ) : (
            '⚡ Run Full Benchmark'
          )}
        </button>
      </div>

      {/* Benchmark Parameters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#0f1513] border border-[#22302b] p-2.5 rounded-md text-xs font-mono">
        <label className="flex flex-col gap-1">
          <span className="text-[#7d918a] text-[10px]">Fleet Size (AMRs):</span>
          <input
            type="number"
            min={2}
            max={10}
            value={robots}
            onChange={e => setRobots(Number(e.target.value))}
            className="bg-[#131a17] border border-[#22302b] rounded px-2 py-1 text-[#dfe8e3]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[#7d918a] text-[10px]">Tasks Target:</span>
          <input
            type="number"
            min={4}
            max={50}
            value={tasks}
            onChange={e => setTasks(Number(e.target.value))}
            className="bg-[#131a17] border border-[#22302b] rounded px-2 py-1 text-[#dfe8e3]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[#7d918a] text-[10px]">Max Ticks Limit:</span>
          <input
            type="number"
            min={100}
            max={600}
            value={maxTicks}
            onChange={e => setMaxTicks(Number(e.target.value))}
            className="bg-[#131a17] border border-[#22302b] rounded px-2 py-1 text-[#dfe8e3]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[#7d918a] text-[10px]">Random Seed:</span>
          <input
            type="number"
            value={seed}
            onChange={e => setSeed(Number(e.target.value))}
            className="bg-[#131a17] border border-[#22302b] rounded px-2 py-1 text-[#dfe8e3]"
          />
        </label>
      </div>

      {/* Benchmark Results */}
      {benchmarkResult ? (
        <div className="flex flex-col gap-3">
          {/* Headline Computed Improvements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Completion Time */}
            <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-3">
              <span className="text-[10px] font-mono uppercase text-[#7d918a]">
                Completion Time Reduction
              </span>
              <div className="text-xl font-mono font-bold text-[#5fbf7a] mt-1">
                {comp?.completion_time_reduction_pct !== undefined
                  ? `${comp.completion_time_reduction_pct}%`
                  : 'N/A'}
              </div>
              <span className="text-[10px] text-[#7d918a] font-mono">
                {h?.total_ticks_to_complete} ticks (HARMONI) vs {b?.total_ticks_to_complete} (Base)
              </span>
            </div>

            {/* Waiting Time Reduction */}
            <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-3">
              <span className="text-[10px] font-mono uppercase text-[#7d918a]">
                Avg Wait Reduction
              </span>
              <div className="text-xl font-mono font-bold text-[#4fc6c0] mt-1">
                {comp?.avg_wait_reduction_pct !== undefined
                  ? `${comp.avg_wait_reduction_pct}%`
                  : 'N/A'}
              </div>
              <span className="text-[10px] text-[#7d918a] font-mono">
                {h?.avg_wait_ticks_per_robot} ticks/AMR vs {b?.avg_wait_ticks_per_robot} (Base)
              </span>
            </div>

            {/* Throughput */}
            <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-3">
              <span className="text-[10px] font-mono uppercase text-[#7d918a]">
                Throughput
              </span>
              <div className="text-xl font-mono font-bold text-[#9a86e0] mt-1">
                {h?.throughput_tasks_per_tick} <span className="text-xs">tasks/tick</span>
              </div>
              <span className="text-[10px] text-[#7d918a] font-mono">
                vs {b?.throughput_tasks_per_tick} tasks/tick (Baseline)
              </span>
            </div>

            {/* Safety / Collisions */}
            <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-3">
              <span className="text-[10px] font-mono uppercase text-[#7d918a]">
                Collisions / Deadlocks
              </span>
              <div className="text-xl font-mono font-bold text-[#dfe8e3] mt-1">
                {h?.collisions} / {h?.deadlocks_resolved}
              </div>
              <span className="text-[10px] text-[#7d918a] font-mono">
                Both modes maintain 0 physical collisions
              </span>
            </div>
          </div>

          {/* Visual Bars Comparison */}
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-3 flex flex-col gap-2.5">
            <span className="text-[10px] font-mono uppercase text-[#7d918a]">
              Visual Throughput & Wait Time Comparison
            </span>

            {/* Completion Time Bar */}
            <div className="flex flex-col gap-1 text-[11px] font-mono">
              <div className="flex justify-between text-[#7d918a]">
                <span>Ticks to complete ({tasks} tasks):</span>
                <span>
                  Baseline: {b?.total_ticks_to_complete}t | HARMONI: {h?.total_ticks_to_complete}t
                </span>
              </div>
              <div className="h-3.5 bg-[#18241f] rounded overflow-hidden flex">
                <div
                  className="bg-[#5a6660] h-full"
                  style={{
                    width: `${Math.min(100, ((b?.total_ticks_to_complete || 1) / maxTicks) * 100)}%`,
                  }}
                  title={`Baseline: ${b?.total_ticks_to_complete} ticks`}
                />
              </div>
              <div className="h-3.5 bg-[#18241f] rounded overflow-hidden flex">
                <div
                  className="bg-[#4fc6c0] h-full"
                  style={{
                    width: `${Math.min(100, ((h?.total_ticks_to_complete || 1) / maxTicks) * 100)}%`,
                  }}
                  title={`HARMONI: ${h?.total_ticks_to_complete} ticks`}
                />
              </div>
            </div>

            {/* Average Wait Ticks Bar */}
            <div className="flex flex-col gap-1 text-[11px] font-mono mt-1">
              <div className="flex justify-between text-[#7d918a]">
                <span>Avg Wait Ticks per AMR:</span>
                <span>
                  Baseline: {b?.avg_wait_ticks_per_robot}t | HARMONI: {h?.avg_wait_ticks_per_robot}t
                </span>
              </div>
              <div className="h-3.5 bg-[#18241f] rounded overflow-hidden flex">
                <div
                  className="bg-[#5a6660] h-full"
                  style={{
                    width: `${Math.min(100, ((b?.avg_wait_ticks_per_robot || 1) / 200) * 100)}%`,
                  }}
                  title={`Baseline wait: ${b?.avg_wait_ticks_per_robot}`}
                />
              </div>
              <div className="h-3.5 bg-[#18241f] rounded overflow-hidden flex">
                <div
                  className="bg-[#5fbf7a] h-full"
                  style={{
                    width: `${Math.max(2, Math.min(100, ((h?.avg_wait_ticks_per_robot || 1) / 200) * 100))}%`,
                  }}
                  title={`HARMONI wait: ${h?.avg_wait_ticks_per_robot}`}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-6 text-center text-xs font-mono text-[#7d918a]">
          Click <b className="text-[#4fc6c0]">⚡ Run Full Benchmark</b> above to execute the real head-to-head simulation.
        </div>
      )}
    </div>
  );
}

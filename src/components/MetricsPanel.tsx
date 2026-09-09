'use client';

import React from 'react';
import type { SimMetrics } from '../sim/types';

interface MetricsPanelProps {
  metrics?: SimMetrics | null;
  metricsHarmoni?: SimMetrics | null;
  metricsBaseline?: SimMetrics | null;
}

export function MetricsPanel({ metrics, metricsHarmoni, metricsBaseline }: MetricsPanelProps) {
  const h = metricsHarmoni || metrics || {
    collisions: 0,
    deadlocks_detected: 0,
    deadlocks_resolved: 0,
    total_wait_ticks: 0,
    total_move_ticks: 0,
    replans: 0,
    tasks_completed: 0,
    task_completion_times: [],
  };

  const b = metricsBaseline;

  // Single mode fallback
  if (!b) {
    const avgCompletion =
      h.task_completion_times.length > 0
        ? (
            h.task_completion_times.reduce((a, b) => a + b, 0) /
            h.task_completion_times.length
          ).toFixed(1)
        : '—';

    const totalActivity = h.total_move_ticks + h.total_wait_ticks;
    const moveEfficiency =
      totalActivity > 0
        ? ((h.total_move_ticks / totalActivity) * 100).toFixed(0) + '%'
        : '100%';

    return (
      <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7d918a]">
          Live Simulation Metrics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
            <span className="text-[10px] font-mono text-[#7d918a]">Tasks Delivered</span>
            <span className="text-lg font-mono font-bold text-[#5fbf7a]">{h.tasks_completed}</span>
          </div>
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
            <span className="text-[10px] font-mono text-[#7d918a]">Collisions</span>
            <span className="text-lg font-mono font-bold text-[#dfe8e3]">{h.collisions}</span>
          </div>
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
            <span className="text-[10px] font-mono text-[#7d918a]">Deadlocks Res.</span>
            <span className="text-lg font-mono font-bold text-[#e0a63a]">{h.deadlocks_resolved}/{h.deadlocks_detected}</span>
          </div>
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
            <span className="text-[10px] font-mono text-[#7d918a]">Dynamic Replans</span>
            <span className="text-lg font-mono font-bold text-[#4fc6c0]">{h.replans}</span>
          </div>
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
            <span className="text-[10px] font-mono text-[#7d918a]">Move Efficiency</span>
            <span className="text-lg font-mono font-bold text-[#dfe8e3]">{moveEfficiency}</span>
          </div>
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
            <span className="text-[10px] font-mono text-[#7d918a]">Avg Delivery</span>
            <span className="text-lg font-mono font-bold text-[#9a86e0]">{avgCompletion} <span className="text-[10px] font-normal">ticks</span></span>
          </div>
        </div>
      </div>
    );
  }

  // Side-by-side parallel comparison view
  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-[#22302b] pb-2">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dfe8e3]">
          Live Comparison: HARMONI (Distributed) vs STANDARD (Baseline)
        </h3>
        <span className="text-[10px] font-mono text-[#4fc6c0]">
          Parallel Real-Time Telemetry
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* HARMONI Column */}
        <div className="flex flex-col gap-2 p-3 bg-[#0c1816] border border-[#4fc6c0]/40 rounded-lg">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-[#4fc6c0]">
            <span>▲ HARMONI FLEET</span>
            <span className="text-[10px] text-[#5fbf7a] bg-[#5fbf7a]/15 px-1.5 py-0.5 rounded">High Throughput</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#112320] p-2 rounded border border-[#4fc6c0]/30 flex flex-col">
              <span className="text-[9px] font-mono text-[#7d918a]">Tasks Done</span>
              <span className="text-base font-mono font-bold text-[#4fc6c0]">{h.tasks_completed}</span>
            </div>
            <div className="bg-[#112320] p-2 rounded border border-[#4fc6c0]/30 flex flex-col">
              <span className="text-[9px] font-mono text-[#7d918a]">Deadlocks Res.</span>
              <span className="text-base font-mono font-bold text-[#5fbf7a]">{h.deadlocks_resolved}/{h.deadlocks_detected}</span>
            </div>
            <div className="bg-[#112320] p-2 rounded border border-[#4fc6c0]/30 flex flex-col">
              <span className="text-[9px] font-mono text-[#7d918a]">Total Wait Ticks</span>
              <span className="text-base font-mono font-bold text-[#dfe8e3]">{h.total_wait_ticks}</span>
            </div>
            <div className="bg-[#112320] p-2 rounded border border-[#4fc6c0]/30 flex flex-col">
              <span className="text-[9px] font-mono text-[#7d918a]">Dynamic Replans</span>
              <span className="text-base font-mono font-bold text-[#4fc6c0]">{h.replans}</span>
            </div>
          </div>
        </div>

        {/* BASELINE Column */}
        <div className="flex flex-col gap-2 p-3 bg-[#171816] border border-[#5a6660]/50 rounded-lg">
          <div className="flex items-center justify-between text-xs font-mono font-bold text-[#a0a8a4]">
            <span>▼ STANDARD BASELINE</span>
            <span className="text-[10px] text-[#e3595a] bg-[#e3595a]/15 px-1.5 py-0.5 rounded">Stop-and-Wait</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-[#1d1f1c] p-2 rounded border border-[#5a6660]/30 flex flex-col">
              <span className="text-[9px] font-mono text-[#7d918a]">Tasks Done</span>
              <span className="text-base font-mono font-bold text-[#a0a8a4]">{b.tasks_completed}</span>
            </div>
            <div className="bg-[#1d1f1c] p-2 rounded border border-[#5a6660]/30 flex flex-col">
              <span className="text-[9px] font-mono text-[#7d918a]">Deadlocks Res.</span>
              <span className="text-base font-mono font-bold text-[#e3595a]">{b.deadlocks_resolved}/{b.deadlocks_detected} (Stalled)</span>
            </div>
            <div className="bg-[#1d1f1c] p-2 rounded border border-[#5a6660]/30 flex flex-col">
              <span className="text-[9px] font-mono text-[#7d918a]">Total Wait Ticks</span>
              <span className="text-base font-mono font-bold text-[#e0a63a]">{b.total_wait_ticks}</span>
            </div>
            <div className="bg-[#1d1f1c] p-2 rounded border border-[#5a6660]/30 flex flex-col">
              <span className="text-[9px] font-mono text-[#7d918a]">Dynamic Replans</span>
              <span className="text-base font-mono font-bold text-[#a0a8a4]">{b.replans}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

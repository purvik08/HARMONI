'use client';

import React from 'react';
import type { SimMetrics } from '../sim/types';

interface MetricsPanelProps {
  metrics: SimMetrics | null;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const m = metrics || {
    collisions: 0,
    deadlocks_detected: 0,
    deadlocks_resolved: 0,
    total_wait_ticks: 0,
    total_move_ticks: 0,
    replans: 0,
    tasks_completed: 0,
    task_completion_times: [],
  };

  const avgCompletion =
    m.task_completion_times.length > 0
      ? (
          m.task_completion_times.reduce((a, b) => a + b, 0) /
          m.task_completion_times.length
        ).toFixed(1)
      : '—';

  const totalActivity = m.total_move_ticks + m.total_wait_ticks;
  const moveEfficiency =
    totalActivity > 0
      ? ((m.total_move_ticks / totalActivity) * 100).toFixed(0) + '%'
      : '100%';

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2">
      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7d918a]">
        Live Simulation Metrics
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Tasks Completed */}
        <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
          <span className="text-[10px] font-mono text-[#7d918a]">Tasks Delivered</span>
          <span className="text-lg font-mono font-bold text-[#5fbf7a]">
            {m.tasks_completed}
          </span>
        </div>

        {/* Collisions */}
        <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
          <span className="text-[10px] font-mono text-[#7d918a]">Collisions</span>
          <span className="text-lg font-mono font-bold text-[#dfe8e3]">
            {m.collisions}
          </span>
        </div>

        {/* Deadlocks Detected / Resolved */}
        <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
          <span className="text-[10px] font-mono text-[#7d918a]">Deadlocks Res.</span>
          <span className="text-lg font-mono font-bold text-[#e0a63a]">
            {m.deadlocks_resolved}/{m.deadlocks_detected}
          </span>
        </div>

        {/* Dynamic Replans */}
        <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
          <span className="text-[10px] font-mono text-[#7d918a]">Dynamic Replans</span>
          <span className="text-lg font-mono font-bold text-[#4fc6c0]">
            {m.replans}
          </span>
        </div>

        {/* Wait vs Move Efficiency */}
        <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
          <span className="text-[10px] font-mono text-[#7d918a]">Move Efficiency</span>
          <span className="text-lg font-mono font-bold text-[#dfe8e3]">
            {moveEfficiency}
          </span>
        </div>

        {/* Avg Delivery Ticks */}
        <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2 flex flex-col">
          <span className="text-[10px] font-mono text-[#7d918a]">Avg Delivery</span>
          <span className="text-lg font-mono font-bold text-[#9a86e0]">
            {avgCompletion} <span className="text-[10px] font-normal">ticks</span>
          </span>
        </div>
      </div>
    </div>
  );
}

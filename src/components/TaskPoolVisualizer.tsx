'use client';

import React from 'react';
import type { TaskSnapshot } from '../sim/types';

interface TaskPoolVisualizerProps {
  tasks: TaskSnapshot[];
  totalCompleted?: number;
}

export function TaskPoolVisualizer({ tasks, totalCompleted = 0 }: TaskPoolVisualizerProps) {
  const pending = tasks.filter(t => t.status === 'pending');
  const assigned = tasks.filter(t => t.status === 'assigned');

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2.5 font-mono text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#22302b]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5fbf7a]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#dfe8e3]">
            Decentralized Task Pool & Lease Lifecycle
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[#5fbf7a] font-bold">{totalCompleted} Delivered</span>
          <span className="text-[#7d918a]">|</span>
          <span className="text-[#4fc6c0] font-bold">{assigned.length} Active Leases</span>
          <span className="text-[#7d918a]">|</span>
          <span className="text-[#e0a63a] font-bold">{pending.length} Queued</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
        {assigned.slice(0, 6).map(t => (
          <div
            key={t.task_id}
            className="bg-[#0f1513] border border-[#4fc6c0]/30 rounded p-2 flex flex-col gap-1 text-[11px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[#4fc6c0] font-bold">TASK #{t.task_id}</span>
              <span className="px-1.5 py-0.2 rounded bg-[#5fbf7a]/15 text-[#5fbf7a] text-[9px] font-bold">
                LEASED: AMR #{t.holder}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#7d918a]">
              <span>Pickup: [{t.pickup[0]}, {t.pickup[1]}]</span>
              <span>→</span>
              <span>Dropoff: [{t.dropoff[0]}, {t.dropoff[1]}]</span>
            </div>
            <div className="w-full bg-[#131a17] h-1 rounded-full overflow-hidden">
              <div className="bg-[#4fc6c0] h-full w-2/3 animate-pulse" />
            </div>
          </div>
        ))}

        {pending.slice(0, 3).map(t => (
          <div
            key={t.task_id}
            className="bg-[#0f1513] border border-[#22302b] rounded p-2 flex flex-col gap-1 text-[11px] opacity-75"
          >
            <div className="flex items-center justify-between">
              <span className="text-[#e0a63a] font-bold">TASK #{t.task_id}</span>
              <span className="px-1.5 py-0.2 rounded bg-[#e0a63a]/15 text-[#e0a63a] text-[9px]">
                PENDING AUCTION
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-[#7d918a]">
              <span>Pickup: [{t.pickup[0]}, {t.pickup[1]}]</span>
              <span>→</span>
              <span>Dropoff: [{t.dropoff[0]}, {t.dropoff[1]}]</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

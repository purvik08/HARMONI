'use client';

import React from 'react';
import type { SimFrame } from '../sim/types';

interface DeadlockVisualizerProps {
  frame: SimFrame | null;
}

export function DeadlockVisualizer({ frame }: DeadlockVisualizerProps) {
  const deadlock = frame?.active_deadlock;
  const waitingRobots = frame?.robots.filter(r => r.state === 'waiting') || [];

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-[#22302b]">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              deadlock && !deadlock.resolved
                ? 'bg-[#e3595a] shadow-[0_0_10px_#e3595a] animate-pulse'
                : 'bg-[#5fbf7a]'
            }`}
          />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dfe8e3]">
            Wait-For Cycle (WFG) Deadlock Telemetry
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#7d918a]">
          {deadlock ? `Detected at t${deadlock.tick}` : 'Real-time WFG Active'}
        </span>
      </div>

      {deadlock ? (
        <div className="flex flex-col gap-2 bg-[#0f1513] border border-[#22302b] rounded p-2.5 text-xs font-mono">
          {/* Cycle Dependency Ring */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[#7d918a] uppercase font-bold">
              Detected Circular Wait Dependency:
            </span>
            <div className="flex items-center gap-2 flex-wrap text-sm font-bold text-[#e0a63a]">
              {deadlock.cycle.map((id, idx) => (
                <React.Fragment key={idx}>
                  <span className="px-2 py-0.5 rounded bg-[#e0a63a]/15 border border-[#e0a63a]/40 text-[#e0a63a]">
                    AMR #{id}
                  </span>
                  <span>→</span>
                </React.Fragment>
              ))}
              <span className="px-2 py-0.5 rounded bg-[#e0a63a]/15 border border-[#e0a63a]/40 text-[#e0a63a]">
                AMR #{deadlock.cycle[0]}
              </span>
            </div>
          </div>

          {/* Causal Resolution Evidence */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#22302b] text-[11px]">
            <div>
              <span className="text-[#7d918a] text-[10px]">Recovery Victim:</span>
              <div className="text-[#4fc6c0] font-bold">AMR #{deadlock.recovery_robot}</div>
            </div>
            <div>
              <span className="text-[#7d918a] text-[10px]">Escape Waypoint:</span>
              <div className="text-[#dfe8e3] font-bold">
                {deadlock.escape_node ? `[${deadlock.escape_node[0]},${deadlock.escape_node[1]}]` : 'Dynamic Replan'}
              </div>
            </div>
            <div>
              <span className="text-[#7d918a] text-[10px]">Status:</span>
              <div className={deadlock.resolved ? 'text-[#5fbf7a] font-bold' : 'text-[#e3595a] font-bold'}>
                {deadlock.resolved ? '✓ RESOLVED' : '⏳ BREAKING'}
              </div>
            </div>
            <div>
              <span className="text-[#7d918a] text-[10px]">Recovery Latency:</span>
              <div className="text-[#5fbf7a] font-bold">
                {deadlock.latency_ticks} ticks ({(deadlock.latency_ticks * 0.75).toFixed(1)}s)
              </div>
            </div>
          </div>

          <div className="pt-1 text-[10px] text-[#7d918a]">
            Arbitration Rule: Yielding AMR chosen via minimal task progress & lowest priority score claim: <span className="text-[#dfe8e3]">{deadlock.priority_score}</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 bg-[#0f1513] border border-[#22302b] rounded p-2.5 text-[11px] font-mono">
          <div className="flex items-center justify-between text-[#5fbf7a]">
            <span>✓ No Circular Deadlocks Active in Fleet Graph</span>
            <span className="text-[#7d918a]">Cycle Detector: 0 cycles</span>
          </div>
          <div className="text-[#7d918a] text-[10px]">
            Currently waiting AMRs: {waitingRobots.length > 0 ? waitingRobots.map(r => `AMR #${r.id} (waits for #${r.waiting_on ?? 'corridor'})`).join(', ') : 'None (Fluid Movement)'}
          </div>
        </div>
      )}
    </div>
  );
}

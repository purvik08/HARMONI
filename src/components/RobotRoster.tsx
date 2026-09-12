'use client';

import React from 'react';
import type { SimFrame, RobotState } from '../sim/types';
import { ROBOT_COLORS } from './SimCanvas';

interface RobotRosterProps {
  frame: SimFrame | null;
  onSelectRobot?: (robot: RobotState) => void;
}

export function RobotRoster({ frame, onSelectRobot }: RobotRosterProps) {
  if (!frame || !frame.robots || frame.robots.length === 0) {
    return (
      <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 text-xs text-[#7d918a] font-mono">
        No active AMRs in roster.
      </div>
    );
  }

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7d918a]">
          Autonomous Mobile Robots (AMR Roster)
        </h3>
        <span className="text-[10px] font-mono text-[#7d918a]">
          Safety &gt; Owner &gt; Urgency &gt; Wait &gt; Progress &gt; ID
        </span>
      </div>

      <div className="flex flex-col gap-1.5 max-h-[260px] overflow-y-auto pr-1">
        {frame.robots.map((r, i) => {
          const color = ROBOT_COLORS[i % ROBOT_COLORS.length];
          const hasTask = r.task_id !== null;
          const isWaiting = r.state === 'waiting';
          const isFailed = !r.active;

          return (
            <div
              key={r.id}
              onClick={() => onSelectRobot?.(r)}
              className="bg-[#0f1513] hover:bg-[#18241f] border border-[#22302b] rounded-md px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono cursor-pointer transition"
            >
              {/* Left: ID & Color */}
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-bold text-[#dfe8e3]">AMR #{r.id}</span>
                <span className="text-[10px] text-[#7d918a] bg-[#131a17] px-1.5 py-0.5 rounded border border-[#22302b]">
                  pri:{r.id}
                </span>
              </div>

              {/* Middle: Pos & Route info */}
              <div className="flex items-center gap-3 text-[11px] text-[#7d918a]">
                <span>
                  pos:[{r.pos[0]},{r.pos[1]}]
                </span>
                <span>
                  {hasTask ? (
                    <span className="text-[#5fbf7a]">Task #{r.task_id}</span>
                  ) : (
                    <span className="opacity-50">No task</span>
                  )}
                </span>
                {isWaiting && r.waiting_on !== null && (
                  <span className="text-[#e0a63a]">waits on #{r.waiting_on}</span>
                )}
                <span className="text-[#4fc6c0]">{r.hierarchy_level ?? 'MISSION'}:{r.decision ?? r.state}</span>
                {r.requested_resource && (
                  <span className="text-[#dfe8e3]">req {r.requested_resource}</span>
                )}
                {r.owned_resource && (
                  <span className="text-[#5fbf7a]">own {r.resource_phase}:{r.owned_resource}</span>
                )}
                {r.decision_locked && (
                  <span className="text-[#9a86e0]">locked t{r.committed_until ?? '-'}</span>
                )}
              </div>

              {/* Right: Battery & State Badge */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-[#7d918a]">{r.battery}%</span>
                  <div className="w-8 h-1.5 bg-[#1e2924] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, r.battery))}%`,
                        backgroundColor: r.battery > 30 ? '#5fbf7a' : '#e3595a',
                      }}
                    />
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isFailed
                      ? 'bg-[#e3595a]/20 text-[#e3595a] border border-[#e3595a]/40'
                      : isWaiting
                      ? 'bg-[#e0a63a]/20 text-[#e0a63a] border border-[#e0a63a]/40'
                      : r.state === 'moving'
                      ? 'bg-[#5fbf7a]/20 text-[#5fbf7a] border border-[#5fbf7a]/40'
                      : 'bg-[#7d918a]/10 text-[#7d918a] border border-[#7d918a]/30'
                  }`}
                >
                  {isFailed ? 'FAILED' : r.state}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import type { RobotState } from '../sim/types';

interface StateMachineVisualizerProps {
  robot: RobotState | null;
  currentTick?: number;
}

const LIFECYCLE_STATES = [
  { id: 'idle', label: 'IDLE', desc: 'At dock / awaiting mission' },
  { id: 'planning', label: 'PLANNING', desc: 'A* trajectory calculation' },
  { id: 'requesting', label: 'NEGOTIATING', desc: 'P2P space-time reservation' },
  { id: 'moving', label: 'MOVING', desc: 'Executing trajectory' },
  { id: 'waiting', label: 'WAITING', desc: 'Yielding priority to peer' },
  { id: 'blocked', label: 'REROUTING', desc: 'Dynamic barrier replan' },
  { id: 'failed', label: 'OFFLINE', desc: 'Hardware fault / degraded' },
];

export function StateMachineVisualizer({ robot, currentTick = 0 }: StateMachineVisualizerProps) {
  if (!robot) {
    return (
      <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2 font-mono text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#7d918a]">
          AMR Autonomous State Machine & Decision Lock
        </h3>
        <div className="text-[#7d918a] py-3 text-center text-[11px]">
          Select any AMR on the canvas or roster to inspect its real-time state machine & commitment lock.
        </div>
      </div>
    );
  }

  const activeState = robot.active ? robot.state : 'failed';
  const isLocked = robot.decision_locked || (robot.committed_until !== null && robot.committed_until !== undefined && currentTick < robot.committed_until);
  const lockTicksLeft = robot.committed_until && robot.committed_until > currentTick ? robot.committed_until - currentTick : 0;

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2.5 font-mono text-xs">
      <div className="flex items-center justify-between pb-2 border-b border-[#22302b]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#5fbf7a]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#dfe8e3]">
            AMR #{robot.id} State Machine & Anti-Oscillation Lock
          </h3>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded bg-[#4fc6c0]/15 text-[#4fc6c0] border border-[#4fc6c0]/30 font-bold">
            Layer: {robot.hierarchy_level ?? 'P2P_COORDINATION'}
          </span>
        </div>
      </div>

      {/* State Flow Nodes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
        {LIFECYCLE_STATES.map(s => {
          const isActive = s.id === activeState || (s.id === 'moving' && activeState === 'crossing') || (s.id === 'requesting' && activeState === 'granted');
          return (
            <div
              key={s.id}
              className={`p-2 rounded border flex flex-col gap-0.5 transition ${
                isActive
                  ? 'bg-[#4fc6c0]/15 border-[#4fc6c0] shadow-[0_0_10px_rgba(79,198,192,0.3)]'
                  : 'bg-[#0f1513] border-[#22302b] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold ${isActive ? 'text-[#4fc6c0]' : 'text-[#dfe8e3]'}`}>
                  {s.label}
                </span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#4fc6c0] animate-ping" />}
              </div>
              <span className="text-[9px] text-[#7d918a] truncate">{s.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Decision Commitment Lock & Oscillation Prevention Banner */}
      <div className="bg-[#0f1513] border border-[#22302b] rounded p-2 flex flex-col gap-1.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-[#7d918a]">Decision Commitment Window:</span>
          <span className={isLocked ? 'text-[#9a86e0] font-bold' : 'text-[#5fbf7a]'}>
            {isLocked ? `🔒 LOCKED (${lockTicksLeft} ticks left)` : '🔓 OPEN / ADAPTIVE'}
          </span>
        </div>

        <div className="w-full bg-[#131a17] h-1.5 rounded-full overflow-hidden border border-[#22302b]">
          <div
            className="bg-[#9a86e0] h-full transition-all duration-200"
            style={{ width: isLocked ? `${Math.min(100, (lockTicksLeft / 3) * 100)}%` : '0%' }}
          />
        </div>

        <div className="flex items-start gap-1 text-[10px] text-[#7d918a]">
          <span className="text-[#dfe8e3] font-bold">Reason:</span>
          <span className="text-[#dfe8e3]">{robot.reason || 'Executing trajectory under reservation lease'}</span>
        </div>
      </div>
    </div>
  );
}

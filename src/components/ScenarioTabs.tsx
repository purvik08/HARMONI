'use client';

import React from 'react';
import type { SimLog } from '../sim/types';

interface ScenarioTabsProps {
  activeScenario: string;
  isReplaying: boolean;
  scenarioLog: SimLog | null;
  replayTick: number;
  onSelectScenario: (id: string) => void;
  onSetReplayTick: (tick: number) => void;
}

const SCENARIOS = [
  { id: 'continuous', label: 'Live Sandbox', desc: 'Continuous AMR Fleet Simulation' },
  { id: '1_intersection_conflict', label: '1: Conflict', desc: '3-way Intersection Conflict & Priority' },
  { id: '2_blocked_aisle', label: '2: Blocked Aisle', desc: 'Dynamic Obstacle & Local Replanning' },
  { id: '3_robot_failure', label: '3: AMR Failure', desc: 'AMR Offline & Lease Reassignment' },
  { id: '4_deadlock', label: '4: Deadlock', desc: 'Circular Wait & Deterministic Recovery' },
  { id: '5_infra_failure', label: '5: Wi-Fi Loss', desc: 'Central WMS Failure & P2P Autonomy' },
];

export function ScenarioTabs({
  activeScenario,
  isReplaying,
  scenarioLog,
  replayTick,
  onSelectScenario,
  onSetReplayTick,
}: ScenarioTabsProps) {
  const maxTick = scenarioLog ? scenarioLog.frames.length - 1 : 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Tab Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {SCENARIOS.map(s => {
          const isActive = activeScenario === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectScenario(s.id)}
              className={`px-3 py-1.5 rounded-md font-mono text-xs whitespace-nowrap transition border ${
                isActive
                  ? 'bg-[#4fc6c0] text-[#0d1210] border-[#4fc6c0] font-bold shadow-[0_0_10px_rgba(79,198,192,0.3)]'
                  : 'bg-[#131a17] text-[#7d918a] border-[#22302b] hover:text-[#dfe8e3] hover:border-[#3a4a43]'
              }`}
              title={s.desc}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Scenario Description Banner */}
      <div className="bg-[#131a17] border border-[#22302b] rounded-lg px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-[#dfe8e3]">
          <span className="text-[#4fc6c0] font-bold">
            {SCENARIOS.find(s => s.id === activeScenario)?.label}:{' '}
          </span>
          {SCENARIOS.find(s => s.id === activeScenario)?.desc}
        </div>

        {/* Replay Scrubber if in scenario replay mode */}
        {isReplaying && scenarioLog && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] font-mono text-[#7d918a]">
              Replay: t={replayTick}/{maxTick}
            </span>
            <input
              type="range"
              min={0}
              max={maxTick}
              value={replayTick}
              onChange={e => onSetReplayTick(Number(e.target.value))}
              className="w-32 accent-[#4fc6c0] cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}

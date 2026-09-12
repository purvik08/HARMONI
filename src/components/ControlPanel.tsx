'use client';

import React, { useState } from 'react';
import type { SimFrame, Pos } from '../sim/types';

interface ControlPanelProps {
  isRunning: boolean;
  speed: number;
  mode: 'harmoni' | 'baseline';
  frame: SimFrame | null;
  obstacleMode?: boolean;
  onToggleObstacleMode?: () => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetSpeed: (val: number) => void;
  onSetMode: (val: 'harmoni' | 'baseline') => void;
  onSpawnRobot: () => void;
  onRemoveRobot: (id: number) => void;
  onBlockAisle: (a: Pos, b: Pos) => void;
  onUnblockAisle: (a: Pos, b: Pos) => void;
  onToggleNodeObstacle?: (pos: Pos) => void;
  onClearAllObstacles?: () => void;
  onDisableRobot: (id: number) => void;
  onRecoverRobot: (id: number) => void;
  onTriggerDeadlock: () => void;
  onTriggerInfraFailure: () => void;
  onRestoreInfra: () => void;
  onTriggerP2pFailure: () => void;
  onRestoreP2p: () => void;
  onAddTask: () => void;
}

export function ControlPanel({
  isRunning,
  speed,
  mode,
  frame,
  obstacleMode = false,
  onToggleObstacleMode,
  onStart,
  onPause,
  onReset,
  onSetSpeed,
  onSetMode,
  onSpawnRobot,
  onRemoveRobot,
  onBlockAisle,
  onUnblockAisle,
  onToggleNodeObstacle,
  onClearAllObstacles,
  onDisableRobot,
  onRecoverRobot,
  onTriggerDeadlock,
  onTriggerInfraFailure,
  onRestoreInfra,
  onTriggerP2pFailure,
  onRestoreP2p,
  onAddTask,
}: ControlPanelProps) {
  const [selectedRobotId, setSelectedRobotId] = useState<number>(0);
  const [customX, setCustomX] = useState<number>(13);
  const [customY, setCustomY] = useState<number>(10);

  const robots = frame?.robots || [];
  const infraOnline = frame?.infra_online ?? true;
  const p2pOnline = frame?.p2p_online ?? true;

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-3">
      {/* Primary Sim Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Play/Pause & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={isRunning ? onPause : onStart}
            className={`px-4 py-1.5 rounded-md font-mono text-xs font-bold transition flex items-center gap-1.5 ${
              isRunning
                ? 'bg-[#e0a63a] text-[#0d1210] hover:bg-[#d0962a]'
                : 'bg-[#4fc6c0] text-[#0d1210] hover:bg-[#3fb6b0]'
            }`}
          >
            {isRunning ? '❚❚ PAUSE' : '▶ START SIM'}
          </button>

          <button
            onClick={onReset}
            className="px-3 py-1.5 bg-[#0f1513] hover:bg-[#18241f] border border-[#22302b] text-[#dfe8e3] rounded-md font-mono text-xs transition"
          >
            ↺ RESET
          </button>
        </div>

        {/* Speed Multiplier Buttons */}
        <div className="flex items-center gap-1 bg-[#0f1513] border border-[#22302b] p-0.5 rounded-md">
          <span className="text-[10px] font-mono text-[#7d918a] px-1.5">Speed:</span>
          {[0.25, 0.5, 1, 2, 4].map(s => (
            <button
              key={s}
              onClick={() => onSetSpeed(s)}
              className={`px-2 py-1 text-[11px] font-mono rounded ${
                speed === s
                  ? 'bg-[#4fc6c0] text-[#0d1210] font-bold'
                  : 'text-[#7d918a] hover:text-[#dfe8e3]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-[#0f1513] border border-[#22302b] p-0.5 rounded-md">
          <button
            onClick={() => onSetMode('harmoni')}
            className={`px-2.5 py-1 text-[11px] font-mono rounded transition ${
              mode === 'harmoni'
                ? 'bg-[#4fc6c0] text-[#0d1210] font-bold'
                : 'text-[#7d918a] hover:text-[#dfe8e3]'
            }`}
          >
            HARMONI
          </button>
          <button
            onClick={() => onSetMode('baseline')}
            className={`px-2.5 py-1 text-[11px] font-mono rounded transition ${
              mode === 'baseline'
                ? 'bg-[#e0a63a] text-[#0d1210] font-bold'
                : 'text-[#7d918a] hover:text-[#dfe8e3]'
            }`}
          >
            Baseline
          </button>
        </div>
      </div>

      {/* Interactive Simulation Injections */}
      <div className="border-t border-[#22302b] pt-2 flex flex-col gap-2">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#7d918a]">
          Inject Failures & Dynamic Events (Live Interaction)
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Infrastructure / WMS Fail Toggle */}
          {infraOnline ? (
            <button
              onClick={onTriggerInfraFailure}
              className="px-2.5 py-1.5 bg-[#0f1513] hover:bg-[#251717] border border-[#e3595a]/40 text-[#e3595a] rounded text-xs font-mono transition text-left"
            >
              Drop WMS Link
            </button>
          ) : (
            <button
              onClick={onRestoreInfra}
              className="px-2.5 py-1.5 bg-[#5fbf7a]/10 hover:bg-[#5fbf7a]/20 border border-[#5fbf7a] text-[#5fbf7a] rounded text-xs font-mono transition text-left font-bold"
            >
              Restore WMS Link
            </button>
          )}

          {/* P2P Mesh Fail Toggle */}
          {p2pOnline ? (
            <button
              onClick={onTriggerP2pFailure}
              className="px-2.5 py-1.5 bg-[#0f1513] hover:bg-[#251717] border border-[#e3595a]/40 text-[#e3595a] rounded text-xs font-mono transition text-left"
            >
              Drop P2P Link
            </button>
          ) : (
            <button
              onClick={onRestoreP2p}
              className="px-2.5 py-1.5 bg-[#4fc6c0]/10 hover:bg-[#4fc6c0]/20 border border-[#4fc6c0] text-[#4fc6c0] rounded text-xs font-mono transition text-left font-bold"
            >
              Restore P2P Link
            </button>
          )}

          {/* Trigger Deadlock */}
          <button
            onClick={onTriggerDeadlock}
            className="px-2.5 py-1.5 bg-[#0f1513] hover:bg-[#271f15] border border-[#e0a63a]/40 text-[#e0a63a] rounded text-xs font-mono transition text-left"
          >
            ⚠️ Induce Deadlock
          </button>

          {/* Add Random Task */}
          <button
            onClick={onAddTask}
            className="px-2.5 py-1.5 bg-[#0f1513] hover:bg-[#18241f] border border-[#5fbf7a]/40 text-[#5fbf7a] rounded text-xs font-mono transition text-left"
          >
            + Add Warehouse Task
          </button>
        </div>

        {/* Interactive Obstacle Placement & Map Control */}
        <div className="bg-[#0f1513] border border-[#22302b] rounded p-2.5 flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleObstacleMode}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                  obstacleMode
                    ? 'bg-[#e3595a] text-white shadow-[0_0_10px_rgba(227,89,90,0.5)] animate-pulse'
                    : 'bg-[#18241f] border border-[#e3595a]/40 text-[#e3595a] hover:bg-[#e3595a]/20'
                }`}
              >
                {obstacleMode ? '🛑 OBSTACLE PLACEMENT: ACTIVE (Click Map)' : '➕ OBSTACLE PLACEMENT MODE'}
              </button>

              {onClearAllObstacles && (
                <button
                  onClick={onClearAllObstacles}
                  className="px-2.5 py-1 bg-[#18241f] hover:bg-[#251717] border border-[#e3595a]/30 text-[#dfe8e3] rounded text-xs font-mono transition"
                >
                  ✕ Clear All Dynamic Obstacles
                </button>
              )}
            </div>

            {/* Custom Coordinate Blocker */}
            <div className="flex items-center gap-1 text-xs font-mono">
              <span className="text-[#7d918a]">Coord:</span>
              <input
                type="number"
                min="0"
                max="27"
                value={customX}
                onChange={e => setCustomX(Math.max(0, Math.min(27, Number(e.target.value))))}
                className="w-10 bg-[#131a17] text-[#dfe8e3] border border-[#22302b] rounded px-1 py-0.5 text-center text-xs"
                title="X coordinate"
              />
              <span className="text-[#7d918a]">,</span>
              <input
                type="number"
                min="0"
                max="19"
                value={customY}
                onChange={e => setCustomY(Math.max(0, Math.min(19, Number(e.target.value))))}
                className="w-10 bg-[#131a17] text-[#dfe8e3] border border-[#22302b] rounded px-1 py-0.5 text-center text-xs"
                title="Y coordinate"
              />
              <button
                onClick={() => onToggleNodeObstacle && onToggleNodeObstacle([customX, customY])}
                className="px-2 py-0.5 bg-[#e3595a]/15 text-[#e3595a] border border-[#e3595a]/30 rounded hover:bg-[#e3595a]/25 text-xs font-mono ml-1"
              >
                Toggle Cell Barrier
              </button>
            </div>
          </div>

          {/* Quick Obstacle Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#22302b]/60 text-[11px] font-mono">
            <span className="text-[#7d918a]">Quick Presets:</span>
            <button
              onClick={() => onBlockAisle([3, 1], [3, 2])}
              className="px-2 py-0.5 bg-[#131a17] hover:bg-[#1f2d27] border border-[#22302b] text-[#dfe8e3] rounded"
            >
              Dock [3,1]-[3,2]
            </button>
            <button
              onClick={() => onBlockAisle([13, 10], [14, 10])}
              className="px-2 py-0.5 bg-[#131a17] hover:bg-[#1f2d27] border border-[#22302b] text-[#dfe8e3] rounded"
            >
              Intersection [13,10]-[14,10]
            </button>
            <button
              onClick={() => onBlockAisle([10, 10], [10, 11])}
              className="px-2 py-0.5 bg-[#131a17] hover:bg-[#1f2d27] border border-[#22302b] text-[#dfe8e3] rounded"
            >
              Cross [10,10]-[10,11]
            </button>
            <button
              onClick={() => onBlockAisle([20, 10], [21, 10])}
              className="px-2 py-0.5 bg-[#131a17] hover:bg-[#1f2d27] border border-[#22302b] text-[#dfe8e3] rounded"
            >
              Handoff [20,10]-[21,10]
            </button>
          </div>
        </div>

        {/* Fleet Management */}
        <div className="flex items-center gap-1.5 bg-[#0f1513] border border-[#22302b] px-2.5 py-1.5 rounded text-xs">
          <span className="text-[#7d918a] font-mono text-[11px]">Robot:</span>
          <select
            value={selectedRobotId}
            onChange={e => setSelectedRobotId(Number(e.target.value))}
            className="bg-[#131a17] text-[#dfe8e3] border border-[#22302b] rounded px-1.5 py-0.5 text-[11px] font-mono"
          >
            {robots.map(r => (
              <option key={r.id} value={r.id}>
                #{r.id} ({r.state})
              </option>
            ))}
          </select>

          <button
            onClick={() => onDisableRobot(selectedRobotId)}
            className="px-2 py-0.5 bg-[#e3595a]/15 text-[#e3595a] border border-[#e3595a]/30 rounded hover:bg-[#e3595a]/25 text-[11px] font-mono"
          >
            Disable
          </button>
          <button
            onClick={() => onRecoverRobot(selectedRobotId)}
            className="px-2 py-0.5 bg-[#5fbf7a]/15 text-[#5fbf7a] border border-[#5fbf7a]/30 rounded hover:bg-[#5fbf7a]/25 text-[11px] font-mono"
          >
            Recover
          </button>

          <button
            onClick={onSpawnRobot}
            className="px-2.5 py-0.5 bg-[#4fc6c0]/15 text-[#4fc6c0] border border-[#4fc6c0]/30 rounded hover:bg-[#4fc6c0]/25 text-[11px] font-mono ml-auto font-bold"
            title="Spawn additional AMR"
          >
            + Spawn AMR
          </button>
        </div>
      </div>
    </div>
  );
}

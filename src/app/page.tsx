'use client';

import React, { useState } from 'react';
import { useSimWorker } from '../hooks/useSimWorker';
import { SimCanvas } from '../components/SimCanvas';
import { StatusPanel } from '../components/StatusPanel';
import { ControlPanel } from '../components/ControlPanel';
import { RobotRoster } from '../components/RobotRoster';
import { EventFeed } from '../components/EventFeed';
import { MetricsPanel } from '../components/MetricsPanel';
import { BenchmarkPanel } from '../components/BenchmarkPanel';
import { ScenarioTabs } from '../components/ScenarioTabs';
import type { RobotState } from '../sim/types';

export default function HomePage() {
  const {
    frame,
    metrics,
    benchmarkResult,
    isBenchmarking,
    scenarioLog,
    isRunning,
    speed,
    mode,
    activeScenario,
    isReplaying,
    replayTick,
    start,
    pause,
    reset,
    setSpeed,
    setMode,
    spawnRobot,
    removeRobot,
    blockAisle,
    unblockAisle,
    disableRobot,
    recoverRobot,
    triggerDeadlock,
    triggerInfraFailure,
    restoreInfra,
    triggerP2pFailure,
    restoreP2p,
    addTask,
    runScenario,
    runBenchmarkTest,
    setReplayIndex,
  } = useSimWorker();

  const [inspectedRobot, setInspectedRobot] = useState<RobotState | null>(null);

  const handleBlockEdgeToggle = (a: [number, number], b: [number, number]) => {
    // Check if edge is currently blocked in frame
    const isBlocked = frame?.blocked_edges.some(edge => {
      const [e1, e2] = edge;
      return (
        (e1[0] === a[0] && e1[1] === a[1] && e2[0] === b[0] && e2[1] === b[1]) ||
        (e1[0] === b[0] && e1[1] === b[1] && e2[0] === a[0] && e2[1] === a[1])
      );
    });

    if (isBlocked) {
      unblockAisle(a, b);
    } else {
      blockAisle(a, b);
    }
  };

  const handleSelectScenario = (id: string) => {
    if (id === 'continuous') {
      reset();
    } else {
      runScenario(id);
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-3 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#22302b] gap-2">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#4fc6c0] shadow-[0_0_10px_#4fc6c0] animate-pulse" />
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-[#dfe8e3]">
              HARMONI
            </h1>
            <p className="text-xs text-[#7d918a]">
              Edge-AI Distributed Fleet Coordination for AMRs • Browser Digital Twin
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-[#131a17] border border-[#22302b] text-[#7d918a]">
            SIH26123
          </span>
          <span className="px-2 py-0.5 rounded bg-[#4fc6c0]/15 border border-[#4fc6c0]/30 text-[#4fc6c0] font-bold">
            Vercel Ready
          </span>
        </div>
      </header>

      {/* Scenario Selection Tabs */}
      <ScenarioTabs
        activeScenario={activeScenario}
        isReplaying={isReplaying}
        scenarioLog={scenarioLog}
        replayTick={replayTick}
        onSelectScenario={handleSelectScenario}
        onSetReplayTick={setReplayIndex}
      />

      {/* Network and Operating Mode Status */}
      <StatusPanel frame={frame} tick={frame?.tick} mode={mode} />

      {/* Main Grid: Simulation Canvas & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Warehouse Canvas + Live Controls */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7d918a]">
                Warehouse Map & Space-Time Coordination Grid
              </h2>
              <span className="text-[10px] font-mono text-[#7d918a]">
                Click adjacent nodes to block/unblock aisles
              </span>
            </div>

            <SimCanvas
              frame={frame}
              width={activeScenario === '4_deadlock' ? 0 : (scenarioLog?.warehouse?.width ?? 22)}
              height={activeScenario === '4_deadlock' ? 0 : (scenarioLog?.warehouse?.height ?? 16)}
              onBlockEdge={handleBlockEdgeToggle}
              onSelectRobot={r => setInspectedRobot(r)}
            />

            {/* Canvas Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[10px] font-mono text-[#7d918a]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#4fc6c0]" /> AMR Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#e0a63a]" /> Waiting (Conflict)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#e3595a]" /> Failed / Safe Mode
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded border border-[#5fbf7a] bg-[#5fbf7a]/20" /> Pickup (P)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded border border-[#9a86e0] bg-[#9a86e0]/20" /> Dropoff (D)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-[#e3595a]" /> Blocked Aisle
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 border-t border-dashed border-[#4fc6c0]" /> P2P Mesh Link
              </span>
            </div>
          </div>

          {/* Interactive Control Panel */}
          <ControlPanel
            isRunning={isRunning}
            speed={speed}
            mode={mode}
            frame={frame}
            onStart={start}
            onPause={pause}
            onReset={reset}
            onSetSpeed={setSpeed}
            onSetMode={setMode}
            onSpawnRobot={spawnRobot}
            onRemoveRobot={removeRobot}
            onBlockAisle={blockAisle}
            onUnblockAisle={unblockAisle}
            onDisableRobot={disableRobot}
            onRecoverRobot={recoverRobot}
            onTriggerDeadlock={triggerDeadlock}
            onTriggerInfraFailure={triggerInfraFailure}
            onRestoreInfra={restoreInfra}
            onTriggerP2pFailure={triggerP2pFailure}
            onRestoreP2p={restoreP2p}
            onAddTask={addTask}
          />
        </div>

        {/* Right 1 Col: Robot Roster & Event Feed */}
        <div className="flex flex-col gap-4">
          <RobotRoster
            frame={frame}
            onSelectRobot={r => setInspectedRobot(r)}
          />

          <EventFeed events={frame?.events_this_tick || []} />
        </div>
      </div>

      {/* Live Metrics Row */}
      <MetricsPanel metrics={metrics} />

      {/* Real Simulation Benchmark Panel */}
      <BenchmarkPanel
        benchmarkResult={benchmarkResult}
        isBenchmarking={isBenchmarking}
        onRunBenchmark={runBenchmarkTest}
      />

      {/* Onboard Robot Inspection Modal */}
      {inspectedRobot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#131a17] border border-[#22302b] rounded-lg max-w-md w-full p-4 flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#22302b]">
              <h3 className="text-sm font-bold text-[#4fc6c0]">
                Onboard Telemetry — AMR #{inspectedRobot.id}
              </h3>
              <button
                onClick={() => setInspectedRobot(null)}
                className="text-[#7d918a] hover:text-[#dfe8e3] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[#7d918a]">Physical Position:</span>
                <div className="text-[#dfe8e3] font-bold">
                  [{inspectedRobot.pos[0]}, {inspectedRobot.pos[1]}]
                </div>
              </div>

              <div>
                <span className="text-[#7d918a]">Operating State:</span>
                <div className="text-[#5fbf7a] font-bold uppercase">
                  {inspectedRobot.state}
                </div>
              </div>

              <div>
                <span className="text-[#7d918a]">Priority Rank:</span>
                <div className="text-[#dfe8e3]">
                  Level {inspectedRobot.id} (Deterministic ID)
                </div>
              </div>

              <div>
                <span className="text-[#7d918a]">Battery SoC:</span>
                <div className="text-[#dfe8e3]">{inspectedRobot.battery}%</div>
              </div>

              <div>
                <span className="text-[#7d918a]">Active Task Lease:</span>
                <div className="text-[#dfe8e3]">
                  {inspectedRobot.task_id !== null ? `#${inspectedRobot.task_id}` : 'None'}
                </div>
              </div>

              <div>
                <span className="text-[#7d918a]">Waiting On:</span>
                <div className="text-[#e0a63a]">
                  {inspectedRobot.waiting_on !== null
                    ? `AMR #${inspectedRobot.waiting_on}`
                    : 'Clear'}
                </div>
              </div>
            </div>

            <div>
              <span className="text-[#7d918a] text-[10px]">Planned Waypoint Trajectory:</span>
              <div className="bg-[#0f1513] p-2 rounded border border-[#22302b] text-[10px] text-[#dfe8e3] overflow-x-auto">
                {inspectedRobot.path.map(p => `[${p[0]},${p[1]}]`).join(' → ') || 'Stationary'}
              </div>
            </div>

            <div className="pt-2 border-t border-[#22302b] flex justify-end">
              <button
                onClick={() => setInspectedRobot(null)}
                className="px-3 py-1 bg-[#0f1513] hover:bg-[#18241f] border border-[#22302b] text-[#dfe8e3] rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Architectural Disclosures & Notes */}
      <footer className="mt-4 pt-4 border-t border-[#22302b] text-[11px] text-[#7d918a] leading-relaxed flex flex-col gap-2 font-mono">
        <div>
          <b className="text-[#dfe8e3]">HARMONI Architecture Principle:</b> All decision-making is distributed. No central controller computes robot paths. Each robot runs local deterministic A* navigation, requests space-time reservations, senses obstacles via simulated LiDAR, and exchanges intent over the peer-to-peer bus abstraction.
        </div>
        <div>
          <b className="text-[#dfe8e3]">Network Disclosure:</b> Wireless networking is modeled logically as dual-layer pub/sub (Infrastructure WMS + P2P Mesh), honestly demonstrating behavior under Wi-Fi severing rather than simulating RF physics in Vercel.
        </div>
      </footer>
    </main>
  );
}

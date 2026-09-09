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
    frameHarmoni,
    frameBaseline,
    metricsHarmoni,
    metricsBaseline,
    benchmarkResult,
    isBenchmarking,
    scenarioLogHarmoni,
    scenarioLogBaseline,
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
    const isBlocked = frameHarmoni?.blocked_edges.some(edge => {
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

  const gridW = activeScenario === '4_deadlock' ? 0 : 28;
  const gridH = activeScenario === '4_deadlock' ? 0 : 20;

  return (
    <main className="max-w-7xl mx-auto p-3 sm:p-5 flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#22302b] gap-2">
        <div className="flex items-center gap-3">
          <div className="w-3.5 h-3.5 rounded-full bg-[#4fc6c0] shadow-[0_0_12px_#4fc6c0] animate-pulse" />
          <div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-[#dfe8e3]">
              HARMONI <span className="text-[#4fc6c0] text-sm font-normal">v2</span>
            </h1>
            <p className="text-xs text-[#7d918a]">
              Parallel Digital Twin • HARMONI (Distributed) vs STANDARD (Stop-and-Wait Baseline)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
          <span className="px-2 py-0.5 rounded bg-[#131a17] border border-[#22302b] text-[#7d918a]">
            SIH26123
          </span>
          <span className="px-2 py-0.5 rounded bg-[#4fc6c0]/15 border border-[#4fc6c0]/30 text-[#4fc6c0] font-bold">
            28×20 Grid • Parallel Twin
          </span>
        </div>
      </header>

      {/* Scenario Selection Tabs */}
      <ScenarioTabs
        activeScenario={activeScenario}
        isReplaying={isReplaying}
        scenarioLog={scenarioLogHarmoni}
        replayTick={replayTick}
        onSelectScenario={handleSelectScenario}
        onSetReplayTick={setReplayIndex}
      />

      {/* Operating Status Panel */}
      <StatusPanel frame={frameHarmoni} tick={frameHarmoni?.tick} mode={mode} />

      {/* Side-by-Side Split Screen Canvas View */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* LEFT PANE: HARMONI Distributed */}
        <div className="bg-[#131a17] border-2 border-[#4fc6c0]/60 rounded-xl p-3 flex flex-col gap-2 shadow-[0_0_15px_rgba(79,198,192,0.08)]">
          <div className="flex items-center justify-between pb-2 border-b border-[#22302b]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4fc6c0] shadow-[0_0_8px_#4fc6c0] animate-pulse" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#4fc6c0]">
                HARMONI • Distributed Fleet
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-[#4fc6c0]/20 text-[#4fc6c0] font-bold border border-[#4fc6c0]/40">
                Space-Time Res. + Selective P2P
              </span>
              <span className="text-[#dfe8e3] bg-[#0f1513] px-1.5 py-0.5 rounded border border-[#22302b]">
                Tick {frameHarmoni?.tick ?? 0}
              </span>
            </div>
          </div>

          <SimCanvas
            frame={frameHarmoni}
            width={gridW}
            height={gridH}
            onBlockEdge={handleBlockEdgeToggle}
            onSelectRobot={r => setInspectedRobot(r)}
          />

          {/* HARMONI Quick Stats */}
          <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
            <div className="bg-[#0f1513] p-1.5 rounded border border-[#22302b] flex flex-col">
              <span className="text-[9px] text-[#7d918a]">Delivered</span>
              <span className="text-sm font-bold text-[#5fbf7a]">{metricsHarmoni?.tasks_completed ?? 0}</span>
            </div>
            <div className="bg-[#0f1513] p-1.5 rounded border border-[#22302b] flex flex-col">
              <span className="text-[9px] text-[#7d918a]">Waiting</span>
              <span className="text-sm font-bold text-[#e0a63a]">
                {frameHarmoni?.robots.filter(r => r.state === 'waiting').length ?? 0}
              </span>
            </div>
            <div className="bg-[#0f1513] p-1.5 rounded border border-[#22302b] flex flex-col">
              <span className="text-[9px] text-[#7d918a]">Deadlocks</span>
              <span className="text-sm font-bold text-[#2ecc71]">
                {metricsHarmoni?.deadlocks_resolved ?? 0} RESOLVED ✓
              </span>
            </div>
            <div className="bg-[#0f1513] p-1.5 rounded border border-[#22302b] flex flex-col">
              <span className="text-[9px] text-[#7d918a]">Comm Events</span>
              <span className="text-sm font-bold text-[#4fc6c0]">
                {frameHarmoni?.robots.reduce((acc, r) => acc + (r.comm_events || 0), 0) ?? 0}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: STANDARD Baseline */}
        <div className="bg-[#131a17] border-2 border-[#5a6660]/70 rounded-xl p-3 flex flex-col gap-2 shadow-[0_0_15px_rgba(90,102,96,0.08)]">
          <div className="flex items-center justify-between pb-2 border-b border-[#22302b]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e0a63a]" />
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#a0a8a4]">
                STANDARD • Stop-and-Wait Mutex
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px]">
              <span className="px-2 py-0.5 rounded bg-[#5a6660]/30 text-[#dfe8e3] font-bold border border-[#5a6660]/50">
                Centralized Mutex + Beacon
              </span>
              <span className="text-[#dfe8e3] bg-[#0f1513] px-1.5 py-0.5 rounded border border-[#22302b]">
                Tick {frameBaseline?.tick ?? 0}
              </span>
            </div>
          </div>

          <SimCanvas
            frame={frameBaseline}
            width={gridW}
            height={gridH}
            onBlockEdge={handleBlockEdgeToggle}
            onSelectRobot={r => setInspectedRobot(r)}
          />

          {/* Baseline Quick Stats */}
          <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
            <div className="bg-[#0f1513] p-1.5 rounded border border-[#22302b] flex flex-col">
              <span className="text-[9px] text-[#7d918a]">Delivered</span>
              <span className="text-sm font-bold text-[#a0a8a4]">{metricsBaseline?.tasks_completed ?? 0}</span>
            </div>
            <div className="bg-[#0f1513] p-1.5 rounded border border-[#22302b] flex flex-col">
              <span className="text-[9px] text-[#7d918a]">Waiting</span>
              <span className="text-sm font-bold text-[#e3595a]">
                {frameBaseline?.robots.filter(r => r.state === 'waiting').length ?? 0}
              </span>
            </div>
            <div className="bg-[#0f1513] p-1.5 rounded border border-[#22302b] flex flex-col">
              <span className="text-[9px] text-[#7d918a]">Deadlocks</span>
              <span className="text-sm font-bold text-[#e3595a]">
                {(metricsBaseline?.deadlocks_detected ?? 0) > 0 ? 'STALLED ✗' : '0'}
              </span>
            </div>
            <div className="bg-[#0f1513] p-1.5 rounded border border-[#22302b] flex flex-col">
              <span className="text-[9px] text-[#7d918a]">Comm Events</span>
              <span className="text-sm font-bold text-[#7d918a]">
                {frameBaseline?.robots.reduce((acc, r) => acc + (r.comm_events || 0), 0) ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Global Interactive Control Panel */}
      <ControlPanel
        isRunning={isRunning}
        speed={speed}
        mode={mode}
        frame={frameHarmoni}
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

      {/* Real-time Side-by-Side Comparison Metrics */}
      <MetricsPanel
        metricsHarmoni={metricsHarmoni}
        metricsBaseline={metricsBaseline}
      />

      {/* Bottom Row: Robot Roster & Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RobotRoster
          frame={frameHarmoni}
          onSelectRobot={r => setInspectedRobot(r)}
        />
        <EventFeed events={frameHarmoni?.events_this_tick || []} />
      </div>

      {/* Benchmark Verification Section */}
      <BenchmarkPanel
        benchmarkResult={benchmarkResult}
        isBenchmarking={isBenchmarking}
        onRunBenchmark={runBenchmarkTest}
      />

      {/* Robot Telemetry Modal */}
      {inspectedRobot && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#131a17] border border-[#22302b] rounded-lg max-w-md w-full p-4 flex flex-col gap-3 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#22302b]">
              <h3 className="text-sm font-bold text-[#4fc6c0]">
                AMR #{inspectedRobot.id} Live Telemetry
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
                <span className="text-[#7d918a]">Position:</span>
                <div className="text-[#dfe8e3] font-bold">
                  [{inspectedRobot.pos[0]}, {inspectedRobot.pos[1]}]
                </div>
              </div>

              <div>
                <span className="text-[#7d918a]">State:</span>
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
                <span className="text-[#7d918a]">Battery:</span>
                <div className="text-[#dfe8e3]">{inspectedRobot.battery}%</div>
              </div>

              <div>
                <span className="text-[#7d918a]">Task Lease:</span>
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

      {/* Architecture Footer */}
      <footer className="mt-4 pt-4 border-t border-[#22302b] text-[11px] text-[#7d918a] leading-relaxed flex flex-col gap-2 font-mono">
        <div>
          <b className="text-[#dfe8e3]">HARMONI vs Standard Baseline:</b> HARMONI operates on localized space-time reservations, selective P2P coordination, and decentralized cycle recovery. Standard baseline uses centralized mutex locks, full-rate beacons, and has no cycle escape mechanisms.
        </div>
      </footer>
    </main>
  );
}

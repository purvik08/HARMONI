'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSimWorker } from '../hooks/useSimWorker';
import { SimCanvas } from '../components/SimCanvas';
import { ControlPanel } from '../components/ControlPanel';
import { EventFeed } from '../components/EventFeed';
import { MetricsPanel } from '../components/MetricsPanel';
import { BenchmarkPanel } from '../components/BenchmarkPanel';
import { JuryDemoController } from '../components/JuryDemoController';
import { P2PMessageInspector } from '../components/P2PMessageInspector';
import { DeadlockVisualizer } from '../components/DeadlockVisualizer';
import { StateMachineVisualizer } from '../components/StateMachineVisualizer';
import { RobotRoster } from '../components/RobotRoster';
import type { RobotState } from '../sim/types';

export default function HomePage() {
  const {
    frameHarmoni,
    frameBaseline,
    metricsHarmoni,
    metricsBaseline,
    benchmarkResult,
    monteCarloResult,
    isBenchmarking,
    isMonteCarloBenchmarking,
    isRunning,
    speed,
    mode,
    isJuryDemoRunning,
    juryDemoStageIndex,
    juryDemoStageSecRemaining,
    currentJuryDemoStage,
    start,
    pause,
    reset,
    setSpeed,
    setMode,
    spawnRobot,
    removeRobot,
    blockAisle,
    unblockAisle,
    toggleNodeObstacle,
    clearObstacles,
    disableRobot,
    recoverRobot,
    triggerDeadlock,
    triggerInfraFailure,
    restoreInfra,
    triggerP2pFailure,
    restoreP2p,
    addTask,
    runBenchmarkTest,
    runMonteCarloTest,
    runJuryDemo,
    stopJuryDemo,
  } = useSimWorker();

  const [inspectedRobot, setInspectedRobot] = useState<RobotState | null>(null);
  const [obstacleMode, setObstacleMode] = useState<boolean>(false);
  const hasAutoStarted = useRef(false);

  // Auto-start simulation on first mount for instant live state
  useEffect(() => {
    if (!hasAutoStarted.current) {
      hasAutoStarted.current = true;
      const timer = setTimeout(() => {
        start();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [start]);

  // Update inspected robot when frame updates
  useEffect(() => {
    if (inspectedRobot && frameHarmoni) {
      const updated = frameHarmoni.robots.find(r => r.id === inspectedRobot.id);
      if (updated) setInspectedRobot(updated);
    }
  }, [frameHarmoni, inspectedRobot?.id]);

  const handleBlockEdgeToggle = (a: [number, number], b: [number, number]) => {
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

  const handleToggleNode = (pos: [number, number]) => {
    toggleNodeObstacle(pos);
  };

  // Derived status values
  const infraOnline = frameHarmoni?.infra_online ?? true;
  const p2pOnline = frameHarmoni?.p2p_online ?? true;
  const activeRobots = frameHarmoni?.robots.filter(r => r.active).length ?? 0;
  const totalRobots = frameHarmoni?.robots.length ?? 0;
  const currentTick = frameHarmoni?.tick ?? 0;
  const tasksDelivered = metricsHarmoni?.tasks_completed ?? 0;
  const waitingCount = frameHarmoni?.robots.filter(r => r.state === 'waiting').length ?? 0;

  // Fleet operational status
  const getFleetStatus = () => {
    if (!frameHarmoni) return { label: 'INITIALIZING', color: '#7d918a', glow: '#7d918a' };
    if (!infraOnline && !p2pOnline) return { label: 'ISOLATED MODE', color: '#e3595a', glow: '#e3595a' };
    if (!infraOnline) return { label: 'P2P DISTRIBUTED', color: '#5fbf7a', glow: '#5fbf7a' };
    if (!p2pOnline) return { label: 'LOCAL AUTONOMY', color: '#e0a63a', glow: '#e0a63a' };
    if (frameHarmoni?.active_deadlock && !frameHarmoni.active_deadlock.resolved) return { label: 'DEADLOCK BREAKING', color: '#e0a63a', glow: '#e0a63a' };
    return { label: 'FLEET OPERATIONAL', color: '#4fc6c0', glow: '#4fc6c0' };
  };
  const fleetStatus = getFleetStatus();

  return (
    <div
      className="min-h-screen bg-[#080c0a] text-[#dfe8e3]"
      style={{ fontFamily: "'JetBrains Mono', 'Roboto Mono', 'Courier New', monospace" }}
    >
      {/* ═══════════════════ TOP COMMAND DECK ═══════════════════ */}
      <header className="sticky top-0 z-40 bg-[#080c0a]/95 backdrop-blur-sm border-b border-[#1a2620] shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
        <div className="max-w-[1800px] mx-auto px-4 py-2.5 flex flex-wrap items-center gap-3">

          {/* Brand */}
          <div className="flex items-center gap-3 mr-2">
            <div className="relative">
              <div className="w-4 h-4 rounded-full border-2 border-[#4fc6c0] shadow-[0_0_14px_#4fc6c0]" />
              <div className="absolute inset-0 rounded-full bg-[#4fc6c0]/30 animate-ping" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-[#dfe8e3] leading-none">
                HARMONI <span className="text-[#4fc6c0] font-normal text-xs">v2 • AMR Fleet Digital Twin</span>
              </h1>
              <p className="text-[9px] text-[#4d6059] leading-none mt-0.5">Decentralized P2P Fleet Coordination • 28×20 Warehouse Grid</p>
            </div>
          </div>

          {/* Live Status Indicators */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Fleet Status Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold"
              style={{
                color: fleetStatus.color,
                borderColor: `${fleetStatus.color}50`,
                backgroundColor: `${fleetStatus.color}10`,
                boxShadow: `0 0 12px ${fleetStatus.glow}20`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: fleetStatus.color }}
              />
              {fleetStatus.label}
            </div>

            {/* WMS */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] ${infraOnline ? 'text-[#5fbf7a] border-[#5fbf7a]/30 bg-[#5fbf7a]/8' : 'text-[#e3595a] border-[#e3595a]/40 bg-[#e3595a]/10'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${infraOnline ? 'bg-[#5fbf7a] shadow-[0_0_6px_#5fbf7a]' : 'bg-[#e3595a]'}`} />
              WMS {infraOnline ? 'ONLINE' : 'OFFLINE'}
            </div>

            {/* P2P */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] ${p2pOnline ? 'text-[#4fc6c0] border-[#4fc6c0]/30 bg-[#4fc6c0]/8' : 'text-[#e3595a] border-[#e3595a]/40 bg-[#e3595a]/10'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${p2pOnline ? 'bg-[#4fc6c0] shadow-[0_0_6px_#4fc6c0] animate-pulse' : 'bg-[#e3595a]'}`} />
              P2P {p2pOnline ? 'ACTIVE' : 'OFFLINE'}
            </div>

            {/* AMR Count */}
            <div className="px-2 py-1 rounded-md border border-[#22302b] bg-[#131a17] text-[10px] text-[#dfe8e3]">
              <span className="text-[#4fc6c0] font-bold">{activeRobots}</span>/{totalRobots} AMRs
            </div>

            {/* Tick Clock */}
            <div className="px-2.5 py-1 rounded-md border border-[#22302b] bg-[#0f1513] text-[#4fc6c0] text-[11px] font-bold tabular-nums">
              t={currentTick.toString().padStart(5, '0')}
            </div>

            {/* Tasks Delivered */}
            <div className="px-2 py-1 rounded-md border border-[#22302b] bg-[#131a17] text-[10px]">
              <span className="text-[#7d918a]">Delivered: </span>
              <span className="text-[#5fbf7a] font-bold">{tasksDelivered}</span>
            </div>

            {/* Waiting AMRs */}
            {waitingCount > 0 && (
              <div className="px-2 py-1 rounded-md border border-[#e0a63a]/30 bg-[#e0a63a]/10 text-[#e0a63a] text-[10px]">
                ⚡ {waitingCount} yielding
              </div>
            )}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sim Controls */}
          <div className="flex items-center gap-2">
            {/* Speed */}
            <div className="flex items-center gap-0.5 bg-[#0f1513] border border-[#22302b] rounded-md p-0.5">
              {[0.5, 1, 2, 4].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 text-[10px] rounded transition ${speed === s ? 'bg-[#4fc6c0] text-[#0d1210] font-bold' : 'text-[#7d918a] hover:text-[#dfe8e3]'}`}
                >
                  {s}×
                </button>
              ))}
            </div>

            {/* Play/Pause */}
            <button
              onClick={isRunning ? pause : start}
              className={`px-3 py-1.5 rounded-md text-[11px] font-extrabold transition ${isRunning ? 'bg-[#e0a63a] text-[#0d1210] hover:bg-[#d09020]' : 'bg-[#4fc6c0] text-[#0d1210] hover:bg-[#3fb6b0] shadow-[0_0_12px_rgba(79,198,192,0.4)]'}`}
            >
              {isRunning ? '❚❚ PAUSE' : '▶ RUN'}
            </button>

            <button
              onClick={() => reset()}
              className="px-3 py-1.5 rounded-md text-[11px] border border-[#22302b] bg-[#0f1513] text-[#7d918a] hover:text-[#dfe8e3] hover:bg-[#18241f] transition"
            >
              ↺
            </button>

            {/* Project Badge */}
            <div className="hidden sm:flex items-center gap-1.5 ml-1 px-2 py-1 rounded border border-[#22302b] text-[9px] text-[#4d6059]">
              SIH26123
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════ MAIN CONTENT ═══════════════════ */}
      <main className="max-w-[1800px] mx-auto px-4 py-4 flex flex-col gap-4">

        {/* ── JURY DEMO CONTROLLER ── */}
        <JuryDemoController
          isRunning={isRunning}
          isJuryDemoRunning={isJuryDemoRunning}
          stageIndex={juryDemoStageIndex}
          secRemaining={juryDemoStageSecRemaining}
          currentStage={currentJuryDemoStage}
          onRunJuryDemo={runJuryDemo}
          onStopJuryDemo={stopJuryDemo}
        />

        {/* ── PARALLEL TWIN CANVASES ── */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* LEFT: HARMONI Distributed */}
          <div className="flex flex-col gap-2">
            {/* Canvas header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e1812] border border-[#4fc6c0]/40 rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4fc6c0] shadow-[0_0_8px_#4fc6c0] animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#4fc6c0]">HARMONI — Distributed Fleet</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-[#4fc6c0]/15 text-[#4fc6c0] border border-[#4fc6c0]/30 font-bold">Local Reservations + P2P</span>
                <span className="text-[#dfe8e3] tabular-nums">t{frameHarmoni?.tick ?? 0}</span>
              </div>
            </div>

            {/* Canvas */}
            <div className="bg-[#0a0e0c] border-x border-[#4fc6c0]/30 shadow-[0_0_30px_rgba(79,198,192,0.06)]">
              <SimCanvas
                frame={frameHarmoni}
                width={28}
                height={20}
                obstacleMode={obstacleMode}
                onBlockEdge={handleBlockEdgeToggle}
                onToggleNodeObstacle={handleToggleNode}
                onSelectRobot={r => setInspectedRobot(r)}
              />
            </div>

            {/* HARMONI KPI strip */}
            <div className="grid grid-cols-5 gap-1.5 bg-[#0e1812] border border-[#4fc6c0]/25 border-t-0 rounded-b-xl px-3 py-2">
              {[
                { label: 'Delivered', value: metricsHarmoni?.tasks_completed ?? 0, color: '#5fbf7a' },
                { label: 'Waiting', value: frameHarmoni?.robots.filter(r => r.state === 'waiting').length ?? 0, color: '#e0a63a' },
                { label: 'DL Resolved', value: metricsHarmoni?.deadlocks_resolved ?? 0, color: '#4fc6c0' },
                { label: 'Collisions', value: metricsHarmoni?.collisions ?? 0, color: metricsHarmoni?.collisions ? '#e3595a' : '#5fbf7a' },
                { label: 'Replans', value: metricsHarmoni?.replans ?? 0, color: '#9a86e0' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-[#0f1513] rounded border border-[#22302b] px-2 py-1.5 flex flex-col">
                  <span className="text-[8px] text-[#4d6059] uppercase">{kpi.label}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Stop-and-Wait Baseline */}
          <div className="flex flex-col gap-2">
            {/* Canvas header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-[#111510] border border-[#5a6660]/50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e0a63a]" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#a0a8a4]">Stop-and-Wait Baseline</span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="px-2 py-0.5 rounded bg-[#5a6660]/25 text-[#a0a8a4] border border-[#5a6660]/40">Full-Rate Beacon • No P2P</span>
                <span className="text-[#dfe8e3] tabular-nums">t{frameBaseline?.tick ?? 0}</span>
              </div>
            </div>

            {/* Canvas */}
            <div className="bg-[#0a0e0c] border-x border-[#5a6660]/30 shadow-[0_0_30px_rgba(90,102,96,0.05)]">
              <SimCanvas
                frame={frameBaseline}
                width={28}
                height={20}
                obstacleMode={false}
                onBlockEdge={() => {}}
                onToggleNodeObstacle={() => {}}
                onSelectRobot={r => setInspectedRobot(r)}
              />
            </div>

            {/* Baseline KPI strip */}
            <div className="grid grid-cols-5 gap-1.5 bg-[#111510] border border-[#5a6660]/30 border-t-0 rounded-b-xl px-3 py-2">
              {[
                { label: 'Delivered', value: metricsBaseline?.tasks_completed ?? 0, color: '#a0a8a4' },
                { label: 'Waiting', value: frameBaseline?.robots.filter(r => r.state === 'waiting').length ?? 0, color: '#e3595a' },
                { label: 'DL Detected', value: metricsBaseline?.deadlocks_detected ?? 0, color: '#e3595a' },
                { label: 'Collisions', value: metricsBaseline?.collisions ?? 0, color: metricsBaseline?.collisions ? '#e3595a' : '#7d918a' },
                { label: 'Replans', value: metricsBaseline?.replans ?? 0, color: '#7d918a' },
              ].map(kpi => (
                <div key={kpi.label} className="bg-[#0f1513] rounded border border-[#22302b] px-2 py-1.5 flex flex-col">
                  <span className="text-[8px] text-[#4d6059] uppercase">{kpi.label}</span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── LIVE TELEMETRY DOCK ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#4d6059]">◈ Live Telemetry Dock</span>
            <div className="flex-1 h-px bg-[#1a2620]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* P2P Comms Bus */}
            <P2PMessageInspector frame={frameHarmoni} />
            {/* Deadlock WFG Visualizer */}
            <DeadlockVisualizer frame={frameHarmoni} />
            {/* AMR State Machine */}
            <StateMachineVisualizer robot={inspectedRobot} currentTick={currentTick} />
          </div>
        </section>

        {/* ── FAULT INJECTION & CONTROL BAR ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#4d6059]">◈ Fault Injection & Dispatch Control</span>
            <div className="flex-1 h-px bg-[#1a2620]" />
          </div>
          <ControlPanel
            isRunning={isRunning}
            speed={speed}
            mode={mode}
            frame={frameHarmoni}
            obstacleMode={obstacleMode}
            onToggleObstacleMode={() => setObstacleMode(m => !m)}
            onStart={start}
            onPause={pause}
            onReset={reset}
            onSetSpeed={setSpeed}
            onSetMode={setMode}
            onSpawnRobot={spawnRobot}
            onRemoveRobot={removeRobot}
            onBlockAisle={blockAisle}
            onUnblockAisle={unblockAisle}
            onToggleNodeObstacle={handleToggleNode}
            onClearAllObstacles={clearObstacles}
            onDisableRobot={disableRobot}
            onRecoverRobot={recoverRobot}
            onTriggerDeadlock={triggerDeadlock}
            onTriggerInfraFailure={triggerInfraFailure}
            onRestoreInfra={restoreInfra}
            onTriggerP2pFailure={triggerP2pFailure}
            onRestoreP2p={restoreP2p}
            onAddTask={addTask}
          />
        </section>

        {/* ── PERFORMANCE METRICS ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#4d6059]">◈ Enterprise Performance Analytics</span>
            <div className="flex-1 h-px bg-[#1a2620]" />
          </div>
          <MetricsPanel
            metricsHarmoni={metricsHarmoni}
            metricsBaseline={metricsBaseline}
          />
        </section>

        {/* ── EVENT FEED + ROBOT ROSTER ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#4d6059]">◈ AMR Fleet Roster & Causal Event Log</span>
            <div className="flex-1 h-px bg-[#1a2620]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RobotRoster
              frame={frameHarmoni}
              onSelectRobot={r => setInspectedRobot(r)}
            />
            <EventFeed events={frameHarmoni?.events_this_tick || []} />
          </div>
        </section>

        {/* ── BENCHMARK & STATISTICAL VERIFICATION ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#4d6059]">◈ Monte Carlo Statistical Benchmark Verification</span>
            <div className="flex-1 h-px bg-[#1a2620]" />
          </div>
          <BenchmarkPanel
            benchmarkResult={benchmarkResult}
            monteCarloResult={monteCarloResult}
            isBenchmarking={isBenchmarking}
            isMonteCarloBenchmarking={isMonteCarloBenchmarking}
            onRunBenchmark={runBenchmarkTest}
            onRunMonteCarlo={runMonteCarloTest}
          />
        </section>

        {/* ── FOOTER ARCHITECTURE NOTE ── */}
        <footer className="pt-4 border-t border-[#1a2620] text-[10px] text-[#3d5048] leading-relaxed">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <b className="text-[#4d6059]">HARMONI vs Baseline:</b> HARMONI emulates localized space-time reservations, selective relevant-neighbor P2P coordination, task leases with stale-state decay, and deterministic cycle-recovery via wait-for graph detection. The baseline is a conservative stop-and-wait comparison for repeatable measurement.
            </span>
            <span className="text-[#2a3d35] shrink-0">SIH 2026 • 28×20 Grid • Parallel Digital Twin</span>
          </div>
        </footer>
      </main>

      {/* ═══════════════════ ROBOT TELEMETRY INSPECT OVERLAY ═══════════════════ */}
      {inspectedRobot && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-[#0e1812] border border-[#4fc6c0]/40 rounded-xl max-w-lg w-full p-5 flex flex-col gap-3 shadow-[0_0_40px_rgba(79,198,192,0.15)]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#1a2620]">
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-3 h-3 rounded-full ${inspectedRobot.active ? 'bg-[#4fc6c0] shadow-[0_0_10px_#4fc6c0]' : 'bg-[#e3595a]'}`}
                />
                <h3 className="text-sm font-bold text-[#4fc6c0]">AMR-{String(inspectedRobot.id).padStart(2, '0')} Live Telemetry</h3>
              </div>
              <button
                onClick={() => setInspectedRobot(null)}
                className="text-[#4d6059] hover:text-[#dfe8e3] text-lg leading-none transition"
              >
                ✕
              </button>
            </div>

            {/* Core fields */}
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              {[
                { label: 'Position', value: `[${inspectedRobot.pos[0]}, ${inspectedRobot.pos[1]}]`, color: '#dfe8e3' },
                { label: 'State', value: inspectedRobot.state.toUpperCase(), color: '#5fbf7a' },
                { label: 'Battery', value: `${inspectedRobot.battery}%`, color: inspectedRobot.battery < 20 ? '#e3595a' : '#dfe8e3' },
                { label: 'Task Lease', value: inspectedRobot.task_id !== null ? `#${inspectedRobot.task_id}` : 'None', color: '#dfe8e3' },
                { label: 'Waiting On', value: inspectedRobot.waiting_on !== null ? `AMR-${inspectedRobot.waiting_on}` : 'Clear', color: inspectedRobot.waiting_on !== null ? '#e0a63a' : '#5fbf7a' },
                { label: 'Optical Signal', value: (inspectedRobot.optical_signal ?? 'normal_green').replace(/_/g, ' ').toUpperCase(), color: '#dfe8e3' },
              ].map(f => (
                <div key={f.label} className="bg-[#0f1513] rounded border border-[#22302b] p-2">
                  <div className="text-[9px] text-[#4d6059] uppercase">{f.label}</div>
                  <div className="font-bold mt-0.5" style={{ color: f.color }}>{f.value}</div>
                </div>
              ))}
            </div>

            {/* Decision hierarchy */}
            <div className="bg-[#0f1513] border border-[#22302b] rounded p-2.5 flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between text-[10px] text-[#4d6059] uppercase">
                <span>Decision Hierarchy</span>
                <span className={`font-bold ${inspectedRobot.decision_locked ? 'text-[#9a86e0]' : 'text-[#5fbf7a]'}`}>
                  {inspectedRobot.decision_locked ? `🔒 LOCKED until t${inspectedRobot.committed_until}` : '🔓 ADAPTIVE'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-[#4d6059]">Layer: </span>
                  <span className="text-[#4fc6c0] font-bold">{inspectedRobot.hierarchy_level ?? 'P2P_COORDINATION'}</span>
                </div>
                <div>
                  <span className="text-[#4d6059]">Decision: </span>
                  <span className="text-[#dfe8e3] font-bold">{inspectedRobot.decision ?? inspectedRobot.state}</span>
                </div>
              </div>
              <div className="text-[10px] text-[#dfe8e3]">
                <span className="text-[#4d6059]">Reason: </span>
                {inspectedRobot.reason ?? 'Executing trajectory under reservation lease'}
              </div>
            </div>

            {/* Path */}
            <div>
              <div className="text-[9px] text-[#4d6059] uppercase mb-1">Planned Waypoint Trajectory</div>
              <div className="bg-[#0f1513] p-2 rounded border border-[#22302b] text-[10px] text-[#dfe8e3] overflow-x-auto whitespace-nowrap">
                {inspectedRobot.path.length > 0
                  ? inspectedRobot.path.slice(0, 12).map(p => `[${p[0]},${p[1]}]`).join(' → ') + (inspectedRobot.path.length > 12 ? ' …' : '')
                  : '— Stationary / At Goal —'}
              </div>
            </div>

            <div className="pt-1 border-t border-[#1a2620] flex items-center justify-between">
              <span className="text-[9px] text-[#3d5048]">Priority: {inspectedRobot.priority_key ?? `id:${inspectedRobot.id}`}</span>
              <button
                onClick={() => setInspectedRobot(null)}
                className="px-3 py-1 bg-[#0f1513] hover:bg-[#18241f] border border-[#22302b] text-[#dfe8e3] rounded text-[11px] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

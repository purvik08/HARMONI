'use client';

import React from 'react';
import type { SimFrame, NetworkMode } from '../sim/types';

interface StatusPanelProps {
  frame: SimFrame | null;
  tick?: number;
  mode: 'harmoni' | 'baseline';
}

export function StatusPanel({ frame, tick, mode }: StatusPanelProps) {
  const infraOnline = frame?.infra_online ?? true;
  const p2pOnline = frame?.p2p_online ?? true;
  const activeRobots = frame?.robots.filter(r => r.active).length ?? 0;
  const totalRobots = frame?.robots.length ?? 0;
  const hasFailedRobot = frame?.robots.some(r => !r.active);

  // Derive logical operating mode
  let opMode: { label: string; color: string; desc: string } = {
    label: 'HARMONI (Full P2P + WMS)',
    color: 'text-[#4fc6c0] border-[#4fc6c0]/40 bg-[#4fc6c0]/10',
    desc: 'Normal decentralized operation with central WMS feed online',
  };

  if (mode === 'baseline') {
    opMode = {
      label: 'BASELINE (Stop-and-Wait Mutex)',
      color: 'text-[#e0a63a] border-[#e0a63a]/40 bg-[#e0a63a]/10',
      desc: 'Naive intersection mutex, no lookahead reservations',
    };
  } else if (!infraOnline && p2pOnline) {
    opMode = {
      label: 'P2P DISTRIBUTED MODE',
      color: 'text-[#5fbf7a] border-[#5fbf7a]/40 bg-[#5fbf7a]/10',
      desc: 'WMS offline: robots coordinate autonomously via P2P bus',
    };
  } else if (!infraOnline && !p2pOnline) {
    opMode = {
      label: 'ISOLATED LOCAL AUTONOMY',
      color: 'text-[#e3595a] border-[#e3595a]/40 bg-[#e3595a]/10',
      desc: 'All comms lost: robots operate strictly on onboard sensing',
    };
  } else if (hasFailedRobot) {
    opMode = {
      label: 'DEGRADED FLEET (Safe Mode)',
      color: 'text-[#9a86e0] border-[#9a86e0]/40 bg-[#9a86e0]/10',
      desc: 'One or more robots offline; tasks dynamically re-leased',
    };
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Top Indicators Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* WMS / Infra Link */}
        <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                infraOnline
                  ? 'bg-[#5fbf7a] shadow-[0_0_8px_#5fbf7a]'
                  : 'bg-[#e3595a] shadow-[0_0_8px_#e3595a]'
              }`}
            />
            <span className="text-[11px] font-mono uppercase text-[#7d918a]">WMS / Infra</span>
          </div>
          <span className="text-xs font-mono font-bold text-[#dfe8e3]">
            {infraOnline ? 'ONLINE' : 'DOWN'}
          </span>
        </div>

        {/* P2P Mesh Bus */}
        <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                p2pOnline
                  ? 'bg-[#4fc6c0] shadow-[0_0_8px_#4fc6c0]'
                  : 'bg-[#e3595a] shadow-[0_0_8px_#e3595a]'
              }`}
            />
            <span className="text-[11px] font-mono uppercase text-[#7d918a]">P2P Comms</span>
          </div>
          <span className="text-xs font-mono font-bold text-[#dfe8e3]">
            {p2pOnline ? 'ACTIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Active Fleet */}
        <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase text-[#7d918a]">Fleet State</span>
          <span className="text-xs font-mono font-bold text-[#dfe8e3]">
            {activeRobots}/{totalRobots} Active
          </span>
        </div>

        {/* Current Tick */}
        <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-2.5 flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase text-[#7d918a]">Sim Tick</span>
          <span className="text-xs font-mono font-bold text-[#4fc6c0]">
            t={frame?.tick ?? tick ?? 0}
          </span>
        </div>
      </div>

      {/* Operating Mode Banner */}
      <div className={`border rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 ${opMode.color}`}>
        <div className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider">
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          {opMode.label}
        </div>
        <div className="text-[11px] opacity-80 font-sans">{opMode.desc}</div>
      </div>
    </div>
  );
}

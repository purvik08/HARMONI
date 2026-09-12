'use client';

import React from 'react';
import type { SimFrame, SimMetrics } from '../sim/types';

interface DocsAlignmentPanelProps {
  frame: SimFrame | null;
  metricsHarmoni: SimMetrics | null;
  metricsBaseline: SimMetrics | null;
}

export function DocsAlignmentPanel({ frame, metricsHarmoni, metricsBaseline }: DocsAlignmentPanelProps) {
  const infraOnline = frame?.infra_online ?? true;
  const p2pOnline = frame?.p2p_online ?? true;
  const active = frame?.robots.filter(r => r.active).length ?? 0;
  const completed = metricsHarmoni?.tasks_completed ?? 0;
  const baselineCompleted = metricsBaseline?.tasks_completed ?? 0;
  const messages = frame?.robots.reduce((sum, r) => sum + (r.comm_events ?? 0), 0) ?? 0;
  const bytes = frame?.robots.reduce((sum, r) => sum + (r.comm_bytes ?? 0), 0) ?? 0;

  const modeLabel = infraOnline
    ? 'Infrastructure-connected'
    : p2pOnline
      ? 'Local/P2P distributed'
      : 'Isolated local autonomy';

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dfe8e3]">
          Docs Operating Hierarchy
        </h3>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          {['Infrastructure', 'P2P coordination', 'Local perception', 'Safe behavior'].map((label, idx) => {
            const isActive = idx === 0 ? infraOnline : idx === 1 ? !infraOnline && p2pOnline : idx === 2 ? !p2pOnline : false;
            return (
              <div
                key={label}
                className={`border rounded-md px-2 py-1.5 ${isActive ? 'border-[#4fc6c0] bg-[#4fc6c0]/10 text-[#4fc6c0]' : 'border-[#22302b] bg-[#0f1513] text-[#7d918a]'}`}
              >
                {idx + 1}. {label}
              </div>
            );
          })}
        </div>
        <div className="text-[11px] text-[#7d918a]">
          Current mode: <span className="text-[#dfe8e3] font-mono">{modeLabel}</span>
        </div>
      </div>

      <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dfe8e3]">
          Validation Targets
        </h3>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2">
            <span className="block text-[#7d918a]">Active AMRs</span>
            <span className="text-base text-[#4fc6c0] font-bold">{active}</span>
          </div>
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2">
            <span className="block text-[#7d918a]">HARMONI collisions</span>
            <span className="text-base text-[#5fbf7a] font-bold">{metricsHarmoni?.collisions ?? 0}</span>
          </div>
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2">
            <span className="block text-[#7d918a]">Tasks H/B</span>
            <span className="text-base text-[#dfe8e3] font-bold">{completed}/{baselineCompleted}</span>
          </div>
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2">
            <span className="block text-[#7d918a]">Replans</span>
            <span className="text-base text-[#e0a63a] font-bold">{metricsHarmoni?.replans ?? 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dfe8e3]">
          Scope Boundary
        </h3>
        <div className="text-[11px] text-[#7d918a] leading-relaxed">
          Browser/Vercel runs the repeatable digital-twin demo. ROS 2, Nav2, Zenoh routing, wireless handoff, and industrial safety certification remain hardware/runtime validation work.
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2">
            <span className="block text-[#7d918a]">Messages</span>
            <span className="text-base text-[#4fc6c0] font-bold">{messages}</span>
          </div>
          <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2">
            <span className="block text-[#7d918a]">Bytes est.</span>
            <span className="text-base text-[#dfe8e3] font-bold">{bytes}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import type { SimFrame } from '../sim/types';

interface EdgeAIPanelProps {
  frame: SimFrame | null;
}

export function EdgeAIPanel({ frame }: EdgeAIPanelProps) {
  const congestion = frame?.congestion ?? { zoneA: 0.12, zoneB: 0.38, zoneC: 0.15 };
  const conflictEdges = frame?.conflict_edges ?? [];

  const getBarColor = (val: number) => {
    if (val < 0.3) return 'bg-[#5fbf7a]';
    if (val < 0.6) return 'bg-[#e0a63a]';
    return 'bg-[#e3595a]';
  };

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-[#22302b] pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#9a86e0] shadow-[0_0_8px_#9a86e0] animate-pulse" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dfe8e3]">
            Edge Prediction & Conflict Graph Telemetry
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[#9a86e0] bg-[#9a86e0]/15 px-2 py-0.5 rounded border border-[#9a86e0]/30">
          Emulated Prediction Layer
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        {/* Zone Congestion Prediction */}
        <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2.5 flex flex-col gap-2">
          <div className="text-[11px] text-[#7d918a] font-bold uppercase">
            Spatial Zone Congestion
          </div>

          <div className="flex flex-col gap-1.5 text-[10px]">
            <div>
              <div className="flex justify-between text-[#dfe8e3] mb-0.5">
                <span>Zone A (West / Pickup)</span>
                <span>{Math.round(congestion.zoneA * 100)}%</span>
              </div>
              <div className="w-full bg-[#18241f] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${getBarColor(congestion.zoneA)} transition-all duration-300`}
                  style={{ width: `${Math.max(5, congestion.zoneA * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[#dfe8e3] mb-0.5">
                <span>Zone B (Central Racks)</span>
                <span>{Math.round(congestion.zoneB * 100)}%</span>
              </div>
              <div className="w-full bg-[#18241f] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${getBarColor(congestion.zoneB)} transition-all duration-300`}
                  style={{ width: `${Math.max(5, congestion.zoneB * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[#dfe8e3] mb-0.5">
                <span>Zone C (East / Dropoff)</span>
                <span>{Math.round(congestion.zoneC * 100)}%</span>
              </div>
              <div className="w-full bg-[#18241f] rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full ${getBarColor(congestion.zoneC)} transition-all duration-300`}
                  style={{ width: `${Math.max(5, congestion.zoneC * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Conflict Graph */}
        <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2.5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] text-[#7d918a] font-bold uppercase mb-1">
              Active Conflict Graph
            </div>
            <div className="text-[10px] text-[#dfe8e3]">
              Relevance-driven P2P links formed strictly where predicted trajectories intersect within lookahead horizon H=4.
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#22302b]/60">
            <span className="text-[10px] text-[#7d918a]">Intersecting Edges:</span>
            <span className={`text-base font-bold ${conflictEdges.length > 0 ? 'text-[#e0a63a]' : 'text-[#5fbf7a]'}`}>
              {conflictEdges.length} {conflictEdges.length === 1 ? 'Pair' : 'Pairs'}
            </span>
          </div>
        </div>

        {/* Deterministic Safety Boundary */}
        <div className="bg-[#0f1513] border border-[#22302b] rounded-md p-2.5 flex flex-col justify-between">
          <div>
            <div className="text-[11px] text-[#7d918a] font-bold uppercase mb-1">
              Safety Architecture
            </div>
            <div className="text-[10px] text-[#7d918a] leading-relaxed">
              <span className="text-[#4fc6c0] font-bold">Docs/08_EDGE_AI.md boundary:</span> prediction informs planning; deterministic safety checks make the final movement decision.
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#22302b]/60 text-[10px]">
            <span className="text-[#7d918a]">Sensor Authority:</span>
            <span className="text-[#5fbf7a] font-bold">DETERMINISTIC</span>
          </div>
        </div>
      </div>
    </div>
  );
}

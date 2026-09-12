'use client';

import React, { useState } from 'react';
import type { P2PMessageTrace, SimFrame } from '../sim/types';

interface P2PMessageInspectorProps {
  frame: SimFrame | null;
}

export function P2PMessageInspector({ frame }: P2PMessageInspectorProps) {
  const [selectedRobot, setSelectedRobot] = useState<number | 'ALL'>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const messages = frame?.p2p_messages || [];

  const filtered = messages.filter(m => {
    if (selectedRobot !== 'ALL' && m.from !== selectedRobot && m.to !== selectedRobot) {
      return false;
    }
    if (selectedType !== 'ALL' && m.type !== selectedType) {
      return false;
    }
    return true;
  });

  const getTypeStyle = (type: P2PMessageTrace['type']) => {
    switch (type) {
      case 'INTENT':
        return 'text-[#4fc6c0] bg-[#4fc6c0]/10 border-[#4fc6c0]/30';
      case 'RESERVATION_REQ':
        return 'text-[#e0a63a] bg-[#e0a63a]/10 border-[#e0a63a]/30 font-bold';
      case 'RESERVATION_GRANT':
        return 'text-[#5fbf7a] bg-[#5fbf7a]/10 border-[#5fbf7a]/30 font-bold';
      case 'ACK_YIELD':
        return 'text-[#9a86e0] bg-[#9a86e0]/10 border-[#9a86e0]/30';
      case 'DEADLOCK_PROBE':
        return 'text-[#e3595a] bg-[#e3595a]/10 border-[#e3595a]/30 animate-pulse font-bold';
      case 'OBSTACLE_ALERT':
        return 'text-[#e3595a] bg-[#e3595a]/10 border-[#e3595a]/30';
      default:
        return 'text-[#dfe8e3] bg-[#131a17] border-[#22302b]';
    }
  };

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#22302b]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4fc6c0] shadow-[0_0_8px_#4fc6c0]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#4fc6c0]">
            P2P Mesh Comms Bus (Zenoh Emulation)
          </h3>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <div className="flex items-center gap-1">
            <span className="text-[#7d918a]">Robot:</span>
            <select
              value={selectedRobot}
              onChange={e => setSelectedRobot(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
              className="bg-[#0f1513] text-[#dfe8e3] border border-[#22302b] rounded px-1.5 py-0.5"
            >
              <option value="ALL">All AMRs</option>
              {frame?.robots.map(r => (
                <option key={r.id} value={r.id}>
                  AMR #{r.id}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[#7d918a]">Type:</span>
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="bg-[#0f1513] text-[#dfe8e3] border border-[#22302b] rounded px-1.5 py-0.5"
            >
              <option value="ALL">All Types</option>
              <option value="INTENT">INTENT</option>
              <option value="RESERVATION_REQ">RESERVATION_REQ</option>
              <option value="RESERVATION_GRANT">RESERVATION_GRANT</option>
              <option value="ACK_YIELD">ACK_YIELD</option>
              <option value="DEADLOCK_PROBE">DEADLOCK_PROBE</option>
              <option value="OBSTACLE_ALERT">OBSTACLE_ALERT</option>
            </select>
          </div>
        </div>
      </div>

      {/* Message Trace Stream Table */}
      <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-xs font-mono text-[#7d918a] py-4 text-center">
            {frame?.p2p_online
              ? 'No matching P2P packets captured yet.'
              : '⚠️ P2P Bus OFFLINE — AMRs operating in isolated perception mode.'}
          </div>
        ) : (
          filtered.slice(-30).map(msg => (
            <div
              key={msg.id}
              className="bg-[#0f1513] border border-[#22302b] rounded px-2 py-1.5 flex flex-col gap-0.5 text-[11px] font-mono leading-tight hover:border-[#4fc6c0]/40 transition"
            >
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#7d918a]">t{msg.tick}</span>
                  <span className="text-[#dfe8e3] font-bold">
                    AMR #{msg.from} → {msg.to === 'BROADCAST' ? 'ALL' : `AMR #${msg.to}`}
                  </span>
                  {msg.zone && (
                    <span className="px-1 rounded bg-[#22302b] text-[#7d918a] text-[9px]">
                      Zone {msg.zone}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.2 rounded border text-[9px] uppercase ${getTypeStyle(
                      msg.type
                    )}`}
                  >
                    {msg.type}
                  </span>
                  <span className="text-[#7d918a] text-[9px]">TTL:{msg.ttl}</span>
                </div>
              </div>
              <div className="text-[10px] text-[#a0a8a4] truncate">{msg.payload}</div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-[#7d918a] pt-1 border-t border-[#22302b]">
        <span>Relevant-neighbor broadcast horizon: H=4 Manhattan hops</span>
        <span className="text-[#4fc6c0]">Wire protocol: Zenoh / CBOR</span>
      </div>
    </div>
  );
}

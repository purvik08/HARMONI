'use client';

import React, { useEffect, useRef } from 'react';
import type { SimEvent } from '../sim/types';

interface EventFeedProps {
  events: SimEvent[];
}

export function EventFeed({ events }: EventFeedProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new event
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events.length]);

  const recent = events.slice(-40);

  const getEventStyle = (e: SimEvent) => {
    switch (e.type) {
      case 'intersection_conflict':
        return 'border-l-[#e0a63a] text-[#e0a63a] bg-[#e0a63a]/5';
      case 'deadlock_detected':
        return 'border-l-[#e3595a] text-[#e3595a] bg-[#e3595a]/5';
      case 'collision_averted':
        return 'border-l-[#e3595a] text-[#e3595a] bg-[#e3595a]/10 font-bold';
      case 'task_assigned':
      case 'task_completed':
        return 'border-l-[#5fbf7a] text-[#5fbf7a] bg-[#5fbf7a]/5';
      case 'task_reassign_pending':
      case 'lease_expired':
        return 'border-l-[#e0a63a] text-[#e0a63a] bg-[#e0a63a]/5';
      case 'robot_failed':
        return 'border-l-[#e3595a] text-[#e3595a] bg-[#e3595a]/10 font-bold';
      case 'robot_recovered':
        return 'border-l-[#5fbf7a] text-[#5fbf7a] bg-[#5fbf7a]/5';
      case 'infra_status':
        return 'border-l-[#9a86e0] text-[#9a86e0] bg-[#9a86e0]/5';
      case 'yield_request':
        return 'border-l-[#4fc6c0] text-[#4fc6c0] bg-[#4fc6c0]/5';
      case 'scenario_event':
        return 'border-l-[#4fc6c0] text-[#4fc6c0] bg-[#4fc6c0]/10 font-bold';
      default:
        return 'border-l-[#7d918a] text-[#dfe8e3] bg-[#0f1513]';
    }
  };

  const getEventText = (e: SimEvent) => {
    switch (e.type) {
      case 'intersection_conflict':
        return `AMR #${e.yielding_robot} yields conflict at [${e.node?.[0]},${e.node?.[1]}] to priority AMR #${e.priority_robot}`;
      case 'deadlock_detected':
        return `Wait-for cycle [${e.cycle?.join('→')}] detected. AMR #${e.recovery_robot} ${
          e.resolved ? `yields to escape node [${e.escape_node?.[0]},${e.escape_node?.[1]}]` : 'replans'
        }`;
      case 'collision_averted':
        return `Deterministic safety layer prevented contact between AMRs: [${e.robots?.join(', ')}]`;
      case 'task_assigned':
        return `Task #${e.task_id} leased to AMR #${e.holder} via decentralized auction`;
      case 'task_completed':
        return `Task #${e.task_id} successfully delivered by AMR #${e.robot_id}`;
      case 'task_reassign_pending':
      case 'lease_expired':
        return `Lease on Task #${e.task_id} expired from AMR #${e.previous_holder} — returned to pool`;
      case 'robot_failed':
        return `🚨 AMR #${e.robot_id} went OFFLINE (hardware / comms drop)`;
      case 'robot_recovered':
        return `AMR #${e.robot_id} returned ONLINE`;
      case 'infra_status':
        return `WMS / Infrastructure link is now ${e.online ? 'ONLINE' : 'DOWN (failover to P2P)'}`;
      case 'yield_request':
        return `Starvation guard: Parked AMR #${e.parked_robot} yields for blocked AMR #${e.blocked_robot}`;
      case 'scenario_event':
        return `▶ SCENARIO EVENT: ${e.label?.replace(/_/g, ' ').toUpperCase()}`;
      default:
        return e.type;
    }
  };

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#7d918a]">
          Coordination & Safety Event Feed
        </h3>
        <span className="text-[10px] font-mono text-[#7d918a]">
          {recent.length} recent
        </span>
      </div>

      <div
        ref={containerRef}
        className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1"
      >
        {recent.length === 0 ? (
          <div className="text-xs font-mono text-[#7d918a] py-3 text-center">
            No events recorded yet. Click Start Sim to begin.
          </div>
        ) : (
          recent.map((ev, idx) => (
            <div
              key={idx}
              className={`border-l-2 rounded px-2.5 py-1.5 text-[11px] font-mono leading-relaxed transition ${getEventStyle(
                ev
              )}`}
            >
              <span className="text-[#7d918a] mr-2">t{ev.tick}</span>
              <span className="text-[#dfe8e3]">{getEventText(ev)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

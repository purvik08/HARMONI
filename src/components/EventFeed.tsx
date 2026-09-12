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

  const getEventMeta = (e: SimEvent) => {
    switch (e.type) {
      case 'intersection_conflict':
        return {
          style: 'border-l-[#e0a63a] bg-[#e0a63a]/5',
          tag: 'P2P ARBITRATION',
          tagColor: 'text-[#e0a63a] bg-[#e0a63a]/15',
          text: `AMR #${e.yielding_robot} yields reservation at [${e.node?.[0]},${e.node?.[1]}] to higher-priority AMR #${e.priority_robot}`,
        };
      case 'deadlock_detected':
        return {
          style: 'border-l-[#e3595a] bg-[#e3595a]/5',
          tag: 'WFG CYCLE DETECTOR',
          tagColor: 'text-[#e3595a] bg-[#e3595a]/15',
          text: `Wait-for cycle [${e.cycle?.join('→')}] detected. AMR #${e.recovery_robot} ${
            e.resolved ? `yielded to escape waypoint [${e.escape_node?.[0]},${e.escape_node?.[1]}]` : 'replanned'
          }`,
        };
      case 'collision_averted':
        return {
          style: 'border-l-[#5fbf7a] bg-[#5fbf7a]/10 font-bold',
          tag: 'DETERMINISTIC SAFETY',
          tagColor: 'text-[#5fbf7a] bg-[#5fbf7a]/15',
          text: `Deterministic safety brake layer prevented contact between AMRs: [${e.robots?.join(', ')}]`,
        };
      case 'task_assigned':
        return {
          style: 'border-l-[#4fc6c0] bg-[#4fc6c0]/5',
          tag: 'EDGE AUCTION',
          tagColor: 'text-[#4fc6c0] bg-[#4fc6c0]/15',
          text: `Task #${e.task_id} leased to AMR #${e.holder} via decentralized auction lease`,
        };
      case 'task_completed':
        return {
          style: 'border-l-[#5fbf7a] bg-[#5fbf7a]/5',
          tag: 'TASK DELIVERED',
          tagColor: 'text-[#5fbf7a] bg-[#5fbf7a]/15',
          text: `Task #${e.task_id} successfully delivered to dropoff dock by AMR #${e.robot_id}`,
        };
      case 'task_reassign_pending':
      case 'lease_expired':
        return {
          style: 'border-l-[#e0a63a] bg-[#e0a63a]/5',
          tag: 'LEASE TIMEOUT',
          tagColor: 'text-[#e0a63a] bg-[#e0a63a]/15',
          text: `Lease on Task #${e.task_id} expired from AMR #${e.previous_holder} — returned to decentralized pool`,
        };
      case 'robot_failed':
        return {
          style: 'border-l-[#e3595a] bg-[#e3595a]/10 font-bold',
          tag: 'FAULT INJECTION',
          tagColor: 'text-[#e3595a] bg-[#e3595a]/15',
          text: `🚨 AMR #${e.robot_id} went OFFLINE (hardware / comms drop failover)`,
        };
      case 'robot_recovered':
        return {
          style: 'border-l-[#5fbf7a] bg-[#5fbf7a]/5',
          tag: 'RECOVERY',
          tagColor: 'text-[#5fbf7a] bg-[#5fbf7a]/15',
          text: `AMR #${e.robot_id} recovered online and rejoined P2P mesh`,
        };
      case 'infra_status':
        return {
          style: 'border-l-[#9a86e0] bg-[#9a86e0]/5',
          tag: 'WMS GATEWAY',
          tagColor: 'text-[#9a86e0] bg-[#9a86e0]/15',
          text: `WMS / Infrastructure link is now ${e.online ? 'ONLINE' : 'DOWN (failover to P2P mesh active)'}`,
        };
      case 'yield_request':
        return {
          style: 'border-l-[#4fc6c0] bg-[#4fc6c0]/5',
          tag: 'STARVATION GUARD',
          tagColor: 'text-[#4fc6c0] bg-[#4fc6c0]/15',
          text: `Starvation guard: Parked AMR #${e.parked_robot} yields for blocked AMR #${e.blocked_robot}`,
        };
      case 'scenario_event':
        return {
          style: 'border-l-[#4fc6c0] bg-[#4fc6c0]/10 font-bold',
          tag: 'SCENARIO HUD',
          tagColor: 'text-[#4fc6c0] bg-[#4fc6c0]/15',
          text: `▶ ${e.label?.replace(/_/g, ' ').toUpperCase()}`,
        };
      default:
        return {
          style: 'border-l-[#7d918a] bg-[#0f1513]',
          tag: 'EVENT',
          tagColor: 'text-[#7d918a] bg-[#22302b]',
          text: e.type,
        };
    }
  };

  return (
    <div className="bg-[#131a17] border border-[#22302b] rounded-lg p-3 flex flex-col gap-2 font-mono">
      <div className="flex items-center justify-between pb-1 border-b border-[#22302b]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#dfe8e3]">
          Causal Event & Safety Telemetry Feed
        </h3>
        <span className="text-[10px] text-[#7d918a]">
          {recent.length} recent
        </span>
      </div>

      <div
        ref={containerRef}
        className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1"
      >
        {recent.length === 0 ? (
          <div className="text-xs text-[#7d918a] py-4 text-center">
            No events recorded yet. Click Start Sim or Run Jury Demo to begin.
          </div>
        ) : (
          recent.map((ev, idx) => {
            const meta = getEventMeta(ev);
            return (
              <div
                key={idx}
                className={`border-l-2 rounded px-2.5 py-1.5 text-[11px] leading-relaxed transition ${meta.style}`}
              >
                <div className="flex items-center justify-between text-[9px] mb-0.5">
                  <span className="text-[#7d918a]">t{ev.tick}</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold uppercase ${meta.tagColor}`}>
                    {meta.tag}
                  </span>
                </div>
                <span className="text-[#dfe8e3]">{meta.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


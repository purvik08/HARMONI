'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { SimFrame, Pos, RobotState } from '../sim/types';

export const ROBOT_COLORS = [
  '#4fc6c0', // cyan
  '#e0a63a', // amber
  '#9a86e0', // violet
  '#5fbf7a', // green
  '#e3595a', // red
  '#5aa9e6', // blue
  '#f28e2b', // orange
  '#edc948', // yellow
];

interface SimCanvasProps {
  frame: SimFrame | null;
  width?: number;
  height?: number;
  obstacleMode?: boolean;
  onBlockEdge?: (a: Pos, b: Pos) => void;
  onToggleNodeObstacle?: (pos: Pos) => void;
  onSelectRobot?: (robot: RobotState | null) => void;
}

export function SimCanvas({
  frame,
  width = 22,
  height = 16,
  obstacleMode = false,
  onBlockEdge,
  onToggleNodeObstacle,
  onSelectRobot,
}: SimCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<Pos | null>(null);
  const [selectedRobotId, setSelectedRobotId] = useState<number | null>(null);

  // Derive canvas dimensions and cell spacing
  const pad = 32;
  const canvasWidth = 900;
  const canvasHeight = 560;
  const effW = Math.max(width, 1);
  const effH = Math.max(height, 1);
  const cellW = (canvasWidth - pad * 2) / Math.max(effW - 1, 1);
  const cellH = (canvasHeight - pad * 2) / Math.max(effH - 1, 1);
  const minCell = Math.min(cellW, cellH);

  // Proportional sizing
  const robotRadius = Math.max(5.5, Math.min(13, minCell * 0.36));
  const dotRadius = Math.max(1.5, Math.min(2.5, minCell * 0.08));
  const fontPt = Math.max(7.5, Math.min(11, minCell * 0.32));
  const clickTolerance = Math.max(12, minCell * 0.48);

  const xy = (node: Pos): [number, number] => {
    if (width === 0 || height === 0) {
      // micro map layout (e.g. deadlock scenario)
      return [pad + node[0] * 180 + 80, pad + node[1] * 180 + 80];
    }
    return [pad + node[0] * cellW, pad + node[1] * cellH];
  };

  const getNearestNode = (clickX: number, clickY: number): Pos | null => {
    let bestDist = clickTolerance;
    let bestNode: Pos | null = null;
    for (let x = 0; x < effW; x++) {
      for (let y = 0; y < effH; y++) {
        const [px, py] = xy([x, y]);
        const dist = Math.hypot(clickX - px, clickY - py);
        if (dist < bestDist) {
          bestDist = dist;
          bestNode = [x, y];
        }
      }
    }
    return bestNode;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // In obstacle mode, direct node click toggles node obstacle
    if (obstacleMode) {
      const node = getNearestNode(clickX, clickY);
      if (node) {
        if (onToggleNodeObstacle) {
          onToggleNodeObstacle(node);
        } else if (onBlockEdge) {
          // Fallback: if clicking two adjacent nodes
          if (!selectedNode) {
            setSelectedNode(node);
          } else {
            const isAdj = Math.abs(selectedNode[0] - node[0]) + Math.abs(selectedNode[1] - node[1]) === 1;
            if (isAdj) onBlockEdge(selectedNode, node);
            setSelectedNode(null);
          }
        }
      }
      return;
    }

    // Check if clicked a robot
    if (frame) {
      for (const r of frame.robots) {
        const [px, py] = xy(r.pos);
        if (Math.hypot(clickX - px, clickY - py) < Math.max(14, robotRadius * 1.5)) {
          setSelectedRobotId(r.id);
          onSelectRobot?.(r);
          return;
        }
      }
    }

    // Check if clicked a node
    const node = getNearestNode(clickX, clickY);
    if (!node) {
      setSelectedNode(null);
      setSelectedRobotId(null);
      onSelectRobot?.(null);
      return;
    }

    if (!selectedNode) {
      setSelectedNode(node);
    } else {
      // If clicking adjacent node, toggle edge block
      const isAdj = Math.abs(selectedNode[0] - node[0]) + Math.abs(selectedNode[1] - node[1]) === 1;
      if (isAdj && onBlockEdge) {
        onBlockEdge(selectedNode, node);
      }
      setSelectedNode(null);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const frameTick = frame?.tick ?? 0;

    // Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0d1210';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid aisles lines (drivable edges)
    ctx.strokeStyle = '#18241f';
    ctx.lineWidth = Math.max(1, minCell * 0.05);
    for (let x = 0; x < effW; x++) {
      for (let y = 0; y < effH; y++) {
        const [px, py] = xy([x, y]);
        if (x + 1 < effW) {
          const [nx, ny] = xy([x + 1, y]);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
        }
        if (y + 1 < effH) {
          const [nx, ny] = xy([x, y + 1]);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
        }
      }
    }

    // Grid dots (aisle waypoints)
    for (let x = 0; x < effW; x++) {
      for (let y = 0; y < effH; y++) {
        const [px, py] = xy([x, y]);
        ctx.fillStyle = '#22302b';
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── v2: Zone fills ─────────────────────────────────────────────────────
    if (width >= 20 && height >= 16) {
      const cw = cellW, ch = cellH;
      const zoneData: Array<{ nodes: Array<[number,number]>; fill: string; stroke?: string }> = [
        { nodes: [[1,1],[2,1],[3,1],[1,2],[2,2],[3,2],[1,3],[2,3],[3,3]], fill: 'rgba(46,204,113,0.14)', stroke: 'rgba(46,204,113,0.4)' },   // pickup
        { nodes: [[24,16],[25,16],[26,16],[24,17],[25,17],[26,17],[24,18],[25,18],[26,18]], fill: 'rgba(52,152,219,0.14)', stroke: 'rgba(52,152,219,0.4)' }, // dropoff
      ];
      // racks
      for (let x = 6; x < 22; x++) for (let y = 4; y < 8; y++) {
        const [px,py] = xy([x,y]);
        ctx.fillStyle = 'rgba(139,105,20,0.16)';
        ctx.fillRect(px - cw*0.48, py - ch*0.48, cw*0.96, ch*0.96);
      }
      for (let x = 6; x < 22; x++) for (let y = 12; y < 16; y++) {
        const [px,py] = xy([x,y]);
        ctx.fillStyle = 'rgba(139,105,20,0.16)';
        ctx.fillRect(px - cw*0.48, py - ch*0.48, cw*0.96, ch*0.96);
      }
      // home nodes
      for (const [hx,hy] of [[0,0],[0,height-1],[width-1,0],[width-1,height-1],[Math.floor(width/2),0],[Math.floor(width/2),height-1]] as Array<[number,number]>) {
        const [px,py] = xy([hx,hy]);
        ctx.fillStyle = 'rgba(155,89,182,0.2)';
        ctx.beginPath(); ctx.arc(px, py, Math.max(4, minCell * 0.45), 0, Math.PI*2); ctx.fill();
      }
      // zone fill rects for pickup/dropoff
      for (const zone of zoneData) {
        for (const [nx,ny] of zone.nodes) {
          const [px,py] = xy([nx,ny]);
          ctx.fillStyle = zone.fill;
          ctx.fillRect(px - cw*0.48, py - ch*0.48, cw*0.96, ch*0.96);
          if (zone.stroke) {
            ctx.strokeStyle = zone.stroke; ctx.lineWidth = 0.8;
            ctx.strokeRect(px - cw*0.48, py - ch*0.48, cw*0.96, ch*0.96);
          }
        }
      }
      // obstacles — dark fill + X glyph
      for (const [ox,oy] of [[10,10],[10,11],[11,10],[11,11],[17,8],[17,9],[18,8],[18,9],[5,14],[5,15],[6,14],[6,15]] as Array<[number,number]>) {
        const [px,py] = xy([ox,oy]);
        ctx.fillStyle = '#1a0f0f';
        ctx.fillRect(px - cw*0.48, py - ch*0.48, cw*0.96, ch*0.96);
        ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1.5;
        const m = Math.min(cw,ch)*0.35;
        ctx.beginPath(); ctx.moveTo(px-m,py-m); ctx.lineTo(px+m,py+m); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px+m,py-m); ctx.lineTo(px-m,py+m); ctx.stroke();
      }
      // edge nodes — pulsing ring
      const pulse = 0.85 + 0.15 * Math.sin(frameTick / 4);
      for (const [ex,ey] of [[3,10],[13,10],[24,10]] as Array<[number,number]>) {
        const [px,py] = xy([ex,ey]);
        ctx.strokeStyle = 'rgba(79,198,192,0.7)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, minCell*0.38*pulse, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = 'rgba(79,198,192,0.35)';
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
      }
      // Zone labels
      ctx.font = `bold ${Math.max(6, Math.min(9, minCell*0.5))}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const zoneLabels: Array<[number,number,string,string]> = [
        [2,2,'PICKUP','#2ecc71'], [25,17,'DROPOFF','#3498db'],
        [13,5,'RACK A','#8B6914'], [13,13,'RACK B','#8B6914'],
        [3,10,'EDGE','#4fc6c0'], [13,10,'EDGE','#4fc6c0'], [24,10,'EDGE','#4fc6c0'],
      ];
      for (const [lx,ly,label,color] of zoneLabels) {
        const [px,py] = xy([lx,ly]);
        ctx.fillStyle = color; ctx.fillText(label, px, py);
      }
    }

    // Intersections highlighting (degree >= 3)
    const iHalo = minCell * 0.38;
    for (let x = 0; x < effW; x++) {
      for (let y = 0; y < effH; y++) {
        let degree = 0;
        if (x > 0) degree++;
        if (x + 1 < effW) degree++;
        if (y > 0) degree++;
        if (y + 1 < effH) degree++;
        if (degree >= 3) {
          const [px, py] = xy([x, y]);
          ctx.fillStyle = 'rgba(79, 198, 192, 0.04)';
          ctx.beginPath();
          ctx.arc(px, py, iHalo, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#273c35';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    if (!frame) return;

    // Space-time reservations (translucent halos)
    if (frame.reservations) {
      const resHalo = minCell * 0.44;
      for (const res of frame.reservations) {
        const [px, py] = xy(res.node);
        const color = ROBOT_COLORS[res.robot_id % ROBOT_COLORS.length];
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(px, py, resHalo, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Task locations (pickups and dropoffs)
    if (frame.tasks) {
      const taskR = Math.max(7, minCell * 0.32);
      for (const t of frame.tasks) {
        if (t.status === 'completed') continue;

        // Pickup marker
        const [px, py] = xy(t.pickup);
        ctx.fillStyle = 'rgba(95, 191, 122, 0.2)';
        ctx.strokeStyle = '#5fbf7a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, taskR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#5fbf7a';
        ctx.font = `bold ${Math.max(7, fontPt * 0.85)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('P' + t.task_id, px, py);

        // Dropoff marker
        const [dx, dy] = xy(t.dropoff);
        ctx.fillStyle = 'rgba(154, 134, 224, 0.2)';
        ctx.strokeStyle = '#9a86e0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(dx, dy, taskR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#9a86e0';
        ctx.font = `bold ${Math.max(7, fontPt * 0.85)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('D' + t.task_id, dx, dy);
      }
    }

    // Blocked edges (hazard red lines)
    if (frame.blocked_edges) {
      for (const edge of frame.blocked_edges) {
        const [a, b] = edge;
        const [ax, ay] = xy(a as Pos);
        const [bx, by] = xy(b as Pos);
        ctx.strokeStyle = '#e3595a';
        ctx.lineWidth = Math.max(3, minCell * 0.12);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();

        // X mark at center
        const mx = (ax + bx) / 2;
        const my = (ay + by) / 2;
        const xHalf = Math.max(3, minCell * 0.1);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mx - xHalf, my - xHalf); ctx.lineTo(mx + xHalf, my + xHalf);
        ctx.moveTo(mx + xHalf, my - xHalf); ctx.lineTo(mx - xHalf, my + xHalf);
        ctx.stroke();
      }
    }

    // v2: Selective comm flash for recently broadcast state; baseline shows full-rate links.
    if (frame.p2p_online) {
      const isBaseline = !frame.infra_online || frame.robots.every(r => (r.comm_events ?? 0) > frame.tick * 0.8);
      if (isBaseline) {
        // Baseline: full-rate greyed comm links
        ctx.strokeStyle = 'rgba(90,102,96,0.18)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 6]);
        for (let i = 0; i < frame.robots.length; i++) {
          for (let j = i + 1; j < frame.robots.length; j++) {
            const r1 = frame.robots[i], r2 = frame.robots[j];
            if (!r1.active || !r2.active) continue;
            const [x1, y1] = xy(r1.pos), [x2, y2] = xy(r2.pos);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
          }
        }
        ctx.setLineDash([]);
      } else {
        // HARMONI: brief cyan flash ring for robots that just broadcast
        for (const r of frame.robots) {
          if (!r.active || !r.comm_events) continue;
          if ((frameTick + r.id + (r.comm_events ?? 0)) % 5 === 0) {
            const [px, py] = xy(r.pos);
            ctx.strokeStyle = 'rgba(79,198,192,0.55)';
            ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(px, py, robotRadius * 1.6, 0, Math.PI*2); ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
    } else {
      // P2P offline banner
      ctx.fillStyle = 'rgba(227, 89, 90, 0.12)';
      ctx.fillRect(10, 10, 200, 24);
      ctx.fillStyle = '#e3595a';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('P2P COORDINATION OFFLINE', 18, 22);
    }

    // Robot planned paths
    frame.robots.forEach((r, i) => {
      if (!r.active || !r.path || r.path.length <= 1) return;
      const color = ROBOT_COLORS[i % ROBOT_COLORS.length];
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = Math.max(1.5, minCell * 0.07);
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      r.path.forEach((n, j) => {
        const [px, py] = xy(n);
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    });

    // Conflict / safety highlights from this tick
    if (frame.events_this_tick) {
      for (const ev of frame.events_this_tick) {
        if (ev.type === 'intersection_conflict' && ev.node) {
          const [cx, cy] = xy(ev.node);
          ctx.strokeStyle = '#e0a63a';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, robotRadius * 1.6, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (ev.type === 'deadlock_detected' && ev.cycle && ev.cycle.length >= 2) {
          const robotMap = new Map(frame.robots.map(r => [r.id, r]));
          const isResolved = ev.resolved !== false; // HARMONI resolves; baseline resolved===false
          ctx.strokeStyle = isResolved ? 'rgba(46,204,113,0.7)' : 'rgba(231,76,60,0.85)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([5, 4]);
          // Draw arc connecting cycle robots
          for (let ci = 0; ci < ev.cycle.length; ci++) {
            const ra = robotMap.get(ev.cycle[ci]);
            const rb = robotMap.get(ev.cycle[(ci + 1) % ev.cycle.length]);
            if (!ra || !rb) continue;
            const [ax, ay] = xy(ra.pos), [bx, by] = xy(rb.pos);
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
          }
          ctx.setLineDash([]);
          // Highlight each robot in cycle
          for (const rid of ev.cycle) {
            const r = robotMap.get(rid);
            if (!r) continue;
            const [rpx, rpy] = xy(r.pos);
            ctx.strokeStyle = isResolved ? 'rgba(46,204,113,0.6)' : '#e3595a';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(rpx, rpy, robotRadius * 1.7, 0, Math.PI*2); ctx.stroke();
          }
          // Label
          if (ev.cycle.length > 0) {
            const r0 = robotMap.get(ev.cycle[0]);
            if (r0) {
              const [lpx, lpy] = xy(r0.pos);
              ctx.font = `bold 8px monospace`;
              ctx.textAlign = 'center'; ctx.textBaseline = 'top';
              ctx.fillStyle = isResolved ? '#2ecc71' : '#e74c3c';
              ctx.fillText(isResolved ? 'RESOLVED' : 'STALLED', lpx, lpy - robotRadius - 10);
            }
          }
        }
      }
    }

    // Render Robots
    frame.robots.forEach((r, i) => {
      const color = ROBOT_COLORS[i % ROBOT_COLORS.length];
      const [px, py] = xy(r.pos);

      // Outer glow / selection circle
      if (selectedRobotId === r.id) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, robotRadius * 1.4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Robot body
      ctx.beginPath();
      ctx.arc(px, py, robotRadius, 0, Math.PI * 2);
      ctx.fillStyle = r.active ? color : '#3a3a3a';
      ctx.fill();

      // State outline
      if (r.active) {
        if (r.state === 'waiting') {
          ctx.strokeStyle = '#e0a63a'; // amber waiting
          ctx.lineWidth = 2.5;
          ctx.stroke();
        } else if (r.state === 'moving') {
          ctx.strokeStyle = '#5fbf7a'; // green moving
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      } else {
        // failed X
        ctx.strokeStyle = '#e3595a';
        ctx.lineWidth = 2;
        const xR = robotRadius * 0.7;
        ctx.beginPath();
        ctx.moveTo(px - xR, py - xR); ctx.lineTo(px + xR, py + xR);
        ctx.moveTo(px + xR, py - xR); ctx.lineTo(px - xR, py + xR);
        ctx.stroke();
      }

      // Robot ID text
      ctx.fillStyle = '#0d1210';
      ctx.font = `bold ${fontPt}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(r.id), px, py + 1);

      // Heading arrow / chevron indicator
      if (r.active && r.heading !== undefined) {
        const hLen = robotRadius * 1.35;
        const hx = px + Math.cos(r.heading) * hLen;
        const hy = py + Math.sin(r.heading) * hLen;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(hx, hy, Math.max(1.8, robotRadius * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }

      // Battery mini bar under robot
      const barW = robotRadius * 1.6;
      const barH = 2.5;
      const bx = px - barW / 2;
      const by = py + robotRadius + 3;
      ctx.fillStyle = '#1e2924';
      ctx.fillRect(bx, by, barW, barH);
      const bPct = Math.max(0, Math.min(1, r.battery / 100));
      ctx.fillStyle = bPct > 0.3 ? '#5fbf7a' : '#e3595a';
      ctx.fillRect(bx, by, barW * bPct, barH);
    });

    // Node selection halo for interactive aisle blocking
    if (selectedNode) {
      const [sx, sy] = xy(selectedNode);
      ctx.strokeStyle = '#e0a63a';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(sx, sy, robotRadius * 1.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [frame, width, height, selectedNode, selectedRobotId, minCell, robotRadius, dotRadius, fontPt]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-[#22302b] bg-[#0f1513]">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleClick}
        className={`w-full h-auto block ${obstacleMode ? 'cursor-crosshair' : 'cursor-pointer'}`}
      />
      {obstacleMode && (
        <div className="absolute top-2 left-2 bg-[#131a17]/95 border border-[#e3595a] px-3 py-1.5 rounded text-xs text-[#e3595a] font-mono flex items-center gap-2 shadow-lg animate-pulse">
          <span className="w-2 h-2 rounded-full bg-[#e3595a]" />
          <span><b>OBSTACLE MODE ACTIVE:</b> Click any intersection or cell to add/remove barrier</span>
        </div>
      )}
      {selectedNode && !obstacleMode && (
        <div className="absolute bottom-2 left-2 bg-[#131a17]/90 border border-[#e0a63a] px-3 py-1 rounded text-xs text-[#e0a63a] font-mono">
          Click an adjacent node to toggle block on aisle from [{selectedNode[0]},{selectedNode[1]}]
        </div>
      )}
    </div>
  );
}

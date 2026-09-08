/**
 * A* path planning over the Warehouse grid.
 * Used for local autonomy (each robot plans its own path) and for
 * replanning around blocked aisles or released reservations.
 *
 * This is the ONLY planner used for motion — it is deterministic, not
 * AI-based, per the safety principle that AI must never be responsible
 * for safety-critical navigation.
 *
 * Direct port of astar.py — identical logic, binary min-heap via array.
 */

import { Warehouse } from './warehouse';
import type { Pos } from './types';

/** Simple binary min-heap for A* open set */
class MinHeap<T extends { priority: number }> {
  private data: T[] = [];

  push(item: T): void {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this._siftDown(0);
    }
    return top;
  }

  get size(): number { return this.data.length; }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.data[parent].priority <= this.data[i].priority) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }

  private _siftDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].priority < this.data[smallest].priority) smallest = l;
      if (r < n && this.data[r].priority < this.data[smallest].priority) smallest = r;
      if (smallest === i) break;
      [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
      i = smallest;
    }
  }
}

interface HeapNode {
  priority: number; // f = g + h
  g: number;
  pos: Pos;
  parent: Pos | null;
}

/**
 * Returns the shortest path from start to goal (inclusive), or null if
 * no path exists. `avoidEdges` is a Set of edgeKey strings to treat as
 * impassable (used for local obstacle knowledge).
 */
export function astar(
  wh: Warehouse,
  start: Pos,
  goal: Pos,
  avoidEdges: Set<string> = new Set()
): Pos[] | null {
  if (Warehouse.posKey(start) === Warehouse.posKey(goal)) return [start];

  const heap = new MinHeap<HeapNode>();
  heap.push({ priority: Warehouse.dist(start, goal), g: 0, pos: start, parent: null });

  const cameFrom = new Map<string, Pos | null>();
  const gScore = new Map<string, number>();
  const visited = new Set<string>();

  gScore.set(Warehouse.posKey(start), 0);

  while (heap.size > 0) {
    const { g, pos, parent } = heap.pop()!;
    const posKey = Warehouse.posKey(pos);

    if (visited.has(posKey)) continue;
    visited.add(posKey);
    cameFrom.set(posKey, parent);

    if (posKey === Warehouse.posKey(goal)) {
      // reconstruct path
      const path: Pos[] = [];
      let cur: string | null = posKey;
      while (cur !== null) {
        path.push(Warehouse.keyToPos(cur));
        const prev = cameFrom.get(cur);
        cur = prev !== undefined && prev !== null ? Warehouse.posKey(prev) : null;
      }
      path.reverse();
      return path;
    }

    for (const nb of wh.neighbors(pos)) {
      const edgeKey = Warehouse.edgeKey(pos, nb);
      if (avoidEdges.has(edgeKey)) continue;

      const nbKey = Warehouse.posKey(nb);
      const tentative = g + 1;
      if (tentative < (gScore.get(nbKey) ?? Infinity)) {
        gScore.set(nbKey, tentative);
        heap.push({
          priority: tentative + Warehouse.dist(nb, goal),
          g: tentative,
          pos: nb,
          parent: pos,
        });
      }
    }
  }

  return null; // no path found
}

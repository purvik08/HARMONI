/**
 * A* path planning over the Warehouse grid.
 * v2: uses wh.nodeCost() for rack-weighted traversal.
 */

import { Warehouse } from './warehouse';
import type { Pos } from './types';

/** Min-heap node: [f, g, posKey, parentKey | null] */
type HeapNode = [number, number, string, string | null];

function heapPush(heap: HeapNode[], node: HeapNode): void {
  heap.push(node);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (heap[parent][0] <= heap[i][0]) break;
    [heap[parent], heap[i]] = [heap[i], heap[parent]];
    i = parent;
  }
}

function heapPop(heap: HeapNode[]): HeapNode {
  const top = heap[0];
  const last = heap.pop()!;
  if (heap.length > 0) {
    heap[0] = last;
    let i = 0;
    while (true) {
      let smallest = i;
      const l = 2*i+1, r = 2*i+2;
      if (l < heap.length && heap[l][0] < heap[smallest][0]) smallest = l;
      if (r < heap.length && heap[r][0] < heap[smallest][0]) smallest = r;
      if (smallest === i) break;
      [heap[i], heap[smallest]] = [heap[smallest], heap[i]];
      i = smallest;
    }
  }
  return top;
}

export function astar(wh: Warehouse, start: Pos, goal: Pos, avoidEdges?: Set<string>): Pos[] | null {
  const avoidSet = avoidEdges ?? new Set<string>();
  const startKey = Warehouse.posKey(start);
  const goalKey = Warehouse.posKey(goal);
  if (startKey === goalKey) return [start];

  const heap: HeapNode[] = [];
  const gScore = new Map<string, number>([[startKey, 0]]);
  const cameFrom = new Map<string, string | null>([[startKey, null]]);
  const visited = new Set<string>();

  heapPush(heap, [Warehouse.dist(start, goal), 0, startKey, null]);

  while (heap.length > 0) {
    const [, g, curKey] = heapPop(heap);
    if (visited.has(curKey)) continue;
    visited.add(curKey);

    if (curKey === goalKey) {
      // Reconstruct
      const path: Pos[] = [];
      let k: string | null = goalKey;
      while (k !== null) {
        path.push(Warehouse.keyToPos(k));
        k = cameFrom.get(k) ?? null;
      }
      return path.reverse();
    }

    const cur = Warehouse.keyToPos(curKey);
    for (const nb of wh.neighbors(cur)) {
      const nbKey = Warehouse.posKey(nb);
      const ek = Warehouse.edgeKey(cur, nb);
      if (avoidSet.has(ek)) continue;
      // v2: use nodeCost for destination
      const stepCost = wh.nodeCost(nb);
      const tentative = g + stepCost;
      if (tentative < (gScore.get(nbKey) ?? Infinity)) {
        gScore.set(nbKey, tentative);
        cameFrom.set(nbKey, curKey);
        heapPush(heap, [tentative + Warehouse.dist(nb, goal), tentative, nbKey, curKey]);
      }
    }
  }
  return null;
}

/** Return A* cost (not hop count) — used for task bidding */
export function astarDist(wh: Warehouse, start: Pos, goal: Pos): number {
  const path = astar(wh, start, goal);
  if (!path) return Infinity;
  return path.slice(1).reduce((sum, n) => sum + wh.nodeCost(n), 0);
}

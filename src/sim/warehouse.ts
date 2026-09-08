/**
 * Warehouse map: a grid graph representing aisles and intersections.
 * Nodes = [x, y] aisle waypoints. Edges = drivable segments between
 * adjacent waypoints (4-connected). Nodes with degree >= 3 are
 * "choke points" / intersections where cross-traffic conflicts occur.
 *
 * Direct port of warehouse.py — identical logic.
 */

import type { Pos } from './types';

export class Warehouse {
  readonly width: number;
  readonly height: number;
  readonly nodes: Pos[];
  readonly edges: Map<string, Set<string>>;
  readonly intersections: Set<string>;
  readonly blockedEdges: Set<string>; // frozenset-equivalent: "x1,y1|x2,y2" (sorted)

  constructor(width: number, height: number, customAdj?: Map<string, Pos[]>) {
    this.width = width;
    this.height = height;
    this.blockedEdges = new Set();

    if (customAdj) {
      this.nodes = Array.from(customAdj.keys()).map(k => Warehouse.keyToPos(k));
      this.edges = new Map();
      for (const [k, neighbors] of customAdj) {
        this.edges.set(k, new Set(neighbors.map(n => Warehouse.posKey(n))));
      }
    } else {
      this.nodes = [];
      this.edges = new Map();
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          const pos: Pos = [x, y];
          this.nodes.push(pos);
          const nbSet = new Set<string>();
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              nbSet.add(Warehouse.posKey([nx, ny]));
            }
          }
          this.edges.set(Warehouse.posKey(pos), nbSet);
        }
      }
    }

    this.intersections = new Set();
    for (const [key, nbs] of this.edges) {
      if (nbs.size >= 3) this.intersections.add(key);
    }
  }

  static posKey(pos: Pos): string {
    return `${pos[0]},${pos[1]}`;
  }

  static keyToPos(key: string): Pos {
    const [x, y] = key.split(',').map(Number);
    return [x, y];
  }

  /** Canonical edge key: sorted so (a,b) == (b,a) */
  static edgeKey(a: Pos, b: Pos): string {
    const ak = Warehouse.posKey(a), bk = Warehouse.posKey(b);
    return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
  }

  neighbors(node: Pos): Pos[] {
    const key = Warehouse.posKey(node);
    const nbSet = this.edges.get(key);
    if (!nbSet) return [];
    const out: Pos[] = [];
    for (const nbKey of nbSet) {
      const nb = Warehouse.keyToPos(nbKey);
      if (!this.blockedEdges.has(Warehouse.edgeKey(node, nb))) {
        out.push(nb);
      }
    }
    return out;
  }

  isIntersection(node: Pos): boolean {
    return this.intersections.has(Warehouse.posKey(node));
  }

  blockEdge(a: Pos, b: Pos): void {
    this.blockedEdges.add(Warehouse.edgeKey(a, b));
  }

  unblockEdge(a: Pos, b: Pos): void {
    this.blockedEdges.delete(Warehouse.edgeKey(a, b));
  }

  edgeBlocked(a: Pos, b: Pos): boolean {
    return this.blockedEdges.has(Warehouse.edgeKey(a, b));
  }

  getBlockedEdges(): Array<[Pos, Pos]> {
    const out: Array<[Pos, Pos]> = [];
    for (const key of this.blockedEdges) {
      const [ak, bk] = key.split('|');
      out.push([Warehouse.keyToPos(ak), Warehouse.keyToPos(bk)]);
    }
    return out;
  }

  static dist(a: Pos, b: Pos): number {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
  }

  /** Build warehouse from adjacency dict (for deadlock scenario) */
  static fromAdjacency(adj: Record<string, Pos[]>): Warehouse {
    const m = new Map<string, Pos[]>();
    for (const [k, v] of Object.entries(adj)) {
      m.set(k, v);
    }
    return new Warehouse(0, 0, m);
  }

  getIntersections(): Pos[] {
    return Array.from(this.intersections).map(k => Warehouse.keyToPos(k));
  }

  /** Pick N well-spread starting positions (mirrors Python's _pick_start_positions) */
  pickStartPositions(n: number): Pos[] {
    const rawCorners: Pos[] = [
      [0, 0],
      [this.width - 1, 0],
      [0, this.height - 1],
      [this.width - 1, this.height - 1],
      [Math.floor(this.width / 2), 0],
    ];
    const corners: Pos[] = rawCorners.filter(
      (p): p is Pos => p[0] >= 0 && p[1] >= 0 && p[0] < this.width && p[1] < this.height
    );

    const uniq = (arr: Pos[]) => {
      const seen = new Set<string>();
      return arr.filter(p => {
        const k = Warehouse.posKey(p);
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
    };

    const base = uniq(corners).slice(0, n);
    if (base.length >= n) return base.slice(0, n);

    // spread extras
    const used = new Set(base.map(p => Warehouse.posKey(p)));
    const extra: Pos[] = [];
    let x = 0;
    while (extra.length < n - base.length) {
      const cx = x % this.width;
      const cy = Math.floor(x / this.width) % this.height;
      const cand: Pos = [cx, cy];
      const ck = Warehouse.posKey(cand);
      if (!used.has(ck)) {
        extra.push(cand);
        used.add(ck);
      }
      x += Math.max(1, Math.floor(this.width / (n + 1)));
      if (x > this.width * this.height * 2) break; // safety
    }
    return [...base, ...extra];
  }
}

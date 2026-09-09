/**
 * Warehouse map: a grid graph representing aisles and intersections.
 * v2: 28×20 grid, labeled zones, static obstacle blocking, rack cost map, HOME_NODES.
 */

import type { Pos } from './types';

export const HOME_NODES: Pos[] = [
  [0, 0], [0, 19], [27, 0], [27, 19], [13, 0], [13, 19],
];

export interface WarehouseZones {
  pickup: Set<string>;
  dropoff: Set<string>;
  racks: Set<string>;
  home: Set<string>;
  obstacles: Set<string>;
  edge_nodes: Set<string>;
}

export class Warehouse {
  readonly width: number;
  readonly height: number;
  readonly nodes: Pos[];
  readonly edges: Map<string, Set<string>>;
  readonly intersections: Set<string>;
  readonly blockedEdges: Set<string>;
  readonly costMap: Map<string, number>;  // v2: node -> movement cost
  readonly zones: WarehouseZones;
  readonly isCustom: boolean;

  constructor(width: number, height: number, customAdj?: Map<string, Pos[]>) {
    this.width = width;
    this.height = height;
    this.blockedEdges = new Set();
    this.costMap = new Map();
    this.isCustom = !!customAdj;

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

    // v2: initialize zones
    this.zones = this.isCustom ? this._emptyZones() : this._initZones();

    // v2: apply static obstacle blocks and rack costs
    if (!this.isCustom) {
      this._applyObstacleBlocks();
      this._applyRackCosts();
    }
  }

  private _emptyZones(): WarehouseZones {
    return { pickup: new Set(), dropoff: new Set(), racks: new Set(),
             home: new Set(), obstacles: new Set(), edge_nodes: new Set() };
  }

  private _initZones(): WarehouseZones {
    const pickup = new Set<string>();
    const dropoff = new Set<string>();
    const racks = new Set<string>();
    const home = new Set<string>();
    const obstacles = new Set<string>();
    const edge_nodes = new Set<string>();

    for (const p of [[1,1],[2,1],[3,1],[1,2],[2,2],[3,2]] as Pos[]) pickup.add(Warehouse.posKey(p));
    for (const p of [[24,1],[25,1],[26,1],[24,2],[25,2],[26,2]] as Pos[]) dropoff.add(Warehouse.posKey(p));

    for (let x = 6; x < 22; x++) for (let y = 4; y < 8; y++) racks.add(`${x},${y}`);
    for (let x = 6; x < 22; x++) for (let y = 12; y < 16; y++) racks.add(`${x},${y}`);

    for (const p of HOME_NODES) home.add(Warehouse.posKey(p));

    for (const p of [[10,10],[10,11],[11,10],[11,11],[17,8],[17,9],[18,8],[18,9],[5,14],[5,15],[6,14],[6,15]] as Pos[])
      obstacles.add(Warehouse.posKey(p));

    for (const p of [[3,10],[13,10],[24,10]] as Pos[]) edge_nodes.add(Warehouse.posKey(p));

    return { pickup, dropoff, racks, home, obstacles, edge_nodes };
  }

  private _applyObstacleBlocks(): void {
    for (const key of this.zones.obstacles) {
      const node = Warehouse.keyToPos(key);
      const nbSet = this.edges.get(key);
      if (!nbSet) continue;
      for (const nbKey of nbSet) {
        const nb = Warehouse.keyToPos(nbKey);
        this.blockedEdges.add(Warehouse.edgeKey(node, nb));
      }
    }
  }

  private _applyRackCosts(): void {
    for (const key of this.zones.racks) {
      this.costMap.set(key, 3);
    }
  }

  // ─── Static helpers ───────────────────────────────────────────────────────
  static posKey(pos: Pos): string { return `${pos[0]},${pos[1]}`; }
  static keyToPos(key: string): Pos { const [x, y] = key.split(',').map(Number); return [x, y]; }
  static edgeKey(a: Pos, b: Pos): string {
    const ak = Warehouse.posKey(a), bk = Warehouse.posKey(b);
    return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
  }
  static dist(a: Pos, b: Pos): number { return Math.abs(a[0]-b[0]) + Math.abs(a[1]-b[1]); }

  // ─── Instance methods ────────────────────────────────────────────────────
  neighbors(node: Pos): Pos[] {
    const key = Warehouse.posKey(node);
    const nbSet = this.edges.get(key);
    if (!nbSet) return [];
    const out: Pos[] = [];
    for (const nbKey of nbSet) {
      const nb = Warehouse.keyToPos(nbKey);
      if (!this.blockedEdges.has(Warehouse.edgeKey(node, nb))) out.push(nb);
    }
    return out;
  }

  nodeCost(node: Pos): number { return this.costMap.get(Warehouse.posKey(node)) ?? 1; }
  isIntersection(node: Pos): boolean { return this.intersections.has(Warehouse.posKey(node)); }
  blockEdge(a: Pos, b: Pos): void { this.blockedEdges.add(Warehouse.edgeKey(a, b)); }
  unblockEdge(a: Pos, b: Pos): void { this.blockedEdges.delete(Warehouse.edgeKey(a, b)); }
  edgeBlocked(a: Pos, b: Pos): boolean { return this.blockedEdges.has(Warehouse.edgeKey(a, b)); }
  getBlockedEdges(): Array<[Pos, Pos]> {
    const out: Array<[Pos, Pos]> = [];
    for (const key of this.blockedEdges) {
      const [ak, bk] = key.split('|');
      out.push([Warehouse.keyToPos(ak), Warehouse.keyToPos(bk)]);
    }
    return out;
  }
  getIntersections(): Pos[] { return Array.from(this.intersections).map(k => Warehouse.keyToPos(k)); }

  static fromAdjacency(adj: Record<string, Pos[]>): Warehouse {
    const m = new Map<string, Pos[]>();
    for (const [k, v] of Object.entries(adj)) m.set(k, v);
    return new Warehouse(0, 0, m);
  }

  /** v2: use HOME_NODES for large warehouse, fallback corners for custom maps */
  pickStartPositions(n: number): Pos[] {
    if (!this.isCustom && this.width >= 28 && this.height >= 20) {
      return Array.from({ length: n }, (_, i) => HOME_NODES[i % HOME_NODES.length]);
    }
    const rawCorners: Pos[] = [
      [0, 0], [this.width-1, 0], [0, this.height-1],
      [this.width-1, this.height-1], [Math.floor(this.width/2), 0],
    ];
    const corners: Pos[] = rawCorners.filter(
      (p): p is Pos => p[0] >= 0 && p[1] >= 0 && p[0] < this.width && p[1] < this.height
    );
    const uniq = (arr: Pos[]) => {
      const seen = new Set<string>();
      return arr.filter(p => { const k = Warehouse.posKey(p); if (seen.has(k)) return false; seen.add(k); return true; });
    };
    const base = uniq(corners).slice(0, n);
    if (base.length >= n) return base.slice(0, n);
    const used = new Set(base.map(p => Warehouse.posKey(p)));
    const extra: Pos[] = [];
    let x = 0;
    while (extra.length < n - base.length) {
      const cx = x % this.width, cy = Math.floor(x / this.width) % this.height;
      const cand: Pos = [cx, cy];
      const ck = Warehouse.posKey(cand);
      if (!used.has(ck)) { extra.push(cand); used.add(ck); }
      x += Math.max(1, Math.floor(this.width / (n+1)));
      if (x > this.width * this.height * 2) break;
    }
    return [...base, ...extra];
  }
}

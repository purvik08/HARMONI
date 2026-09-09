# HARMONI v2 — Upgrade Prompt

## Context
Existing prototype: discrete-tick Python simulator (`warehouse.py`, `astar.py`, `network.py`, `reservation.py`, `deadlock.py`, `tasks.py`, `robot.py`, `simulator.py`, `scenarios.py`, `benchmark.py`) + self-contained HTML dashboard (`dashboard_final.html`). Read all source files before writing any code.

---

## 1. Warehouse Map — 4× Scale

**New grid: 28 × 20** (current is 7 × 5, logical 4× expansion = 28 × 20).

Replace the `Warehouse` default `width=7, height=5` with `width=28, height=20`.

Apply this new size in:
- `warehouse.py` defaults
- `simulator.py` Simulator constructor defaults
- `scenarios.py` all 5 scenario constructors
- `benchmark.py` Simulator call
- Dashboard canvas aspect ratio (maintain cell proportions)

---

## 2. Labeled Zones — Hard-Coded Node Sets

Add a `zones` dict to `Warehouse.__post_init__`. Each zone is a named set of grid nodes. Implement all of the following. Coordinates are illustrative — adjust to fit 28×20 without overlap.

```python
zones = {
  # Inbound — where new parcels arrive from outside
  "pickup":   {(1,1),(2,1),(3,1),(1,2),(2,2),(3,2)},

  # Outbound — robots deliver completed parcels here
  "dropoff":  {(24,1),(25,1),(26,1),(24,2),(25,2),(26,2)},

  # Storage rack aisles — traversable but high-cost (weight=3 in A*)
  "racks":    {(x,y) for x in range(6,22) for y in range(4,8)}
            | {(x,y) for x in range(6,22) for y in range(12,16)},

  # Charging / home bases — one per robot, indexed by robot_id
  # Robot i homes at HOME_NODES[i]
  "home":     {(0,0),(0,19),(27,0),(27,19),(13,0),(13,19)},

  # Fixed static obstacles — blocked edges around these nodes
  "obstacles":{(10,10),(10,11),(11,10),(11,11),   # pillar cluster A
               (17,8),(17,9),(18,8),(18,9),          # pillar cluster B
               (5,14),(5,15),(6,14),(6,15)},          # pillar cluster C

  # Edge compute nodes — logical only, no physical cell
  # Tasks are *announced* here; robots bid via P2P, no central server
  "edge_nodes": {(3,10),(13,10),(24,10)},
}
```

**Static obstacles:** for every node in `zones["obstacles"]`, call `wh.block_edge(node, nb)` for all 4 neighbors in `__post_init__`. These are permanent.

**A\* rack cost:** add optional `cost_map: dict` to `Warehouse`; rack nodes default to `cost=3`. Update `astar.py` to use `wh.cost_map.get(node, 1)` as edge weight.

**Home nodes:** `HOME_NODES = [(0,0),(0,19),(27,0),(27,19),(13,0),(13,19)]`. Robot `i` starts at `HOME_NODES[i % len(HOME_NODES)]`.

---

## 3. Edge-Node Task Allocation (No Central Server)

Add `EdgeNode` class to `tasks.py`:

```python
class EdgeNode:
    """Logical processing node. Announces tasks on the P2P bus.
    Does NOT assign — robots self-select via auction.
    Multiple edge nodes run independently; same deterministic winner."""
    def __init__(self, node_id, pos, bus, task_pool): ...
    def announce(self, task, tick): ...   # publish task_available event
```

- Three `EdgeNode` instances, one per `zones["edge_nodes"]` position.
- On each tick, each `EdgeNode` checks its local area for robots returning completed deliveries and announces new tasks from the global pool into the bus.
- Robots subscribe, compute bid = `astar_dist(self.pos, task.pickup)`, publish bid. Lowest bid wins the lease. Tie-break: lower `robot_id`.
- **No central server touches the winner selection.** Each robot independently computes the same winner from the same bus state (deterministic = consistent).

---

## 4. Robot Communication — Collision-Imminent Only

Replace always-on `publish_state` with conditional publishing:

```python
# In robot.py Robot.step()
COMM_HORIZON = 4   # only broadcast if another robot is within 4 hops

def _should_broadcast(self, peer_states):
    for msg in peer_states.values():
        if Warehouse.dist(self.pos, msg["pos"]) <= COMM_HORIZON:
            return True
    if self.wh.is_intersection(self._next_planned_node()):
        return True
    return False
```

- If `_should_broadcast()` is False, skip `bus.publish_state()` for that tick.
- **Safety override:** always broadcast when `state == "waiting"` (needed for deadlock graph).
- **Baseline mode:** always broadcast (traditional systems use continuous beacon).

Track and expose `comm_events` counter in metrics for dashboard display.

---

## 5. Deadlock Scenarios — HARMONI Resolves, Baseline Stalls

### Scenario 4 upgrade (keep existing micro-map logic, add a second scenario):

**Scenario 4b — Large-map deliberate deadlock:**
- Place 4 robots in a cross pattern around intersection `(13,10)`.
- Each robot's goal is the position 2 steps past the robot directly opposite it — guaranteed circular dependency.
- **HARMONI:** wait-for graph detects the 4-cycle within 2 ticks; lowest-priority robot yields into nearest free cell; fleet resumes within 5 ticks. Log `deadlock_detected`, `deadlock_resolved`.
- **Baseline:** no deadlock detection — all 4 robots sit blocked indefinitely (cap at 60 ticks, log `deadlock_unresolved`).

Add `scenarios.py` entry `"4b_large_deadlock"` with `mode` parameter: run it once with `mode="harmoni"`, once with `mode="baseline"`, store both logs.

---

## 6. Side-by-Side Dashboard — HARMONI Left, Baseline Right

Rebuild the dashboard layout as a **split-screen**, both simulations running from the **same tick clock**, same task list, same obstacle layout, different coordination logic.

### HTML structure
```
┌────────────────────────────────────────────────┐
│              HARMONI  vs  STANDARD             │  ← top bar + indicators
├───────────────────────┬────────────────────────┤
│   HARMONI Canvas      │   Stop-and-Wait Canvas │  ← synchronized tick
│   (left, cyan tint)   │   (right, grey tint)   │
├───────────────────────┴────────────────────────┤
│  Shared controls: ▶ ❚❚  scrubber  speed  reset │
├───────────────────────┬────────────────────────┤
│   HARMONI metrics     │   Baseline metrics     │
├───────────────────────┴────────────────────────┤
│              Event feed (both)                 │
└────────────────────────────────────────────────┘
```

### Canvas zones — visual layer order (draw bottom → top)

1. **Grid lines** (dim)
2. **Zone fills** (semi-transparent):
   - pickup → green tint
   - dropoff → blue tint
   - racks → brown tint
   - home → violet circles
   - obstacles → solid dark, ✕ glyph
   - edge_nodes → pulsing ring
3. **Blocked edges** (red thick stroke)
4. **Robot planned paths** (dashed, robot color, 35% alpha)
5. **Robots** (filled circle, robot color, ID label)
   - `waiting` → amber ring
   - `failed` → grey + ✕
   - `charging` → violet ring
6. **Deadlock indicator** → red arc connecting deadlocked robots
7. **Communication link** → brief cyan flash between robots that just broadcast

### Zone labels
Render small uppercase text labels centered on each zone cluster:
`PICKUP` / `DROPOFF` / `RACK A` / `RACK B` / `HOME` / `EDGE NODE` / `OBSTACLE`

### Jury-legibility requirements
- Both canvases must be side-by-side on a 1280px+ desktop viewport.
- HARMONI canvas has a **cyan** `#4fc6c0` left border (4px).
- Baseline canvas has a **grey** `#5a6660` left border (4px).
- Each canvas title bar shows: `HARMONI · DISTRIBUTED` vs `STANDARD · STOP & WAIT`.
- Metric cards below each canvas update live with:
  - Tasks completed / total
  - Robots waiting (count, highlighted red when > 0)
  - Deadlocks: `RESOLVED ✓` (green, HARMONI) vs `STALLED ✗` (red, baseline)
  - Collisions
  - Comm events (HARMONI: low number; baseline: high, greyed label)

---

## 7. Indicators — Both Simulations

```
┌─ HARMONI ────────────────────────────────────────────┐
│  INFRASTRUCTURE: ONLINE/OFFLINE                       │
│  P2P COORDINATION: ACTIVE                            │
│  LOCAL AUTONOMY: ACTIVE                              │
│  SAFETY: ACTIVE                                      │
└─ STANDARD ───────────────────────────────────────────┘
│  CENTRAL CONTROLLER: ACTIVE (always)                  │
│  INTER-ROBOT COMM: BROADCAST (always)                │
│  DEADLOCK RECOVERY: NONE                             │
└──────────────────────────────────────────────────────┘
```

---

## 8. Benchmark Tab

Keep existing benchmark tab. Add two new rows to the sweep table:
- `deadlock_resolution_ticks` — HARMONI vs baseline (baseline = `∞ / stalled`)
- `comm_events_per_task` — HARMONI (selective) vs baseline (always-on)

---

## 9. Implementation Order

Execute in this sequence — do not proceed to the next step until the previous one produces correct JSON logs:

1. Scale warehouse to 28×20, update all constructors, verify `main.py` runs without error.
2. Add zones + static obstacles + rack cost weights to `warehouse.py` and `astar.py`.
3. Add `HOME_NODES`, update robot start positions in `simulator.py`.
4. Add `EdgeNode` to `tasks.py`, wire into `simulator.py` tick loop.
5. Add conditional broadcast logic to `robot.py`.
6. Add Scenario 4b to `scenarios.py` (both modes).
7. Update `main.py` to run all scenarios + both-mode Scenario 4b + benchmark sweep; write all logs.
8. Rebuild `dashboard_final.html` with split-screen layout, zone rendering, deadlock arcs, comm flashes.
9. Playwright headless screenshot test — verify no JS errors, both canvases render, deadlock scenario shows red arc on baseline and green resolved state on HARMONI.
10. Package: `harmoni_v2_dashboard.html` (self-contained, data embedded) + `harmoni_v2_source.zip`.

---

## 10. Constraints (unchanged from v1)

- No central fleet controller for AMR coordination.
- AI never in safety-critical collision-avoidance path.
- Never fabricate benchmark results — display measured values only.
- Show coordination layer simplifications (shared reservation table) in README update.
- All files must run with `python3 main.py` (stdlib + no external deps except existing ones).
- Dashboard must be a single self-contained `.html` file (data embedded as JSON blob).

---

## Deliverables

| File | Description |
|------|-------------|
| `harmoni_v2_dashboard.html` | Split-screen dashboard, all data embedded |
| `harmoni_v2_source.zip` | All `.py` sources + `logs/` + `README_v2.md` |


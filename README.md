# HARMONI - Browser Digital Twin for AMR Coordination

HARMONI is a Next.js/TypeScript prototype for the SIH26123 problem statement: decentralized coordination and collision-avoidance for multiple autonomous mobile robots in a smart warehouse.

The browser app is a repeatable simulation and dashboard. It emulates the coordination architecture described in `Docs/`; it is not a ROS 2/Nav2 runtime, a physical wireless-network proof, or an industrial safety certification.

## What The Prototype Demonstrates

- 3+ AMRs moving through a warehouse grid with pickup/dropoff tasks.
- Local robot autonomy with deterministic path planning and safety checks.
- Relevant-neighbor state/intent exchange over an emulated P2P bus.
- Conflict prediction, space-time/resource reservations, and deterministic right-of-way.
- Blocked-aisle updates and local rerouting.
- Wait-for deadlock detection and deterministic recovery.
- Task leases, robot failure, lease expiry, and reassignment.
- Infrastructure/WMS loss and robot-to-robot communication loss.
- Stop-and-wait baseline comparison under identical seeds/workloads.
- Measured metrics for collisions, completion time, waiting, replans, throughput, and communication load.

## Documentation Source Of Truth

The intended architecture and scope are in `Docs/`:

- `00_README.md` and `01_PROJECT_OVERVIEW.md` define the problem and project boundaries.
- `02_ARCHITECTURE.md` describes local autonomy, relevant-neighbor coordination, conflict management, task allocation, and optional infrastructure.
- `03_SCALABILITY_AND_INFINITY.md` explains the scalability claim: localized overhead, not literal infinite robots.
- `04_COMMUNICATION_ARCHITECTURE.md` frames Zenoh/P2P as candidate technologies that still require hardware validation.
- `05_COORDINATION_ALGORITHMS.md` describes planning, conflict prediction, reservations, ranking, deadlock detection, and safety.
- `06_TASK_ALLOCATION.md` covers local/hierarchical bidding and task leases.
- `07_FAILURE_AND_RECOVERY.md` defines WMS, infrastructure, P2P, and robot failure behavior.
- `08_EDGE_AI.md` keeps prediction below deterministic safety in the decision hierarchy.
- `09_SIMULATION_AND_VALIDATION.md` defines the demonstration scenarios.
- `10_METRICS.md` defines measured success criteria.
- `14_LIMITATIONS_AND_NON_CLAIMS.md` lists what this prototype must not overclaim.

## Demo Scenarios

1. Overlapping paths and intersection conflict resolution.
2. Blocked aisle, obstacle update, and rerouting.
3. Deadlock detection and recovery.
4. Robot failure, stale state, task lease expiry, and reassignment.
5. Infrastructure/WMS link failure with continued local/P2P operation.
6. P2P communication loss with isolated local autonomy.
7. Scaling run focused on local conflict relationships and communication load.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Useful checks:

```bash
npm run typecheck
npm run test:determinism
npm run build
```

`npm run lint` currently depends on adding ESLint because the installed Next.js version no longer bundles `next lint`.

## Deployment

The app is suitable for Vercel as a browser-based demonstration:

```bash
npm run build
```

No environment variables are required for the current simulation prototype.

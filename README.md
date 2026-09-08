# HARMONI — Edge-AI Distributed Fleet Coordination for AMRs (Vercel Edition)
### SIH26123 Browser-Based AMR Digital Twin

## Overview
This repository contains a **complete, interactive browser-based simulation of the HARMONI system** built with **Next.js, TypeScript, and Web Workers**, designed for zero-config deployment on **Vercel**.

Unlike static dashboards or mocks, this application runs a live, continuous simulation engine entirely in the browser. Every UI element, state badge, telemetry value, conflict warning, and benchmark metric is generated in real-time by the ported HARMONI decentralized algorithms.

---

## Key Features & Live Capabilities

1. **Continuous Multi-AMR Warehouse Simulation (Web Worker)**:
   - ≥3 AMRs running on a 7×5 aisle grid with intersections, pickup and dropoff points.
   - Continuous task generation, execution, delivery, and battery depletion.
   - Runs off the main UI thread via Web Worker (`src/workers/simWorker.ts`) maintaining 60 FPS UI responsiveness.

2. **Decentralized Coordination (HARMONI Logic)**:
   - **Space-Time Reservations**: Multi-tick lookahead reservation table (`src/sim/reservation.ts`) preventing node and edge-swap collisions.
   - **Deterministic Distributed Priority**: Audit-friendly tie-breaking where lower AMR ID wins conflicts deterministically.
   - **Intent Sharing & P2P State Exchange**: Autonomous state broadcasting over emulated P2P mesh (`src/sim/network.ts`).
   - **Wait-For Graph Deadlock Detection & Recovery**: Onboard cycle detection (`src/sim/deadlock.ts`) where the lowest-priority AMR in a cycle automatically yields to pull-out bays.
   - **Starvation Guard**: AMR etiquette where parked AMRs yield to blocked working peers.
   - **Dynamic A\* Replanning**: Obstacle awareness through simulated LiDAR, replanning around blocked aisles.
   - **Lease-Based Task Auction**: Decentralized task pool (`src/sim/tasks.ts`) with automatic lease renewal, expiration, and dynamic reassignment when robots go offline.

3. **Interactive Failure & Event Injection**:
   - **Cut Central WMS Wi-Fi**: Sever the central link; observe automatic failover to **P2P Distributed Mode**.
   - **Sever P2P Mesh**: Switch to **Isolated Local Autonomy**.
   - **Disable AMR**: Force an AMR into **Safe Mode** / hardware failure; watch its active task lease expire and re-lease to another AMR.
   - **Block/Unblock Aisles**: Click any adjacent grid waypoints on the canvas to place or remove obstacles in real time.
   - **Induce Deadlocks**: Force head-on conflicts to watch wait-for cycle detection and escape resolution.
   - **Add Tasks & Spawn/Remove AMRs**: Scale the fleet dynamically.

4. **Real Empirical Benchmark (Baseline vs HARMONI)**:
   - Executes identical workloads, maps, and seeds under **Stop-and-Wait Baseline** (naive intersection locks) vs **HARMONI** (space-time reservations).
   - Live calculated metrics: Task completion time, throughput, average wait ticks per AMR, collision count (0 in both), replanning count.
   - Computes real improvement percentages (never hardcoded).

5. **SIH Scenarios Replay & Sandbox**:
   - **Scenario 1**: 3-way Intersection Conflict
   - **Scenario 2**: Blocked Aisle & LiDAR Dynamic Replanning
   - **Scenario 3**: AMR Failure & Lease Reassignment
   - **Scenario 4**: Circular Deadlock & Deterministic Escape
   - **Scenario 5**: Central WMS Wi-Fi Failure & P2P Autonomy

---

## Project Structure

```
harmoni-vercel/
├── src/
│   ├── sim/                        # TypeScript port of all Python simulator modules
│   │   ├── types.ts                # Data models, frames, metrics, commands
│   │   ├── warehouse.ts            # Warehouse grid graph, aisles, choke points
│   │   ├── astar.ts                # Deterministic A* planner with min-heap
│   │   ├── reservation.ts          # Space-time reservation table (HARMONI + baseline)
│   │   ├── deadlock.ts             # Wait-for cycle detection & recovery selection
│   │   ├── network.ts              # Emulated pub/sub bus (WMS + P2P layers)
│   │   ├── tasks.ts                # Lease-based auction & task pool
│   │   ├── robot.ts                # Autonomous AMR agent with onboard state & sensing
│   │   ├── simulator.ts            # Discrete-tick simulator & interactive extensions
│   │   ├── scenarios.ts            # All 5 SIH benchmark scenarios
│   │   └── benchmark.ts            # Head-to-head empirical benchmark engine
│   ├── workers/
│   │   └── simWorker.ts            # Background Web Worker running the simulation loop
│   ├── hooks/
│   │   └── useSimWorker.ts         # React hook for worker communication & state
│   ├── components/
│   │   ├── SimCanvas.tsx           # High-performance Canvas visualizer
│   │   ├── StatusPanel.tsx         # Network status & operating mode badges
│   │   ├── ControlPanel.tsx        # Start/Pause, speed, failure injection controls
│   │   ├── RobotRoster.tsx         # AMR onboard telemetry cards
│   │   ├── EventFeed.tsx           # Real-time coordination event feed
│   │   ├── MetricsPanel.tsx        # Live throughput & efficiency meters
│   │   ├── BenchmarkPanel.tsx      # Empirical benchmark comparisons
│   │   └── ScenarioTabs.tsx        # Scenario tabs & replay scrubber
│   └── app/
│       ├── api/
│       │   ├── benchmark/route.ts  # Serverless API endpoint for benchmark runs
│       │   └── scenario/[name]/route.ts # Serverless API endpoint for scenario runs
│       ├── layout.tsx              # Root HTML & metadata
│       ├── globals.css             # Tailwind & theme variables
│       └── page.tsx                # Integrated application dashboard
├── public/                         # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vercel.json                     # Vercel deployment configuration
```

---

## Local Development & Running

```bash
cd harmoni-vercel
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploying to Vercel

```bash
npm i -g vercel
cd harmoni-vercel
vercel
```
Or connect this Git repository directly to Vercel via GitHub/GitLab. The project requires zero environment variables and works out of the box.

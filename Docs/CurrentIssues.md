I inspected the deployed HARMONI page as a **software QA engineer + production robotics reviewer + SIH jury member**. The live page is reachable and exposes the major simulation controls and telemetry. ([Harmony][1])

However, I **cannot truthfully claim I executed every button/state transition** from this environment—the web inspection exposes the rendered UI/state, but not full interactive browser execution. So below I separate **confirmed issues from high-risk functional issues that need runtime execution**.

## 1. Critical issues

### 🔴 C1 — Initial simulation state is effectively empty

The landing state shows:

* `Fleet State 0/0 Active`
* `Active AMRs 0`
* `Tasks H/B 0/0`
* `No active AMRs in roster`
* all benchmark counters at zero. ([Harmony][1])

For a robotics demonstration, this is a serious UX problem.

A jury member landing on the page sees an **empty warehouse**, rather than immediately seeing HARMONI working.

**Expected:** either:

* preload 3 AMRs + representative tasks, or
* have a very obvious `Load Demo Scenario` action.

---

### 🔴 C2 — "Live Sandbox" is not self-explanatory

The UI says:

> `Live Sandbox: Continuous AMR Fleet Simulation`

but initially there are no robots.

This creates ambiguity about whether:

* the simulation is broken,
* the user needs to spawn robots,
* the simulation hasn't started,
* or the page failed to initialize.

For an SIH jury, this can look like a broken prototype.

---

### 🔴 C3 — Failure scenarios are exposed before establishing baseline state

The page immediately exposes:

* Drop WMS Link
* Drop P2P Link
* Induce Deadlock
* Add Warehouse Task
* Obstacle Placement
* Disable/Recover AMR

These are advanced test controls. ([Harmony][1])

But there is no obvious workflow such as:

**Initialize → Start → Observe → Inject Failure → Recover → Compare**

The controls are therefore more like a developer debug console than a polished robotics demonstration.

---

## 2. Major HARMONI logic/robotics concerns

### 🔴 C4 — Hierarchy is displayed but not sufficiently observable

The page documents:

1. Infrastructure
2. P2P coordination
3. Local perception
4. Safe behavior

and says deterministic safety has final authority. ([Harmony][1])

This is good architecture.

But the UI doesn't appear to expose **which layer actually made a decision**.

For every important robot decision, the jury should be able to see something like:

`AMR-02`
→ Prediction detected conflict
→ P2P negotiation
→ Reservation request
→ Hierarchy arbitration
→ Safety layer
→ WAIT / GO / REROUTE

Without that, the hierarchy is primarily **claimed architecture rather than demonstrable behavior**.

---

### 🔴 C5 — Decision oscillation is a major risk

This is especially important because you previously identified robots getting trapped in a continuous decision-changing loop.

Your current architecture needs a visible **decision commitment mechanism**.

Example:

```text
AMR-01:
GO → WAIT → GO → WAIT → GO
```

must never happen indefinitely.

You need:

```text
Decision
   ↓
Commitment window
   ↓
Execution
   ↓
Re-evaluation
```

and ideally:

* hysteresis
* minimum commitment duration
* decision priority
* cooldown
* escalation
* deadlock recovery

Otherwise a real-world reviewer can legitimately ask:

> "What prevents two AMRs from continuously changing their decisions?"

---

## 3. Deadlock handling

The UI claims:

> `Deadlock Recovery ACTIVE (Wait-for cycle recovery)` ([Harmony][1])

That's promising, but I see a potential demonstration weakness.

### 🔴 C6 — Deadlock recovery needs visible causal evidence

A counter:

`Deadlocks 0 resolved`

isn't enough.

The UI should show:

```text
DEADLOCK DETECTED

AMR-01 → waits for AMR-02
AMR-02 → waits for AMR-03
AMR-03 → waits for AMR-01

Cycle detected: YES

Resolution:
AMR-02 priority elevated
AMR-01 rerouted
Cycle broken

Recovery: 2.4 s
```

That would be **jury-grade evidence**.

---

## 4. P2P communication

The page claims:

`P2P Comms ACTIVE`

and

`RELEVANT-NEIGHBOR (TTL)` ([Harmony][1])

### 🔴 C7 — Communication behavior isn't sufficiently visible

A reviewer should be able to answer:

* Who sent the message?
* Who received it?
* Why was it sent?
* What information was exchanged?
* What was the TTL?
* What happens when P2P disappears?
* Does the robot continue safely?

You need a message trace such as:

```text
12:04:21.440
AMR-01 → AMR-03

TYPE: INTENT
POSITION: (13,10)
ETA: 4 ticks
RESERVATION: R17
TTL: 3

12:04:21.451
AMR-03 → AMR-01

TYPE: ACK
ACTION: YIELD
```

---

## 5. Infrastructure failure

The system exposes:

`Drop WMS Link` and `Drop P2P Link`. ([Harmony][1])

### 🔴 C8 — WMS loss and P2P loss need clearly different behaviors

These are fundamentally different failures.

**WMS loss:**

```text
WMS unavailable
↓
Existing task leases retained
↓
Local autonomy continues
↓
New task acquisition disabled/degraded
```

**P2P loss:**

```text
P2P unavailable
↓
Local perception remains active
↓
Safety layer becomes authoritative
↓
Conservative movement
↓
Recovery when communication returns
```

If the simulation treats both simply as "communication OFF", the architecture isn't convincingly demonstrated.

---

## 6. Collision safety

The UI has:

`Collisions 0`

and

`Sensor Authority: DETERMINISTIC` ([Harmony][1])

### 🔴 C9 — "0 collisions" is meaningless without attempted conflicts

A jury will ask:

> "How many conflict situations were actually generated?"

You need:

```text
Conflict situations: 47
Potential collisions: 31
Avoided: 31
Actual collisions: 0
```

instead of simply:

```text
Collisions: 0
```

Otherwise zero could simply mean **nothing happened**.

---

## 7. Edge-AI claims

The page calls this:

`Edge Prediction & Conflict Graph Telemetry`

and says prediction informs planning while deterministic safety makes the final movement decision. ([Harmony][1])

### 🟠 C10 — "AI" is not strongly demonstrated

The current UI says:

> `Emulated Prediction Layer`

This is actually honest, which is good.

But from a jury perspective, this means you should **not oversell it as actual Edge AI**.

You should clearly distinguish:

```text
Simulation:
Edge-AI behavior emulated

Target hardware:
Pi 5 / Jetson / AMR onboard computer

Production:
Actual perception + prediction model
```

This will make your presentation more credible.

---

## 8. Conflict graph

The UI states:

> `Relevance-driven P2P links formed strictly where predicted trajectories intersect within lookahead horizon H=4.` ([Harmony][1])

### 🟠 C11 — Graph visualization is essential

You currently expose:

`Intersecting Edges: 0 Pairs`

but a jury should actually **see the graph**.

Example:

```text
AMR-01 ───── AMR-03
   │             │
   └──── AMR-02 ┘

Conflict Zone: Z4
Reason: trajectory intersection
Horizon: 4 ticks
```

This would visually prove the decentralized coordination concept.

---

# 9. Dynamic obstacle system

The page has:

`OBSTACLE PLACEMENT MODE`

and coordinate inputs plus presets. ([Harmony][1])

### 🔴 C12 — Coordinate-based obstacle interaction is not user friendly

A real user shouldn't have to understand:

`[13] [10] → Toggle Cell Barrier`

without knowing:

* grid dimensions
* coordinate origin
* axis orientation
* currently selected cell
* whether `(13,10)` is occupied
* what robot is affected.

Add:

```text
Grid: 28 × 20
Selected: (13,10)
State: FREE
Action: BLOCK
```

---

# 10. Robot management

The page exposes:

`Robot: [Select] [Disable] [Recover] [+ Spawn AMR]` ([Harmony][1])

### 🔴 C13 — Robot lifecycle needs validation

Potential bad states:

```text
Disable already-disabled AMR
Recover active AMR
Recover unknown AMR
Spawn duplicate AMR ID
Spawn beyond fleet limit
Disable AMR carrying task
Remove AMR while another robot depends on it
```

Every one should have deterministic handling.

For example:

```text
AMR-02 DISABLED

Active task:
TASK-17

Task reassigned:
AMR-03

Reason:
Robot failure recovery
```

---

# 11. Task system

The page provides:

`+ Add Warehouse Task` ([Harmony][1])

### 🔴 C14 — Task lifecycle isn't sufficiently visible

A task should have:

```text
CREATED
 ↓
ASSIGNED
 ↓
RESERVED
 ↓
PICKUP
 ↓
TRANSPORT
 ↓
DROPOFF
 ↓
COMPLETED
```

And failure:

```text
ASSIGNED
 ↓
ROBOT FAILURE
 ↓
LEASE EXPIRED
 ↓
REASSIGNED
```

Without this, "Tasks Delivered" doesn't demonstrate fleet intelligence.

---

# 12. Benchmark

This is one of the strongest features conceptually.

The page says the benchmark uses:

> "the exact same task workload, map, and seed under both modes." ([Harmony][1])

Excellent.

But:

### 🔴 C15 — Benchmark needs statistical credibility

One run isn't enough.

Add:

```text
Runs: 30

                HARMONI   BASELINE
Completion      94.2%      72.1%
Collisions       0          3
Deadlocks        2         18
Avg ticks       184        263
Replans          21         47
Messages        1,204      3,892
```

Then:

`Mean ± standard deviation`

That turns your benchmark from a demo feature into an actual engineering evaluation.

---

# 13. Metrics problem

The UI currently exposes:

* Tasks Delivered
* Collisions
* Deadlocks
* Dynamic Replans
* Move Efficiency
* Avg Delivery
* Messages
* Bytes estimate. ([Harmony][1])

### 🟠 C16 — Missing robotics metrics

I'd add:

**Fleet**

* throughput
* task completion rate
* average task latency
* robot utilization

**Coordination**

* conflict count
* conflict resolution time
* deadlock detection time
* deadlock recovery time

**Network**

* messages/second
* bytes/second
* communication overhead/robot
* packet-loss simulation

**Safety**

* near-collision count
* emergency stops
* minimum separation distance

These are much stronger SIH metrics.

---

# 14. UI/UX problems

### 🟠 C17 — Too much information without hierarchy

The page is essentially a **developer dashboard**.

There are many sections:

* status
* hierarchy
* validation
* scope
* HARMONI
* baseline
* controls
* metrics
* prediction
* graph
* safety
* events
* benchmark.

A jury has perhaps **30–90 seconds** to understand the prototype.

You need three levels:

### Level 1 — Demo

```text
START DEMO
3 AMRs
5 Tasks

[START]

Conflict detected
→ P2P coordination
→ Deadlock avoided
```

### Level 2 — Technical

Detailed telemetry.

### Level 3 — Engineering

Benchmark/debug controls.

---

# 15. Missing "Demo Mode"

### 🔴 C18 — This is probably your biggest presentation improvement

Add:

## `▶ RUN JURY DEMO`

Then automatically execute:

```text
1. Spawn 3 AMRs
2. Generate tasks
3. Start fleet
4. Create intersection conflict
5. Show P2P negotiation
6. Create deadlock
7. Detect cycle
8. Apply hierarchy
9. Resolve deadlock
10. Drop WMS
11. Continue local autonomy
12. Restore infrastructure
13. Complete tasks
14. Show benchmark
```

One button.

That would make HARMONI dramatically easier to demonstrate.

---

# 16. Missing event explanations

The page currently has:

`Coordination & Safety Event Feed`

but starts with:

`No events recorded yet. Click Start Sim to begin.` ([Harmony][1])

### 🔴 C19 — Events should explain WHY

Not:

```text
AMR-02 WAIT
```

but:

```text
AMR-02 → WAIT

Reason:
Predicted trajectory conflict

Conflict:
AMR-01

Decision authority:
P2P coordination

Safety:
CLEAR

Priority:
AMR-01 > AMR-02
```

This is extremely important for an SIH jury.

---

# 17. Missing state machine visualization

### 🔴 C20 — Add per-robot state machine

For each AMR:

```text
IDLE
 ↓
TASK_ASSIGNED
 ↓
PLANNING
 ↓
NEGOTIATING
 ↓
MOVING
 ↓
CONFLICT
 ↓
WAITING
 ↓
REROUTING
 ↓
MOVING
 ↓
DELIVERED
```

Then highlight current state.

This directly addresses your earlier **decision oscillation problem**.

---

# 18. Architecture credibility issue

The page explicitly states:

> ROS 2, Nav2, Zenoh routing, wireless handoff, and industrial safety certification remain hardware/runtime validation work. ([Harmony][1])

This is good disclosure.

But a jury could ask:

> "So what exactly have you implemented?"

You need a clear boundary:

### Implemented now

* decentralized coordination logic
* conflict detection
* reservation
* P2P abstraction
* task allocation
* deadlock recovery
* failure injection
* benchmark
* deterministic safety layer

### Hardware validation

* ROS2
* Nav2
* actual Wi-Fi
* actual sensors
* physical AMRs
* real-time constraints

This distinction should be visually obvious.

---

# Overall SIH Jury Assessment

Based **only on the currently exposed deployed interface**, I'd rate it approximately:

| Area                           |      Score |
| ------------------------------ | ---------: |
| Concept                        |   **9/10** |
| Architecture                   | **8.5/10** |
| Decentralization demonstration |   **7/10** |
| Failure handling               |   **7/10** |
| Visualization                  | **6.5/10** |
| User experience                |   **6/10** |
| Robotics credibility           |   **7/10** |
| Benchmarking                   |   **7/10** |
| Jury demonstration readiness   |   **6/10** |
| Production-readiness evidence  | **4.5/10** |

### Biggest weaknesses

**1. Empty initial state**
**2. No one-click complete demonstration**
**3. Hierarchy isn't visibly making decisions**
**4. Decision oscillation prevention isn't demonstrated**
**5. Deadlock resolution lacks causal visualization**
**6. P2P messages aren't sufficiently observable**
**7. Failure scenarios need stronger state transitions**
**8. Benchmark needs repeated statistical runs**
**9. Metrics don't yet prove the claimed advantages**
**10. UI feels like a developer/debug console rather than a polished robotics product**

### Biggest strengths

Your page already communicates several genuinely strong ideas:

* decentralized fleet coordination
* relevant-neighbor P2P rather than broadcast-everything
* local reservations
* wait-for-cycle deadlock recovery
* infrastructure/P2P failure injection
* deterministic safety authority
* prediction + conflict graph
* HARMONI vs Stop-and-Wait comparison
* explicit simulation-vs-real-hardware boundary. ([Harmony][1])

**If you're going to give this to Codex next, I would not tell it to simply "fix bugs."** The better approach is to give it a **QA + robotics acceptance-test specification** covering the 20 issues above, with hard invariants such as **"no robot may oscillate decisions indefinitely," "no collision may occur," "every task must have a recoverable lifecycle," and "every safety decision must have an observable reason."**

[1]: https://harmony-three-eosin.vercel.app/ "HARMONI — Decentralized AMR Fleet Simulation (SIH26123)"

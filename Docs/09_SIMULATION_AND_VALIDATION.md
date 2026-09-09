# Simulation and Validation

## Goal

Demonstrate that HARMONI addresses the actual SIH requirements under controlled, repeatable scenarios.

## Minimum simulation

At least 3 AMRs in a warehouse containing:
- aisles
- intersections
- pickup/drop points
- obstacles
- task queues

A scalable test should increase fleet size progressively.

## Scenarios

### 1. Overlapping paths
Multiple AMRs approach one conflict zone.

Measure collision-free operation and waiting time.

### 2. Blocked aisle
Introduce an obstacle.

Expected:
- detection
- relevant information sharing
- local rerouting
- continued task execution

### 3. Deadlock
Create a cyclic waiting condition.

Expected:
- cycle detection
- recovery
- resumed movement

### 4. Robot failure
Disable one robot.

Expected:
- stale state expiration
- task lease expiration
- task reassignment

### 5. Infrastructure failure
Remove the WMS/infrastructure communication path.

Expected:
- distributed/local operation remains possible according to the tested network model

### 6. Communication loss
Disable robot-to-robot communication.

Expected:
- local sensor safety remains active
- stale coordination data expires
- conservative behavior can be demonstrated

## Baseline

Compare against a simple stop-and-wait strategy under identical task maps, robot count and obstacle conditions.

## Do not fabricate results

All performance numbers must come from repeatable simulation runs.

## Suggested scaling experiments

3 → 10 → 25 → 50 → 100+ simulated AMRs where computationally practical.

The purpose is to study how:
- messages/robot
- CPU/robot
- coordination latency
- throughput
- collisions
- deadlocks

change with fleet size.

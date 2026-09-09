# SIH Demonstration Story

## Scene 1 — Normal operation

Show 3+ AMRs executing tasks.

Display:
- routes
- task ownership
- robot states
- communication relationships

## Scene 2 — Conflict

Send robots toward the same intersection.

Show:
- predicted conflict
- intent exchange
- reservation
- priority decision
- safe passage

## Scene 3 — Blocked aisle

Block an aisle.

Show:
- obstacle detection
- relevant update
- route change
- continued task execution

## Scene 4 — Deadlock

Create a deliberate cyclic wait.

Show:
- wait-for graph
- deadlock detection
- recovery
- resumed movement

## Scene 5 — Robot failure

Disable a robot.

Show:
- state expiration
- task lease expiration
- reassignment

## Scene 6 — Infrastructure failure

Disable the infrastructure/WMS connection.

Show:
- transition to distributed/local mode
- continued local operation

## Scene 7 — Scaling

Increase robot count.

Show:
- local communication relationships
- messages per robot
- CPU load
- throughput

The key message:

> HARMONI does not require every robot to continuously know about every other robot. It coordinates where decisions can actually interact.

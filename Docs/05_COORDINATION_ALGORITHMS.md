# Coordination and Planning Algorithms

## 1. Local path planning

Candidate:
- A* for grid-based global planning
- D* Lite when repeated replanning over changing maps is useful

The final choice should depend on simulation representation and performance.

## 2. Conflict prediction

Before coordinating, estimate whether two robots can occupy the same spatial resource at overlapping times.

Conceptually:

```text
Robot A trajectory
-------------------->

              X predicted conflict

             <--------------------
             Robot B trajectory
```

Distance alone is insufficient. Time and intended motion matter.

## 3. Space-time reservation

For intersections/choke points, represent a reservation as:

```text
resource = intersection_12
robot = R3
entry = t1
exit = t2
```

Other robots can wait, choose another time, or replan.

## 4. Deterministic conflict resolution

Avoid a fragile single token that can disappear with one robot.

A better direction is deterministic ranking/reservation where relevant robots can derive the same ordering from shared state.

Possible factors:
- safety
- ETA
- distance
- task urgency
- priority
- waiting time

The exact formula should be validated experimentally.

## 5. Deadlock detection

Represent waiting dependencies:

```text
R1 waits for R2
R2 waits for R3
R3 waits for R1
```

A cycle indicates a deadlock candidate.

Recovery may:
- cancel a reservation
- choose a recovery robot
- backtrack/retreat where physically possible
- replan

## 6. Task allocation

Candidate approaches:
- distributed auction
- contract-net style allocation
- local cost-based bidding
- task leases

A local/hierarchical auction reduces unnecessary bids from robots that cannot reasonably perform the task.

## 7. Safety

Planning/coordination must not replace local collision monitoring. Local sensor-based safety can override a planned reservation whenever an unexpected obstacle is detected.

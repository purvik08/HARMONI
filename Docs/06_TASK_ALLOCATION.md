# Distributed Task Allocation

## Objective

Assign pickup/delivery tasks without requiring every robot to send a bid to a central controller.

## Candidate cost

A robot can estimate:

```text
cost =
travel time
+ congestion cost
+ workload
+ battery penalty
+ task urgency penalty
```

The exact weighting must be calibrated in simulation.

## Local/hierarchical allocation

Instead of broadcasting every task to every robot:

```text
Task
 ↓
Relevant zone
 ↓
Eligible robots
 ↓
Local bids
 ↓
Winner
```

## Task lease

A winning robot receives a temporary lease.

```text
Task assigned
     ↓
Robot executes
     ↓
Heartbeat/lease renewed
     ↓
Robot failure
     ↓
Lease expires
     ↓
Task becomes available
     ↓
Another robot can claim it
```

This avoids permanent task ownership after a failure.

## Important limitation

Distributed task allocation is an established research area. HARMONI's contribution is its integration with relevance-driven communication, local conflict coordination and graceful degradation for this SIH scenario—not invention of distributed task allocation itself.

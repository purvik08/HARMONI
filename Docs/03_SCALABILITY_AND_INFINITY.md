# Scalability Strategy

## The "infinite robots" idea

The project should not claim literal infinite AMRs. Any physical system eventually faces limits in:
- radio spectrum
- compute
- floor space
- traffic density
- sensing
- task demand

The defensible claim is:

> HARMONI is designed so that communication and coordination are localized, aiming to keep per-robot overhead dependent mainly on relevant local interactions rather than total fleet size.

## Why all-to-all communication does not scale

If every robot exchanges information with every other robot, potential relationships grow approximately as O(N²).

HARMONI instead uses:
- spatial locality
- predicted trajectory conflict
- adaptive neighborhoods
- zone partitioning
- temporary conflict relationships
- message TTL/expiration

## Conflict graph

Each robot maintains a local graph of robots that may affect its current decision.

```text
       R2
      /       R1   R5
             R7
```

A robot far away with no overlapping future trajectory does not need continuous coordination traffic.

## Zone concept

A warehouse can be divided into logical areas.

```text
+---------+---------+---------+
| Zone A  | Zone B  | Zone C  |
| R1 R2   | R7 R8   | R15 R16 |
| R3 R4   | R9 R10  | R17 R18 |
+---------+---------+---------+
```

Robots primarily coordinate within their relevant zone and with adjacent zones during handoff.

## Adaptive communication

Communication relevance can change with traffic:
- low density → small neighborhood
- approaching intersection → stronger coordination
- predicted conflict → temporary direct exchange
- conflict resolved → relationship expires

## Metrics for scalability

Measure as fleet size increases:
- messages per robot
- bytes per robot
- CPU utilization per robot
- coordination latency
- collision rate
- deadlocks
- throughput
- task completion time

A good result would show that per-robot communication/processing grows much more slowly than an all-to-all baseline.

## Edge coordinators

Lightweight edge nodes may assist with local task allocation or aggregation, but they must not become mandatory central controllers.

If an edge coordinator fails, robots should retain local autonomy and continue operating or elect/activate another coordinator if the design requires one.

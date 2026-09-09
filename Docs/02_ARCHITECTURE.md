# HARMONI System Architecture

## High-level structure

```text
                    Optional WMS / Analytics
                            |
                    Infrastructure Network
                            |
        +-------------------+-------------------+
        |                   |                   |
      AMR 1               AMR 2               AMR 3
        |                   |                   |
   Local autonomy      Local autonomy      Local autonomy
        |                   |                   |
        +---------- Relevant P2P ------------+
                         |
                Distributed coordination
                         |
              Conflict / reservation logic
                         |
                  Local Nav2 execution
                         |
                 Sensor-based safety
```

## Layer 1 — Local autonomy

Every AMR independently performs:
- localization
- perception
- navigation
- local obstacle avoidance
- task execution
- safety monitoring

## Layer 2 — Relevant-neighbor coordination

Robots exchange compact state only when another robot can affect a decision.

Potential information:
- robot ID
- position
- velocity
- timestamp
- predicted path/ETA
- intersection/zone
- intent
- priority
- task state

## Layer 3 — Conflict management

A robot predicts whether trajectories or resource reservations may conflict. Relevant robots temporarily form a local conflict relationship.

## Layer 4 — Task allocation

Tasks are allocated among eligible robots using local/hierarchical decision making. A task lease can prevent a failed robot from owning a task forever.

## Layer 5 — Optional infrastructure

WMS/infrastructure can provide high-level tasks, analytics and synchronization, but the robot safety and local autonomy path should not require it.

## Failure hierarchy

```text
Infrastructure available
        ↓
Distributed P2P coordination
        ↓
Communication unavailable
        ↓
Local perception/autonomy
        ↓
High uncertainty
        ↓
Conservative safe behavior
```

## Critical safety principle

Communication improves coordination; it does not become the final collision-safety authority. Local sensors and deterministic safety logic remain authoritative.

# HARMONI — Project Documentation

**SIH 2026 PS: SIH26123 — Edge-AI Based Distributed Fleet Coordination for Autonomous Mobile Robots (AMRs) in Smart Warehouses**

HARMONI is an edge-first, communication-resilient architecture for decentralized coordination of AMRs in dynamic warehouses.

## Important scope

This documentation distinguishes:
- requirements explicitly present in SIH26123,
- proposed HARMONI design decisions,
- ideas that require hardware/driver validation,
- optional research/experimental features.

It does **not** claim that HARMONI is already implemented, industrially proven, or capable of literally infinite robots.

## Core principle

Each AMR retains local autonomy. Robots exchange only information relevant to decisions that can affect one another, reducing unnecessary communication and computation.

## Operating hierarchy

1. Infrastructure-connected operation
2. Local/P2P distributed coordination
3. Isolated local autonomy using onboard perception
4. Conservative safe behavior when uncertainty becomes too high

## Primary intended demonstration

A multi-AMR simulation with at least 3 robots demonstrating:
- decentralized state/intent exchange
- intersection conflict resolution
- collision avoidance
- blocked-aisle rerouting
- deadlock recovery
- task reassignment
- infrastructure/network failure
- comparison against stop-and-wait

See the other files for the architecture, algorithms, communication model, scalability concept, technology choices, simulation, metrics, limitations, and SIH mapping.

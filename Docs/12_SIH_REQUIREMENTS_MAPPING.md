# SIH26123 Requirement Mapping

| SIH requirement | HARMONI response |
|---|---|
| At least 3 AMRs | Multi-AMR simulation |
| Decentralized communication | Relevant-neighbor P2P model |
| Share localization | Compact robot state |
| Share intent | ETA/trajectory/intersection intent |
| Dynamic conflict resolution | Conflict prediction + reservation |
| Deadlock handling | Wait-for cycle detection + recovery |
| Collision avoidance | Local sensor safety + coordination |
| Task allocation | Distributed/local auction concept |
| Re-routing | Dynamic obstacle/blocked-zone updates |
| Edge hardware | Local robot autonomy |
| Peer-to-peer stack | Zenoh + validated local networking |
| Fleet dashboard | Real-time visualization |
| Zero collisions | Validation target |
| ≥20% faster than stop-and-wait | Benchmark target |

## Important distinction

The SIH statement requires a multi-robot simulation and the listed capabilities. Some HARMONI extensions—such as very large fleet scaling, optical signaling, adaptive communication graphs and optional edge coordinators—are proposed enhancements, not explicit SIH requirements.

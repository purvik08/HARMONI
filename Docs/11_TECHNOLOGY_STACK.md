# Technology Stack

## Core

| Layer | Candidate technology | Purpose |
|---|---|---|
| OS | Ubuntu Linux | Edge/simulation environment |
| Robotics | ROS 2 | Robot software framework |
| Navigation | Nav2 | Local/global navigation |
| Middleware | Eclipse Zenoh / rmw_zenoh | Distributed data transport |
| Simulation | Gazebo or equivalent ROS 2 simulator | AMR simulation |
| Planning | A*/D* Lite | Route planning candidates |
| Coordination | Custom ROS 2 nodes | Conflict/reservation logic |
| Safety | LiDAR/camera + deterministic monitor | Collision safety |
| Edge AI | ONNX Runtime / lightweight model | Optional prediction |
| Dashboard | Web frontend | Fleet visualization |

## Technology selection rule

No technology is mandatory merely because it appears in this document. The final implementation should choose versions and components that are compatible with the selected ROS 2 distribution and hardware.

## Zenoh note

Zenoh is a viable ROS 2 communication option, but its actual discovery/routing topology must be configured and tested. It does not automatically provide every property of a wireless MANET.

## Vercel note

A browser/Vercel demonstration is suitable for visualization and simulation, but Vercel should not be represented as the actual AMR Edge runtime. Real ROS 2/Nav2 and physical robot networking require an appropriate Linux/robot runtime.

The web demo can emulate network state and robot coordination for demonstration.

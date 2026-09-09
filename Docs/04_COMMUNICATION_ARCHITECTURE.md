# Communication Architecture

## Technologies

ROS 2 provides the robotics software framework. Eclipse Zenoh is a candidate communication/middleware layer for efficient distributed data movement.

Zenoh can be integrated with ROS 2, but network topology and routing behavior still need explicit design and validation.

## Modes

### Infrastructure mode

Robots use the warehouse network for WMS/high-level communication and relevant robot coordination.

### Local distributed mode

When infrastructure connectivity is unavailable, robots may use available local Wi-Fi capabilities for robot-to-robot communication.

The exact mechanism could be Wi-Fi Direct/P2P, AP-based networking, ad-hoc networking, or another supported mode depending on hardware, Linux driver and network-manager capabilities.

This is a hardware-dependent area and must be validated on the chosen Edge device.

### Isolated mode

If no usable radio path exists, robots cannot exchange digital messages. They fall back to local perception and autonomous safety behavior.

## Message principle

Do not stream full sensor data or complete maps between every robot.

Prefer compact events/state such as:

```text
robot_id
timestamp
position
velocity
ETA
intent
intersection_id
priority
task_id
state
```

For blocked areas:

```text
zone
status
source
timestamp
TTL
version
```

## Freshness

Distributed state should include timestamps and expiration/TTL. Stale state must not be treated as current truth.

## Zenoh caution

Zenoh is a transport/middleware technology; it does not by itself solve:
- robot conflict policy
- task allocation
- trajectory prediction
- Wi-Fi mode switching
- physical MANET formation
- safety

Those are HARMONI/application/network-management responsibilities.

## No-server principle

No central server should be required for safety or immediate local collision avoidance. A WMS may remain useful for business-level tasks and analytics.

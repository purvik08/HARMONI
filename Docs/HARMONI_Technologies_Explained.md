# HARMONI — Technologies Used
### SIH26123: Edge-AI Based Distributed Fleet Coordination for AMRs

> **Goal:** Coordinate multiple Autonomous Mobile Robots (AMRs) in a warehouse without depending on a central server. HARMONI is designed to keep robots productive and safe during network problems by moving from infrastructure networking to local robot-to-robot coordination and, if necessary, fully local autonomy.

---

## 1. ROS 2

**What it is:** ROS 2 (Robot Operating System 2) is the main software framework connecting all robot components.

**How we use it:**
- Runs robot software as independent nodes.
- Connects sensors, navigation, coordination and task modules.
- Provides topics, services and actions for communication.
- Supports distributed multi-robot systems.

**Simple idea:** ROS 2 is the **software nervous system** of each AMR.

---

## 2. Nav2

**What it is:** Navigation2 is the ROS 2 navigation stack for autonomous mobile robots.

**How we use it:**
- Global path planning.
- Local motion control.
- Obstacle avoidance.
- Costmap management.
- Recovery behaviors.
- Goal execution.

**Simple idea:** Nav2 decides **how a robot gets from A to B safely**.

---

## 3. Eclipse Zenoh

**What it is:** Zenoh is a lightweight data and communication framework designed for distributed and edge systems.

**How we use it:**
- Robot-to-robot communication.
- Sharing compact position and intent information.
- Distributed data exchange.
- Communication across changing network topologies.

**Simple idea:** Zenoh is the **communication layer between robots**.

---

## 4. ROS 2 + Zenoh (rmw_zenoh)

**What it is:** `rmw_zenoh` connects ROS 2 communication with Zenoh.

**How we use it:**
- Allows ROS 2 nodes to communicate using Zenoh.
- Supports distributed communication without designing a completely separate messaging system.

**Simple idea:** It lets the **ROS 2 brain use Zenoh as its communication path**.

---

## 5. Wi-Fi Infrastructure Mode

**What it is:** Normal Wi-Fi where robots connect to the warehouse access point/router.

**How we use it:**
- Normal communication with WMS.
- Fleet monitoring.
- Data synchronization.
- External services when available.

**Simple idea:** This is the **normal highway** for communication.

---

## 6. Wi-Fi P2P / Direct / Ad-hoc Networking

**What it is:** Wireless communication that can connect robots more directly without depending on the normal warehouse router.

**How we use it:**
- Failover communication when infrastructure Wi-Fi is unavailable.
- Local robot-to-robot coordination.

**Important:** Exact P2P/AP/mesh capabilities depend on the Wi-Fi chipset and Linux driver. The implementation must be validated on the actual hardware.

**Simple idea:** Robots create a **local communication network when the main network disappears**.

---

## 7. NetworkManager / Linux Wireless Tools

**What they are:** Linux networking utilities for controlling and monitoring wireless interfaces.

**How we use them:**
- Detect network state.
- Connect/disconnect Wi-Fi.
- Manage interfaces.
- Trigger network failover and recovery.

**Simple idea:** These tools help the system **switch between network states automatically**.

---

## 8. Software-Defined Network Failover

**What it is:** A software mechanism that detects infrastructure failure and changes the robot's communication strategy.

**HARMONI flow:**

```text
Infrastructure Wi-Fi
        ↓ failure
Local P2P communication
        ↓ communication loss
Independent local autonomy
        ↓ uncertainty
Safe mode
```

**Simple idea:** The robot does not simply stop because one network fails; it **degrades gracefully**.

---

## 9. Multi-Agent Path Finding (MAPF)

**What it is:** Path planning where several robots must move through the same environment without colliding.

**How we use it:**
- Coordinate overlapping routes.
- Reduce unnecessary waiting.
- Resolve conflicts between robots.
- Improve fleet throughput.

**Simple idea:** Normal path planning asks **“Where should I go?”**  
MAPF asks **“Where should all robots go without interfering with each other?”**

---

## 10. A* Path Planning

**What it is:** A graph-search algorithm for finding a low-cost path between two points.

**How we use it:**
- Baseline/global route planning.
- Grid or warehouse-map navigation.
- Replanning around blocked areas.

**Simple idea:** A* finds a **good route from start to destination**.

---

## 11. D* Lite / Dynamic Replanning

**What it is:** A path-planning approach designed to efficiently update paths when the environment changes.

**How we use it:**
- Blocked aisle handling.
- Dynamic warehouse changes.
- Replanning without rebuilding everything from scratch.

**Simple idea:** When the warehouse changes, D* Lite helps the robot **change its route intelligently**.

---

## 12. Costmaps

**What they are:** Grid representations of how difficult or dangerous different areas are for a robot to traverse.

**How we use them:**
- Represent obstacles.
- Mark blocked aisles.
- Increase cost around dangerous areas.
- Feed updated environmental information into Nav2.

**Simple idea:** A costmap tells the robot **which areas are safe, risky or blocked**.

---

## 13. Distributed Obstacle Sharing

**What it is:** Robots share important environmental events instead of sending complete sensor streams or maps.

**Example:**

```text
Robot 1 detects blocked aisle
        ↓
Creates compact obstacle/event update
        ↓
Shares with nearby robots
        ↓
Robot 2 updates its local planning information
        ↓
Robot 2 chooses another route
```

**Why:** Much less communication data than continuously streaming LiDAR or camera data.

---

## 14. Intent Sharing

**What it is:** Robots communicate what they are planning to do rather than sharing all raw sensor data.

Example information:

```text
Robot ID
Current position
Velocity
Current goal
Target/intersection
ETA
Priority
Task state
```

**Simple idea:** Robots tell each other **“I am going here”**, not **“here is everything my sensor sees.”**

---

## 15. Intersection / Choke-Point Coordination

**What it is:** A distributed mechanism for deciding which robot gets access to a narrow shared area.

**Example:**

```text
R1 → Intersection ← R2
          ↓
   conflict detected
          ↓
 deterministic priority
          ↓
       R1 goes
          ↓
       R2 waits
```

**Goal:** Prevent collisions and reduce inefficient stop-and-wait behavior.

---

## 16. Distributed Token / Reservation Concept

**What it is:** Robots logically reserve shared resources such as intersections or narrow corridors.

**How we use it:**
- One robot gets temporary access.
- Other robots wait or select alternatives.
- Reservation is released after the robot passes.

**Simple idea:** An intersection behaves like a **shared resource that robots take turns using intelligently**.

---

## 17. Deadlock Detection

**What it is:** Detecting situations where robots are waiting for one another and none can proceed.

Example:

```text
R1 waits for R2
R2 waits for R3
R3 waits for R1
       ↓
    DEADLOCK
```

**How we use it:**
- Build a logical wait-for relationship.
- Detect cycles.
- Select a robot to yield, reverse or re-route.

**Simple idea:** Detect **“everyone is waiting for everyone else.”**

---

## 18. Dynamic Task Allocation

**What it is:** Assigning warehouse jobs to robots according to their current situation.

Tasks can include:

- Pickup
- Transport
- Delivery
- Repositioning

**Simple idea:** Instead of permanently assigning work, HARMONI can **adapt assignments when conditions change**.

---

## 19. Distributed Auction / Bidding

**What it is:** A task-allocation method where robots evaluate tasks and compete for them using locally calculated costs.

Possible cost factors:

- Distance
- Estimated travel time
- Battery level
- Current workload
- Congestion
- Route risk

**Simple idea:** Robots effectively say **“I can complete this task at this cost.”**

---

## 20. Task Lease

**What it is:** A temporary ownership mechanism for a task.

Example:

```text
R1 receives task
     ↓
R1 becomes unavailable
     ↓
Lease expires
     ↓
Task becomes available
     ↓
Another robot takes it
```

**Why:** Prevents tasks from becoming permanently stuck when a robot fails.

---

## 21. Local Perception

**What it is:** Each AMR processes its own sensors locally.

Typical sensors:

- LiDAR
- Camera
- IMU
- Wheel odometry

**Why:** Safety should not depend entirely on network communication.

**Simple idea:** Every robot should be able to **see and protect itself independently**.

---

## 22. LiDAR

**What it is:** A distance sensor that measures the surrounding environment using laser pulses.

**How we use it:**
- Obstacle detection.
- Local mapping.
- Dynamic obstacle detection.
- Collision avoidance.

**Simple idea:** LiDAR gives the robot a **3D/2D distance view of its surroundings**.

---

## 23. Camera / Computer Vision

**What it is:** Visual perception using onboard cameras.

**Potential uses:**
- Detect robots and obstacles.
- Recognize warehouse objects.
- Visual localization.
- Optional optical communication experiments.

**Simple idea:** The camera provides **visual understanding** of the environment.

---

## 24. Edge Computing

**What it is:** Processing data directly on the robot instead of sending everything to a remote/cloud server.

**How we use it:**
- Navigation.
- Coordination.
- Perception.
- AI inference.
- Decision making.

**Simple idea:** The robot **thinks locally**.

---

## 25. Edge AI

**What it is:** Running machine-learning models directly on the robot's onboard computer.

**Where AI is useful in HARMONI:**
- Congestion prediction.
- ETA prediction.
- Collision-risk prediction.
- Route-cost prediction.

**Important:** Safety-critical collision avoidance remains primarily sensor- and rule-based rather than depending on an AI model.

**Simple idea:** AI predicts **what may happen next**, while deterministic robotics handles **what must be done safely now**.

---

## 26. ONNX Runtime

**What it is:** An open-source runtime for executing machine-learning models.

**How we use it:**
- Run optimized AI models locally.
- Avoid sending inference data to the cloud.
- Support Edge AI deployment.

**Simple idea:** ONNX Runtime is the **engine that runs lightweight AI models on the robot**.

---

## 27. ROS 2 Lifecycle Nodes

**What they are:** ROS 2 nodes with controlled states such as inactive, active and shutdown.

**How we use them:**
- Safely start/stop navigation components.
- Manage network transitions.
- Control system recovery.

**Simple idea:** Components can be **started, paused and recovered in a controlled way**.

---

## 28. QoS (Quality of Service)

**What it is:** ROS 2 communication settings that control how messages are delivered.

Important concepts:

- Reliability
- Durability
- History
- Message depth

**How we use it:**
- High-priority safety/coordination messages can use appropriate reliability.
- Frequent sensor/state data can use lightweight settings.

**Simple idea:** QoS determines **how important each message is and how it should be delivered**.

---

## 29. Heartbeat / Health Monitoring

**What it is:** Periodic messages used to determine whether a robot or service is alive.

**How we use it:**
- Detect robot failures.
- Detect communication failures.
- Detect stale robot state.
- Trigger recovery mechanisms.

**Simple idea:** Robots periodically say **“I am alive.”**

---

## 30. State Synchronization

**What it is:** Keeping important distributed information consistent between robots.

Example:

```text
Robot state
Task state
Reservation state
Obstacle state
Network state
```

**Challenge:** Information can become old when communication is unreliable.

**HARMONI principle:** Attach timestamps/validity information and avoid blindly trusting stale data.

---

## 31. Warehouse Digital Environment

The simulation should model:

- Shelves
- Aisles
- Intersections
- Choke points
- Pickup/drop locations
- Dynamic obstacles
- Multiple AMRs

This allows controlled testing of HARMONI before physical deployment.

---

## 32. Gazebo

**What it is:** An open-source robotics simulator.

**How we use it:**
- Simulate AMRs.
- Simulate LiDAR/cameras.
- Create warehouse layouts.
- Test collisions.
- Test network-failure scenarios.

**Simple idea:** Gazebo is the **virtual warehouse laboratory**.

---

## 33. ROS-Gazebo Bridge

**What it is:** Software that connects Gazebo simulation data with ROS 2.

**How we use it:**

```text
Gazebo sensors
      ↓
ROS 2
      ↓
Nav2 / HARMONI
```

**Simple idea:** It connects the **virtual robots to the ROS 2 software stack**.

---

## 34. Dashboard

**What it is:** A lightweight UI for observing the fleet.

Show:

- Robot positions
- Current tasks
- Battery
- Network state
- Current route
- Robot status
- Blocked zones
- Active conflicts

**Important:** The dashboard is for monitoring, not a central dependency for robot safety or coordination.

---

# 35. HARMONI Communication Resilience

The complete concept is:

```text
          NORMAL
     Infrastructure Wi-Fi
              ↓
       Central services
              ↓
       Network failure
              ↓
      P2P robot network
              ↓
      Distributed control
              ↓
   Communication unavailable
              ↓
    Local sensor autonomy
              ↓
        Safe operation
```

The key idea is **graceful degradation** rather than simply stopping the fleet when the network fails.

---

# 36. Overall Software Architecture

```text
┌───────────────────────────────────────────┐
│              Warehouse / WMS              │
└────────────────────┬──────────────────────┘
                     │
              Infrastructure Wi-Fi
                     │
        ┌────────────┴────────────┐
        │       HARMONI Fleet     │
        │      Communication      │
        └────────────┬────────────┘
                     │
            Zenoh / ROS 2
                     │
       ┌─────────────┼─────────────┐
       │             │             │
      AMR 1         AMR 2         AMR 3
       │             │             │
   ┌───┴───┐     ┌───┴───┐     ┌───┴───┐
   │ Nav2  │     │ Nav2  │     │ Nav2  │
   │ MAPF  │     │ MAPF  │     │ MAPF  │
   │ Tasks │     │ Tasks │     │ Tasks │
   │ AI    │     │ AI    │     │ AI    │
   │ LiDAR │     │ LiDAR │     │ LiDAR │
   │ Camera│     │ Camera│     │ Camera│
   └───────┘     └───────┘     └───────┘
```

---

# 37. Technology Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| Robot OS/Framework | ROS 2 | Robot software framework |
| Navigation | Nav2 | Autonomous navigation |
| Communication | Eclipse Zenoh | Distributed messaging |
| ROS middleware | rmw_zenoh | ROS 2 ↔ Zenoh |
| Planning | A* / dynamic planning | Route generation |
| Multi-robot planning | MAPF concepts | Fleet-level conflict handling |
| Traffic control | Reservations / priority | Intersection coordination |
| Deadlock handling | Wait-for graph | Detect deadlocks |
| Task allocation | Distributed auction | Dynamic assignment |
| Perception | LiDAR + Camera | Local environment understanding |
| Edge compute | Raspberry Pi / Jetson class | Local processing |
| Edge AI | ONNX Runtime | Local ML inference |
| Simulation | Gazebo | Virtual warehouse |
| Network control | NetworkManager / Linux Wireless | Connectivity management |
| Monitoring | Fleet Dashboard | Visualization |
| Reliability | Heartbeats / state validity | Failure detection |

---

# 38. What Is Actually Innovative in HARMONI?

The individual technologies above are mostly established technologies.

The innovation is their **system-level combination**:

> **A communication-resilient, edge-first AMR coordination architecture that progressively transitions from infrastructure-assisted operation to decentralized robot-to-robot coordination and finally to local autonomous safety when connectivity degrades.**

The project should therefore avoid claiming that ROS 2, Zenoh, A*, Nav2 or Edge AI are individually novel.

The proposed innovation is the **resilient coordination architecture and its algorithms for maintaining fleet productivity during connectivity failures**.

---

# 39. Recommended Priority for the SIH Prototype

### MUST HAVE
- 3+ simulated AMRs
- ROS 2
- Nav2
- Warehouse Gazebo environment
- Robot-to-robot communication
- Infrastructure failure simulation
- Distributed intent sharing
- Intersection conflict resolution
- Deadlock handling
- Dynamic rerouting
- Dynamic task reassignment
- Fleet dashboard
- Collision-free demonstration
- ≥20% improvement benchmark

### SHOULD HAVE
- Zenoh-based communication
- Distributed task auction
- Task leases
- Obstacle-event sharing
- Network recovery
- Stale-state handling
- Edge AI for ETA/congestion prediction

### BONUS
- Wi-Fi P2P failover on real hardware
- Camera-based optical communication experiment
- Physical AMR demonstration
- Advanced congestion prediction
- Hardware-in-the-loop testing

---

# 40. Important Engineering Rule

Do not make the system dependent on a single experimental technology.

For example:

**LED optical communication should NOT be required for safety.**

**AI should NOT be required for basic collision avoidance.**

**The dashboard should NOT be required for robot operation.**

**The central WMS should NOT be required for safe local operation.**

This makes the architecture much more robust and easier to demonstrate.

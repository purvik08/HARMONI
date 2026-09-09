# Limitations, Assumptions and Non-Claims

## Hardware/network limitations

Wi-Fi P2P, AP/STA concurrency, ad-hoc mode, multi-interface operation and roaming/handoff depend on the actual Wi-Fi chipset, Linux driver, kernel and network management stack.

These capabilities must be validated on the chosen hardware.

## Simulation limitations

A simulated wireless network is not proof of physical RF performance.

A browser simulation is not equivalent to a real ROS 2/Nav2 robot runtime.

## Scalability limitation

"Scalable" means the architecture attempts to avoid all-to-all coordination and keep local workload tied to relevant interactions. It does not mean unlimited physical robots.

## Safety limitation

A simulation achieving zero collisions does not prove industrial safety certification.

Real deployment requires:
- hardware safety systems
- validated sensor behavior
- emergency-stop mechanisms
- formal testing
- operational safeguards
- regulatory/industrial validation

## Novelty limitation

Decentralized task allocation, multi-agent planning, local communication and distributed robot coordination are established research areas.

The defensible contribution is the proposed integration and engineering of:
- relevance-driven communication
- conflict-aware local coordination
- task allocation
- graceful degradation
- Edge-first operation
- scalability-oriented communication control

## Performance limitation

The 20% improvement is a success criterion to demonstrate experimentally, not a guaranteed result.

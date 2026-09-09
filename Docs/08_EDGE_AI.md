# Edge AI Strategy

## Principle

Use AI only where prediction provides value. Do not add AI to components that require deterministic safety guarantees.

## Suitable AI applications

### ETA prediction
Predict travel time using:
- route length
- congestion
- historical travel time
- robot state

### Congestion prediction
Predict future traffic around busy intersections/zones.

### Route cost prediction
Estimate realistic cost of candidate routes.

### Risk scoring
Estimate future conflict likelihood, while keeping final collision prevention deterministic.

## Suitable runtime

A lightweight inference runtime such as ONNX Runtime can be considered for portable Edge inference.

## AI boundary

```text
AI prediction
     ↓
optimization/planning
     ↓
coordination
     ↓
deterministic safety
     ↓
actuation
```

AI failure must not directly cause an unsafe command.

## Edge hardware

Raspberry Pi-class hardware is appropriate for lightweight coordination and inference. Jetson-class hardware is useful when heavier perception or neural inference is required.

The actual model size and sensor workload must be benchmarked rather than assumed.

# Metrics and Success Criteria

## Required SIH metrics

### Collision count
Target: 0 inter-robot collisions.

### Task completion time
Total time required to finish the defined task set.

### Performance improvement

```text
Improvement =
(Baseline time - HARMONI time)
/
Baseline time × 100
```

Target: at least 20% improvement versus stop-and-wait for the defined overlapping-path scenario.

## Additional metrics

- throughput: completed tasks per unit time
- average waiting time
- deadlock count
- replanning count
- replanning latency
- task reassignment time
- communication messages per robot
- communication bytes per robot
- CPU/memory utilization
- network recovery time

## Scalability metric

The key HARMONI scalability question:

> Does per-robot coordination overhead remain relatively bounded as total fleet size increases?

Compare HARMONI against an all-to-all communication baseline.

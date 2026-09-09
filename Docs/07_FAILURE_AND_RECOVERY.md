# Failure and Recovery Model

## Failure classes

### A. WMS failure

WMS unavailable but robot-to-robot communication works.

Expected behavior:
- local tasks continue where possible
- safety remains local
- state can be synchronized later

### B. Infrastructure Wi-Fi failure

Warehouse network unavailable.

Expected behavior:
- attempt a validated local robot communication mode
- continue distributed coordination if available

### C. Robot-to-robot radio failure

No usable digital communication.

Expected behavior:
- each robot continues with local perception and safety
- stale remote information expires
- conservative behavior may be activated

### D. Robot failure

Robot disappears.

Expected behavior:
- remove stale robot state
- release its reservations when safely inferred
- expire its task lease
- allow eligible robots to reallocate the task

## Connectivity state machine

```text
CONNECTED
   ↓
DEGRADED
   ↓
DISTRIBUTED
   ↓
ISOLATED
   ↓
SAFE
```

Recovery reverses the path after connectivity is verified stable.

## Connectivity detection

Do not rely only on a fixed number of pings.

Possible signals:
- gateway reachability
- WMS heartbeat
- packet loss
- latency
- association state
- freshness of coordination messages

## Network handoff caution

Switching a physical Wi-Fi interface between modes can depend on chipset/driver/OS support and may temporarily interrupt connectivity. This must be treated as an engineering dependency, not a guaranteed capability.

## Optical LED communication

An optional camera/LED signaling concept can provide experimental low-bandwidth intent communication.

It should never be the primary safety mechanism because it depends on:
- line of sight
- lighting
- camera exposure
- motion blur
- occlusion
- reliable decoding

Local perception remains authoritative.

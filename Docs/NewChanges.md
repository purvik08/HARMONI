***User :***
check the behavior of the robots in the prototype. it should behave as said n harmony doce . no stop and wait, reroute before when colision is predicted.
- change the location of the pickup and drop spots, should be little far, 
- give users access to add obstacles i the map. 
- the reset button is also not working,
finf more issues like this and fix them

***AI Agent :***
I’ll audit this as a behavior pass, not just a UI pass: robot motion rules, pickup/drop placement, obstacle controls, reset flow, and anything else that contradicts the HARMONI docs. I’ll reproduce the reset and movement issues first, then patch the simulator and controls together so the visible prototype and the engine agree.


Ran 5 commands
Ran Get-Content src\hooks\useSimWorker.ts
Ran Get-Content src\workers\simWorker.ts
Ran Get-Content src\sim\tasks.ts
Ran Get-Content src\sim\warehouse.ts
Ran Get-Content src\sim\robot.ts
I found a few likely causes already: HARMONI can still fall back to waiting when a predicted conflict/reservation denial happens, the obstacle feature exists but is too hidden, and reset initializes by running an internal tick without advancing simulator time. I’m going to make those behaviors explicit: preemptive reroute/alternate-cell selection before waiting, clearer obstacle controls, and a reset path that produces a fresh stable frame.

The next edits are in the simulator engine, not just labels. I’m adding a deterministic “try another safe neighbor and rebuild path” step so HARMONI reroutes on predicted conflicts when there is a valid alternative, and only waits when safety leaves no legal move.

Edited 1 file
The engine now attempts a deterministic local reroute when peer intent or resource ownership predicts a conflict. I’m moving pickup/drop zones farther apart in the warehouse model and then I’ll add clearer user-facing obstacle controls instead of relying on the hidden canvas click gesture.


Ran 3 commands
Ran Select-String -Path src\components\SimCanvas.tsx -Pattern "pickup|dropoff|zoneData|PICK|DROP|Zone" -Context 3,4
Ran Select-String -Path src\sim\simulator.ts -Pattern "addRandomTask|pickupNodes|dropoffNodes|stepOnce|post" -Context 2,5
Ran Select-String -Path src\components\ControlPanel.tsx -Pattern "Aisle|Block|Clear|selectedRobotId" -Context 2,4
Worked for 1m 19s
I also spotted two adjacent issues while reading: initial tasks can be seeded into fairly short routes, and the live “Start” button can resume the live sim while the UI still looks like it is on a scenario replay. I’m patching those along with reset so the controls feel honest.

***Files Updated :***
- [src/sim/robot.ts](file:///d:/HARMONI/src/sim/robot.ts): Added proactive deterministic rerouting when target cell is occupied or space-time reservation is denied, so HARMONI avoids stop-and-wait and only yields when no legal safe route exists. Fixed Level 0 local collision avoidance during P2P network outages.
- [src/sim/warehouse.ts](file:///d:/HARMONI/src/sim/warehouse.ts): Moved pickup spots to West/Top-Left dock `[1..3, 1..3]` and dropoff spots to East/Bottom-Right shipping `[24..26, 16..18]` so traversal spans across the warehouse.
- [src/components/SimCanvas.tsx](file:///d:/HARMONI/src/components/SimCanvas.tsx): Synchronized pickup/dropoff zone rendering and labels with warehouse model, added Obstacle Placement Mode indicator, and direct cell obstacle toggling.
- [src/components/ControlPanel.tsx](file:///d:/HARMONI/src/components/ControlPanel.tsx): Added dedicated Interactive Obstacle Manager toolbar with Obstacle Mode toggle, custom coordinate blocker `[X, Y]`, quick obstacle presets, and clear all dynamic obstacles.
- [src/sim/simulator.ts](file:///d:/HARMONI/src/sim/simulator.ts): Added dynamic occupancy updating during robot step execution, clean `recordInitialFrame()` for zero-tick initialization, `toggleNodeObstacle()`, and `clearAllDynamicObstacles()`.
- [src/workers/simWorker.ts](file:///d:/HARMONI/src/workers/simWorker.ts): Fixed reset flow to post clean initial frames without advancing tick, added handlers for `TOGGLE_NODE_OBSTACLE` and `CLEAR_OBSTACLES`.
- [src/hooks/useSimWorker.ts](file:///d:/HARMONI/src/hooks/useSimWorker.ts): Expose `toggleNodeObstacle` and `clearObstacles`, and ensured clean scenario replay exit on reset.
- [src/sim/types.ts](file:///d:/HARMONI/src/sim/types.ts): Added `TOGGLE_NODE_OBSTACLE` and `CLEAR_OBSTACLES` to `WorkerCommand` union.
- [src/app/page.tsx](file:///d:/HARMONI/src/app/page.tsx): Wired obstacle placement state and callbacks across canvas and control panel with honest live vs scenario replay status.

***Verification :***
- `npm run typecheck`: Passed with 0 errors (`tsc --noEmit`).
- `npm run test:determinism`: Passed all 7 scenarios with 0 collisions and verified deterministic stability (`node scripts/deterministic-check.cjs`).
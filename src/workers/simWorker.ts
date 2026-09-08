/**
 * Web Worker for running the HARMONI simulation continuously
 * off the main UI thread.
 */

import { Simulator } from '../sim/simulator';
import { runBenchmark } from '../sim/benchmark';
import { ALL_SCENARIOS } from '../sim/scenarios';
import type { WorkerCommand, WorkerMessage, SimInitConfig, BenchmarkConfig } from '../sim/types';

let sim: Simulator | null = null;
let timerId: ReturnType<typeof setInterval> | null = null;
let tickIntervalMs = 750; // decreased speed for clear observation (1.33 ticks/sec)
let isRunning = false;
let continuousMode = true;

function initSim(cfg: SimInitConfig) {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  isRunning = false;

  sim = new Simulator({
    mode: cfg.mode,
    width: cfg.width,
    height: cfg.height,
    nRobots: cfg.n_robots,
    seed: cfg.seed,
    scenarioName: 'live_continuous',
  });
  sim.seedTasks(cfg.n_tasks, cfg.seed);

  // Send initial frame (tick 0)
  postCurrentFrame();
}

function postCurrentFrame() {
  if (!sim) return;
  // If there are recorded frames, send latest; otherwise record frame 0
  if (sim.frames.length === 0) {
    sim._tickOnce();
  }
  const frame = sim.frames[sim.frames.length - 1];
  const msg: WorkerMessage = {
    type: 'FRAME',
    payload: frame,
    metrics: sim.getCurrentMetrics(),
  };
  self.postMessage(msg);
}

function doTick() {
  if (!sim || !isRunning) return;

  // In continuous mode, keep seeding tasks if pending tasks get low
  if (continuousMode && sim.tasks.pendingTasks().length < 4) {
    if (sim.bus.infraOnline) {
      sim.addRandomTask();
    }
  }

  const frame = sim.stepOnce();
  const msg: WorkerMessage = {
    type: 'FRAME',
    payload: frame,
    metrics: sim.getCurrentMetrics(),
  };
  self.postMessage(msg);
}

function startSim() {
  if (isRunning) return;
  if (!sim) {
    initSim({
      mode: 'harmoni',
      width: 22,
      height: 16,
      n_robots: 5,
      seed: 42,
      n_tasks: 16,
    });
  }
  isRunning = true;
  timerId = setInterval(doTick, tickIntervalMs);
}

function pauseSim() {
  isRunning = false;
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function setSpeed(multiplier: number) {
  // 1x = 750ms per tick. 0.5x = 1500ms. 0.25x = 3000ms. 2x = 375ms.
  const base = 750;
  tickIntervalMs = Math.max(50, Math.round(base / Math.max(0.1, multiplier)));
  if (isRunning && timerId !== null) {
    clearInterval(timerId);
    timerId = setInterval(doTick, tickIntervalMs);
  }
}

self.onmessage = (e: MessageEvent<WorkerCommand>) => {
  const cmd = e.data;

  try {
    switch (cmd.type) {
      case 'START':
        startSim();
        break;

      case 'PAUSE':
        pauseSim();
        break;

      case 'RESET':
        continuousMode = true;
        initSim(cmd.payload);
        break;

      case 'SET_SPEED':
        setSpeed(cmd.payload);
        break;

      case 'SET_MODE':
        if (sim) {
          sim.mode = cmd.payload;
          (sim.res as { mode: 'harmoni' | 'baseline' }).mode = cmd.payload;
        }
        break;

      case 'SPAWN_ROBOT':
        if (sim) {
          sim.spawnRobot();
          postCurrentFrame();
        }
        break;

      case 'REMOVE_ROBOT':
        if (sim) {
          sim.removeRobot(cmd.payload);
          postCurrentFrame();
        }
        break;

      case 'BLOCK_AISLE':
        if (sim) {
          sim.blockAisle(cmd.payload.a, cmd.payload.b);
          postCurrentFrame();
        }
        break;

      case 'UNBLOCK_AISLE':
        if (sim) {
          sim.unblockAisle(cmd.payload.a, cmd.payload.b);
          postCurrentFrame();
        }
        break;

      case 'DISABLE_ROBOT':
        if (sim) {
          const r = sim.robots.get(cmd.payload);
          if (r) {
            r.fail(sim.tick);
            postCurrentFrame();
          }
        }
        break;

      case 'RECOVER_ROBOT':
        if (sim) {
          const r = sim.robots.get(cmd.payload);
          if (r) {
            r.recover(sim.tick);
            postCurrentFrame();
          }
        }
        break;

      case 'TRIGGER_DEADLOCK':
        if (sim) {
          sim.triggerDeadlock();
          postCurrentFrame();
        }
        break;

      case 'TRIGGER_INFRA_FAILURE':
        if (sim) {
          sim.bus.setInfra(false);
          sim.logEvents.push({ tick: sim.tick, type: 'infra_status', online: false });
          postCurrentFrame();
        }
        break;

      case 'RESTORE_INFRA':
        if (sim) {
          sim.bus.setInfra(true);
          sim.logEvents.push({ tick: sim.tick, type: 'infra_status', online: true });
          postCurrentFrame();
        }
        break;

      case 'TRIGGER_P2P_FAILURE':
        if (sim) {
          sim.bus.setP2p(false);
          postCurrentFrame();
        }
        break;

      case 'RESTORE_P2P':
        if (sim) {
          sim.bus.setP2p(true);
          postCurrentFrame();
        }
        break;

      case 'ADD_TASK':
        if (sim) {
          if (cmd.payload?.pickup && cmd.payload?.dropoff) {
            sim.addTaskAt(cmd.payload.pickup, cmd.payload.dropoff);
          } else {
            sim.addRandomTask();
          }
          postCurrentFrame();
        }
        break;

      case 'RUN_SCENARIO':
        pauseSim();
        continuousMode = false;
        const scenarioFn = ALL_SCENARIOS[cmd.payload];
        if (scenarioFn) {
          const log = scenarioFn('harmoni');
          const msg: WorkerMessage = { type: 'SCENARIO_DONE', payload: log };
          self.postMessage(msg);
        }
        break;

      case 'RUN_BENCHMARK':
        pauseSim();
        const bCfg: BenchmarkConfig = cmd.payload;
        const result = runBenchmark(bCfg.n_robots, bCfg.n_tasks, bCfg.max_ticks, bCfg.seed);
        const bMsg: WorkerMessage = { type: 'BENCHMARK_RESULT', payload: result };
        self.postMessage(bMsg);
        break;

      default:
        break;
    }
  } catch (err: unknown) {
    const errorMsg: WorkerMessage = {
      type: 'ERROR',
      payload: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(errorMsg);
  }
};

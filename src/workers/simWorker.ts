/**
 * Web Worker for running parallel HARMONI and Baseline simulations
 * continuously off the main UI thread.
 */

import { Simulator } from '../sim/simulator';
import { runBenchmark } from '../sim/benchmark';
import { ALL_SCENARIOS } from '../sim/scenarios';
import type {
  WorkerCommand,
  WorkerMessage,
  SimInitConfig,
  BenchmarkConfig,
  ParallelSimFrame,
  ParallelSimMetrics,
  ParallelSimLog,
} from '../sim/types';

let simHarmoni: Simulator | null = null;
let simBaseline: Simulator | null = null;
let timerId: ReturnType<typeof setInterval> | null = null;
let tickIntervalMs = 750; // default speed (1.33 ticks/sec)
let isRunning = false;
let continuousMode = true;

function initSim(cfg: SimInitConfig) {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  isRunning = false;

  const w = cfg.width || 28;
  const h = cfg.height || 20;
  const nRobots = cfg.n_robots || 5;
  const seed = cfg.seed || 42;
  const nTasks = cfg.n_tasks || 16;

  simHarmoni = new Simulator({
    mode: 'harmoni',
    width: w,
    height: h,
    nRobots,
    seed,
    scenarioName: 'live_continuous',
  });
  simHarmoni.seedTasks(nTasks, seed);

  simBaseline = new Simulator({
    mode: 'baseline',
    width: w,
    height: h,
    nRobots,
    seed,
    scenarioName: 'live_continuous',
  });
  simBaseline.seedTasks(nTasks, seed);

  postCurrentFrames();
}

function postCurrentFrames() {
  if (!simHarmoni || !simBaseline) return;

  if (simHarmoni.frames.length === 0) {
    simHarmoni.recordInitialFrame();
  }
  if (simBaseline.frames.length === 0) {
    simBaseline.recordInitialFrame();
  }

  const hFrame = simHarmoni.frames[simHarmoni.frames.length - 1];
  const bFrame = simBaseline.frames[simBaseline.frames.length - 1];
  const hMetrics = simHarmoni.getCurrentMetrics();
  const bMetrics = simBaseline.getCurrentMetrics();

  const parallelPayload: ParallelSimFrame = {
    harmoni: hFrame,
    baseline: bFrame,
  };
  const parallelMetrics: ParallelSimMetrics = {
    harmoni: hMetrics,
    baseline: bMetrics,
  };

  const msg: WorkerMessage = {
    type: 'PARALLEL_FRAME',
    payload: parallelPayload,
    metrics: parallelMetrics,
  };
  self.postMessage(msg);
}

function doTick() {
  if (!simHarmoni || !simBaseline || !isRunning) return;

  const hFrame = simHarmoni.stepOnce();
  const bFrame = simBaseline.stepOnce();
  const hMetrics = simHarmoni.getCurrentMetrics();
  const bMetrics = simBaseline.getCurrentMetrics();

  const msg: WorkerMessage = {
    type: 'PARALLEL_FRAME',
    payload: {
      harmoni: hFrame,
      baseline: bFrame,
    },
    metrics: {
      harmoni: hMetrics,
      baseline: bMetrics,
    },
  };
  self.postMessage(msg);
}

function startSim() {
  if (isRunning) return;
  if (!simHarmoni || !simBaseline) {
    initSim({
      mode: 'harmoni',
      width: 28,
      height: 20,
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
        // Both run in parallel, mode change can affect focused view or default
        break;

      case 'SPAWN_ROBOT':
        if (simHarmoni && simBaseline) {
          simHarmoni.spawnRobot();
          simBaseline.spawnRobot();
          postCurrentFrames();
        }
        break;

      case 'REMOVE_ROBOT':
        if (simHarmoni && simBaseline) {
          simHarmoni.removeRobot(cmd.payload);
          simBaseline.removeRobot(cmd.payload);
          postCurrentFrames();
        }
        break;

      case 'BLOCK_AISLE':
        if (simHarmoni && simBaseline) {
          simHarmoni.blockAisle(cmd.payload.a, cmd.payload.b);
          simBaseline.blockAisle(cmd.payload.a, cmd.payload.b);
          postCurrentFrames();
        }
        break;

      case 'UNBLOCK_AISLE':
        if (simHarmoni && simBaseline) {
          simHarmoni.unblockAisle(cmd.payload.a, cmd.payload.b);
          simBaseline.unblockAisle(cmd.payload.a, cmd.payload.b);
          postCurrentFrames();
        }
        break;

      case 'TOGGLE_NODE_OBSTACLE':
        if (simHarmoni && simBaseline) {
          simHarmoni.toggleNodeObstacle(cmd.payload);
          simBaseline.toggleNodeObstacle(cmd.payload);
          postCurrentFrames();
        }
        break;

      case 'CLEAR_OBSTACLES':
        if (simHarmoni && simBaseline) {
          simHarmoni.clearAllDynamicObstacles();
          simBaseline.clearAllDynamicObstacles();
          postCurrentFrames();
        }
        break;

      case 'DISABLE_ROBOT':
        if (simHarmoni && simBaseline) {
          simHarmoni.robots.get(cmd.payload)?.fail(simHarmoni.tick);
          simBaseline.robots.get(cmd.payload)?.fail(simBaseline.tick);
          postCurrentFrames();
        }
        break;

      case 'RECOVER_ROBOT':
        if (simHarmoni && simBaseline) {
          simHarmoni.robots.get(cmd.payload)?.recover(simHarmoni.tick);
          simBaseline.robots.get(cmd.payload)?.recover(simBaseline.tick);
          postCurrentFrames();
        }
        break;

      case 'TRIGGER_DEADLOCK':
        if (simHarmoni && simBaseline) {
          simHarmoni.triggerDeadlock();
          simBaseline.triggerDeadlock();
          postCurrentFrames();
        }
        break;

      case 'TRIGGER_INFRA_FAILURE':
        if (simHarmoni && simBaseline) {
          simHarmoni.bus.setInfra(false);
          simHarmoni.logEvents.push({ tick: simHarmoni.tick, type: 'infra_status', online: false });
          simBaseline.bus.setInfra(false);
          simBaseline.logEvents.push({ tick: simBaseline.tick, type: 'infra_status', online: false });
          postCurrentFrames();
        }
        break;

      case 'RESTORE_INFRA':
        if (simHarmoni && simBaseline) {
          simHarmoni.bus.setInfra(true);
          simHarmoni.logEvents.push({ tick: simHarmoni.tick, type: 'infra_status', online: true });
          simBaseline.bus.setInfra(true);
          simBaseline.logEvents.push({ tick: simBaseline.tick, type: 'infra_status', online: true });
          postCurrentFrames();
        }
        break;

      case 'TRIGGER_P2P_FAILURE':
        if (simHarmoni && simBaseline) {
          simHarmoni.bus.setP2p(false);
          simBaseline.bus.setP2p(false);
          postCurrentFrames();
        }
        break;

      case 'RESTORE_P2P':
        if (simHarmoni && simBaseline) {
          simHarmoni.bus.setP2p(true);
          simBaseline.bus.setP2p(true);
          postCurrentFrames();
        }
        break;

      case 'ADD_TASK':
        if (simHarmoni && simBaseline) {
          if (cmd.payload?.pickup && cmd.payload?.dropoff) {
            simHarmoni.addTaskAt(cmd.payload.pickup, cmd.payload.dropoff);
            simBaseline.addTaskAt(cmd.payload.pickup, cmd.payload.dropoff);
          } else {
            simHarmoni.addRandomTask();
            simBaseline.addRandomTask();
          }
          postCurrentFrames();
        }
        break;

      case 'RUN_SCENARIO':
        pauseSim();
        continuousMode = false;
        const scenarioFn = ALL_SCENARIOS[cmd.payload];
        if (scenarioFn) {
          const logHarmoni = scenarioFn('harmoni');
          const logBaseline = scenarioFn('baseline');
          const parallelLogs: ParallelSimLog = {
            harmoni: logHarmoni,
            baseline: logBaseline,
          };
          const msg: WorkerMessage = {
            type: 'SCENARIO_DONE',
            payload: logHarmoni,
            parallel: parallelLogs,
          };
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

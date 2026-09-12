'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  SimFrame,
  SimMetrics,
  BenchmarkResult,
  SimLog,
  WorkerCommand,
  WorkerMessage,
  SimInitConfig,
  BenchmarkConfig,
  Pos,
} from '../sim/types';

export function useSimWorker() {
  const workerRef = useRef<Worker | null>(null);

  // Parallel frames and metrics
  const [frameHarmoni, setFrameHarmoni] = useState<SimFrame | null>(null);
  const [frameBaseline, setFrameBaseline] = useState<SimFrame | null>(null);
  const [metricsHarmoni, setMetricsHarmoni] = useState<SimMetrics | null>(null);
  const [metricsBaseline, setMetricsBaseline] = useState<SimMetrics | null>(null);

  // Benchmark & Scenarios
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [scenarioLogHarmoni, setScenarioLogHarmoni] = useState<SimLog | null>(null);
  const [scenarioLogBaseline, setScenarioLogBaseline] = useState<SimLog | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const [mode, setModeState] = useState<'harmoni' | 'baseline'>('harmoni');
  const [activeScenario, setActiveScenario] = useState<string>('continuous');
  const [replayTick, setReplayTick] = useState<number>(0);
  const [isReplaying, setIsReplaying] = useState(false);

  // Initialize Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const worker = new Worker(new URL('../workers/simWorker.ts', import.meta.url));
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      if (msg.type === 'PARALLEL_FRAME') {
        setFrameHarmoni(msg.payload.harmoni);
        setFrameBaseline(msg.payload.baseline);
        setMetricsHarmoni(msg.metrics.harmoni);
        setMetricsBaseline(msg.metrics.baseline);
      } else if (msg.type === 'FRAME') {
        setFrameHarmoni(msg.payload);
        setMetricsHarmoni(msg.metrics);
        if (msg.parallel) {
          setFrameBaseline(msg.parallel.baseline);
          if (msg.parallelMetrics) setMetricsBaseline(msg.parallelMetrics.baseline);
        }
      } else if (msg.type === 'BENCHMARK_RESULT') {
        setBenchmarkResult(msg.payload);
        setIsBenchmarking(false);
      } else if (msg.type === 'SCENARIO_DONE') {
        setScenarioLogHarmoni(msg.payload);
        if (msg.parallel) {
          setScenarioLogBaseline(msg.parallel.baseline);
        }
        if (msg.payload.frames.length > 0) {
          setFrameHarmoni(msg.payload.frames[0]);
          if (msg.parallel && msg.parallel.baseline.frames.length > 0) {
            setFrameBaseline(msg.parallel.baseline.frames[0]);
          }
          setReplayTick(0);
          setIsReplaying(true);
        }
      } else if (msg.type === 'ERROR') {
        console.error('SimWorker error:', msg.payload);
        setIsBenchmarking(false);
      }
    };

    // Initialize with 28x20 grid, 5 robots
    const initialConfig: SimInitConfig = {
      mode: 'harmoni',
      width: 28,
      height: 20,
      n_robots: 5,
      seed: 42,
      n_tasks: 16,
    };
    worker.postMessage({ type: 'RESET', payload: initialConfig } as WorkerCommand);

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const send = useCallback((cmd: WorkerCommand) => {
    workerRef.current?.postMessage(cmd);
  }, []);

  const start = useCallback(() => {
    setIsRunning(true);
    setIsReplaying(false);
    send({ type: 'START' });
  }, [send]);

  const pause = useCallback(() => {
    setIsRunning(false);
    send({ type: 'PAUSE' });
  }, [send]);

  const reset = useCallback(
    (cfg?: Partial<SimInitConfig>) => {
      setIsRunning(false);
      setIsReplaying(false);
      setScenarioLogHarmoni(null);
      setScenarioLogBaseline(null);
      setActiveScenario('continuous');
      const fullCfg: SimInitConfig = {
        mode: mode,
        width: 28,
        height: 20,
        n_robots: 5,
        seed: 42,
        n_tasks: 16,
        ...cfg,
      };
      send({ type: 'RESET', payload: fullCfg });
    },
    [send, mode]
  );

  const setSpeed = useCallback(
    (val: number) => {
      setSpeedState(val);
      send({ type: 'SET_SPEED', payload: val });
    },
    [send]
  );

  const setMode = useCallback(
    (newMode: 'harmoni' | 'baseline') => {
      setModeState(newMode);
      send({ type: 'SET_MODE', payload: newMode });
    },
    [send]
  );

  const spawnRobot = useCallback(() => {
    send({ type: 'SPAWN_ROBOT' });
  }, [send]);

  const removeRobot = useCallback(
    (id: number) => {
      send({ type: 'REMOVE_ROBOT', payload: id });
    },
    [send]
  );

  const blockAisle = useCallback(
    (a: Pos, b: Pos) => {
      send({ type: 'BLOCK_AISLE', payload: { a, b } });
    },
    [send]
  );

  const unblockAisle = useCallback(
    (a: Pos, b: Pos) => {
      send({ type: 'UNBLOCK_AISLE', payload: { a, b } });
    },
    [send]
  );

  const toggleNodeObstacle = useCallback(
    (pos: Pos) => {
      send({ type: 'TOGGLE_NODE_OBSTACLE', payload: pos });
    },
    [send]
  );

  const clearObstacles = useCallback(() => {
    send({ type: 'CLEAR_OBSTACLES' });
  }, [send]);

  const disableRobot = useCallback(
    (id: number) => {
      send({ type: 'DISABLE_ROBOT', payload: id });
    },
    [send]
  );

  const recoverRobot = useCallback(
    (id: number) => {
      send({ type: 'RECOVER_ROBOT', payload: id });
    },
    [send]
  );

  const triggerDeadlock = useCallback(() => {
    send({ type: 'TRIGGER_DEADLOCK' });
  }, [send]);

  const triggerInfraFailure = useCallback(() => {
    send({ type: 'TRIGGER_INFRA_FAILURE' });
  }, [send]);

  const restoreInfra = useCallback(() => {
    send({ type: 'RESTORE_INFRA' });
  }, [send]);

  const triggerP2pFailure = useCallback(() => {
    send({ type: 'TRIGGER_P2P_FAILURE' });
  }, [send]);

  const restoreP2p = useCallback(() => {
    send({ type: 'RESTORE_P2P' });
  }, [send]);

  const addTask = useCallback(
    (pickup?: Pos, dropoff?: Pos) => {
      send({ type: 'ADD_TASK', payload: pickup && dropoff ? { pickup, dropoff } : undefined });
    },
    [send]
  );

  const runScenario = useCallback(
    (name: string) => {
      setIsRunning(false);
      setActiveScenario(name);
      send({ type: 'RUN_SCENARIO', payload: name });
    },
    [send]
  );

  const runBenchmarkTest = useCallback(
    (cfg?: Partial<BenchmarkConfig>) => {
      setIsBenchmarking(true);
      const bCfg: BenchmarkConfig = {
        n_robots: 6,
        n_tasks: 24,
        max_ticks: 400,
        seed: 3,
        ...cfg,
      };
      send({ type: 'RUN_BENCHMARK', payload: bCfg });
    },
    [send]
  );

  // Replay control for scenario mode
  const setReplayIndex = useCallback(
    (index: number) => {
      if (scenarioLogHarmoni && scenarioLogHarmoni.frames[index]) {
        setFrameHarmoni(scenarioLogHarmoni.frames[index]);
      }
      if (scenarioLogBaseline && scenarioLogBaseline.frames[index]) {
        setFrameBaseline(scenarioLogBaseline.frames[index]);
      }
      setReplayTick(index);
    },
    [scenarioLogHarmoni, scenarioLogBaseline]
  );

  return {
    // Parallel states
    frameHarmoni,
    frameBaseline,
    metricsHarmoni,
    metricsBaseline,
    scenarioLogHarmoni,
    scenarioLogBaseline,

    // Aliases for backwards compatibility
    frame: frameHarmoni,
    metrics: metricsHarmoni,
    scenarioLog: scenarioLogHarmoni,

    benchmarkResult,
    isBenchmarking,
    isRunning,
    speed,
    mode,
    activeScenario,
    isReplaying,
    replayTick,

    // Actions
    start,
    pause,
    reset,
    setSpeed,
    setMode,
    spawnRobot,
    removeRobot,
    blockAisle,
    unblockAisle,
    toggleNodeObstacle,
    clearObstacles,
    disableRobot,
    recoverRobot,
    triggerDeadlock,
    triggerInfraFailure,
    restoreInfra,
    triggerP2pFailure,
    restoreP2p,
    addTask,
    runScenario,
    runBenchmarkTest,
    setReplayIndex,
  };
}

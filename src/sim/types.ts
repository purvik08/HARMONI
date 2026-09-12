/**
 * Shared types for the HARMONI simulation engine.
 * These mirror the Python data structures exactly so port is 1:1.
 */

export type Pos = [number, number];
export type Edge = [Pos, Pos];

/** Warehouse grid configuration */
export interface WarehouseConfig {
  width: number;
  height: number;
}

export type OpticalSignal = 'normal_green' | 'intent_cyan' | 'conflict_amber' | 'failed_red';
export type RobotLifecycleState =
  | 'idle'
  | 'planning'
  | 'requesting'
  | 'granted'
  | 'committed'
  | 'crossing'
  | 'moving'
  | 'waiting'
  | 'blocked'
  | 'failed';

/** A single robot state snapshot (per frame) */
export interface RobotState {
  id: number;
  pos: Pos;
  path: Pos[];
  state: RobotLifecycleState;
  task_id: number | null;
  battery: number;
  active: boolean;
  waiting_on: number | null;
  /** Heading in radians, computed from last move direction */
  heading?: number;
  /** v2: number of P2P broadcasts this robot has made */
  comm_events?: number;
  /** Estimated bytes sent over P2P/infra */
  comm_bytes?: number;
  /** Warehouse spatial zone */
  zone?: 'A' | 'B' | 'C';
  /** Optical status LED indicator */
  optical_signal?: OpticalSignal;
  decision?: string;
  hierarchy_level?: string;
  requested_resource?: string | null;
  owned_resource?: string | null;
  resource_phase?: string;
  reason?: string;
  committed_until?: number | null;
  decision_locked?: boolean;
  priority_key?: string;
}

/** A single simulation event */
export interface SimEvent {
  tick: number;
  type:
    | 'task_assigned'
    | 'task_completed'
    | 'task_reassign_pending'
    | 'intersection_conflict'
    | 'deadlock_detected'
    | 'yield_request'
    | 'robot_failed'
    | 'robot_recovered'
    | 'collision_averted'
    | 'infra_status'
    | 'scenario_event'
    | 'lease_expired';
  // optional extra fields depending on type
  task_id?: number;
  holder?: number;
  robot_id?: number;
  node?: Pos;
  yielding_robot?: number;
  priority_robot?: number;
  cycle?: number[];
  recovery_robot?: number;
  resolved?: boolean;
  escape_node?: Pos | null;
  blocked_robot?: number;
  parked_robot?: number;
  yield_node?: Pos;
  online?: boolean;
  label?: string;
  robots?: number[];
  previous_holder?: number;
  bid?: number;
  resource_id?: string;
}

export interface P2PMessageTrace {
  id: string;
  tick: number;
  from: number;
  to: number | 'BROADCAST';
  type: 'INTENT' | 'RESERVATION_REQ' | 'RESERVATION_GRANT' | 'ACK_YIELD' | 'DEADLOCK_PROBE' | 'OBSTACLE_ALERT';
  ttl: number;
  payload: string;
  zone?: 'A' | 'B' | 'C';
}

export interface DeadlockCycleDetail {
  tick: number;
  cycle: number[];
  recovery_robot: number;
  priority_score: string;
  escape_node: Pos | null;
  resolved: boolean;
  latency_ticks: number;
}

export interface ConflictMetrics {
  potential_conflicts_detected: number;
  conflicts_arbitrated_p2p: number;
  safety_stops_executed: number;
  actual_collisions: number;
}

import type { ConflictEdge } from './conflictGraph';

/** One tick's complete snapshot */
export interface SimFrame {
  tick: number;
  infra_online: boolean;
  p2p_online: boolean;
  robots: RobotState[];
  blocked_edges: Pos[][];
  events_this_tick: SimEvent[];
  /** space-time reservations: node -> robot_id (for visualization) */
  reservations?: Array<{ node: Pos; robot_id: number }>;
  /** tasks currently in the pool */
  tasks?: TaskSnapshot[];
  /** Dynamic trajectory conflict edges active this tick */
  conflict_edges?: ConflictEdge[];
  /** Edge AI zone congestion levels */
  congestion?: { zoneA: number; zoneB: number; zoneC: number };
  /** Live P2P message trace stream for this frame */
  p2p_messages?: P2PMessageTrace[];
  /** Active deadlock cycle information if one was detected/resolved */
  active_deadlock?: DeadlockCycleDetail | null;
  /** Conflict safety and arbitration counters */
  conflict_metrics?: ConflictMetrics;
}

export interface TaskSnapshot {
  task_id: number;
  pickup: Pos;
  dropoff: Pos;
  status: 'pending' | 'assigned' | 'completed';
  holder: number | null;
}

/** Aggregated simulation metrics */
export interface SimMetrics {
  collisions: number;
  deadlocks_detected: number;
  deadlocks_resolved: number;
  total_wait_ticks: number;
  total_move_ticks: number;
  replans: number;
  tasks_completed: number;
  task_completion_times: number[];
  potential_conflicts_detected?: number;
  conflicts_arbitrated_p2p?: number;
  safety_stops_executed?: number;
}

/** Full simulation log (matches Python export_log) */
export interface SimLog {
  scenario: string;
  mode: 'harmoni' | 'baseline';
  warehouse: {
    width: number;
    height: number;
    intersections: Pos[];
  };
  n_robots: number;
  frames: SimFrame[];
  events: SimEvent[];
  metrics: {
    collisions: number;
    deadlocks_detected: number;
    deadlocks_resolved: number;
    total_wait_ticks: number;
    total_move_ticks: number;
    replans: number;
    tasks_completed: number;
    avg_task_completion_ticks: number | null;
    final_tick: number;
    comm_events?: number; // v2
    comm_events_per_task?: number | null; // v2
    deadlock_resolution_ticks?: number | null; // v2
  };
}

/** Benchmark result for one mode */
export interface BenchmarkModeResult {
  tasks_completed: number;
  tasks_target: number;
  total_ticks_to_complete: number;
  throughput_tasks_per_tick: number;
  avg_wait_ticks_per_robot: number;
  total_wait_ticks: number;
  collisions: number;
  deadlocks_detected: number;
  deadlocks_resolved: number;
  replans: number;
  avg_task_completion_ticks: number | null;
  comm_messages?: number;
}

export interface BenchmarkComparison {
  completion_time_reduction_pct?: number;
  avg_wait_reduction_pct?: number;
  collisions_baseline: number;
  collisions_harmoni: number;
  throughput_gain_pct?: number;
}

export interface BenchmarkResult {
  config: { n_robots: number; n_tasks: number; seed: number; max_ticks: number };
  baseline: BenchmarkModeResult;
  harmoni: BenchmarkModeResult;
  comparison: BenchmarkComparison;
}

export interface StatisticalMetric {
  mean: number;
  stdDev: number;
  min: number;
  max: number;
}

export interface MonteCarloBenchmarkResult {
  config: { n_robots: number; n_tasks: number; max_ticks: number; n_runs: number };
  runs: BenchmarkResult[];
  summary: {
    harmoni: {
      throughput: StatisticalMetric;
      completion_ticks: StatisticalMetric;
      avg_wait_ticks: StatisticalMetric;
      total_wait_ticks: StatisticalMetric;
      collisions: StatisticalMetric;
      replans: StatisticalMetric;
      deadlocks_resolved: StatisticalMetric;
    };
    baseline: {
      throughput: StatisticalMetric;
      completion_ticks: StatisticalMetric;
      avg_wait_ticks: StatisticalMetric;
      total_wait_ticks: StatisticalMetric;
      collisions: StatisticalMetric;
      replans: StatisticalMetric;
      deadlocks_resolved: StatisticalMetric;
    };
    improvement: {
      throughput_gain_pct: number;
      wait_reduction_pct: number;
      replan_reduction_pct: number;
      collision_reduction_pct: number;
    };
  };
}

// ---- Worker message types ----

export type WorkerCommand =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET'; payload: SimInitConfig }
  | { type: 'SET_SPEED'; payload: number }
  | { type: 'SET_MODE'; payload: 'harmoni' | 'baseline' }
  | { type: 'SPAWN_ROBOT' }
  | { type: 'REMOVE_ROBOT'; payload: number }
  | { type: 'BLOCK_AISLE'; payload: { a: Pos; b: Pos } }
  | { type: 'UNBLOCK_AISLE'; payload: { a: Pos; b: Pos } }
  | { type: 'TOGGLE_NODE_OBSTACLE'; payload: Pos }
  | { type: 'CLEAR_OBSTACLES' }
  | { type: 'DISABLE_ROBOT'; payload: number }
  | { type: 'RECOVER_ROBOT'; payload: number }
  | { type: 'TRIGGER_DEADLOCK' }
  | { type: 'TRIGGER_INFRA_FAILURE' }
  | { type: 'RESTORE_INFRA' }
  | { type: 'TRIGGER_P2P_FAILURE' }
  | { type: 'RESTORE_P2P' }
  | { type: 'ADD_TASK'; payload?: { pickup?: Pos; dropoff?: Pos } }
  | { type: 'RUN_BENCHMARK'; payload: BenchmarkConfig }
  | { type: 'RUN_MONTE_CARLO'; payload: { n_robots: number; n_tasks: number; max_ticks: number; n_runs: number } }
  | { type: 'RUN_SCENARIO'; payload: string };

export interface SimInitConfig {
  mode: 'harmoni' | 'baseline';
  width: number;
  height: number;
  n_robots: number;
  seed: number;
  n_tasks: number;
}

export interface BenchmarkConfig {
  n_robots: number;
  n_tasks: number;
  max_ticks: number;
  seed: number;
}

export interface ParallelSimFrame {
  harmoni: SimFrame;
  baseline: SimFrame;
}

export interface ParallelSimMetrics {
  harmoni: SimMetrics;
  baseline: SimMetrics;
}

export interface ParallelSimLog {
  harmoni: SimLog;
  baseline: SimLog;
}

export type WorkerMessage =
  | { type: 'FRAME'; payload: SimFrame; metrics: SimMetrics; parallel?: ParallelSimFrame; parallelMetrics?: ParallelSimMetrics }
  | { type: 'PARALLEL_FRAME'; payload: ParallelSimFrame; metrics: ParallelSimMetrics }
  | { type: 'BENCHMARK_RESULT'; payload: BenchmarkResult }
  | { type: 'MONTE_CARLO_RESULT'; payload: MonteCarloBenchmarkResult }
  | { type: 'SCENARIO_DONE'; payload: SimLog; parallel?: ParallelSimLog }
  | { type: 'BENCHMARK_PROGRESS'; payload: { mode: string; pct: number } }
  | { type: 'ERROR'; payload: string };

/** Network operating mode label */
export type NetworkMode = 'full' | 'p2p_only' | 'isolated' | 'safe';

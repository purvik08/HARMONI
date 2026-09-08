/**
 * Distributed deadlock detection via wait-for graph.
 *
 * Each robot that is blocked (denied a reservation) publishes an edge
 * "I am waiting on robot X". Any robot can locally run cycle detection
 * over the union of these edges — this models gossip-propagated wait-for
 * information rather than a central deadlock manager.
 *
 * Direct port of deadlock.py — identical logic.
 */

/**
 * waitFor: robot_id -> robot_id it is waiting on.
 * Returns the cycle (array of robot_ids) if one exists, else null.
 */
export function detectCycle(waitFor: Map<number, number>): number[] | null {
  for (const start of waitFor.keys()) {
    const visited: number[] = [];
    const seen = new Set<number>();
    let current: number | undefined = start;

    while (current !== undefined && waitFor.has(current)) {
      if (seen.has(current)) {
        // found the cycle segment starting at its first repeat
        const idx = visited.indexOf(current);
        return [...visited.slice(idx), current];
      }
      seen.add(current);
      visited.push(current);
      current = waitFor.get(current);
    }
  }
  return null;
}

/**
 * Deterministic: the lowest-priority robot in the cycle (highest id)
 * backs off, since it would have lost any pairwise priority contest anyway.
 */
export function chooseRecoveryRobot(cycle: number[]): number {
  return Math.max(...cycle);
}

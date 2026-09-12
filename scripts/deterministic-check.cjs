const path = require('path');
const ts = require('typescript');

require.extensions['.ts'] = function loadTs(module, filename) {
  const source = require('fs').readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      strict: true,
    },
    fileName: filename,
  }).outputText;
  module._compile(output, filename);
};

const { Simulator } = require(path.join(__dirname, '..', 'src', 'sim', 'simulator.ts'));
const { Warehouse } = require(path.join(__dirname, '..', 'src', 'sim', 'warehouse.ts'));

function assignDirect(sim, robotId, start, goal) {
  const robot = sim.robots.get(robotId);
  robot.pos = start;
  const task = sim.tasks.addTask(start, goal, sim.tick);
  robot.assignTask(task, sim.tick);
  return robot;
}

function runScenario(name, setup, ticks = 60) {
  const sim = new Simulator({ mode: 'harmoni', width: 7, height: 7, nRobots: 0, seed: 7, scenarioName: name });
  setup(sim);
  for (let i = 0; i < ticks; i++) sim.stepOnce();
  return sim.exportLog();
}

function decisionSignature(log) {
  return log.frames.map(frame => ({
    tick: frame.tick,
    robots: frame.robots.map(r => ({
      id: r.id,
      pos: r.pos,
      state: r.state,
      decision: r.decision,
      level: r.hierarchy_level,
      req: r.requested_resource,
      own: r.owned_resource,
      phase: r.resource_phase,
      wait: r.waiting_on,
    })),
  }));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertStable(log, name) {
  assert(log.metrics.collisions === 0, `${name}: collision detected`);
  for (const robotId of new Set(log.frames.flatMap(frame => frame.robots.map(r => r.id)))) {
    const decisions = log.frames
      .map(frame => frame.robots.find(r => r.id === robotId))
      .filter(Boolean)
      .map(r => r.decision)
      .filter(d => d === 'WAIT' || d === 'YIELD' || d === 'REROUTE');
    let flips = 0;
    for (let i = 1; i < decisions.length; i++) {
      if (decisions[i] !== decisions[i - 1]) flips++;
    }
    assert(flips <= 6, `${name}: AMR #${robotId} oscillated through ${flips} conflict-state flips`);
  }
}

const scenarios = [
  ['two_robots_one_intersection', sim => {
    sim.robots.set(0, new (require(path.join(__dirname, '..', 'src', 'sim', 'robot.ts')).Robot)(0, [0, 3], sim.wh, sim.bus, sim.res, sim.logEvents, 'harmoni'));
    sim.robots.set(1, new (require(path.join(__dirname, '..', 'src', 'sim', 'robot.ts')).Robot)(1, [3, 0], sim.wh, sim.bus, sim.res, sim.logEvents, 'harmoni'));
    assignDirect(sim, 0, [0, 3], [6, 3]);
    assignDirect(sim, 1, [3, 0], [3, 6]);
  }, 50],
  ['three_robots_choke_point', sim => {
    sim.wh = Warehouse.fromAdjacency({
      '0,1': [[1,1]], '1,1': [[0,1], [2,1]], '2,1': [[1,1], [3,1], [2,0], [2,2]],
      '3,1': [[2,1], [4,1]], '4,1': [[3,1]], '2,0': [[2,1]], '2,2': [[2,1]],
    });
    const { Robot } = require(path.join(__dirname, '..', 'src', 'sim', 'robot.ts'));
    [0, 1, 2].forEach(id => sim.robots.set(id, new Robot(id, [0, 1], sim.wh, sim.bus, sim.res, sim.logEvents, 'harmoni')));
    assignDirect(sim, 0, [0, 1], [4, 1]);
    assignDirect(sim, 1, [4, 1], [0, 1]);
    assignDirect(sim, 2, [2, 0], [2, 2]);
  }, 50],
  ['opposite_directions', sim => {
    const { Robot } = require(path.join(__dirname, '..', 'src', 'sim', 'robot.ts'));
    sim.robots.set(0, new Robot(0, [1, 3], sim.wh, sim.bus, sim.res, sim.logEvents, 'harmoni'));
    sim.robots.set(1, new Robot(1, [5, 3], sim.wh, sim.bus, sim.res, sim.logEvents, 'harmoni'));
    assignDirect(sim, 0, [1, 3], [5, 3]);
    assignDirect(sim, 1, [5, 3], [1, 3]);
  }, 45],
  ['blocked_route_reroute', sim => {
    const { Robot } = require(path.join(__dirname, '..', 'src', 'sim', 'robot.ts'));
    sim.robots.set(0, new Robot(0, [0, 3], sim.wh, sim.bus, sim.res, sim.logEvents, 'harmoni'));
    assignDirect(sim, 0, [0, 3], [6, 3]);
    sim.schedule(2, () => sim.blockAisle([2, 3], [3, 3]), 'block_route');
  }, 45],
  ['urgent_vs_normal', sim => {
    const { Robot } = require(path.join(__dirname, '..', 'src', 'sim', 'robot.ts'));
    sim.robots.set(0, new Robot(0, [0, 3], sim.wh, sim.bus, sim.res, sim.logEvents, 'harmoni'));
    sim.robots.set(1, new Robot(1, [3, 0], sim.wh, sim.bus, sim.res, sim.logEvents, 'harmoni'));
    const r0 = assignDirect(sim, 0, [0, 3], [6, 3]);
    const r1 = assignDirect(sim, 1, [3, 0], [3, 6]);
    r0.taskUrgency = 1;
    r1.taskUrgency = 100;
  }, 45],
  ['simultaneous_conflicts', sim => {
    const { Robot } = require(path.join(__dirname, '..', 'src', 'sim', 'robot.ts'));
    [[0, [0, 3], [6, 3]], [1, [6, 3], [0, 3]], [2, [3, 0], [3, 6]], [3, [3, 6], [3, 0]]].forEach(([id, start, goal]) => {
      sim.robots.set(id, new Robot(id, start, sim.wh, sim.bus, sim.res, sim.logEvents, 'harmoni'));
      assignDirect(sim, id, start, goal);
    });
  }, 60],
  ['p2p_communication_loss', sim => {
    const { Robot } = require(path.join(__dirname, '..', 'src', 'sim', 'robot.ts'));
    [[0, [0, 3], [6, 3]], [1, [6, 3], [0, 3]], [2, [3, 0], [3, 6]]].forEach(([id, start, goal]) => {
      sim.robots.set(id, new Robot(id, start, sim.wh, sim.bus, sim.res, sim.logEvents, 'harmoni'));
      assignDirect(sim, id, start, goal);
    });
    sim.schedule(8, () => sim.bus.setP2p(false), 'p2p_lost');
    sim.schedule(30, () => sim.bus.setP2p(true), 'p2p_restored');
  }, 60],
];

for (const [name, setup, ticks] of scenarios) {
  const first = runScenario(name, setup, ticks);
  const second = runScenario(name, setup, ticks);
  assert(JSON.stringify(decisionSignature(first)) === JSON.stringify(decisionSignature(second)), `${name}: non-deterministic replay`);
  assertStable(first, name);
}

console.log(`deterministic checks passed (${scenarios.length} scenarios)`);

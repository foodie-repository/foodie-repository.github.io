import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/\/\/ AUTO_REPLAY_CORE_START([\s\S]*?)\/\/ AUTO_REPLAY_CORE_END/);
assert.ok(match, 'AUTO replay core block must exist in index.html');

const context = {};
vm.createContext(context);
vm.runInContext(match[1], context);

const { normalizeReplay, isReplayValidForFingerprint, applyReplayEventsForTick } = context;

test('normalizeReplay accepts version 1 120 Hz ordered press/release events', () => {
  const replay = normalizeReplay({
    version: 1,
    physicsHz: 120,
    fingerprint: 'fp1',
    events: [
      { tick: 0, action: 'press' },
      { tick: 5, action: 'release' },
      { tick: 5, action: 'press' },
    ],
  });
  assert.equal(replay.version, 1);
  assert.equal(replay.physicsHz, 120);
  assert.equal(replay.fingerprint, 'fp1');
  assert.deepEqual(JSON.parse(JSON.stringify(replay.events)), [
    { tick: 0, action: 'press' },
    { tick: 5, action: 'release' },
    { tick: 5, action: 'press' },
  ]);
});

test('normalizeReplay rejects wrong version', () => {
  assert.throws(() => normalizeReplay({ version: 2, physicsHz: 120, fingerprint: 'fp', events: [] }));
});

test('normalizeReplay rejects physics rate other than 120', () => {
  assert.throws(() => normalizeReplay({ version: 1, physicsHz: 60, fingerprint: 'fp', events: [] }));
});

test('normalizeReplay rejects negative or descending ticks', () => {
  assert.throws(() => normalizeReplay({
    version: 1, physicsHz: 120, fingerprint: 'fp',
    events: [{ tick: -1, action: 'press' }],
  }));
  assert.throws(() => normalizeReplay({
    version: 1, physicsHz: 120, fingerprint: 'fp',
    events: [{ tick: 4, action: 'press' }, { tick: 3, action: 'release' }],
  }));
});

test('normalizeReplay rejects unknown actions', () => {
  assert.throws(() => normalizeReplay({
    version: 1, physicsHz: 120, fingerprint: 'fp',
    events: [{ tick: 0, action: 'jump' }],
  }));
});

test('normalizeReplay treats null as no replay', () => {
  assert.equal(normalizeReplay(null), null);
});

test('isReplayValidForFingerprint requires matching fingerprint', () => {
  const replay = normalizeReplay({
    version: 1, physicsHz: 120, fingerprint: 'abc',
    events: [{ tick: 0, action: 'press' }],
  });
  assert.equal(isReplayValidForFingerprint(replay, 'abc'), true);
  assert.equal(isReplayValidForFingerprint(replay, 'xyz'), false);
  assert.equal(isReplayValidForFingerprint(null, 'abc'), false);
});

test('applyReplayEventsForTick applies all events at the current tick in order', () => {
  const replay = normalizeReplay({
    version: 1, physicsHz: 120, fingerprint: 'abc',
    events: [
      { tick: 2, action: 'press' },
      { tick: 2, action: 'release' },
      { tick: 4, action: 'press' },
    ],
  });
  const replayState = { replay, cursor: 0 };
  const states = [];
  applyReplayEventsForTick(replayState, 1, v => states.push(v));
  assert.deepEqual(states, []);
  applyReplayEventsForTick(replayState, 2, v => states.push(v));
  assert.deepEqual(states, [true, false]);
  assert.equal(replayState.cursor, 2);
});


test('fixed-step accumulator runs exactly 120 simulation steps per second at common render rates', () => {
  const { advanceAutoAccumulator } = context;
  for (const fps of [30, 60, 90, 120, 144]) {
    const state = { accumulator: 0 };
    let steps = 0;
    for (let frame = 0; frame < fps; frame++) {
      advanceAutoAccumulator(1 / fps, state, () => { steps++; });
    }
    assert.equal(steps, 120, `${fps} Hz render should run 120 physics steps`);
  }
});

test('fixed-step accumulator caps a 500 ms stall to the maximum catch-up window', () => {
  const { advanceAutoAccumulator, MAX_AUTO_CATCHUP_SECONDS } = context;
  const state = { accumulator: 0 };
  let steps = 0;
  advanceAutoAccumulator(0.5, state, () => { steps++; });
  assert.equal(MAX_AUTO_CATCHUP_SECONDS, 0.25);
  assert.equal(steps, 30);
});

test('fixed-step accumulator is deterministic for identical frame-delta sequences', () => {
  const { advanceAutoAccumulator } = context;
  const deltas = [1/60, 1/60, 1/90, 1/144, 0.02, 0.01, 1/120];
  const run = () => {
    const state = { accumulator: 0 };
    let steps = 0;
    for (const dt of deltas) advanceAutoAccumulator(dt, state, () => { steps++; });
    return { steps, accumulator: state.accumulator };
  };
  assert.deepEqual(run(), run());
});


test('recordReplayInputTransition records only real manual held-state changes', () => {
  const { recordReplayInputTransition } = context;
  const state = { held: false, mode: 'record', events: [] };
  assert.equal(recordReplayInputTransition(state, true, 'manual', 7), true);
  assert.deepEqual(JSON.parse(JSON.stringify(state.events)), [{ tick: 7, action: 'press' }]);
  assert.equal(recordReplayInputTransition(state, true, 'manual', 8), false);
  assert.equal(state.events.length, 1);
  assert.equal(recordReplayInputTransition(state, false, 'manual', 9), true);
  assert.deepEqual(JSON.parse(JSON.stringify(state.events)), [
    { tick: 7, action: 'press' },
    { tick: 9, action: 'release' },
  ]);
});

test('recordReplayInputTransition never records replay or system sourced changes', () => {
  const { recordReplayInputTransition } = context;
  const state = { held: false, mode: 'record', events: [] };
  recordReplayInputTransition(state, true, 'replay', 2);
  recordReplayInputTransition(state, false, 'system', 3);
  assert.deepEqual(JSON.parse(JSON.stringify(state.events)), []);
});

test('recordReplayInputTransition reset-style state write does not synthesize events', () => {
  const { recordReplayInputTransition } = context;
  const state = { held: true, mode: 'record', events: [{ tick: 1, action: 'press' }] };
  recordReplayInputTransition(state, false, 'system', 10);
  assert.deepEqual(JSON.parse(JSON.stringify(state.events)), [{ tick: 1, action: 'press' }]);
});

test('portal transitions do not require input transitions', () => {
  const { recordReplayInputTransition } = context;
  const state = { held: true, mode: 'record', events: [] };
  assert.equal(recordReplayInputTransition(state, true, 'system', 12), false);
  assert.equal(state.held, true);
  assert.deepEqual(JSON.parse(JSON.stringify(state.events)), []);
});

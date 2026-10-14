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

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/\/\/ AUTO_REPLAY_CORE_START([\s\S]*?)\/\/ AUTO_REPLAY_CORE_END/);
assert.ok(match, 'AUTO replay core block must exist');
const context = {};
vm.createContext(context);
vm.runInContext(match[1], context);

test('old map payload without replay normalizes to null replay', () => {
  assert.equal(context.normalizeOptionalReplay(undefined), null);
});

test('malformed replay is ignored instead of breaking map import', () => {
  assert.equal(context.normalizeOptionalReplay({ version: 9, physicsHz: 120, fingerprint: 'x', events: [] }), null);
  assert.equal(context.normalizeOptionalReplay({ version: 1, physicsHz: 120, fingerprint: 'x', events: [{ tick: -1, action: 'press' }] }), null);
});

test('manual verification attaches matching verified fingerprint and replay', () => {
  const level = { id: 'a', verifiedFingerprint: null, replay: null };
  const out = context.attachReplayVerification(level, 'g1-abc', [
    { tick: 2, action: 'press' },
    { tick: 8, action: 'release' },
  ]);
  assert.equal(out.verifiedFingerprint, 'g1-abc');
  assert.equal(out.replay.fingerprint, 'g1-abc');
  assert.equal(out.replay.physicsHz, 120);
  assert.deepEqual(JSON.parse(JSON.stringify(out.replay.events)), [
    { tick: 2, action: 'press' },
    { tick: 8, action: 'release' },
  ]);
});

test('gameplay invalidation clears verification and replay together', () => {
  const level = {
    id: 'a',
    verifiedFingerprint: 'g1-abc',
    replay: { version: 1, physicsHz: 120, fingerprint: 'g1-abc', events: [] },
  };
  const out = context.invalidateReplayVerification(level);
  assert.equal(out.verifiedFingerprint, null);
  assert.equal(out.replay, null);
});

test('non-gameplay metadata copy can preserve a valid replay', () => {
  const replay = { version: 1, physicsHz: 120, fingerprint: 'g1-abc', events: [] };
  const normalized = context.normalizeOptionalReplay(replay);
  assert.equal(context.isReplayValidForFingerprint(normalized, 'g1-abc'), true);
});

test('production ND1 encoder includes optional replay and decoder strips local verification only', () => {
  assert.match(html, /payload\s*=\s*\{[\s\S]*replay:/);
  assert.match(html, /normalized\.verifiedFingerprint\s*=\s*null/);
  assert.doesNotMatch(html, /normalized\.replay\s*=\s*null;\s*return normalized;/);
});

test('gameplay editor touch invalidates replay with verification', () => {
  assert.match(html, /if\s*\(gameplay\)\s*\{[\s\S]{0,180}verifiedFingerprint\s*=\s*null/);
  assert.match(html, /if\s*\(gameplay\)[\s\S]{0,180}replay\s*=\s*null/);
});

test('AUTO clear does not attach creator replay', () => {
  assert.match(html, /completeCustomVerification\(\)\{if\(game\.autoMode\)return;/);
});

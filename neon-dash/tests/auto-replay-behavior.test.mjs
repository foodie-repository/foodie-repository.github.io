import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('secret code still toggles AUTO availability', () => {
  assert.match(html, /function validateAutoCode\(value\) \{ return String\(value \?\? ''\)\.trim\(\) === '뀨'; \}/);
});

test('official AUTO selects OFFICIAL_REPLAY', () => {
  assert.match(html, /game\.kind==='official'\s*\?\s*OFFICIAL_REPLAY/);
});

test('custom AUTO selects a fingerprint-matching stored replay', () => {
  assert.match(html, /runtime\.sourceLevel\?\.replay/);
  assert.match(html, /isReplayValidForFingerprint/);
});

test('custom map without replay does not fall back to heuristic AUTO', () => {
  assert.match(html, /직접 클리어 후 AUTO 사용 가능/);
  assert.doesNotMatch(html, /function autoCubeShouldJump/);
  assert.doesNotMatch(html, /function autoPassageTargetY/);
  assert.doesNotMatch(html, /function autoVerticalHold/);
  assert.doesNotMatch(html, /function autoOrbAvailable/);
  assert.doesNotMatch(html, /updateAutoPilot\(\)/);
});

test('replay fingerprint mismatch refuses playback', () => {
  assert.match(html, /function startReplayForRuntime/);
  assert.match(html, /isReplayValidForFingerprint\(replay, fingerprint\)/);
});

test('replay death stops the run and shows invalid replay state', () => {
  assert.match(html, /AUTO REPLAY INVALID/);
  assert.match(html, /stopReplay\('invalid'\)/);
});

test('AUTO custom clear still cannot grant creator verification', () => {
  assert.match(html, /completeCustomVerification\(\)\{if\(game\.autoMode\)return;/);
});

test('AUTO UI distinguishes READY and PLAY states', () => {
  assert.match(html, /AUTO READY/);
  assert.match(html, /AUTO PLAY/);
});

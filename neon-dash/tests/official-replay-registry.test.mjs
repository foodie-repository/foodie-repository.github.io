import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('official replay lookup is registry-based', () => {
  assert.match(html, /function getOfficialReplay\(levelId\)/);
  assert.match(html, /getOfficialLevel\(levelId\)/);
});

test('official AUTO selects replay by selected level ID', () => {
  assert.match(html, /getOfficialReplay\(game\.officialLevelId\)/);
  assert.doesNotMatch(html, /game\.kind==='official'\?OFFICIAL_REPLAY/);
});

test('five named replay slots exist', () => {
  for (const name of [
    'NEON_START_REPLAY',
    'PULSE_FACTORY_REPLAY',
    'SKY_CIRCUIT_REPLAY',
    'WAVE_STORM_REPLAY',
    'FINAL_ECLIPSE_REPLAY',
  ]) assert.match(html, new RegExp(name));
});

test('official replay mismatch is handled per selected map', () => {
  assert.match(html, /startReplayForRuntime\(runtime,selectedReplay\)/);
  assert.match(html, /game\.autoMode=false/);
  assert.match(html, /공식 AUTO 리플레이를 사용할 수 없습니다/);
});

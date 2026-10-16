import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const registry = html.match(/\/\/ OFFICIAL_LEVEL_REGISTRY_START([\s\S]*?)\/\/ OFFICIAL_LEVEL_REGISTRY_END/);
assert.ok(registry, 'official registry missing');

test('all five official replay constants are non-null version 1 / 120 Hz payloads', () => {
  const names=[
    'NEON_START_REPLAY',
    'PULSE_FACTORY_REPLAY',
    'SKY_CIRCUIT_REPLAY',
    'WAVE_STORM_REPLAY',
    'FINAL_ECLIPSE_REPLAY',
  ];
  for(const name of names){
    const re=new RegExp(`var ${name} = (\\{[^;]+\\});`);
    const m=html.match(re);
    assert.ok(m, `${name} payload missing`);
    const replay=JSON.parse(m[1]);
    assert.equal(replay.version,1);
    assert.equal(replay.physicsHz,120);
    assert.ok(typeof replay.fingerprint==='string' && replay.fingerprint.length>0);
    assert.ok(Array.isArray(replay.events) && replay.events.length>0);
  }
});

test('verified tick metadata exists for all five official maps', () => {
  const m=html.match(/var OFFICIAL_REPLAY_VERIFIED_TICKS_BY_LEVEL = (\{[^;]+\});/);
  assert.ok(m);
  const ticks=JSON.parse(m[1]);
  assert.deepEqual(Object.keys(ticks),[
    'neon-start','pulse-factory','sky-circuit','wave-storm','final-eclipse'
  ]);
  for(const value of Object.values(ticks)) assert.ok(Number.isInteger(value)&&value>0);
});

test('registry replay slots are bound to five distinct replay objects', () => {
  assert.match(html,/replay:NEON_START_REPLAY/);
  assert.match(html,/replay:PULSE_FACTORY_REPLAY/);
  assert.match(html,/replay:SKY_CIRCUIT_REPLAY/);
  assert.match(html,/replay:WAVE_STORM_REPLAY/);
  assert.match(html,/replay:FINAL_ECLIPSE_REPLAY/);
});

test('no heuristic AUTO fallback returns', () => {
  for(const forbidden of [
    'function autoCubeShouldJump',
    'function autoPassageTargetY',
    'function autoVerticalHold',
    'function autoOrbAvailable',
    'updateAutoPilot()',
  ]) assert.equal(html.includes(forbidden),false,forbidden);
});

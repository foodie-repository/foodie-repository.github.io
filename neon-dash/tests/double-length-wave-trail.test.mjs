import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const start = html.indexOf('function createNeonStartRuntime()');
const end = html.indexOf('function officialRuntimeFingerprint', start);
assert.ok(start >= 0 && end > start);

const context = {
  OFFICIAL_H:540,
  OFFICIAL_GROUND_Y:430,
  OFFICIAL_FLIGHT_TOP:58,
  OFFICIAL_FLIGHT_BOTTOM:430,
};
vm.createContext(context);
vm.runInContext(html.slice(start,end), context);

const constructors = [
  ['neon-start',22400,context.createNeonStartRuntime],
  ['pulse-factory',12000,context.createPulseFactoryRuntime],
  ['sky-circuit',14500,context.createSkyCircuitRuntime],
  ['wave-storm',15500,context.createWaveStormRuntime],
  ['final-eclipse',18500,context.createFinalEclipseRuntime],
];

test('all official maps double their playable distance', () => {
  for (const [id, oldEnd, fn] of constructors) {
    const runtime = fn();
    const oldDistance = oldEnd - runtime.startX;
    assert.equal(runtime.levelEnd - runtime.startX, oldDistance * 2, id);
    assert.equal(runtime.speedCycleLength, oldDistance, id);
  }
});

test('second half contains real duplicated gameplay geometry', () => {
  for (const [id, oldEnd, fn] of constructors) {
    const runtime = fn();
    const shift = oldEnd - runtime.startX;
    assert.ok(runtime.spikes.some(o => o.x >= oldEnd && o.id.endsWith('-r2')), id);
    assert.ok(runtime.blocks.some(o => o.x >= oldEnd && o.id.endsWith('-r2')) || runtime.flightObstacles.some(o => o.x >= oldEnd && o.id.endsWith('-r2')), id);
    assert.ok(runtime.portals.every(p => p.x < runtime.levelEnd), id);
    assert.ok(shift > 0);
  }
});

test('wave trail state is reset with a run and on wave exit', () => {
  assert.match(html, /waveTrail:\[\]/);
  assert.match(html, /function resetWaveTrail\(\)/);
  assert.match(html, /function addWaveTrailPoint\(\)/);
  assert.match(html, /if\(player\.mode==='wave'&&next!=='wave'\)resetWaveTrail\(\)/);
  assert.match(html, /resetWaveTrail\(\);[^}]*hideGameMessage\(\)/);
});

test('wave mode records trail points and renders a neon line', () => {
  assert.match(html, /addWaveTrailPoint\(\)/);
  assert.match(html, /function drawWaveTrail\(\)/);
  assert.match(html, /ctx\.lineTo\(/);
  assert.match(html, /drawWaveTrail\(\);drawPlayer\(\)/);
});

test('wave trail is bounded to avoid unbounded memory growth', () => {
  assert.match(html, /waveTrail\.length>\d+/);
  assert.match(html, /waveTrail\.splice\(/);
});

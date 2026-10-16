import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/\/\/ OFFICIAL_LEVEL_REGISTRY_START([\s\S]*?)\/\/ OFFICIAL_LEVEL_REGISTRY_END/);
assert.ok(match, 'official level registry block must exist');

const context = {
  createNeonStartRuntime(){},
  createPulseFactoryRuntime(){},
  createSkyCircuitRuntime(){},
  createWaveStormRuntime(){},
  createFinalEclipseRuntime(){},
  NEON_START_REPLAY: null,
  PULSE_FACTORY_REPLAY: null,
  SKY_CIRCUIT_REPLAY: null,
  WAVE_STORM_REPLAY: null,
  FINAL_ECLIPSE_REPLAY: null,
};
vm.createContext(context);
vm.runInContext(match[1], context);

const levels = context.OFFICIAL_LEVELS;
const ids = JSON.parse(JSON.stringify(context.OFFICIAL_LEVEL_IDS));

test('exactly five official levels exist in approved order', () => {
  assert.equal(levels.length, 5);
  assert.deepEqual(ids, [
    'neon-start',
    'pulse-factory',
    'sky-circuit',
    'wave-storm',
    'final-eclipse',
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(levels.map(x => x.name))), [
    'Neon Start',
    'Pulse Factory',
    'Sky Circuit',
    'Wave Storm',
    'Final Eclipse',
  ]);
});

test('IDs and names are unique', () => {
  assert.equal(new Set(levels.map(x => x.id)).size, 5);
  assert.equal(new Set(levels.map(x => x.name)).size, 5);
});

test('difficulties are 1 through 5', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(levels.map(x => x.difficulty))), [1,2,3,4,5]);
});

test('every registry entry exposes runtime constructor and replay slot', () => {
  for (const level of levels) {
    assert.equal(typeof level.createRuntime, 'function');
    assert.ok(Object.hasOwn(level, 'replay'));
  }
});

test('missing official level is a safe miss', () => {
  assert.equal(context.getOfficialLevel('missing'), null);
  assert.equal(context.createOfficialRuntimeById('missing'), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

await import('../src/physics-substeps.js');

const { computePhysicsSubsteps } = globalThis.TripleObbyPhysics || {};

test('fast movement is split into short collision-safe substeps', () => {
  assert.equal(typeof computePhysicsSubsteps, 'function');
  assert.equal(computePhysicsSubsteps({ x: 0, y: -28, z: 0 }, 1 / 30, 0.22), 5);
  assert.equal(computePhysicsSubsteps({ x: 13.5, y: 9.8, z: 13.5 }, 1 / 30, 0.22), 3);
});

test('runtime applies solid platform collision to every map, not just lava', async () => {
  const runtime = await fs.readFile(new URL('../game-05.part', import.meta.url), 'utf8');
  assert.match(runtime, /computePhysicsSubsteps/);
  assert.match(runtime, /resolveSolidPlatformCollision/);
  assert.doesNotMatch(runtime, /level\.id\s*===\s*['"]lava['"]/);
});

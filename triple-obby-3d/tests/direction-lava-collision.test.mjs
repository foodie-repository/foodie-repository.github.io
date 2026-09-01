import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

await import('../src/arrow-controls.js');

const { stepArrowControls, modelYawForFacing } = globalThis.TripleObbyControls || {};

test('logical facing direction is converted to the Three.js model front (-Z)', () => {
  assert.equal(typeof modelYawForFacing, 'function');
  for (const yaw of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const modelYaw = modelYawForFacing(yaw);
    const visualForwardX = -Math.sin(modelYaw);
    const visualForwardZ = -Math.cos(modelYaw);
    const logicalForwardX = Math.sin(yaw);
    const logicalForwardZ = Math.cos(yaw);
    assert.ok(Math.abs(visualForwardX - logicalForwardX) < 1e-10);
    assert.ok(Math.abs(visualForwardZ - logicalForwardZ) < 1e-10);
  }
});

test('ArrowUp still moves along logical facing after visual orientation correction', () => {
  const result = stepArrowControls({ forward: true, back: false, left: false, right: false }, Math.PI / 2, 0.1);
  assert.ok(Math.abs(result.moveX - 1) < 1e-12);
  assert.ok(Math.abs(result.moveZ) < 1e-12);
});

test('lava map registers its tall blocks as collision obstacles', async () => {
  const source = await readFile(new URL('../game-03.part', import.meta.url), 'utf8');
  assert.match(source, /id:\s*'lava',[\s\S]*?obstacles:\s*\[\]/);
  assert.match(source, /level\.obstacles\.push\(/);
});

test('runtime resolves horizontal obstacle collisions', async () => {
  const source = await readFile(new URL('../game-05.part', import.meta.url), 'utf8');
  assert.match(source, /resolveHorizontalObstacle/);
  assert.match(source, /level\.obstacles/);
});

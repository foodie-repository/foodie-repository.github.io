import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/arrow-controls.js');

const { stepArrowControls } = globalThis.TripleObbyControls || {};

test('ArrowUp moves forward in the direction the character is facing', () => {
  assert.equal(typeof stepArrowControls, 'function');

  const north = stepArrowControls({ forward: true, back: false, left: false, right: false }, 0, 0.1);
  assert.ok(Math.abs(north.moveX) < 1e-12);
  assert.ok(Math.abs(north.moveZ - 1) < 1e-12);

  const east = stepArrowControls({ forward: true, back: false, left: false, right: false }, Math.PI / 2, 0.1);
  assert.ok(Math.abs(east.moveX - 1) < 1e-12);
  assert.ok(Math.abs(east.moveZ) < 1e-12);
});

test('ArrowLeft and ArrowRight rotate facing direction without moving by themselves', () => {
  const left = stepArrowControls({ forward: false, back: false, left: true, right: false }, 0, 0.5, 2);
  assert.equal(left.yaw, -1);
  assert.equal(left.moveX, 0);
  assert.equal(left.moveZ, 0);

  const right = stepArrowControls({ forward: false, back: false, left: false, right: true }, 0, 0.5, 2);
  assert.equal(right.yaw, 1);
  assert.equal(right.moveX, 0);
  assert.equal(right.moveZ, 0);
});

test('ArrowDown moves backward without flipping the facing direction', () => {
  const result = stepArrowControls({ forward: false, back: true, left: false, right: false }, Math.PI / 2, 0.1);
  assert.ok(Math.abs(result.moveX + 1) < 1e-12);
  assert.ok(Math.abs(result.moveZ) < 1e-12);
  assert.equal(result.yaw, Math.PI / 2);
});

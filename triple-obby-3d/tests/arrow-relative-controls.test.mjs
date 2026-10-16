import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/arrow-controls.js');

const { stepArrowControls } = globalThis.TripleObbyControls || {};

test('arrow keys move relative to facing without changing yaw', () => {
  assert.equal(typeof stepArrowControls, 'function');

  const forward = stepArrowControls({ forward: true, back: false, left: false, right: false }, Math.PI / 2, 0.1);
  assert.equal(forward.yaw, Math.PI / 2);
  assert.ok(Math.abs(forward.moveX - 1) < 1e-12);
  assert.ok(Math.abs(forward.moveZ) < 1e-12);

  const left = stepArrowControls({ forward: false, back: false, left: true, right: false }, 0, 0.1);
  assert.equal(left.yaw, 0);
  assert.ok(Math.abs(left.moveX + 1) < 1e-12);
  assert.ok(Math.abs(left.moveZ) < 1e-12);

  const right = stepArrowControls({ forward: false, back: false, left: false, right: true }, 0, 0.1);
  assert.equal(right.yaw, 0);
  assert.ok(Math.abs(right.moveX - 1) < 1e-12);
  assert.ok(Math.abs(right.moveZ) < 1e-12);
});

test('ArrowDown moves backward without flipping the facing direction', () => {
  const result = stepArrowControls({ forward: false, back: true, left: false, right: false }, Math.PI / 2, 0.1);
  assert.ok(Math.abs(result.moveX + 1) < 1e-12);
  assert.ok(Math.abs(result.moveZ) < 1e-12);
  assert.equal(result.yaw, Math.PI / 2);
});

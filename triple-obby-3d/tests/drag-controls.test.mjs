import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/drag-controls.js');

const { applyDragYaw } = globalThis.TripleObbyControls || {};

test('horizontal drag is the only pure facing rotation primitive', () => {
  assert.equal(typeof applyDragYaw, 'function');
  assert.ok(Math.abs(applyDragYaw(0, 100, 0.004) + 0.4) < 1e-9);
  assert.ok(Math.abs(applyDragYaw(0, -100, 0.004) - 0.4) < 1e-9);
});

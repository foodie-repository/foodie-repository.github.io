import test from 'node:test';
import assert from 'node:assert/strict';
import { computeWorldMove, updateKeyState } from '../src/input-controller.mjs';
import { CAMERA_MODES, nextCameraMode } from '../src/camera-modes.mjs';

test('WASD movement is identical in every camera mode', () => {
  const input = { forward: true, back: false, left: false, right: true, jump: false, sprint: false };
  const vectors = CAMERA_MODES.map(() => computeWorldMove(input));
  for (const vector of vectors) {
    assert.ok(Math.abs(vector.x - Math.SQRT1_2) < 1e-12);
    assert.equal(vector.y, 0);
    assert.ok(Math.abs(vector.z + Math.SQRT1_2) < 1e-12);
  }
});

test('camera cycling does not mutate held key state', () => {
  const held = Object.freeze({ forward: true, back: false, left: true, right: false, jump: false, sprint: false });
  const afterCamera = nextCameraMode('third');
  assert.equal(afterCamera.id, 'close');
  assert.deepEqual(held, { forward: true, back: false, left: true, right: false, jump: false, sprint: false });
  assert.deepEqual(updateKeyState(held, { key: 'jump', pressed: true }), { ...held, jump: true });
});

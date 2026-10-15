import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

await import('../src/joystick-controls.js');

const { stepJoystickControls } = globalThis.TripleObbyControls || {};

test('joystick moves relative to facing but never changes yaw', () => {
  assert.equal(typeof stepJoystickControls, 'function');
  const forward = stepJoystickControls({ active: true, x: 0, y: -1 }, Math.PI / 2, 0.5);
  assert.equal(forward.yaw, Math.PI / 2);
  assert.ok(Math.abs(forward.moveX - 1) < 1e-9);
  assert.ok(Math.abs(forward.moveZ) < 1e-9);

  const strafe = stepJoystickControls({ active: true, x: 1, y: 0 }, 0, 0.5);
  assert.equal(strafe.yaw, 0);
  assert.ok(Math.abs(strafe.moveX - 1) < 1e-9);
  assert.ok(Math.abs(strafe.moveZ) < 1e-9);
});

test('runtime changes facing from canvas drag instead of joystick x', async () => {
  const runtime = await fs.readFile(new URL('../camera-tail-02.part', import.meta.url), 'utf8');
  assert.match(runtime, /dragFacing/);
  assert.doesNotMatch(runtime, /joystickInput\.x[^\n]*player\.yaw/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

let joystickApi = null;
try {
  await import('../src/joystick-controls.js');
  joystickApi = globalThis.TripleObbyControls || null;
} catch {
  joystickApi = null;
}

test('mobile joystick supports analog forward plus turning and returns neutral when released', () => {
  assert.equal(typeof joystickApi?.stepJoystickControls, 'function');
  assert.equal(typeof joystickApi?.normalizeJoystickVector, 'function');

  const normalized = joystickApi.normalizeJoystickVector(30, -40, 50);
  assert.ok(Math.abs(normalized.x - 0.6) < 1e-9);
  assert.ok(Math.abs(normalized.y + 0.8) < 1e-9);

  const moving = joystickApi.stepJoystickControls({ x: 0.5, y: -1, active: true }, 0, 0.5, 2);
  assert.ok(moving.yaw < 0);
  assert.ok(moving.drive > 0.99);
  assert.ok(Number.isFinite(moving.moveX));
  assert.ok(Number.isFinite(moving.moveZ));

  const neutral = joystickApi.stepJoystickControls({ x: 0, y: 0, active: false }, moving.yaw, 0.5, 2);
  assert.equal(neutral.drive, 0);
  assert.equal(neutral.moveX, 0);
  assert.equal(neutral.moveZ, 0);
});

test('mobile UI uses one joystick instead of the four-button dpad', async () => {
  const html = await fs.readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await fs.readFile(new URL('../styles.css', import.meta.url), 'utf8');
  const inputRuntime = [
    await fs.readFile(new URL('../camera-tail-02.part', import.meta.url), 'utf8'),
    await fs.readFile(new URL('../camera-tail-03.part', import.meta.url), 'utf8'),
  ].join('\n');

  assert.match(html, /id="joystickBase"/);
  assert.match(html, /id="joystickKnob"/);
  assert.doesNotMatch(html, /class="dpad"/);
  assert.match(css, /#joystickBase/);
  assert.match(css, /#joystickKnob/);
  assert.match(inputRuntime, /joystickInput/);
  assert.match(inputRuntime, /pointermove/);
});

test('sky islands no longer add unnecessary overlapping underside blocks', async () => {
  const skySource = await fs.readFile(new URL('../game-04.part', import.meta.url), 'utf8');
  assert.doesNotMatch(skySource, /const underside = makeBox/);
  assert.doesNotMatch(skySource, /level\.group\.add\(underside\)/);
  assert.doesNotMatch(skySource, /\[22, 5\.4, -6\.6\]/);
  assert.doesNotMatch(skySource, /\[48, 11\.2, 6\.8\]/);
});

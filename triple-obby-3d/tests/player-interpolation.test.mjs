import test from 'node:test';
import assert from 'node:assert/strict';
import { pushSample, interpolatePlayer } from '../network/interpolation.mjs';

test('remote player interpolates between two ordered samples', () => {
  let buffer = [];
  buffer = pushSample(buffer, { sentAt: 1000, position: [0, 0, 0], velocity: [0, 0, 0], yaw: 0 });
  buffer = pushSample(buffer, { sentAt: 1200, position: [10, 2, -4], velocity: [1, 0, 0], yaw: Math.PI });
  const state = interpolatePlayer(buffer, 1100);
  assert.deepEqual(state.position, [5, 1, -2]);
  assert.deepEqual(state.velocity, [0.5, 0, 0]);
  assert.ok(Math.abs(state.yaw - Math.PI / 2) < 1e-9);
});

test('sample buffer is ordered, deduplicated, and bounded', () => {
  let buffer = [];
  for (const sentAt of [300, 100, 200, 200, 400]) {
    buffer = pushSample(buffer, { sentAt, position: [sentAt, 0, 0], velocity: [0, 0, 0], yaw: 0 }, 3);
  }
  assert.deepEqual(buffer.map(sample => sample.sentAt), [200, 300, 400]);
  assert.equal(buffer[0].position[0], 200);
});

test('interpolation uses the shortest yaw path across the wrap boundary', () => {
  const buffer = [
    { sentAt: 0, position: [0, 0, 0], velocity: [0, 0, 0], yaw: Math.PI * 0.9 },
    { sentAt: 100, position: [0, 0, 0], velocity: [0, 0, 0], yaw: -Math.PI * 0.9 },
  ];
  const state = interpolatePlayer(buffer, 50);
  assert.ok(Math.abs(Math.abs(state.yaw) - Math.PI) < 1e-9);
});

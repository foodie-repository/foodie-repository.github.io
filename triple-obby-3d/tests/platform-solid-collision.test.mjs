import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/platform-collision.js');

const { resolveSolidPlatformCollision } = globalThis.TripleObbyPhysics || {};
const platform = Object.freeze({ x: 0, y: 2, z: 0, w: 6, h: 1, d: 6, active: true });

test('jumping upward into a platform underside stops below the block', () => {
  assert.equal(typeof resolveSolidPlatformCollision, 'function');
  const result = resolveSolidPlatformCollision(
    { x: 0, y: 0.1, z: 0 },
    { x: 0, y: 1.2, z: 0 },
    platform,
    { radius: 0.38, height: 1.8, velocityY: 8 },
  );
  assert.equal(result.hitBottom, true);
  assert.ok(Math.abs(result.y - (-0.3)) < 1e-9);
  assert.equal(result.velocityY, 0);
});

test('walking into the side of a platform does not enter the block', () => {
  const result = resolveSolidPlatformCollision(
    { x: -3.8, y: 1.7, z: 0 },
    { x: -2.7, y: 1.7, z: 0 },
    platform,
    { radius: 0.38, height: 1.8, velocityY: 0 },
  );
  assert.equal(result.blockedX, true);
  assert.ok(result.x <= -3.38 + 1e-9);
});

test('falling onto the platform still lands on its top', () => {
  const result = resolveSolidPlatformCollision(
    { x: 0, y: 3.2, z: 0 },
    { x: 0, y: 2.2, z: 0 },
    platform,
    { radius: 0.38, height: 1.8, velocityY: -8 },
  );
  assert.equal(result.hitTop, true);
  assert.equal(result.grounded, true);
  assert.ok(Math.abs(result.y - 2.5) < 1e-9);
  assert.equal(result.velocityY, 0);
});

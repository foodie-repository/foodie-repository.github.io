import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoomCode, validatePlayerState, acceptSequence } from '../network/protocol.mjs';

test('room code removes spaces, uppercases, and rejects ambiguous characters', () => {
  assert.equal(normalizeRoomCode(' ab2cd3 '), 'AB2CD3');
  assert.throws(() => normalizeRoomCode('AB10OI'), /invalid room code/i);
});

test('player state validator rejects non-finite coordinates and oversized stage', () => {
  assert.throws(() => validatePlayerState({
    type: 'player_state', sessionId: 's', seq: 1, sentAt: 1, mapId: 'sky',
    position: [NaN, 0, 0], velocity: [0, 0, 0], yaw: 0,
    grounded: true, stage: 1, animation: 'idle',
  }), /position/i);
  assert.throws(() => validatePlayerState({
    type: 'player_state', sessionId: 's', seq: 1, sentAt: 1, mapId: 'sky',
    position: [0, 0, 0], velocity: [0, 0, 0], yaw: 0,
    grounded: true, stage: 21, animation: 'idle',
  }), /stage/i);
  assert.equal(acceptSequence(11, 12), true);
  assert.equal(acceptSequence(12, 12), false);
});

test('player state validator returns a normalized immutable object', () => {
  const state = validatePlayerState({
    type: 'player_state', sessionId: 'abc', seq: 3, sentAt: 1000, mapId: 'color',
    position: [1, 2, 3], velocity: [0, -1, 2], yaw: 0.25,
    grounded: false, stage: 4, animation: 'fall',
  });
  assert.equal(Object.isFrozen(state), true);
  assert.deepEqual(state.position, [1, 2, 3]);
});

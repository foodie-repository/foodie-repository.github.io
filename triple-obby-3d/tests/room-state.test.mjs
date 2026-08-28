import test from 'node:test';
import assert from 'node:assert/strict';
import { electHost, reduceRoomState } from '../network/room-state.mjs';

test('host election is joinedAt then sessionId', () => {
  const elected = electHost([
    { sessionId: 'z', joinedAt: 100 },
    { sessionId: 'a', joinedAt: 100 },
    { sessionId: 'b', joinedAt: 200 },
  ]);
  assert.equal(elected.sessionId, 'a');
});

test('network loss enters offline solo without changing current map', () => {
  const state = { connection: 'online', mapId: 'lava', members: [], error: null, room: { id: 'r' } };
  const next = reduceRoomState(state, { type: 'SOCKET_LOST', reason: 'timeout' });
  assert.deepEqual(next, { connection: 'offline-solo', mapId: 'lava', members: [], error: 'timeout', room: { id: 'r' } });
  assert.notEqual(next, state);
});

test('member and map updates are immutable', () => {
  const initial = Object.freeze({ connection: 'connecting', mapId: 'lobby', members: [], error: null, room: null });
  const joined = reduceRoomState(initial, { type: 'JOINED', room: { id: 'r1', code: 'ABC234' }, members: [{ sessionId: 's1' }] });
  assert.equal(joined.connection, 'online');
  assert.equal(joined.room.code, 'ABC234');
  const changed = reduceRoomState(joined, { type: 'MAP_CHANGED', mapId: 'sky' });
  assert.equal(changed.mapId, 'sky');
  assert.equal(joined.mapId, 'lobby');
});

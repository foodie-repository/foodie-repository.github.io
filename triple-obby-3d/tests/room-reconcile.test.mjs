import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../network/room-reconcile.js', import.meta.url), 'utf8');
const context = vm.createContext({ window: { TripleObbyOnline: {} }, Date });
vm.runInContext(source, context);
const reconcile = context.window.TripleObbyOnline.reconcileServerRoom;
const reconcileMapMessage = context.window.TripleObbyOnline.reconcileMapMessage;
const mapRequestDisposition = context.window.TripleObbyOnline.mapRequestDisposition;

test('heartbeat reconciliation emits a map change when the persisted transition changes', () => {
  const previous = {
    id: 'room-1', host_session_id: 'host', current_map_id: 'lobby',
    map_transition_id: null, map_start_at: null,
  };
  const next = {
    id: 'room-1', host_session_id: 'host', current_map_id: 'sky',
    map_transition_id: 'transition-2', map_start_at: '2026-08-31T03:45:00.000Z',
  };
  const result = reconcile(previous, next);
  assert.equal(result.mapChange.mapId, 'sky');
  assert.equal(result.mapChange.hostSessionId, 'host');
  assert.equal(result.mapChange.transitionId, 'transition-2');
  assert.equal(result.mapChange.fromServer, true);
});

test('reconciliation does not restart a map when transition state already matches', () => {
  const room = {
    id: 'room-1', host_session_id: 'host', current_map_id: 'color',
    map_transition_id: 'same-transition', map_start_at: '2026-08-31T03:45:00.000Z',
  };
  const result = reconcile(room, { ...room });
  assert.equal(result.mapChange, null);
  assert.equal(result.hostChanged, false);
});

test('reconciliation reports host handoff independently of map state', () => {
  const previous = { id: 'room-1', host_session_id: 'old', current_map_id: 'color', map_transition_id: 't1' };
  const next = { ...previous, host_session_id: 'new' };
  const result = reconcile(previous, next);
  assert.equal(result.hostChanged, true);
  assert.equal(result.mapChange, null);
});

test('a delayed duplicate broadcast is ignored after heartbeat already applied the transition', () => {
  assert.equal(typeof reconcileMapMessage, 'function');
  const room = {
    id: 'room-1', host_session_id: 'host', current_map_id: 'color',
    map_transition_id: 'transition-7', map_start_at: '2026-08-31T03:45:00.000Z',
  };
  const result = reconcileMapMessage(room, {
    mapId: 'color', hostSessionId: 'host', transitionId: 'transition-7',
    startAt: Date.parse('2026-08-31T03:45:00.000Z'),
  });
  assert.equal(result.mapChange, null);
  assert.equal(result.duplicate, true);
  assert.equal(result.room.map_transition_id, 'transition-7');
});

test('a genuinely new broadcast is applied exactly once', () => {
  assert.equal(typeof reconcileMapMessage, 'function');
  const room = {
    id: 'room-1', host_session_id: 'host', current_map_id: 'lobby',
    map_transition_id: null, map_start_at: null,
  };
  const result = reconcileMapMessage(room, {
    mapId: 'sky', hostSessionId: 'host', transitionId: 'transition-8',
    startAt: Date.parse('2026-08-31T03:46:00.000Z'),
  });
  assert.equal(result.duplicate, false);
  assert.equal(result.mapChange.mapId, 'sky');
  assert.equal(result.room.current_map_id, 'sky');
  assert.equal(result.room.map_transition_id, 'transition-8');
});

test('ordinary map selection ignores same-map and same-map in-flight requests', () => {
  assert.equal(typeof mapRequestDisposition, 'function');
  const room = { current_map_id: 'color' };
  assert.equal(mapRequestDisposition(room, 'color', null, false), 'same');
  assert.equal(mapRequestDisposition({ current_map_id: 'lobby' }, 'color', 'color', false), 'pending');
  assert.equal(mapRequestDisposition({ current_map_id: 'lobby' }, 'color', null, false), 'new');
});

test('explicit restart can force a new transition for the current map', () => {
  assert.equal(typeof mapRequestDisposition, 'function');
  assert.equal(mapRequestDisposition({ current_map_id: 'color' }, 'color', null, true), 'force');
});

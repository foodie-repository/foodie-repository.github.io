import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = 'https://qxtcyxocktjnourfhxje.supabase.co/functions/v1/room-control';
const key = 'sb_publishable_sD2a7qMG53CCemiVSN9hKQ_mRAclD5f';
const version = 'online-1.0.0';

async function call(action, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: key },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) throw new Error(`${action}: ${body?.error?.code || response.status} ${body?.error?.message || ''}`);
  return body.data;
}

const hostSession = randomUUID();
const guestSession = randomUUID();
const created = await call('create', { nickname: 'Host', sessionId: hostSession, version });
assert.match(created.room.code, /^[A-HJ-NP-Z2-9]{6}$/);
assert.equal(created.isHost, true);

const joined = await call('join', { code: created.room.code, nickname: 'Guest', sessionId: guestSession, version });
assert.equal(joined.room.id, created.room.id);
assert.equal(joined.members.length, 2);

const transitionId = randomUUID();
await call('set_map', {
  roomId: created.room.id,
  sessionId: hostSession,
  memberToken: created.memberToken,
  mapId: 'color',
  transitionId,
  startAt: new Date(Date.now() + 100).toISOString(),
});

const heartbeat = await call('heartbeat', {
  roomId: created.room.id,
  sessionId: guestSession,
  memberToken: joined.memberToken,
});
assert.equal(heartbeat.room.current_map_id, 'color');
assert.equal(heartbeat.members.length, 2);

await call('leave', { roomId: created.room.id, sessionId: guestSession, memberToken: joined.memberToken });
await call('leave', { roomId: created.room.id, sessionId: hostSession, memberToken: created.memberToken });
console.log(`edge smoke ok: ${created.room.code}`);

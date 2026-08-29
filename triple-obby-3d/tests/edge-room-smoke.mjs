import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const url = 'https://qxtcyxocktjnourfhxje.supabase.co/functions/v1/room-control';
const key = 'sb_publishable_sD2a7qMG53CCemiVSN9hKQ_mRAclD5f';
const version = 'online-1.0.0';

async function rawCall(action, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: key },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await response.json();
  return { response, body };
}

async function call(action, payload) {
  const { response, body } = await rawCall(action, payload);
  if (!response.ok || !body.ok) throw new Error(`${action}: ${body?.error?.code || response.status} ${body?.error?.message || ''}`);
  return body.data;
}

const sessions = [];
const hostSession = randomUUID();
const created = await call('create', { nickname: 'Host', sessionId: hostSession, version });
sessions.push({ sessionId: hostSession, token: created.memberToken });
assert.match(created.room.code, /^[A-HJ-NP-Z2-9]{6}$/);
assert.equal(created.isHost, true);

for (let index = 1; index <= 7; index += 1) {
  const sessionId = randomUUID();
  const joined = await call('join', {
    code: created.room.code,
    nickname: `Guest${index}`,
    sessionId,
    version,
  });
  sessions.push({ sessionId, token: joined.memberToken });
  assert.equal(joined.room.id, created.room.id);
  assert.equal(joined.members.length, index + 1);
}

const ninth = await rawCall('join', {
  code: created.room.code,
  nickname: 'Guest8',
  sessionId: randomUUID(),
  version,
});
assert.equal(ninth.response.status, 409);
assert.equal(ninth.body.ok, false);
assert.equal(ninth.body.error.code, 'ROOM_FULL');

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
  sessionId: sessions[1].sessionId,
  memberToken: sessions[1].token,
});
assert.equal(heartbeat.room.current_map_id, 'color');
assert.equal(heartbeat.members.length, 8);

for (const member of [...sessions].reverse()) {
  await call('leave', {
    roomId: created.room.id,
    sessionId: member.sessionId,
    memberToken: member.token,
  });
}
console.log(`edge smoke ok: ${created.room.code}, capacity 8/8 enforced`);

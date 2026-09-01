# Triple Obby 3D Online Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Triple Obby 3D with Supabase-backed six-character rooms for up to eight players, synchronized remote avatars and crumble blocks, camera-independent WASD movement, offline fallback, and shareable invite QR codes.

**Architecture:** Keep physics, collision, rendering, and movement authoritative on each browser. Add small pure JavaScript modules for input, protocol validation, interpolation, host election, and crumble state; connect them through a `RoomClient` that uses a JWT-verified Supabase Edge Function for room lifecycle and private Realtime channels for Presence/Broadcast. The camera controller may change only camera position, target, FOV, and local-avatar visibility; it must never read or mutate movement input.

**Tech Stack:** HTML5, CSS, JavaScript ES modules, Three.js 0.160.0, Node.js built-in test runner, Supabase Postgres/Auth/Realtime/Edge Functions, GitHub Pages, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-28-triple-obby-online-multiplayer-design.md`

## Global Constraints

- Preserve the public URL `https://foodie-repository.github.io/triple-obby-3d/`.
- Support room codes matching `^[A-HJ-NP-Z2-9]{6}$` and a maximum of 8 active players.
- Treat a member heartbeat older than 45 seconds as inactive; clients send heartbeats every 20 seconds.
- Keep all local movement in fixed world axes: W=`-Z`, S=`+Z`, A=`-X`, D=`+X`.
- Camera mode changes must not read, clear, rotate, or rewrite WASD state or player velocity.
- Never expose a Supabase `service_role` key in browser files.
- Require a valid Supabase JWT for the `room-control` Edge Function.
- Use private Realtime channels named `obby-room:<room-id>`.
- Use deterministic crumble IDs and the fixed transition `active → cracking 600ms → hidden 2500ms → active`.
- If networking fails, preserve local play and show an offline-solo status.
- Do not merge to `main` until unit tests, syntax checks, security advisors, two-client integration checks, and GitHub Pages deployment checks pass.

---

## File Map

- `triple-obby-3d/src/input-controller.mjs`: pure world-axis movement and immutable key-state updates.
- `triple-obby-3d/src/camera-modes.mjs`: pure camera-mode definitions; no input dependency.
- `triple-obby-3d/network/protocol.mjs`: message schemas, validators, room-code validation, sequence guards.
- `triple-obby-3d/network/room-state.mjs`: room reducer, connection/fallback state, host-election helper.
- `triple-obby-3d/network/interpolation.mjs`: remote-player sample buffer and interpolation.
- `triple-obby-3d/network/crumble-state.mjs`: deterministic IDs and shared block transitions.
- `triple-obby-3d/network/room-client.js`: Supabase auth, Edge Function calls, heartbeat, Realtime subscribe/reconnect.
- `triple-obby-3d/network/remote-player-manager.js`: Three.js avatars and interpolation rendering.
- `triple-obby-3d/network/crumble-sync.js`: bridge between game blocks and room messages.
- `triple-obby-3d/network/online-ui.js`: nickname, create/join/solo, members, invite link, status.
- `triple-obby-3d/network/invite-qr.js`: dynamic room URL and QR rendering.
- `triple-obby-3d/config.js`: public Supabase URL, publishable key, client version.
- `triple-obby-3d/online.css`: online lobby, status, member list, QR styles.
- `triple-obby-3d/index.html`: load Supabase client and online modules; add online lobby markup.
- `triple-obby-3d/game-*.part`, `camera-*.part`: expose game hooks and consume network events without coupling camera to movement.
- `triple-obby-3d/tests/*.test.mjs`: Node unit tests.
- `triple-obby-3d/tests/online-room.spec.mjs`: two-browser Playwright integration test.
- `supabase/migrations/*.sql`: room/member schema, functions, RLS, Realtime authorization, cleanup.
- `supabase/functions/room-control/index.ts`: authenticated room lifecycle API.
- `.github/workflows/triple-obby-online.yml`: unit, syntax, and browser tests.

---

### Task 1: Establish the Test Harness and World-Axis Input Contract

**Files:**
- Create: `package.json`
- Create: `triple-obby-3d/src/input-controller.mjs`
- Create: `triple-obby-3d/src/camera-modes.mjs`
- Create: `triple-obby-3d/tests/input-camera-independence.test.mjs`

**Interfaces:**
- Produces: `computeWorldMove(input): {x:number,y:0,z:number}`
- Produces: `updateKeyState(state, action): Readonly<InputState>`
- Produces: `CAMERA_MODES` and `nextCameraMode(currentId): CameraMode`
- Invariant: camera mode is not an argument to `computeWorldMove`.

- [ ] **Step 1: Write the failing movement/camera test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeWorldMove, updateKeyState } from '../src/input-controller.mjs';
import { CAMERA_MODES, nextCameraMode } from '../src/camera-modes.mjs';

test('WASD movement is identical in every camera mode', () => {
  const input = { forward: true, back: false, left: false, right: true, jump: false, sprint: false };
  const vectors = CAMERA_MODES.map(() => computeWorldMove(input));
  for (const vector of vectors) assert.deepEqual(vector, { x: Math.SQRT1_2, y: 0, z: -Math.SQRT1_2 });
});

test('camera cycling does not mutate held key state', () => {
  const held = Object.freeze({ forward: true, back: false, left: true, right: false, jump: false, sprint: false });
  const afterCamera = nextCameraMode('third');
  assert.equal(afterCamera.id, 'close');
  assert.deepEqual(held, { forward: true, back: false, left: true, right: false, jump: false, sprint: false });
  assert.deepEqual(updateKeyState(held, { key: 'jump', pressed: true }), { ...held, jump: true });
});
```

- [ ] **Step 2: Run the test and verify the expected module-not-found failure**

Run: `node --test triple-obby-3d/tests/input-camera-independence.test.mjs`

Expected: FAIL because `input-controller.mjs` and `camera-modes.mjs` do not exist.

- [ ] **Step 3: Implement the pure input module**

```js
export function computeWorldMove(input) {
  const x = Number(input.right) - Number(input.left);
  const z = Number(input.back) - Number(input.forward);
  const length = Math.hypot(x, z);
  if (length === 0) return { x: 0, y: 0, z: 0 };
  return { x: x / length, y: 0, z: z / length };
}

export function updateKeyState(state, { key, pressed }) {
  if (!Object.hasOwn(state, key)) throw new TypeError(`Unknown input key: ${key}`);
  return Object.freeze({ ...state, [key]: Boolean(pressed) });
}
```

- [ ] **Step 4: Implement camera definitions without importing the input module**

```js
export const CAMERA_MODES = Object.freeze([
  Object.freeze({ id: 'third', label: '3인칭', fov: 65 }),
  Object.freeze({ id: 'close', label: '근접', fov: 69 }),
  Object.freeze({ id: 'first', label: '1인칭', fov: 76 }),
  Object.freeze({ id: 'top', label: '탑뷰', fov: 58 }),
]);

export function nextCameraMode(currentId) {
  const index = CAMERA_MODES.findIndex(mode => mode.id === currentId);
  return CAMERA_MODES[(index + 1 + CAMERA_MODES.length) % CAMERA_MODES.length];
}
```

- [ ] **Step 5: Add the package test script and run green**

```json
{
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test triple-obby-3d/tests/*.test.mjs",
    "check": "node --check triple-obby-3d/network/*.js && node --check triple-obby-3d/*.js"
  },
  "devDependencies": {
    "@playwright/test": "1.55.0"
  }
}
```

Run: `npm test`

Expected: PASS with 2 tests and 0 failures.

- [ ] **Step 6: Commit**

```bash
git add package.json triple-obby-3d/src triple-obby-3d/tests/input-camera-independence.test.mjs
git commit -m "test: lock world-axis movement to camera-independent input"
```

---

### Task 2: Define and Test the Multiplayer Protocol and Room Reducer

**Files:**
- Create: `triple-obby-3d/network/protocol.mjs`
- Create: `triple-obby-3d/network/room-state.mjs`
- Create: `triple-obby-3d/tests/protocol-validation.test.mjs`
- Create: `triple-obby-3d/tests/room-state.test.mjs`

**Interfaces:**
- Produces: `normalizeRoomCode(value): string`
- Produces: `validatePlayerState(value): PlayerStateMessage`
- Produces: `acceptSequence(lastSeq, incomingSeq): boolean`
- Produces: `electHost(members): Member | null`
- Produces: `reduceRoomState(state, event): RoomState`

- [ ] **Step 1: Write failing protocol tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoomCode, validatePlayerState, acceptSequence } from '../network/protocol.mjs';

test('room code removes spaces, uppercases, and rejects ambiguous characters', () => {
  assert.equal(normalizeRoomCode(' ab2cd3 '), 'AB2CD3');
  assert.throws(() => normalizeRoomCode('AB10OI'));
});

test('player state validator rejects non-finite coordinates and oversized stage', () => {
  assert.throws(() => validatePlayerState({ type: 'player_state', sessionId: 's', seq: 1, sentAt: 1, mapId: 'sky', position: [NaN,0,0], velocity: [0,0,0], yaw: 0, grounded: true, stage: 1, animation: 'idle' }));
  assert.equal(acceptSequence(11, 12), true);
  assert.equal(acceptSequence(12, 12), false);
});
```

- [ ] **Step 2: Write failing room reducer tests**

```js
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
  const state = { connection: 'online', mapId: 'lava', members: [], error: null };
  assert.deepEqual(reduceRoomState(state, { type: 'SOCKET_LOST', reason: 'timeout' }), { connection: 'offline-solo', mapId: 'lava', members: [], error: 'timeout' });
});
```

- [ ] **Step 3: Run RED**

Run: `node --test triple-obby-3d/tests/protocol-validation.test.mjs triple-obby-3d/tests/room-state.test.mjs`

Expected: FAIL because the modules do not exist.

- [ ] **Step 4: Implement strict protocol validation**

Implement exact allowed maps `lobby|color|lava|sky`, animations `idle|run|jump|fall`, finite 3-vectors, integer sequence `0..2^31-1`, stage `1..20`, and room code regex `/^[A-HJ-NP-Z2-9]{6}$/`.

- [ ] **Step 5: Implement deterministic room reduction**

The reducer must handle `CONNECTING`, `JOINED`, `MEMBERS_SYNCED`, `MAP_CHANGED`, `SOCKET_LOST`, `RECONNECTED`, and `LEFT` without mutating the previous state.

- [ ] **Step 6: Run green and commit**

Run: `npm test`

Expected: PASS with all Task 1 and Task 2 tests.

```bash
git add triple-obby-3d/network/protocol.mjs triple-obby-3d/network/room-state.mjs triple-obby-3d/tests
git commit -m "feat: define validated room and realtime protocol"
```

---

### Task 3: Implement and Test Remote Interpolation and Shared Crumble State

**Files:**
- Create: `triple-obby-3d/network/interpolation.mjs`
- Create: `triple-obby-3d/network/crumble-state.mjs`
- Create: `triple-obby-3d/tests/player-interpolation.test.mjs`
- Create: `triple-obby-3d/tests/crumble-state.test.mjs`

**Interfaces:**
- Produces: `pushSample(buffer, sample, maxSamples=4): Sample[]`
- Produces: `interpolatePlayer(buffer, renderAt): InterpolatedState | null`
- Produces: `makeCrumbleId(mapId, stage, ordinal): string`
- Produces: `advanceCrumble(state, nowMs): CrumbleState`
- Produces: `applyAuthoritativeCrumble(state, message): CrumbleState`

- [ ] **Step 1: Write failing interpolation tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { pushSample, interpolatePlayer } from '../network/interpolation.mjs';

test('remote player interpolates between two ordered samples', () => {
  let buffer = [];
  buffer = pushSample(buffer, { sentAt: 1000, position: [0,0,0], yaw: 0 });
  buffer = pushSample(buffer, { sentAt: 1200, position: [10,0,0], yaw: Math.PI });
  const state = interpolatePlayer(buffer, 1100);
  assert.deepEqual(state.position, [5,0,0]);
  assert.ok(Math.abs(state.yaw - Math.PI / 2) < 1e-9);
});
```

- [ ] **Step 2: Write failing crumble tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeCrumbleId, advanceCrumble, applyAuthoritativeCrumble } from '../network/crumble-state.mjs';

test('crumble id is deterministic and state follows 600ms/2500ms timings', () => {
  assert.equal(makeCrumbleId('sky', 12, 3), 'sky:crumble:12:03');
  const cracking = applyAuthoritativeCrumble({ state: 'active', transitionId: null }, { state: 'cracking', transitionId: 't1', effectiveAt: 1000, respawnAt: 4100 });
  assert.equal(advanceCrumble(cracking, 1600).state, 'hidden');
  assert.equal(advanceCrumble(cracking, 4100).state, 'active');
});
```

- [ ] **Step 3: Run RED, implement linear interpolation with shortest-angle yaw, implement idempotent crumble transitions, run green, and commit**

Run: `npm test`

```bash
git add triple-obby-3d/network/interpolation.mjs triple-obby-3d/network/crumble-state.mjs triple-obby-3d/tests
git commit -m "feat: add remote interpolation and shared crumble state machine"
```

---

### Task 4: Create the Supabase Schema, Authorization, and Room-Control Edge Function

**Files:**
- Create: `supabase/migrations/202608280001_create_obby_rooms.sql`
- Create: `supabase/migrations/202608280002_create_obby_room_members.sql`
- Create: `supabase/migrations/202608280003_add_realtime_policies.sql`
- Create: `supabase/migrations/202608280004_add_cleanup_job.sql`
- Create: `supabase/functions/room-control/index.ts`
- Create: `supabase/functions/room-control/deno.json`

**Interfaces:**
- Edge Function endpoint: `POST /functions/v1/room-control`
- Actions: `create`, `join`, `heartbeat`, `set_map`, `claim_host`, `leave`
- Every action returns `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.

- [ ] **Step 1: Write the room tables and server functions**

Create `obby_rooms` and `obby_room_members` exactly as specified, plus SQL functions:

```sql
create or replace function public.obby_active_member_count(p_room_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.obby_room_members
  where room_id = p_room_id
    and last_seen_at >= now() - interval '45 seconds';
$$;
```

Create `obby_cleanup_room_members(p_room_id uuid)` to delete stale members and `obby_elected_host(p_room_id uuid)` to return the oldest active member ordered by `joined_at, session_id`.

- [ ] **Step 2: Enable RLS and deny direct browser writes**

Enable RLS on both tables. Grant no direct insert/update/delete policy to authenticated users. Add select policies limited to active membership in the requested room. Add private Realtime authorization policies on `realtime.messages` that parse the room UUID from topic `obby-room:<uuid>` and require an active member row for `auth.uid()`.

- [ ] **Step 3: Implement the JWT-verified Edge Function**

The function must:

```ts
const authHeader = req.headers.get('Authorization');
if (!authHeader?.startsWith('Bearer ')) return jsonError(401, 'AUTH_REQUIRED', '로그인이 필요합니다.');
const { data: { user }, error } = await supabaseAuth.auth.getUser(authHeader.slice(7));
if (error || !user) return jsonError(401, 'AUTH_INVALID', '인증 정보를 확인할 수 없습니다.');
```

Use a service-role client only inside the function. Validate nickname `/^[^<>]{2,12}$/`, session UUID, room code, version, and map ID. For join, call stale-member cleanup and then enforce `obby_active_member_count < max_players`. For `set_map`, update only when `host_session_id = sessionId`. For `claim_host`, compare the caller to `obby_elected_host` and update with `where host_session_id = previousHost` to guarantee one winner.

- [ ] **Step 4: Apply migrations and deploy with `verify_jwt=true`**

Use the Supabase migration tool in timestamp order. Deploy function files with entrypoint `index.ts` and `verify_jwt: true`.

- [ ] **Step 5: Verify the database contract**

Execute assertions that:

```sql
select public.obby_active_member_count(gen_random_uuid()) = 0 as empty_room_is_zero;
select 'ABC234' ~ '^[A-HJ-NP-Z2-9]{6}$' as valid_code;
select not ('AB10OI' ~ '^[A-HJ-NP-Z2-9]{6}$') as ambiguous_code_rejected;
```

Expected: all three booleans are `true`.

- [ ] **Step 6: Run Supabase security and performance advisors and commit**

Resolve every high-severity security finding before continuing.

```bash
git add supabase
git commit -m "feat: add authenticated Supabase room backend"
```

---

### Task 5: Build the Browser Room Client and Online Lobby UI

**Files:**
- Create: `triple-obby-3d/config.js`
- Create: `triple-obby-3d/network/room-client.js`
- Create: `triple-obby-3d/network/online-ui.js`
- Create: `triple-obby-3d/network/invite-qr.js`
- Create: `triple-obby-3d/online.css`
- Modify: `triple-obby-3d/index.html`
- Modify: `triple-obby-3d/loader-camera.js`

**Interfaces:**
- Produces: `window.TripleObbyOnline.roomClient`
- Emits DOM `CustomEvent`s: `obby:room-joined`, `obby:members`, `obby:map-change`, `obby:player-state`, `obby:block-trigger`, `obby:block-state`, `obby:offline-solo`.
- Produces: `createInviteUrl(baseUrl, roomCode): string` and `renderInviteQr(canvas, url): void`.

- [ ] **Step 1: Add online lobby markup**

Add nickname input, solo/create/join buttons, 6-character code input, connection status, member count/list, room code, copy link button, and QR canvas. Use labels and `aria-live` for status messages.

- [ ] **Step 2: Configure the public Supabase client**

```js
window.TRIPLE_OBBY_CONFIG = Object.freeze({
  version: 'online-1.0.0',
  supabaseUrl: 'PROJECT_URL_FROM_TOOL',
  supabasePublishableKey: 'PUBLISHABLE_KEY_FROM_TOOL',
  maxPlayers: 8,
  heartbeatMs: 20_000,
  staleMemberMs: 45_000,
});
```

Only the publishable key belongs in this file.

- [ ] **Step 3: Implement auth and room lifecycle**

`RoomClient.initialize()` calls `supabase.auth.signInAnonymously()` when no session exists. `createRoom`, `joinRoom`, `heartbeat`, `setMap`, `claimHost`, and `leave` call the Edge Function with the access token. The client persists `nickname` and `sessionId` in `sessionStorage`, not `localStorage`.

- [ ] **Step 4: Implement private Realtime subscription and reconnect**

Subscribe with:

```js
supabase.channel(`obby-room:${roomId}`, {
  config: { private: true, presence: { key: sessionId }, broadcast: { self: false, ack: false } },
});
```

Track Presence after `SUBSCRIBED`. Retry after 1s, 2s, 4s, then 10s. After 30 seconds, emit `obby:offline-solo`; keep retrying in the background and request a snapshot when reconnected.

- [ ] **Step 5: Implement invitation links and QR**

Use URLSearchParams to produce `?room=ABC234`. On page load, prefill the code from the URL but do not auto-join until the nickname is valid. Render QR locally in the browser; never send room codes to a third-party QR service.

- [ ] **Step 6: Syntax-check and commit**

Run: `node --check triple-obby-3d/network/room-client.js && node --check triple-obby-3d/network/online-ui.js && node --check triple-obby-3d/network/invite-qr.js`

```bash
git add triple-obby-3d/index.html triple-obby-3d/config.js triple-obby-3d/online.css triple-obby-3d/network triple-obby-3d/loader-camera.js
git commit -m "feat: add online room lobby and invite QR"
```

---

### Task 6: Render Remote Players and Synchronize Map State

**Files:**
- Create: `triple-obby-3d/network/remote-player-manager.js`
- Create: `triple-obby-3d/network/player-sync.js`
- Create: `triple-obby-3d/network/host-coordinator.js`
- Modify: `triple-obby-3d/game-01.part`
- Modify: `triple-obby-3d/game-03.part`
- Modify: `triple-obby-3d/camera-tail-01.part`

**Interfaces:**
- Game hook: `getLocalPlayerSnapshot(): PlayerStateMessage`
- Game hook: `startMapFromNetwork(mapId, transitionId, startAt): void`
- Remote manager: `upsertMember(meta)`, `pushState(message)`, `update(nowMs)`, `remove(sessionId)`.

- [ ] **Step 1: Extract a local snapshot hook**

Expose only serializable values: map, position, velocity, yaw, grounded, stage, animation. Do not include camera mode or key state.

- [ ] **Step 2: Broadcast at no more than 10Hz**

Send only when position moved at least 0.02m, yaw changed at least 0.02 rad, animation changed, stage changed, or 500ms elapsed.

- [ ] **Step 3: Create remote avatars**

Use one Three.js group per session with a deterministic color from the session ID. Add a sprite or CSS2D-like canvas label for nickname. Apply 100ms interpolation; freeze after 1 second without a packet and hide after 5 seconds.

- [ ] **Step 4: Make map choice host-authoritative**

Host map button: call `set_map`; on success broadcast `map_change`. Non-host buttons are disabled. Every client ignores a `map_change` whose `hostSessionId` differs from the server-known host.

- [ ] **Step 5: Implement host handoff**

On Presence sync, calculate the candidate. The candidate calls `claim_host`; after success it broadcasts `host_claim` and the current map/block snapshot. Losers refresh room state and remain clients.

- [ ] **Step 6: Run unit tests and commit**

```bash
npm test
git add triple-obby-3d/network triple-obby-3d/game-*.part triple-obby-3d/camera-tail-01.part
git commit -m "feat: synchronize remote players and host-controlled maps"
```

---

### Task 7: Synchronize Deterministic Crumble Blocks

**Files:**
- Create: `triple-obby-3d/network/crumble-sync.js`
- Modify: `triple-obby-3d/game-02.part`
- Modify: `triple-obby-3d/game-03.part`
- Modify: `triple-obby-3d/game-04.part`
- Modify: `triple-obby-3d/game-05.part`

**Interfaces:**
- Every crumble platform has `networkId: makeCrumbleId(mapId, stage, ordinal)`.
- Game hook: `applyNetworkCrumble(blockId, state, effectiveAt, respawnAt): void`.
- Host validates `block_trigger` using last known player position and block center distance <= 2.5m.

- [ ] **Step 1: Assign deterministic IDs during map construction**

Increment an ordinal within each stage, not globally. Rebuilding the same map must yield the same IDs in the same order.

- [ ] **Step 2: Replace direct local crumble timing in online rooms**

Solo mode keeps the existing local trigger. Online non-host sends `block_trigger` and waits for host authority. Host applies locally and broadcasts `block_state` with UUID transition ID and absolute timestamps.

- [ ] **Step 3: Add snapshot recovery**

Host tracks only non-active blocks. On `snapshot_request`, broadcast `{ type:'room_snapshot', mapId, transitionId, blocks:[...] }`. Receiver applies only entries whose `respawnAt > Date.now()`.

- [ ] **Step 4: Test duplicate and late messages**

Add assertions that the same transition ID is applied once and that an older effective timestamp cannot overwrite a newer transition.

- [ ] **Step 5: Run tests and commit**

```bash
npm test
git add triple-obby-3d/network/crumble-sync.js triple-obby-3d/game-*.part triple-obby-3d/tests
git commit -m "feat: synchronize authoritative crumble blocks"
```

---

### Task 8: Integrate Camera-Independent Input into the Running Game

**Files:**
- Modify: `triple-obby-3d/index.html`
- Modify: `triple-obby-3d/camera-prelude.part`
- Modify: `triple-obby-3d/camera-tail-01.part`
- Modify: `triple-obby-3d/camera-tail-02.part`
- Modify: `triple-obby-3d/camera-tail-03.part`
- Modify: `triple-obby-3d/game-05.part`

**Interfaces:**
- The runtime imports or receives `computeWorldMove` from the pure module.
- Camera button calls only `cycleCameraMode()`.
- Keyboard `C` calls only `cycleCameraMode()` and does not call `blur`, reset input, or release pointer capture.

- [ ] **Step 1: Replace inline movement math with `computeWorldMove(input)`**

Apply its `x` and `z` output directly to target velocity. Do not rotate by camera quaternion or player yaw.

- [ ] **Step 2: Isolate camera state**

Camera module owns `cameraMode`, `camera.fov`, `camera.position`, `cameraTarget`, and `playerGroup.visible`. It cannot import `input-controller.mjs` and receives only `{ playerPosition, playerYaw, dt }`.

- [ ] **Step 3: Prevent button focus from interrupting movement**

On the camera button:

```js
viewBtn.addEventListener('pointerdown', event => event.preventDefault());
viewBtn.addEventListener('click', event => {
  event.preventDefault();
  cycleCameraMode();
});
```

Do not invoke `window.blur()` and do not mutate the held-key object.

- [ ] **Step 4: Add a static dependency test**

Read the camera source and assert it does not contain `input.forward`, `input.back`, `input.left`, `input.right`, `computeWorldMove(`, or `player.vel.x =`.

- [ ] **Step 5: Run tests and commit**

```bash
npm test
npm run check
git add triple-obby-3d
git commit -m "fix: decouple camera switching from WASD movement"
```

---

### Task 9: Add CI, Two-Client Browser Tests, Deploy, and Regenerate QR

**Files:**
- Create: `.github/workflows/triple-obby-online.yml`
- Create: `triple-obby-3d/tests/online-room.spec.mjs`
- Update: `triple-obby-3d/qr.svg`
- Update: `README.md` or create `triple-obby-3d/README.md`

**Interfaces:**
- CI runs Node 22, `npm ci`, `npm test`, `npm run check`, Playwright Chromium.
- E2E uses a real configured Supabase project and two isolated browser contexts.

- [ ] **Step 1: Write the two-browser integration test**

The test must create a room in browser A, join via code in browser B, wait for two member names, move A and observe B's remote avatar position change, hold `W` while B cycles camera, verify B's local Z continues decreasing, trigger a crumble block and observe matching hidden state, then close A and confirm B becomes host.

- [ ] **Step 2: Add the GitHub Actions workflow**

```yaml
name: Triple Obby Online
on:
  pull_request:
    paths: ['triple-obby-3d/**', 'supabase/**', 'package.json', '.github/workflows/triple-obby-online.yml']
  push:
    branches: [main]
    paths: ['triple-obby-3d/**', 'supabase/**', 'package.json']
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test
      - run: npm run check
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test triple-obby-3d/tests/online-room.spec.mjs
```

- [ ] **Step 3: Run all verification locally or in CI**

Required evidence:

```text
npm test: 0 failures
npm run check: exit 0
Playwright: 1 passed
Supabase security advisors: no unresolved high severity
Supabase performance advisors: reviewed
Edge Function logs: no 5xx during create/join/move/leave test
```

- [ ] **Step 4: Open and review a pull request**

Create PR from `feature/triple-obby-online` to `main`. Review file list, ensure no service-role key or secret is present, and merge only after CI succeeds.

- [ ] **Step 5: Verify GitHub Pages and QR**

Open `https://foodie-repository.github.io/triple-obby-3d/?v=online-1.0.0`. Verify the online lobby, create/join flow, camera button, three maps, kill floors, remodeled sky islands, and cracked crumble blocks. Regenerate `qr.svg` for the canonical URL and verify a decoded scan equals exactly:

```text
https://foodie-repository.github.io/triple-obby-3d/
```

- [ ] **Step 6: Commit documentation and release evidence**

```bash
git add .github/workflows/triple-obby-online.yml triple-obby-3d/tests/online-room.spec.mjs triple-obby-3d/qr.svg triple-obby-3d/README.md
git commit -m "test: verify and document Triple Obby online release"
```

# 유한의 계단 Supabase 방 코드 온라인 1대1 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 복원된 2,000계단 게임에 로그인 화면 없는 닉네임·6자리 방 코드 온라인 1대1을 추가하고, 먼저 실패한 플레이어가 지는 결과를 Supabase에서 원자적으로 확정한다.

**Architecture:** 브라우저는 Supabase anonymous auth로 보이지 않는 세션을 만들고, PostgreSQL RPC로 방·자리·시작·결과·재대결을 원자 처리한다. 빠른 진행 상태는 private Realtime Broadcast, 접속 여부는 Presence, 재접속 기준 상태는 `room_players` 스냅샷에 저장한다. 클라이언트는 로컬 입력을 즉시 렌더링하되 서버가 최초로 기록한 종료 결과만 최종 결과로 표시한다.

**Tech Stack:** React 19, TypeScript, Supabase JS, Supabase Auth anonymous sign-in, PostgreSQL, Row Level Security, Realtime Broadcast/Presence, Vitest, pgTAP/SQL assertions, Playwright

**Spec:** `docs/superpowers/specs/2026-09-01-finite-stairs-multiplayer-design.md`

**Prerequisite:** `docs/superpowers/plans/2026-09-02-finite-stairs-core.md`가 완료되어 `games/finite-stairs/` 원본 프로젝트와 2,000계단 엔진이 존재해야 한다.

## Global Constraints

- Supabase는 다른 게임과 분리된 `finite-stairs-online` 프로젝트를 서울 리전에 만든다.
- 프로젝트를 만들기 전에 예상 비용을 조회하고 사용자에게 금액을 보여 준 뒤 명시적으로 승인받는다.
- 화면에는 가입·로그인 절차를 노출하지 않고 anonymous auth 세션을 사용한다.
- 온라인 경기 결과는 싱글 최고 기록·체크포인트·코인에 합산하지 않는다.
- 브라우저에는 project URL과 publishable key만 포함하며 service role key를 저장소·번들·로그에 넣지 않는다.
- 방 코드는 혼동 문자를 뺀 `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`에서 만든 6자리 대문자 코드다.
- 닉네임은 공백 정리 후 2~12자이고 제어문자와 `<`·`>`를 거부한다.
- 한 방은 host와 guest 두 자리만 허용하고 세 번째 참가를 원자적으로 거부한다.
- 두 플레이어는 같은 seed와 server `start_at`으로 시작한다.
- 먼저 추락하거나 시간 초과된 플레이어가 패배하고, 아무도 실패하지 않으면 먼저 2,000계단에 도착한 플레이어가 승리한다.
- 무승부는 없으며 최초 성공한 `report_finish` RPC가 결과를 고정한다.
- 상대 캐릭터는 같은 계단 좌표에 55% 불투명도로 표시한다.
- 연결 끊김은 10초 유예 후 서버가 `last_seen_at`을 확인해 패배 처리한다.
- 재대결은 두 명이 모두 동의할 때 같은 room code, 증가한 match number, 새 seed로 시작한다.
- 기존 공개 주소와 QR은 바꾸지 않는다.

---

## File Map

- `games/finite-stairs/supabase/migrations/`: 테이블, RLS, RPC, Realtime 정책, 정리 함수
- `games/finite-stairs/supabase/tests/`: 두 자리 제한, 권한, 승패 원자성, 재대결 SQL 테스트
- `games/finite-stairs/src/multiplayer/`: 환경 설정, 익명 세션, 메시지 검증, Supabase room client
- `games/finite-stairs/src/screens/MultiplayerLobby.tsx`: 만들기·참가·대기실
- `games/finite-stairs/src/screens/MultiplayerGameScreen.tsx`: 공통 게임 엔진과 온라인 조정
- `games/finite-stairs/e2e/multiplayer.spec.ts`: 두 browser context 경기

### Task 1: Supabase 비용 승인과 브라우저 설정 경계

**Files:**
- Modify: `games/finite-stairs/package.json`
- Modify: `games/finite-stairs/package-lock.json`
- Create: `games/finite-stairs/.env.example`
- Create: `games/finite-stairs/src/multiplayer/config.ts`
- Create: `games/finite-stairs/src/multiplayer/config.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: user-approved Supabase project URL and publishable key
- Produces: `getSupabaseConfig(env): SupabaseConfig`, local untracked `.env.local`, project ref for migrations

- [ ] **Step 1: 프로젝트 생성 전 예상 비용 조회**

Supabase 관리 도구로 서울 리전의 새 프로젝트 예상 비용을 조회한다. 조회 결과의 통화·금액·청구 주기를 사용자에게 그대로 보여 주고 프로젝트 생성 승인을 요청한다. 승인 전에는 project create 호출을 실행하지 않는다.

- [ ] **Step 2: 승인 후 전용 프로젝트 생성**

승인받은 비용 확인 토큰을 사용해 organization 안에 `finite-stairs-online`, region `ap-northeast-2` 프로젝트를 생성한다. 프로젝트가 healthy가 될 때까지 상태를 확인하고 Auth provider 설정에서 anonymous sign-in을 활성화한다. project URL과 publishable key만 가져온다.

- [ ] **Step 3: 환경 누락 실패 테스트 작성**

```ts
it('rejects a missing or service-role-like browser configuration', () => {
  expect(() => getSupabaseConfig({})).toThrow('온라인 게임 설정이 없습니다');
  expect(() => getSupabaseConfig({
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_PUBLISHABLE_KEY: 'service_role.secret'
  })).toThrow('publishable key');
});
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `npm test -- --run src/multiplayer/config.test.ts`
Expected: FAIL because config module and Supabase dependency do not exist.

- [ ] **Step 5: 환경 경계 구현**

`.env.example`에는 값 없이 `VITE_SUPABASE_URL=`과 `VITE_SUPABASE_PUBLISHABLE_KEY=` 두 이름만 둔다. `.env.local`을 `.gitignore`에 추가한다. `getSupabaseConfig`는 HTTPS `*.supabase.co` URL과 비어 있지 않은 publishable key를 검증하고 `service_role` 문자열을 거부한다. `@supabase/supabase-js`를 설치한다.

- [ ] **Step 6: 설정 테스트와 비밀 스캔**

Run: `npm test -- --run src/multiplayer/config.test.ts && rg -n "service_role|SUPABASE_SERVICE" games/finite-stairs --glob '!package-lock.json'`
Expected: tests PASS; only the intentional rejection test and this plan document reference service role, with no credential value.

- [ ] **Step 7: 설정 경계 커밋**

```bash
git add .gitignore games/finite-stairs/package.json games/finite-stairs/package-lock.json games/finite-stairs/.env.example games/finite-stairs/src/multiplayer
git commit -m "build: configure finite stairs Supabase client"
```

### Task 2: 방·플레이어 스키마와 RLS

**Files:**
- Create: `games/finite-stairs/supabase/migrations/202609020001_rooms.sql`
- Create: `games/finite-stairs/supabase/migrations/202609020002_rls.sql`
- Create: `games/finite-stairs/supabase/tests/rooms_rls.test.sql`

**Interfaces:**
- Consumes: `auth.uid()` anonymous user
- Produces: `rooms`, `room_players`, enums/check constraints, participant-only SELECT policies, own-row UPDATE policy

- [ ] **Step 1: 스키마·권한 실패 SQL 테스트 작성**

```sql
begin;
select plan(5);
select has_table('public', 'rooms', 'rooms exists');
select has_table('public', 'room_players', 'room_players exists');
select col_is_unique('public', 'rooms', 'code', 'room code unique');
select policies_are('public', 'rooms', array['participants_read_rooms'], 'rooms RLS policy');
select policies_are('public', 'room_players', array['participants_read_players', 'players_update_self'], 'players RLS policies');
select * from finish();
rollback;
```

- [ ] **Step 2: 테스트가 테이블 부재로 실패하는지 확인**

Run: `supabase test db games/finite-stairs/supabase/tests/rooms_rls.test.sql`
Expected: FAIL because `rooms` and `room_players` do not exist.

- [ ] **Step 3: 스키마 구현**

`rooms`에는 spec의 id, code, status, seed, match_number, host/guest, start/winner/loser, finish_reason, ended/expires, version과 timestamps를 만든다. `room_players`에는 room/user 복합 PK, unique(room_id, slot), nickname, character_id, step 0~2000, facing -1/1, state, ready, rematch_ready, last_seen_at을 만든다. status/state/reason은 check constraint로 허용 값만 받는다. 모든 FK는 `auth.users(id)` 또는 `rooms(id)`를 참조하고 방 삭제 시 player 행도 cascade 삭제한다.

- [ ] **Step 4: RLS와 private Realtime 권한 구현**

두 테이블 RLS를 켠다. participant 판정은 현재 uid가 host/guest인지를 검사하는 `security definer` helper로 재귀 RLS를 피한다. rooms와 두 player 행은 참가자만 읽고, player 직접 UPDATE는 자기 행의 step/facing/state/last_seen_at만 허용한다. `realtime.messages` 정책은 topic의 room UUID 참가자만 private Broadcast/Presence를 읽고 보낼 수 있게 한다.

- [ ] **Step 5: 원격 migration 적용과 테스트**

Run: Supabase migration apply for `202609020001_rooms.sql` and `202609020002_rls.sql`, then execute `rooms_rls.test.sql` as test role.
Expected: 5 SQL assertions PASS; a third anonymous uid cannot select either room or player rows.

- [ ] **Step 6: 스키마 커밋**

```bash
git add games/finite-stairs/supabase
git commit -m "feat: add multiplayer room schema and RLS"
```

### Task 3: 방·시작·최초 승패·재대결 RPC

**Files:**
- Create: `games/finite-stairs/supabase/migrations/202609020003_room_rpcs.sql`
- Create: `games/finite-stairs/supabase/migrations/202609020004_cleanup.sql`
- Create: `games/finite-stairs/supabase/tests/room_rpcs.test.sql`

**Interfaces:**
- Consumes: authenticated uid, nickname, character, room code, step, facing, match number
- Produces: `create_room`, `join_room`, `set_ready`, `start_match`, `begin_match`, `save_snapshot`, `report_finish`, `claim_disconnect_win`, `request_rematch`, `leave_room`

- [ ] **Step 1: 원자성 실패 테스트 작성**

SQL 테스트에서 host·guest·third user를 만든 뒤 다음을 검증한다.

```sql
select is((select code ~ '^[A-HJ-NP-Z2-9]{6}$' from create_room('호스트', 'mint')), true, 'six-char code');
select lives_ok($$ select join_room(:code, '게스트', 'sunset') $$, 'guest joins');
select throws_ok($$ select join_room(:code, '세번째', 'mint') $$, 'P0001', 'ROOM_FULL', 'third user rejected');
select is((select loser_user_id = :host from report_finish(:room_id, 'fall', 73, 1)), true, 'first fall loses');
select is((select loser_user_id = :host from report_finish(:room_id, 'fall', 74, 1)), true, 'later report cannot flip result');
```

재대결은 한 명 동의 시 match_number가 그대로이고 두 명 동의 후 1 증가하며 winner/loser가 null, status가 waiting, seed가 바뀌는지 검사한다. 연결 끊김은 last_seen_at이 10초보다 최신이면 거부하고 오래됐을 때만 남은 사용자를 winner로 정한다. `pg_cron`과 `finite-stairs-expire-rooms` 5분 작업이 존재하는지도 검사한다.

- [ ] **Step 2: RPC 테스트 실패 확인**

Run: execute `room_rpcs.test.sql` before migration.
Expected: FAIL with missing functions.

- [ ] **Step 3: 방과 참가 RPC 구현**

모든 함수는 `security definer`, 고정 `search_path = public, auth`, `auth.uid()` null 거부를 사용한다. `create_room`은 허용 alphabet에서 cryptographic random 6자를 만들고 unique 충돌 시 최대 8회 재시도한다. `join_room`은 `select ... for update`로 방을 잠근 뒤 waiting·not expired·guest null 조건을 한 transaction에서 확인한다. 닉네임 정규화 함수는 trim 후 2~12자와 금지문자를 검사한다.

- [ ] **Step 4: 경기·결과 RPC 구현**

`start_match`는 두 ready가 true일 때 `start_at = clock_timestamp() + interval '3 seconds'`, status countdown을 한 번만 기록한다. `begin_match(room_id, match_number)`는 `clock_timestamp() >= start_at`일 때 countdown을 playing으로 원자 전환하고 여러 호출에 같은 방 상태를 반환한다. `save_snapshot(room_id, match_number, step, facing, state)`는 참가자의 자기 행과 heartbeat만 갱신한다. `report_finish(room_id, reason, step, match_number)`는 `rooms where status = 'playing' and match_number = input for update`를 잠그고 최초 호출만 finished로 바꾼다. reason fall/timeout은 caller loser·other winner, goal은 caller winner·other loser로 저장하며 이후 호출은 기존 결과를 반환한다.

- [ ] **Step 5: 연결 끊김·재대결·만료 구현**

`claim_disconnect_win`은 상대 `last_seen_at <= now() - interval '10 seconds'`와 호출자 heartbeat를 검사한다. `request_rematch`는 자기 flag를 true로 하고 둘 다 true이면 새 seed, match_number+1, 모든 경기 필드와 player progress를 초기화한다. `leave_room`은 waiting에서는 자리만 정리하고, countdown/playing 중 명시적으로 나간 caller는 즉시 disconnect 패배로 확정한다. `202609020004_cleanup.sql`은 `pg_cron`을 활성화하고 `expire_stale_rooms()`를 5분마다 실행한다. 이 함수는 waiting 15분, countdown/playing heartbeat 30분, finished 10분 규칙으로 expired 처리 후 삭제한다.

- [ ] **Step 6: SQL 테스트 통과 확인**

Run: apply migration and execute `room_rpcs.test.sql` twice from a clean test transaction.
Expected: room capacity, validation, first-write-wins, goal/fall/timeout/disconnect, two-party rematch assertions all PASS.

- [ ] **Step 7: RPC 커밋**

```bash
git add games/finite-stairs/supabase
git commit -m "feat: add atomic multiplayer room RPCs"
```

### Task 4: 메시지 프로토콜·익명 세션·RoomClient

**Files:**
- Create: `games/finite-stairs/src/multiplayer/protocol.ts`
- Create: `games/finite-stairs/src/multiplayer/protocol.test.ts`
- Create: `games/finite-stairs/src/multiplayer/session.ts`
- Create: `games/finite-stairs/src/multiplayer/roomClient.ts`
- Create: `games/finite-stairs/src/multiplayer/roomClient.test.ts`

**Interfaces:**
- Consumes: Supabase client, room ID, match number, user ID
- Produces: `ensureAnonymousSession()`, `RoomClient`, validated realtime events, stale-message rejection

- [ ] **Step 1: protocol 실패 테스트 작성**

```ts
it('rejects another match and a non-increasing sequence', () => {
  const gate = createMessageGate({ roomId: 'room-a', matchNumber: 4, senderId: 'guest' });
  expect(gate.accept(playerState({ roomId: 'room-a', matchNumber: 3, sequence: 10 }))).toBe(false);
  expect(gate.accept(playerState({ roomId: 'room-a', matchNumber: 4, sequence: 10 }))).toBe(true);
  expect(gate.accept(playerState({ roomId: 'room-a', matchNumber: 4, sequence: 10 }))).toBe(false);
});
```

- [ ] **Step 2: protocol 테스트 실패 확인**

Run: `npm test -- --run src/multiplayer/protocol.test.ts src/multiplayer/roomClient.test.ts`
Expected: FAIL because protocol and client modules do not exist.

- [ ] **Step 3: exact message union과 런타임 검증 구현**

```ts
export type RoomMessage =
  | { type: 'player_state'; roomId: string; matchNumber: number; senderId: string; sequence: number; sentAt: string; step: number; facing: -1 | 1; state: 'playing' | 'falling' | 'finished' }
  | { type: 'fall_started'; roomId: string; matchNumber: number; senderId: string; sequence: number; sentAt: string; direction: -1 | 1; reason: 'fall' | 'timeout' }
  | { type: 'countdown_started'; roomId: string; matchNumber: number; senderId: string; sequence: number; sentAt: string; startAt: string; seed: number }
  | { type: 'match_finished'; roomId: string; matchNumber: number; senderId: string; sequence: number; sentAt: string; winnerUserId: string; loserUserId: string; reason: 'fall' | 'timeout' | 'goal' | 'disconnect' }
  | { type: 'ready_changed' | 'rematch_changed'; roomId: string; matchNumber: number; senderId: string; sequence: number; sentAt: string };
```

`parseRoomMessage(unknown)`은 UUID, 0~2000 step, direction, sequence, ISO timestamp, union별 필드를 검사한다. `createMessageGate`는 다른 room/match, 자기 echo, sender별 이전 이하 sequence를 거부한다.

- [ ] **Step 4: 익명 세션과 RoomClient 구현**

`ensureAnonymousSession`은 existing session을 먼저 읽고 없을 때만 `signInAnonymously()`를 호출한다. `RoomClient`는 `createRoom`, `joinRoom`, `setReady`, `beginMatch`, `saveSnapshot`, `reportFinish`, `claimDisconnectWin`, `requestRematch`, `leaveRoom`, `subscribe`를 제공한다. subscribe는 private `room:<room-id>` 채널에서 Broadcast와 Presence를 등록하고 cleanup 시 unsubscribe한다. outgoing sequence는 match마다 1부터 증가한다.

- [ ] **Step 5: fake Supabase client 테스트 통과 확인**

Run: `npm test -- --run src/multiplayer/protocol.test.ts src/multiplayer/roomClient.test.ts`
Expected: anonymous-session reuse, RPC arguments, private channel, sequence filtering, cleanup tests PASS.

- [ ] **Step 6: 클라이언트 기반 커밋**

```bash
git add games/finite-stairs/src/multiplayer
git commit -m "feat: add validated Supabase room client"
```

### Task 5: 방 만들기·코드 참가·대기실 UI

**Files:**
- Modify: `games/finite-stairs/src/app/App.tsx`
- Create: `games/finite-stairs/src/screens/MultiplayerLobby.tsx`
- Create: `games/finite-stairs/src/screens/MultiplayerLobby.test.tsx`
- Create: `games/finite-stairs/src/multiplayer/useLobby.ts`
- Modify: `games/finite-stairs/src/styles/global.css`

**Interfaces:**
- Consumes: `RoomClient`, Profile selected character
- Produces: nickname/code form, waiting room, `onMatchStart({ room, players })`

- [ ] **Step 1: 사용자 흐름 실패 테스트 작성**

```tsx
it('creates a room and exposes a copyable six-character code', async () => {
  roomClient.createRoom.mockResolvedValue(roomFixture({ code: '7KQ9MP' }));
  render(<MultiplayerLobby roomClient={roomClient} characterId="mint" />);
  await user.type(screen.getByLabelText('닉네임'), '푸디');
  await user.click(screen.getByRole('button', { name: '방 만들기' }));
  expect(await screen.findByText('7KQ9MP')).toBeVisible();
  expect(screen.getByRole('button', { name: '방 코드 복사' })).toBeEnabled();
});
```

세 번째 참가 `ROOM_FULL`, 만료 `ROOM_EXPIRED`, 잘못된 코드 `ROOM_NOT_FOUND`, 닉네임 오류를 각각 한국어 문구로 매핑하는 테스트를 추가한다.

- [ ] **Step 2: lobby 테스트 실패 확인**

Run: `npm test -- --run src/screens/MultiplayerLobby.test.tsx`
Expected: FAIL because lobby components do not exist.

- [ ] **Step 3: 만들기·참가 폼 구현**

홈의 `친구와 1대1`이 lobby로 이동한다. 닉네임은 이전 성공 값을 localStorage에 저장하되 방 코드는 저장하지 않는다. code 입력은 대문자 변환, 허용 문자만, 최대 6자로 제한한다. 요청 중 버튼을 비활성화하고 같은 요청 중복 전송을 막는다.

- [ ] **Step 4: 대기실과 준비 구현**

host·guest 닉네임, 캐릭터, 준비·연결 상태, 코드 복사, 준비, 나가기를 표시한다. 둘 다 ready가 되면 한 클라이언트가 idempotent `start_match`를 호출하고 서버 start_at을 기준으로 3-2-1을 표시한다. 브라우저 시간은 서버 응답의 Date offset을 적용하고 로컬 타이머만으로 시작 시각을 정하지 않는다.

- [ ] **Step 5: lobby 테스트와 접근성 검사 통과**

Run: `npm test -- --run src/screens/MultiplayerLobby.test.tsx`
Expected: create, join, errors, copy, ready, leave tests PASS; every input has a Korean label and focus is moved to errors/status.

- [ ] **Step 6: lobby 커밋**

```bash
git add games/finite-stairs/src/app games/finite-stairs/src/screens games/finite-stairs/src/multiplayer/useLobby.ts games/finite-stairs/src/styles/global.css
git commit -m "feat: add room-code multiplayer lobby"
```

### Task 6: 동일 경로 경기·반투명 상대·최초 종료 결과

**Files:**
- Modify: `games/finite-stairs/src/render/drawScene.ts`
- Modify: `games/finite-stairs/src/render/GameCanvas.tsx`
- Create: `games/finite-stairs/src/multiplayer/matchCoordinator.ts`
- Create: `games/finite-stairs/src/multiplayer/matchCoordinator.test.ts`
- Create: `games/finite-stairs/src/screens/MultiplayerGameScreen.tsx`
- Create: `games/finite-stairs/src/screens/MultiplayerGameScreen.test.tsx`

**Interfaces:**
- Consumes: server seed/startAt, local GameState, RoomClient messages
- Produces: `OpponentState`, synchronized fall/finish, two-player HUD, server-authoritative result

- [ ] **Step 1: 상대 상태와 최초 결과 실패 테스트 작성**

```ts
it('renders an opponent fall but trusts the server result', async () => {
  const coordinator = createMatchCoordinator(fakes({ me: 'host', opponent: 'guest' }));
  coordinator.receive(fallStarted({ senderId: 'guest', direction: -1, reason: 'fall' }));
  expect(coordinator.snapshot().opponent.status).toBe('falling');
  coordinator.receive(matchFinished({ winnerUserId: 'guest', loserUserId: 'host', reason: 'goal' }));
  expect(coordinator.snapshot().result).toEqual({ outcome: 'loss', reason: 'goal' });
});
```

- [ ] **Step 2: coordinator 테스트 실패 확인**

Run: `npm test -- --run src/multiplayer/matchCoordinator.test.ts src/screens/MultiplayerGameScreen.test.tsx`
Expected: FAIL because online match modules do not exist.

- [ ] **Step 3: 경기 coordinator 구현**

startAt 전에는 엔진 action을 거부하고 카운트다운만 갱신한다. startAt에 도달하면 idempotent `roomClient.beginMatch(roomId, matchNumber)`를 호출하고 RPC의 `begin_match`가 반환한 playing 상태 뒤 입력을 연다. 시작 후 local action은 즉시 engine에 적용하고 player_state를 Broadcast한다. falling 진입 때 fall_started를 한 번 보내고 동시에 `roomClient.reportFinish(reason, step, matchNumber)`를 호출한다. won 진입은 `roomClient.reportFinish('goal', 2000, matchNumber)`를 호출한다. 응답 또는 match_finished 수신 전까지 `결과 확인 중`을 표시하며 local 추정만으로 승패창을 열지 않는다. 서버 결과가 먼저 와도 fall/timeout 결과창은 패자의 800ms 추락이 끝난 뒤 두 화면에서 함께 열고, goal/disconnect 결과는 즉시 연다. MultiplayerGameScreen은 `applyRun`을 호출하지 않아 온라인 step·코인·승패가 싱글 Profile을 변경하지 않는다.

- [ ] **Step 4: 전송 절약과 스냅샷 구현**

player_state는 action 직후 보내되 연속 tick에는 보내지 않는다. database `save_snapshot`은 마지막 저장 후 500ms 또는 10계단 진행 중 먼저 충족한 조건에서 호출한다. unload 시 신뢰할 수 없는 비동기 승패 요청을 새로 만들지 않고 마지막 snapshot만 best effort로 보낸다.

- [ ] **Step 5: 상대 렌더링과 HUD 구현**

`GameCanvas`에 `opponent?: OpponentState`를 추가한다. 상대가 visible route 범위면 동일 world 좌표에서 `globalAlpha = 0.55`로 그리고 opponent falling pose를 상대의 sentAt 보정 시간으로 계산한다. match_finished가 fall_started보다 먼저 도착하면 마지막 opponent facing과 수신 시각으로 추락을 합성해 결과창보다 모션이 먼저 보이게 한다. 범위 밖이면 위/아래 화살표와 `±N계단`을 표시한다. 상단 HUD에는 두 닉네임·step·연결 상태를 표시한다.

- [ ] **Step 6: 경기 테스트 통과 확인**

Run: `npm test -- --run src/multiplayer/matchCoordinator.test.ts src/screens/MultiplayerGameScreen.test.tsx`
Expected: shared seed, countdown lock, state broadcast, opponent opacity contract, fall sync, server-only result tests PASS.

- [ ] **Step 7: 경기 동기화 커밋**

```bash
git add games/finite-stairs/src/render games/finite-stairs/src/multiplayer games/finite-stairs/src/screens
git commit -m "feat: synchronize finite stairs one-on-one matches"
```

### Task 7: 10초 재접속·연결 끊김 패배·재대결

**Files:**
- Create: `games/finite-stairs/src/multiplayer/reconnect.ts`
- Create: `games/finite-stairs/src/multiplayer/reconnect.test.ts`
- Create: `games/finite-stairs/src/screens/MultiplayerResultOverlay.tsx`
- Create: `games/finite-stairs/src/screens/MultiplayerResultOverlay.test.tsx`
- Modify: `games/finite-stairs/src/screens/MultiplayerGameScreen.tsx`

**Interfaces:**
- Consumes: Presence join/leave, current room ID in sessionStorage, snapshot, finished room
- Produces: reconnect countdown, disconnect claim, same-room rematch, clean leave

- [ ] **Step 1: 10초 경계 실패 테스트 작성**

```ts
it('does not claim before 10 seconds and claims once after the grace period', async () => {
  const controller = createReconnectController({ now: () => clock.now, roomClient });
  controller.opponentLeft(1000);
  clock.now = 10999;
  await controller.tick();
  expect(roomClient.claimDisconnectWin).not.toHaveBeenCalled();
  clock.now = 11000;
  await controller.tick();
  expect(roomClient.claimDisconnectWin).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: reconnect 테스트 실패 확인**

Run: `npm test -- --run src/multiplayer/reconnect.test.ts src/screens/MultiplayerResultOverlay.test.tsx`
Expected: FAIL because reconnect and online result modules do not exist.

- [ ] **Step 3: 재접속 controller 구현**

Presence leave 때 화면에 10초 countdown을 표시하지만 즉시 승리 처리하지 않는다. 내 Realtime channel이 끊기면 `재연결 중`을 표시하고 local input을 잠근다. 재구독 성공 시 rooms와 두 player snapshots을 다시 읽어 matchNumber가 같을 때만 엔진·상대 상태를 복구한다. 10초 후 남은 client는 claim RPC를 한 번 호출하고 server result를 기다린다.

- [ ] **Step 4: 새로고침 복귀와 clean leave 구현**

현재 room ID·match number를 sessionStorage에 저장하고 같은 anonymous auth user일 때만 자동 복귀한다. 명시적 나가기는 channel unsubscribe, `leave_room`, sessionStorage 삭제 순서로 수행한다. 두 사람 모두 offline인 경우 client가 임의 승자를 만들지 않고 방 만료 규칙에 맡긴다.

- [ ] **Step 5: 결과·재대결 UI 구현**

결과창은 승리/패배, reason별 한국어 문구, 두 step, `재대결`, `방 나가기`를 표시한다. 재대결 한 명 동의는 `상대 동의 대기 중`, 둘 다 동의해 matchNumber가 바뀌면 이전 sequence/fall/result를 버리고 새 countdown으로 이동한다.

- [ ] **Step 6: 재접속·결과 테스트 통과 확인**

Run: `npm test -- --run src/multiplayer/reconnect.test.ts src/screens/MultiplayerResultOverlay.test.tsx`
Expected: 9.999s no claim, 10s one claim, return cancel, reload recovery, rematch reset, leave cleanup tests PASS.

- [ ] **Step 7: 복구 흐름 커밋**

```bash
git add games/finite-stairs/src/multiplayer games/finite-stairs/src/screens
git commit -m "feat: add multiplayer reconnect and rematch"
```

### Task 8: 두 기기 통합 검증·배포·기존 QR 확인

**Files:**
- Create: `games/finite-stairs/e2e/multiplayer.spec.ts`
- Modify: `games/finite-stairs/playwright.config.ts`
- Modify: `finite-stairs/index.html`
- Replace generated: `finite-stairs/assets/*`

**Interfaces:**
- Consumes: healthy Supabase project, production environment values, complete multiplayer app
- Produces: verified public 1대1 game at the existing URL

- [ ] **Step 1: 두 browser context E2E 작성**

```ts
test('two anonymous players share a room and the first fall loses', async ({ browser }) => {
  const host = await browser.newContext();
  const guest = await browser.newContext();
  const hostPage = await host.newPage();
  const guestPage = await guest.newPage();
  await createAndJoinRoom(hostPage, guestPage);
  await readyBoth(hostPage, guestPage);
  await expect(hostPage.getByText('3')).toBeVisible();
  await forceWrongMove(hostPage);
  await expect(hostPage.getByRole('heading', { name: '패배' })).toBeVisible();
  await expect(guestPage.getByRole('heading', { name: '승리' })).toBeVisible();
});
```

별도 테스트로 세 번째 참가 거부, 같은 seed, opponent step, 800ms fall, goal result, 10초 disconnect, reload reconnect, two-party rematch를 검증한다. 테스트 방 code에는 실행별 prefix를 두고 종료 후 leave/expiry cleanup을 호출한다.

- [ ] **Step 2: 배포 전 E2E 실패 확인**

Run: `npm run e2e -- e2e/multiplayer.spec.ts`
Expected: tests may fail until production-like Supabase test environment is connected; record the first concrete failure, fix configuration only, then rerun.

- [ ] **Step 3: 전체 자동 검증**

Run: `npm test -- --run && npm run e2e && npm run build`
Expected: unit, component, single-player E2E, multiplayer two-context E2E, TypeScript build all PASS.

- [ ] **Step 4: 보안·산출물 검사**

Run: `rg -n "service_role|SUPABASE_SERVICE|chatgpt\.site|5,000|5000" games/finite-stairs/src finite-stairs`
Expected: no secret, ChatGPT Site, or old 5,000-goal match; only rejection-test literals may mention service role outside the production bundle.

Run: `rg -n "VITE_SUPABASE_PUBLISHABLE_KEY|supabase\.co" finite-stairs/assets`
Expected: project URL and publishable browser key may be embedded; no database password or service credential appears.

- [ ] **Step 5: 배포 커밋**

```bash
git add games/finite-stairs finite-stairs
git commit -m "release: deploy finite stairs online one-on-one"
```

- [ ] **Step 6: 공개 링크 실기기 검증**

GitHub Pages 배포 완료 후 Chrome PC와 Android Chrome에서 `https://foodie-repository.github.io/finite-stairs/`를 각각 열어 방 만들기·코드 복사·참가·준비·3초 시작·상대 반투명 표시·먼저 추락 패배·재대결을 실행한다. 브라우저 콘솔 error와 unhandled rejection이 없어야 한다.

- [ ] **Step 7: QR 유지 확인**

기존 QR 이미지 `/동아리/finite-stairs-qr.png`를 스캔해 같은 GitHub Pages URL이 열리는지 확인한다. URL이 동일하므로 QR을 새로 생성하지 않고, 스캔 실패나 다른 URL일 때만 동일 주소로 QR을 재생성한다.

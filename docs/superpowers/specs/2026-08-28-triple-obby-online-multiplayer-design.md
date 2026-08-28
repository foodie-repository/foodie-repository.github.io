# Triple Obby 3D 온라인 멀티플레이 설계

## 1. 목적

기존 GitHub Pages 기반 `Triple Obby 3D`를 친구들이 같은 방에 접속해 서로의 캐릭터를 보며 플레이할 수 있는 온라인 게임으로 확장한다. 기존 3D 맵, 바닥 킬존, 하늘섬 리메이크, 금 간 사라지는 블록, 체크포인트, 기록 기능은 유지한다.

온라인 기능의 핵심 성공 조건은 다음과 같다.

- 방장이 6자리 방 코드를 만들고 최대 8명이 참가할 수 있다.
- 같은 방의 플레이어는 동일한 맵에 입장하며 서로의 위치, 방향, 점프 상태를 실시간으로 볼 수 있다.
- 한 명이 금 간 블록을 밟으면 모든 플레이어 화면에서 같은 블록이 함께 사라지고 함께 복구된다.
- 시점 변경은 카메라만 바꾸며 `W`, `A`, `S`, `D` 이동 방향과 입력 상태에는 영향을 주지 않는다.
- 네트워크가 끊겨도 로컬 게임은 중단되지 않고 솔로 모드로 계속 플레이할 수 있다.
- 수정 후 기존 공개 URL을 유지하고, 공개 URL 및 방 초대 URL용 QR 코드를 제공한다.

## 2. 범위

### 포함

- GitHub Pages 정적 클라이언트 유지
- Supabase 기반 방 생성·참가·Presence·Realtime Broadcast
- 익명 닉네임과 세션 ID
- 최대 8명 플레이어 동기화
- 방장이 선택한 공용 맵 동기화
- 원격 플레이어 아바타, 닉네임, 이동 보간
- 공유 크랙 블록 상태 동기화
- 입장·퇴장·연결 끊김 처리
- 온라인 연결 실패 시 솔로 폴백
- WASD와 카메라 로직 분리 및 회귀 테스트
- 기본 게임 QR과 방 코드가 포함된 동적 초대 QR

### 제외

- 계정 가입과 영구 프로필
- 음성 채팅·텍스트 채팅
- 서버 권위형 물리 시뮬레이션
- 경쟁전 랭킹과 치팅 방지 시스템
- Roblox 앱 내부 배포
- 수십 명 이상 대규모 방

## 3. 사용자 흐름

### 3.1 첫 화면

1. 사용자가 공개 게임 URL을 연다.
2. 닉네임을 2~12자로 입력한다.
3. 다음 중 하나를 선택한다.
   - `혼자 하기`
   - `방 만들기`
   - `방 참가하기`
4. 방 참가 시 영문 대문자와 숫자로 구성된 6자리 코드를 입력한다.

### 3.2 방 만들기

1. 클라이언트가 Supabase 익명 인증 세션을 확보한다.
2. `room-control` Edge Function에 `create` 요청을 보낸다.
3. 서버가 충돌하지 않는 6자리 방 코드를 생성한다.
4. 방장은 온라인 로비로 들어가며 초대 링크와 QR을 확인할 수 있다.
5. 초대 링크 형식은 다음과 같다.

```text
https://foodie-repository.github.io/triple-obby-3d/?room=ABC123
```

### 3.3 방 참가

1. URL의 `room` 쿼리 또는 입력한 방 코드를 읽는다.
2. `room-control` Edge Function에 `join` 요청을 보낸다.
3. 방이 존재하고 만료되지 않았으며 인원이 8명 미만이면 참가한다.
4. 현재 방장과 맵 상태를 받은 뒤 로비에 입장한다.
5. 인원이 가득 찼거나 방이 없으면 명확한 오류 메시지를 표시한다.

### 3.4 맵 시작

- 방장만 로비에서 맵을 선택할 수 있다.
- 방장이 맵을 선택하면 `map_change` 이벤트가 방 전체에 전송된다.
- 모든 클라이언트는 동일한 맵을 로드하고 시작 위치에 배치된다.
- 중간 참가자는 현재 맵과 공유 블록 스냅샷을 받은 뒤 참가한다.

## 4. 아키텍처

### 4.1 구성

```text
친구들의 브라우저
  ├─ Triple Obby 3D 정적 클라이언트
  ├─ 로컬 물리·렌더링·입력
  ├─ Supabase JS Client
  └─ QR 생성기
          │
          ├─ HTTPS: room-control Edge Function
          └─ WebSocket: Supabase Realtime
                    ├─ Presence
                    └─ Broadcast
```

### 4.2 역할 분리

- **게임 엔진**: 맵 생성, 충돌, 점프, 체크포인트, 킬존, 로컬 캐릭터 물리를 담당한다.
- **카메라 컨트롤러**: 3인칭·근접·1인칭·탑뷰만 담당한다. 이동 입력을 읽거나 수정하지 않는다.
- **입력 컨트롤러**: 키보드·모바일 버튼을 월드 축 이동 벡터로 변환한다.
- **Room Client**: 방 생성·참가·퇴장과 연결 상태를 관리한다.
- **Presence Manager**: 참가자 목록과 닉네임을 관리한다.
- **State Sync**: 플레이어 상태를 송수신하고 원격 아바타를 보간한다.
- **Crumble Sync**: 공유 크랙 블록의 트리거·사라짐·복구 상태를 관리한다.
- **Invite UI**: 초대 링크 복사와 동적 QR 렌더링을 담당한다.

각 모듈은 명시적인 이벤트와 데이터 구조로 통신하며 서로의 내부 상태를 직접 수정하지 않는다.

## 5. Supabase 데이터 모델

### 5.1 `obby_rooms`

```sql
create table public.obby_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  host_user_id uuid not null,
  host_session_id uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  max_players smallint not null default 8 check (max_players between 2 and 8),
  version text not null,
  status text not null default 'open' check (status in ('open', 'closed'))
);
```

방은 생성 후 6시간 동안 유효하다. 마지막 참가자가 나간 방은 즉시 닫지 않아 짧은 재접속을 허용하고, 만료된 방은 예약 작업으로 정리한다.

### 5.2 `obby_room_members`

```sql
create table public.obby_room_members (
  room_id uuid not null references public.obby_rooms(id) on delete cascade,
  user_id uuid not null,
  session_id uuid not null,
  nickname text not null check (char_length(nickname) between 2 and 12),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, session_id)
);
```

이 테이블은 방 인원 제한과 재접속 판정에 사용한다. 고주파 위치 데이터는 저장하지 않는다.

### 5.3 Edge Function `room-control`

단일 함수가 다음 액션을 처리한다.

```ts
type RoomControlAction =
  | { action: 'create'; nickname: string; sessionId: string; version: string }
  | { action: 'join'; code: string; nickname: string; sessionId: string; version: string }
  | { action: 'leave'; roomId: string; sessionId: string };
```

- 요청자는 Supabase 익명 인증 사용자여야 한다.
- 방 코드는 혼동하기 쉬운 `I`, `O`, `0`, `1`을 제외한 문자 집합에서 생성한다.
- 참가 시 활성 멤버 수를 트랜잭션 안에서 확인해 8명을 초과하지 않게 한다.
- 클라이언트 버전이 방 버전과 다르면 참가를 거절하고 새로고침 안내를 표시한다.

## 6. Realtime 프로토콜

채널 이름은 `obby-room:<room-id>`를 사용한다.

### 6.1 Presence 메타데이터

```ts
interface PresenceMeta {
  sessionId: string;
  userId: string;
  nickname: string;
  avatarColor: string;
  joinedAt: number;
}
```

### 6.2 플레이어 상태

로컬 플레이어는 최대 초당 10회 상태를 전송한다. 위치 변화가 매우 작으면 전송을 생략한다.

```ts
interface PlayerStateMessage {
  type: 'player_state';
  sessionId: string;
  seq: number;
  sentAt: number;
  mapId: 'color' | 'lava' | 'sky' | 'lobby';
  position: [number, number, number];
  velocity: [number, number, number];
  yaw: number;
  grounded: boolean;
  stage: number;
  animation: 'idle' | 'run' | 'jump' | 'fall';
}
```

원격 캐릭터는 최근 두 상태 사이를 100ms 지연 보간한다. 패킷이 1초 이상 오지 않으면 마지막 위치에서 정지시키고, 5초 이상 오지 않으면 숨긴다.

### 6.3 맵 변경

```ts
interface MapChangeMessage {
  type: 'map_change';
  mapId: 'color' | 'lava' | 'sky' | 'lobby';
  hostSessionId: string;
  transitionId: string;
  startAt: number;
}
```

방장 메시지만 적용한다. 참가자들은 `startAt` 기준으로 동일한 맵을 로드한다.

### 6.4 공유 크랙 블록

모든 크랙 블록은 맵 생성 시 결정적인 ID를 가진다.

```text
color:crumble:04:01
lava:crumble:08:02
sky:crumble:12:03
```

클라이언트가 블록을 밟으면 다음 요청을 보낸다.

```ts
interface BlockTriggerMessage {
  type: 'block_trigger';
  blockId: string;
  sessionId: string;
  position: [number, number, number];
  seq: number;
}
```

방장은 플레이어가 해당 블록에서 2.5m 이내인지 확인한 후 권위 이벤트를 전송한다.

```ts
interface BlockStateMessage {
  type: 'block_state';
  blockId: string;
  state: 'cracking' | 'hidden' | 'active';
  transitionId: string;
  effectiveAt: number;
  respawnAt?: number;
}
```

상태 흐름은 다음으로 고정한다.

```text
active → cracking 600ms → hidden 2500ms → active
```

중간 참가자가 들어오면 방장이 현재 비활성 블록 목록과 남은 시간을 `room_snapshot`으로 전송한다.

### 6.5 방장 이전

방장이 퇴장하면 Presence에 남아 있는 세션 중 `joinedAt`이 가장 빠르고, 동률이면 `sessionId`가 사전순으로 가장 작은 플레이어가 새 방장이 된다. 새 방장은 `host_claim`을 전송하고 현재 맵·블록 스냅샷을 재방송한다.

## 7. WASD와 시점 변경 완전 분리

### 7.1 이동 규칙

이동 벡터는 카메라가 아니라 월드 좌표만 사용한다.

```ts
const moveX = Number(input.right) - Number(input.left);
const moveZ = Number(input.back) - Number(input.forward);
const worldMove = normalize([moveX, 0, moveZ]);
```

고정 규칙은 다음과 같다.

- `W`: 월드 `-Z`
- `S`: 월드 `+Z`
- `A`: 월드 `-X`
- `D`: 월드 `+X`

### 7.2 카메라 규칙

카메라 모드는 다음 값만 변경한다.

- 카메라 위치
- 카메라 주시점
- 화각
- 1인칭에서 로컬 캐릭터 표시 여부

카메라 코드는 다음 항목을 절대 변경하지 않는다.

- `input.forward`, `input.back`, `input.left`, `input.right`
- 로컬 플레이어 속도 벡터
- 플레이어 월드 방향 계산
- 네트워크로 전송하는 이동 입력

시점 변경은 화면 버튼과 `C`키에서만 실행한다. `W`, `A`, `S`, `D` 이벤트 핸들러는 카메라 상태를 읽지 않는다.

## 8. 온라인 UI

### 8.1 온라인 로비 패널

- 닉네임 입력
- 혼자 하기
- 방 만들기
- 방 코드 입력·참가
- 연결 상태 표시
- 현재 참가자 수 `3 / 8`
- 참가자 닉네임 목록

### 8.2 방장 UI

- 맵 선택 활성화
- 방 코드 크게 표시
- 초대 링크 복사
- QR 코드 표시
- 방 닫기

### 8.3 참가자 UI

- 맵 선택 버튼 비활성화
- `방장이 맵을 선택하고 있습니다` 안내
- 방장 퇴장 시 이전 안내

### 8.4 게임 중 UI

- 오른쪽 위에 독립된 `시점 변경` 버튼
- 온라인 상태 표시
- 참가자 수
- 초대 버튼
- 연결이 끊기면 `오프라인 솔로 모드로 전환됨` 토스트

## 9. 오류·재연결 처리

- Supabase 초기화 실패: 온라인 버튼을 비활성화하고 혼자 하기는 유지한다.
- 방 없음: `방 코드를 다시 확인해 주세요` 표시.
- 방 정원 초과: `이 방은 8명으로 가득 찼습니다` 표시.
- 버전 불일치: 강제 새로고침 버튼 표시.
- WebSocket 단절: 지수 백오프로 1초, 2초, 4초, 최대 10초 간격 재접속.
- 30초 내 재접속 성공: 동일 세션 ID로 방 복귀.
- 30초 이상 실패: 원격 아바타와 공유 블록 동기화를 중단하고 솔로 모드 유지.
- 재접속 성공 시 방장에게 스냅샷을 요청해 현재 맵과 블록 상태를 복구한다.

## 10. 보안과 한계

- Supabase anon key는 브라우저에 포함될 수 있는 공개 키만 사용한다.
- `service_role` 키는 Edge Function 환경 변수에만 저장한다.
- 방 생성·참가·멤버 삽입은 Edge Function을 통해서만 수행한다.
- 닉네임은 HTML로 삽입하지 않고 `textContent`로만 출력한다.
- 코드·닉네임 입력은 길이와 문자 집합을 검증한다.
- 위치 동기화는 클라이언트 권위형이므로 악의적인 사용자가 위치를 조작하는 것을 완전히 막지 못한다.
- 방장이 블록 트리거의 거리와 빈도를 검증해 공유 장애물 스팸만 최소화한다.
- 이 설계는 친구 중심 캐주얼 게임을 목표로 하며 경쟁전 수준의 치팅 방지는 범위 밖이다.

## 11. 파일 구조

```text
triple-obby-3d/
  index.html
  styles.css
  camera.css
  online.css
  loader-camera.js
  config.js
  game-01.part ... game-06.part
  camera-prelude.part
  camera-tail-01.part ... camera-tail-03.part
  network/
    room-client.js
    presence-manager.js
    player-sync.js
    remote-player-manager.js
    crumble-sync.js
    room-state.js
    invite-qr.js
  tests/
    input-camera-independence.test.mjs
    room-state.test.mjs
    player-interpolation.test.mjs
    crumble-state.test.mjs
    protocol-validation.test.mjs
supabase/
  migrations/
    202608280001_create_obby_rooms.sql
    202608280002_create_obby_room_members.sql
    202608280003_add_cleanup_job.sql
  functions/
    room-control/
      index.ts
```

## 12. 테스트 전략

### 12.1 단위 테스트

- 네 카메라 모드에서 동일한 WASD 입력이 동일한 월드 이동 벡터를 생성한다.
- 시점 변경 버튼을 누르는 동안 모든 이동 입력 상태가 유지된다.
- 플레이어 상태 메시지 직렬화·검증.
- 오래된 `seq` 메시지 무시.
- 원격 위치 보간.
- 크랙 블록 상태 전이와 중복 트리거 무시.
- 방장 이전 결정 로직.
- 6자리 방 코드 검증.

### 12.2 통합 테스트

Playwright 브라우저 컨텍스트 두 개를 열어 다음을 확인한다.

1. 브라우저 A가 방을 만들고 B가 코드로 참가한다.
2. A와 B가 서로의 캐릭터를 본다.
3. A가 움직이면 B에서 보간된 위치가 갱신된다.
4. B가 시점을 변경해도 B의 WASD 이동 방향이 바뀌지 않는다.
5. A가 크랙 블록을 밟으면 B에서도 같은 시점에 사라진다.
6. 방장이 나가면 B가 새 방장이 된다.
7. 네트워크를 끊으면 솔로 폴백 후 재연결된다.

### 12.3 수동 검증

- Chrome PC 2대
- Android Chrome 2대
- PC와 모바일 혼합
- 최대 8개 탭 동시 참가
- 세 맵 각각 완주 경로
- QR 스캔 후 방 코드 자동 입력

## 13. 배포

1. 게임 전용 Supabase 프로젝트를 생성한다.
2. SQL 마이그레이션과 Edge Function을 배포한다.
3. Supabase URL과 anon key를 `config.js`에 넣는다.
4. GitHub Pages 파일을 업데이트한다.
5. 기존 공개 주소를 유지한다.

```text
https://foodie-repository.github.io/triple-obby-3d/
```

6. 기본 공개 주소 QR을 다시 생성한다.
7. 방 생성 후 `?room=ABC123` 초대 링크용 QR은 브라우저에서 동적으로 생성한다.
8. GitHub Pages 배포 성공과 실제 HTTPS 접근을 확인한다.

## 14. 완료 기준

다음 조건을 모두 만족해야 완료로 판정한다.

- 두 브라우저가 같은 방에 접속해 서로의 캐릭터를 볼 수 있다.
- 최대 8명 제한이 서버에서 적용된다.
- 방장 맵 선택이 모든 참가자에게 반영된다.
- 공유 크랙 블록이 모든 참가자에게 동일하게 동작한다.
- 3인칭·근접·1인칭·탑뷰에서 WASD 이동 방향이 완전히 동일하다.
- 시점 변경 버튼을 누른 상태에서도 눌려 있던 이동키 상태가 끊기지 않는다.
- 연결 단절 시 게임이 멈추지 않고 솔로 모드로 전환된다.
- 재접속 시 현재 맵과 공유 블록 상태가 복원된다.
- 공개 URL과 QR 코드가 친구의 기기에서 열린다.

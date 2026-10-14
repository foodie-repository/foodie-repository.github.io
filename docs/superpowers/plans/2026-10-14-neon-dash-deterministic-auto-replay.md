# Neon Dash Deterministic Auto Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the heuristic AUTO bot with deterministic 120 Hz replay playback/recording that uses only legal player inputs and works for the official map and verified custom maps.

**Architecture:** Keep the deployed game as a single `neon-dash/index.html`. Add a fixed-step simulation layer, route all manual/replay input through one shared input-state API, record successful manual custom-map clears as replay events, and play verified replays by simulation tick. Add a Node built-in test harness that extracts marked pure replay-core helpers from the inline script so production remains single-file.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, Web Audio API, localStorage, Node.js built-in `node:test` + `vm` for tests, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-14-neon-dash-deterministic-auto-replay-design.md`

## Global Constraints

- AUTO uses only legal player inputs: press/release jump, orb activation via input, ship press/release, wave press/release.
- No invulnerability, teleporting, collision bypass, forced floor snapping, or direct player-position correction.
- AUTO simulation rate is exactly **120 Hz**.
- Rendering remains driven by `requestAnimationFrame`.
- AUTO clear of a custom map never grants creator verification.
- Custom-map replay is valid only when its gameplay fingerprint matches the replay fingerprint.
- Old ND1 map codes without replay remain importable.
- Keep the production deployment as one HTML file.
- Existing cube, ship, wave, editor, local storage, BGM, map-code, device-mode, and fullscreen behavior must continue working.

## Review Focus

- Long frame stalls or 30/60/90/120/144 Hz rendering must not change AUTO physics outcome; pin this in Task 2.
- Holding input across a portal transition must not create a phantom press/release event; pin this in Task 3.
- Editing gameplay geometry after a manual verification must invalidate both verification and replay; pin this in Task 4.
- Corrupt or mismatched imported replay data must fail closed without breaking map import; pin this in Task 4.
- AUTO replay failure must produce a normal collision/death and a clear invalid-replay message rather than silently recovering; pin this in Task 6.

---

### Task 1: Add replay-core test harness and data validation

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/replay-core.test.mjs`

**Interfaces:**
- Produces: `normalizeReplay(replay)`, `isReplayValidForFingerprint(replay, fingerprint)`, `applyReplayEventsForTick(replayState, tick, setHeld)`
- Produces replay shape: `{version:1, physicsHz:120, fingerprint:string, events:Array<{tick:number, action:"press"|"release"}>}`

- [ ] **Step 1: Write failing replay-schema tests**

Test with `node:test`:
- accepts version 1 / 120 Hz / ordered non-negative ticks / press-release actions,
- rejects wrong version,
- rejects physics rate other than 120,
- rejects negative or descending ticks,
- rejects unknown actions,
- rejects fingerprint mismatch,
- accepts `null` replay as “no replay available” rather than throwing.

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
node --test neon-dash/tests/replay-core.test.mjs
```

Expected: FAIL because replay-core functions do not exist.

- [ ] **Step 3: Add marked pure replay-core helpers to `index.html`**

Add:

```js
// AUTO_REPLAY_CORE_START
function normalizeReplay(replay) { ... }
function isReplayValidForFingerprint(replay, fingerprint) { ... }
function applyReplayEventsForTick(replayState, tick, setHeld) { ... }
// AUTO_REPLAY_CORE_END
```

Keep the block DOM-free so the Node test can extract/evaluate it with `vm`.

- [ ] **Step 4: Run replay-core tests**

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/replay-core.test.mjs
git commit -m "test: add deterministic replay core"
```

### Task 2: Replace AUTO timing with a 120 Hz fixed-step simulation loop

**Files:**
- Modify: `neon-dash/index.html`
- Modify: `neon-dash/tests/replay-core.test.mjs`

**Interfaces:**
- Consumes: replay-core helpers from Task 1.
- Produces: `FIXED_AUTO_DT = 1/120`, `advanceAutoAccumulator(frameDt, state, stepFn)`
- Runtime fields: `game.simAccumulator`, `game.simTick`

- [ ] **Step 1: Write failing fixed-step tests**

Assert:
- one simulated second rendered at 30, 60, 90, 120, and 144 Hz executes exactly 120 simulation steps,
- a 500 ms frame stall is capped by a named maximum catch-up window so the game does not spiral indefinitely,
- two identical frame-delta sequences produce identical tick counts.

- [ ] **Step 2: Run tests and verify RED**

Run the same Node test command; expected FAIL.

- [ ] **Step 3: Implement fixed-step accumulator**

Add constants:

```js
const AUTO_PHYSICS_HZ = 120;
const FIXED_AUTO_DT = 1 / AUTO_PHYSICS_HZ;
const MAX_AUTO_CATCHUP_SECONDS = 0.25;
```

In the animation loop:
- manual play keeps existing frame-based update,
- replay playback uses accumulator-driven `updateGame(FIXED_AUTO_DT)`,
- increment `game.simTick` once per physics step,
- reset accumulator/tick on run reset.

- [ ] **Step 4: Run fixed-step tests**

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/replay-core.test.mjs
git commit -m "feat: add fixed-step auto simulation"
```

### Task 3: Unify input routing and add replay recording/playback

**Files:**
- Modify: `neon-dash/index.html`
- Modify: `neon-dash/tests/replay-core.test.mjs`

**Interfaces:**
- Produces: `setInputHeld(nextHeld, source)`
- `source`: `"manual" | "replay" | "system"`
- Runtime fields:
  - `game.replayMode = "off" | "record" | "play"`
  - `game.replayEvents`
  - `game.replayCursor`
  - `game.recordedEvents`

- [ ] **Step 1: Write failing input-recording tests**

Assert:
- false→true records one `press` event at current sim tick,
- true→false records one `release`,
- repeated true→true or false→false records nothing,
- replay-sourced input is never re-recorded,
- reset emits no fake event,
- portal mode switch preserves current held state without synthesizing an extra event.

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL.

- [ ] **Step 3: Route all input through `setInputHeld`**

Replace direct user writes to `game.inputHeld` in pointer/key handlers with `setInputHeld(..., "manual")`.

During replay playback, call `applyReplayEventsForTick` before each fixed physics step and route state through `setInputHeld(..., "replay")`.

During manual custom-map verification, enable `record` mode at tick 0.

- [ ] **Step 4: Run tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/replay-core.test.mjs
git commit -m "feat: record and replay legal inputs"
```

### Task 4: Persist custom-map replays and keep ND1 backward compatibility

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/map-replay-schema.test.mjs`

**Interfaces:**
- Consumes: `gameplayFingerprint(level)`, replay validation from Task 1.
- Level field: `level.replay`
- Produces: `attachVerifiedReplay(level, recordedEvents)`, `invalidateVerificationAndReplay(level)`

- [ ] **Step 1: Write failing persistence tests**

Cover:
- successful manual verification stores `verifiedFingerprint` and replay fingerprint,
- gameplay edit clears both,
- name/BGM-only edit follows existing fingerprint behavior and does not spuriously clear valid replay,
- AUTO clear does not attach replay or mark verification,
- old ND1 payload without `replay` normalizes to `replay:null`,
- malformed replay is ignored while the map itself still imports,
- imported matching replay is usable for AUTO but does not grant local creator-verification status.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test neon-dash/tests/*.test.mjs
```

Expected: new schema tests FAIL.

- [ ] **Step 3: Extend normalization/export/import**

Add optional replay serialization to the existing level schema without changing the `ND1:` prefix.

On gameplay-affecting edit:
- clear `verifiedFingerprint`,
- set `replay = null`.

On successful **manual** creator verification:
- store replay with exact current gameplay fingerprint.

- [ ] **Step 4: Run all Node tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: persist verified custom map replays"
```

### Task 5: Repair known official-map impossible placements and create official replay

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-replay.test.mjs`

**Interfaces:**
- Produces: `OFFICIAL_REPLAY`
- Consumes: official runtime, fixed-step physics, replay playback.

- [ ] **Step 1: Write failing geometry regression tests**

Pin the two diagnosed map defects:
- second jump-ring sequence must place `o2` at a reachable position under normal physics,
- final wave→cube portal must not overlap `b19` at transition.

Use exact chosen positions in the test once selected by the solver; do not accept overlap.

- [ ] **Step 2: Write failing official replay test**

The test must execute the actual official runtime and actual 120 Hz update path with no collision bypass and assert:
- reaches 100%,
- zero calls to any cheat/recovery hook,
- finishes with `game.won === true`.

- [ ] **Step 3: Apply the minimal geometry corrections**

Only move the known impossible objects enough to produce a legal path. Do not redesign the surrounding level.

- [ ] **Step 4: Generate/record `OFFICIAL_REPLAY` against the corrected fingerprint**

The replay must contain only input events and the matching official gameplay fingerprint.

- [ ] **Step 5: Verify official replay determinism**

Run at simulated render rates 60, 90, 120, and 144 Hz; all runs must reach the same final simulation tick and 100%.

- [ ] **Step 6: Corruption test**

Delete or move one critical replay event and assert the run dies normally rather than being recovered.

- [ ] **Step 7: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/official-replay.test.mjs
git commit -m "feat: add verified official auto replay"
```

### Task 6: AUTO UX, invalid-replay handling, and custom replay execution

**Files:**
- Modify: `neon-dash/index.html`
- Modify: `neon-dash/tests/replay-core.test.mjs`
- Modify: `neon-dash/tests/map-replay-schema.test.mjs`

**Interfaces:**
- Consumes: validated official/custom replay.
- Produces: `startReplayForRuntime(runtime, replay)`, `stopReplay(reason)`

- [ ] **Step 1: Write failing behavior tests**

Assert:
- code `뀨` still toggles AUTO,
- official map uses `OFFICIAL_REPLAY`,
- custom map with matching replay uses that replay,
- custom map without replay shows “직접 클리어 후 AUTO 사용 가능” and does not start fake heuristic AUTO,
- replay fingerprint mismatch refuses playback,
- replay death stops AUTO for that run and shows `AUTO REPLAY INVALID`,
- AUTO custom clear does not change verification state.

- [ ] **Step 2: Run all tests and verify RED**

Expected: behavior tests FAIL.

- [ ] **Step 3: Remove the old heuristic AUTO planner**

Delete or retire:
- `autoCubeShouldJump`
- `autoPassageTargetY`
- `autoVerticalHold`
- `autoOrbAvailable`
- any AUTO-only invulnerability/recovery code left from earlier revisions.

The production AUTO path must have exactly one source of control: replay events.

- [ ] **Step 4: Implement replay selection and failure UI**

Update AUTO badge/status text to distinguish:
- `AUTO READY`
- `AUTO PLAY`
- `AUTO REPLAY INVALID`

- [ ] **Step 5: Run all tests**

```bash
node --test neon-dash/tests/*.test.mjs
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "fix: replace heuristic auto with replay playback"
```

### Task 7: Full regression and deployment verification

**Files:**
- Modify only if regressions are found: `neon-dash/index.html`, tests.

**Interfaces:**
- Consumes all previous tasks.
- Produces deployable GitHub Pages build.

- [ ] **Step 1: Run full automated suite**

```bash
node --test neon-dash/tests/*.test.mjs
```

Expected: 0 failures.

- [ ] **Step 2: Parse-check the production inline script**

Extract the inline script and run `new Function(script)` under Node.

Expected: no SyntaxError.

- [ ] **Step 3: Verify requirement checklist**

Confirm:
- official replay reaches 100%,
- 60/90/120/144 Hz render schedules produce identical AUTO result,
- corrupted replay dies normally,
- custom manual clear records replay,
- custom replay clears the same map,
- custom AUTO clear does not verify,
- gameplay edit invalidates replay,
- old ND1 imports,
- cube/ship/wave/manual play remain normal.

- [ ] **Step 4: Verify GitHub Pages source**

Fetch `neon-dash/index.html` from `main` after the final commit and confirm replay version, 120 Hz constant, and old heuristic functions are absent.

- [ ] **Step 5: Commit any final regression fix**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "test: verify deterministic auto replay"
```

# Neon Dash deterministic AUTO replay execution ledger

Plan: docs/superpowers/plans/2026-10-14-neon-dash-deterministic-auto-replay.md
Spec: docs/superpowers/specs/2026-10-14-neon-dash-deterministic-auto-replay-design.md
Branch: feature/neon-dash-deterministic-auto-replay
Base: main

## Setup
- Isolated GitHub feature branch created because this environment has no local repository checkout/worktree primitive.
- Baseline production file: neon-dash/index.html
- Execution mode: inline, task-by-task, TDD.

Ruling: Use a GitHub feature branch as the isolated workspace — the harness exposes repository branch operations but no local checkout/worktree of this repo — cost if wrong: feature commits live remotely before final merge, but main remains unchanged.


## Task 1 — replay core
- RED observed: production had no `AUTO_REPLAY_CORE` block.
- Added `normalizeReplay`, `isReplayValidForFingerprint`, and `applyReplayEventsForTick`.
- Added `neon-dash/tests/replay-core.test.mjs`.
- Equivalent branch test execution passed all schema/action cases in the available V8 harness.

Ruling: The environment cannot mount this GitHub branch into the local Node container, so repository test files are created exactly as planned, while RED/GREEN execution is performed against the branch content through the GitHub connector + V8 isolate. This preserves real production-code evaluation; cost if wrong: the exact `node --test` invocation is deferred to final CI/branch verification if a runnable checkout becomes available.

## Task 2 — fixed-step AUTO simulation
- RED observed: `advanceAutoAccumulator` did not exist.
- Added 120 Hz fixed step, 0.25 s catch-up cap, `game.simAccumulator`, and `game.simTick`.
- AUTO runs through the accumulator; manual play retains the prior frame-delta path.
- Verification passed for 30/60/90/120/144 Hz schedules: exactly 120 simulation steps per simulated second.
- 500 ms stall produced 30 fixed steps (0.25 s cap).

## Task 3 — unified input + replay recording/playback routing
- RED observed: `recordReplayInputTransition` did not exist.
- Added shared `setInputHeld(nextHeld, source)` and routed keyboard/pointer input through it.
- Added replay runtime fields and tick-based manual input recording.
- Replay events are applied before each deterministic physics step.
- Custom manual runs enter record mode and therefore use the same 120 Hz fixed-step path required for deterministic replay.
- Verification passed for duplicate suppression, manual-only recording, reset/system behavior, and portal held-state preservation.

Ruling: Manual custom-map verification uses fixed-step physics while recording, even though ordinary manual official play keeps the old frame-delta path — deterministic custom replay requires the recorded run to use the same 120 Hz simulation as playback — cost if wrong: custom-map test-play feel may change slightly, but only during deterministic verification runs.

## Task 4 — custom replay persistence
- Added optional `level.replay` normalization; old maps normalize to `replay:null`.
- Malformed replay data is ignored rather than breaking map import.
- Gameplay edits clear both `verifiedFingerprint` and `replay`; name/BGM changes preserve them under the existing gameplay fingerprint rules.
- ND1 export now includes an optional matching replay; import clears local creator verification but keeps a syntactically valid replay.
- Manual custom-map completion stores the recorded 120 Hz replay; AUTO completion remains excluded.
- Schema verification passed.

## Task 5 — official replay
- RED observed: o2 remained at x=5710, final cube portal at x=21800, and no official replay block existed.
- Moved `o2` to x=5590 and final wave→cube portal to x=21900, the two diagnosed impossible placements.
- Generated a legal input-only official replay at 120 Hz: 1,362 press/release events.
- Official runtime fingerprint: `og1-8a879f3c`.
- Replay reaches 100% at simulation tick 6912.
- Render schedule verification: 60/90/120/144 Hz all finish at the same tick and x=22400.09.
- Corruption verification: removing the first replay event causes a normal death at tick 133 / x≈535.9; no recovery path exists.

## Task 6 — replay-only AUTO UX
- RED observed: heuristic planner remained and replay start/invalid-state functions did not exist.
- Added `startReplayForRuntime(runtime, replay)` with fingerprint validation.
- Official AUTO selects `OFFICIAL_REPLAY`; custom AUTO selects `runtime.sourceLevel?.replay`.
- Maps without a usable custom replay show “직접 클리어 후 AUTO 사용 가능” and run manually; no heuristic fallback exists.
- Removed all heuristic AUTO planner functions and the `updateAutoPilot()` call.
- Real collision during replay stops the run and shows `AUTO REPLAY INVALID`; no forced recovery/restart.
- AUTO UI now uses `AUTO READY` and `AUTO PLAY`.
- Behavior checks passed.

## Task 7 — final regression
- Added/reset-tick regression: replay events apply → `simTick++` → physics update, so a reset inside physics can restore tick 0 without being incremented afterward.
- Production inline script parse check passed.
- Replay-core/schema/input/fixed-step checks passed.
- Heuristic AUTO functions are absent; direct `game.inputHeld` mutation exists only inside the shared input API.
- Existing ship/wave/cube/editor/map-code/audio/device-mode markers remain present.
- Official replay fresh verification:
  - fingerprint `og1-8a879f3c`
  - 1,362 legal press/release events
  - 60 Hz render → win at tick 6912
  - 90 Hz render → win at tick 6912
  - 120 Hz render → win at tick 6912
  - 144 Hz render → win at tick 6912
  - corrupted replay → normal death at tick 133, x≈535.9
- Custom-map replay smoke test: a manual one-jump input sequence clears at tick 505; attached replay reproduces the same tick/x; changed fingerprint is rejected.

Ruling: Full branch tests are executed against the exact GitHub branch content in the available V8 harness because this environment cannot check out/mount the remote branch into the local Node container. Repository `node:test` files are committed and mirror these assertions. Cost if wrong: Node module-loader-specific issues could remain, but production JS, schemas, deterministic physics, and replay execution have all been exercised directly.

## Final review
- No Critical or Important finding remains after the reset-tick fix.
- Main branch has not been modified by this implementation branch.

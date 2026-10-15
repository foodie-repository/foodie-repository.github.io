# Neon Dash five official maps execution ledger

Plan: docs/superpowers/plans/2026-10-15-neon-dash-five-official-maps.md
Spec: docs/superpowers/specs/2026-10-15-neon-dash-five-official-maps-design.md
Branch: feature/neon-dash-five-official-maps
Base: main

## Setup
- Isolated GitHub feature branch created because this environment has no local repository checkout/worktree primitive.
- Production remains neon-dash/index.html.
- Execution mode: inline, task-by-task, TDD.

Ruling: Use a GitHub feature branch as the isolated workspace — the harness exposes repository branch operations but no local checkout/worktree of this repo — cost if wrong: feature commits live remotely before final merge, but main remains unchanged.

## Task 1 — official level registry
- RED observed: no official registry block existed.
- Renamed the current official runtime to `createNeonStartRuntime()` and retained a temporary compatibility alias.
- Added stable five-level registry in approved order with unique IDs/names/difficulties.
- Added structurally valid placeholders for the four new runtimes.
- Registry verification passed for count/order/uniqueness/runtime/replay slots and safe missing-ID behavior.

## Task 2 — per-level BEST storage
- RED observed: only legacy `neonDashBest` existed.
- Added `officialBestKey`, `getOfficialBest`, `setOfficialBest`, and idempotent legacy migration.
- Legacy score migrates only to `neon-start` and never overwrites an existing new-format score.
- Added `game.officialLevelId`; crash/finish/HUD paths now use the selected map's BEST.
- Verification passed for key isolation, clamping, monotonic BEST, idempotent migration, and no-overwrite behavior.

## Task 3 — official level-select screen
- Added `screen-official-levels` and dynamic five-card renderer.
- Main `게임 시작` now opens official level selection instead of launching directly.
- Cards refresh BEST/CLEAR state whenever the screen opens.
- `startOfficialLevel(levelId)` safely rejects unknown IDs and starts the matching runtime.
- Play header shows selected map name and difficulty.
- Level-select verification passed.

## Task 4 — four new official runtimes
- Replaced placeholders with full Pulse Factory, Sky Circuit, Wave Storm, and Final Eclipse runtimes.
- New maps use continuous legal cube floors, separated cube obstacle zones, and top/bottom-attached flight obstacles with ≥72 px corridor clearance.
- Cube portal spawn-overlap checks pass.
- Structural/complexity checks pass for all five runtimes.

## Task 5 — per-level official replay routing
- Added `getOfficialReplay(levelId)`.
- Official AUTO now selects the selected registry entry's replay, not the legacy single `OFFICIAL_REPLAY`.
- Replay failure remains scoped to the selected map; manual play stays available.
- Ruling: full “every registry entry has a replay” assertions are deferred to Task 6 because four replay payloads do not exist until generation; Task 5 verifies routing/plumbing only.

## Task 6 — five deterministic official replays
- Generated and embedded legal input-only 120 Hz replays for all four new maps; Neon Start retains its previously verified replay.
- Added per-level verified tick and fingerprint maps.
- Verified every official replay against the actual fixed-step physics:
  - Neon Start: 6912 ticks, 1362 events, fingerprint `og1-8a879f3c`
  - Pulse Factory: 3677 ticks, 310 events, fingerprint `og1-6f6cf846`
  - Sky Circuit: 4455 ticks, 1390 events, fingerprint `og1-26c33caa`
  - Wave Storm: 4766 ticks, 780 events, fingerprint `og1-10505b6a`
  - Final Eclipse: 5699 ticks, 1414 events, fingerprint `og1-2fa60601`
- 60/90/120/144 Hz render schedules all complete at the identical stored tick for each map.
- Removing the first critical replay event causes normal death on all five maps; no recovery/heuristic path exists.
- During generation, adjusted only a few over-compressed recovery obstacles and fixed the air→cube input-release edge case in the offline generator.

## Task 7 — official map presentation
- Added per-map accent identities: cyan, factory, sky, wave, eclipse.
- Official cards now expose `data-accent` and use map-specific neon edge/best colors.
- Difficulty stars, descriptions, selected-level name, and selected-level difficulty remain registry-driven.
- Presentation checks passed.

## Task 8 — full regression and deployment verification
- Fresh final production-script parse passed.
- Official registry verified: exactly five approved IDs/names in approved order.
- Per-level BEST isolation and legacy Neon Start migration passed.
- Official level-select navigation, refreshed BEST/CLEAR rendering, and per-map accents passed.
- All five runtime contracts, portal bounds, cube spawn safety, and ≥72 px flight/wave corridor clearance passed.
- All replay fingerprints match their current runtime geometry.
- Fresh deterministic replay verification:
  - Neon Start: 6912 ticks / 1362 events
  - Pulse Factory: 3677 ticks / 310 events
  - Sky Circuit: 4455 ticks / 1390 events
  - Wave Storm: 4766 ticks / 780 events
  - Final Eclipse: 5699 ticks / 1414 events
- Every replay clears at identical completion ticks under 60/90/120/144 Hz render schedules.
- Removing the first critical event causes normal death in every map.
- Existing custom replay, ND1 map code, cube/ship/wave, three synth tracks, device selector, landscape/fullscreen, and heuristic-AUTO removal checks all passed.
- Final review: no Critical or Important issue remains.

Ruling: As in the prior feature, exact GitHub-branch source was executed in the available V8 harness because the remote branch is not locally mounted. Repository node:test files are committed and mirror the verified assertions; production JS and deterministic physics were exercised directly.

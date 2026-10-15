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

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

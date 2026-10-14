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


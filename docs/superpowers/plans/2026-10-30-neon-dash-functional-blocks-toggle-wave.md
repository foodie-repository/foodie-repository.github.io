# Neon Dash Functional Blocks + Toggle Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make official maps 2–5 mechanically distinct and ~3× harder using functional block types, change Wave to press-to-toggle steering, remove unnecessary overlapping geometry, and regenerate deterministic AUTO replays.

**Architecture:** Keep production in the existing single `neon-dash/index.html`. Add deterministic special-block state/update/collision helpers that plug into the existing 120 Hz physics loop, route Wave steering through shared press-edge handling, then rebuild maps 2–5 around those mechanics. Finally regenerate and verify per-map replays against the new fingerprints.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, Web Audio API, localStorage, Node.js built-in `node:test` + `vm`, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-22-neon-dash-functional-blocks-toggle-wave-design.md`

## Global Constraints

- Neon Start remains unchanged.
- Ghost jumpscare remains unchanged.
- Custom-map editor behavior remains unchanged unless required by shared runtime compatibility.
- No heuristic AUTO fallback.
- Wave direction changes once per press edge; release does not steer.
- Functional block behavior must be deterministic under 120 Hz fixed-step replay.
- No random moving/electric/collapse behavior.
- Maps 2–5 must remain physically solvable with normal collision rules.
- Remove unnecessary overlapping solids, hidden duplicate collisions, and portal/solid overlaps.
- AUTO uses legal press/release inputs only.
- Replays for maps 2–5 must be regenerated if their fingerprints change.
- Production remains a single HTML file.
- Final deployment must provide a cache-busted version link.

## Review Focus

- A held key/touch must toggle Wave exactly once, never every frame.
- Mode transition into Wave must initialize a deterministic direction and not inherit stale state.
- Moving blocks must carry the player without tunneling or frame-rate drift.
- Electric/collapse visual state must exactly match collision state.
- Special blocks must not overlap ordinary blocks in a way that creates invisible collision edges.

---

### Task 1: Add shared special-block runtime primitives

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/special-block-core.test.mjs`

**Interfaces:**
- Produces:
  - `isBounceBlock(block)`
  - `isMovingBlock(block)`
  - `isElectricBlock(block)`
  - `isCollapseBlock(block)`
  - `movingBlockY(block, simTick)`
  - `electricBlockActive(block, simTick)`
  - `collapseBlockSolid(block, game)`
  - `resetSpecialBlockState()`

- [ ] Write failing tests for all four block kinds and deterministic state helpers.
- [ ] Run `node --test neon-dash/tests/special-block-core.test.mjs` and confirm RED.
- [ ] Implement the minimal pure helpers inside a marked DOM-free core block in `index.html`.
- [ ] Re-run tests and confirm GREEN.
- [ ] Commit: `feat: add deterministic special block primitives`.

### Task 2: Change Wave to press-to-toggle steering

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/wave-toggle-input.test.mjs`
- Modify: `neon-dash/tests/replay-core.test.mjs`

**Interfaces:**
- Produces:
  - `game.waveDirection`
  - `handlePressEdge(source)`
  - Wave update rule: `player.vy = game.waveDirection * 430`

- [ ] Write failing tests:
  - entering Wave sets default `+1`,
  - one press flips `+1 → -1`,
  - second press flips `-1 → +1`,
  - release does nothing,
  - holding does not retrigger,
  - replay press uses the same edge path.
- [ ] Verify RED.
- [ ] Route manual/replay press transitions through `handlePressEdge(source)`.
- [ ] Remove hold-based Wave steering.
- [ ] Reset `waveDirection` on run reset and deterministic Wave entry.
- [ ] Verify GREEN and run existing replay/input tests.
- [ ] Commit: `feat: toggle wave direction on press`.

### Task 3: Implement Pulse Factory Bounce Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/pulse-factory-bounce-blocks.test.mjs`

**Interfaces:**
- Consumes: special-block primitives.
- Produces top-contact bounce handling for `kind:'bounce-block'`.

- [ ] Write failing tests:
  - top landing applies configured power,
  - side/bottom contact remains normal solid collision,
  - same contact does not retrigger every tick,
  - leaving and re-landing can trigger again.
- [ ] Verify RED.
- [ ] Add bounce collision handling after landing resolution.
- [ ] Add Pulse Factory bounce-block rendering with piston/gear motif.
- [ ] Verify GREEN.
- [ ] Commit: `feat: add Pulse Factory bounce blocks`.

### Task 4: Implement Sky Circuit Moving Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/sky-circuit-moving-blocks.test.mjs`

**Interfaces:**
- Consumes: `movingBlockY(block, simTick)`.
- Produces deterministic moving-platform collision and player carry behavior.

- [ ] Write failing tests for min/max bounds, deterministic phase, and standing-player carry.
- [ ] Verify RED.
- [ ] Use tick-derived Y for render and collision.
- [ ] Carry a grounded player by the block's per-step Y delta.
- [ ] Add vertical rail/arrows visual.
- [ ] Verify GREEN at 60/90/120/144 render schedules using fixed-step simulation.
- [ ] Commit: `feat: add Sky Circuit moving blocks`.

### Task 5: Implement Wave Storm Electric Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/wave-storm-electric-blocks.test.mjs`

**Interfaces:**
- Consumes: `electricBlockActive(block, simTick)`.
- Produces active-only lethal collision for `kind:'electric-block'`.

- [ ] Write failing tests for active/inactive windows and phase offsets.
- [ ] Verify RED.
- [ ] Add active-only hazard collision.
- [ ] Render active blocks bright/electrified and inactive blocks dim/non-lethal.
- [ ] Verify GREEN.
- [ ] Commit: `feat: add Wave Storm electric blocks`.

### Task 6: Implement Final Eclipse Collapse Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/final-eclipse-collapse-blocks.test.mjs`

**Interfaces:**
- Produces:
  - `game.collapseTriggered`
  - `game.collapsedBlocks`
  - deterministic collapse countdown.

- [ ] Write failing tests:
  - untouched block stays solid,
  - valid top landing starts countdown once,
  - becomes non-solid at exact tick,
  - stays collapsed for remainder of attempt,
  - reset restores block.
- [ ] Verify RED.
- [ ] Implement trigger/countdown/reset collision behavior.
- [ ] Render cracks/fade to match state.
- [ ] Verify GREEN.
- [ ] Commit: `feat: add Final Eclipse collapse blocks`.

### Task 7: Rebuild official maps 2–5 and remove overlaps

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-map-overlap-audit.test.mjs`
- Modify: `neon-dash/tests/official-map-runtimes.test.mjs`

**Interfaces:**
- Consumes all four functional block types and toggle Wave.
- Produces revised map 2–5 runtime geometry.

- [ ] Write failing overlap audit tests for:
  - solid-solid overlap,
  - special-block/normal-block overlap,
  - hidden spike overlap,
  - portal spawn inside solid,
  - duplicate collision regions.
- [ ] Verify RED against current maps.
- [ ] Rebuild Pulse Factory around bounce chains and denser cube timing.
- [ ] Rebuild Sky Circuit around moving-platform timing + tighter flight gates.
- [ ] Rebuild Wave Storm around frequent Wave toggles + electric windows.
- [ ] Rebuild Final Eclipse around collapse blocks + frequent mode transitions.
- [ ] Remove redundant overlapping geometry.
- [ ] Keep Neon Start byte-for-byte gameplay geometry unchanged.
- [ ] Run structural/solvability tests and confirm GREEN.
- [ ] Commit: `feat: rebuild official maps 2 through 5`.

### Task 8: Update rendering for functional block readability

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/special-block-rendering.test.mjs`

**Interfaces:**
- Produces visually distinct render branches:
  - bounce: piston/launch motif,
  - moving: rail/arrows,
  - electric: live/dim electrical state,
  - collapse: intact/cracked/faded state.

- [ ] Write failing markup/source assertions for all four render branches.
- [ ] Verify RED.
- [ ] Implement state-aware rendering without changing collision logic.
- [ ] Verify GREEN.
- [ ] Commit: `style: render functional official blocks`.

### Task 9: Regenerate fingerprints and AUTO replays for maps 2–5

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/advanced-official-replays.test.mjs`
- Modify: `neon-dash/tests/five-official-replays.test.mjs`

**Interfaces:**
- Consumes final map geometry + final toggle Wave semantics.
- Produces new replay constants/fingerprints/tick metadata for:
  - Pulse Factory,
  - Sky Circuit,
  - Wave Storm,
  - Final Eclipse.

- [ ] Assert Neon Start fingerprint/replay are unchanged.
- [ ] Write failing tests requiring maps 2–5 replay fingerprint match + 100% completion.
- [ ] Generate legal 120 Hz replay streams using exact production physics.
- [ ] Embed new replay/fingerprint/final-tick metadata.
- [ ] Verify every changed map at 60/90/120/144 Hz:
  - 100% win,
  - identical final tick,
  - full replay cursor consumed.
- [ ] Remove a critical press from each replay and verify a normal death.
- [ ] Commit: `feat: regenerate advanced official auto replays`.

### Task 10: Full regression and deployment verification

**Files:**
- Modify only if regressions are found:
  - `neon-dash/index.html`
  - `neon-dash/tests/*.test.mjs`

**Interfaces:**
- Produces deployable GitHub Pages build.

- [ ] Run full test suite: `node --test neon-dash/tests/*.test.mjs`.
- [ ] Parse-check all inline JavaScript with `new Function(script)`.
- [ ] Verify:
  - Neon Start unchanged,
  - ghost jumpscare unchanged,
  - custom editor/replay still works,
  - Wave toggles only on press,
  - functional block state matches visuals,
  - no unnecessary overlaps remain,
  - 2–5 AUTO replays pass all four render schedules.
- [ ] Fetch final branch source and confirm no heuristic AUTO functions returned.
- [ ] Merge to `main` only after green verification.
- [ ] Re-fetch `main` and confirm deployed source contains the merged SHA.
- [ ] Provide cache-busted production link:
  `https://foodie-repository.github.io/neon-dash/?v=<merge-sha-prefix>`.

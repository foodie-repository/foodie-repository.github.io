# Neon Dash Functional Blocks + Toggle Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade official maps 2–5 with real functional signature blocks, press-to-toggle Wave controls, overlap cleanup, and regenerated deterministic AUTO replays while leaving Neon Start and the ghost jumpscare unchanged.

**Architecture:** Keep the single-file `neon-dash/index.html` production structure. Extend the existing runtime object model with deterministic special-block state and shared press-edge input handling, then update only official maps 2–5 and regenerate their replay payloads/fingerprints under the existing 120 Hz fixed-step engine.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, Web Audio API, localStorage, Node.js built-in `node:test` + `vm`, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-22-neon-dash-functional-blocks-toggle-wave-design.md`

## Global Constraints

- Neon Start geometry, fingerprint, replay, and difficulty remain unchanged.
- Ghost jumpscare behavior and assets remain unchanged.
- Wave changes direction exactly once per press edge; release does not steer.
- Functional blocks are deterministic and replay-safe.
- No randomness in moving/electric/collapse behavior.
- No heuristic AUTO fallback, invulnerability, teleporting, or collision bypass.
- Custom-map editor/replay behavior remains functional.
- Official maps 2–5 must remain physically solvable under normal collision rules.
- Maps 2–5 must have unnecessary overlapping collision geometry removed.
- AUTO replays for maps 2–5 must be regenerated and verified at 60/90/120/144 Hz.

## Review Focus

- Key repeat / held pointer must not toggle Wave more than once per press edge.
- Portal entry into Wave must always initialize the same direction.
- Moving blocks must carry a standing cube without tunneling or double-collisions.
- Electric/collapse state must reset cleanly on death/restart.
- Geometry cleanup must not accidentally remove intentional readable hazards.

---

### Task 1: Centralize press-edge input and implement toggle Wave

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/toggle-wave.test.mjs`

**Interfaces:**
- Produces:
  - `handlePressEdge(source)`
  - `game.waveDirection`
  - `WAVE_SPEED = 430`

- [ ] Write failing tests asserting:
  - entering Wave initializes `waveDirection = +1`,
  - one press flips +1→-1,
  - next press flips -1→+1,
  - release does not change direction,
  - repeated keydown with no release does not repeatedly toggle,
  - replay press uses the same edge path.
- [ ] Run tests and verify RED.
- [ ] Route manual/replay press transitions through `handlePressEdge`.
- [ ] Replace hold-based Wave vertical velocity with `game.waveDirection * WAVE_SPEED`.
- [ ] Reset direction on Wave portal entry/restart.
- [ ] Run tests and verify GREEN.
- [ ] Commit: `feat: add press-toggle wave controls`.

### Task 2: Add shared functional-block runtime primitives

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/functional-block-core.test.mjs`

**Interfaces:**
- Produces:
  - `isBounceBlock(block)`
  - `movingBlockY(block, simTick)`
  - `isElectricBlockActive(block, simTick)`
  - `isCollapseBlockSolid(block, gameState)`
  - attempt state for triggered/collapsed blocks.

- [ ] Write failing pure-logic tests for deterministic movement/electric/collapse calculations.
- [ ] Run RED.
- [ ] Add attempt state reset in `resetRun()`.
- [ ] Add pure helpers and runtime block-state projection.
- [ ] Run GREEN.
- [ ] Commit: `feat: add deterministic functional block primitives`.

### Task 3: Implement Bounce Block in Pulse Factory

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/pulse-factory-bounce.test.mjs`

**Interfaces:**
- Consumes functional-block core.
- Produces Pulse Factory `kind:'bounce-block'` geometry.

- [ ] Write failing tests:
  - Pulse Factory contains multiple bounce blocks,
  - top landing applies configured launch impulse,
  - side/bottom collision remains solid,
  - same contact does not retrigger every tick.
- [ ] Run RED.
- [ ] Integrate bounce-block landing behavior into cube collision.
- [ ] Replace selected standard blocks in Pulse Factory with bounce blocks and increase sequence density.
- [ ] Add distinctive piston/gear rendering.
- [ ] Run GREEN.
- [ ] Commit: `feat: add Pulse Factory bounce blocks`.

### Task 4: Implement Moving Block in Sky Circuit

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/sky-circuit-moving-block.test.mjs`

**Interfaces:**
- Produces deterministic vertical moving-block projection/carry behavior.

- [ ] Write failing tests:
  - Sky Circuit contains moving blocks,
  - same tick always yields same Y,
  - movement stays within `minY/maxY`,
  - player standing on top inherits platform delta Y,
  - collision uses projected current Y.
- [ ] Run RED.
- [ ] Add projected moving blocks to platform/collision/render paths.
- [ ] Update Sky Circuit geometry around timed moving-platform landings.
- [ ] Add rails/arrows rendering.
- [ ] Run GREEN.
- [ ] Commit: `feat: add Sky Circuit moving blocks`.

### Task 5: Implement Electric Block in Wave Storm

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/wave-storm-electric-block.test.mjs`

**Interfaces:**
- Produces deterministic active/inactive electric hazards.

- [ ] Write failing tests:
  - Wave Storm contains electric blocks,
  - active state repeats exactly by `periodTicks/activeTicks/phaseTicks`,
  - active collision is lethal,
  - inactive collision is non-lethal,
  - visual state matches collision state.
- [ ] Run RED.
- [ ] Add electric collision/render logic.
- [ ] Redesign Wave Storm corridors around frequent toggle-Wave inputs and timed electric windows.
- [ ] Run GREEN.
- [ ] Commit: `feat: add Wave Storm electric blocks`.

### Task 6: Implement Collapse Block in Final Eclipse

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/final-eclipse-collapse-block.test.mjs`

**Interfaces:**
- Produces deterministic trigger→delay→collapsed lifecycle.

- [ ] Write failing tests:
  - landing triggers countdown once,
  - solid until delay expires,
  - non-solid after collapse,
  - state resets on restart,
  - repeated contact does not restart timer.
- [ ] Run RED.
- [ ] Add collapse state/collision/render logic.
- [ ] Update Final Eclipse with chained collapse-block momentum sections and denser transitions.
- [ ] Run GREEN.
- [ ] Commit: `feat: add Final Eclipse collapse blocks`.

### Task 7: Audit and remove unnecessary overlaps in maps 2–5

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-overlap-cleanup.test.mjs`

**Interfaces:**
- Consumes all updated runtimes.

- [ ] Write failing overlap audit tests for:
  - solid-vs-solid redundant overlaps,
  - special-block vs standard-block duplicates,
  - hidden spikes fully inside blocks,
  - cube portal spawn overlap,
  - duplicate effective collision rectangles.
- [ ] Run RED.
- [ ] Clean geometry in Pulse Factory, Sky Circuit, Wave Storm, Final Eclipse.
- [ ] Preserve only intentional visible combinations.
- [ ] Run GREEN.
- [ ] Commit: `fix: clean official map collision overlaps`.

### Task 8: Rebalance maps 2–5 to ~3× current effective difficulty

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-difficulty-density.test.mjs`

**Interfaces:**
- Produces final map geometry before replay generation.

- [ ] Add structural difficulty tests comparing old baseline metadata/counts saved in the test:
  - higher obstacle/event density,
  - shorter average recovery spans,
  - more portal transitions where appropriate,
  - tighter legal corridor clearances.
- [ ] Run RED.
- [ ] Tune maps 2–5 without changing player speed multiplier.
- [ ] Confirm no impossible gaps/corridors.
- [ ] Run GREEN.
- [ ] Commit: `feat: rebalance official maps 2 through 5`.

### Task 9: Regenerate fingerprints and AUTO replays for maps 2–5

**Files:**
- Modify: `neon-dash/index.html`
- Modify/Create: replay verification tests under `neon-dash/tests/`

**Interfaces:**
- Produces new:
  - `PULSE_FACTORY_REPLAY`
  - `SKY_CIRCUIT_REPLAY`
  - `WAVE_STORM_REPLAY`
  - `FINAL_ECLIPSE_REPLAY`
  - verified tick/fingerprint metadata.

- [ ] Write failing replay-fingerprint tests after geometry changes.
- [ ] Generate legal 120 Hz input-only replay for each changed map.
- [ ] Verify each replay reaches 100%.
- [ ] Verify identical final tick at 60/90/120/144 Hz render schedules.
- [ ] Remove one critical press from each replay and verify normal death.
- [ ] Assert Neon Start fingerprint/replay is byte-for-byte unchanged.
- [ ] Commit: `feat: regenerate AUTO replays for advanced maps`.

### Task 10: Full regression, merge, and new version link

**Files:**
- Modify only if regressions are found.

**Interfaces:**
- Produces deployable `main` build and cache-busting URL.

- [ ] Run all `neon-dash/tests/*.test.mjs`.
- [ ] Parse-check production inline JavaScript with `new Function(script)`.
- [ ] Verify:
  - toggle Wave input,
  - 4 functional block types,
  - overlap cleanup,
  - maps 2–5 AUTO clears,
  - Neon Start unchanged,
  - ghost jumpscare unchanged,
  - custom editor/replay/map codes unchanged.
- [ ] Merge through PR into `main`.
- [ ] Fetch `main` and verify exact production blob.
- [ ] Provide:
  - normal URL,
  - `https://foodie-repository.github.io/neon-dash/?v=<merge-sha-prefix>`.


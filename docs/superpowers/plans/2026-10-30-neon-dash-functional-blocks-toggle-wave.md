# Neon Dash Functional Blocks + Toggle Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade official maps 2–5 with functional signature blocks, press-to-toggle Wave controls, cleaned collision geometry, and regenerated deterministic AUTO replays while preserving map 1 and the ghost jumpscare.

**Architecture:** Keep production in the existing single `neon-dash/index.html`. Extend the runtime with deterministic special-block state, centralize Wave press-edge handling, audit map geometry before replay generation, and regenerate official replays only for maps 2–5. Tests extract deterministic pure helpers where possible and exercise the real official runtime data.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, Web Audio API, localStorage, fixed-step 120 Hz replay engine, Node.js built-in `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-22-neon-dash-functional-blocks-toggle-wave-design.md`

## Global Constraints

- Neon Start remains unchanged in runtime, fingerprint, and replay.
- Ghost jumpscare remains unchanged.
- Maps 2–5 become roughly 3× harder through geometry, timing, transitions, and special mechanics—not 3× player speed.
- Wave steering changes to press-edge toggle; release does not steer.
- AUTO remains deterministic replay-only.
- No random special-block behavior.
- All special-block state resets on restart.
- No unnecessary overlapping solids, hidden duplicate collisions, or portal/solid overlaps.
- Production stays a single HTML file.
- Final deployment must include a cache-busting version URL.

## Review Focus

- Press-repeat / key-repeat must not double-toggle Wave.
- Touch press and keyboard press must share identical toggle semantics.
- Moving/electric/collapse state must use simulation tick, not wall-clock time.
- Special blocks must visually match their collision state.
- Replay corruption must cause normal death rather than recovery.

---

### Task 1: Centralize press-edge input and implement toggle Wave controls

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/wave-toggle-input.test.mjs`

**Interfaces:**
- Produces:
  - `handleInputPressEdge(source)`
  - `game.waveDirection`
  - `resetWaveDirection()`

- [ ] Write failing tests:
  - entering Wave initializes direction to +1,
  - one press toggles +1→-1,
  - second press toggles -1→+1,
  - release leaves direction unchanged,
  - held/repeat press does not toggle repeatedly,
  - replay press uses same edge path.
- [ ] Run tests; verify RED.
- [ ] Implement shared press-edge handler and route keyboard/touch/replay press transitions through it.
- [ ] Change Wave physics from held-state steering to `game.waveDirection * WAVE_SPEED`.
- [ ] Reset direction on Wave entry/restart.
- [ ] Run tests; verify GREEN.
- [ ] Commit: `feat: add press-toggle wave controls`.

### Task 2: Add deterministic special-block runtime state

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/special-block-state.test.mjs`

**Interfaces:**
- Produces:
  - `specialBlockStateAtTick(block, simTick)`
  - `game.collapseTriggered`
  - `game.collapsedBlocks`

- [ ] Write failing tests for:
  - moving-block position deterministic by tick,
  - electric active/inactive deterministic by tick,
  - collapse block trigger/reset behavior,
  - no wall-clock dependency.
- [ ] Run RED.
- [ ] Implement tick-based special-block state helpers.
- [ ] Reset attempt state on restart.
- [ ] Run GREEN.
- [ ] Commit: `feat: add deterministic special block state`.

### Task 3: Implement Pulse Factory Bounce Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/pulse-factory-bounce.test.mjs`

**Interfaces:**
- Produces `kind:'bounce-block'` collision behavior.

- [ ] Write failing tests:
  - top landing launches with configured power,
  - side/bottom behaves as solid collision,
  - standing contact does not retrigger every tick,
  - Pulse Factory contains multiple bounce-blocks.
- [ ] Run RED.
- [ ] Add bounce blocks to Pulse Factory and increase obstacle density/timing complexity.
- [ ] Run GREEN.
- [ ] Commit: `feat: add Pulse Factory bounce blocks`.

### Task 4: Implement Sky Circuit Moving Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/sky-circuit-moving.test.mjs`

**Interfaces:**
- Produces deterministic vertical moving block collision + player carry.

- [ ] Write failing tests:
  - block oscillates between minY/maxY,
  - same tick yields same Y,
  - standing player inherits vertical platform delta,
  - no geometry overlap with portals/solids.
- [ ] Run RED.
- [ ] Add moving blocks and tighten ship/landing sequences.
- [ ] Run GREEN.
- [ ] Commit: `feat: add Sky Circuit moving blocks`.

### Task 5: Implement Wave Storm Electric Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/wave-storm-electric.test.mjs`

**Interfaces:**
- Produces active/inactive lethal electric blocks.

- [ ] Write failing tests:
  - active state lethal,
  - inactive state non-lethal,
  - state deterministic from tick,
  - render state matches collision state.
- [ ] Run RED.
- [ ] Add electric blocks, increase Wave toggle density, and tighten legal corridors.
- [ ] Run GREEN.
- [ ] Commit: `feat: add Wave Storm electric blocks`.

### Task 6: Implement Final Eclipse Collapse Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/final-eclipse-collapse.test.mjs`

**Interfaces:**
- Produces trigger→countdown→non-solid collapse behavior.

- [ ] Write failing tests:
  - top landing triggers collapse,
  - block remains solid until delay expires,
  - becomes non-solid after delay,
  - reset restores block,
  - repeated contact does not restart countdown.
- [ ] Run RED.
- [ ] Add collapse blocks and denser final-stage transitions.
- [ ] Run GREEN.
- [ ] Commit: `feat: add Final Eclipse collapse blocks`.

### Task 7: Geometry overlap audit and cleanup

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-overlap-audit.test.mjs`

**Interfaces:**
- Consumes maps 2–5 runtime constructors.

- [ ] Write failing audit:
  - no duplicate solid rectangles,
  - no unnecessary solid-solid overlaps,
  - no portal spawn inside solids,
  - no special block stacked exactly on normal block,
  - no fully hidden spikes inside solids.
- [ ] Run RED against current changed maps.
- [ ] Remove/reposition unnecessary overlaps without reducing intended difficulty.
- [ ] Run GREEN.
- [ ] Commit: `fix: clean official map collision overlaps`.

### Task 8: Regenerate fingerprints and AUTO replays for maps 2–5

**Files:**
- Modify: `neon-dash/index.html`
- Modify/Create: `neon-dash/tests/advanced-official-replays.test.mjs`

**Interfaces:**
- Produces new:
  - `PULSE_FACTORY_REPLAY`
  - `SKY_CIRCUIT_REPLAY`
  - `WAVE_STORM_REPLAY`
  - `FINAL_ECLIPSE_REPLAY`
  - verified tick metadata and fingerprints.

- [ ] Write failing replay tests against changed fingerprints.
- [ ] Generate legal 120 Hz replay for Pulse Factory.
- [ ] Generate legal 120 Hz replay for Sky Circuit.
- [ ] Generate legal 120 Hz replay for Wave Storm using toggle presses.
- [ ] Generate legal 120 Hz replay for Final Eclipse.
- [ ] Verify each at 60/90/120/144 Hz with identical final tick.
- [ ] Remove one critical press from each replay and confirm normal death.
- [ ] Assert Neon Start fingerprint/replay unchanged.
- [ ] Commit: `feat: regenerate advanced official auto replays`.

### Task 9: Render functional block identities

**Files:**
- Modify: `neon-dash/index.html`
- Create/Modify: `neon-dash/tests/special-block-render.test.mjs`

- [ ] Write failing render assertions for each special kind.
- [ ] Add:
  - Bounce: piston/gear launch motif,
  - Moving: vertical arrows/rail,
  - Electric: active glow / inactive dim state,
  - Collapse: crack progression / hidden collapsed state.
- [ ] Ensure collision/render state use same tick/state helpers.
- [ ] Run GREEN.
- [ ] Commit: `style: render functional official blocks`.

### Task 10: Full regression, merge, and version link

**Files:**
- Modify only if regressions are found.

- [ ] Run full `node --test neon-dash/tests/*.test.mjs`.
- [ ] Parse-check inline production script with `new Function`.
- [ ] Verify:
  - Neon Start unchanged,
  - ghost jumpscare unchanged,
  - Wave toggle behavior,
  - special blocks 2–5,
  - no unnecessary overlaps,
  - AUTO 2–5 deterministic at 60/90/120/144,
  - custom maps/editor/map codes still work.
- [ ] Merge feature branch to `main`.
- [ ] Fetch deployed `main` and verify markers/fingerprints.
- [ ] Provide:
  - normal URL,
  - cache-busting URL `?v=<merge-sha-prefix>`.

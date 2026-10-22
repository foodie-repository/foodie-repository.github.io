# Neon Dash Functional Blocks + Toggle Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make official maps 2–5 roughly 3× harder through functional signature blocks and denser legal geometry, convert Wave to press-to-toggle steering, remove unnecessary overlaps, regenerate deterministic AUTO replays, and publish a new version link.

**Architecture:** Keep the current single-file production architecture in `neon-dash/index.html`. Add deterministic special-block state/update/collision helpers, route all Wave direction changes through press-edge handling, refactor official runtimes 2–5 to use the new mechanics, then regenerate replay payloads against new fingerprints. Neon Start and the ghost jumpscare remain unchanged.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, Web Audio API, localStorage, fixed-step 120 Hz simulation, Node.js built-in `node:test`, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-22-neon-dash-functional-blocks-toggle-wave-design.md`

## Global Constraints

- Neon Start gameplay/fingerprint/replay must remain unchanged.
- Ghost jumpscare behavior and assets must remain unchanged.
- Maps 2–5 must become materially harder without multiplying player speed by 3.
- New difficulty must come from timing density, shorter recovery windows, tighter legal corridors, functional blocks, and more frequent transitions.
- Wave uses press-edge toggling only; release does not steer.
- Holding input must not repeatedly toggle Wave direction.
- Replay data remains input-only `press`/`release`.
- No invulnerability, teleporting, forced recovery, or heuristic AUTO fallback.
- Functional block behavior must be deterministic under 120 Hz fixed-step simulation.
- Unnecessary solid/block/spike/portal overlaps must be removed from official maps 2–5.
- Existing custom-map editor and custom replay behavior remain functional.
- Production remains one `neon-dash/index.html` file plus tests/docs.

## Review Focus

- Input edge handling around portal entry must not toggle Wave twice when a key is already held; pin in Task 1.
- Moving blocks must carry a grounded player without tunneling or frame-rate drift; pin in Task 3.
- Electric/collapse states must reset correctly on restart and replay retry; pin in Task 4.
- Map cleanup must remove invisible overlaps without deleting intentional hazards; pin in Task 5.
- Replay regeneration must prove the changed maps work identically at 60/90/120/144 Hz rendering and fail normally when corrupted; pin in Task 7.

---

### Task 1: Replace hold-based Wave steering with press-to-toggle direction

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/wave-toggle-input.test.mjs`
- Modify: `neon-dash/tests/replay-core.test.mjs`

**Interfaces:**
- Produces:
  - `game.waveDirection`
  - `toggleWaveDirectionOnPress()`
  - shared press-edge path used by keyboard, pointer/touch, and replay
- Default Wave entry direction: `+1` (down-right).

- [ ] **Step 1: Write failing Wave input tests**

Assert:
- entering Wave initializes `waveDirection === 1`,
- one press toggles `1 → -1`,
- second distinct press toggles `-1 → 1`,
- release does not change direction,
- repeated keydown/held state does not toggle repeatedly,
- replay `press` uses the same toggle function,
- entering Wave while input is already held does not synthesize an extra toggle.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test neon-dash/tests/wave-toggle-input.test.mjs
```

Expected: FAIL because Wave currently derives velocity from held state.

- [ ] **Step 3: Implement shared press-edge handling**

Introduce a single press-edge function and call it from:
- manual key/pointer press transition,
- replay press event application.

Wave physics becomes:

```js
player.vy = game.waveDirection * 430;
```

Do not use `game.inputHeld ? -430 : 430` for Wave steering anymore.

- [ ] **Step 4: Reset direction on mode/restart boundaries**

- Wave entry → `+1`.
- Leaving Wave/restart → reset to `+1`.
- Release must not change direction.

- [ ] **Step 5: Run Wave + replay-core tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: toggle wave direction on press"
```

### Task 2: Add shared functional-block runtime state

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/functional-block-state.test.mjs`

**Interfaces:**
- Produces helpers:
  - `resetFunctionalBlockState()`
  - `getMovingBlockY(block, simTick)`
  - `isElectricBlockActive(block, simTick)`
  - `triggerCollapseBlock(blockId, simTick)`
  - `isCollapseBlockSolid(blockId, simTick)`
- Runtime state:
  - `game.collapseTriggered`
  - `game.collapsedBlocks`

- [ ] **Step 1: Write failing deterministic state tests**

Assert:
- moving block position is identical for identical tick,
- electric state repeats exactly at `periodTicks`,
- collapse block is solid before trigger,
- becomes non-solid only after `collapseDelayTicks`,
- restart clears collapse state,
- none of these helpers use randomness or render-frame time.

- [ ] **Step 2: Run tests and verify RED**

Expected: helpers do not exist.

- [ ] **Step 3: Implement minimal deterministic helpers**

Use `game.simTick` / fixed simulation ticks only.

- [ ] **Step 4: Hook reset into `resetRun()`**

Reset functional-block attempt state on every restart/death retry.

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/functional-block-state.test.mjs
git commit -m "feat: add deterministic functional block state"
```

### Task 3: Implement Bounce Block and Moving Block physics

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/bounce-moving-blocks.test.mjs`

**Interfaces:**
- Bounce block:
  - `kind:'bounce-block'`
  - `power`
- Moving block:
  - `kind:'moving-block'`
  - `minY`, `maxY`, `speed`, `phase`

- [ ] **Step 1: Write failing Bounce Block tests**

Assert:
- top landing launches player with configured power,
- side/bottom collision remains solid,
- continuous top contact does not retrigger every tick,
- leaving and landing again can retrigger.

- [ ] **Step 2: Write failing Moving Block tests**

Assert:
- block moves only vertically within `minY..maxY`,
- current collision rect uses current Y,
- grounded player on top receives the block's vertical delta,
- same 120 Hz tick sequence produces identical platform/player positions.

- [ ] **Step 3: Run tests and verify RED**

Expected: block kinds have no special physics.

- [ ] **Step 4: Implement collision integration**

Use the existing platform landing path rather than a separate physics engine.

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/bounce-moving-blocks.test.mjs
git commit -m "feat: add bounce and moving blocks"
```

### Task 4: Implement Electric Block and Collapse Block physics

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/electric-collapse-blocks.test.mjs`

**Interfaces:**
- Electric block:
  - `kind:'electric-block'`
  - `periodTicks`, `activeTicks`, `phaseTicks`
- Collapse block:
  - `kind:'collapse-block'`
  - `collapseDelayTicks`

- [ ] **Step 1: Write failing Electric Block tests**

Assert:
- active state follows deterministic tick cycle,
- active block kills on overlap,
- inactive block is non-lethal,
- rendering state helper matches collision state.

- [ ] **Step 2: Write failing Collapse Block tests**

Assert:
- landing triggers countdown once,
- block remains solid until delay expires,
- becomes non-solid afterward,
- restart restores it,
- AUTO/manual use identical behavior.

- [ ] **Step 3: Run tests and verify RED**

Expected: special collision behavior missing.

- [ ] **Step 4: Implement physics integration**

Keep special block collision/readability in the same runtime object collections used by official maps.

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/electric-collapse-blocks.test.mjs
git commit -m "feat: add electric and collapse blocks"
```

### Task 5: Rebuild official maps 2–5 and remove unnecessary overlaps

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-map-overlaps.test.mjs`
- Modify: `neon-dash/tests/official-map-runtimes.test.mjs`

**Interfaces:**
- Consumes all functional block kinds.
- Produces new runtimes/fingerprints for:
  - Pulse Factory
  - Sky Circuit
  - Wave Storm
  - Final Eclipse

- [ ] **Step 1: Write failing overlap-audit tests**

Detect:
- solid-vs-solid overlap with no explicit intentional flag,
- special block overlapping standard solid at same region,
- spike mostly hidden inside a block,
- cube portal spawn overlapping a solid,
- duplicate effective collision rectangles.

- [ ] **Step 2: Write failing map-specific mechanic tests**

Assert:
- Pulse Factory has multiple `bounce-block` sequences,
- Sky Circuit has multiple `moving-block` timing sections,
- Wave Storm has multiple `electric-block` windows and Wave toggle sequences,
- Final Eclipse has multiple `collapse-block` sections and all movement modes.

- [ ] **Step 3: Run tests and verify RED**

Expected: current maps fail functional mechanic requirements.

- [ ] **Step 4: Rebuild Pulse Factory**

Increase timing density ~3× subjectively:
- bounce chains,
- tighter spike/orb sequences,
- shorter recovery windows.

- [ ] **Step 5: Rebuild Sky Circuit**

- longer/tighter ship sections,
- moving-platform landing sequences,
- more frequent transitions.

- [ ] **Step 6: Rebuild Wave Storm**

- toggle-heavy Wave corridors,
- electric timing windows,
- narrow but legal passages,
- short recovery zones.

- [ ] **Step 7: Rebuild Final Eclipse**

- combine all relevant modes,
- collapse-block momentum sections,
- high transition frequency,
- hardest timing density.

- [ ] **Step 8: Remove all audit failures**

Every remaining overlap must either:
- be removed, or
- be explicitly documented/tested as intentional and visually readable.

- [ ] **Step 9: Run map runtime + overlap tests**

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: rebuild official maps with functional blocks"
```

### Task 6: Add functional-block rendering

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/functional-block-rendering.test.mjs`

**Interfaces:**
- Produces drawing paths for:
  - bounce block → launch/piston motif,
  - moving block → rail/arrows,
  - electric block → active/inactive electrical state,
  - collapse block → crack/collapse state.

- [ ] **Step 1: Write failing rendering tests**

Assert:
- every kind has a dedicated render branch,
- electric visual reads the same active-state helper as collision,
- moving block rendering uses current computed Y,
- collapse visual uses triggered/collapsed state.

- [ ] **Step 2: Run tests and verify RED**

- [ ] **Step 3: Implement drawing**

Keep collisions unchanged by drawing code.

- [ ] **Step 4: Run rendering tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/functional-block-rendering.test.mjs
git commit -m "style: render functional official blocks"
```

### Task 7: Regenerate and verify AUTO replays for maps 2–5

**Files:**
- Modify: `neon-dash/index.html`
- Modify: `neon-dash/tests/five-official-replays.test.mjs`
- Create: `neon-dash/tests/advanced-official-replays.test.mjs`

**Interfaces:**
- Produces new:
  - `PULSE_FACTORY_REPLAY`
  - `SKY_CIRCUIT_REPLAY`
  - `WAVE_STORM_REPLAY`
  - `FINAL_ECLIPSE_REPLAY`
- Neon Start replay remains byte-for-byte/fingerprint unchanged if its runtime did not change.

- [ ] **Step 1: Write failing fingerprint/replay tests**

Assert current replay fingerprints no longer match changed runtimes.

- [ ] **Step 2: Generate legal 120 Hz replay for Pulse Factory**

Include Bounce Block timing.

- [ ] **Step 3: Generate legal 120 Hz replay for Sky Circuit**

Include Moving Block timing/carry behavior.

- [ ] **Step 4: Generate legal 120 Hz replay for Wave Storm**

Replay presses must use new toggle semantics; releases must not steer.

- [ ] **Step 5: Generate legal 120 Hz replay for Final Eclipse**

Include Collapse Block state and all portal transitions.

- [ ] **Step 6: Verify render-rate determinism**

For maps 2–5 run at:
- 60 Hz
- 90 Hz
- 120 Hz
- 144 Hz

Assert:
- 100% completion,
- same final sim tick per map,
- matching fingerprint,
- replay cursor fully consumed.

- [ ] **Step 7: Corruption verification**

Remove one critical press from each replay and assert normal collision/death.

- [ ] **Step 8: Verify Neon Start unchanged**

Assert:
- runtime fingerprint unchanged,
- existing replay unchanged,
- completion tick unchanged.

- [ ] **Step 9: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: regenerate advanced official auto replays"
```

### Task 8: Full regression, ghost preservation, and publish new version link

**Files:**
- Modify only if regressions are found:
  - `neon-dash/index.html`
  - `neon-dash/tests/*.test.mjs`

**Interfaces:**
- Produces merge-ready deployment.

- [ ] **Step 1: Run full test suite**

```bash
node --test neon-dash/tests/*.test.mjs
```

Expected: 0 failures.

- [ ] **Step 2: Parse-check inline production script**

Run `new Function(script)`.

Expected: no SyntaxError.

- [ ] **Step 3: Verify ghost jumpscare unchanged**

Confirm:
- Enter shortcut remains,
- same ghost visual/audio behavior,
- game pauses/resumes as before.

- [ ] **Step 4: Verify custom-map regressions**

Confirm:
- editor,
- ND1 import/export,
- custom verification/replay,
- ship/cube controls,
- storage.

- [ ] **Step 5: Verify no heuristic AUTO code exists**

Search for old planner functions and fail if any return.

- [ ] **Step 6: Merge verified branch to `main`**

Use PR/merge with expected head SHA.

- [ ] **Step 7: Fetch `main` after merge and re-run critical checks**

Confirm merged source contains:
- functional block kinds,
- toggle Wave logic,
- new replay fingerprints,
- no unintended Neon Start changes.

- [ ] **Step 8: Publish cache-busting version link**

Return:

```
https://foodie-repository.github.io/neon-dash/?v=<merge-sha-prefix>
```

This is the requested new link.

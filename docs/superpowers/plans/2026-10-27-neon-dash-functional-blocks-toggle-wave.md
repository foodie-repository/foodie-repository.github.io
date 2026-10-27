# Neon Dash Functional Blocks + Toggle Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade official maps 2–5 with real functional signature blocks, change Wave to press-to-toggle steering, remove unnecessary overlapping geometry, and regenerate deterministic AUTO replays for the modified maps.

**Architecture:** Keep the production build as the existing single `neon-dash/index.html`. Add deterministic special-block state to the existing fixed-step simulation, route Wave steering through shared press-edge handling, redesign only official maps 2–5, and regenerate replay payloads against the new fingerprints. Preserve Neon Start and the ghost jumpscare unchanged.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, Web Audio API, localStorage, deterministic 120 Hz simulation/replay, Node.js `node:test` + `vm`, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-22-neon-dash-functional-blocks-toggle-wave-design.md`

## Global Constraints

- Official map 1 `Neon Start` runtime, fingerprint, and replay must remain unchanged.
- Ghost jumpscare code and behavior must remain unchanged.
- Maps 2–5 should feel roughly 3× harder through sequencing, timing, corridor width, mechanic density, and transitions — not by tripling player speed.
- Pulse Factory uses functional `bounce-block` objects.
- Sky Circuit uses deterministic vertical `moving-block` objects.
- Wave Storm uses deterministic `electric-block` hazards.
- Final Eclipse uses deterministic `collapse-block` objects.
- Wave steering changes direction exactly once per press edge; release does not steer.
- Keyboard, pointer/touch, and replay must share the same press-edge logic.
- No randomness in moving/electric/collapse block state.
- Remove unnecessary solid-solid overlaps, duplicate collision regions, hidden spikes, and portal spawn overlaps in official maps 2–5.
- AUTO remains replay-only with legal `press`/`release` events; no invulnerability, teleporting, forced recovery, or heuristic fallback.
- Regenerated official replays must use version 1 and 120 Hz physics.
- Existing custom-map editor/replay behavior remains functional.
- Production remains one HTML file.
- Final deployment must provide a cache-busting URL `?v=<merge-sha-prefix>`.

## Review Focus

- A press held across a Wave portal must not toggle repeatedly; pin this in Task 1.
- A moving block must carry a grounded player without tunneling or desynchronizing collision/render state; pin this in Task 3.
- Electric block active/inactive state must be identical at the same simulation tick regardless of render rate; pin this in Task 4.
- Collapse block state must reset fully on death/restart and never leak between attempts; pin this in Task 5.
- Geometry cleanup must not accidentally remove an intentional hazard or create a portal spawn collision; pin this in Task 6.

---

### Task 1: Replace hold-to-steer Wave with press-to-toggle Wave

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/wave-toggle.test.mjs`

**Interfaces:**
- Produces:
  - `game.waveDirection`
  - `handlePressEdge(source)`
  - `setWaveDirection(direction)`
- Consumes:
  - shared `setInputHeld(nextHeld, source)`
  - replay `press` / `release` events

- [ ] **Step 1: Write failing Wave input tests**

Assert:
- Wave entry initializes `waveDirection = +1` (down-right).
- One press edge flips `+1 → -1`.
- Next press edge flips `-1 → +1`.
- Release does not change direction.
- Repeated `true → true` input does not toggle again.
- Cube/ship press behavior remains unchanged.
- Replay-sourced `press` uses the same press-edge function as manual input.

- [ ] **Step 2: Run test and verify RED**

```bash
node --test neon-dash/tests/wave-toggle.test.mjs
```

Expected: FAIL because Wave still depends on held state.

- [ ] **Step 3: Implement shared press-edge handling**

Add:

```js
function setWaveDirection(direction) { ... }
function handlePressEdge(source) { ... }
```

Requirements:
- toggle only when `player.mode === 'wave'`,
- use only edge transitions,
- no repeated toggles while held.

- [ ] **Step 4: Change Wave physics**

Replace held-state steering with:

```js
player.vy = game.waveDirection * 430;
```

Reset Wave direction on:
- attempt reset,
- Wave portal entry,
- mode exit as needed for deterministic re-entry.

- [ ] **Step 5: Run Wave tests and full existing replay-core tests**

Expected: all PASS except official replay completion tests, which are expected to require regeneration later.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/wave-toggle.test.mjs
git commit -m "feat: toggle wave direction on press"
```

### Task 2: Add special-block runtime contract and attempt state

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/special-block-state.test.mjs`

**Interfaces:**
- Produces:
  - `getBlockRenderRect(block)`
  - `getBlockCollisionRect(block)`
  - `isElectricBlockActive(block, simTick)`
  - `getMovingBlockY(block, simTick)`
  - `isCollapseBlockSolid(block, gameState)`
- Runtime state:
  - `game.collapseTriggered`
  - `game.collapsedBlocks`

- [ ] **Step 1: Write failing pure-state tests**

Assert:
- standard block collision remains unchanged,
- moving-block Y is deterministic for identical tick,
- electric-block state is deterministic for identical tick,
- collapse-block solidity derives only from attempt state,
- reset clears all collapse state.

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL because special block helpers do not exist.

- [ ] **Step 3: Implement pure deterministic helpers**

Do not attach behavior to map-specific IDs; behavior is driven by `kind`.

- [ ] **Step 4: Integrate special-block state reset**

Reset on every run:
- `collapseTriggered = new Map()`
- `collapsedBlocks = new Set()`

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/special-block-state.test.mjs
git commit -m "feat: add deterministic special block state"
```

### Task 3: Implement Pulse Factory Bounce Blocks and Sky Circuit Moving Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/bounce-moving-blocks.test.mjs`

**Interfaces:**
- Consumes special-block helpers from Task 2.
- Produces:
  - `applyBounceBlockLanding(block)`
  - moving-block carry behavior during landing/update

- [ ] **Step 1: Write failing Bounce Block tests**

Assert:
- top landing on `bounce-block` applies configured upward power,
- side collision remains solid,
- repeated contact in the same landing does not retrigger every tick,
- leaving and landing again can retrigger.

- [ ] **Step 2: Write failing Moving Block tests**

Assert:
- vertical position stays in `minY..maxY`,
- identical simulation tick gives identical Y,
- standing player inherits platform delta-Y,
- player is not carried when not standing on the block,
- collision and render helpers use the same current Y.

- [ ] **Step 3: Run tests and verify RED**

Expected: FAIL.

- [ ] **Step 4: Integrate Bounce Block behavior into cube landing**

Pulse Factory block power target:
- default `-900` unless per-block power is explicitly set.

- [ ] **Step 5: Integrate Moving Block simulation/carry**

Moving blocks are evaluated by `game.simTick` during deterministic runs and an equivalent deterministic tick source during normal play.

Ruling to record during execution:
- all official map play should use the same simulation tick source for dynamic special blocks if needed to avoid manual/AUTO divergence.

- [ ] **Step 6: Add distinct rendering**

Bounce Block:
- piston/gear/launch motif.

Moving Block:
- vertical arrows + rail markers.

- [ ] **Step 7: Run tests**

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/bounce-moving-blocks.test.mjs
git commit -m "feat: add bounce and moving blocks"
```

### Task 4: Implement Wave Storm Electric Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/electric-block.test.mjs`

**Interfaces:**
- Consumes `isElectricBlockActive(block, simTick)`.
- Produces:
  - active electric-block collision,
  - inactive non-lethal state,
  - active/inactive rendering.

- [ ] **Step 1: Write failing electric-state tests**

Assert:
- `periodTicks`, `activeTicks`, and `phaseTicks` define state exactly,
- same tick always returns same state,
- inactive block is non-lethal/non-solid as specified,
- active block kills on collision,
- 60/90/120/144 render schedules produce the same electric state at equal simulation tick.

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL.

- [ ] **Step 3: Integrate electric collision**

Apply only to `kind:'electric-block'`.

- [ ] **Step 4: Add rendering states**

Active:
- bright lime lightning/arc motif.

Inactive:
- dim outline with clear non-active appearance.

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/electric-block.test.mjs
git commit -m "feat: add deterministic electric blocks"
```

### Task 5: Implement Final Eclipse Collapse Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/collapse-block.test.mjs`

**Interfaces:**
- Produces:
  - `triggerCollapseBlock(block, simTick)`
  - `isCollapseBlockSolid(block, simTick)`
  - collapse visual state

- [ ] **Step 1: Write failing collapse tests**

Assert:
- block starts solid,
- top landing stores trigger tick once,
- block stays solid during `collapseDelayTicks`,
- block becomes non-solid after delay,
- retrigger does not extend/reset countdown,
- restart restores the block,
- two identical runs collapse at the same tick.

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL.

- [ ] **Step 3: Integrate collapse trigger and collision**

Only valid top landing starts collapse countdown.

- [ ] **Step 4: Add crack/fade rendering states**

Visual state must correspond exactly to collision state.

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/collapse-block.test.mjs
git commit -m "feat: add collapse blocks"
```

### Task 6: Redesign official maps 2–5 and remove unnecessary overlaps

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-map-overlap.test.mjs`
- Modify: `neon-dash/tests/official-map-runtimes.test.mjs`

**Interfaces:**
- Consumes all functional block kinds.
- Produces revised runtimes:
  - `createPulseFactoryRuntime()`
  - `createSkyCircuitRuntime()`
  - `createWaveStormRuntime()`
  - `createFinalEclipseRuntime()`

- [ ] **Step 1: Write failing overlap audit tests**

For maps 2–5 detect:
- exact/near-duplicate solid rectangles,
- solid blocks overlapping special blocks without explicit intent,
- spikes fully hidden inside solids,
- cube portal spawn rectangles overlapping solids,
- duplicate effective collision regions.

Allow an explicit `intentionalOverlap:true` escape only if a combination is visually/mechanically intentional.

- [ ] **Step 2: Write difficulty/mechanic tests**

Assert:
- Pulse Factory has multiple Bounce Blocks and denser timing than before.
- Sky Circuit has multiple Moving Blocks plus longer/tighter flight sequences.
- Wave Storm has multiple Electric Blocks plus more Wave direction changes.
- Final Eclipse has multiple Collapse Blocks plus frequent mode transitions.
- Neon Start constructor/fingerprint remains byte/semantic equivalent to the approved baseline.

- [ ] **Step 3: Run tests and verify RED**

Expected: current maps fail special-block/difficulty tests.

- [ ] **Step 4: Redesign Pulse Factory**

Use Bounce Blocks as actual route mechanics, not decoration.

- [ ] **Step 5: Redesign Sky Circuit**

Place Moving Blocks where timed landings materially affect the route.

- [ ] **Step 6: Redesign Wave Storm**

Place Electric Blocks to create timed Wave windows compatible with press-to-toggle controls.

- [ ] **Step 7: Redesign Final Eclipse**

Use Collapse Blocks to force continuous movement and reduce recovery windows.

- [ ] **Step 8: Remove redundant overlaps found by audit**

Do not hide impossible geometry behind AUTO.

- [ ] **Step 9: Run map structure/overlap tests**

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: redesign official maps 2 through 5"
```

### Task 7: Regenerate fingerprints and AUTO replays for maps 2–5

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/advanced-official-replays.test.mjs`
- Modify: `neon-dash/tests/five-official-replays.test.mjs`

**Interfaces:**
- Consumes revised runtimes and fixed-step engine.
- Produces updated:
  - `PULSE_FACTORY_REPLAY`
  - `SKY_CIRCUIT_REPLAY`
  - `WAVE_STORM_REPLAY`
  - `FINAL_ECLIPSE_REPLAY`
  - per-level fingerprint metadata,
  - per-level verified final tick metadata.

- [ ] **Step 1: Write failing replay completion tests**

For maps 2–5 assert:
- fingerprint matches runtime,
- replay reaches 100%,
- no bypass/recovery hook,
- replay uses only `press`/`release`,
- Wave replay follows press-to-toggle semantics.

- [ ] **Step 2: Add render-rate determinism tests**

For each changed map run at:
- 60 Hz
- 90 Hz
- 120 Hz
- 144 Hz

Assert identical final simulation tick per map.

- [ ] **Step 3: Add corruption tests**

Remove one critical `press` event from each map and assert a normal collision/death.

- [ ] **Step 4: Generate Pulse Factory replay**

- [ ] **Step 5: Generate Sky Circuit replay**

- [ ] **Step 6: Generate Wave Storm replay**

- [ ] **Step 7: Generate Final Eclipse replay**

- [ ] **Step 8: Prove Neon Start unchanged**

Assert:
- runtime fingerprint unchanged,
- replay payload unchanged,
- verified tick unchanged.

- [ ] **Step 9: Run replay tests**

Expected: all PASS.

- [ ] **Step 10: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: regenerate advanced official auto replays"
```

### Task 8: Full regression, ghost preservation, deployment, and version link

**Files:**
- Modify only if regression is found:
  - `neon-dash/index.html`
  - `neon-dash/tests/*.test.mjs`

**Interfaces:**
- Consumes all previous tasks.
- Produces deployable `main` build and cache-busting URL.

- [ ] **Step 1: Run complete automated suite**

```bash
node --test neon-dash/tests/*.test.mjs
```

Expected: 0 failures.

- [ ] **Step 2: Parse-check inline production JavaScript**

Run `new Function(script)`.

Expected: no SyntaxError.

- [ ] **Step 3: Verify ghost jumpscare unchanged**

Assert the approved ghost image/audio/fullscreen/pause implementation is unchanged from the pre-feature baseline.

- [ ] **Step 4: Verify Wave behavior manually in simulation**

Assert:
- press toggles,
- release does nothing,
- holding does not retrigger,
- portal entry default is deterministic.

- [ ] **Step 5: Verify map overlap audit**

0 unintended overlap findings in maps 2–5.

- [ ] **Step 6: Verify official AUTO**

Maps 2–5:
- 100% clear at 60/90/120/144,
- same final tick per map,
- corrupted replay dies normally.

Map 1:
- unchanged result.

- [ ] **Step 7: Verify existing features**

Confirm:
- custom map editor,
- ND1 codes,
- custom replay recording/playback,
- ship,
- cube,
- music,
- phone/tablet mode,
- fullscreen,
- ghost jumpscare.

- [ ] **Step 8: Merge verified branch to `main`**

Use PR/merge if `main` moved.

- [ ] **Step 9: Fetch deployed `main` source and verify exact merged content**

Confirm:
- special block kinds,
- Wave toggle logic,
- revised map fingerprints/replays,
- no heuristic AUTO.

- [ ] **Step 10: Return new versioned link**

Format:

```
https://foodie-repository.github.io/neon-dash/?v=<merge-sha-prefix>
```

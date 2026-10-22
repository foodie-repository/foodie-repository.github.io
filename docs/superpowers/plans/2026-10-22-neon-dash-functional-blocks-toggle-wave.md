# Neon Dash Functional Blocks + Toggle Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade official maps 2–5 with functional signature blocks, toggle-on-press Wave steering, cleaned non-overlapping geometry, and regenerated deterministic AUTO replays, while keeping Neon Start and the ghost jumpscare unchanged.

**Architecture:** Preserve the existing single-file production game in `neon-dash/index.html`. Add deterministic special-block runtime state and one shared press-edge input path so manual input and replay input use identical semantics. Rebuild maps 2–5 around the new mechanics, run structural overlap audits, regenerate fingerprints/replays, and verify all changed maps at 60/90/120/144 Hz.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, Web Audio API, localStorage, Node.js built-in `node:test` + `vm`, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-22-neon-dash-functional-blocks-toggle-wave-design.md`

## Global Constraints

- Neon Start must remain unchanged.
- Ghost jumpscare must remain unchanged.
- Pulse Factory gets functional `bounce-block` mechanics.
- Sky Circuit gets deterministic `moving-block` mechanics.
- Wave Storm gets deterministic `electric-block` mechanics.
- Final Eclipse gets deterministic `collapse-block` mechanics.
- Wave steering changes to one direction toggle per press edge.
- Wave release does not change direction.
- Holding input must not repeatedly toggle Wave direction.
- Keyboard, pointer/touch, and replay must share the same press-edge logic.
- Remove unnecessary solid/solid, hidden spike/block, portal/solid, duplicate collision, and special-block/standard-block overlaps.
- AUTO remains replay-only; no invulnerability, teleporting, forced recovery, or heuristic fallback.
- Changed official maps must regenerate fingerprints and 120 Hz replays.
- Each changed replay must clear at 60/90/120/144 Hz with identical final simulation tick for that map.
- Production remains one HTML file.
- Existing custom-map editor/replay behavior must continue working.
- Final deployment must provide a cache-busted version URL.

## Review Focus

- A press event arriving exactly on a cube→Wave portal tick must toggle at most once and use the documented Wave default direction; pin this in Task 1.
- Moving-block contact must carry the player without tunneling into adjacent solids or double-applying platform motion; pin this in Task 3.
- Electric-block state must be identical for manual fixed-step verification and replay playback at the same simulation tick; pin this in Task 4.
- Collapse-block state must reset on death/restart and must not leak across attempts or AUTO runs; pin this in Task 5.
- Map cleanup must distinguish intentional visible combinations from invisible duplicate collision geometry; pin this in Task 6.

---

### Task 1: Convert Wave steering to press-edge toggle input

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/wave-toggle-input.test.mjs`

**Interfaces:**
- Produces:
  - `game.waveDirection`
  - `handleInputPressEdge(source)`
  - shared press-edge routing from manual/replay input
- Wave direction values:
  - `-1` = upward-right
  - `+1` = downward-right
- Default Wave entry direction: `+1`

- [ ] **Step 1: Write failing Wave input tests**

Assert:
- entering Wave initializes `game.waveDirection === 1`,
- one press edge toggles `+1 → -1`,
- next press edge toggles `-1 → +1`,
- release does not change direction,
- repeated held-state writes do not toggle,
- keyboard/pointer manual press and replay press call the same press-edge helper,
- a press on the same fixed tick as a Wave portal transition toggles no more than once.

- [ ] **Step 2: Run test and verify RED**

```bash
node --test neon-dash/tests/wave-toggle-input.test.mjs
```

Expected: FAIL because Wave currently uses held-state steering.

- [ ] **Step 3: Implement shared press-edge behavior**

Update `setInputHeld(nextHeld, source)` so a false→true transition invokes `handleInputPressEdge(source)`.

For Wave:

```js
function handleInputPressEdge(source) {
  if (player.mode === 'wave') game.waveDirection *= -1;
}
```

Keep cube jump buffering on press edge.

- [ ] **Step 4: Change Wave physics**

Replace held-state velocity:

```js
player.vy = game.inputHeld ? -430 : 430;
```

with:

```js
player.vy = game.waveDirection * 430;
```

Reset direction consistently on Wave entry/restart.

- [ ] **Step 5: Run Wave input tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/wave-toggle-input.test.mjs
git commit -m "feat: toggle wave direction on press"
```

### Task 2: Add common special-block runtime infrastructure

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/special-block-runtime.test.mjs`

**Interfaces:**
- Produces:
  - `isSpecialBlock(block)`
  - `getRuntimeBlockRect(block, simTick)`
  - `resetSpecialBlockState()`
  - runtime collections/state for moving/electric/collapse blocks

- [ ] **Step 1: Write failing infrastructure tests**

Assert:
- supported kinds are exactly `bounce-block`, `moving-block`, `electric-block`, `collapse-block`,
- standard blocks retain current behavior,
- current block rectangle can be requested without mutating source geometry,
- special attempt state resets to empty/default on `resetRun()`,
- Neon Start contains no special blocks.

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL because special block runtime helpers do not exist.

- [ ] **Step 3: Add deterministic special-block helpers**

Use current simulation tick as the only timing source.

Do not use `Date.now()`, `performance.now()`, randomness, or render frame count for gameplay state.

- [ ] **Step 4: Route collision/render queries through runtime block rectangles**

Where block position/state can vary, use the same helper for:
- landing detection,
- side collision,
- drawing,
- special mechanics.

- [ ] **Step 5: Run infrastructure tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/special-block-runtime.test.mjs
git commit -m "feat: add deterministic special block runtime"
```

### Task 3: Implement Pulse Factory bounce blocks and Sky Circuit moving blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/bounce-moving-blocks.test.mjs`

**Interfaces:**
- Consumes: special-block runtime from Task 2.
- Produces:
  - bounce-block landing launch behavior,
  - deterministic moving-block position,
  - moving-platform carry behavior.

- [ ] **Step 1: Write failing bounce-block tests**

Assert:
- top landing applies configured upward impulse,
- side/bottom collision remains solid,
- continuous top contact does not retrigger every tick,
- leaving and legitimately landing again can trigger again.

- [ ] **Step 2: Write failing moving-block tests**

Assert:
- moving block stays within `minY/maxY`,
- same simulation tick always produces same Y,
- phase offset is deterministic,
- player standing on top is displaced by the block's vertical delta,
- player is not moved when no longer supported by the block.

- [ ] **Step 3: Run tests and verify RED**

Expected: FAIL.

- [ ] **Step 4: Implement bounce-block behavior**

Recommended Pulse Factory launch power: around `-900`, tuned only if map solvability tests require a nearby deterministic value.

- [ ] **Step 5: Implement moving-block behavior**

Use a deterministic triangular or sinusoidal path derived from simulation tick. Prefer a triangular path if it simplifies collision/carry calculation.

- [ ] **Step 6: Add distinct functional rendering**

- Bounce: piston/gear/launch arrows.
- Moving: vertical rails/arrows, with block drawn at current runtime Y.

- [ ] **Step 7: Run tests**

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/bounce-moving-blocks.test.mjs
git commit -m "feat: add bounce and moving blocks"
```

### Task 4: Implement Wave Storm electric blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/electric-blocks.test.mjs`

**Interfaces:**
- Produces:
  - `isElectricBlockActive(block, simTick)`
  - active-state lethal collision,
  - inactive-state non-lethal pass-through.

- [ ] **Step 1: Write failing electric-state tests**

Assert:
- state depends only on `periodTicks`, `activeTicks`, `phaseTicks`, and `simTick`,
- active/inactive boundary ticks are exact,
- repeated evaluation at the same tick is identical,
- inactive electric block does not kill or block the player,
- active electric block kills on overlap.

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL.

- [ ] **Step 3: Implement electric block collision**

Exclude inactive electric blocks from solid/lethal collision arrays.

- [ ] **Step 4: Implement active/inactive rendering**

- active: bright lime electrical arcs/glow,
- inactive: dim transparent shell,
- collision state and visual state use the same `isElectricBlockActive()` result.

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/electric-blocks.test.mjs
git commit -m "feat: add electric hazard blocks"
```

### Task 5: Implement Final Eclipse collapse blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/collapse-blocks.test.mjs`

**Interfaces:**
- Produces attempt state:
  - `game.collapseTriggered`
  - `game.collapsedBlocks`
- Produces:
  - `triggerCollapseBlock(block, simTick)`
  - `isCollapseBlockSolid(block, simTick)`

- [ ] **Step 1: Write failing collapse-block tests**

Assert:
- initially solid,
- valid top landing records trigger tick once,
- remains solid for exactly `collapseDelayTicks`,
- becomes non-solid afterward,
- cannot retrigger after collapse,
- restart clears all trigger/collapsed state.

- [ ] **Step 2: Run tests and verify RED**

Expected: FAIL.

- [ ] **Step 3: Implement deterministic collapse state**

Use simulation tick only.

- [ ] **Step 4: Add crack/fade rendering**

Visual states:
- untouched,
- triggered/cracking,
- collapsed/hidden.

- [ ] **Step 5: Run tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/collapse-blocks.test.mjs
git commit -m "feat: add collapse blocks"
```

### Task 6: Rebuild maps 2–5 for ~3× effective difficulty and clean overlaps

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-map-overlap-audit.test.mjs`
- Modify: `neon-dash/tests/official-map-runtimes.test.mjs`

**Interfaces:**
- Consumes: special block mechanics from Tasks 2–5.
- Produces revised runtime constructors for maps 2–5.

- [ ] **Step 1: Write failing geometry audit tests**

For Pulse Factory, Sky Circuit, Wave Storm, Final Eclipse assert:
- no duplicate solid collision rectangles,
- no special block shares the same effective rectangle with a standard block,
- no hidden spike entirely contained inside a solid,
- no cube portal spawn rectangle intersects a solid,
- no two solids overlap unless explicitly allow-listed with a named intentional reason,
- every allow-listed overlap remains visually readable.

- [ ] **Step 2: Write map-specific mechanic/density tests**

Assert:
- Pulse Factory has multiple bounce-block chains,
- Sky Circuit has multiple moving landing blocks,
- Wave Storm has multiple electric timing gates and Wave-heavy sections,
- Final Eclipse has multiple collapse blocks and frequent mode transitions,
- map 2–5 obstacle/mechanic density materially exceeds current baseline without changing player speed by 3×.

- [ ] **Step 3: Run tests and verify RED**

Expected: current maps fail signature-mechanic/density requirements.

- [ ] **Step 4: Rebuild Pulse Factory**

Increase difficulty through:
- denser spike/orb sequences,
- bounce-block chains,
- shorter recovery gaps,
- one or more tighter ship transitions.

- [ ] **Step 5: Rebuild Sky Circuit**

Increase difficulty through:
- moving-block landing windows,
- longer ship corridors,
- tighter alternating gates,
- more mode transitions.

- [ ] **Step 6: Rebuild Wave Storm**

Increase difficulty through:
- toggle-Wave sequences,
- electric timing gates,
- narrow but legal corridors,
- frequent directional toggles.

- [ ] **Step 7: Rebuild Final Eclipse**

Increase difficulty through:
- all modes,
- collapse-block momentum sections,
- dense late-game portal chains,
- shortest recovery windows.

- [ ] **Step 8: Remove unnecessary overlaps**

Audit every map 2–5 object list and delete/reposition redundant geometry rather than hiding it visually.

- [ ] **Step 9: Run geometry/density tests**

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: rebuild official maps with functional hazards"
```

### Task 7: Preserve Neon Start and ghost-jumpscare regression guarantees

**Files:**
- Modify: `neon-dash/tests/official-map-runtimes.test.mjs`
- Modify: `neon-dash/tests/enter-jumpscare.test.mjs`
- Create: `neon-dash/tests/neon-start-unchanged.test.mjs`

**Interfaces:**
- Consumes current Neon Start fingerprint/replay metadata.
- Produces regression lock for unchanged areas.

- [ ] **Step 1: Add Neon Start regression test**

Pin:
- runtime fingerprint,
- levelEnd,
- replay fingerprint,
- verified final tick,
- no special blocks.

- [ ] **Step 2: Re-run ghost jumpscare test**

Ensure Enter jumpscare behavior/source image remains unchanged from current main.

- [ ] **Step 3: Run tests**

Expected: PASS without production changes.

- [ ] **Step 4: Commit tests if needed**

```bash
git add neon-dash/tests
git commit -m "test: lock unchanged Neon Start and jumpscare"
```

### Task 8: Regenerate fingerprints and deterministic AUTO replays for maps 2–5

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/advanced-official-replays.test.mjs`
- Modify: `neon-dash/tests/five-official-replays.test.mjs`

**Interfaces:**
- Consumes: final map geometry and toggle-Wave semantics.
- Produces new replay constants/fingerprints/ticks for:
  - `PULSE_FACTORY_REPLAY`
  - `SKY_CIRCUIT_REPLAY`
  - `WAVE_STORM_REPLAY`
  - `FINAL_ECLIPSE_REPLAY`

- [ ] **Step 1: Write failing fingerprint/replay tests**

Assert current replay fingerprints no longer match changed maps.

- [ ] **Step 2: Generate legal 120 Hz replay for Pulse Factory**

Replay events remain press/release only.

- [ ] **Step 3: Generate legal 120 Hz replay for Sky Circuit**

Solver/replay must account for moving-platform positions.

- [ ] **Step 4: Generate legal 120 Hz replay for Wave Storm**

Replay must use press edges to toggle Wave direction; releases do not steer.

- [ ] **Step 5: Generate legal 120 Hz replay for Final Eclipse**

Replay must account for collapse state and reset semantics.

- [ ] **Step 6: Verify render-rate determinism**

For each changed map at 60/90/120/144 Hz:
- win = true,
- death = false,
- same final sim tick across rates,
- replay cursor fully consumed.

- [ ] **Step 7: Verify replay corruption**

Remove one critical press from each replay and assert normal death, not recovery.

- [ ] **Step 8: Verify Neon Start replay is byte-for-byte or semantically unchanged**

- [ ] **Step 9: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: regenerate advanced official auto replays"
```

### Task 9: Full regression, deployment, and new version link

**Files:**
- Modify only if regression fixes are required:
  - `neon-dash/index.html`
  - `neon-dash/tests/*.test.mjs`

**Interfaces:**
- Produces merged GitHub Pages build and cache-busted user URL.

- [ ] **Step 1: Run complete test suite**

```bash
node --test neon-dash/tests/*.test.mjs
```

Expected: 0 failures.

- [ ] **Step 2: Parse-check production inline JavaScript**

Extract inline script and run `new Function(script)`.

Expected: no SyntaxError.

- [ ] **Step 3: Verify requirements checklist**

Confirm:
- Neon Start unchanged,
- maps 2–5 significantly harder,
- each map has functional signature blocks,
- Wave toggles once per press,
- release does not steer,
- no unnecessary overlap remains,
- AUTO passes changed maps at 60/90/120/144 Hz,
- corrupted replays die normally,
- ghost jumpscare still works,
- custom maps/editor remain functional.

- [ ] **Step 4: Merge to `main`**

Use a feature branch + PR/merge to avoid overwriting unrelated work.

- [ ] **Step 5: Fetch final `main` source and verify deployed markers**

- [ ] **Step 6: Return new cache-busted link**

Format:

```
https://foodie-repository.github.io/neon-dash/?v=<merge-sha-prefix>
```

- [ ] **Step 7: Record final verification evidence**


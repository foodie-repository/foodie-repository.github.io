# Neon Dash Functional Blocks + Toggle Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade official maps 2–5 with functional signature blocks, press-to-toggle Wave controls, cleaned geometry, and regenerated deterministic AUTO replays while leaving Neon Start and the ghost jumpscare unchanged.

**Architecture:** Keep production in the existing single `neon-dash/index.html`. Extend the runtime/collision model with deterministic special-block state, centralize Wave direction changes on press edges, redesign map 2–5 geometry around those mechanics, and regenerate replay data against the resulting fingerprints. Tests remain in `neon-dash/tests/*.test.mjs`.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, Web Audio API, localStorage, deterministic 120 Hz replay engine, Node.js built-in `node:test` + `vm`.

**Spec:** `docs/superpowers/specs/2026-10-22-neon-dash-functional-blocks-toggle-wave-design.md`

## Global Constraints

- Neon Start gameplay/fingerprint/replay must remain unchanged.
- Ghost jumpscare behavior and visual must remain unchanged.
- Maps 2–5 should feel roughly 3× harder through density/timing/transition complexity, not 3× player speed.
- Wave direction changes exactly once per press edge; release does not steer.
- AUTO remains replay-only with no invulnerability, teleporting, collision bypass, or heuristic recovery.
- Special block behavior is deterministic and resettable per attempt.
- Custom-map editor and custom replay behavior remain functional.
- Remove unnecessary solid overlap, hidden collision edges, duplicate collision regions, and portal/solid intersections.
- Production remains a single HTML file.

## Review Focus

- Repeated keydown/pointer hold must toggle Wave only once per press; pin in Task 1.
- Special block state must reset on death/restart and replay restart; pin in Task 2.
- Moving/electric/collapse block collision and rendering state must agree on the same tick; pin in Task 2 and Task 4.
- Intentional geometry combinations must not be deleted by overlap cleanup; pin in Task 3.
- Changed map fingerprints must invalidate stale replays while Neon Start remains byte-for-byte fingerprint-compatible; pin in Task 5.

---

### Task 1: Replace hold-to-steer Wave with press-to-toggle direction

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/toggle-wave.test.mjs`

**Interfaces:**
- Produces:
  - `game.waveDirection`
  - `toggleWaveDirectionOnPress(source)`
- Consumes:
  - shared `setInputHeld(nextHeld, source)`
  - existing keyboard/pointer/replay input paths.

- [ ] **Step 1: Write failing Wave input tests**

Assert:
- entering Wave initializes `game.waveDirection = 1` (down-right),
- a false→true input transition toggles direction once,
- true→true does not toggle again,
- release does not change direction,
- replay `press` uses the same toggle path,
- leaving/re-entering Wave restores the documented default.

- [ ] **Step 2: Run RED**

```bash
node --test neon-dash/tests/toggle-wave.test.mjs
```

Expected: FAIL because Wave still derives direction from held state.

- [ ] **Step 3: Implement edge-triggered Wave direction**

Update shared input handling so a press edge while `player.mode === 'wave'` flips `game.waveDirection`.

Change Wave physics to:

```js
player.vy = game.waveDirection * 430;
```

Do not use `game.inputHeld ? -430 : 430` for Wave steering.

- [ ] **Step 4: Reset direction deterministically**

Set `game.waveDirection = 1`:
- on attempt reset,
- on Wave portal entry.

- [ ] **Step 5: Run tests GREEN**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/toggle-wave.test.mjs
git commit -m "feat: toggle wave direction on press"
```

### Task 2: Add deterministic functional block mechanics

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/functional-blocks.test.mjs`

**Interfaces:**
- Produces helpers:
  - `isBounceBlock(block)`
  - `movingBlockY(block, simTick)`
  - `isElectricBlockActive(block, simTick)`
  - `triggerCollapseBlock(blockId, simTick)`
  - `isCollapseBlockSolid(blockId, simTick)`
- Runtime state:
  - `game.collapseTriggered`
  - `game.collapsedBlocks`

- [ ] **Step 1: Write failing bounce-block tests**

Assert:
- top landing applies configured launch impulse,
- side/bottom collision remains solid,
- one landing contact does not retrigger continuously.

- [ ] **Step 2: Write failing moving-block tests**

Assert:
- Y position is deterministic from `simTick`,
- movement stays within `minY/maxY`,
- equal tick yields equal position,
- standing player is carried by the block's delta Y.

- [ ] **Step 3: Write failing electric-block tests**

Assert:
- active/inactive cycle follows `periodTicks/activeTicks/phaseTicks`,
- active collision is lethal,
- inactive collision is non-lethal.

- [ ] **Step 4: Write failing collapse-block tests**

Assert:
- landing records trigger tick,
- block remains solid until `collapseDelayTicks`,
- then becomes non-solid for the attempt,
- reset restores solidity.

- [ ] **Step 5: Run RED**

```bash
node --test neon-dash/tests/functional-blocks.test.mjs
```

Expected: FAIL.

- [ ] **Step 6: Implement mechanics in the shared physics path**

Do not add map-specific collision hacks. Resolve special block state through the same platform/collision lists used by cube, ship, and wave where relevant.

- [ ] **Step 7: Reset special-block attempt state**

Extend `resetRun()` to clear collapse state and any moving-platform carry bookkeeping.

- [ ] **Step 8: Run GREEN**

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/functional-blocks.test.mjs
git commit -m "feat: add deterministic functional blocks"
```

### Task 3: Redesign maps 2–5 and clean overlapping geometry

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-map-overlaps.test.mjs`
- Modify: `neon-dash/tests/official-map-runtimes.test.mjs`

**Interfaces:**
- Consumes functional block mechanics from Task 2.
- Produces updated runtimes for:
  - `createPulseFactoryRuntime()`
  - `createSkyCircuitRuntime()`
  - `createWaveStormRuntime()`
  - `createFinalEclipseRuntime()`

- [ ] **Step 1: Write failing overlap audit tests**

Detect:
- solid-vs-solid collision-region overlap with no explicit allow-list reason,
- hidden spikes fully inside solids,
- duplicate same-region obstacles,
- cube portal spawn overlapping a solid,
- special block overlapping a standard block at the same effective region.

- [ ] **Step 2: Write map-specific mechanic tests**

Assert:
- Pulse Factory contains multiple `bounce-block` objects,
- Sky Circuit contains multiple `moving-block` objects,
- Wave Storm contains multiple `electric-block` objects,
- Final Eclipse contains multiple `collapse-block` objects.

- [ ] **Step 3: Run RED**

Expected: current maps fail special-block assertions and overlap audit may identify redundant geometry.

- [ ] **Step 4: Rebuild Pulse Factory**

Increase timing density with bounce-block chains, tighter spike/orb sequencing, and fewer long recovery zones.

- [ ] **Step 5: Rebuild Sky Circuit**

Add deterministic moving landing platforms, longer ship passages, and tighter legal gates.

- [ ] **Step 6: Rebuild Wave Storm**

Re-layout Wave corridors for press-to-toggle steering and add deterministic electric timing windows.

- [ ] **Step 7: Rebuild Final Eclipse**

Combine all modes with collapse blocks, frequent transitions, and minimal recovery time.

- [ ] **Step 8: Remove unnecessary overlaps**

Only preserve intentional combinations that are visually readable and explicitly documented in the test allow-list.

- [ ] **Step 9: Verify Neon Start is unchanged**

Assert its runtime fingerprint still equals the pre-change known fingerprint.

- [ ] **Step 10: Run GREEN**

```bash
node --test neon-dash/tests/official-map-runtimes.test.mjs neon-dash/tests/official-map-overlaps.test.mjs
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: rebuild official maps with functional mechanics"
```

### Task 4: Render functional block state clearly

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/functional-block-rendering.test.mjs`

**Interfaces:**
- Consumes state helpers from Task 2.
- Produces distinct rendering for each functional block type.

- [ ] **Step 1: Write failing rendering tests**

Assert production rendering contains dedicated branches for:
- `bounce-block`,
- `moving-block`,
- `electric-block`,
- `collapse-block`.

Also assert electric inactive state and collapse progress have distinct visible states.

- [ ] **Step 2: Run RED**

Expected: FAIL.

- [ ] **Step 3: Implement rendering**

Required motifs:
- Bounce: piston/launch arrows/gear marks,
- Moving: vertical arrows/rail marks,
- Electric: active glow/arc vs dim inactive,
- Collapse: cracks that intensify before disappearance.

- [ ] **Step 4: Ensure collision/render position sharing**

Moving blocks must render at the exact Y used for collision on that simulation tick.

- [ ] **Step 5: Run GREEN**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/functional-block-rendering.test.mjs
git commit -m "style: render functional official blocks"
```

### Task 5: Regenerate fingerprints and AUTO replays for maps 2–5

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/advanced-official-replays.test.mjs`
- Modify: `neon-dash/tests/five-official-replays.test.mjs`

**Interfaces:**
- Consumes deterministic physics from Tasks 1–4.
- Produces new replay data and verified ticks for:
  - Pulse Factory
  - Sky Circuit
  - Wave Storm
  - Final Eclipse

- [ ] **Step 1: Write failing replay-fingerprint tests**

Assert:
- Neon Start fingerprint/replay remain unchanged,
- maps 2–5 replay fingerprints equal their new runtime fingerprints,
- stale pre-change replay fingerprints are rejected.

- [ ] **Step 2: Write failing completion tests**

For maps 2–5, assert each replay:
- reaches 100%,
- uses only press/release events,
- completes at one deterministic final tick.

- [ ] **Step 3: Add render-rate determinism tests**

For each changed map run replay at simulated:
- 60 Hz,
- 90 Hz,
- 120 Hz,
- 144 Hz.

Assert identical final simulation tick.

- [ ] **Step 4: Add corruption tests**

Remove one critical press event per map and assert a normal collision/death occurs without forced recovery.

- [ ] **Step 5: Run RED**

Expected: changed fingerprints invalidate old replays.

- [ ] **Step 6: Generate new legal replay for Pulse Factory**

- [ ] **Step 7: Generate new legal replay for Sky Circuit**

- [ ] **Step 8: Generate new legal replay for Wave Storm**

Replay generation must use press-edge Wave semantics.

- [ ] **Step 9: Generate new legal replay for Final Eclipse**

Include collapse-block state deterministically.

- [ ] **Step 10: Run GREEN**

```bash
node --test neon-dash/tests/advanced-official-replays.test.mjs neon-dash/tests/five-official-replays.test.mjs
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: regenerate advanced official auto replays"
```

### Task 6: Full regression, merge, and versioned link

**Files:**
- Modify only if regressions are found:
  - `neon-dash/index.html`
  - `neon-dash/tests/*.test.mjs`

**Interfaces:**
- Produces the deployable GitHub Pages build and cache-busted production URL.

- [ ] **Step 1: Run all tests**

```bash
node --test neon-dash/tests/*.test.mjs
```

Expected: 0 failures.

- [ ] **Step 2: Parse-check inline production JavaScript**

Extract each inline script and run `new Function(script)`.

Expected: no SyntaxError.

- [ ] **Step 3: Verify unchanged behavior**

Confirm:
- Neon Start fingerprint/replay unchanged,
- ghost jumpscare still present and functional markers unchanged,
- custom editor/replay/ND1 behavior intact,
- all synth tracks intact,
- phone/tablet mode intact.

- [ ] **Step 4: Verify new behavior**

Confirm:
- Wave toggles once per press,
- four functional block types work/reset deterministically,
- no unnecessary overlaps in maps 2–5,
- 2–5 AUTO replays clear at all four render rates.

- [ ] **Step 5: Merge to `main`**

Use PR merge after confirming branch is not behind or resolving unrelated main changes safely.

- [ ] **Step 6: Verify merged `main`**

Fetch `neon-dash/index.html` from `main` and rerun the final requirement checks.

- [ ] **Step 7: Provide new link**

Return:

```
https://foodie-repository.github.io/neon-dash/?v=<merge-sha-prefix>
```

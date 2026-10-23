# Neon Dash Functional Blocks + Toggle Wave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade official maps 2–5 with real functional signature blocks, press-to-toggle Wave steering, cleaned geometry overlaps, and regenerated deterministic AUTO replays while leaving Neon Start and the ghost jumpscare unchanged.

**Architecture:** Keep the production game in `neon-dash/index.html`. Extend the existing runtime/collision engine with deterministic block-state helpers, route Wave steering through press-edge input semantics, and update only official maps 2–5. Recompute fingerprints and regenerate replay data for changed maps, then verify every changed replay under the existing 120 Hz fixed-step engine.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, Web Audio API, localStorage, Node.js `node:test` + `vm`, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-22-neon-dash-functional-blocks-toggle-wave-design.md`

## Global Constraints

- Neon Start gameplay, fingerprint, and replay remain unchanged.
- Ghost jumpscare behavior and assets remain unchanged.
- Maps 2–5 become materially harder through geometry/mechanics, not by tripling player speed.
- Wave direction changes exactly once per press edge; release does not steer.
- Functional block behavior must be deterministic under 120 Hz simulation.
- No randomness in moving/electric/collapse timing.
- No heuristic AUTO fallback.
- AUTO uses legal press/release replay only.
- Custom-map editor and custom replay behavior remain functional.
- Remove unnecessary solid overlaps, hidden duplicate collision, and portal/solid overlaps.
- Production remains a single HTML file.

## Review Focus

- Repeated keydown/touch-hold must not toggle Wave more than once per press edge; pin in Task 1.
- Moving blocks must not desync visual and collision positions or drop a standing player; pin in Task 3.
- Electric/collapse state must reset exactly on attempt restart; pin in Task 4.
- Overlap cleanup must not accidentally remove intentional visible hazards; pin in Task 5.
- Regenerated replay fingerprints/ticks must remain deterministic at 60/90/120/144 Hz; pin in Task 7.

---

### Task 1: Convert Wave to press-to-toggle steering

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/wave-toggle-input.test.mjs`

**Interfaces:**
- Produces:
  - `game.waveDirection`
  - `handlePressEdge(source)`
  - Wave update using `game.waveDirection * 430`

- [ ] **Step 1: Write failing tests**
  - entering Wave sets default direction to `+1` (down-right),
  - first press flips to `-1`,
  - second press flips to `+1`,
  - release leaves direction unchanged,
  - repeated held keydown does not retrigger,
  - replay press uses the same edge function.

- [ ] **Step 2: Run test and verify RED**

```bash
node --test neon-dash/tests/wave-toggle-input.test.mjs
```

- [ ] **Step 3: Implement shared press-edge routing**
  - route manual/replay press transitions through `handlePressEdge(source)`,
  - keep cube jump buffering unchanged,
  - Wave update ignores held state and uses persistent direction,
  - reset Wave direction on portal entry/restart.

- [ ] **Step 4: Run tests and verify GREEN**

- [ ] **Step 5: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/wave-toggle-input.test.mjs
git commit -m "feat: toggle wave direction on press"
```

### Task 2: Add Pulse Factory Bounce Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/bounce-block.test.mjs`

**Interfaces:**
- Produces `kind:'bounce-block'` and `applyBounceBlockLanding(block)`.

- [ ] **Step 1: Write failing tests**
  - top landing applies configured upward velocity,
  - side/bottom collision remains solid,
  - one landing cannot retrigger every tick,
  - leaving and landing again can retrigger,
  - visual renderer distinguishes bounce blocks.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement bounce-block collision/renderer**

Use default `power:-900` unless a map object overrides it.

- [ ] **Step 4: Rebuild Pulse Factory geometry**
  - add multiple bounce-block chains,
  - increase spike/orb timing density,
  - remove equivalent standard blocks occupying the same collision area,
  - preserve legal paths.

- [ ] **Step 5: Run tests and commit**

```bash
git commit -am "feat: add functional bounce blocks to Pulse Factory"
```

### Task 3: Add Sky Circuit Moving Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/moving-block.test.mjs`

**Interfaces:**
- Produces:
  - `kind:'moving-block'`
  - `movingBlockY(block, simTick)`
  - current-position collision projection.

- [ ] **Step 1: Write failing tests**
  - identical tick yields identical Y,
  - min/max bounds are never exceeded,
  - collision uses current Y,
  - player standing on top receives the platform delta,
  - restart returns deterministic initial phase.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Implement deterministic vertical motion**
  - triangular or sinusoidal path from `minY` to `maxY`,
  - no wall-clock time; simulation tick only,
  - carry player by exact per-tick Y delta.

- [ ] **Step 4: Rebuild Sky Circuit**
  - insert timed moving-platform landings,
  - tighten legal ship gates,
  - remove redundant overlapping standard blocks.

- [ ] **Step 5: Run tests and commit**

```bash
git commit -am "feat: add moving blocks to Sky Circuit"
```

### Task 4: Add Wave Storm Electric Blocks and Final Eclipse Collapse Blocks

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/electric-collapse-blocks.test.mjs`

**Interfaces:**
- Produces:
  - `isElectricBlockActive(block, simTick)`
  - `game.collapseTriggered`
  - `game.collapsedBlocks`
  - `triggerCollapseBlock(block)`

- [ ] **Step 1: Write failing Electric Block tests**
  - active/inactive states follow `periodTicks/activeTicks/phaseTicks`,
  - active state is lethal,
  - inactive state is non-lethal,
  - visuals reflect state.

- [ ] **Step 2: Write failing Collapse Block tests**
  - top landing starts countdown once,
  - block remains solid during delay,
  - block becomes non-solid after delay,
  - restart clears collapsed/triggered state,
  - visual crack/fade state matches collision state.

- [ ] **Step 3: Verify RED**

- [ ] **Step 4: Implement both deterministic block types**

- [ ] **Step 5: Rebuild Wave Storm**
  - use toggle-Wave sequences,
  - add electric timing windows,
  - tighten but keep legal corridors.

- [ ] **Step 6: Rebuild Final Eclipse**
  - add collapse-block momentum sequences,
  - increase mode-transition density,
  - keep all transitions readable and solvable.

- [ ] **Step 7: Run tests and commit**

```bash
git commit -am "feat: add electric and collapse blocks"
```

### Task 5: Audit and remove unnecessary geometry overlaps

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-overlap-audit.test.mjs`

**Interfaces:**
- Produces test helper `findUnnecessaryOfficialOverlaps(runtime)`.

- [ ] **Step 1: Write failing overlap audit**
  Detect:
  - solid-vs-solid overlap,
  - special block vs standard block same region,
  - duplicate collision rectangles,
  - cube portal spawn inside a solid,
  - spike fully hidden inside a solid.

- [ ] **Step 2: Run against maps 2–5 and record RED findings**

- [ ] **Step 3: Remove only unnecessary overlaps**
  Preserve explicitly visible/intended spike-on-platform combinations.

- [ ] **Step 4: Verify overlap audit is GREEN**

- [ ] **Step 5: Commit**

```bash
git commit -am "fix: clean official map collision overlaps"
```

### Task 6: Raise maps 2–5 to the approved difficulty target

**Files:**
- Modify: `neon-dash/index.html`
- Modify: `neon-dash/tests/official-map-runtimes.test.mjs`
- Create: `neon-dash/tests/advanced-map-density.test.mjs`

**Interfaces:**
- Consumes functional block types from Tasks 2–4.

- [ ] **Step 1: Write failing density/mechanic tests**
  - Pulse Factory contains multiple bounce-block sequences,
  - Sky Circuit contains multiple moving-block timing sections,
  - Wave Storm contains multiple electric blocks and frequent Wave toggles,
  - Final Eclipse contains multiple collapse blocks and highest transition density,
  - none changes base player speed formula.

- [ ] **Step 2: Verify RED**

- [ ] **Step 3: Tune geometry until tests and playability constraints pass**

- [ ] **Step 4: Run runtime/overlap/wave tests together**

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: increase official maps two through five difficulty"
```

### Task 7: Regenerate fingerprints and AUTO replays for maps 2–5

**Files:**
- Modify: `neon-dash/index.html`
- Modify: `neon-dash/tests/five-official-replays.test.mjs`
- Create: `neon-dash/tests/advanced-official-replays.test.mjs`

**Interfaces:**
- Consumes exact production 120 Hz physics and new special-block states.
- Produces updated replay constants/final tick metadata for maps 2–5.

- [ ] **Step 1: Write failing replay tests**
  - Neon Start fingerprint/replay unchanged,
  - maps 2–5 old replay fingerprints rejected,
  - new replay required for each changed runtime.

- [ ] **Step 2: Generate legal 120 Hz input streams**
  Record only `press`/`release`; Wave steering occurs through press edges.

- [ ] **Step 3: Embed new fingerprints/replays/tick metadata**

- [ ] **Step 4: Verify each changed map at 60/90/120/144 Hz**
  Assert:
  - 100% clear,
  - identical final tick across render rates,
  - full replay cursor consumed.

- [ ] **Step 5: Corruption tests**
  Remove a critical press from each replay and require a normal death.

- [ ] **Step 6: Commit**

```bash
git commit -am "feat: regenerate advanced official auto replays"
```

### Task 8: Full regression, merge, and new version link

**Files:**
- Modify only for discovered regressions:
  - `neon-dash/index.html`
  - `neon-dash/tests/*.test.mjs`

- [ ] **Step 1: Run complete suite**

```bash
node --test neon-dash/tests/*.test.mjs
```

Expected: 0 failures.

- [ ] **Step 2: Parse-check production inline JavaScript**

Expected: no `SyntaxError`.

- [ ] **Step 3: Verify unchanged requirements**
  - Neon Start fingerprint/replay unchanged,
  - ghost jumpscare still present,
  - custom editor/replay/map codes intact.

- [ ] **Step 4: Verify changed requirements**
  - all four functional block types active,
  - Wave press-toggle behavior,
  - overlap audit clean,
  - maps 2–5 replay determinism green.

- [ ] **Step 5: Merge to `main`**

- [ ] **Step 6: Fetch deployed `main` source and re-check markers**

- [ ] **Step 7: Return cache-busted production link**

```
https://foodie-repository.github.io/neon-dash/?v=<merge-sha-prefix>
```

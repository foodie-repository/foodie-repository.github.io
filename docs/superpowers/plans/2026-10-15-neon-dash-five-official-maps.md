# Neon Dash Five Official Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Neon Dash from one official level into five named official levels with a level-select screen, isolated per-level BEST/CLEAR records, and a verified deterministic 120 Hz AUTO replay for each map.

**Architecture:** Keep production as the existing single `neon-dash/index.html`. Introduce an `OFFICIAL_LEVELS` registry that owns stable IDs, metadata, runtime constructors, music, and replay bindings; route UI and BEST storage through that registry. Add four new runtime constructors and generate one legal deterministic replay per map using the existing fixed-step replay architecture.

**Tech Stack:** HTML5 Canvas, vanilla JavaScript, Web Audio API, localStorage, Node.js built-in `node:test` + `vm`, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-15-neon-dash-five-official-maps-design.md`

## Global Constraints

- Exactly five official maps:
  1. `Neon Start`
  2. `Pulse Factory`
  3. `Sky Circuit`
  4. `Wave Storm`
  5. `Final Eclipse`
- Stable IDs:
  - `neon-start`
  - `pulse-factory`
  - `sky-circuit`
  - `wave-storm`
  - `final-eclipse`
- All five maps are unlocked from the start.
- Production stays a single HTML file.
- Each official map keeps the existing runtime contract.
- Each official map must be physically solvable under normal collision rules.
- Each official map gets an independent BEST/CLEAR record.
- Current legacy single-map BEST migrates once to `neon-start`.
- AUTO remains replay-only; no heuristic fallback, invulnerability, teleporting, or collision bypass.
- Each official replay uses version 1 and exactly 120 Hz physics.
- Existing custom-map editor/replay behavior must remain unchanged.
- Existing cube, ship, wave, BGM, device-mode, fullscreen, and map-code behavior must remain functional.
- Use only existing original browser-synth music.

## Review Focus

- An unknown/stale official level ID must fail safely instead of silently launching the wrong map; pin this in Task 1.
- Legacy BEST migration must be idempotent and never overwrite a newer Neon Start score; pin this in Task 2.
- Returning from a level and opening level select again must render fresh per-level BEST/CLEAR values instead of stale card data; pin this in Task 3.
- A replay fingerprint mismatch for one official map must disable AUTO only for that map, not all official maps; pin this in Task 6.
- A newly designed map must not contain a portal overlap, unreachable orb, impossible gap, or sub-collision-width flight/wave corridor; pin this in Task 4 and Task 5.

---

### Task 1: Introduce the five-level official registry

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-level-registry.test.mjs`

**Interfaces:**
- Produces:
  - `OFFICIAL_LEVEL_IDS`
  - `OFFICIAL_LEVELS`
  - `getOfficialLevel(levelId)`
  - `createOfficialRuntimeById(levelId)`
- Runtime constructors:
  - `createNeonStartRuntime()`
  - `createPulseFactoryRuntime()`
  - `createSkyCircuitRuntime()`
  - `createWaveStormRuntime()`
  - `createFinalEclipseRuntime()`

- [ ] **Step 1: Write failing registry tests**

Assert:
- exactly five entries exist,
- IDs match the approved order exactly,
- names match the approved order exactly,
- IDs and names are unique,
- difficulties are exactly 1, 2, 3, 4, 5,
- `getOfficialLevel('missing')` returns `null` or another explicit safe miss value,
- registry entries expose runtime constructor and replay slot fields.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test neon-dash/tests/official-level-registry.test.mjs
```

Expected: FAIL because the registry does not exist.

- [ ] **Step 3: Rename the current official runtime constructor**

Rename `createOfficialRuntime()` to `createNeonStartRuntime()` without changing gameplay yet.

Add placeholder constructors for the four new maps that return structurally valid minimal runtimes; their real geometry is added in Task 4.

- [ ] **Step 4: Add `OFFICIAL_LEVELS` registry**

Use the exact approved metadata:

```js
[
  {
    id: 'neon-start',
    name: 'Neon Start',
    difficulty: 1,
    difficultyLabel: '쉬움',
    description: '기본 점프 · 가시 · 블록',
    music: 'neon-rush',
    createRuntime: createNeonStartRuntime,
    replay: null
  },
  {
    id: 'pulse-factory',
    name: 'Pulse Factory',
    difficulty: 2,
    difficultyLabel: '보통',
    description: '점프패드 · 점프링 · 계단형 장애물',
    music: 'hyper-drive',
    createRuntime: createPulseFactoryRuntime,
    replay: null
  },
  {
    id: 'sky-circuit',
    name: 'Sky Circuit',
    difficulty: 3,
    difficultyLabel: '어려움',
    description: '큐브 · 비행기 · 상하 비행 게이트',
    music: 'neon-rush',
    createRuntime: createSkyCircuitRuntime,
    replay: null
  },
  {
    id: 'wave-storm',
    name: 'Wave Storm',
    difficulty: 4,
    difficultyLabel: '매우 어려움',
    description: '화살표 · 좁은 통로 · 빠른 전환',
    music: 'hyper-drive',
    createRuntime: createWaveStormRuntime,
    replay: null
  },
  {
    id: 'final-eclipse',
    name: 'Final Eclipse',
    difficulty: 5,
    difficultyLabel: '극한',
    description: '모든 모드 종합 · 최종 도전',
    music: 'dark-pulse',
    createRuntime: createFinalEclipseRuntime,
    replay: null
  }
]
```

- [ ] **Step 5: Run registry tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/official-level-registry.test.mjs
git commit -m "feat: add five official level registry"
```

### Task 2: Add per-level BEST storage and legacy migration

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-best.test.mjs`

**Interfaces:**
- Consumes: official level IDs from Task 1.
- Produces:
  - `officialBestKey(levelId)`
  - `getOfficialBest(levelId)`
  - `setOfficialBest(levelId, percent)`
  - `migrateLegacyOfficialBest()`
- Runtime state:
  - `game.officialLevelId`

- [ ] **Step 1: Write failing BEST/migration tests**

Assert:
- each official ID resolves to a distinct storage key,
- BEST values are isolated by level,
- percent is clamped to 0–100,
- a lower score never replaces a higher score,
- legacy single official BEST migrates to `neon-start` only when the new key is absent,
- running migration twice is idempotent,
- an existing newer Neon Start score is never overwritten by legacy data.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test neon-dash/tests/official-best.test.mjs
```

Expected: FAIL because per-level BEST helpers do not exist.

- [ ] **Step 3: Implement per-level BEST helpers**

Use the exact key format:

```js
neonDash.officialBest.<levelId>
```

Keep the existing legacy BEST key readable only for migration.

- [ ] **Step 4: Route official game state through `game.officialLevelId`**

Update:
- start/reset,
- HUD BEST text,
- crash BEST update,
- finish 100% update,
- menu/level-select record rendering.

- [ ] **Step 5: Run BEST tests**

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/official-best.test.mjs
git commit -m "feat: store official best by level"
```

### Task 3: Add official level-select screen and navigation

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-level-select.test.mjs`

**Interfaces:**
- Consumes: `OFFICIAL_LEVELS`, `getOfficialBest(levelId)`.
- Produces:
  - `renderOfficialLevelSelect()`
  - `startOfficialLevel(levelId)`
  - screen ID `screen-official-levels`

- [ ] **Step 1: Write failing level-select tests**

Assert:
- `screen-official-levels` exists,
- main-menu `게임 시작` opens level select instead of directly starting a map,
- exactly five official cards render in registry order,
- each card contains name, difficulty, description, BEST, and Play control,
- 100% renders `CLEAR ✓`,
- reopening level select calls the renderer and refreshes BEST values,
- clicking a card starts the matching runtime ID,
- unknown level ID refuses to start.

- [ ] **Step 2: Run tests and verify RED**

```bash
node --test neon-dash/tests/official-level-select.test.mjs
```

Expected: FAIL because the screen and renderer do not exist.

- [ ] **Step 3: Add the official level-select section**

Add:
- title `공식 맵`,
- five cards generated from the registry,
- card-specific accent class/data attribute,
- Back/Home compatibility with existing screen system.

- [ ] **Step 4: Implement `renderOfficialLevelSelect()`**

Render fresh BEST/CLEAR values every time the screen becomes active.

- [ ] **Step 5: Implement `startOfficialLevel(levelId)`**

Create the chosen runtime from the registry and call the existing `startGame` path with:
- `kind:'official'`,
- selected `officialLevelId`.

Update play header:

```
<map name>
공식 맵 · ★★★
```

- [ ] **Step 6: Run level-select tests**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/official-level-select.test.mjs
git commit -m "feat: add official level select"
```

### Task 4: Build the four new official map runtimes

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/official-map-runtimes.test.mjs`

**Interfaces:**
- Consumes: common runtime contract and collision constants.
- Produces completed implementations of:
  - `createPulseFactoryRuntime()`
  - `createSkyCircuitRuntime()`
  - `createWaveStormRuntime()`
  - `createFinalEclipseRuntime()`

- [ ] **Step 1: Write failing runtime-structure tests**

For every official runtime assert:
- runtime ID/name match registry entry,
- `startX < levelEnd`,
- arrays exist for floors/blocks/spikes/pads/orbs/portals/flightObstacles,
- every object has finite geometry,
- portals are inside level bounds,
- no portal transition point overlaps a solid block at spawn position,
- floor/gap geometry stays within supported canvas physics.

- [ ] **Step 2: Add geometry-solvability regression helpers**

Add test helpers that fail on:
- orb sequences where the orb is outside reachable collision radius under the preceding legal jump/pad trajectory,
- gaps wider than legal cube airtime without an orb/pad bridge,
- ship/wave corridors with clearance below player collision box + safety margin,
- cube portal spawn directly inside a block.

- [ ] **Step 3: Run runtime tests and verify RED**

Expected: placeholder runtimes fail gameplay/complexity checks.

- [ ] **Step 4: Implement `Pulse Factory`**

Requirements:
- medium length,
- cube-dominant,
- multiple jump pads/orbs,
- stair-step block sequences,
- one short ship section,
- optional short wave introduction,
- difficulty materially above Neon Start.

- [ ] **Step 5: Implement `Sky Circuit`**

Requirements:
- medium-long,
- substantial ship time,
- alternating ceiling/floor flight gates,
- cube→ship→cube transitions,
- light wave use.

- [ ] **Step 6: Implement `Wave Storm`**

Requirements:
- medium-long,
- wave-dominant,
- narrow but legal alternating wave corridors,
- cube recovery sections,
- one short ship sequence.

- [ ] **Step 7: Implement `Final Eclipse`**

Requirements:
- longest map,
- uses cube, pads, orbs, ship, and wave,
- multiple portal chains,
- highest timing density,
- no impossible geometry.

- [ ] **Step 8: Run runtime/solvability tests**

Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/official-map-runtimes.test.mjs
git commit -m "feat: build four new official maps"
```

### Task 5: Generalize official fingerprints and replay registry

**Files:**
- Modify: `neon-dash/index.html`
- Modify: `neon-dash/tests/official-level-registry.test.mjs`
- Create: `neon-dash/tests/official-replay-registry.test.mjs`

**Interfaces:**
- Consumes: completed runtimes from Task 4.
- Produces:
  - five replay constants,
  - per-level verified tick metadata,
  - registry replay binding,
  - `getOfficialReplay(levelId)`.

Replay names:
- `NEON_START_REPLAY`
- `PULSE_FACTORY_REPLAY`
- `SKY_CIRCUIT_REPLAY`
- `WAVE_STORM_REPLAY`
- `FINAL_ECLIPSE_REPLAY`

- [ ] **Step 1: Write failing replay-registry tests**

Assert:
- every official registry entry has a replay,
- replay version = 1,
- physicsHz = 120,
- replay fingerprint equals `officialRuntimeFingerprint(createRuntime())`,
- each map stores a positive verified final tick,
- replay constants are not accidentally shared between levels.

- [ ] **Step 2: Run tests and verify RED**

Expected: four new maps have no replay.

- [ ] **Step 3: Replace the single-global replay selection**

Change AUTO selection from the single `OFFICIAL_REPLAY` path to the selected registry entry's replay.

A mismatch must:
- refuse AUTO for only that map,
- keep the map manually playable,
- leave AUTO available for other official maps.

- [ ] **Step 4: Run replay-registry tests**

Expected: registry plumbing PASS; completion tests remain RED until Task 6.

- [ ] **Step 5: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "refactor: bind auto replay by official level"
```

### Task 6: Generate and verify deterministic AUTO replays for all five maps

**Files:**
- Modify: `neon-dash/index.html`
- Create: `neon-dash/tests/five-official-replays.test.mjs`
- Modify: `neon-dash/tests/official-replay.test.mjs`

**Interfaces:**
- Consumes:
  - fixed 120 Hz simulation,
  - completed runtimes,
  - replay registry.
- Produces verified replay data for all five official maps.

- [ ] **Step 1: Write failing five-map completion tests**

For every map assert:
- replay reaches 100%,
- `game.won === true`,
- no collision bypass/recovery hook is invoked,
- final simulation tick equals stored verified tick.

- [ ] **Step 2: Add render-rate determinism tests**

For each map replay run simulated rendering at:
- 60 Hz,
- 90 Hz,
- 120 Hz,
- 144 Hz.

Assert all four schedules produce:
- 100% clear,
- identical final simulation tick,
- identical replay cursor completion.

- [ ] **Step 3: Add corruption tests**

For each map remove or alter one critical replay event.

Assert:
- at least one intentionally corrupted variant dies normally,
- no map uses a forced recovery or heuristic fallback.

- [ ] **Step 4: Generate `Pulse Factory` replay**

Use legal press/release inputs only and embed matching fingerprint/final tick.

- [ ] **Step 5: Generate `Sky Circuit` replay**

Verify ship transitions and upper/lower gate steering at 120 Hz.

- [ ] **Step 6: Generate `Wave Storm` replay**

Verify wave input stream and portal transitions with normal collision rules.

- [ ] **Step 7: Generate `Final Eclipse` replay**

Verify all mode transitions and the final finish under normal collision rules.

- [ ] **Step 8: Regenerate `Neon Start` replay only if its geometry/fingerprint changed**

If unchanged, retain current verified replay; otherwise regenerate and verify it under the same suite.

- [ ] **Step 9: Run five-map replay suite**

```bash
node --test neon-dash/tests/five-official-replays.test.mjs
```

Expected: all five maps PASS all render schedules and corruption checks.

- [ ] **Step 10: Commit**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "feat: add deterministic replays for five official maps"
```

### Task 7: Polish per-map presentation and official progress UI

**Files:**
- Modify: `neon-dash/index.html`
- Modify: `neon-dash/tests/official-level-select.test.mjs`

**Interfaces:**
- Consumes: official registry + BEST helpers.
- Produces:
  - map-specific accent classes,
  - difficulty display,
  - CLEAR display,
  - selected-level header text.

- [ ] **Step 1: Write failing presentation tests**

Assert the level-select screen has distinct identifiers/classes for:
- Neon Start cyan,
- Pulse Factory factory/violet accent,
- Sky Circuit blue/cyan,
- Wave Storm lime,
- Final Eclipse dark eclipse accent.

Also assert:
- difficulty stars match 1–5,
- level header shows selected map name,
- level header shows official-map difficulty,
- each card's BEST is isolated.

- [ ] **Step 2: Run tests and verify RED**

Expected: presentation-specific assertions FAIL.

- [ ] **Step 3: Add card styling and selected-level header copy**

Do not add image assets; use CSS/Canvas neon styling already present.

- [ ] **Step 4: Run presentation tests**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add neon-dash/index.html neon-dash/tests/official-level-select.test.mjs
git commit -m "style: polish official level selection"
```

### Task 8: Full regression and deployment verification

**Files:**
- Modify only if a regression is found:
  - `neon-dash/index.html`
  - `neon-dash/tests/*.test.mjs`

**Interfaces:**
- Consumes all earlier tasks.
- Produces deployable GitHub Pages build.

- [ ] **Step 1: Run the full automated suite**

```bash
node --test neon-dash/tests/*.test.mjs
```

Expected: 0 failures.

- [ ] **Step 2: Parse-check production inline JavaScript**

Extract the inline script and execute:

```js
new Function(script)
```

Expected: no SyntaxError.

- [ ] **Step 3: Verify final official registry**

Confirm exactly these five IDs/names in order:

```
neon-start       → Neon Start
pulse-factory    → Pulse Factory
sky-circuit      → Sky Circuit
wave-storm       → Wave Storm
final-eclipse    → Final Eclipse
```

- [ ] **Step 4: Verify per-level progress behavior**

Confirm:
- five independent BEST keys,
- legacy BEST migrated only to Neon Start,
- CLEAR ✓ appears only at 100%,
- replay AUTO does not alter custom creator verification.

- [ ] **Step 5: Verify all five AUTO replays**

For all five maps:
- 60/90/120/144 Hz render schedules,
- same final simulation tick per map,
- 100% completion,
- fingerprint match,
- no heuristic AUTO code exists.

- [ ] **Step 6: Verify existing features**

Confirm markers/flows for:
- custom level editor,
- custom replay recording/playback,
- ND1 codes,
- cube,
- ship,
- wave,
- all three synth tracks,
- phone/tablet mode,
- landscape/fullscreen behavior.

- [ ] **Step 7: Fetch final branch source after last commit**

Verify `neon-dash/index.html` contains:
- five-level registry,
- official level-select screen,
- five replay bindings,
- no old single-map direct-start route.

- [ ] **Step 8: Commit any final regression fix**

```bash
git add neon-dash/index.html neon-dash/tests
git commit -m "test: verify five official maps"
```

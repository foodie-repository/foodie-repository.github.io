# Neon Dash Five Official Maps Design

**Date:** 2026-10-15  
**Scope:** Expand Neon Dash from one official map to five named official maps.

## Goal

Turn the current single official level into a five-level official campaign with a dedicated level-select screen, per-level best records and clear status, and a separate deterministic 120 Hz AUTO replay for every official level.

## Official Map Lineup

### 1. Neon Start
- Difficulty: ★ Easy
- Purpose: onboarding and basic timing
- Primary mechanics:
  - cube jumping
  - single/double spikes
  - simple blocks
  - short gaps
- Secondary mechanics:
  - one jump pad
  - one simple orb sequence
- Flight/wave usage: minimal
- Target length: short-to-medium

### 2. Pulse Factory
- Difficulty: ★★ Normal
- Theme: rhythmic industrial neon factory
- Primary mechanics:
  - jump pads
  - jump orbs
  - stair-step blocks
  - chained cube timing
- Secondary mechanics:
  - short ship section
- Wave usage: optional short introduction
- Target length: medium

### 3. Sky Circuit
- Difficulty: ★★★ Hard
- Theme: high-altitude neon circuit
- Primary mechanics:
  - cube + ship transitions
  - longer ship corridors
  - alternating upper/lower flight gates
- Secondary mechanics:
  - short orb chains before/after ship portals
- Wave usage: light
- Target length: medium-long

### 4. Wave Storm
- Difficulty: ★★★★ Very Hard
- Theme: electric storm / lime wave energy
- Primary mechanics:
  - wave mode
  - narrow alternating corridors
  - fast cube-to-wave transitions
- Secondary mechanics:
  - short ship section
  - cube recovery sections between wave sequences
- Target length: medium-long

### 5. Final Eclipse
- Difficulty: ★★★★★ Extreme
- Theme: dark eclipse / final challenge
- Primary mechanics:
  - cube
  - jump pads
  - jump orbs
  - ship
  - wave
  - chained portal transitions
- Design goal: combine every official mechanic in one final stage
- Target length: longest official level

## Existing Map Migration

The current official map becomes **Neon Start**.

Its existing gameplay geometry may be shortened or slightly simplified only if necessary to make its difficulty consistent with an introductory map. Existing deterministic AUTO replay data must be regenerated if its gameplay fingerprint changes.

## Main Menu Flow

Current flow:

```
Main Menu → 게임 시작 → single official map
```

New flow:

```
Main Menu → 게임 시작 → 공식 맵 선택 → selected official map
```

The level-select screen must also be reachable from the Home/menu flow after a run.

## Official Level Select Screen

Add a new screen, for example:

```html
<section id="screen-official-levels" ...>
```

Each official-level card displays:

- map number
- map name
- difficulty stars and label
- short mechanics description
- BEST percentage
- clear state:
  - `CLEAR ✓` when best = 100
  - otherwise current best percentage
- Play button

Recommended card order is fixed from 1 through 5.

All five maps are unlocked from the start. There is no progression lock unless added in a later feature.

## Official Level Registry

Replace the current single-map constructor path with a registry:

```js
const OFFICIAL_LEVELS = [
  {
    id: 'neon-start',
    name: 'Neon Start',
    difficulty: 1,
    difficultyLabel: '쉬움',
    description: '기본 점프 · 가시 · 블록',
    createRuntime: createNeonStartRuntime,
    replay: NEON_START_REPLAY,
  },
  ...
];
```

Every level must have a stable ID.

Recommended IDs:

- `neon-start`
- `pulse-factory`
- `sky-circuit`
- `wave-storm`
- `final-eclipse`

## Runtime Contract

Every official map runtime returns the same shape currently used by the game:

```js
{
  id,
  name,
  music,
  levelEnd,
  startX,
  floors,
  blocks,
  spikes,
  pads,
  orbs,
  portals,
  flightObstacles,
  isCustom: false,
  fingerprint,
  sourceLevel: null
}
```

This allows the existing physics/rendering engine to be reused unchanged.

## Difficulty and Fairness Rules

Every official map must be manually/algorithmically checked for physical solvability using the same game physics.

Official maps must not contain:

- portals that spawn the player inside a block,
- unreachable orb sequences,
- gaps that require impossible airtime,
- block/spike combinations with no legal jump timing,
- ship/wave passages narrower than the collision box plus safety margin.

Difficulty comes from timing and sequence complexity, not impossible geometry.

## Per-Level Best Records

Replace the single `BEST_KEY` official record with a per-level key scheme:

```js
function officialBestKey(levelId) {
  return `neonDash.officialBest.${levelId}`;
}
```

Each level stores its own best percentage.

Example:

- Neon Start — 100%
- Pulse Factory — 82%
- Sky Circuit — 47%
- Wave Storm — 15%
- Final Eclipse — 0%

Legacy migration:
- the current single official best record migrates to `neon-start` once,
- then the legacy key may be left for compatibility or ignored.

## Per-Level AUTO Replay

Every official map has:

- its own runtime fingerprint,
- its own replay object,
- its own verified final tick count.

Recommended naming:

```js
NEON_START_REPLAY
PULSE_FACTORY_REPLAY
SKY_CIRCUIT_REPLAY
WAVE_STORM_REPLAY
FINAL_ECLIPSE_REPLAY
```

AUTO code `뀨` still behaves globally:

1. user enters `뀨`,
2. AUTO becomes `AUTO READY`,
3. user selects any official map,
4. the selected map's matching replay is validated,
5. AUTO PLAY starts using only that replay's press/release events.

There is no heuristic fallback.

If a replay is missing or its fingerprint does not match, the map still remains manually playable, but AUTO refuses to start for that level.

## Replay Verification Requirements

For each of the five official maps:

- replay format version = 1,
- physicsHz = 120,
- fingerprint matches that map,
- replay reaches 100% with normal collision rules,
- corrupted critical input causes a normal death,
- the same replay produces identical completion tick at simulated render rates:
  - 60 Hz
  - 90 Hz
  - 120 Hz
  - 144 Hz.

## Music Assignment

Use only existing original browser-generated tracks unless new original tracks are added later.

Suggested initial mapping:

- Neon Start → Neon Rush
- Pulse Factory → Hyper Drive
- Sky Circuit → Neon Rush
- Wave Storm → Hyper Drive
- Final Eclipse → Dark Pulse

No copyrighted third-party music is introduced.

## UI Details

### Main menu
`게임 시작` opens the official-level selection screen.

### Official level cards
Each card includes a compact neon visual identity:
- Neon Start: cyan
- Pulse Factory: violet/orange factory accents
- Sky Circuit: blue/cyan
- Wave Storm: lime/electric green
- Final Eclipse: dark purple/red eclipse accents

These are UI accents only; gameplay remains visually consistent with Neon Dash.

### Play header
Display selected map name instead of the generic `Neon Dash` title.

Example:

```
Wave Storm
공식 맵 · ★★★★
```

## Data Structure Changes

Game state gains:

```js
game.officialLevelId
```

Official best functions become:

```js
getOfficialBest(levelId)
setOfficialBest(levelId, percent)
```

Official runtime selection becomes:

```js
startOfficialLevel(levelId)
```

AUTO replay selection becomes registry-based rather than using one global `OFFICIAL_REPLAY`.

## Testing

The implementation must include tests for:

1. exactly five official levels exist.
2. IDs and names are unique.
3. the order is fixed and matches the approved lineup.
4. clicking Play uses the chosen level runtime.
5. BEST records are isolated by level ID.
6. legacy single-map best migrates to Neon Start.
7. each official map runtime validates structurally.
8. every official map has a matching replay fingerprint.
9. every official replay clears its map at 120 Hz.
10. every replay produces the same completion tick at 60/90/120/144 Hz rendering.
11. corrupting a critical replay event causes normal death.
12. AUTO selects the replay for the chosen map only.
13. manual play still works without AUTO.
14. custom-map replay behavior remains unchanged.
15. existing editor, custom maps, map codes, ship, wave, BGM, device mode, and fullscreen behavior remain functional.

## Non-goals

- No locked progression system.
- No coins, stars, achievements, or rewards.
- No online leaderboards.
- No downloaded music.
- No more than five official maps in this phase.
- No redesign of the custom-map editor.

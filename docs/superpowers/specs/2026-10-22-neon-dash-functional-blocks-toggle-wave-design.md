# Neon Dash Advanced Official Maps + Toggle Wave Design

**Date:** 2026-10-22  
**Scope:** Upgrade official maps 2–5 with functional signature blocks, toggle-input Wave controls, collision/overlap cleanup, and regenerated deterministic AUTO replays.

## Goal

Increase the effective difficulty of official maps 2–5 to roughly 3× their current feel, while making each map mechanically distinct through functional block types rather than cosmetic reskins. Change Wave controls from hold-to-steer to press-to-toggle direction. Remove unnecessary overlapping geometry and regenerate verified AUTO replays for the changed maps.

## Unchanged Areas

- Official map 1: **Neon Start** remains unchanged.
- Ghost jumpscare remains unchanged.
- Custom-map editor behavior remains unchanged unless required for shared runtime compatibility.
- Existing deterministic replay architecture remains in use.
- No heuristic AUTO fallback.

## Official Map Difficulty Upgrade

The difficulty increase is achieved through:
- denser obstacle sequencing,
- shorter recovery windows,
- tighter but still legal flight/wave corridors,
- more frequent mechanic transitions,
- signature block interactions,
- reduced redundant empty space.

Do **not** multiply player speed by 3.

All geometry must remain physically solvable using normal collision rules.

## Signature Functional Blocks

### 2. Pulse Factory — Bounce Block

Visual identity:
- industrial gear/piston styling.

Behavior:
- a normal solid block for side/bottom collision,
- when the player lands on top, the block applies an upward launch impulse,
- launch strength is stronger than a normal jump but weaker than an extreme jump pad,
- repeated contact must not retrigger every simulation tick while standing on it.

Suggested runtime type:

```js
{
  id,
  kind: 'bounce-block',
  x, y, w, h,
  power: -900
}
```

Purpose:
- chain controlled high jumps,
- create timing sequences between block tops, spikes, and orbs.

### 3. Sky Circuit — Moving Block

Visual identity:
- blue/cyan energized platform with motion indicators.

Behavior:
- moves vertically between two fixed Y positions,
- deterministic movement based on simulation time/tick,
- carries the player when standing on top,
- collision uses the block's current position,
- movement pattern must be deterministic under fixed-step replay.

Suggested runtime type:

```js
{
  id,
  kind: 'moving-block',
  x,
  y,
  w,
  h,
  minY,
  maxY,
  speed,
  phase
}
```

Purpose:
- force timed landings,
- alter safe paths dynamically without randomness.

### 4. Wave Storm — Electric Block

Visual identity:
- lime/electric hazard block.

Behavior:
- alternates between active and inactive states on a deterministic cycle,
- when active: acts as a lethal obstacle,
- when inactive: non-lethal and visually dimmed,
- state depends only on fixed simulation tick/time,
- no randomness.

Suggested runtime type:

```js
{
  id,
  kind: 'electric-block',
  x, y, w, h,
  periodTicks,
  activeTicks,
  phaseTicks
}
```

Purpose:
- create rhythm-based wave passages,
- make route timing matter without impossible geometry.

### 5. Final Eclipse — Collapse Block

Visual identity:
- dark red/purple eclipse block with fracture state.

Behavior:
- initially solid,
- after the player lands on it, starts a short deterministic collapse countdown,
- after countdown, becomes non-solid for the remainder of that attempt,
- state resets on death/restart,
- replay outcome must be deterministic.

Suggested runtime type:

```js
{
  id,
  kind: 'collapse-block',
  x, y, w, h,
  collapseDelayTicks
}
```

Runtime attempt state tracks collapsed IDs and triggered ticks.

Purpose:
- prevent waiting,
- force forward momentum,
- combine with ship/wave transitions late in the level.

## Wave Input Redesign

### Current behavior

- hold input → Wave travels upward-right,
- release input → Wave travels downward-right.

### New behavior

- Wave has a persistent vertical direction state:
  - `waveDirection = -1` for upward-right,
  - `waveDirection = +1` for downward-right.
- Each **press edge** toggles direction.
- Releasing the input does nothing to direction.
- Holding the key/touch must not repeatedly toggle.
- Keyboard, mouse/touch, and replay all use the same edge-triggered logic.

Pseudo-interface:

```js
function handlePressEdge(source) {
  if (player.mode === 'wave') {
    game.waveDirection *= -1;
  }
}
```

Wave update:

```js
player.vy = game.waveDirection * WAVE_SPEED;
```

### Portal behavior

When entering Wave mode:
- initialize to a documented default direction,
- default recommendation: downward-right (`+1`),
- replay generation must assume the same default.

When leaving Wave:
- direction state may reset so every Wave entry starts consistently.

## Replay Input Semantics

Replay events remain only:
- `press`
- `release`

For Wave mode:
- only `press` changes direction,
- `release` is recorded but has no Wave steering effect,
- no coordinates or forced states are stored.

This preserves legal player-input replay.

## Runtime State Additions

Add attempt/runtime state as needed:

```js
game.waveDirection
game.movingBlockTime
game.electricBlockTick
game.collapseTriggered
game.collapsedBlocks
```

Exact storage may be simplified, but all state must reset on restart and remain deterministic.

## Collision and Overlap Cleanup

Audit official maps 2–5 and remove unnecessary overlaps.

Must remove:
- solid blocks overlapping other solid blocks without gameplay purpose,
- spikes hidden inside blocks unless intentionally protruding as a visible hazard,
- portal spawn points intersecting solids,
- duplicate obstacles occupying the same effective collision region,
- stacked geometry that creates invisible collision edges,
- functional special blocks overlapping standard blocks at the same location.

Intentional combinations are allowed only if:
- visually readable,
- mechanically necessary,
- tested as playable.

## Map-Specific Difficulty Direction

### Pulse Factory
- dense cube timing,
- multiple bounce-block chains,
- tighter spike spacing,
- more orb timing.

### Sky Circuit
- longer ship sections,
- vertically moving landing platforms,
- narrower but legal flight gates,
- alternating landing/flight timing.

### Wave Storm
- Wave-dominant,
- frequent direction toggles,
- electric block timing windows,
- narrow readable corridors,
- short recovery zones.

### Final Eclipse
- combines all modes,
- collapse blocks force momentum,
- frequent cube/ship/wave transitions,
- least recovery time,
- hardest official stage.

## Rendering Requirements

Each functional block must be visually identifiable by function, not just color.

- Bounce Block: piston/gear/launch motif.
- Moving Block: arrows/rails showing vertical movement.
- Electric Block: active/inactive electrical effect.
- Collapse Block: cracks and collapse/fade state.

Collision state and visual state must agree.

## AUTO Replay Regeneration

Maps 2–5 gameplay fingerprints will change.

Required:
- regenerate replay for Pulse Factory,
- regenerate replay for Sky Circuit,
- regenerate replay for Wave Storm,
- regenerate replay for Final Eclipse.

Neon Start replay remains untouched if its runtime fingerprint is unchanged.

Each changed replay must:
- use 120 Hz fixed-step physics,
- use only legal press/release input,
- clear 100%,
- produce the same final simulation tick under simulated rendering at:
  - 60 Hz,
  - 90 Hz,
  - 120 Hz,
  - 144 Hz,
- die normally if a critical replay press is removed,
- have no heuristic recovery.

## Testing Requirements

1. Neon Start runtime/fingerprint/replay remain unchanged.
2. Pulse Factory contains functional bounce blocks and they launch only on valid top contact.
3. Sky Circuit moving blocks move deterministically and carry standing player correctly.
4. Wave Storm electric blocks switch active state deterministically.
5. Final Eclipse collapse blocks trigger, collapse, and reset between attempts.
6. Wave changes direction exactly once per press edge.
7. Wave release does not change direction.
8. Holding input does not repeatedly toggle Wave direction.
9. Manual, touch, keyboard, and replay input use shared press-edge logic.
10. No unnecessary overlapping solid geometry remains in maps 2–5.
11. No cube portal spawns inside a solid.
12. Each map remains physically solvable.
13. New fingerprints match new replays.
14. AUTO clears maps 2–5 at 60/90/120/144 Hz with identical per-map final tick.
15. Corrupting one critical replay input causes normal death.
16. Ghost jumpscare remains functional.
17. Custom-map editor and custom replay behavior remain functional.

## Version Link

After implementation and verification:
- merge to `main`,
- provide the normal production URL plus a cache-busting version query, e.g.

```
https://foodie-repository.github.io/neon-dash/?v=<merge-sha-prefix>
```

This is the “new link” requested by the user.

## Non-goals

- No new official maps beyond the existing five.
- No change to Neon Start difficulty.
- No random obstacle behavior.
- No physics cheats for AUTO.
- No redesign of the ghost jumpscare.

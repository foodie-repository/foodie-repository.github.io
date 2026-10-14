# Neon Dash Deterministic Auto Replay Design

**Date:** 2026-10-14  
**Scope:** AUTO PLAY architecture replacement

## Goal

Replace the current heuristic AUTO bot with a deterministic, legitimate-play replay system that uses the same controls and collision rules as manual play. The result must behave consistently across phones, tablets, and different display refresh rates.

## User-visible behavior

- Secret code `뀨` still toggles AUTO PLAY on/off.
- AUTO never uses invulnerability, teleporting, collision bypass, forced floor snapping, or direct position correction.
- AUTO controls only the same inputs available to a player:
  - cube: press/release jump
  - orb: press when in orb activation range
  - ship: press/release vertical control
  - wave: press/release diagonal control
- Death and restart work exactly as in manual play.
- AUTO works on the official map and on user-created maps.
- An AUTO clear of a user-created map does **not** count as creator verification for sharing.

## Core architecture

### 1. Fixed-step simulation

Game physics will use an accumulator and a fixed simulation step of **1/120 second** while AUTO PLAY is active.

Rendering stays tied to `requestAnimationFrame`, but physics can execute zero or more 1/120 s updates per rendered frame.

This separates simulation from device refresh rate, so 60 Hz, 90 Hz, 120 Hz, and 144 Hz displays produce the same physics result.

Manual mode keeps the current real-time behavior unless the shared fixed-step loop can be introduced without changing existing feel.

### 2. Replay input model

A replay is an ordered event stream indexed by simulation tick.

Example:

```js
{
  version: 1,
  physicsHz: 120,
  events: [
    { tick: 42, action: "press" },
    { tick: 78, action: "release" },
    { tick: 161, action: "press" }
  ]
}
```

Replay events do not contain player coordinates or velocities.

Only input state changes are recorded.

### 3. Official-map replay

The official map ships with a verified replay recorded/generated against the current map fingerprint and 120 Hz physics.

AUTO PLAY on the official map replays that input stream exactly.

If the official map gameplay geometry changes, the map fingerprint changes and the stored replay is rejected until regenerated and re-verified.

### 4. Creator replay for custom maps

During a **manual creator verification run**, record the creator's input changes.

If the player reaches the finish:
- store the verification fingerprint,
- store the replay for that exact fingerprint,
- enable sharing.

If the gameplay layout changes:
- clear verification,
- delete/ignore the old replay.

Changes that do not affect gameplay geometry, such as map name or BGM selection, may preserve verification if the existing fingerprint rules already allow it.

### 5. Imported/shared maps

Map codes may include an optional verified replay.

On import:
- the replay can be used for AUTO only if its fingerprint matches the imported gameplay data,
- imported replay data never grants local creator-verification status by itself,
- the imported map still requires a manual local clear before it can be re-shared as locally verified.

### 6. Replay failure handling

If replay execution dies before the finish:
- show `AUTO REPLAY INVALID`,
- do not retry forever,
- return to the start/menu with AUTO disabled for that run.

This is preferable to hiding a map/replay mismatch with cheats.

## Data model additions

Custom level data gains optional fields:

```js
replay: {
  version: 1,
  physicsHz: 120,
  fingerprint: "...",
  events: [...]
} | null
```

Map-code schema remains backward compatible:
- old maps without `replay` still import,
- they simply cannot use deterministic replay until a replay is available.

## Runtime state additions

The game runtime needs:

- `simAccumulator`
- `simTick`
- `replayMode`: `"off" | "record" | "play"`
- `replayEvents`
- `replayCursor`
- `recordedEvents`

Input APIs must be routed through one shared input-state function so manual input, recording, and replay all use the same path.

## Official map geometry cleanup

Two known official-map layout issues discovered during AUTO debugging must be corrected before generating the official replay:

- move the second jump-ring sequence so the ring is reachable under normal physics,
- move the final wave-to-cube portal so the cube does not spawn inside a block.

After those minimal geometry corrections, the official map must be manually/algorithmically verified under 120 Hz fixed-step physics before the replay is embedded.

## Verification criteria

Implementation is accepted only if all of the following pass:

1. Official AUTO reaches 100% with no collision bypass.
2. Same official replay reaches 100% when rendering is simulated at 60, 90, 120, and 144 Hz.
3. Replaying twice from the same initial state produces the same final tick and state.
4. Deliberately corrupting one replay event causes a real death/failure rather than a forced recovery.
5. A custom map manual clear records a replay.
6. AUTO can replay that custom map to completion.
7. AUTO clear does not grant creator verification.
8. Editing gameplay geometry invalidates both verification and replay.
9. Old ND1 map codes without replay still import successfully.
10. Existing cube, ship, wave, editor, local storage, and map-code features remain functional.

## Non-goals

- No online leaderboard validation.
- No anti-cheat security.
- No AI pathfinding at runtime.
- No automatic solving of arbitrary maps that have never been manually verified.
- No invulnerability or collision bypass.

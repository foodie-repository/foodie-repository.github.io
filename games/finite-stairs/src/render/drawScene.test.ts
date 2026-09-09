import { describe, expect, it } from 'vitest';
import { createSceneLayout } from './drawScene';
import { createGame, reduceGame } from '../game/engine';
import type { Stair } from '../game/types';

function straightRoute(): Stair[] {
  return Array.from({ length: 2001 }, (_, index) => ({
    index,
    x: index,
    y: index,
    coin: false,
    checkpoint: index > 0 && index % 500 === 0,
  }));
}

describe('createSceneLayout', () => {
  it('keeps the current stair centered and includes nearby stairs', () => {
    const state = createGame(1, { route: straightRoute(), startStep: 100, facing: 1 });
    const layout = createSceneLayout(state, 480, 800, 0);

    expect(layout.stage).toBe(0);
    expect(layout.stairs[0].index).toBe(92);
    expect(layout.stairs.at(-1)?.index).toBe(118);
    expect(layout.stairs.find((stair) => stair.index === 100)).toMatchObject({ x: 240, current: true });
  });

  it('moves the player toward empty space and below the stair while falling', () => {
    const state = createGame(1, { route: straightRoute(), startStep: 10, facing: -1, nowMs: 0 });
    const falling = reduceGame(state, { type: 'climb', nowMs: 100 });
    const before = createSceneLayout(state, 480, 800, 100);
    const during = createSceneLayout(falling, 480, 800, 600);

    expect(during.player.x).toBeLessThan(before.player.x - 48);
    expect(during.player.y).toBeGreaterThan(before.player.y);
    expect(during.player.rotationRad).toBeLessThan(0);
  });
});

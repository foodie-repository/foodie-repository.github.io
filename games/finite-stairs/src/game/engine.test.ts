import { describe, expect, it } from 'vitest';
import { createGame, reduceGame } from './engine';
import type { Direction, Stair } from './types';

function straightRoute(): Stair[] {
  return Array.from({ length: 2001 }, (_, index) => ({
    index,
    x: index,
    y: index,
    coin: index === 7,
    checkpoint: index > 0 && index % 500 === 0,
  }));
}

function gameAt(step = 0, facing: Direction = 1, reducedMotion = false) {
  return createGame(71, { route: straightRoute(), startStep: step, facing, nowMs: 0, reducedMotion });
}

describe('reduceGame movement', () => {
  it('climbs one stair while keeping the current direction', () => {
    const next = reduceGame(gameAt(0, 1), { type: 'climb', nowMs: 10 });

    expect(next).toMatchObject({ step: 1, facing: 1, status: 'playing' });
    expect(next.events).toEqual(['step']);
  });

  it('turns and climbs one stair in a single action', () => {
    const next = reduceGame(gameAt(0, -1), { type: 'turnAndClimb', nowMs: 10 });

    expect(next).toMatchObject({ step: 1, facing: 1, status: 'playing' });
    expect(next.events).toEqual(['turn', 'step']);
  });

  it('starts falling toward the empty side without increasing the step', () => {
    const next = reduceGame(gameAt(0, -1), { type: 'climb', nowMs: 100 });

    expect(next).toMatchObject({
      step: 0,
      facing: -1,
      status: 'falling',
      fall: { reason: 'fall', direction: -1, startedAtMs: 100, durationMs: 800 },
    });
    expect(next.events).toEqual(['fall']);
  });

  it('ignores movement input while falling', () => {
    const falling = reduceGame(gameAt(0, -1), { type: 'climb', nowMs: 100 });

    expect(reduceGame(falling, { type: 'turnAndClimb', nowMs: 200 })).toBe(falling);
  });
});

describe('reduceGame timing and results', () => {
  it('changes from falling to failed only after 800ms', () => {
    const falling = reduceGame(gameAt(0, -1), { type: 'climb', nowMs: 100 });

    expect(reduceGame(falling, { type: 'tick', nowMs: 899 }).status).toBe('falling');
    expect(reduceGame(falling, { type: 'tick', nowMs: 900 }).status).toBe('failed');
  });

  it('uses a 200ms fall when reduced motion is requested', () => {
    const falling = reduceGame(gameAt(0, -1, true), { type: 'climb', nowMs: 100 });

    expect(falling.fall?.durationMs).toBe(200);
    expect(reduceGame(falling, { type: 'tick', nowMs: 299 }).status).toBe('falling');
    expect(reduceGame(falling, { type: 'tick', nowMs: 300 }).status).toBe('failed');
  });

  it('starts a timeout fall in the current facing direction', () => {
    const state = { ...gameAt(10, -1), timeLeftMs: 10, lastTickAtMs: 0 };
    const next = reduceGame(state, { type: 'tick', nowMs: 10 });

    expect(next).toMatchObject({
      step: 10,
      status: 'falling',
      timeLeftMs: 0,
      fall: { reason: 'timeout', direction: -1, startedAtMs: 10 },
    });
    expect(next.events).toEqual(['timeout']);
  });

  it('wins exactly when step 2,000 is reached', () => {
    const next = reduceGame(gameAt(1999, 1), { type: 'climb', nowMs: 10 });

    expect(next).toMatchObject({ step: 2000, status: 'won' });
    expect(next.events).toEqual(['step', 'finish']);
  });

  it('collects a coin once on the stair that contains it', () => {
    const next = reduceGame(gameAt(6, 1), { type: 'climb', nowMs: 10 });

    expect(next.runCoins).toBe(1);
    expect(next.events).toEqual(['step', 'coin']);
  });
});

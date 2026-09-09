import { describe, expect, it } from 'vitest';
import { createStairPath, getStage } from './path';

describe('createStairPath', () => {
  it('creates positions 0 through 2,000', () => {
    const route = createStairPath(20260902);

    expect(route).toHaveLength(2001);
    expect(route[0]).toMatchObject({ index: 0, x: 0, y: 0, checkpoint: false });
    expect(route[2000]).toMatchObject({ index: 2000, y: 2000, checkpoint: true });
  });

  it('returns the same route for the same seed', () => {
    expect(createStairPath(731)).toEqual(createStairPath(731));
  });

  it('changes the route when the seed changes', () => {
    expect(createStairPath(731)).not.toEqual(createStairPath(732));
  });

  it('moves exactly one column on every step', () => {
    const route = createStairPath(87);

    for (let index = 1; index < route.length; index += 1) {
      expect(Math.abs(route[index].x - route[index - 1].x)).toBe(1);
      expect(route[index].y).toBe(index);
    }
  });

  it('marks only 500-step checkpoints and keeps them coin-free', () => {
    const route = createStairPath(112);
    const checkpoints = route.filter((stair) => stair.checkpoint).map((stair) => stair.index);

    expect(checkpoints).toEqual([500, 1000, 1500, 2000]);
    expect(checkpoints.map((index) => route[index].coin)).toEqual([false, false, false, false]);
  });
});

describe('getStage', () => {
  it('uses five visual stages before the summit', () => {
    expect([0, 399, 400, 799, 800, 1199, 1200, 1599, 1600, 2000].map(getStage)).toEqual([
      0, 0, 1, 1, 2, 2, 3, 3, 4, 4,
    ]);
  });
});

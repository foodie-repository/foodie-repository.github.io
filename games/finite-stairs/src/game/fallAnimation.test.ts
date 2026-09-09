import { describe, expect, it } from 'vitest';
import { getFallPose } from './fallAnimation';
import type { FallState } from './types';

function normalFall(direction: -1 | 1 = 1): FallState {
  return { reason: 'fall', direction, startedAtMs: 100, durationMs: 800 };
}

describe('getFallPose', () => {
  it('jumps toward the chosen empty side during the first 200ms', () => {
    const start = getFallPose(normalFall(1), 100);
    const middle = getFallPose(normalFall(1), 200);
    const landing = getFallPose(normalFall(1), 300);

    expect(start).toEqual({ offsetX: 0, offsetY: 0, liftY: 0, rotationRad: 0, opacity: 1 });
    expect(middle.offsetX).toBeGreaterThan(0);
    expect(middle.liftY).toBeLessThan(0);
    expect(landing.offsetX).toBe(48);
    expect(landing.liftY).toBeCloseTo(0, 5);
  });

  it('falls, rotates, and fades after leaving the stair', () => {
    const middle = getFallPose(normalFall(-1), 600);
    const end = getFallPose(normalFall(-1), 900);

    expect(middle.offsetX).toBeLessThan(-48);
    expect(middle.offsetY).toBeGreaterThan(0);
    expect(middle.rotationRad).toBeLessThan(0);
    expect(end).toMatchObject({ opacity: 0 });
    expect(end.offsetY).toBe(520);
  });

  it('uses only a short move and fade for reduced motion', () => {
    const reduced: FallState = { reason: 'fall', direction: 1, startedAtMs: 100, durationMs: 200 };

    expect(getFallPose(reduced, 200)).toEqual({
      offsetX: 6,
      offsetY: 18,
      liftY: 0,
      rotationRad: 0,
      opacity: 0.5,
    });
  });
});

import { describe, expect, it } from 'vitest';
import { mapKeyboardEvent } from './mapControl';

describe('mapKeyboardEvent', () => {
  it.each([
    ['ArrowUp', 'climb'],
    [' ', 'turnAndClimb'],
    ['Spacebar', 'turnAndClimb'],
    ['ArrowLeft', null],
    ['ArrowRight', null],
    ['z', null],
    ['x', null],
  ])('maps %s to %s', (key, expected) => {
    expect(mapKeyboardEvent(key)).toBe(expected);
  });
});

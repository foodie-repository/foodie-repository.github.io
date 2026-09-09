import { beforeEach, describe, expect, it } from 'vitest';
import { CHARACTERS } from './characters';
import {
  PROFILE_KEY,
  applyRun,
  buyOrSelectCharacter,
  getCheckpointCost,
  loadProfile,
  saveProfile,
} from './profile';
import { createGame, reduceGame } from '../game/engine';
import type { Stair } from '../game/types';

beforeEach(() => {
  localStorage.clear();
});

describe('profile migration', () => {
  it('keeps unlocks and coins but resets the incomparable 5,000-step finish time', () => {
    localStorage.setItem('finite-stairs-progress-v1', JSON.stringify({
      version: 1,
      bestStep: 4800,
      bestFinishMs: 250_000,
      checkpoint: 4500,
      coins: 700,
      unlockedCharacters: ['mint', 'snow'],
      selectedCharacter: 'snow',
      soundEnabled: false,
    }));

    const profile = loadProfile(localStorage);

    expect(profile).toEqual({
      version: 2,
      bestStep: 2000,
      bestFinishMs: null,
      checkpoint: 2000,
      coins: 700,
      unlockedCharacters: ['mint', 'snow'],
      selectedCharacter: 'snow',
      soundEnabled: false,
    });
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY) ?? '{}')).toEqual(profile);
  });

  it('returns a safe default when stored JSON is corrupt', () => {
    localStorage.setItem(PROFILE_KEY, '{broken');

    expect(loadProfile(localStorage)).toMatchObject({
      version: 2,
      bestStep: 0,
      coins: 0,
      unlockedCharacters: ['mint'],
      selectedCharacter: 'mint',
    });
  });

  it('normalizes invalid values without unlocking unknown characters', () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({
      version: 2,
      bestStep: -4,
      checkpoint: 777,
      coins: 'many',
      unlockedCharacters: ['ghost'],
      selectedCharacter: 'ghost',
    }));

    expect(loadProfile(localStorage)).toMatchObject({
      bestStep: 0,
      checkpoint: 0,
      coins: 0,
      unlockedCharacters: ['mint'],
      selectedCharacter: 'mint',
    });
  });
});

describe('profile progression', () => {
  it('keeps the four established character prices', () => {
    expect(CHARACTERS.map(({ id, price }) => [id, price])).toEqual([
      ['mint', 0],
      ['sunset', 120],
      ['violet', 260],
      ['snow', 500],
    ]);
  });

  it('buys a locked character once and then selects it for free', () => {
    const initial = { ...loadProfile(localStorage), coins: 150 };
    const purchased = buyOrSelectCharacter(initial, 'sunset');
    const selectedAgain = buyOrSelectCharacter({ ...purchased.profile, selectedCharacter: 'mint' }, 'sunset');

    expect(purchased).toMatchObject({ ok: true, kind: 'purchased' });
    expect(purchased.profile).toMatchObject({ coins: 30, selectedCharacter: 'sunset' });
    expect(purchased.profile.unlockedCharacters).toEqual(['mint', 'sunset']);
    expect(selectedAgain).toMatchObject({ ok: true, kind: 'selected' });
    expect(selectedAgain.profile.coins).toBe(30);
  });

  it('does not mutate progress when coins are insufficient', () => {
    const initial = { ...loadProfile(localStorage), coins: 119 };
    const result = buyOrSelectCharacter(initial, 'sunset');

    expect(result).toEqual({ ok: false, kind: 'insufficient', missingCoins: 1, profile: initial });
  });

  it('adds run coins and records the best single-player result', () => {
    const route: Stair[] = Array.from({ length: 2001 }, (_, index) => ({
      index,
      x: index,
      y: index,
      coin: index === 2000,
      checkpoint: index === 2000,
    }));
    const state = reduceGame(createGame(1, { route, startStep: 1999, facing: 1 }), { type: 'climb', nowMs: 100 });
    const completed = { ...state, elapsedMs: 90_000 };
    const profile = applyRun({ ...loadProfile(localStorage), bestStep: 1200, coins: 9 }, completed);

    expect(profile).toMatchObject({ bestStep: 2000, checkpoint: 2000, coins: 10, bestFinishMs: 90_000 });
  });

  it('calculates the established checkpoint restart price', () => {
    expect([0, 500, 1000, 1500, 2000].map(getCheckpointCost)).toEqual([20, 50, 100, 150, 200]);
  });

  it('returns false instead of throwing when storage writes are blocked', () => {
    const blocked = { getItem: () => null, setItem: () => { throw new Error('blocked'); } };

    expect(saveProfile(blocked, loadProfile(localStorage))).toBe(false);
  });
});

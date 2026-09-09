import type { GameState } from '../game/types';
import { CHARACTERS, type CharacterId } from './characters';

export const PROFILE_KEY = 'finite-stairs-progress-v2';
const LEGACY_PROFILE_KEY = 'finite-stairs-progress-v1';

export interface Profile {
  version: 2;
  bestStep: number;
  bestFinishMs: number | null;
  coins: number;
  unlockedCharacters: CharacterId[];
  selectedCharacter: CharacterId;
  checkpoint: number;
  soundEnabled: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_PROFILE: Profile = {
  version: 2,
  bestStep: 0,
  bestFinishMs: null,
  coins: 0,
  unlockedCharacters: ['mint'],
  selectedCharacter: 'mint',
  checkpoint: 0,
  soundEnabled: true,
};

const CHARACTER_IDS = new Set<CharacterId>(CHARACTERS.map((character) => character.id));

function freshDefault(): Profile {
  return { ...DEFAULT_PROFILE, unlockedCharacters: [...DEFAULT_PROFILE.unlockedCharacters] };
}

function finiteInteger(value: unknown, minimum: number, maximum: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeProfile(value: unknown, legacy: boolean): Profile {
  if (!isRecord(value)) return freshDefault();

  const bestStep = finiteInteger(value.bestStep, 0, 2000, 0);
  const rawCheckpoint = finiteInteger(value.checkpoint, 0, bestStep, 0);
  const checkpoint = Math.floor(rawCheckpoint / 500) * 500;
  const unlockedInput = Array.isArray(value.unlockedCharacters) ? value.unlockedCharacters : [];
  const unlockedCharacters = Array.from(new Set<CharacterId>([
    'mint',
    ...unlockedInput.filter((id): id is CharacterId => typeof id === 'string' && CHARACTER_IDS.has(id as CharacterId)),
  ]));
  const selectedCharacter = typeof value.selectedCharacter === 'string'
    && CHARACTER_IDS.has(value.selectedCharacter as CharacterId)
    && unlockedCharacters.includes(value.selectedCharacter as CharacterId)
    ? value.selectedCharacter as CharacterId
    : 'mint';
  const storedFinish = value.bestFinishMs;
  const bestFinishMs = !legacy && typeof storedFinish === 'number' && Number.isFinite(storedFinish) && storedFinish > 0
    ? Math.floor(storedFinish)
    : null;

  return {
    version: 2,
    bestStep,
    bestFinishMs,
    coins: finiteInteger(value.coins, 0, Number.MAX_SAFE_INTEGER, 0),
    unlockedCharacters,
    selectedCharacter,
    checkpoint,
    soundEnabled: typeof value.soundEnabled === 'boolean' ? value.soundEnabled : true,
  };
}

function parseStored(raw: string | null, legacy: boolean): Profile | null {
  if (!raw) return null;
  try {
    return normalizeProfile(JSON.parse(raw), legacy);
  } catch {
    return legacy ? null : freshDefault();
  }
}

export function loadProfile(storage: StorageLike): Profile {
  try {
    const current = parseStored(storage.getItem(PROFILE_KEY), false);
    if (current) return current;

    const legacy = parseStored(storage.getItem(LEGACY_PROFILE_KEY), true);
    if (!legacy) return freshDefault();
    saveProfile(storage, legacy);
    return legacy;
  } catch {
    return freshDefault();
  }
}

export function saveProfile(storage: StorageLike, profile: Profile): boolean {
  try {
    storage.setItem(PROFILE_KEY, JSON.stringify(normalizeProfile(profile, false)));
    return true;
  } catch {
    return false;
  }
}

export function applyRun(profile: Profile, state: GameState): Profile {
  const finishTime = state.status === 'won'
    ? profile.bestFinishMs === null
      ? state.elapsedMs
      : Math.min(profile.bestFinishMs, state.elapsedMs)
    : profile.bestFinishMs;

  return {
    ...profile,
    bestStep: Math.max(profile.bestStep, state.step),
    bestFinishMs: finishTime,
    coins: profile.coins + state.runCoins,
    checkpoint: Math.max(profile.checkpoint, state.checkpoint),
  };
}

export type CharacterSelectionResult =
  | { ok: true; kind: 'selected' | 'purchased'; profile: Profile }
  | { ok: false; kind: 'insufficient'; missingCoins: number; profile: Profile }
  | { ok: false; kind: 'invalid'; profile: Profile };

export function buyOrSelectCharacter(profile: Profile, id: CharacterId): CharacterSelectionResult {
  const character = CHARACTERS.find((candidate) => candidate.id === id);
  if (!character) return { ok: false, kind: 'invalid', profile };

  if (profile.unlockedCharacters.includes(id)) {
    return { ok: true, kind: 'selected', profile: { ...profile, selectedCharacter: id } };
  }

  if (profile.coins < character.price) {
    return {
      ok: false,
      kind: 'insufficient',
      missingCoins: character.price - profile.coins,
      profile,
    };
  }

  return {
    ok: true,
    kind: 'purchased',
    profile: {
      ...profile,
      coins: profile.coins - character.price,
      unlockedCharacters: [...profile.unlockedCharacters, id],
      selectedCharacter: id,
    },
  };
}

export function getCheckpointCost(checkpoint: number): number {
  return Math.max(20, Math.floor(Math.max(0, checkpoint) / 10));
}

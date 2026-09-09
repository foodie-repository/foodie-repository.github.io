import { GOAL_STEP } from './constants';
import { createStairPath } from './path';
import type { Direction, FallState, GameAction, GameEvent, GameState, Stair } from './types';

export interface CreateGameOptions {
  route?: Stair[];
  startStep?: number;
  facing?: Direction;
  nowMs?: number;
  reducedMotion?: boolean;
}

export function createGame(seed: number, options: CreateGameOptions = {}): GameState {
  const route = options.route ?? createStairPath(seed);
  const goalStep = route.length - 1;
  const step = Math.min(goalStep, Math.max(0, Math.floor(options.startStep ?? 0)));
  const next = route[Math.min(goalStep, step + 1)];
  const current = route[step];
  const routeFacing: Direction = next && current && next.x < current.x ? -1 : 1;
  const maxTimeMs = getTimeLimit(step, goalStep);
  return {
    seed,
    route,
    step,
    facing: options.facing ?? routeFacing,
    status: step === goalStep ? 'won' : 'playing',
    timeLeftMs: maxTimeMs,
    maxTimeMs,
    runCoins: 0,
    checkpoint: Math.floor(step / 500) * 500,
    elapsedMs: 0,
    lastTickAtMs: options.nowMs ?? 0,
    reducedMotion: options.reducedMotion ?? false,
    fall: null,
    events: [],
  };
}

function getTimeLimit(step: number, goalStep = GOAL_STEP): number {
  const progress = Math.min(1, Math.max(0, step / Math.max(1, goalStep)));
  return Math.round(5200 - progress * 2400);
}

function directionBetween(current: Stair, next: Stair): Direction {
  return next.x < current.x ? -1 : 1;
}

function beginFall(
  state: GameState,
  reason: FallState['reason'],
  direction: Direction,
  nowMs: number,
  events: GameEvent[],
): GameState {
  return {
    ...state,
    facing: direction,
    status: 'falling',
    timeLeftMs: reason === 'timeout' ? 0 : state.timeLeftMs,
    lastTickAtMs: nowMs,
    fall: {
      reason,
      direction,
      startedAtMs: nowMs,
      durationMs: state.reducedMotion ? 200 : 800,
    },
    events,
  };
}

function move(state: GameState, turn: boolean, nowMs: number): GameState {
  const facing: Direction = turn ? (state.facing === 1 ? -1 : 1) : state.facing;
  const nextStep = state.step + 1;
  const current = state.route[state.step];
  const next = state.route[nextStep];
  const prefix: GameEvent[] = turn ? ['turn'] : [];

  if (!current || !next || directionBetween(current, next) !== facing) {
    return beginFall(state, 'fall', facing, nowMs, [...prefix, 'fall']);
  }

  const goalStep = state.route.length - 1;
  const won = nextStep === goalStep;
  const maxTimeMs = getTimeLimit(nextStep, goalStep);
  const events: GameEvent[] = [...prefix, 'step'];
  if (next.coin) events.push('coin');
  if (next.checkpoint && !won) events.push('checkpoint');
  if (won) events.push('finish');

  return {
    ...state,
    step: nextStep,
    facing,
    status: won ? 'won' : 'playing',
    timeLeftMs: Math.min(maxTimeMs, state.timeLeftMs + 620),
    maxTimeMs,
    runCoins: state.runCoins + (next.coin ? 1 : 0),
    checkpoint: next.checkpoint ? nextStep : state.checkpoint,
    lastTickAtMs: nowMs,
    fall: null,
    events,
  };
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  if (state.status === 'falling') {
    if (action.type !== 'tick') return state;
    if (!state.fall || action.nowMs < state.fall.startedAtMs + state.fall.durationMs) {
      return state.events.length === 0 ? state : { ...state, events: [] };
    }
    return { ...state, status: 'failed', lastTickAtMs: action.nowMs, events: [] };
  }

  if (action.type === 'pause') {
    return state.status === 'playing' ? { ...state, status: 'paused', events: [] } : state;
  }

  if (action.type === 'resume') {
    return state.status === 'paused'
      ? { ...state, status: 'playing', lastTickAtMs: action.nowMs, events: [] }
      : state;
  }

  if (state.status !== 'playing') return state;

  if (action.type === 'climb') return move(state, false, action.nowMs);
  if (action.type === 'turnAndClimb') return move(state, true, action.nowMs);

  const deltaMs = Math.max(0, action.nowMs - state.lastTickAtMs);
  const timeLeftMs = Math.max(0, state.timeLeftMs - deltaMs);
  if (timeLeftMs === 0) {
    return beginFall(
      { ...state, elapsedMs: state.elapsedMs + deltaMs, timeLeftMs },
      'timeout',
      state.facing,
      action.nowMs,
      ['timeout'],
    );
  }

  return {
    ...state,
    timeLeftMs,
    elapsedMs: state.elapsedMs + deltaMs,
    lastTickAtMs: action.nowMs,
    events: [],
  };
}

export type Direction = -1 | 1;

export type GameStatus = 'playing' | 'paused' | 'falling' | 'failed' | 'won';

export interface Stair {
  index: number;
  x: number;
  y: number;
  coin: boolean;
  checkpoint: boolean;
}

export interface FallState {
  reason: 'fall' | 'timeout';
  direction: Direction;
  startedAtMs: number;
  durationMs: 800 | 200;
}

export type GameEvent = 'step' | 'turn' | 'coin' | 'checkpoint' | 'fall' | 'timeout' | 'finish';

export interface GameState {
  seed: number;
  route: Stair[];
  step: number;
  facing: Direction;
  status: GameStatus;
  timeLeftMs: number;
  maxTimeMs: number;
  runCoins: number;
  checkpoint: number;
  elapsedMs: number;
  lastTickAtMs: number;
  reducedMotion: boolean;
  fall: FallState | null;
  events: GameEvent[];
}

export type GameAction =
  | { type: 'climb'; nowMs: number }
  | { type: 'turnAndClimb'; nowMs: number }
  | { type: 'tick'; nowMs: number }
  | { type: 'pause' }
  | { type: 'resume'; nowMs: number };

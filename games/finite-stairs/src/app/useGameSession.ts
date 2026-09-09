import { useCallback, useEffect, useRef, useState } from 'react';
import type { ControlAction } from '../controls/mapControl';
import { reduceGame } from '../game/engine';
import type { GameState } from '../game/types';

export interface GameSession {
  state: GameState;
  act: (action: ControlAction) => void;
  pause: () => void;
  resume: () => void;
}

function monotonicNow(): number {
  return performance.now();
}

export function useGameSession(initialState: GameState): GameSession {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const act = useCallback((action: ControlAction) => {
    setState((current) => reduceGame(current, { type: action, nowMs: monotonicNow() }));
  }, []);

  const pause = useCallback(() => {
    setState((current) => reduceGame(current, { type: 'pause' }));
  }, []);

  const resume = useCallback(() => {
    setState((current) => reduceGame(current, { type: 'resume', nowMs: monotonicNow() }));
  }, []);

  useEffect(() => {
    if (state.status !== 'playing') return undefined;

    let frame = 0;
    const tick = (nowMs: number) => {
      setState((current) => reduceGame(current, { type: 'tick', nowMs }));
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'falling' || !state.fall) return undefined;
    const waitMs = Math.max(0, state.fall.startedAtMs + state.fall.durationMs - monotonicNow());
    const timer = window.setTimeout(() => {
      setState((current) => reduceGame(current, {
        type: 'tick',
        nowMs: current.fall ? current.fall.startedAtMs + current.fall.durationMs : monotonicNow(),
      }));
    }, waitMs);
    return () => window.clearTimeout(timer);
  }, [state.fall, state.status]);

  useEffect(() => {
    const suspend = () => {
      if (document.hidden || stateRef.current.status === 'playing') {
        setState((current) => reduceGame(current, { type: 'pause' }));
      }
    };
    document.addEventListener('visibilitychange', suspend);
    window.addEventListener('orientationchange', suspend);
    return () => {
      document.removeEventListener('visibilitychange', suspend);
      window.removeEventListener('orientationchange', suspend);
    };
  }, []);

  return { state, act, pause, resume };
}

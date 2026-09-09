import { useEffect, useRef } from 'react';
import type { GameState } from '../game/types';
import type { CharacterDefinition } from '../profile/characters';
import { drawScene } from './drawScene';

interface GameCanvasProps {
  state: GameState;
  character: CharacterDefinition;
}

export function GameCanvas({ state, character }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(state);
  const characterRef = useRef(character);

  useEffect(() => {
    stateRef.current = state;
    characterRef.current = character;
  }, [state, character]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;

    let animationFrame = 0;
    const render = (nowMs: number) => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.max(1, Math.round(bounds.width * ratio));
      const pixelHeight = Math.max(1, Math.round(bounds.height * ratio));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      drawScene(context, stateRef.current, characterRef.current, bounds.width, bounds.height, nowMs);
      animationFrame = window.requestAnimationFrame(render);
    };
    animationFrame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      aria-label={`현재 ${state.step.toLocaleString('ko-KR')}번째 계단, ${character.name}`}
    />
  );
}

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame } from '../game/engine';
import type { Direction, Stair } from '../game/types';
import { GameScreen } from './GameScreen';

function routeWithDirections(directions: Direction[]): Stair[] {
  let x = 0;
  return [
    { index: 0, x: 0, y: 0, coin: false, checkpoint: false },
    ...directions.map((direction, offset) => {
      x += direction;
      const index = offset + 1;
      return { index, x, y: index, coin: false, checkpoint: false };
    }),
  ];
}

describe('GameScreen', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the fall animation before the failure result', () => {
    vi.useFakeTimers();
    const initialState = createGame(7, {
      route: routeWithDirections([-1, 1]),
      facing: 1,
      nowMs: 0,
    });

    render(<GameScreen initialState={initialState} mode="single" />);
    fireEvent.keyDown(window, { key: 'ArrowUp' });

    expect(screen.getByText('추락 중…')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /계단 도달/ })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(799));
    expect(screen.queryByRole('heading', { name: /계단 도달/ })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('heading', { name: '0계단 도달' })).toBeInTheDocument();
  });

  it('turns the character and climbs one stair with Space', () => {
    const initialState = createGame(8, {
      route: routeWithDirections([-1, 1]),
      facing: 1,
      nowMs: 0,
    });

    render(<GameScreen initialState={initialState} mode="single" />);
    fireEvent.keyDown(window, { key: ' ' });

    expect(screen.getByLabelText(/현재 1번째 계단/)).toBeInTheDocument();
    expect(screen.getByText('방향: 왼쪽')).toBeInTheDocument();
  });

  it('uses the same actions for the two mobile buttons', () => {
    const initialState = createGame(9, {
      route: routeWithDirections([1, -1, -1]),
      facing: 1,
      nowMs: 0,
    });

    render(<GameScreen initialState={initialState} mode="single" />);
    fireEvent.click(screen.getByRole('button', { name: '오르기' }));
    fireEvent.click(screen.getByRole('button', { name: '전환 + 오르기' }));

    expect(screen.getByLabelText(/현재 2번째 계단/)).toBeInTheDocument();
    expect(screen.getByText('방향: 왼쪽')).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { App } from './App';

beforeEach(() => {
  window.localStorage.clear();
});

it('renders the Korean game title and single-player action', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: '유한의 계단' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '싱글 플레이' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '친구와 1대1 · 준비 중' })).toBeDisabled();
});

it('opens the playable single-player screen from the home menu', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '싱글 플레이' }));

  expect(screen.getByLabelText('싱글 플레이')).toBeInTheDocument();
  expect(screen.getByText('/ 2,000')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '전환 + 오르기' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '오르기' })).toBeInTheDocument();
});

it('opens character selection and the controls guide', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: '캐릭터' }));
  expect(screen.getByRole('heading', { name: '캐릭터 선택' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '홈으로' }));

  fireEvent.click(screen.getByRole('button', { name: '조작법' }));
  expect(screen.getByRole('heading', { name: '조작법' })).toBeInTheDocument();
  expect(screen.getByText(/Space/)).toBeInTheDocument();
});

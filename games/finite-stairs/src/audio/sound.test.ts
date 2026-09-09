import { describe, expect, it, vi } from 'vitest';
import { createSoundPlayer, type AudioContextLike } from './sound';

function audioContextFixture() {
  const oscillator = {
    type: 'sine',
    frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  };
  const context = {
    currentTime: 4,
    state: 'running',
    destination: {},
    createOscillator: vi.fn(() => oscillator),
    createGain: vi.fn(() => gain),
    resume: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  } as unknown as AudioContextLike;
  return { context, oscillator };
}

describe('createSoundPlayer', () => {
  it('creates one oscillator for one enabled game event', () => {
    const { context, oscillator } = audioContextFixture();
    const sound = createSoundPlayer(() => context);

    sound.play('fall');

    expect(context.createOscillator).toHaveBeenCalledTimes(1);
    expect(oscillator.start).toHaveBeenCalledWith(4);
    expect(oscillator.stop).toHaveBeenCalledWith(4.18);
  });

  it('does not create audio while disabled and closes owned audio on dispose', () => {
    const { context } = audioContextFixture();
    const sound = createSoundPlayer(() => context);

    sound.setEnabled(false);
    sound.play('coin');
    expect(context.createOscillator).not.toHaveBeenCalled();
    sound.setEnabled(true);
    sound.play('coin');
    sound.dispose();
    expect(context.close).toHaveBeenCalledTimes(1);
  });
});

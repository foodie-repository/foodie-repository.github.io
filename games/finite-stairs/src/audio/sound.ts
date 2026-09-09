import type { GameEvent } from '../game/types';

export interface AudioParamLike {
  setValueAtTime(value: number, startTime: number): void;
  exponentialRampToValueAtTime(value: number, endTime: number): void;
}

export interface AudioNodeLike {
  connect(destination: unknown): void;
}

export interface OscillatorLike extends AudioNodeLike {
  type: OscillatorType;
  frequency: AudioParamLike;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface GainLike extends AudioNodeLike {
  gain: AudioParamLike;
}

export interface AudioContextLike {
  currentTime: number;
  state: string;
  destination: unknown;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
  resume(): Promise<void>;
  close(): Promise<void>;
}

export interface SoundPlayer {
  play(event: GameEvent): void;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

interface SoundShape {
  frequency: number;
  endFrequency: number;
  duration: number;
  volume: number;
}

const SOUND_SHAPES: Record<GameEvent, SoundShape> = {
  step: { frequency: 290, endFrequency: 360, duration: 0.055, volume: 0.04 },
  turn: { frequency: 180, endFrequency: 140, duration: 0.045, volume: 0.025 },
  coin: { frequency: 720, endFrequency: 980, duration: 0.12, volume: 0.055 },
  checkpoint: { frequency: 420, endFrequency: 760, duration: 0.17, volume: 0.065 },
  fall: { frequency: 240, endFrequency: 55, duration: 0.18, volume: 0.07 },
  timeout: { frequency: 150, endFrequency: 70, duration: 0.18, volume: 0.07 },
  finish: { frequency: 520, endFrequency: 1040, duration: 0.18, volume: 0.08 },
};

function browserAudioContext(): AudioContextLike {
  return new AudioContext() as unknown as AudioContextLike;
}

export function createSoundPlayer(createContext: () => AudioContextLike = browserAudioContext): SoundPlayer {
  let context: AudioContextLike | null = null;
  let enabled = true;

  return {
    play(event) {
      if (!enabled || typeof AudioContext === 'undefined' && createContext === browserAudioContext) return;
      try {
        context ??= createContext();
        if (context.state === 'suspended') void context.resume();
        const shape = SOUND_SHAPES[event];
        const startAt = context.currentTime;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = event === 'coin' || event === 'finish' ? 'sine' : 'square';
        oscillator.frequency.setValueAtTime(shape.frequency, startAt);
        oscillator.frequency.exponentialRampToValueAtTime(shape.endFrequency, startAt + shape.duration);
        gain.gain.setValueAtTime(shape.volume, startAt);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + shape.duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + shape.duration);
      } catch {
        // Browsers may block audio until a user gesture. Gameplay remains usable without sound.
      }
    },
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
    },
    dispose() {
      if (context) void context.close();
      context = null;
    },
  };
}

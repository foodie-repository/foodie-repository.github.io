import type { FallState } from './types';

export interface FallPose {
  offsetX: number;
  offsetY: number;
  liftY: number;
  rotationRad: number;
  opacity: number;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function getFallPose(fall: FallState, nowMs: number): FallPose {
  const elapsedMs = Math.max(0, nowMs - fall.startedAtMs);

  if (fall.durationMs === 200) {
    const progress = clamp01(elapsedMs / 200);
    return {
      offsetX: fall.direction * 12 * progress,
      offsetY: 36 * progress,
      liftY: 0,
      rotationRad: 0,
      opacity: 1 - progress,
    };
  }

  if (elapsedMs <= 200) {
    const progress = clamp01(elapsedMs / 200);
    const easeOut = 1 - (1 - progress) ** 3;
    return {
      offsetX: fall.direction * 48 * easeOut,
      offsetY: 0,
      liftY: progress === 0 || progress === 1 ? 0 : -18 * Math.sin(Math.PI * progress),
      rotationRad: 0,
      opacity: 1,
    };
  }

  const progress = clamp01((elapsedMs - 200) / 600);
  const fadeProgress = clamp01((progress - 0.65) / 0.35);
  return {
    offsetX: fall.direction * (48 + 16 * progress),
    offsetY: 520 * progress ** 2,
    liftY: 0,
    rotationRad: fall.direction * 1.35 * progress,
    opacity: 1 - fadeProgress,
  };
}

import { CHECKPOINT_INTERVAL, GOAL_STEP } from './constants';
import { createMulberry32 } from './rng';
import type { Direction, Stair } from './types';

function getMaximumRun(step: number): number {
  if (step < 400) return 5;
  if (step < 1200) return 4;
  return 3;
}

export function createStairPath(seed: number, goalStep = GOAL_STEP): Stair[] {
  const random = createMulberry32(seed);
  const route: Stair[] = [{ index: 0, x: 0, y: 0, coin: false, checkpoint: false }];
  let x = 0;
  let direction: Direction = random() >= 0.5 ? 1 : -1;
  let remainingInRun = 0;

  for (let index = 1; index <= goalStep; index += 1) {
    if (remainingInRun <= 0) {
      direction = direction === 1 ? -1 : 1;
      const maximum = getMaximumRun(index);
      const minimum = index < 400 ? 2 : 1;
      remainingInRun = minimum + Math.floor(random() * (maximum - minimum + 1));
    }

    x += direction;
    remainingInRun -= 1;
    const checkpoint = index % CHECKPOINT_INTERVAL === 0;
    route.push({
      index,
      x,
      y: index,
      coin: !checkpoint && random() < 0.085,
      checkpoint,
    });
  }

  return route;
}

export function getStage(step: number): number {
  return Math.min(4, Math.max(0, Math.floor(step / 400)));
}

export type ControlAction = 'climb' | 'turnAndClimb';

export function mapKeyboardEvent(key: string): ControlAction | null {
  if (key === 'ArrowUp') return 'climb';
  if (key === ' ' || key === 'Spacebar') return 'turnAndClimb';
  return null;
}

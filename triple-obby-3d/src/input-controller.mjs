const INPUT_KEYS = new Set(['forward', 'back', 'left', 'right', 'jump', 'sprint']);

export function computeWorldMove(input) {
  const x = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const z = Number(Boolean(input.back)) - Number(Boolean(input.forward));
  const length = Math.hypot(x, z);
  if (length === 0) return Object.freeze({ x: 0, y: 0, z: 0 });
  return Object.freeze({ x: x / length, y: 0, z: z / length });
}

export function updateKeyState(state, { key, pressed }) {
  if (!INPUT_KEYS.has(key) || !Object.hasOwn(state, key)) {
    throw new TypeError(`Unknown input key: ${key}`);
  }
  return Object.freeze({ ...state, [key]: Boolean(pressed) });
}

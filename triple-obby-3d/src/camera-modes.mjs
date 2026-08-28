export const CAMERA_MODES = Object.freeze([
  Object.freeze({ id: 'third', label: '3인칭', fov: 65 }),
  Object.freeze({ id: 'close', label: '근접', fov: 69 }),
  Object.freeze({ id: 'first', label: '1인칭', fov: 76 }),
  Object.freeze({ id: 'top', label: '탑뷰', fov: 58 }),
]);

export function nextCameraMode(currentId) {
  const index = CAMERA_MODES.findIndex(mode => mode.id === currentId);
  const normalizedIndex = index < 0 ? 0 : index;
  return CAMERA_MODES[(normalizedIndex + 1) % CAMERA_MODES.length];
}

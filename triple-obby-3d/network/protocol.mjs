export const ROOM_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;
export const MAP_IDS = Object.freeze(['lobby', 'color', 'lava', 'sky']);
export const ANIMATIONS = Object.freeze(['idle', 'run', 'jump', 'fall']);

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
}

function assertFiniteNumber(value, label) {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

function assertVector3(value, label) {
  if (!Array.isArray(value) || value.length !== 3 || value.some(item => !Number.isFinite(item))) {
    throw new TypeError(`${label} must be a finite 3-vector`);
  }
  return Object.freeze([value[0], value[1], value[2]]);
}

export function normalizeRoomCode(value) {
  const normalized = String(value ?? '').replace(/\s+/g, '').toUpperCase();
  if (!ROOM_CODE_REGEX.test(normalized)) {
    throw new TypeError('Invalid room code');
  }
  return normalized;
}

export function acceptSequence(lastSeq, incomingSeq) {
  if (!Number.isInteger(incomingSeq) || incomingSeq < 0 || incomingSeq > 0x7fffffff) return false;
  return lastSeq == null || incomingSeq > lastSeq;
}

export function validatePlayerState(value) {
  assertObject(value, 'player state');
  if (value.type !== 'player_state') throw new TypeError('type must be player_state');
  if (typeof value.sessionId !== 'string' || value.sessionId.length < 1 || value.sessionId.length > 128) {
    throw new TypeError('sessionId is invalid');
  }
  if (!Number.isInteger(value.seq) || value.seq < 0 || value.seq > 0x7fffffff) {
    throw new TypeError('seq is invalid');
  }
  assertFiniteNumber(value.sentAt, 'sentAt');
  if (!MAP_IDS.includes(value.mapId)) throw new TypeError('mapId is invalid');
  const position = assertVector3(value.position, 'position');
  const velocity = assertVector3(value.velocity, 'velocity');
  const yaw = assertFiniteNumber(value.yaw, 'yaw');
  if (typeof value.grounded !== 'boolean') throw new TypeError('grounded must be boolean');
  if (!Number.isInteger(value.stage) || value.stage < 1 || value.stage > 20) {
    throw new TypeError('stage is invalid');
  }
  if (!ANIMATIONS.includes(value.animation)) throw new TypeError('animation is invalid');

  return Object.freeze({
    type: 'player_state',
    sessionId: value.sessionId,
    seq: value.seq,
    sentAt: value.sentAt,
    mapId: value.mapId,
    position,
    velocity,
    yaw,
    grounded: value.grounded,
    stage: value.stage,
    animation: value.animation,
  });
}

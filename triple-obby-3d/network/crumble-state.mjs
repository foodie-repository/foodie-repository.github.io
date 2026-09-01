const MAP_IDS = new Set(['color', 'lava', 'sky']);
const STATES = new Set(['active', 'cracking', 'hidden']);

export function makeCrumbleId(mapId, stage, ordinal) {
  if (!MAP_IDS.has(mapId)) throw new TypeError(`Unsupported map: ${mapId}`);
  if (!Number.isInteger(stage) || stage < 1 || stage > 20) throw new TypeError('stage must be 1..20');
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 99) throw new TypeError('ordinal must be 1..99');
  return `${mapId}:crumble:${String(stage).padStart(2, '0')}:${String(ordinal).padStart(2, '0')}`;
}

function freezeState(state) {
  return Object.freeze({
    state: state.state,
    transitionId: state.transitionId ?? null,
    effectiveAt: Number(state.effectiveAt ?? 0),
    respawnAt: Number(state.respawnAt ?? 0),
  });
}

export function applyAuthoritativeCrumble(current, message) {
  if (!message || !STATES.has(message.state)) throw new TypeError('invalid crumble state');
  if (typeof message.transitionId !== 'string' || message.transitionId.length === 0) {
    throw new TypeError('transitionId is required');
  }
  if (!Number.isFinite(message.effectiveAt) || !Number.isFinite(message.respawnAt)) {
    throw new TypeError('crumble timestamps must be finite');
  }
  if (current?.transitionId === message.transitionId) return current;
  if (current && Number(current.effectiveAt) > message.effectiveAt) return current;
  return freezeState(message);
}

export function advanceCrumble(current, nowMs) {
  if (!current || !STATES.has(current.state)) throw new TypeError('invalid current crumble state');
  if (!Number.isFinite(nowMs)) throw new TypeError('nowMs must be finite');
  if (current.state === 'active') return current;
  if (nowMs >= current.respawnAt) {
    return freezeState({ state: 'active', transitionId: current.transitionId, effectiveAt: current.respawnAt, respawnAt: current.respawnAt });
  }
  if (current.state === 'cracking' && nowMs >= current.effectiveAt + 600) {
    return freezeState({ ...current, state: 'hidden' });
  }
  return current;
}

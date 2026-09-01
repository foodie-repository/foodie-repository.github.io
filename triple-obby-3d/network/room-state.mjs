const CONNECTION_STATES = new Set(['idle', 'connecting', 'online', 'reconnecting', 'offline-solo']);
const MAP_IDS = new Set(['lobby', 'color', 'lava', 'sky']);

export function electHost(members) {
  if (!Array.isArray(members) || members.length === 0) return null;
  return [...members].sort((a, b) => {
    const time = Number(a.joinedAt) - Number(b.joinedAt);
    if (time !== 0) return time;
    return String(a.sessionId).localeCompare(String(b.sessionId));
  })[0] ?? null;
}

export function reduceRoomState(state, event) {
  if (!state || typeof state !== 'object') throw new TypeError('state is required');
  if (!event || typeof event.type !== 'string') throw new TypeError('event type is required');

  switch (event.type) {
    case 'CONNECTING':
      return { ...state, connection: 'connecting', error: null };
    case 'JOINED':
      return {
        ...state,
        connection: 'online',
        room: event.room ? { ...event.room } : null,
        members: Array.isArray(event.members) ? event.members.map(member => ({ ...member })) : [],
        error: null,
      };
    case 'MEMBERS_SYNCED':
      return { ...state, members: Array.isArray(event.members) ? event.members.map(member => ({ ...member })) : [] };
    case 'MAP_CHANGED':
      if (!MAP_IDS.has(event.mapId)) throw new TypeError(`Unknown map: ${event.mapId}`);
      return { ...state, mapId: event.mapId };
    case 'SOCKET_LOST':
      return { ...state, connection: 'offline-solo', error: event.reason ?? 'network disconnected' };
    case 'RECONNECTING':
      return { ...state, connection: 'reconnecting', error: event.reason ?? null };
    case 'RECONNECTED':
      return { ...state, connection: 'online', error: null };
    case 'LEFT':
      return { ...state, connection: 'idle', room: null, members: [], mapId: 'lobby', error: null };
    default:
      if (event.connection && !CONNECTION_STATES.has(event.connection)) {
        throw new TypeError(`Unknown connection state: ${event.connection}`);
      }
      return state;
  }
}

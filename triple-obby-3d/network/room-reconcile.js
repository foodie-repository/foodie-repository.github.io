(() => {
  function normalizeStartAt(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : Date.now();
  }

  function reconcileServerRoom(previousRoom, nextRoom) {
    if (!nextRoom || typeof nextRoom !== 'object') {
      return { room: previousRoom || null, mapChange: null, hostChanged: false };
    }

    const previous = previousRoom || null;
    const room = { ...nextRoom };
    const hostChanged = Boolean(previous && previous.host_session_id !== room.host_session_id);
    const mapChanged = Boolean(
      previous && (
        previous.current_map_id !== room.current_map_id ||
        previous.map_transition_id !== room.map_transition_id
      )
    );

    const mapChange = mapChanged && room.current_map_id
      ? {
          mapId: room.current_map_id,
          hostSessionId: room.host_session_id,
          transitionId: room.map_transition_id,
          startAt: normalizeStartAt(room.map_start_at),
          fromServer: true,
        }
      : null;

    return { room, mapChange, hostChanged };
  }

  window.TripleObbyOnline = window.TripleObbyOnline || {};
  window.TripleObbyOnline.reconcileServerRoom = reconcileServerRoom;
})();

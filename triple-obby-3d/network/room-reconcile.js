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

  function reconcileMapMessage(previousRoom, message) {
    const previous = previousRoom && typeof previousRoom === 'object' ? previousRoom : null;
    if (!previous || !message || typeof message !== 'object') {
      return { room: previous, mapChange: null, duplicate: false, ignored: true };
    }
    if (!message.mapId || !message.transitionId || message.hostSessionId !== previous.host_session_id) {
      return { room: { ...previous }, mapChange: null, duplicate: false, ignored: true };
    }

    const duplicate = previous.current_map_id === message.mapId && previous.map_transition_id === message.transitionId;
    if (duplicate) {
      return { room: { ...previous }, mapChange: null, duplicate: true, ignored: false };
    }

    const startAt = normalizeStartAt(message.startAt);
    const room = {
      ...previous,
      current_map_id: message.mapId,
      map_transition_id: message.transitionId,
      map_start_at: new Date(startAt).toISOString(),
    };
    return {
      room,
      mapChange: {
        mapId: message.mapId,
        hostSessionId: message.hostSessionId,
        transitionId: message.transitionId,
        startAt,
        fromServer: false,
      },
      duplicate: false,
      ignored: false,
    };
  }

  window.TripleObbyOnline = window.TripleObbyOnline || {};
  window.TripleObbyOnline.reconcileServerRoom = reconcileServerRoom;
  window.TripleObbyOnline.reconcileMapMessage = reconcileMapMessage;
})();
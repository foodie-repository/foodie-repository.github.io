(() => {
  const config = window.TRIPLE_OBBY_CONFIG;
  if (!config) throw new Error('TRIPLE_OBBY_CONFIG is missing');
  if (!window.supabase?.createClient) throw new Error('Supabase client library is missing');
  const reconcileServerRoom = window.TripleObbyOnline?.reconcileServerRoom;
  const reconcileMapMessage = window.TripleObbyOnline?.reconcileMapMessage;
  if (typeof reconcileServerRoom !== 'function' || typeof reconcileMapMessage !== 'function') {
    throw new Error('Room reconciliation helper is missing');
  }

  const dispatch = (name, detail) => window.dispatchEvent(new CustomEvent(name, { detail }));

  function makeTimeoutSignal(timeoutMs) {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      return AbortSignal.timeout(timeoutMs);
    }
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }

  class RoomClient {
    constructor() {
      this.supabase = window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        realtime: { params: { eventsPerSecond: 10 } },
      });
      this.room = null;
      this.members = [];
      this.memberToken = null;
      this.channel = null;
      this.nickname = '';
      this.online = false;
      this.sessionId = sessionStorage.getItem('tripleObby.sessionId') || crypto.randomUUID();
      sessionStorage.setItem('tripleObby.sessionId', this.sessionId);
      this.heartbeatTimer = null;
      this.reconnectTimer = null;
      this.reconnectStartedAt = 0;
      this.reconnectAttempt = 0;
      this.lastSeqBySession = new Map();
    }

    get isHost() {
      return Boolean(this.room && this.room.host_session_id === this.sessionId);
    }

    get roomCode() {
      return this.room?.code ?? null;
    }

    async call(action, payload = {}, timeoutMs = 15000) {
      let response;
      try {
        response = await fetch(`${config.supabaseUrl}/functions/v1/room-control`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            apikey: config.supabasePublishableKey,
          },
          body: JSON.stringify({ action, ...payload }),
          signal: makeTimeoutSignal(timeoutMs),
          keepalive: action === 'leave',
        });
      } catch (cause) {
        const timedOut = cause?.name === 'TimeoutError' || cause?.name === 'AbortError';
        const error = new Error(timedOut ? '온라인 서버 응답 시간이 초과되었습니다.' : '온라인 서버에 연결할 수 없습니다.');
        error.code = timedOut ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR';
        error.cause = cause;
        throw error;
      }

      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        const error = new Error(body?.error?.message || `온라인 요청 실패 (${response.status})`);
        error.code = body?.error?.code || 'REQUEST_FAILED';
        throw error;
      }
      return body.data;
    }

    async createRoom(nickname) {
      await this.leave({ silent: true });
      this.nickname = nickname.trim();
      const data = await this.call('create', {
        nickname: this.nickname,
        sessionId: this.sessionId,
        version: config.version,
      });
      this.room = data.room;
      this.memberToken = data.memberToken;
      this.members = data.members ?? [];
      await this.connectChannel();
      dispatch('obby:room-joined', this.snapshot());
      return this.snapshot();
    }

    async joinRoom(code, nickname) {
      await this.leave({ silent: true });
      this.nickname = nickname.trim();
      const data = await this.call('join', {
        code,
        nickname: this.nickname,
        sessionId: this.sessionId,
        version: config.version,
      });
      this.room = data.room;
      this.memberToken = data.memberToken;
      this.members = data.members ?? [];
      await this.connectChannel();
      dispatch('obby:room-joined', this.snapshot());
      if (this.room.current_map_id && this.room.current_map_id !== 'lobby') {
        dispatch('obby:map-change', {
          mapId: this.room.current_map_id,
          hostSessionId: this.room.host_session_id,
          transitionId: this.room.map_transition_id,
          startAt: Date.parse(this.room.map_start_at || '') || Date.now(),
          fromServer: true,
        });
      }
      this.broadcast('snapshot_request', { sessionId: this.sessionId });
      return this.snapshot();
    }

    snapshot() {
      return {
        room: this.room ? { ...this.room } : null,
        members: this.members.map(member => ({ ...member })),
        sessionId: this.sessionId,
        nickname: this.nickname,
        isHost: this.isHost,
        online: this.online,
      };
    }

    async connectChannel() {
      if (!this.room) throw new Error('Room is required');
      if (this.channel) await this.supabase.removeChannel(this.channel);
      this.channel = this.supabase.channel(`obby-room:${this.room.id}`, {
        config: {
          presence: { key: this.sessionId },
          broadcast: { self: false, ack: false },
        },
      });

      this.channel.on('presence', { event: 'sync' }, () => this.handlePresenceSync());
      const events = ['player_state', 'map_change', 'block_trigger', 'block_state', 'snapshot_request', 'room_snapshot', 'host_claim'];
      for (const event of events) {
        this.channel.on('broadcast', { event }, payload => this.handleBroadcast(event, payload.payload));
      }

      await new Promise((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
          if (!settled) reject(new Error('Realtime connection timeout'));
        }, 12000);
        this.channel.subscribe(async status => {
          if (status === 'SUBSCRIBED') {
            this.online = true;
            this.reconnectAttempt = 0;
            this.reconnectStartedAt = 0;
            await this.channel.track({
              sessionId: this.sessionId,
              nickname: this.nickname,
              joinedAt: Date.now(),
              avatarColor: this.colorForSession(this.sessionId),
            });
            this.startHeartbeat();
            dispatch('obby:connection', { status: 'online' });
            if (!settled) {
              settled = true;
              clearTimeout(timeout);
              resolve();
            }
          } else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
            this.online = false;
            dispatch('obby:connection', { status: 'reconnecting' });
            this.scheduleReconnect();
          }
        });
      });
    }

    colorForSession(sessionId) {
      let hash = 2166136261;
      for (const ch of sessionId) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619) >>> 0;
      const hue = hash % 360;
      return `hsl(${hue} 78% 58%)`;
    }

    handlePresenceSync() {
      if (!this.channel) return;
      const state = this.channel.presenceState();
      const members = [];
      for (const presences of Object.values(state)) {
        for (const presence of presences) {
          if (!presence?.sessionId) continue;
          members.push({
            session_id: presence.sessionId,
            nickname: String(presence.nickname || 'Player'),
            joined_at: Number(presence.joinedAt) || Date.now(),
            avatar_color: presence.avatarColor || '#8bd5ff',
          });
        }
      }
      members.sort((a, b) => a.joined_at - b.joined_at || a.session_id.localeCompare(b.session_id));
      this.members = members;
      dispatch('obby:members', this.snapshot());
      this.maybeClaimHost().catch(console.error);
    }

    handleBroadcast(event, payload) {
      if (!payload || typeof payload !== 'object') return;
      if (event === 'player_state') {
        const last = this.lastSeqBySession.get(payload.sessionId) ?? -1;
        if (!Number.isInteger(payload.seq) || payload.seq <= last) return;
        this.lastSeqBySession.set(payload.sessionId, payload.seq);
      }
      if (event === 'map_change') {
        const reconciled = reconcileMapMessage(this.room, payload);
        this.room = reconciled.room;
        if (reconciled.mapChange) dispatch('obby:map-change', reconciled.mapChange);
        return;
      }
      if (event === 'host_claim' && payload.hostSessionId) {
        if (this.room) this.room.host_session_id = payload.hostSessionId;
        dispatch('obby:members', this.snapshot());
      }
      dispatch(`obby:${event.replaceAll('_', '-')}`, payload);
    }

    async broadcast(event, payload) {
      if (!this.channel || !this.online) return 'offline';
      try {
        return await this.channel.send({ type: 'broadcast', event, payload });
      } catch (error) {
        console.warn('broadcast failed', error);
        return 'error';
      }
    }

    async setMap(mapId) {
      if (!this.room || !this.isHost) throw new Error('방장만 맵을 선택할 수 있습니다.');
      const transitionId = crypto.randomUUID();
      const startAt = new Date(Date.now() + 250).toISOString();
      const data = await this.call('set_map', this.authPayload({ mapId, transitionId, startAt }));
      this.room = data.room;
      const message = {
        mapId,
        hostSessionId: this.sessionId,
        transitionId,
        startAt: Date.parse(startAt),
      };
      dispatch('obby:map-change', message);
      await this.broadcast('map_change', message);
      return message;
    }

    async heartbeat() {
      if (!this.room || !this.memberToken) return;
      try {
        const data = await this.call('heartbeat', this.authPayload());
        const reconciled = reconcileServerRoom(this.room, data.room || this.room);
        this.room = reconciled.room;
        this.members = data.members || this.members;
        dispatch('obby:members', this.snapshot());
        if (reconciled.hostChanged) dispatch('obby:host-changed', this.snapshot());
        if (reconciled.mapChange) dispatch('obby:map-change', reconciled.mapChange);
      } catch (error) {
        console.warn('heartbeat failed', error);
      }
    }

    startHeartbeat() {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => this.heartbeat(), config.heartbeatMs);
    }

    authPayload(extra = {}) {
      return {
        roomId: this.room?.id,
        sessionId: this.sessionId,
        memberToken: this.memberToken,
        ...extra,
      };
    }

    async maybeClaimHost() {
      if (!this.room || this.isHost || this.members.length === 0) return;
      const hostStillPresent = this.members.some(member => member.session_id === this.room.host_session_id);
      if (hostStillPresent) return;
      const elected = [...this.members].sort((a, b) => a.joined_at - b.joined_at || a.session_id.localeCompare(b.session_id))[0];
      if (elected?.session_id !== this.sessionId) return;
      try {
        const data = await this.call('claim_host', this.authPayload());
        this.room = data.room;
        await this.broadcast('host_claim', { hostSessionId: this.sessionId, at: Date.now() });
        dispatch('obby:host-changed', this.snapshot());
      } catch (error) {
        console.warn('host claim lost', error);
        await this.heartbeat();
      }
    }

    scheduleReconnect() {
      if (!this.room || this.reconnectTimer) return;
      if (!this.reconnectStartedAt) this.reconnectStartedAt = Date.now();
      const elapsed = Date.now() - this.reconnectStartedAt;
      if (elapsed >= 30000) dispatch('obby:offline-solo', { roomCode: this.room.code });
      const delay = [1000, 2000, 4000, 10000][Math.min(this.reconnectAttempt, 3)];
      this.reconnectAttempt += 1;
      this.reconnectTimer = setTimeout(async () => {
        this.reconnectTimer = null;
        try {
          await this.connectChannel();
          await this.heartbeat();
          dispatch('obby:reconnected', this.snapshot());
          this.broadcast('snapshot_request', { sessionId: this.sessionId });
        } catch (error) {
          console.warn('reconnect failed', error);
          this.scheduleReconnect();
        }
      }, delay);
    }

    async leave({ silent = false } = {}) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      const previousRoom = this.room;
      const previousToken = this.memberToken;
      const previousChannel = this.channel;
      this.channel = null;

      if (previousRoom && previousToken) {
        this.call('leave', {
          roomId: previousRoom.id,
          sessionId: this.sessionId,
          memberToken: previousToken,
        }, 12000).catch(error => {
          if (!silent) console.warn('leave failed', error);
        });
      }

      if (previousChannel) {
        this.supabase.removeChannel(previousChannel).catch(error => console.warn('channel cleanup failed', error));
      }

      this.room = null;
      this.members = [];
      this.memberToken = null;
      this.online = false;
      this.lastSeqBySession.clear();
      if (!silent) dispatch('obby:left', {});
    }
  }

  window.TripleObbyOnline = window.TripleObbyOnline || {};
  window.TripleObbyOnline.roomClient = new RoomClient();
})();
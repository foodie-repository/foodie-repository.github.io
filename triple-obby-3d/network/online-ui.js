(() => {
  const client = window.TripleObbyOnline?.roomClient;
  if (!client) throw new Error('RoomClient is missing');

  const $ = id => document.getElementById(id);
  const nicknameInput = $('nicknameInput');
  const roomCodeInput = $('roomCodeInput');
  const soloBtn = $('soloBtn');
  const createRoomBtn = $('createRoomBtn');
  const joinRoomBtn = $('joinRoomBtn');
  const onlineStatus = $('onlineStatus');
  const roomInfo = $('roomInfo');
  const roomCodeBadge = $('roomCodeBadge');
  const memberCount = $('memberCount');
  const memberList = $('memberList');
  const copyInviteBtn = $('copyInviteBtn');
  const showQrBtn = $('showQrBtn');
  const inviteQrWrap = $('inviteQrWrap');
  const inviteQrCanvas = $('inviteQrCanvas');
  const inviteUrlText = $('inviteUrlText');
  const closeQrBtn = $('closeQrBtn');
  const leaveRoomBtn = $('leaveRoomBtn');
  const gameOnlineBar = $('gameOnlineBar');
  const gameOnlineText = $('gameOnlineText');
  const onlineDot = $('onlineDot');
  const portalButtons = [...document.querySelectorAll('.portalBtn')];

  const uiState = {
    mode: 'entry', // entry | solo | online
    joining: false,
  };

  const savedNickname = sessionStorage.getItem('tripleObby.nickname') || '';
  nicknameInput.value = savedNickname;
  const roomFromUrl = new URL(location.href).searchParams.get('room');
  if (roomFromUrl) roomCodeInput.value = roomFromUrl.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  function setStatus(text, kind = 'normal') {
    onlineStatus.textContent = text;
    onlineStatus.dataset.kind = kind;
  }

  function getNickname() {
    const value = nicknameInput.value.trim();
    if (value.length < 2 || value.length > 12 || /[<>]/.test(value)) {
      throw new Error('닉네임은 2~12자로 입력해 주세요.');
    }
    sessionStorage.setItem('tripleObby.nickname', value);
    return value;
  }

  function normalizeRoomCode(value) {
    const code = String(value || '').replace(/\s+/g, '').toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw new Error('방 코드는 영문/숫자 6자리입니다.');
    return code;
  }

  function setBusy(busy) {
    uiState.joining = busy;
    for (const el of [soloBtn, createRoomBtn, joinRoomBtn, nicknameInput, roomCodeInput]) el.disabled = busy;
  }

  function renderMembers(snapshot) {
    const members = snapshot?.members || [];
    memberCount.textContent = `${members.length} / ${window.TRIPLE_OBBY_CONFIG.maxPlayers}`;
    memberList.replaceChildren();
    for (const member of members) {
      const li = document.createElement('li');
      const name = member.nickname || member.nickname_text || 'Player';
      li.textContent = `${member.session_id === snapshot.room?.host_session_id ? '👑 ' : ''}${name}`;
      memberList.appendChild(li);
    }
    updatePortalLocks(snapshot);
  }

  function updatePortalLocks(snapshot = client.snapshot()) {
    const locked = uiState.mode === 'online' && !snapshot.isHost;
    for (const button of portalButtons) {
      button.dataset.locked = locked ? 'true' : 'false';
      button.setAttribute('aria-disabled', locked ? 'true' : 'false');
    }
  }

  async function enterOnline(snapshot) {
    uiState.mode = 'online';
    roomInfo.dataset.visible = 'true';
    roomCodeBadge.textContent = snapshot.room.code;
    setStatus(snapshot.isHost ? '온라인 · 방장' : '온라인 · 참가자');
    renderMembers(snapshot);
    gameOnlineBar.dataset.visible = 'true';
    gameOnlineText.textContent = `${snapshot.room.code} · ${snapshot.members.length}/${window.TRIPLE_OBBY_CONFIG.maxPlayers}`;
    onlineDot.classList.remove('offline');
    const inviteUrl = window.TripleObbyOnline.createInviteUrl(snapshot.room.code);
    inviteUrlText.textContent = inviteUrl;
    await window.TripleObbyOnline.renderInviteQr(inviteQrCanvas, inviteUrl);
  }

  async function createRoom() {
    setBusy(true);
    try {
      const snapshot = await client.createRoom(getNickname());
      await enterOnline(snapshot);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    setBusy(true);
    try {
      const snapshot = await client.joinRoom(normalizeRoomCode(roomCodeInput.value), getNickname());
      await enterOnline(snapshot);
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function enterSolo() {
    await client.leave({ silent: true });
    uiState.mode = 'solo';
    roomInfo.dataset.visible = 'false';
    gameOnlineBar.dataset.visible = 'false';
    setStatus('혼자 하기 · 온라인 동기화 없음');
    updatePortalLocks({ isHost: true });
    window.dispatchEvent(new CustomEvent('obby:solo-mode'));
  }

  createRoomBtn.addEventListener('click', createRoom);
  joinRoomBtn.addEventListener('click', joinRoom);
  soloBtn.addEventListener('click', enterSolo);
  roomCodeInput.addEventListener('input', () => {
    roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  });
  roomCodeInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') joinRoom();
  });

  portalButtons.forEach(button => {
    button.addEventListener('click', async event => {
      if (uiState.mode !== 'online') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!client.isHost) {
        setStatus('방장이 맵을 선택할 때까지 기다려 주세요.');
        return;
      }
      try {
        await client.setMap(button.dataset.map);
      } catch (error) {
        setStatus(error.message, 'error');
      }
    }, true);
  });

  copyInviteBtn.addEventListener('click', async () => {
    if (!client.roomCode) return;
    const url = window.TripleObbyOnline.createInviteUrl(client.roomCode);
    try {
      await navigator.clipboard.writeText(url);
      setStatus('초대 링크를 복사했습니다.');
    } catch {
      setStatus(url);
    }
  });
  showQrBtn.addEventListener('click', () => { inviteQrWrap.dataset.visible = 'true'; });
  closeQrBtn.addEventListener('click', () => { inviteQrWrap.dataset.visible = 'false'; });
  inviteQrWrap.addEventListener('click', event => {
    if (event.target === inviteQrWrap) inviteQrWrap.dataset.visible = 'false';
  });
  leaveRoomBtn.addEventListener('click', async () => {
    await client.leave();
    uiState.mode = 'entry';
    roomInfo.dataset.visible = 'false';
    gameOnlineBar.dataset.visible = 'false';
    setStatus('방에서 나왔습니다.');
    updatePortalLocks({ isHost: true });
    window.dispatchEvent(new CustomEvent('obby:request-lobby'));
  });

  window.addEventListener('obby:room-joined', event => enterOnline(event.detail));
  window.addEventListener('obby:members', event => {
    if (uiState.mode !== 'online') return;
    renderMembers(event.detail);
    gameOnlineText.textContent = `${event.detail.room?.code || ''} · ${event.detail.members.length}/${window.TRIPLE_OBBY_CONFIG.maxPlayers}`;
    setStatus(event.detail.isHost ? '온라인 · 방장' : '온라인 · 참가자');
  });
  window.addEventListener('obby:host-changed', event => {
    renderMembers(event.detail);
    setStatus('새 방장이 지정됐습니다.');
  });
  window.addEventListener('obby:connection', event => {
    if (event.detail.status === 'online') {
      onlineDot.classList.remove('offline');
      if (uiState.mode === 'online') setStatus(client.isHost ? '온라인 · 방장' : '온라인 · 참가자');
    } else {
      onlineDot.classList.add('offline');
      setStatus('재연결 중…');
    }
  });
  window.addEventListener('obby:offline-solo', () => {
    onlineDot.classList.add('offline');
    setStatus('연결이 끊겨 솔로 모드로 계속 플레이합니다.');
    gameOnlineText.textContent = '오프라인 솔로';
  });
  window.addEventListener('obby:reconnected', event => {
    onlineDot.classList.remove('offline');
    enterOnline(event.detail);
    setStatus('온라인 방에 다시 연결됐습니다.');
  });

  window.TripleObbyOnline.uiState = uiState;
  setStatus(roomFromUrl ? '초대 링크를 열었습니다. 닉네임 입력 후 참가하세요.' : '혼자 하거나 온라인 방을 만들어 보세요.');
})();

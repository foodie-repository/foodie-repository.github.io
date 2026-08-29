import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const VALID_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const VALID_NICKNAME = /^[^<>]{2,12}$/u;
const VALID_MAPS = new Set(['lobby', 'color', 'lava', 'sky']);

function reply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
function ok(data: unknown) { return reply(200, { ok: true, data }); }
function fail(status: number, code: string, message: string) { return reply(status, { ok: false, error: { code, message } }); }
function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, b => CODE_CHARS[b % CODE_CHARS.length]).join('');
}
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function normalizeCode(value: unknown) {
  const code = String(value ?? '').replace(/\s+/g, '').toUpperCase();
  return VALID_CODE.test(code) ? code : null;
}
async function getRoomByCode(code: string) {
  const { data, error } = await admin.from('obby_rooms').select('*').eq('code', code).eq('status', 'open').gt('expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw error;
  return data;
}
async function getRoom(roomId: string) {
  const { data, error } = await admin.from('obby_rooms').select('*').eq('id', roomId).maybeSingle();
  if (error) throw error;
  return data;
}
async function listActiveMembers(roomId: string) {
  const cutoff = new Date(Date.now() - 45_000).toISOString();
  const { data, error } = await admin.from('obby_room_members').select('session_id,nickname,joined_at,last_seen_at').eq('room_id', roomId).gte('last_seen_at', cutoff).order('joined_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
async function authorizeMember(roomId: string, sessionId: string, memberToken: string) {
  const tokenHash = await sha256(memberToken);
  const { data, error } = await admin.from('obby_room_members').select('room_id,session_id,nickname,joined_at,last_seen_at').eq('room_id', roomId).eq('session_id', sessionId).eq('member_token_hash', tokenHash).maybeSingle();
  if (error) throw error;
  return data;
}
async function cleanup(roomId: string) {
  const { error } = await admin.rpc('obby_cleanup_room_members', { p_room_id: roomId });
  if (error) throw error;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'POST 요청만 지원합니다.');
  try {
    const body = await req.json();
    const action = String(body?.action ?? '');
    if (action === 'create') {
      const nickname = String(body.nickname ?? '').trim();
      const sessionId = String(body.sessionId ?? '');
      const version = String(body.version ?? '').trim();
      if (!VALID_NICKNAME.test(nickname)) return fail(400, 'INVALID_NICKNAME', '닉네임은 2~12자로 입력해 주세요.');
      if (!isUuid(sessionId)) return fail(400, 'INVALID_SESSION', '세션 정보가 올바르지 않습니다.');
      if (!version || version.length > 40) return fail(400, 'INVALID_VERSION', '게임 버전이 올바르지 않습니다.');
      let room: any = null;
      for (let attempt = 0; attempt < 12 && !room; attempt += 1) {
        const { data, error } = await admin.from('obby_rooms').insert({ code: randomCode(), host_session_id: sessionId, version, max_players: 8, expires_at: new Date(Date.now() + 21_600_000).toISOString() }).select('*').single();
        if (!error) room = data;
        else if (error.code !== '23505') throw error;
      }
      if (!room) return fail(503, 'ROOM_CODE_EXHAUSTED', '방 코드를 만들지 못했습니다. 다시 시도해 주세요.');
      const memberToken = randomToken();
      const { error: memberError } = await admin.from('obby_room_members').insert({ room_id: room.id, session_id: sessionId, nickname, member_token_hash: await sha256(memberToken) });
      if (memberError) throw memberError;
      return ok({ room, memberToken, members: await listActiveMembers(room.id), isHost: true });
    }
    if (action === 'join') {
      const code = normalizeCode(body.code);
      const nickname = String(body.nickname ?? '').trim();
      const sessionId = String(body.sessionId ?? '');
      const version = String(body.version ?? '').trim();
      if (!code) return fail(400, 'INVALID_CODE', '6자리 방 코드를 확인해 주세요.');
      if (!VALID_NICKNAME.test(nickname)) return fail(400, 'INVALID_NICKNAME', '닉네임은 2~12자로 입력해 주세요.');
      if (!isUuid(sessionId)) return fail(400, 'INVALID_SESSION', '세션 정보가 올바르지 않습니다.');
      const room = await getRoomByCode(code);
      if (!room) return fail(404, 'ROOM_NOT_FOUND', '방 코드를 다시 확인해 주세요.');
      if (room.version !== version) return fail(409, 'VERSION_MISMATCH', '게임 버전이 다릅니다. 페이지를 새로고침해 주세요.');
      await cleanup(room.id);
      const members = await listActiveMembers(room.id);
      if (!members.some((m: any) => m.session_id === sessionId) && members.length >= room.max_players) return fail(409, 'ROOM_FULL', '이 방은 8명으로 가득 찼습니다.');
      const memberToken = randomToken();
      const { error } = await admin.from('obby_room_members').upsert({ room_id: room.id, session_id: sessionId, nickname, member_token_hash: await sha256(memberToken), last_seen_at: new Date().toISOString() }, { onConflict: 'room_id,session_id' });
      if (error) throw error;
      const freshRoom = await getRoom(room.id);
      return ok({ room: freshRoom, memberToken, members: await listActiveMembers(room.id), isHost: freshRoom?.host_session_id === sessionId });
    }
    const roomId = String(body.roomId ?? '');
    const sessionId = String(body.sessionId ?? '');
    const memberToken = String(body.memberToken ?? '');
    if (!isUuid(roomId) || !isUuid(sessionId) || memberToken.length < 32) return fail(401, 'MEMBERSHIP_REQUIRED', '방 참가 정보가 올바르지 않습니다.');
    if (!await authorizeMember(roomId, sessionId, memberToken)) return fail(401, 'MEMBERSHIP_INVALID', '방 참가 인증이 만료되었습니다.');
    if (action === 'heartbeat') {
      const { error } = await admin.from('obby_room_members').update({ last_seen_at: new Date().toISOString() }).eq('room_id', roomId).eq('session_id', sessionId);
      if (error) throw error;
      await cleanup(roomId);
      return ok({ room: await getRoom(roomId), members: await listActiveMembers(roomId) });
    }
    if (action === 'set_map') {
      const mapId = String(body.mapId ?? '');
      const transitionId = String(body.transitionId ?? '');
      const startAt = String(body.startAt ?? '');
      if (!VALID_MAPS.has(mapId) || !isUuid(transitionId) || !Number.isFinite(Date.parse(startAt))) return fail(400, 'INVALID_MAP_CHANGE', '맵 변경 정보가 올바르지 않습니다.');
      const { data, error } = await admin.from('obby_rooms').update({ current_map_id: mapId, map_transition_id: transitionId, map_start_at: startAt }).eq('id', roomId).eq('host_session_id', sessionId).select('*').maybeSingle();
      if (error) throw error;
      if (!data) return fail(403, 'HOST_REQUIRED', '방장만 맵을 변경할 수 있습니다.');
      return ok({ room: data });
    }
    if (action === 'claim_host') {
      await cleanup(roomId);
      const { data: elected, error: electedError } = await admin.rpc('obby_elected_host', { p_room_id: roomId });
      if (electedError) throw electedError;
      if (elected !== sessionId) return fail(409, 'HOST_CLAIM_REJECTED', '다른 플레이어가 새 방장입니다.');
      const room = await getRoom(roomId);
      const { data, error } = await admin.from('obby_rooms').update({ host_session_id: sessionId }).eq('id', roomId).eq('host_session_id', room?.host_session_id).select('*').maybeSingle();
      if (error) throw error;
      if (!data) return fail(409, 'HOST_CLAIM_RACE', '방장 변경이 이미 처리되었습니다.');
      return ok({ room: data });
    }
    if (action === 'leave') {
      const roomBefore = await getRoom(roomId);
      const { error } = await admin.from('obby_room_members').delete().eq('room_id', roomId).eq('session_id', sessionId);
      if (error) throw error;
      await cleanup(roomId);
      const members = await listActiveMembers(roomId);
      let room = await getRoom(roomId);
      if (roomBefore?.host_session_id === sessionId && members.length > 0) {
        const { data } = await admin.from('obby_rooms').update({ host_session_id: members[0].session_id }).eq('id', roomId).select('*').single();
        room = data;
      }
      return ok({ room, members });
    }
    return fail(400, 'UNKNOWN_ACTION', '지원하지 않는 요청입니다.');
  } catch (error) {
    console.error(error);
    return fail(500, 'SERVER_ERROR', '온라인 방 처리 중 오류가 발생했습니다.');
  }
});

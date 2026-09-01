import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../', import.meta.url);

test('player-state broadcast rate leaves headroom for an eight-player room', async () => {
  const bridge = await readFile(new URL('online-game-bridge.part', base), 'utf8');
  const client = await readFile(new URL('network/room-client.js', base), 'utf8');
  const intervalMatch = bridge.match(/setInterval\(\(\) => \{[\s\S]*?\},\s*(\d+)\s*\);/);
  assert.ok(intervalMatch, 'player-state interval must be explicit');
  // Broadcast fan-out counts sender + recipients. At eight players, roughly 1Hz
  // keeps player movement below the Free-plan message-rate ceiling with control headroom.
  assert.ok(Number(intervalMatch[1]) >= 900, 'eight-player rooms require roughly 1Hz player-state updates');
  const eventsMatch = client.match(/eventsPerSecond:\s*(\d+)/);
  assert.ok(eventsMatch, 'Realtime client eventsPerSecond must be explicit');
  assert.ok(Number(eventsMatch[1]) <= 10, 'Realtime client must keep control-message headroom');
});

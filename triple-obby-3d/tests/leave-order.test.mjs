import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../network/room-client.js', import.meta.url), 'utf8');

test('room leave reaches the server before waiting for realtime channel cleanup', () => {
  const leaveStart = source.indexOf('async leave({ silent = false } = {})');
  assert.notEqual(leaveStart, -1);
  const leaveSource = source.slice(leaveStart);
  const serverLeave = leaveSource.indexOf("await this.call('leave'");
  const channelCleanupMatch = leaveSource.match(/removeChannel\((?:this\.channel|previousChannel)\)/);
  assert.ok(serverLeave >= 0, 'leave must call the server');
  assert.ok(channelCleanupMatch, 'leave must clean up the realtime channel');
  const channelCleanup = channelCleanupMatch.index;
  assert.ok(serverLeave < channelCleanup, 'server leave must happen before realtime cleanup');
});

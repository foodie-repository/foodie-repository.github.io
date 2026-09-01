import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../network/room-client.js', import.meta.url), 'utf8');

test('room leave starts the server request before realtime cleanup without blocking on it', () => {
  const leaveStart = source.indexOf('async leave({ silent = false } = {})');
  assert.notEqual(leaveStart, -1);
  const leaveSource = source.slice(leaveStart);
  const serverLeave = leaveSource.indexOf("this.call('leave'");
  const channelCleanupMatch = leaveSource.match(/removeChannel\((?:this\.channel|previousChannel)\)/);
  assert.ok(serverLeave >= 0, 'leave must start the server request');
  assert.ok(channelCleanupMatch, 'leave must clean up the realtime channel');
  const channelCleanup = channelCleanupMatch.index;
  assert.ok(serverLeave < channelCleanup, 'server leave request must start before realtime cleanup');
  const prefix = leaveSource.slice(Math.max(0, serverLeave - 12), serverLeave);
  assert.equal(prefix.includes('await'), false, 'leave must not block the UI waiting for the server response');
});

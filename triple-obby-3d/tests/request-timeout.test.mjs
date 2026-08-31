import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../network/room-client.js', import.meta.url), 'utf8');

test('room-control requests are bounded by a client timeout', () => {
  assert.match(source, /async call\(action, payload = \{\}, timeoutMs = 15000\)/, 'call() must accept an explicit timeout');
  assert.match(source, /signal:\s*makeTimeoutSignal\(timeoutMs\)/, 'fetch must use a timeout signal');
});

test('leaving a room uses a bounded request and cannot hang the UI forever', () => {
  const leaveStart = source.indexOf('async leave({ silent = false } = {})');
  assert.notEqual(leaveStart, -1);
  const leaveSource = source.slice(leaveStart);
  assert.match(leaveSource, /this\.call\('leave',[\s\S]*?,\s*12000\)/, 'leave must use a 12 second request timeout');
});

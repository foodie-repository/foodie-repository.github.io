import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('official map moves o2 into reachable position', () => {
  assert.match(html, /\{id:'o2',x:5590,y:294,r:19,power:-920\}/);
});

test('final wave-to-cube portal no longer overlaps b19', () => {
  assert.match(html, /\{id:'portal-cube-3', x:21900, y:112, w:22, h:286, type:'cube'\}/);
  const block = { x: 21740, w: 110 };
  const portalX = 21900;
  assert.ok(portalX > block.x + block.w);
});

test('official replay is versioned 120 Hz input-only data', () => {
  const match = html.match(/\/\/ OFFICIAL_REPLAY_START\s*([\s\S]*?)\s*\/\/ OFFICIAL_REPLAY_END/);
  assert.ok(match, 'official replay block must exist');
  const context = {};
  vm.createContext(context);
  vm.runInContext(match[1], context);
  const replay = context.OFFICIAL_REPLAY;
  assert.equal(replay.version, 1);
  assert.equal(replay.physicsHz, 120);
  assert.ok(typeof replay.fingerprint === 'string' && replay.fingerprint.length > 0);
  assert.ok(Array.isArray(replay.events) && replay.events.length > 0);
  for (const event of replay.events) {
    assert.deepEqual(Object.keys(event).sort(), ['action','tick']);
    assert.ok(Number.isInteger(event.tick) && event.tick >= 0);
    assert.ok(event.action === 'press' || event.action === 'release');
  }
});

test('official replay carries deterministic verification metadata', () => {
  assert.match(html, /OFFICIAL_REPLAY_VERIFIED_TICKS\s*=\s*\d+/);
  assert.match(html, /OFFICIAL_REPLAY_VERIFIED_FINGERPRINT\s*=/);
});

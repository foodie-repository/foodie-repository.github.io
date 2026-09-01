import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('Supabase browser client uses the documented CDN entrypoint', () => {
  assert.match(index, /https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2(?:["'])/);
  assert.doesNotMatch(index, /supabase\.min\.js/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('official level-select screen exists', () => {
  assert.match(html, /id="screen-official-levels"/);
  assert.match(html, /id="officialLevelList"/);
});

test('main game-start button opens official level select', () => {
  assert.match(html, /playOfficialBtn\.addEventListener\('click',\s*\(\)\s*=>\s*setScreen\('official-levels'\)\)/);
});

test('renderer creates one card per official registry entry in registry order', () => {
  assert.match(html, /function renderOfficialLevelSelect\(\)/);
  assert.match(html, /for\s*\(const level of OFFICIAL_LEVELS\)/);
  assert.match(html, /officialLevelList\.replaceChildren/);
});

test('official cards contain name difficulty description BEST and play control', () => {
  assert.match(html, /difficultyLabel/);
  assert.match(html, /level\.description/);
  assert.match(html, /getOfficialBest\(level\.id\)/);
  assert.match(html, /CLEAR ✓/);
  assert.match(html, /startOfficialLevel\(level\.id\)/);
});

test('official-level screen refreshes when activated', () => {
  assert.match(html, /if \(name === 'official-levels'\) renderOfficialLevelSelect\(\)/);
});

test('startOfficialLevel rejects unknown IDs and starts the selected runtime', () => {
  assert.match(html, /function startOfficialLevel\(levelId\)/);
  assert.match(html, /if\s*\(!level\)\s*return false/);
  assert.match(html, /createOfficialRuntimeById\(levelId\)/);
  assert.match(html, /officialLevelId:level\.id/);
});

test('play header shows selected official difficulty stars', () => {
  assert.match(html, /'★'\.repeat\(officialLevel\.difficulty\)/);
});

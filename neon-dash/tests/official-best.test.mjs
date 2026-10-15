import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const match = html.match(/\/\/ OFFICIAL_BEST_CORE_START([\s\S]*?)\/\/ OFFICIAL_BEST_CORE_END/);
assert.ok(match, 'official BEST core block must exist');

function makeContext(initial = {}) {
  const map = new Map(Object.entries(initial));
  const storage = {
    getItem(k){ return map.has(k) ? map.get(k) : null; },
    setItem(k,v){ map.set(k,String(v)); },
    removeItem(k){ map.delete(k); },
  };
  const ctx = {
    storage,
    OFFICIAL_LEVEL_IDS:['neon-start','pulse-factory','sky-circuit','wave-storm','final-eclipse'],
  };
  vm.createContext(ctx);
  vm.runInContext(match[1], ctx);
  return {ctx,map};
}

test('official BEST keys are isolated by level', () => {
  const {ctx} = makeContext();
  const keys = ctx.OFFICIAL_LEVEL_IDS.map(id => ctx.officialBestKey(id));
  assert.equal(new Set(keys).size, 5);
  assert.equal(keys[0], 'neonDash.officialBest.neon-start');
  assert.equal(ctx.officialBestKey('missing'), null);
});

test('setOfficialBest clamps to 0..100 and never lowers a score', () => {
  const {ctx} = makeContext();
  ctx.setOfficialBest('sky-circuit', 48.7);
  assert.equal(ctx.getOfficialBest('sky-circuit'), 48.7);
  ctx.setOfficialBest('sky-circuit', 10);
  assert.equal(ctx.getOfficialBest('sky-circuit'), 48.7);
  ctx.setOfficialBest('sky-circuit', 150);
  assert.equal(ctx.getOfficialBest('sky-circuit'), 100);
});

test('legacy BEST migrates once to Neon Start only when new key is absent', () => {
  const {ctx} = makeContext({neonDashBest:'73.4'});
  ctx.migrateLegacyOfficialBest();
  assert.equal(ctx.getOfficialBest('neon-start'), 73.4);
  assert.equal(ctx.getOfficialBest('pulse-factory'), 0);
  ctx.migrateLegacyOfficialBest();
  assert.equal(ctx.getOfficialBest('neon-start'), 73.4);
});

test('migration never overwrites an existing newer Neon Start score', () => {
  const {ctx} = makeContext({
    neonDashBest:'91.2',
    'neonDash.officialBest.neon-start':'96.5',
  });
  ctx.migrateLegacyOfficialBest();
  assert.equal(ctx.getOfficialBest('neon-start'), 96.5);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('function createNeonStartRuntime()');
const end = html.indexOf('function officialRuntimeFingerprint', start);
assert.ok(start >= 0 && end > start, 'official runtime constructor block must exist');

const context = {
  OFFICIAL_H:540,
  OFFICIAL_GROUND_Y:430,
  OFFICIAL_FLIGHT_TOP:58,
  OFFICIAL_FLIGHT_BOTTOM:430,
};
vm.createContext(context);
vm.runInContext(html.slice(start,end), context);

const constructors = [
  ['neon-start','Neon Start',context.createNeonStartRuntime],
  ['pulse-factory','Pulse Factory',context.createPulseFactoryRuntime],
  ['sky-circuit','Sky Circuit',context.createSkyCircuitRuntime],
  ['wave-storm','Wave Storm',context.createWaveStormRuntime],
  ['final-eclipse','Final Eclipse',context.createFinalEclipseRuntime],
];

function finiteGeom(o){
  for (const k of ['x','y','w','h']) if (k in o) assert.ok(Number.isFinite(o[k]), `${o.id||'?'} ${k}`);
}

test('all five official runtimes satisfy the shared runtime contract', () => {
  for (const [id,name,fn] of constructors) {
    const r = fn();
    assert.equal(r.id,id);
    assert.equal(r.name,name);
    assert.ok(r.startX < r.levelEnd);
    for (const key of ['floors','blocks','spikes','pads','orbs','portals','flightObstacles']) {
      assert.ok(Array.isArray(r[key]), `${id} ${key}`);
      for (const o of r[key]) finiteGeom(o);
    }
    for (const p of r.portals) assert.ok(p.x > r.startX && p.x < r.levelEnd);
  }
});

test('new maps have the approved mechanic complexity', () => {
  const pulse=context.createPulseFactoryRuntime();
  assert.ok(pulse.blocks.length>=6 && pulse.spikes.length>=10 && pulse.pads.length>=2 && pulse.orbs.length>=3);
  assert.ok(pulse.portals.some(p=>p.type==='ship') && pulse.portals.some(p=>p.type==='cube'));

  const sky=context.createSkyCircuitRuntime();
  assert.ok(sky.flightObstacles.length>=6);
  assert.ok(sky.portals.filter(p=>p.type==='ship').length>=2);
  assert.ok(sky.portals.some(p=>p.type==='wave'));

  const wave=context.createWaveStormRuntime();
  assert.ok(wave.flightObstacles.length>=8);
  assert.ok(wave.portals.filter(p=>p.type==='wave').length>=2);
  assert.ok(wave.portals.some(p=>p.type==='ship'));

  const final=context.createFinalEclipseRuntime();
  assert.ok(final.blocks.length>=8 && final.spikes.length>=14 && final.pads.length>=2 && final.orbs.length>=4);
  assert.ok(final.portals.filter(p=>p.type==='ship').length>=2);
  assert.ok(final.portals.filter(p=>p.type==='wave').length>=2);
});

test('cube portals never spawn inside a solid block', () => {
  for (const [, , fn] of constructors) {
    const r=fn();
    for (const p of r.portals.filter(p=>p.type==='cube')) {
      const player={x:p.x,y:390,w:40,h:40};
      for (const b of r.blocks) {
        const overlap=player.x < b.x+b.w && player.x+player.w > b.x && player.y < b.y+b.h && player.y+player.h > b.y;
        assert.equal(overlap,false,`${r.id}: cube portal ${p.id} overlaps ${b.id}`);
      }
    }
  }
});

test('flight/wave obstacles leave a legal corridor', () => {
  const minClearance=72;
  for (const [, , fn] of constructors) {
    const r=fn();
    for (const o of r.flightObstacles) {
      const topAttached=Math.abs(o.y-58)<0.001;
      const bottomAttached=Math.abs((o.y+o.h)-430)<0.001;
      assert.ok(topAttached || bottomAttached, `${r.id}: ${o.id} must attach to top or bottom`);
      const clearance=topAttached ? 430-(o.y+o.h) : o.y-58;
      assert.ok(clearance>=minClearance, `${r.id}: ${o.id} clearance ${clearance}`);
    }
  }
});

test('official floors do not create impossible wide cube gaps in new maps', () => {
  for (const [, , fn] of constructors.slice(1)) {
    const r=fn();
    const floors=[...r.floors].sort((a,b)=>a.x-b.x);
    for(let i=1;i<floors.length;i++){
      const gap=floors[i].x-(floors[i-1].x+floors[i-1].w);
      assert.ok(gap<=220,`${r.id}: gap ${gap} too wide`);
    }
  }
});

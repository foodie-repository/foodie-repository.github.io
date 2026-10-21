import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('function createNeonStartRuntime()');
const end=html.indexOf('function officialRuntimeFingerprint',start);
assert.ok(start>=0&&end>start);

const context={OFFICIAL_H:540,OFFICIAL_GROUND_Y:430,OFFICIAL_FLIGHT_TOP:58,OFFICIAL_FLIGHT_BOTTOM:430};
vm.createContext(context);
vm.runInContext(html.slice(start,end),context);

const maps=[
  ['pulse-factory','gear',context.createPulseFactoryRuntime,50,54,14],
  ['sky-circuit','electric',context.createSkyCircuitRuntime,30,44,42],
  ['wave-storm','lightning',context.createWaveStormRuntime,24,44,66],
  ['final-eclipse','eclipse',context.createFinalEclipseRuntime,36,56,60],
];

test('stages 2-5 have substantially denser hazards',()=>{
  for(const [id,,make,minBlocks,minSpikes,minFlight] of maps){
    const r=make();
    assert.equal(r.id,id);
    assert.ok(r.blocks.length>=minBlocks,`${id} blocks ${r.blocks.length}`);
    assert.ok(r.spikes.length>=minSpikes,`${id} spikes ${r.spikes.length}`);
    assert.ok(r.flightObstacles.length>=minFlight,`${id} flight ${r.flightObstacles.length}`);
  }
});

test('each harder stage exposes its distinctive block theme',()=>{
  for(const [id,theme,make] of maps){
    const r=make();
    assert.equal(r.blockTheme,theme,`${id} theme`);
  }
});

test('renderer contains distinct visual motifs for all four themes',()=>{
  for(const token of ['gear','electric','lightning','eclipse']){
    assert.match(html,new RegExp("blockTheme==='"+token+"'"));
  }
});
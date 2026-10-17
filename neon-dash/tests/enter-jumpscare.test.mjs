import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

test('jumpscare overlay exists and is hidden by default',()=>{
  assert.match(html,/id="ghostJumpscare"/);
  assert.match(html,/class="ghost-jumpscare hidden"/);
});

test('Enter triggers jumpscare only during play',()=>{
  assert.match(html,/function showGhostJumpscare\(\)/);
  assert.match(html,/if\(currentScreen!=='play'\)return;/);
  assert.match(html,/e\.key==='Enter'/);
});

test('typing in form controls does not trigger jumpscare',()=>{
  assert.match(html,/INPUT\|TEXTAREA\|SELECT/);
});

test('jumpscare pauses game simulation while visible',()=>{
  assert.match(html,/let ghostJumpscareActive=false/);
  assert.match(html,/if\(currentScreen==='play'&&!ghostJumpscareActive\)/);
});

test('jumpscare requests fullscreen and restores prior fullscreen state',()=>{
  assert.match(html,/requestFullscreen\?\.\(\)/);
  assert.match(html,/const wasFullscreen=!!document\.fullscreenElement/);
  assert.match(html,/if\(!wasFullscreen&&document\.fullscreenElement\)document\.exitFullscreen\?\.\(\)/);
});

test('jumpscare auto-hides after 1500ms and resumes play',()=>{
  assert.match(html,/ghostJumpscareActive=true/);
  assert.match(html,/ghostJumpscareActive=false/);
  assert.match(html,/setTimeout\(\(\)=>\{[\s\S]{0,420}\},1500\);/);
});

test('jumpscare visual fills the viewport',()=>{
  assert.match(html,/\.ghost-jumpscare img\{[^}]*width:100vw[^}]*height:100vh[^}]*object-fit:cover/);
});

test('jumpscare uses embedded uploaded JPEG with no remote dependency',()=>{
  assert.match(html,/id="ghostJumpscare"[\s\S]{0,260}<img[^>]+src="data:image\/jpeg;base64,/);
  assert.doesNotMatch(html,/ghost\.png/);
});


test('jumpscare element is parsed before the main script',()=>{
  const overlayPos=html.indexOf('id="ghostJumpscare"');
  const scriptPos=html.indexOf('<script');
  assert.ok(overlayPos>=0);
  assert.ok(scriptPos>=0);
  assert.ok(overlayPos<scriptPos,'ghost overlay must exist before script executes');
});


test('jumpscare keeps force-display state with uploaded photo',()=>{
  assert.match(html,/document\.documentElement\.classList\.add\('jumpscare-active'\)/);
  assert.match(html,/document\.documentElement\.classList\.remove\('jumpscare-active'\)/);
  assert.match(html,/html\.jumpscare-active\s+#ghostJumpscare\{display:grid!important/);
  assert.match(html,/data:image\/jpeg;base64,/);
  assert.doesNotMatch(html,/id="ghostJumpscare"[\s\S]{0,260}<svg/);
});


test('uploaded ghost photo is embedded as JPEG',()=>{
  assert.match(html,/id="ghostJumpscare"[\s\S]{0,260}<img[^>]+src="data:image\/jpeg;base64,/);
  assert.doesNotMatch(html,/id="ghostJumpscare"[\s\S]{0,260}<svg/);
});


test('uploaded ghost photo has stable image id',()=>{
  assert.match(html,/id="ghostJumpscareImage"/);
});


test('jumpscare uses higher quality uploaded photo',()=>{
  const m=html.match(/id="ghostJumpscareImage"[^>]+src="data:image\/jpeg;base64,([^"]+)"/);
  assert.ok(m,'ghost photo must be embedded as JPEG');
  assert.ok(m[1].length>80000,'embedded ghost photo should be high quality, not the tiny preview');
});

test('jumpscare plays a synthesized scream unless muted',()=>{
  assert.match(html,/scream\(\)\{/);
  assert.match(html,/if\(this\.muted\)return;/);
  assert.match(html,/audio\.scream\(\)/);
});

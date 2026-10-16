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

test('jumpscare auto-hides after 1200ms',()=>{
  assert.match(html,/setTimeout\(\(\)=>\{[\s\S]{0,260}\},1200\);/);
});

test('jumpscare uses embedded original ghost visual with no remote dependency',()=>{
  assert.match(html,/data:image\/svg\+xml/);
  assert.doesNotMatch(html,/ghost\.png/);
});

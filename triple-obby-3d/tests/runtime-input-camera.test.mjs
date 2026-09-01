import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = new URL('../', import.meta.url);

test('assembled browser runtime parses as JavaScript', async () => {
  const names = [
    'game-01.part',
    'camera-prelude.part',
    'game-02.part',
    'game-03.part',
    'game-04.part',
    'game-05.part',
    'online-game-bridge.part',
    'camera-tail-01.part',
    'camera-tail-02.part',
    'camera-tail-03.part',
  ];
  const source = (await Promise.all(names.map(name => readFile(new URL(name, base), 'utf8')))).join('\n');
  assert.doesNotThrow(() => new Function(source));
});

test('camera button does not clear WASD and WASD remains world-axis based', async () => {
  const cameraTail = await readFile(new URL('camera-tail-02.part', base), 'utf8');
  const game = await readFile(new URL('game-05.part', base), 'utf8');
  assert.match(cameraTail, /viewBtn\.addEventListener\('pointerdown',[^\n]*preventDefault/);
  assert.doesNotMatch(cameraTail, /viewBtn[\s\S]{0,180}input\.(forward|back|left|right)\s*=/);
  assert.doesNotMatch(cameraTail, /viewBtn[\s\S]{0,180}Object\.keys\(input\)/);
  assert.match(game, /const worldMove = new THREE\.Vector3\([\s\S]{0,220}\(input\.right \? 1 : 0\) - \(input\.left \? 1 : 0\)[\s\S]{0,120}\(input\.back \? 1 : 0\) - \(input\.forward \? 1 : 0\)/);
  assert.doesNotMatch(game, /worldMove\.applyQuaternion|move\.applyQuaternion|camera\.quaternion/);
});

test('keyboard arrows are separated from WASD and use character-relative steering', async () => {
  const cameraTail = await readFile(new URL('camera-tail-02.part', base), 'utf8');
  const game = await readFile(new URL('game-05.part', base), 'utf8');
  const index = await readFile(new URL('index.html', base), 'utf8');

  assert.doesNotMatch(cameraTail, /\['KeyW','ArrowUp'\]|\['KeyA','ArrowLeft'\]/);
  assert.match(cameraTail, /e\.code === 'ArrowUp'[\s\S]{0,80}bindArrow\('forward', true\)/);
  assert.match(cameraTail, /e\.code === 'ArrowLeft'[\s\S]{0,80}bindArrow\('left', true\)/);
  assert.match(game, /TripleObbyControls\.stepArrowControls\(arrowInput, player\.yaw, dt\)/);
  assert.match(index, /src\/arrow-controls\.js/);
});

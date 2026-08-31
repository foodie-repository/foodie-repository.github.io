import { test, expect } from '@playwright/test';

const baseUrl = process.env.TRIPLE_OBBY_BASE_URL || 'http://127.0.0.1:4173/triple-obby-3d/';

test('two browsers join the same room and camera changes do not interrupt W movement', async ({ browser }) => {
  test.setTimeout(180000);

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await pageA.goto(baseUrl, { waitUntil: 'networkidle' });
  await pageA.fill('#nicknameInput', 'Host');
  await pageA.click('#createRoomBtn');
  await expect(pageA.locator('#roomInfo')).toHaveAttribute('data-visible', 'true', { timeout: 30000 });
  const roomCode = (await pageA.locator('#roomCodeBadge').textContent()).trim();
  expect(roomCode).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);

  await pageB.goto(`${baseUrl}?room=${roomCode}`, { waitUntil: 'networkidle' });
  await pageB.evaluate(() => {
    window.__remoteStateCount = 0;
    window.__inputEvents = [];
    window.addEventListener('obby:player-state', () => { window.__remoteStateCount += 1; });
    window.addEventListener('keydown', event => {
      if (event.code === 'KeyW') window.__inputEvents.push({ type: 'keydown', code: event.code, at: performance.now() });
    }, true);
    window.addEventListener('keyup', event => {
      if (event.code === 'KeyW') window.__inputEvents.push({ type: 'keyup', code: event.code, at: performance.now() });
    }, true);
    window.addEventListener('blur', () => window.__inputEvents.push({ type: 'window-blur', at: performance.now() }));
  });
  await pageB.fill('#nicknameInput', 'Guest');
  await pageB.click('#joinRoomBtn');

  await expect(pageA.locator('#memberCount')).toHaveText('2 / 8', { timeout: 30000 });
  await expect(pageB.locator('#memberCount')).toHaveText('2 / 8', { timeout: 30000 });

  await pageA.locator('.portalBtn[data-map="color"]').click();
  await expect(pageA.locator('#lobbyOverlay')).toHaveAttribute('data-visible', 'false', { timeout: 30000 });
  await expect(pageB.locator('#lobbyOverlay')).toHaveAttribute('data-visible', 'false', { timeout: 30000 });
  await pageB.waitForFunction(() => Boolean(window.__TRIPLE_OBBY_RUNTIME__), null, { timeout: 30000 });

  // Let the newly spawned player land before testing movement so the assertion is about
  // camera/input independence rather than initial falling physics.
  await pageB.waitForTimeout(1200);
  const cameraBefore = await pageB.locator('#viewModeText').textContent();
  await pageB.keyboard.down('KeyW');
  await pageB.waitForTimeout(180);
  const zBeforeCamera = await pageB.evaluate(() => window.__TRIPLE_OBBY_RUNTIME__.getLocalPlayerSnapshot().position[2]);
  // Trigger the actual button click handler without Playwright's pixel-actionability wait;
  // headless WebGL rendering can delay that wait while the browser is still rendering frames.
  await pageB.evaluate(() => document.getElementById('viewBtn').click());
  await expect(pageB.locator('#viewModeText')).not.toHaveText(cameraBefore || '', { timeout: 5000 });
  await pageB.waitForTimeout(220);
  const diagnostic = await pageB.evaluate(() => ({
    z: window.__TRIPLE_OBBY_RUNTIME__.getLocalPlayerSnapshot().position[2],
    events: window.__inputEvents,
    hasFocus: document.hasFocus(),
  }));
  await pageB.keyboard.up('KeyW');
  if (!(diagnostic.z < zBeforeCamera - 0.02)) {
    throw new Error(`W stopped after camera switch: before=${zBeforeCamera}, after=${diagnostic.z}, diagnostic=${JSON.stringify(diagnostic)}`);
  }

  await pageB.evaluate(() => { window.__remoteStateCount = 0; });
  await pageA.keyboard.down('KeyD');
  await pageA.waitForTimeout(1200);
  await pageA.keyboard.up('KeyD');
  await pageB.waitForFunction(() => window.__remoteStateCount > 0, null, { timeout: 30000 });

  await pageA.evaluate(() => window.TripleObbyOnline.roomClient.leave());
  await expect(pageB.locator('#onlineStatus')).toContainText('방장', { timeout: 30000 });

  await contextA.close();
  await contextB.close();
});

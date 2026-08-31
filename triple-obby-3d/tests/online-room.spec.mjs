import { test, expect } from '@playwright/test';

const baseUrl = process.env.TRIPLE_OBBY_BASE_URL || 'http://127.0.0.1:4173/triple-obby-3d/';

test('two browsers join the same room and camera changes do not interrupt W movement', async ({ browser }) => {
  // Live Supabase calls can take several seconds each on the free tier. This timeout
  // protects the behavior contract without confusing infrastructure latency for a bug.
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
    window.addEventListener('obby:player-state', () => { window.__remoteStateCount += 1; });
  });
  await pageB.fill('#nicknameInput', 'Guest');
  await pageB.click('#joinRoomBtn');

  await expect(pageA.locator('#memberCount')).toHaveText('2 / 8', { timeout: 30000 });
  await expect(pageB.locator('#memberCount')).toHaveText('2 / 8', { timeout: 30000 });

  await pageA.locator('.portalBtn[data-map="color"]').click();
  await expect(pageA.locator('#lobbyOverlay')).toHaveAttribute('data-visible', 'false', { timeout: 30000 });
  await expect(pageB.locator('#lobbyOverlay')).toHaveAttribute('data-visible', 'false', { timeout: 30000 });

  await pageB.waitForFunction(() => Boolean(window.__TRIPLE_OBBY_RUNTIME__), null, { timeout: 30000 });
  await pageB.keyboard.down('KeyW');
  await pageB.waitForTimeout(180);
  const zBeforeCamera = await pageB.evaluate(() => window.__TRIPLE_OBBY_RUNTIME__.getLocalPlayerSnapshot().position[2]);
  await pageB.locator('#viewBtn').click();
  await pageB.waitForTimeout(220);
  const zAfterCamera = await pageB.evaluate(() => window.__TRIPLE_OBBY_RUNTIME__.getLocalPlayerSnapshot().position[2]);
  await pageB.keyboard.up('KeyW');
  expect(zAfterCamera).toBeLessThan(zBeforeCamera - 0.2);

  await pageA.keyboard.down('KeyD');
  await pageA.waitForTimeout(300);
  await pageA.keyboard.up('KeyD');
  await pageB.waitForFunction(() => window.__remoteStateCount > 0, null, { timeout: 30000 });

  await pageA.evaluate(() => window.TripleObbyOnline.roomClient.leave());
  await expect(pageB.locator('#onlineStatus')).toContainText('방장', { timeout: 30000 });

  await contextA.close();
  await contextB.close();
});

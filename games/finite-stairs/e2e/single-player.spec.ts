import { expect, test } from '@playwright/test';

test('keyboard and mobile controls share the 2,000-step rules', async ({ page }) => {
  await page.goto('/finite-stairs/');
  await expect(page.getByText('2,000번째 계단')).toBeVisible();
  await page.getByRole('button', { name: '싱글 플레이' }).click();

  await expect(page.getByText('/ 2,000')).toBeVisible();
  await expect(page.getByRole('button', { name: '전환 + 오르기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '오르기' })).toBeVisible();

  await page.keyboard.press('Space');
  await expect(page.getByText(/방향: (왼쪽|오른쪽)/)).toBeVisible();
});

test('keeps the result hidden until the 800ms fall completes', async ({ page }) => {
  await page.goto('/finite-stairs/?fixture=wrong-route');
  await page.getByRole('button', { name: '싱글 플레이' }).click();
  await page.keyboard.press('ArrowUp');

  await expect(page.getByText('추락 중…')).toBeVisible();
  await expect(page.getByRole('heading', { name: /계단 도달/ })).toHaveCount(0);
  await page.waitForTimeout(650);
  await expect(page.getByRole('heading', { name: /계단 도달/ })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /계단 도달/ })).toBeVisible({ timeout: 700 });
});

test('uses the 200ms reduced-motion fall', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/finite-stairs/?fixture=wrong-route');
  await page.getByRole('button', { name: '싱글 플레이' }).click();
  await page.keyboard.press('ArrowUp');

  await expect(page.getByText('추락 중…')).toBeVisible();
  await expect(page.getByRole('heading', { name: /계단 도달/ })).toBeVisible({ timeout: 450 });
});

import { test, expect } from '@playwright/test';

test.describe('Practice player', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/practice/song-wonderwall');
    await expect(page.getByTestId('practice-screen')).toBeVisible();
  });

  test('tempo controls change the displayed tempo', async ({ page }) => {
    const before = await page.getByTestId('tempo-value').textContent();
    await page.getByTestId('tempo-up').click();
    await expect(page.getByTestId('tempo-value')).not.toHaveText(before ?? '');
  });

  test('transpose controls change the displayed key', async ({ page }) => {
    const before = await page.getByTestId('transpose-key').textContent();
    await page.getByTestId('transpose-up').click();
    await expect(page.getByTestId('transpose-key')).not.toHaveText(before ?? '');
  });

  test('loop toggle flips state text', async ({ page }) => {
    await expect(page.getByTestId('practice-loop-state')).toHaveText('Loop off');
    await page.getByTestId('practice-loop-toggle').click();
    await expect(page.getByTestId('practice-loop-state')).toHaveText('Loop on');
  });

  test('back button returns to the previous screen', async ({ page }) => {
    await page.goto('/song/song-wonderwall');
    await page.getByTestId('open-practice').click();
    await expect(page.getByTestId('practice-screen')).toBeVisible();

    await page.getByTestId('practice-back').click();
    await expect(page.getByTestId('song-detail-screen')).toBeVisible();
  });
});

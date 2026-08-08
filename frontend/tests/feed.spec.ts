import { test, expect } from '@playwright/test';

test.describe('Feed', () => {
  test('liking a performance increments the like count', async ({ page }) => {
    await page.goto('/feed');
    await expect(page.getByTestId('feed-list')).toBeVisible();

    const likes = page.getByTestId('likes-perf-1');
    const before = Number(await likes.textContent());

    await page.getByTestId('like-perf-1').click();
    await expect(likes).toHaveText(String(before + 1));
  });

  test('opening a post navigates to the song', async ({ page }) => {
    await page.goto('/feed');
    await page.getByTestId('post-song-perf-1').click();
    await expect(page.getByTestId('song-detail-screen')).toBeVisible();
  });
});

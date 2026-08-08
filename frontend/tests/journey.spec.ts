import { test, expect } from '@playwright/test';

test('full journey: find a song, practice it, analyze a take', async ({ page }) => {
  // Find a song
  await page.goto('/home');
  await page.getByTestId('search-input').fill('wonderwall');
  await page.getByTestId('song-card-song-wonderwall').click();
  await expect(page.getByTestId('song-detail-screen')).toBeVisible();

  // Practice it
  await page.getByTestId('open-practice').click();
  await expect(page.getByTestId('practice-screen')).toBeVisible();
  await page.getByTestId('tempo-up').click();
  await page.getByTestId('practice-play-toggle').click();
  await expect(page.getByTestId('practice-play-toggle')).toBeVisible();

  // Analyze a take
  await page.getByTestId('practice-back').click();
  await page.getByTestId('open-analyze-from-song').click();
  await expect(page.getByTestId('analyze-screen')).toBeVisible();
  await page.getByTestId('pick-demo-file').click();
  await page.getByTestId('run-analysis').click();
  await expect(page.getByTestId('analysis-result')).toBeVisible({ timeout: 15_000 });
});

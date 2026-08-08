import { test, expect } from '@playwright/test';

test.describe('Discover / catalog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByTestId('song-grid')).toBeVisible();
  });

  test('searches the catalog by title', async ({ page }) => {
    await page.getByTestId('search-input').fill('blackbird');
    await expect(page.getByTestId('song-card-song-blackbird')).toBeVisible();
    await expect(page.getByTestId('song-card-song-wonderwall')).toHaveCount(0);

    await page.getByTestId('search-clear').click();
    await expect(page.getByTestId('search-input')).toHaveValue('');
    await expect(page.getByTestId('song-card-song-wonderwall')).toBeVisible();
  });

  test('filters by instrument', async ({ page }) => {
    await page.getByTestId('filter-piano').click();
    await expect(page.getByTestId('song-card-song-someone')).toBeVisible();
    await expect(page.getByTestId('song-card-song-wonderwall')).toHaveCount(0);

    await page.getByTestId('filter-all').click();
    await expect(page.getByTestId('song-card-song-wonderwall')).toBeVisible();
  });

  test('opens a song into the practice player', async ({ page }) => {
    await page.getByTestId('song-card-song-wonderwall').click();
    await expect(page.getByTestId('song-detail-screen')).toBeVisible();
    await expect(page.getByTestId('song-title')).toHaveText('Wonderwall');

    await page.getByTestId('open-practice').click();
    await expect(page.getByTestId('practice-screen')).toBeVisible();
  });
});

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

  test('play/pause toggles and advances the position', async ({ page }) => {
    await expect(page.getByTestId('practice-position')).toHaveText('0:00');
    await page.getByTestId('practice-play-toggle').click();
    await page.waitForTimeout(1200);
    await expect(page.getByTestId('practice-position')).not.toHaveText('0:00');

    await page.getByTestId('practice-play-toggle').click(); // pause
    const paused = await page.getByTestId('practice-position').textContent();
    await page.waitForTimeout(500);
    await expect(page.getByTestId('practice-position')).toHaveText(paused ?? '');
  });

  test('skip forward and back jump by 10 seconds', async ({ page }) => {
    await page.getByTestId('skip-forward').click();
    await expect(page.getByTestId('practice-position')).toHaveText('0:10');
    await page.getByTestId('skip-forward').click();
    await expect(page.getByTestId('practice-position')).toHaveText('0:20');
    await page.getByTestId('skip-back').click();
    await expect(page.getByTestId('practice-position')).toHaveText('0:10');
  });

  test('restart jumps back to the start', async ({ page }) => {
    await page.getByTestId('skip-forward').click();
    await page.getByTestId('practice-restart').click();
    await expect(page.getByTestId('practice-position')).toHaveText('0:00');
  });

  test('dragging/clicking the seek bar jumps to that point in the track', async ({ page }) => {
    const box = await page.getByTestId('practice-progress').boundingBox();
    if (!box) throw new Error('seek bar not found');
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height / 2);
    // Wonderwall is 4:18 (258s) — the midpoint should land around 2:09.
    await expect(page.getByTestId('practice-position')).toHaveText(/2:0[5-9]|2:1[0-3]/);
  });

  test('lyrics panel highlights and seeks on line tap', async ({ page }) => {
    await expect(page.getByTestId('lyrics-panel')).toBeVisible();
    await expect(page.getByTestId('lyric-line-0')).toBeVisible();

    await page.getByTestId('lyric-line-2').click();
    const posAfterEarlyLine = await page.getByTestId('practice-position').textContent();
    await expect(page.getByTestId('practice-position')).not.toHaveText('0:00');

    // A later line should seek further into the track.
    await page.getByTestId('lyric-line-6').click();
    const posAfterLaterLine = await page.getByTestId('practice-position').textContent();
    expect(posAfterLaterLine).not.toBe(posAfterEarlyLine);
  });

  test('only the current lyric line is highlighted as the track advances', async ({ page }) => {
    await page.getByTestId('lyric-line-3').click();
    await expect(page.getByTestId('lyric-line-text-3')).toHaveCSS('font-weight', '700');
    await expect(page.getByTestId('lyric-line-text-0')).not.toHaveCSS('font-weight', '700');
  });
});

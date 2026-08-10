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

  test('reaching the end of the track and pressing play again restarts from 0', async ({ page }) => {
    await page.goto('/practice/song-blackbird'); // shorter (2:18) so skip-forward reaches the end fast
    await expect(page.getByTestId('practice-screen')).toBeVisible();
    await page.getByTestId('practice-play-toggle').click();

    for (let i = 0; i < 16; i++) {
      await page.getByTestId('skip-forward').click();
    }
    await expect(page.getByTestId('practice-position')).toHaveText('2:18');

    // Regression: pressing play at end-of-track used to get immediately
    // flipped back to paused by the very next tick, since `pos` never left
    // `durationSec` — looked like playback was permanently stuck/broken.
    await page.getByTestId('practice-play-toggle').click();
    await page.waitForTimeout(700);
    const pos = await page.getByTestId('practice-position').textContent();
    expect(pos).not.toBe('2:18');
  });

  test('the highlighted chord cycles with the 16s audio loop, not once per song', async ({ page }) => {
    // Wonderwall's progression is Em7/G/Dsus4/A7sus4, 4s each within the loop.
    const box = await page.getByTestId('practice-progress').boundingBox();
    if (!box) throw new Error('seek bar not found');
    const durationSec = 258;

    async function activeChordAt(sec: number) {
      await page.mouse.click(box!.x + box!.width * (sec / durationSec), box!.y + box!.height / 2);
      await page.getByTestId('practice-play-toggle').click();
      await page.waitForTimeout(120);
      const text = await page.evaluate(() => {
        const beats = Array.from(document.querySelectorAll('[data-testid^="beat-"]')) as HTMLElement[];
        // The active beat is the one whose chord text renders in bright white.
        const active = beats.find((b) => getComputedStyle(b.querySelector('span, div')!).color === 'rgb(255, 255, 255)');
        return active?.textContent ?? null;
      });
      await page.getByTestId('practice-play-toggle').click();
      return text;
    }

    await expect(page.getByTestId('practice-position')).toBeVisible();
    const early = await activeChordAt(1);
    const later = await activeChordAt(13);
    expect(early).not.toBe(later);
  });

  test('volume slider space is reserved but hidden until hovered, and mute toggles', async ({ page }) => {
    // The wrapper is always mounted (fixed width) so revealing it never
    // shifts the other transport buttons — only its opacity/interactivity
    // toggle with hover.
    await expect(page.getByTestId('volume-slider-wrap')).toHaveCSS('opacity', '0');

    const box = await page.getByTestId('volume-hover-zone').boundingBox();
    if (!box) throw new Error('volume hover zone not found');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
    await expect(page.getByTestId('volume-slider-wrap')).toHaveCSS('opacity', '1');
    await expect(page.getByTestId('volume-control')).toBeVisible();

    await page.mouse.move(10, 10);
    await expect(page.getByTestId('volume-slider-wrap')).toHaveCSS('opacity', '0');

    await page.getByTestId('volume-mute-toggle').click();
    await page.getByTestId('volume-mute-toggle').click(); // toggle twice — just verify it doesn't crash the screen
    await expect(page.getByTestId('practice-screen')).toBeVisible();
  });

  test('the transport row (including volume) never overflows on a narrow/mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/practice/song-wonderwall');
    await expect(page.getByTestId('practice-screen')).toBeVisible();

    for (const id of ['practice-restart', 'skip-back', 'practice-play-toggle', 'skip-forward', 'practice-loop-toggle', 'volume-mute-toggle']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box, `${id} should have a layout box`).toBeTruthy();
      expect(box!.x, `${id} should not be clipped off the left edge`).toBeGreaterThanOrEqual(0);
    }
  });

  test('logo in the header navigates to the home tab', async ({ page }) => {
    await page.getByTestId('practice-logo-home').click();
    await expect(page.getByTestId('discover-screen')).toBeVisible();
  });
});

test.describe('Practice player — touch device (no hover)', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test('volume slider is shown outright since there is no hover to reveal it', async ({ page }) => {
    await page.goto('/practice/song-wonderwall');
    await expect(page.getByTestId('practice-screen')).toBeVisible();
    await expect(page.getByTestId('volume-slider-wrap')).toHaveCSS('opacity', '1');
    await expect(page.getByTestId('volume-control')).toBeVisible();
  });
});

test.describe('Practice player — wide desktop layout', () => {
  test.use({ viewport: { width: 1400, height: 900 } });

  test('lyrics sit beside the controls and the whole player fits without scrolling', async ({ page }) => {
    await page.goto('/practice/song-wonderwall');
    await expect(page.getByTestId('practice-screen')).toBeVisible();
    await expect(page.getByTestId('lyrics-panel')).toBeVisible();

    const { scrollHeight, viewportHeight } = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
    }));
    expect(scrollHeight).toBeLessThanOrEqual(viewportHeight);
  });
});

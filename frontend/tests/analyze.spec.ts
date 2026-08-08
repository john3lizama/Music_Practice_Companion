import { test, expect } from '@playwright/test';

test.describe('Analyze', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/analyze');
    await expect(page.getByTestId('analyze-screen')).toBeVisible();
  });

  test('running an analysis on a demo file shows scores', async ({ page }) => {
    await page.getByTestId('pick-demo-file').click();
    await expect(page.getByTestId('file-name')).not.toHaveText('Choose an audio file');

    await page.getByTestId('run-analysis').click();
    await expect(page.getByTestId('analyzing-indicator')).toBeVisible();
    await expect(page.getByTestId('analysis-result')).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId('overall-dial-value')).toBeVisible();
    await expect(page.getByTestId('score-pitch')).toBeVisible();
    await expect(page.getByTestId('score-timing')).toBeVisible();
  });

  test('run button is disabled until a file is chosen', async ({ page }) => {
    await expect(page.getByTestId('run-analysis')).toBeDisabled();
    await page.getByTestId('pick-demo-file').click();
    await expect(page.getByTestId('run-analysis')).toBeEnabled();
  });
});

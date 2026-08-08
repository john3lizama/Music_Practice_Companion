import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('shows the hero and opens the app', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('hero-title')).toBeVisible();
    await expect(page.getByTestId('hero-cta-primary')).toBeVisible();

    await page.getByTestId('hero-cta-primary').click();
    await expect(page.getByTestId('discover-screen')).toBeVisible();
  });

  test('nav sign-in goes to the login screen', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-sign-in').click();
    await expect(page.getByTestId('login-screen')).toBeVisible();
  });

  test('footer legal links open privacy and terms', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('footer-privacy').click();
    await expect(page.getByTestId('legal-screen')).toBeVisible();
    await expect(page.getByTestId('legal-title')).toBeVisible();

    await page.getByTestId('legal-back').click();
    await page.getByTestId('footer-terms').click();
    await expect(page.getByTestId('legal-screen')).toBeVisible();
  });
});

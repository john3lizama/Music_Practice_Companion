import { test, expect } from '@playwright/test';

test.describe('Profile', () => {
  test('shows the signed-in user and can sign out', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByTestId('profile-screen')).toBeVisible();
    await expect(page.getByTestId('profile-name')).toBeVisible();
    await expect(page.getByTestId('badge-grid')).toBeVisible();
    await expect(page.getByTestId('my-performances')).toBeVisible();

    await page.getByTestId('sign-out').click();
    await expect(page.getByTestId('login-screen')).toBeVisible();
  });
});

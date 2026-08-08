import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('signs in and lands on Discover', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.getByTestId('login-email').fill('demo@example.com');
    await page.getByTestId('login-password').fill('hunter22');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('discover-screen')).toBeVisible();
  });

  test('rejects an empty submission', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-screen')).toBeVisible();
  });

  test('links to register and forgot password', async ({ page }) => {
    await page.goto('/(auth)/login');
    await page.getByTestId('go-forgot').click();
    await expect(page.getByTestId('forgot-screen')).toBeVisible();

    await page.getByTestId('forgot-back').click();
    await expect(page.getByTestId('login-screen')).toBeVisible();
    await page.getByTestId('go-register').click();
    await expect(page.getByTestId('register-screen')).toBeVisible();
  });
});

test.describe('Register', () => {
  test('creates an account and lands on Discover', async ({ page }) => {
    await page.goto('/(auth)/register');
    await page.getByTestId('register-email').fill(`new-${Date.now()}@example.com`);
    await page.getByTestId('register-password').fill('a-strong-password');
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('discover-screen')).toBeVisible();
  });

  test('rejects an empty submission', async ({ page }) => {
    await page.goto('/(auth)/register');
    await page.getByTestId('register-submit').click();
    await expect(page.getByTestId('register-error')).toBeVisible();
  });
});

test.describe('Forgot password', () => {
  test('requesting a reset always shows the same confirmation', async ({ page }) => {
    await page.goto('/(auth)/forgot');
    await page.getByTestId('forgot-email').fill('someone@example.com');
    await page.getByTestId('forgot-submit').click();
    await expect(page.getByTestId('forgot-done')).toBeVisible();

    await page.getByTestId('forgot-to-login').click();
    await expect(page.getByTestId('login-screen')).toBeVisible();
  });

  test('rejects an empty email', async ({ page }) => {
    await page.goto('/(auth)/forgot');
    await page.getByTestId('forgot-submit').click();
    await expect(page.getByTestId('forgot-error')).toBeVisible();
  });
});

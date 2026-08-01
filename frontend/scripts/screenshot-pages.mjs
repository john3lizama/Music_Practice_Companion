import { chromium } from '@playwright/test';
import path from 'node:path';

const BASE = 'http://localhost:8082';
const OUT = path.resolve('screenshots');
const EMAIL = 'demo@musicvjn.app';
const PASSWORD = 'MusicVjnDemo!2026';

const shot = async (page, name) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('captured', name);
};

const run = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  await page.goto(`${BASE}/`);
  await shot(page, '01-index');

  await page.goto(`${BASE}/(auth)/login`);
  await shot(page, '02-login');

  await page.goto(`${BASE}/(auth)/register`);
  await shot(page, '03-register');

  await page.goto(`${BASE}/(auth)/forgot`);
  await shot(page, '04-forgot-password');

  // Sign in as the seeded demo account
  await page.goto(`${BASE}/(auth)/login`);
  await page.getByTestId('login-email').fill(EMAIL);
  await page.getByTestId('login-password').fill(PASSWORD);
  await page.getByTestId('login-submit').click();
  await page.waitForURL(/\/home/, { timeout: 15000 });
  await shot(page, '05-home');

  await page.goto(`${BASE}/analyze`);
  await shot(page, '06-analyze');

  await page.goto(`${BASE}/feed`);
  await shot(page, '07-feed');

  await page.goto(`${BASE}/profile`);
  await shot(page, '08-profile');

  await page.goto(`${BASE}/song/song-wonderwall`);
  await shot(page, '09-song-detail');

  await page.goto(`${BASE}/practice/song-wonderwall`);
  await shot(page, '10-practice-player');

  await page.goto(`${BASE}/legal/privacy`);
  await shot(page, '11-legal-privacy');

  await page.goto(`${BASE}/legal/terms`);
  await shot(page, '12-legal-terms');

  await browser.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

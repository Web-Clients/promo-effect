/**
 * Log in once per role and save the session for every other test to reuse.
 *
 * Each spec used to drive the login form itself. That meant ~18 logins per run
 * against an authLimiter of 5 failures per 15 minutes, and the occasional
 * submit that raced React's handler counted as a failure — so the back half of
 * the suite failed with "Too many login attempts" and nothing to do with what
 * it was testing. Two logins per run instead of eighteen, and the tests get to
 * be about their subject.
 */
import { test as setup, expect } from '@playwright/test';
import { ADMIN_STATE, AGENT_STATE } from './auth-paths';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

async function signIn(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
  file: string
) {
  await page.goto(BASE + '/login');
  // Wait for the form to be interactive; a submit that beats React's handler
  // posts an empty body and burns a rate-limit slot.
  await expect(page.locator('input[type="email"]')).toBeEnabled();
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30000 });
  await page.context().storageState({ path: file });
}

setup('authenticate as admin', async ({ page }) => {
  await signIn(page, 'e2e-admin@local.test', 'E2ePassw0rd!', ADMIN_STATE);
});

setup('authenticate as a Chinese agent', async ({ page }) => {
  await signIn(page, 'copen@promo-efect.md', 'Agent2026!', AGENT_STATE);
});

/**
 * What a Chinese agent is offered in the sidebar.
 *
 * Ion, 8 Sep: "Noi asta le dăm o singură pagină, unde ei se loghează cu datele
 * lor și pagina are un singur formular." The API already refuses an agent the
 * calculator (403) and the approval queue, but the sidebar still advertised
 * both, so the agent's first click was a dead end.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

test('an agent is offered his prices and his profile, and nothing that 403s', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(BASE + '/login');
  await page.fill('input[type="email"]', 'copen@promo-efect.md');
  await page.fill('input[type="password"]', 'Agent2026!');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  const nav = page.locator('nav').first();
  await expect(nav.getByRole('link', { name: /My Prices|Prețurile Mele|Мои цены/ })).toBeVisible();

  // Screens the agent has no business in — and cannot load anyway.
  await expect(nav.getByRole('link', { name: /Calculator/i })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: /Fleet|Flotă|Флот/i })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: /Bookings|Rezervări|Брони/i })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: /Clients|Clienți/i })).toHaveCount(0);
});

test('an admin still gets the full sidebar', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(BASE + '/login');
  await page.fill('input[type="email"]', 'e2e-admin@local.test');
  await page.fill('input[type="password"]', 'E2ePassw0rd!');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  const nav = page.locator('nav').first();
  await expect(nav.getByRole('link', { name: /Calculator/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Bookings|Rezervări/i })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Agents|Agenți/i })).toBeVisible();
});

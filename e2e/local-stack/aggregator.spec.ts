/**
 * The client's offer screen shows what the Chinese agents entered.
 *
 * Ion, 8 Sep: several agents quote the same lane and the client should see that
 * market, laid out side by side rather than as a list — but not all of it.
 * Three agents quoting the same carrier for the same sailing week is one offer,
 * and what belongs beside it is a different carrier or a different week.
 *
 * Agent rates used to be a fallback, reached only when no base price covered
 * the lane, so everything the agents entered was invisible in practice.
 */
import { test, expect } from '@playwright/test';

import { ADMIN_STATE } from './auth-paths';

test.use({ storageState: ADMIN_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

async function quote(page: import('@playwright/test').Page) {
  await page.goto(BASE + '/dashboard');
  await page.evaluate(() => localStorage.setItem('language', 'ro'));
  await page.goto(BASE + '/dashboard/calculator');
  await page.waitForLoadState('networkidle').catch(() => {});

  await page.getByRole('button', { name: 'FOB', exact: true }).click();
  await page.fill('input[placeholder="ex. 23500"]', '23500');
  const ready = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  await page.fill('input[type="date"]', ready);
  await page.getByRole('button', { name: /Calculează|Calculate/ }).click();
  await page.waitForTimeout(3000);
}

test('offers are laid out as cards, several carriers at once', async ({ page }) => {
  test.setTimeout(120_000);
  await quote(page);

  // The card header is the element with aria-pressed; its text no longer starts
  // with "#" since the cards went compact.
  const cards = page.locator('[role="button"][aria-pressed]');
  const count = await cards.count();
  expect(count).toBeGreaterThan(1);
  // Capped at eight so the grid is whole rows.
  expect(count).toBeLessThanOrEqual(8);

  await page.screenshot({ path: 'e2e/local-stack/shots/aggregator.png', fullPage: true });
});

test('one carrier does not appear twice for the same sailing week', async ({ page }) => {
  test.setTimeout(120_000);
  await quote(page);

  const names = await page.locator('[role="button"][aria-pressed]').allInnerTexts();

  // A carrier may appear twice only when the sailings differ — an agent rate
  // for a named week and the standing base rate are genuinely two offers. What
  // must never happen is the same carrier twice for the same sailing.
  const keys = names.map((n) => {
    const carrier = n.split('\n')[1]?.trim() ?? '';
    const departs = /plecare\s+([^\n]+)/.exec(n)?.[1]?.trim() ?? 'no-date';
    return `${carrier}|${departs}`;
  });
  expect(new Set(keys).size).toBe(keys.length);
});

test('the office sees which agent quoted a rate', async ({ page }) => {
  test.setTimeout(120_000);
  await quote(page);
  // At least one offer comes from a seeded Chinese agent.
  await expect(page.getByText('Ningbo Copen International Logistics').first()).toBeVisible();
});

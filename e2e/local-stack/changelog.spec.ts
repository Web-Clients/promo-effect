/**
 * The changelog and the "how it works" reference.
 *
 * Ion asked for both on 8 Sep and separated them himself: a record of what was
 * done, and a description of what each part does. Everyone gets them, agents
 * included — an agent has as much reason to know a rule changed as the office.
 */
import { test, expect } from '@playwright/test';

import { ADMIN_STATE } from './auth-paths';

test.use({ storageState: ADMIN_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

async function open(page: import('@playwright/test').Page, lang: string) {
  await page.goto(BASE + '/dashboard');
  await page.evaluate((l) => localStorage.setItem('language', l), lang);
  await page.goto(BASE + '/dashboard/changelog');
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
}

test('lists what changed, newest first, grouped by day', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, 'ro');

  await expect(page.getByRole('heading', { name: 'Noutăți și cum funcționează' })).toBeVisible();
  await expect(page.getByText('Harta flotei, pe glob')).toBeVisible();
  await expect(page.getByText('9 septembrie 2026')).toBeVisible();

  await page.screenshot({ path: 'e2e/local-stack/shots/changelog.png', fullPage: true });
});

test('filters by kind', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, 'ro');

  await page.getByRole('button', { name: 'Funcție nouă', exact: true }).click();
  await expect(page.getByText('Harta flotei, pe glob')).toBeVisible();
  // A fix must disappear when only features are shown.
  await expect(page.getByText('Diacriticele din facturi și comenzi')).toHaveCount(0);
});

test('the how-it-works tab explains the rules, not the code', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, 'ro');

  await page.getByRole('button', { name: 'Cum funcționează' }).click();
  await expect(page.getByText('Ce schimbă condiția de livrare')).toBeVisible();
  // The commission rule is the one Ion pushed back on; it has to be written down.
  await expect(page.getByText(/niciodată pe navlu/)).toBeVisible();
  await expect(page.getByText('De unde vine poziția de pe hartă')).toBeVisible();

  await page.screenshot({ path: 'e2e/local-stack/shots/changelog-how.png', fullPage: true });
});

test('follows the reader language', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, 'en');
  await expect(page.getByRole('heading', { name: "What's new, and how it works" })).toBeVisible();
  await expect(page.getByText('The fleet map, on a globe')).toBeVisible();

  await open(page, 'ru');
  await expect(page.getByRole('heading', { name: 'Что нового и как это работает' })).toBeVisible();
  await expect(page.getByText('Карта флота на глобусе')).toBeVisible();
});

/**
 * Browser checks that need the local stack — see README.md in this folder.
 *
 * Each one pins a defect the client reported on 3 Sep 2026.
 */
import { test, expect } from '@playwright/test';

import { ADMIN_STATE } from './auth-paths';

test.use({ storageState: ADMIN_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

// The session comes from auth.setup.ts; nothing here drives the login form.

test('booking detail opens without the white screen', async ({ page }) => {
  const crashes: string[] = [];
  page.on('pageerror', (e) => crashes.push(String(e)));

  await page.goto(BASE + '/dashboard/bookings');
  await expect(page.getByText('Ceva nu a mers bine')).toHaveCount(0);

  // Open the seeded booking directly — this is the page that crashed with
  // "le is not defined" for every reservation.
  await page.goto(BASE + '/dashboard/bookings/MDPE2026090001');
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Ceva nu a mers bine')).toHaveCount(0);
  expect(crashes.filter((c) => /is not defined/.test(c))).toEqual([]);
  await expect(page.locator('body')).toContainText('MDPE2026090001');
});

test('calculator: CFR hides the origin port, FOB shows it', async ({ page }) => {
  await page.goto(BASE + '/dashboard/calculator');
  await page.waitForLoadState('networkidle');

  // The UI language is whatever the account is set to, so match on both labels
  // rather than assuming Romanian — an English session made the old assertion
  // pass for the wrong reason.
  const originLabel = page.getByText(/Port Origine|Origin Port/);

  await page.getByRole('button', { name: 'FOB', exact: true }).click();
  await expect(originLabel.first()).toBeVisible();

  await page.getByRole('button', { name: 'CFR', exact: true }).click();
  await expect(originLabel).toHaveCount(0);

  await page.getByRole('button', { name: 'CIF', exact: true }).click();
  await expect(originLabel).toHaveCount(0);

  await page.getByRole('button', { name: 'EXW', exact: true }).click();
  await expect(originLabel.first()).toBeVisible();
});

test('the price on the offer card survives "Selectează Această Ofertă"', async ({ page }) => {
  await page.goto(BASE + '/dashboard/calculator');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'CFR', exact: true }).click();

  // Shipping line is mandatory for CFR
  const lineSelect = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'Maersk' }) })
    .first();
  await lineSelect.selectOption('Maersk');

  await page.locator('input[placeholder="ex. 23500"]').fill('23555');
  const ready = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
  await page.locator('input[type="date"]').first().fill(ready);

  await page.getByRole('button', { name: /Calculează|Calculate/ }).click();
  await page.waitForResponse((r) => r.url().includes('/calculator/calculate'), { timeout: 30000 });

  // The headline price on the card
  // The card header carries aria-pressed. It is a div with role=button rather
  // than a <button>: the card contains the admin's commission input and the "i"
  // beside it, and neither is legal inside a button element.
  const card = page.locator('[role="button"][aria-pressed]').first();
  await card.waitFor({ timeout: 15000 });
  const cardPrice = (await card.locator('[data-offer-price]').first().innerText()).trim();

  await card.click(); // expand
  await page
    .getByRole('button', { name: /Selectează Această Ofertă|Select This Offer/ })
    .first()
    .click();

  // Same number on the order form. This is the exact regression the client hit:
  // $2475 on the card became $9005 here.
  const orderPrice = page.locator('text=/^\\$[0-9,]+$/').first();
  await orderPrice.waitFor({ timeout: 15000 });
  expect((await orderPrice.innerText()).trim()).toBe(cardPrice);
  console.log('PRET CARD =', cardPrice, ' | PRET COMANDA =', (await orderPrice.innerText()).trim());
});

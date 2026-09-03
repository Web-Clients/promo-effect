/**
 * Browser checks that need the local stack — see README.md in this folder.
 *
 * Each one pins a defect the client reported on 3 Sep 2026.
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';
const EMAIL = 'e2e-admin@local.test';
const PASS = 'E2ePassw0rd!';

async function login(page: import('@playwright/test').Page) {
  await page.goto(BASE + '/login');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
}

test('booking detail opens without the white screen', async ({ page }) => {
  const crashes: string[] = [];
  page.on('pageerror', (e) => crashes.push(String(e)));

  await login(page);
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
  await login(page);
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
  await login(page);
  await page.goto(BASE + '/dashboard/calculator');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'CFR', exact: true }).click();

  // Shipping line is mandatory for CFR
  const lineSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Maersk' }) }).first();
  await lineSelect.selectOption('Maersk');

  await page.locator('input[placeholder="ex. 23500"]').fill('23555');
  const ready = new Date(Date.now() + 20 * 864e5).toISOString().slice(0, 10);
  await page.locator('input[type="date"]').first().fill(ready);

  await page.getByRole('button', { name: /Calculează|Calculate/ }).click();
  await page.waitForResponse((r) => r.url().includes('/calculator/calculate'), { timeout: 30000 });

  // The headline price on the card
  const card = page.locator('button[aria-pressed]').first();
  await card.waitFor({ timeout: 15000 });
  const cardPrice = (await card.locator('p.text-2xl').first().innerText()).trim();

  await card.click(); // expand
  await page.getByRole('button', { name: /Selectează Această Ofertă|Select This Offer/ }).first().click();

  // Same number on the order form. This is the exact regression the client hit:
  // $2475 on the card became $9005 here.
  const orderPrice = page.locator('text=/^\\$[0-9,]+$/').first();
  await orderPrice.waitFor({ timeout: 15000 });
  expect((await orderPrice.innerText()).trim()).toBe(cardPrice);
  console.log('PRET CARD =', cardPrice, ' | PRET COMANDA =', (await orderPrice.innerText()).trim());
});

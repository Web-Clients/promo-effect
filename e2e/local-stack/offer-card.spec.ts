/**
 * The shape of an offer, as Ion asked for it on 8 Sep.
 *
 * Three rows: the ocean freight, then the local charges and the inland
 * transport TOGETHER — "să nu fie separat cheltuielile locale de transport"
 * (14:52) — then the forwarding commission on its own. Under CFR and CIF the
 * maritime row stays visible but goes inactive rather than disappearing:
 * "Maritimul o să fie inactiv" (28:28).
 *
 * And the validity, which he asked for twice: "noi trebuie să vedem
 * valabilitatea ofertei" (44:23).
 */
import { test, expect } from '@playwright/test';

import { ADMIN_STATE } from './auth-paths';

test.use({ storageState: ADMIN_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

async function quote(page: import('@playwright/test').Page, incoterm: 'FOB' | 'CFR') {
  await page.goto(BASE + '/dashboard');
  await page.evaluate(() => localStorage.setItem('language', 'ro'));
  await page.goto(BASE + '/dashboard/calculator');
  await page.waitForLoadState('networkidle').catch(() => {});

  await page.getByRole('button', { name: incoterm, exact: true }).click();
  if (incoterm === 'CFR') {
    await page
      .locator('select')
      .filter({ hasText: /Selecta|Maersk/ })
      .first()
      .selectOption({ label: 'Maersk' });
  }
  await page.fill('input[placeholder="ex. 23500"]', '23500');
  const ready = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  await page.fill('input[type="date"]', ready);
  await page.getByRole('button', { name: /Calculează|Calculate/ }).click();
  await page.waitForTimeout(2500);

  // The breakdown lives inside the card and the card starts collapsed.
  await page.getByRole('button').filter({ hasText: /^#1/ }).first().click();
  await page.waitForTimeout(400);
}

test('FOB shows all three rows, freight priced', async ({ page }) => {
  test.setTimeout(120_000);
  await quote(page, 'FOB');

  await expect(page.getByText('Transport maritim').first()).toBeVisible();
  await expect(page.getByText('Taxe locale + transport intern').first()).toBeVisible();
  await expect(page.getByText('Comision expediție').first()).toBeVisible();

  await page.screenshot({ path: 'e2e/local-stack/shots/offer-fob.png', fullPage: true });
});

test('CFR keeps the maritime row on screen but marks it paid by the supplier', async ({ page }) => {
  test.setTimeout(120_000);
  await quote(page, 'CFR');

  // Present, not hidden — a row that vanishes reads as an omission.
  await expect(page.getByText('Transport maritim').first()).toBeVisible();
  await expect(page.getByText('Inclus de furnizor').first()).toBeVisible();
  await expect(page.getByText('Taxe locale + transport intern').first()).toBeVisible();
  await expect(page.getByText('Comision expediție').first()).toBeVisible();

  await page.screenshot({ path: 'e2e/local-stack/shots/offer-cfr.png', fullPage: true });
});

test('the commission explains what it is charged on', async ({ page }) => {
  test.setTimeout(120_000);
  await quote(page, 'FOB');

  // The "i" beside the commission carries the rule Ion pushed back on. Several
  // tips can be open on this page, so follow aria-describedby to this one.
  const info = page.getByRole('button', { name: /Comisionul se calculează/ }).first();
  await info.click();
  const tipId = await info.getAttribute('aria-describedby');
  expect(tipId).toBeTruthy();
  await expect(page.locator(`#${tipId}`)).toContainText('niciodată la navlu');
});

test('the offer says how long it is good for', async ({ page }) => {
  test.setTimeout(120_000);
  await quote(page, 'FOB');
  await expect(page.getByText(/Valabil până la|Expiră/).first()).toBeVisible();
});

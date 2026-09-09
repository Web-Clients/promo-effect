/**
 * The agent's page in the language the agent reads.
 *
 * Ion's plan is that Chinese forwarders log in themselves and enter their own
 * rates. The page was entirely in Romanian — hardcoded, so the language switch
 * did nothing to it — which makes that plan impossible.
 */
import { test, expect } from '@playwright/test';

import { AGENT_STATE } from './auth-paths';

test.use({ storageState: AGENT_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

/** Already authenticated by auth.setup.ts; this only picks the language. */
async function loginAgent(page: import('@playwright/test').Page, lang: string) {
  await page.goto(BASE + '/dashboard');
  await page.evaluate((l) => localStorage.setItem('language', l), lang);
  await page.goto(BASE + '/dashboard/my-prices');
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
}

test('renders in English end to end', async ({ page }) => {
  test.setTimeout(90_000);
  await loginAgent(page, 'en');

  await expect(page.getByRole('heading', { name: 'My Rates' })).toBeVisible();
  await expect(page.getByText('Total rates')).toBeVisible();
  await expect(page.getByText('Awaiting approval').first()).toBeVisible();

  // Nothing Romanian may survive on the agent's own screen.
  const body = (await page.locator('main').innerText()).toLowerCase();
  for (const word of ['prețurile mele', 'adaugă', 'greutate', 'acțiuni', 'în așteptare']) {
    expect(body).not.toContain(word);
  }
  await page.screenshot({ path: 'e2e/local-stack/shots/agent-english.png', fullPage: true });
});

test('renders in Russian too', async ({ page }) => {
  test.setTimeout(90_000);
  await loginAgent(page, 'ru');
  await expect(page.getByRole('heading', { name: 'Мои тарифы' })).toBeVisible();
});

test('the form offers container labels the calculator can actually match', async ({ page }) => {
  test.setTimeout(90_000);
  await loginAgent(page, 'en');
  await page.getByRole('button', { name: /Add rate/i }).click();

  const options = await page.locator('select').nth(2).locator('option').allTextContents();

  // The old hardcoded list. base_prices speaks 40HQ/40HC, and the agent-price
  // query matches exactly, so these could never be found by a quote.
  expect(options).not.toContain('40ft HC');
  expect(options).not.toContain('20ft');
  expect(options.length).toBeGreaterThan(0);
  // eslint-disable-next-line no-console
  console.log('CONTAINER OPTIONS: ' + options.join(', '));
});

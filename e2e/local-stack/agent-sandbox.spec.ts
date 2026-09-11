/**
 * The agent portal never trips its own fence.
 *
 * Since 11 Sep agent accounts are fenced to an allowlist of API prefixes
 * (backend/src/middleware/agent-sandbox.middleware.ts). The risk of a
 * deny-by-default fence is the opposite of a leak: a screen the agent does use
 * calling something the list forgot, and failing quietly. So walk every page
 * the agent's sidebar offers and require that no API call was refused.
 */
import { test, expect } from '@playwright/test';
import { AGENT_STATE } from './auth-paths';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

test.use({ storageState: AGENT_STATE });

test('every page in the agent sidebar loads without a refused API call', async ({ page }) => {
  test.setTimeout(120_000);

  const refused: string[] = [];
  page.on('response', (res) => {
    const url = new URL(res.url());
    if (url.pathname.startsWith('/api/') && (res.status() === 403 || res.status() >= 500)) {
      refused.push(`${res.status()} ${res.request().method()} ${url.pathname}`);
    }
  });

  await page.goto(BASE + '/dashboard');
  await page.waitForURL(/\/dashboard\/my-prices/, { timeout: 20_000 });
  await page.waitForLoadState('networkidle').catch(() => {});

  const nav = page.locator('nav').first();
  const hrefs = await nav
    .getByRole('link')
    .evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''));
  const pages = [...new Set(hrefs.filter((h) => h.startsWith('/dashboard')))];
  expect(pages.length).toBeGreaterThan(0);

  for (const path of pages) {
    await page.goto(BASE + path);
    await page.waitForLoadState('networkidle').catch(() => {});
    await expect(page).not.toHaveURL(/\/login/);
  }

  expect(refused, `refused calls:\n${refused.join('\n')}`).toEqual([]);
});

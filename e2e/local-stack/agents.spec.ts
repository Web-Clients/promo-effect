/**
 * The Chinese agent screens — admin side and agent side.
 *
 * Ion returned to these four times on 8 Sep: four agents to start, room for
 * forty, each with his own login and his own page, and none of them able to see
 * another's rates.
 */
import { test } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

async function login(page: import('@playwright/test').Page, email: string, pass: string) {
  await page.goto(BASE + '/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
}

test('admin view of the agents', async ({ page }) => {
  test.setTimeout(120_000);
  await login(page, 'e2e-admin@local.test', 'E2ePassw0rd!');
  for (const [name, path] of [
    ['agents-admin', '/dashboard/agents'],
    ['agents-approval', '/dashboard/price-approval'],
  ] as [string, string][]) {
    await page.goto(BASE + path);
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `e2e/local-stack/shots/${name}.png`, fullPage: true });
  }
});

test('what a Chinese agent himself sees', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await login(page, 'copen@promo-efect.md', 'Agent2026!');
  await page.goto(BASE + '/dashboard/my-prices');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'e2e/local-stack/shots/agent-own-page.png', fullPage: true });

  // eslint-disable-next-line no-console
  console.log('AGENT ERRORS: ' + (errors.join(' | ') || '(none)'));
});

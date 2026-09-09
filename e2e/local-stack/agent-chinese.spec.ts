/**
 * The agent portal in Simplified Chinese.
 *
 * Mandarin in Simplified script, not Cantonese and not Traditional. Cantonese
 * is a spoken variety — business correspondence in Guangdong is written in
 * Standard Chinese — and every port Promo-Efect loads from is mainland, where
 * the written standard is Simplified.
 *
 * Chinese deliberately covers the agent's screens rather than the whole back
 * office, so this also checks the fallback: anything zh does not carry must
 * come out in English, never in Romanian.
 */
import { test, expect } from '@playwright/test';

import { AGENT_STATE } from './auth-paths';

test.use({ storageState: AGENT_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';
const RO_ONLY = /[ăâîșțĂÂÎȘȚ]/;

async function openInChinese(page: import('@playwright/test').Page) {
  await page.goto(BASE + '/dashboard');
  await page.evaluate(() => localStorage.setItem('language', 'zh'));
  await page.goto(BASE + '/dashboard/my-prices');
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
}

test('the rate table renders in Chinese', async ({ page }) => {
  test.setTimeout(90_000);
  await openInChinese(page);

  await expect(page.getByRole('heading', { name: '我的运价' })).toBeVisible();
  await expect(page.getByText('运价总数')).toBeVisible(); // total rates
  await expect(page.getByText('待审批').first()).toBeVisible(); // awaiting approval

  // Shipping vocabulary, not a literal gloss.
  await expect(page.getByText('船公司')).toBeVisible(); // shipping line
  await expect(page.getByText('箱型')).toBeVisible(); // container type
  await expect(page.getByText('有效期')).toBeVisible(); // validity
  await expect(page.getByText('开船')).toBeVisible(); // departure

  await page.screenshot({ path: 'e2e/local-stack/shots/agent-chinese.png', fullPage: true });
});

test('no Romanian reaches a Chinese agent, even where zh has no wording', async ({ page }) => {
  test.setTimeout(90_000);
  await openInChinese(page);
  const body = await page.locator('main').innerText();
  expect(body).not.toMatch(RO_ONLY);
});

test('the rate form is in Chinese too', async ({ page }) => {
  test.setTimeout(90_000);
  await openInChinese(page);
  await page.getByRole('button', { name: '添加运价' }).click();

  await expect(page.getByText('装货港')).toBeVisible(); // port of loading
  await expect(page.getByText('有效期自')).toBeVisible(); // valid from
  await expect(page.getByText('开船日期')).toBeVisible(); // departure date
  await page.screenshot({ path: 'e2e/local-stack/shots/agent-chinese-form.png' });
});

test('an agent is offered English and Chinese, and not Romanian', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(BASE + '/dashboard/my-prices');
  await page.waitForLoadState('networkidle').catch(() => {});

  const header = page.locator('header').first();
  await expect(header.getByRole('button', { name: '中文' })).toBeVisible();
  await expect(header.getByRole('button', { name: 'EN', exact: true })).toBeVisible();
  await expect(header.getByRole('button', { name: 'RO', exact: true })).toHaveCount(0);
  await expect(header.getByRole('button', { name: 'RU', exact: true })).toHaveCount(0);
});

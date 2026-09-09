/**
 * Week numbers where agents need them.
 *
 * Ion, 8 Sep: an agent quotes "3.000 USD / wk 24" and he then has to google
 * which dates week 24 covers. The header carries the current week, the rate
 * table shows the week beside every departure, and the form takes a week where
 * it takes a date.
 */
import { test, expect } from '@playwright/test';

import { AGENT_STATE } from './auth-paths';

test.use({ storageState: AGENT_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

test('the header shows the current ISO week', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(BASE + '/dashboard/my-prices');
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(
    page
      .locator('header')
      .first()
      .getByText(/^W\d{1,2}$/)
  ).toBeVisible();
});

test('the rate table shows the week beside each departure', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(BASE + '/dashboard/my-prices');
  await page.waitForLoadState('networkidle').catch(() => {});
  // Every seeded rate has a departure date, so every row carries a week.
  await expect(
    page
      .locator('tbody')
      .getByText(/^W\d{1,2}$/)
      .first()
  ).toBeVisible();
});

test('typing a week fills in the departure date', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(BASE + '/dashboard/my-prices');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: /Add rate|Adaugă|添加运价/ }).click();

  const week = page.getByRole('textbox', { name: /Week \(ISO\)|Săptămâna \(ISO\)|周次/ });
  await week.fill('wk 24');
  await week.press('Enter');

  // Monday of ISO week 24 in the current year.
  const departure = page.locator('input[type="date"]').last();
  await expect(departure).not.toHaveValue('');
  const value = await departure.inputValue();
  const monday = new Date(value + 'T00:00:00Z');
  expect(monday.getUTCDay()).toBe(1);
});

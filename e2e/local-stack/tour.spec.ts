/**
 * The first-visit walkthrough on the calculator.
 *
 * Ion, 8 Sep: important things on each page pointed out step by step, "mai
 * departe, mai departe". The two things that matter in a browser and not in a
 * unit test: it appears by itself the first time, and it never appears again
 * afterwards.
 */
import { test, expect } from '@playwright/test';

import { ADMIN_STATE } from './auth-paths';

test.use({ storageState: ADMIN_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

async function openCalculator(page: import('@playwright/test').Page, freshVisitor: boolean) {
  await page.goto(BASE + '/dashboard');
  await page.evaluate(
    ([fresh]) => {
      localStorage.setItem('language', 'ro');
      if (fresh) localStorage.removeItem('tour.seen.calculator');
      else localStorage.setItem('tour.seen.calculator', '1');
    },
    [freshVisitor]
  );
  await page.goto(BASE + '/dashboard/calculator');
  await page.waitForLoadState('networkidle').catch(() => {});
}

test('starts by itself for someone who has not seen it', async ({ page }) => {
  test.setTimeout(90_000);
  await openCalculator(page, true);

  const tour = page.getByRole('dialog');
  await expect(tour).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Începe cu condiția de livrare')).toBeVisible();
  await expect(page.getByText('Pasul 1 din 3')).toBeVisible();

  await page.screenshot({ path: 'e2e/local-stack/shots/tour.png' });
});

test('walks through the steps and remembers it is done', async ({ page }) => {
  test.setTimeout(90_000);
  await openCalculator(page, true);
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'Mai departe' }).click();
  await expect(page.getByText('Data când marfa e gata')).toBeVisible();

  await page.getByRole('button', { name: 'Mai departe' }).click();
  await expect(page.getByText('Vezi ofertele')).toBeVisible();

  await page.getByRole('button', { name: 'Am înțeles' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const seen = await page.evaluate(() => localStorage.getItem('tour.seen.calculator'));
  expect(seen).toBe('1');
});

test('stays out of the way on every later visit', async ({ page }) => {
  test.setTimeout(90_000);
  await openCalculator(page, false);
  await page.waitForTimeout(1500);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('can be replayed on demand', async ({ page }) => {
  test.setTimeout(90_000);
  await openCalculator(page, false);
  await page.getByRole('button', { name: 'Ghid pagină' }).click();
  await expect(page.getByText('Începe cu condiția de livrare')).toBeVisible();
});

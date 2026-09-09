/** Wide-screen captures, for looking at rather than asserting. */
import { test, expect } from '@playwright/test';
import { ADMIN_STATE } from './auth-paths';

test.use({ storageState: ADMIN_STATE, viewport: { width: 1920, height: 1080 } });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

test('offers, four across', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(BASE + '/dashboard');
  await page.evaluate(() => localStorage.setItem('language', 'ro'));
  await page.goto(BASE + '/dashboard/calculator');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.getByRole('button', { name: 'FOB', exact: true }).click();
  // Ports load from the API; submitting before they arrive fails validation.
  await expect
    .poll(async () => await page.locator('select').first().inputValue(), { timeout: 20000 })
    .not.toBe('');
  await page.fill('input[placeholder="ex. 23500"]', '23500');
  await page.fill(
    'input[type="date"]',
    new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)
  );
  await page.getByRole('button', { name: /Calculează/ }).click();
  await page.waitForTimeout(3500);
  // The offers start at the top of the right column, so frame the top.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'e2e/local-stack/shots/wide-offers.png' });
});

test('the globe, zoomed to the voyage', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(BASE + '/dashboard');
  await page.evaluate(() => localStorage.setItem('language', 'ro'));
  await page.goto(BASE + '/dashboard/fleet-map');
  const canvas = page.locator('canvas.maplibregl-canvas');
  await canvas.waitFor({ timeout: 30000 });
  await page.waitForTimeout(9000);

  // Open the card for the vessel south of Crete.
  const pt = await page.evaluate(() => {
    const map = (window as unknown as { __fleetGlobeMap?: import('maplibre-gl').Map })
      .__fleetGlobeMap;
    if (!map) return null;
    const p = map.project([24.18, 34.62]);
    return { x: p.x, y: p.y };
  });
  const box = await canvas.boundingBox();
  if (pt && box) {
    await page.mouse.click(box.x + pt.x, box.y + pt.y);
    await page.waitForTimeout(2500);
  }
  await page.screenshot({ path: 'e2e/local-stack/shots/wide-globe.png' });
});

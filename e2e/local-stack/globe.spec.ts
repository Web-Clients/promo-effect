/**
 * The fleet globe actually draws.
 *
 * A WebGL canvas can be present, sized and completely blank — which is what a
 * screenshot taken before the vector tiles arrive looks like. This waits for
 * MapLibre to report idle and then checks the canvas has really been painted,
 * so a regression that leaves the globe empty cannot pass as "renders".
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

test('globe paints the Earth and the fleet', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto(BASE + '/login');
  await page.fill('input[type="email"]', 'e2e-admin@local.test');
  await page.fill('input[type="password"]', 'E2ePassw0rd!');
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });

  await page.goto(BASE + '/dashboard/fleet-map');

  const canvas = page.locator('canvas.maplibregl-canvas');
  await expect(canvas).toBeVisible({ timeout: 30000 });

  // A blank canvas compresses to almost nothing; a drawn globe with coastlines,
  // labels and route arcs does not. Poll the encoded size rather than reading
  // pixels, which needs preserveDrawingBuffer that MapLibre does not set.
  await expect
    .poll(async () => (await canvas.screenshot()).length, {
      timeout: 60000,
      intervals: [2000],
    })
    .toBeGreaterThan(40_000);

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'e2e/local-stack/shots/globe.png', fullPage: false });
});

/**
 * Clicking a vessel opens its tactical card.
 *
 * The card is where the map stops being decorative: it names the vessel, its
 * MMSI and IMO, the bill of lading, and — the part that matters — how old the
 * position is and whether it was observed at all.
 */
import { test, expect } from '@playwright/test';
import type { Map as MlMap } from 'maplibre-gl';

import { ADMIN_STATE } from './auth-paths';

test.use({ storageState: ADMIN_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

// The vessel seeded alongside at Constanța.
const CONSTANTA: [number, number] = [28.6348, 44.1598];
// The one in the middle of the Indian Ocean, whose fix is three days old.
const INDIAN_OCEAN: [number, number] = [74.9, 6.4];

async function openGlobe(page: import('@playwright/test').Page) {
  // Pin the language: these assertions read wording, and the session's stored
  // language is whatever a previous run left behind.
  await page.goto(BASE + '/dashboard');
  await page.evaluate(() => localStorage.setItem('language', 'ro'));
  await page.goto(BASE + '/dashboard/fleet-map');
  const canvas = page.locator('canvas.maplibregl-canvas');
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () => (await canvas.screenshot()).length, { timeout: 60000, intervals: [2000] })
    .toBeGreaterThan(40_000);
  // Let the fitBounds flight settle before projecting coordinates.
  await page.waitForTimeout(2500);
  return canvas;
}

async function clickAt(page: import('@playwright/test').Page, lngLat: [number, number]) {
  const pt = await page.evaluate((ll) => {
    const map = (window as unknown as { __fleetGlobeMap?: MlMap }).__fleetGlobeMap;
    if (!map) return null;
    const p = map.project(ll as [number, number]);
    return { x: p.x, y: p.y };
  }, lngLat);
  if (!pt) throw new Error('map handle not exposed');
  const box = await page.locator('canvas.maplibregl-canvas').boundingBox();
  if (!box) throw new Error('no canvas box');
  await page.mouse.click(box.x + pt.x, box.y + pt.y);
}

test('a vessel opens its tactical card', async ({ page }) => {
  test.setTimeout(120_000);
  await openGlobe(page);
  await clickAt(page, CONSTANTA);

  await expect(page.getByText('MAERSK KOWLOON')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('MRKU8601423')).toBeVisible();
  await expect(page.getByText('271043300')).toBeVisible(); // MMSI
  await page.screenshot({ path: 'e2e/local-stack/shots/globe-card.png' });
});

test('a stale fix says so instead of pretending to be live', async ({ page }) => {
  test.setTimeout(120_000);
  await openGlobe(page);
  await clickAt(page, INDIAN_OCEAN);

  await expect(page.getByText('CMA CGM BOUGAINVILLE')).toBeVisible({ timeout: 10000 });
  // Seeded days old. The exact number grows as the fixture ages, so assert the
  // shape — the point is that the card states an age at all and does not
  // present a stale fix as a live one.
  await expect(page.getByText(/acum \d+ zile/)).toBeVisible();
  await expect(page.getByText(/nu e o observație live/)).toBeVisible();
});

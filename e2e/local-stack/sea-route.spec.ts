/**
 * The route drawn on the globe is a route a ship could sail.
 *
 * The first version drew a great-circle arc from the loading port to the
 * vessel. It looked clean and it crossed India, Iran and Anatolia. On a
 * logistics map that is the one thing that must not be wrong.
 */
import { test, expect } from '@playwright/test';
import type { Map as MlMap } from 'maplibre-gl';

import { ADMIN_STATE } from './auth-paths';

test.use({ storageState: ADMIN_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

test('the drawn track follows the sea lane, not a line over land', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(BASE + '/dashboard');
  await page.evaluate(() => localStorage.setItem('language', 'ro'));
  await page.goto(BASE + '/dashboard/fleet-map');

  const canvas = page.locator('canvas.maplibregl-canvas');
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () => (await canvas.screenshot()).length, { timeout: 60000, intervals: [2000] })
    .toBeGreaterThan(40_000);
  await page.waitForTimeout(2500);

  // Read the geometry the map is actually rendering.
  const points: [number, number][] = await page.evaluate(() => {
    const map = (window as unknown as { __fleetGlobeMap?: MlMap }).__fleetGlobeMap;
    if (!map) return [];
    // querySourceFeatures is the public way in; the source's _data is private
    // and does not hold the collection in the shape it was set with.
    const feats = map.querySourceFeatures('routes');
    const out: [number, number][] = [];
    for (const f of feats) {
      if (f.geometry.type === 'LineString') {
        out.push(...(f.geometry.coordinates as [number, number][]));
      }
    }
    return out;
  });

  expect(points.length).toBeGreaterThan(50);

  // Boxes the Asia–Europe corridor must never enter.
  const land = [
    { name: 'central India', lonMin: 73, lonMax: 88, latMin: 12, latMax: 30 },
    { name: 'Iran', lonMin: 52, lonMax: 70, latMin: 25, latMax: 38 },
    { name: 'Anatolia', lonMin: 30, lonMax: 42, latMin: 37, latMax: 41 },
  ];
  for (const box of land) {
    const inside = points.filter(
      ([lon, lat]) =>
        lon >= box.lonMin && lon <= box.lonMax && lat >= box.latMin && lat <= box.latMax
    );
    expect(`${box.name}:${inside.length}`).toBe(`${box.name}:0`);
  }

  // And it does pass the places ships actually pass.
  const near = (lon: number, lat: number, tol = 3) =>
    points.some(([x, y]) => Math.abs(x - lon) < tol && Math.abs(y - lat) < tol);
  expect(near(103.85, 1.25)).toBe(true); // Singapore Strait
  expect(near(32.55, 29.95)).toBe(true); // Suez

  await page.screenshot({ path: 'e2e/local-stack/shots/sea-route.png' });
});

test('the tactical card reports how far along the voyage is', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(BASE + '/dashboard');
  await page.evaluate(() => localStorage.setItem('language', 'ro'));
  await page.goto(BASE + '/dashboard/fleet-map');
  const canvas = page.locator('canvas.maplibregl-canvas');
  await expect(canvas).toBeVisible({ timeout: 30000 });
  await expect
    .poll(async () => (await canvas.screenshot()).length, { timeout: 60000, intervals: [2000] })
    .toBeGreaterThan(40_000);
  await page.waitForTimeout(2500);

  const pt = await page.evaluate(() => {
    const map = (window as unknown as { __fleetGlobeMap?: MlMap }).__fleetGlobeMap;
    if (!map) return null;
    const p = map.project([24.18, 34.62]); // the vessel south of Crete
    return { x: p.x, y: p.y };
  });
  const box = await canvas.boundingBox();
  if (!pt || !box) throw new Error('no map handle');
  await page.mouse.click(box.x + pt.x, box.y + pt.y);

  await expect(page.getByText('Parcurs')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(/km parcurși/)).toBeVisible();
});

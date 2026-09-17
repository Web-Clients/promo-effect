/**
 * The fleet moves between AIS fixes.
 *
 * AIS reports every few minutes; the map polls every fifteen seconds. Drawing
 * only what arrived leaves ships standing still and jumping sideways, which is
 * how the globe shipped. Each vessel is now carried along its reported course
 * at its reported speed, and this spec checks it actually travels — and travels
 * the right way, at roughly the right speed.
 *
 * The fleet payload is served by the test rather than by AIS, so the expected
 * track is arithmetic rather than whatever happens to be at sea today.
 */
import { test, expect } from '@playwright/test';
import { ADMIN_STATE } from './auth-paths';

test.use({ storageState: ADMIN_STATE });

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3011';

/** One container steaming due east at 20 knots, and one drifting hulk. */
const payload = {
  fleet: [
    {
      containerId: 'c-moving',
      containerNumber: 'MSKU1234567',
      blNumber: 'BL-1',
      currentStatus: 'IN_TRANSIT',
      eta: null,
      vessel: { mmsi: '111111111', name: 'TEST RUNNER', imo: null },
      position: {
        latitude: 0,
        longitude: 60,
        sog: 20,
        cog: 90,
        heading: 90,
        destination: 'CONSTANTA',
        timestamp: new Date().toISOString(),
        source: 'AIS_LIVE',
      },
      booking: {
        id: 'b-1',
        origin: 'Ningbo',
        transit: null,
        destination: 'Constanța',
        originCoords: { lat: 29.868, lng: 121.544, name: 'Ningbo' },
        transitCoords: null,
        destinationCoords: { lat: 44.173, lng: 28.638, name: 'Constanța' },
      },
    },
    {
      containerId: 'c-moored',
      containerNumber: 'MSKU7654321',
      blNumber: 'BL-2',
      currentStatus: 'IN_TRANSIT',
      eta: null,
      vessel: { mmsi: '222222222', name: 'TEST ANCHOR', imo: null },
      position: {
        latitude: 10,
        longitude: 70,
        sog: 0,
        cog: 0,
        heading: 0,
        destination: null,
        timestamp: new Date().toISOString(),
        source: 'AIS_LIVE',
      },
      booking: null,
    },
  ],
  ambient: [{ mmsi: '333333333', name: 'AMBIENT', lat: 5, lng: 65, cog: 0, heading: 0, sog: 30 }],
  fetchedAt: new Date().toISOString(),
};

/**
 * Read a source's own GeoJSON rather than what is drawn.
 *
 * `querySourceFeatures` returns tile geometry, quantised to 4096 units per
 * tile — at world zoom that is about a twentieth of a degree, so a minute of
 * sailing rounds away to nothing. The source data is what the map was told.
 */
async function sourceData(page: import('@playwright/test').Page, source: string) {
  return page.evaluate((id) => {
    const src = (window as any).__fleetGlobeMap?.getSource(id);
    const data = src?.serialize?.().data ?? src?._data;
    return (data?.features || []) as any[];
  }, source);
}

async function vesselLngLat(page: import('@playwright/test').Page, containerId: string) {
  const features = await sourceData(page, 'vessels');
  const f = features.find((x) => x.properties?.containerId === containerId);
  return f ? (f.geometry.coordinates as [number, number]) : null;
}

test('a vessel keeps sailing between fixes, and a moored one does not', async ({ page }) => {
  test.setTimeout(120_000);

  await page.route('**/api/tracking/search/fleet/live', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  );

  await page.goto(BASE + '/dashboard/fleet-map');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !!(window as any).__fleetGlobeMap?.isStyleLoaded(), null, {
    timeout: 30_000,
  });
  await page.waitForFunction(
    () => {
      const src = (window as any).__fleetGlobeMap?.getSource('vessels');
      const data = src?.serialize?.().data ?? src?._data;
      return (data?.features || []).length > 0;
    },
    null,
    { timeout: 30_000 }
  );

  const movingStart = await vesselLngLat(page, 'c-moving');
  const mooredStart = await vesselLngLat(page, 'c-moored');
  expect(movingStart).not.toBeNull();

  const SECONDS = 6;
  await page.waitForTimeout(SECONDS * 1000);

  const movingEnd = await vesselLngLat(page, 'c-moving');
  const mooredEnd = await vesselLngLat(page, 'c-moored');

  // 20 knots due east on the equator: 20/3600 nm per second, 60 nm to a degree.
  const expectedDeg = (20 / 3600 / 60) * SECONDS;
  const travelled = movingEnd![0] - movingStart![0];

  expect(travelled).toBeGreaterThan(expectedDeg * 0.5);
  expect(travelled).toBeLessThan(expectedDeg * 2);
  // Due east means the latitude must not drift.
  expect(Math.abs(movingEnd![1] - movingStart![1])).toBeLessThan(1e-6);

  // A vessel reporting no speed is left exactly where it said it was.
  expect(mooredEnd![0]).toBeCloseTo(mooredStart![0], 9);
  expect(mooredEnd![1]).toBeCloseTo(mooredStart![1], 9);
});

test('the sailed track ends at the ship, not at its last fix', async ({ page }) => {
  test.setTimeout(120_000);

  await page.route('**/api/tracking/search/fleet/live', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  );

  await page.goto(BASE + '/dashboard/fleet-map');
  await page.waitForFunction(
    () => {
      const src = (window as any).__fleetGlobeMap?.getSource('routes');
      const data = src?.serialize?.().data ?? src?._data;
      return (data?.features || []).length > 0;
    },
    null,
    { timeout: 30_000 }
  );
  await page.waitForTimeout(4000);

  const vessels = await sourceData(page, 'vessels');
  const routes = await sourceData(page, 'routes');
  const vessel = vessels.find((f) => f.properties?.containerId === 'c-moving');
  const sailed = routes.find(
    (f) => f.properties?.containerId === 'c-moving' && f.properties?.sailed === 1
  );
  const gap =
    vessel && sailed
      ? (() => {
          const line = sailed.geometry.coordinates as [number, number][];
          const tip = line[line.length - 1];
          const here = vessel.geometry.coordinates as [number, number];
          return Math.hypot(tip[0] - here[0], tip[1] - here[1]);
        })()
      : null;

  expect(gap).not.toBeNull();
  // Degrees: the track's tip and the ship are the same point, give or take the
  // few hundred milliseconds between the two source reads.
  expect(gap!).toBeLessThan(0.01);
});

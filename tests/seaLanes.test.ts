/**
 * The route a ship actually sails.
 *
 * The first version of the fleet map drew a great-circle arc from the loading
 * port to the vessel. It looked clean and it ran across India, Iran and
 * Anatolia. On a logistics map that is not a rounding error.
 *
 * These tests check the corridor stays at sea where it matters: through the
 * straits and canals, and not through the landmasses between them.
 */

import { describe, it, expect } from 'vitest';
import { seaRoute, progressAlong, routeLengthKm, greatCircle, Coord } from '../utils/seaLanes';

/** Rough land boxes the Asia–Europe corridor must never enter. */
const LAND = [
  { name: 'central India', lonMin: 73, lonMax: 88, latMin: 12, latMax: 30 },
  { name: 'Iran / Afghanistan', lonMin: 52, lonMax: 70, latMin: 25, latMax: 38 },
  { name: 'Saudi interior', lonMin: 41, lonMax: 50, latMin: 20, latMax: 30 },
  { name: 'Anatolia', lonMin: 30, lonMax: 42, latMin: 37, latMax: 41 },
  { name: 'Sahara / Egypt west of the Nile', lonMin: 25, lonMax: 31, latMin: 24, latMax: 30 },
];

function inBox(p: Coord, box: (typeof LAND)[number]) {
  return p[0] >= box.lonMin && p[0] <= box.lonMax && p[1] >= box.latMin && p[1] <= box.latMax;
}

describe('seaRoute', () => {
  const route = seaRoute('Ningbo', 'Constanța');

  it('exists for the lane Promo-Efect actually runs', () => {
    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(50);
  });

  it('starts at the loading port and ends at the discharge port', () => {
    expect(route![0][0]).toBeCloseTo(121.544, 1);
    expect(route![0][1]).toBeCloseTo(29.868, 1);
    const last = route![route!.length - 1];
    expect(last[0]).toBeCloseTo(28.638, 1);
    expect(last[1]).toBeCloseTo(44.173, 1);
  });

  it('never crosses the landmasses a great circle would have', () => {
    for (const box of LAND) {
      const crossings = route!.filter((p) => inBox(p, box));
      expect(`${box.name}: ${crossings.length}`).toBe(`${box.name}: 0`);
    }
  });

  it('passes through Singapore, Bab-el-Mandeb and Suez', () => {
    const near = (lon: number, lat: number, tol = 2.5) =>
      route!.some((p) => Math.abs(p[0] - lon) < tol && Math.abs(p[1] - lat) < tol);

    expect(near(103.85, 1.25)).toBe(true); // Singapore Strait
    expect(near(43.4, 12.6)).toBe(true); // Bab-el-Mandeb
    expect(near(32.55, 29.95)).toBe(true); // Suez
    expect(near(29.05, 41.1)).toBe(true); // Bosphorus
  });

  it('is roughly the real distance, not the straight-line one', () => {
    // Ningbo to Constanța via Suez is about 10.000 nautical miles — call it
    // 17.000–22.000 km. A great circle would be around 8.000 km, so a result in
    // that range would mean the corridor was being skipped.
    const km = routeLengthKm(route!);
    expect(km).toBeGreaterThan(15000);
    expect(km).toBeLessThan(24000);
  });

  it('reverses cleanly for the return leg', () => {
    const back = seaRoute('Constanța', 'Ningbo');
    expect(back).not.toBeNull();
    expect(back![0][0]).toBeCloseTo(28.638, 1);
    expect(back![back!.length - 1][0]).toBeCloseTo(121.544, 1);
  });

  it('handles the diacritics the platform stores', () => {
    expect(seaRoute('Ningbo', 'Constanta')).not.toBeNull();
    expect(seaRoute('Ningbo', 'Constanța')).not.toBeNull();
  });

  it('returns null for a lane it does not know, rather than inventing one', () => {
    expect(seaRoute('Ningbo', 'Reykjavik')).toBeNull();
    expect(seaRoute('', 'Constanța')).toBeNull();
  });

  it('routes a southern Chinese port without the northern leg', () => {
    const fromShenzhen = seaRoute('Shenzhen', 'Constanța')!;
    // Must not sail north into the East China Sea before heading south-west.
    // Checked in Chinese waters only — the European end is at 44°N by nature.
    const northOfShenzhenInChina = fromShenzhen.filter((p) => p[0] > 112 && p[1] > 26);
    expect(northOfShenzhenInChina).toEqual([]);

    // And it should be shorter than the same voyage from Ningbo.
    expect(routeLengthKm(fromShenzhen)).toBeLessThan(
      routeLengthKm(seaRoute('Ningbo', 'Constanța')!)
    );
  });
});

describe('progressAlong', () => {
  const route = seaRoute('Ningbo', 'Constanța')!;

  it('puts a vessel in the Red Sea most of the way along', () => {
    const p = progressAlong(route, [38.0, 20.0])!;
    expect(p.fraction).toBeGreaterThan(0.6);
    expect(p.fraction).toBeLessThan(0.95);
  });

  it('puts a vessel just out of Ningbo near the start', () => {
    const p = progressAlong(route, [122.0, 29.5])!;
    expect(p.fraction).toBeLessThan(0.1);
  });

  it('measures along the route, not as the crow flies', () => {
    // A ship in the Red Sea is closer to Ningbo in a straight line than one in
    // the middle of the Indian Ocean, so straight-line progress would show it
    // going backwards.
    const indian = progressAlong(route, [70.0, 9.0])!;
    const redSea = progressAlong(route, [38.0, 20.0])!;
    expect(redSea.fraction).toBeGreaterThan(indian.fraction);
  });

  it('splits the distance into sailed and remaining', () => {
    const p = progressAlong(route, [38.0, 20.0])!;
    expect(p.sailedKm + p.remainingKm).toBeCloseTo(routeLengthKm(route), -2);
  });

  it('returns null for a route too short to measure', () => {
    expect(progressAlong([[0, 0]], [1, 1])).toBeNull();
  });
});

describe('greatCircle', () => {
  it('keeps both endpoints', () => {
    const g = greatCircle([0, 0], [10, 10], 4);
    expect(g[0]).toEqual([0, 0]);
    expect(g[g.length - 1][0]).toBeCloseTo(10, 5);
  });

  it('bulges toward the pole on a long east-west leg', () => {
    // The whole point of interpolating on a sphere rather than in a rectangle.
    const g = greatCircle([-60, 50], [10, 50], 10);
    const mid = g[Math.floor(g.length / 2)];
    expect(mid[1]).toBeGreaterThan(50);
  });
});

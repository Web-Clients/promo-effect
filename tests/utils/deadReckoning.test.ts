import { describe, expect, it } from 'vitest';
import {
  MAX_PROJECTION_MS,
  isNewFix,
  normalizeLng,
  projectPosition,
  type DrFix,
} from '../../utils/deadReckoning';

const fix = (over: Partial<DrFix> = {}): DrFix => ({
  lat: 0,
  lng: 0,
  sogKnots: 12,
  cogDeg: 0,
  observedAtMs: 0,
  ...over,
});

const HOUR = 3_600_000;

describe('projecting a vessel forward', () => {
  // Ten minutes: inside the projection cap, so the arithmetic is the plain one.
  const TEN_MIN = 600_000;

  it('carries it due north at its reported speed', () => {
    // 12 knots for ten minutes is 2 nautical miles, and 60 nm is a degree.
    const p = projectPosition(fix({ cogDeg: 0 }), TEN_MIN);
    expect(p.lat).toBeCloseTo(2 / 60, 6);
    expect(p.lng).toBeCloseTo(0, 6);
  });

  it('carries it due east along a parallel', () => {
    const p = projectPosition(fix({ cogDeg: 90 }), TEN_MIN);
    expect(p.lng).toBeCloseTo(2 / 60, 6);
    expect(p.lat).toBeCloseTo(0, 6);
  });

  it('needs more degrees of longitude the further from the equator', () => {
    const equator = projectPosition(fix({ cogDeg: 90, lat: 0 }), HOUR);
    const north = projectPosition(fix({ cogDeg: 90, lat: 60 }), HOUR);
    // cos(60°) = 0.5, so the same distance is twice the longitude.
    expect(north.lng).toBeCloseTo(equator.lng * 2, 5);
  });

  it('leaves a moored vessel where it is', () => {
    expect(projectPosition(fix({ sogKnots: 0.1 }), HOUR)).toMatchObject({ lat: 0, lng: 0 });
    expect(projectPosition(fix({ sogKnots: null }), HOUR).projectedMs).toBe(0);
  });

  it('will not sail on a course it does not have', () => {
    expect(projectPosition(fix({ cogDeg: null }), HOUR).projectedMs).toBe(0);
  });

  it('stops guessing once the fix is too old', () => {
    const capped = projectPosition(fix(), 5 * HOUR);
    const atCap = projectPosition(fix(), MAX_PROJECTION_MS);
    expect(capped.projectedMs).toBe(MAX_PROJECTION_MS);
    expect(capped.lat).toBeCloseTo(atCap.lat, 9);
  });

  it('ignores a clock that runs backwards', () => {
    expect(projectPosition(fix({ observedAtMs: HOUR }), 0).projectedMs).toBe(0);
  });

  it('keeps a vessel crossing the date line on the map', () => {
    const p = projectPosition(fix({ lng: 179.99, cogDeg: 90, sogKnots: 20 }), HOUR);
    expect(p.lng).toBeLessThan(-179);
    expect(p.lng).toBeGreaterThanOrEqual(-180);
  });

  it('reports how much of the movement was inferred', () => {
    expect(projectPosition(fix(), 60_000).projectedMs).toBe(60_000);
  });
});

describe('normalizeLng', () => {
  it.each([
    [0, 0],
    [180, 180],
    [181, -179],
    [-181, 179],
    [540, 180],
  ])('%s → %s', (input, expected) => {
    expect(normalizeLng(input)).toBe(expected);
  });
});

describe('isNewFix', () => {
  it('is true with nothing to compare against', () => {
    expect(isNewFix(undefined, fix())).toBe(true);
  });

  it('is false when the poll returned the same fix', () => {
    expect(isNewFix(fix({ observedAtMs: 0 }), fix({ observedAtMs: 9_000 }))).toBe(false);
  });

  it('is true once the vessel reports a new position', () => {
    expect(isNewFix(fix(), fix({ lat: 0.001 }))).toBe(true);
  });
});

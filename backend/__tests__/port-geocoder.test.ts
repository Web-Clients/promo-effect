/**
 * Unit tests for port-geocoder.service.
 * Covers UN/LOCODE lookup, alias map, embedded-code extraction, and
 * graceful nulls.
 */

import { geocodePort } from '../src/services/port-geocoder.service';

describe('geocodePort', () => {
  test('returns null for empty / nullish input', () => {
    expect(geocodePort(undefined)).toBeNull();
    expect(geocodePort(null)).toBeNull();
    expect(geocodePort('')).toBeNull();
    expect(geocodePort('   ')).toBeNull();
  });

  test('resolves a known UN/LOCODE directly', () => {
    const p = geocodePort('CNNGB');
    expect(p).not.toBeNull();
    expect(p!.name).toBe('Ningbo');
    expect(p!.lat).toBeCloseTo(29.87, 1);
  });

  test('is case-insensitive', () => {
    expect(geocodePort('cnsha')).toEqual(geocodePort('CNSHA'));
  });

  test('extracts embedded UN/LOCODE from a longer string', () => {
    const p = geocodePort('Constanța Port (ROCND)');
    expect(p).not.toBeNull();
    expect(p!.code).toBe('ROCND');
  });

  test('resolves common port aliases by name', () => {
    expect(geocodePort('SHANGHAI')!.code).toBe('CNSHA');
    expect(geocodePort('Constanta')!.code).toBe('ROCND');
    expect(geocodePort('Odessa')!.code).toBe('UAODS');
    expect(geocodePort('Antwerp')!.code).toBe('BEANR');
  });

  test('handles substring containment as a last resort', () => {
    expect(geocodePort('Departed Shanghai, China')!.code).toBe('CNSHA');
    expect(geocodePort('Constanta South Container Terminal')!.code).toBe('ROCND');
  });

  test('returns null for unknown ports', () => {
    expect(geocodePort('XXXXX')).toBeNull();
    expect(geocodePort('NoSuchPort')).toBeNull();
  });

  test('Constanța lat/lng matches Romania', () => {
    const p = geocodePort('ROCND')!;
    expect(p.country).toBe('RO');
    expect(p.lat).toBeGreaterThan(43);
    expect(p.lat).toBeLessThan(45);
    expect(p.lng).toBeGreaterThan(28);
    expect(p.lng).toBeLessThan(29);
  });
});

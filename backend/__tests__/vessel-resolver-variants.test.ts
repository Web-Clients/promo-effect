/**
 * Unit tests for vessel-resolver's variants() generator.
 * No DB / network calls — pure string manipulation.
 */

import { variants } from '../src/services/vessel-resolver.service';

describe('variants', () => {
  test('always includes the normalized base name', () => {
    expect(variants('msc gulsun')).toContain('MSC GULSUN');
    expect(variants('  MSC   GULSUN  ')).toContain('MSC GULSUN');
  });

  test('strips M/V and MV prefixes', () => {
    expect(variants('M/V MSC GULSUN')).toContain('MSC GULSUN');
    expect(variants('MV LIMARKO BREEZE')).toContain('LIMARKO BREEZE');
    expect(variants('SS QUEEN ELIZABETH')).toContain('QUEEN ELIZABETH');
  });

  test('strips single trailing letter suffix (flag of convenience)', () => {
    expect(variants('MSC GULSUN F')).toContain('MSC GULSUN');
    expect(variants('NAVIOS AZURE A')).toContain('NAVIOS AZURE');
  });

  test('converts trailing Roman numerals to arabic', () => {
    expect(variants('MSC GULSUN II')).toContain('MSC GULSUN 2');
    expect(variants('NORTH STAR III')).toContain('NORTH STAR 3');
  });

  test('converts trailing arabic numerals to Roman', () => {
    expect(variants('MSC GULSUN 2')).toContain('MSC GULSUN II');
  });

  test('strips diacritics', () => {
    const v = variants('MÆRSK ELBA');
    // Should contain at least one variant without the ligature
    expect(v.some((s) => !s.includes('Æ'))).toBe(true);
  });

  test('removes punctuation noise', () => {
    expect(variants('CMA-CGM MARCO POLO')).toContain('CMA CGM MARCO POLO');
  });

  test('filters out very short candidates', () => {
    const v = variants('A');
    // Single-letter input → all variants <3 chars → filtered to empty
    expect(v.length).toBe(0);
  });

  test('returns distinct values (Set-deduped)', () => {
    const v = variants('MSC GULSUN');
    expect(new Set(v).size).toBe(v.length);
  });

  test('Roman conversion is anchored to word end (does not corrupt names with I in middle)', () => {
    const v = variants('CHIPOLBROK');
    // No trailing I/II/etc, so the only variants should be the base + possibly clean noise
    expect(v).toContain('CHIPOLBROK');
    // No accidental conversion in the middle
    expect(v.every((s) => !s.includes('1HIPOLBROK'))).toBe(true);
  });
});

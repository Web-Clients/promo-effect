/**
 * Matching a cargo weight against an agent's weight band.
 *
 * The calculator sends the weight the client typed — "23500", in kilograms —
 * while an agent stores a band, "23-24", in tonnes. computeFromAgentPrices
 * compared the two for exact equality, so no agent rate could ever match on
 * weight. It is the same class of defect as the container labels: the rate
 * saves, looks correct in the agent's table, and is invisible to every quote.
 *
 * Bands are written several ways by different people, so the parser has to be
 * generous about form and strict about meaning.
 */

import {
  parseWeightBand,
  weightBandMatches,
  toTonnes,
} from '../src/modules/calculator/weight-band';

describe('toTonnes', () => {
  it('reads kilograms', () => {
    expect(toTonnes('23500')).toBe(23.5);
    expect(toTonnes('23500 kg')).toBe(23.5);
  });

  it('reads a value already in tonnes', () => {
    expect(toTonnes('23.5 t')).toBe(23.5);
    expect(toTonnes('23,5 tone')).toBe(23.5);
  });

  it('treats a small bare number as tonnes, not kilograms', () => {
    // Nobody ships 23 kilograms in a 40HQ. A bare 23 is 23 tonnes.
    expect(toTonnes('23')).toBe(23);
  });

  it('returns null on nonsense rather than guessing', () => {
    expect(toTonnes('')).toBeNull();
    expect(toTonnes('heavy')).toBeNull();
  });
});

describe('parseWeightBand', () => {
  it('reads the plain form', () => {
    expect(parseWeightBand('23-24')).toEqual({ min: 23, max: 24 });
  });

  it('reads the forms people actually type', () => {
    for (const text of ['23-24 t', '23 - 24 tone', '23–24t', '23 to 24 t']) {
      expect(parseWeightBand(text)).toEqual({ min: 23, max: 24 });
    }
  });

  it('reads an open-ended lower band', () => {
    expect(parseWeightBand('<23')).toEqual({ min: 0, max: 23 });
    expect(parseWeightBand('sub 23 t')).toEqual({ min: 0, max: 23 });
  });

  it('reads an open-ended upper band', () => {
    expect(parseWeightBand('>28')).toEqual({ min: 28, max: Infinity });
    expect(parseWeightBand('28+')).toEqual({ min: 28, max: Infinity });
  });

  it('returns null on nonsense', () => {
    expect(parseWeightBand('')).toBeNull();
    expect(parseWeightBand('light')).toBeNull();
  });
});

describe('weightBandMatches', () => {
  it('matches a kilogram weight against a tonne band', () => {
    // The case that was silently failing.
    expect(weightBandMatches('23-24', '23500')).toBe(true);
  });

  it('is inclusive at both ends', () => {
    expect(weightBandMatches('23-24', '23000')).toBe(true);
    expect(weightBandMatches('23-24', '24000')).toBe(true);
  });

  it('rejects a weight outside the band', () => {
    expect(weightBandMatches('23-24', '25000')).toBe(false);
    expect(weightBandMatches('23-24', '22000')).toBe(false);
  });

  it('handles the open-ended bands', () => {
    expect(weightBandMatches('<23', '20000')).toBe(true);
    expect(weightBandMatches('<23', '24000')).toBe(false);
    expect(weightBandMatches('>28', '30000')).toBe(true);
  });

  it('falls back to exact text equality when the band cannot be parsed', () => {
    // Some rates carry a label rather than a range. Matching the text keeps
    // those working instead of dropping them.
    expect(weightBandMatches('orice greutate', 'orice greutate')).toBe(true);
    expect(weightBandMatches('orice greutate', '23500')).toBe(false);
  });

  it('refuses rather than guessing when the weight is unreadable', () => {
    expect(weightBandMatches('23-24', 'heavy')).toBe(false);
  });
});

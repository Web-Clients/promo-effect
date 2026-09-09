/**
 * A quote has to say how long it is good for.
 *
 * Ion, 8 Sep (44:23): "Noi acum când deschidem oferta... noi trebuie să vedem
 * valabilitatea ofertei." Rates arrive from the Chinese agents roughly every
 * two weeks, so an offer with no visible end date is one nobody can act on with
 * confidence — and it is why he kept asking whether what he was looking at was
 * still live.
 *
 * The window shown is the narrowest one of the rates the offer is built from:
 * an offer is only quotable while every rate behind it still is.
 */

import { narrowestWindow } from '../src/modules/calculator/rate-validity';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('narrowestWindow', () => {
  it('returns the single window when there is only one rate', () => {
    expect(narrowestWindow([{ validFrom: d('2026-09-01'), validUntil: d('2026-09-30') }])).toEqual({
      validFrom: d('2026-09-01'),
      validUntil: d('2026-09-30'),
    });
  });

  it('takes the latest start and the earliest end', () => {
    // A 20DV rate and a 40HQ rate on one booking: the offer dies with whichever
    // expires first, and cannot be quoted before both have started.
    expect(
      narrowestWindow([
        { validFrom: d('2026-09-01'), validUntil: d('2026-09-30') },
        { validFrom: d('2026-09-05'), validUntil: d('2026-09-20') },
      ])
    ).toEqual({ validFrom: d('2026-09-05'), validUntil: d('2026-09-20') });
  });

  it('returns null for no rates rather than an invented window', () => {
    expect(narrowestWindow([])).toBeNull();
  });

  it('survives a row with no dates instead of producing an invalid window', () => {
    expect(
      narrowestWindow([
        { validFrom: d('2026-09-01'), validUntil: d('2026-09-30') },
        { validFrom: null, validUntil: null },
      ])
    ).toEqual({ validFrom: d('2026-09-01'), validUntil: d('2026-09-30') });
  });

  it('reports an impossible window rather than hiding it', () => {
    // Two rates that never overlap cannot be quoted together. Returning a
    // window whose end precedes its start makes that visible to the caller
    // instead of silently producing a plausible-looking one.
    const w = narrowestWindow([
      { validFrom: d('2026-09-01'), validUntil: d('2026-09-10') },
      { validFrom: d('2026-09-20'), validUntil: d('2026-09-30') },
    ]);
    expect(w).not.toBeNull();
    expect(w!.validUntil.getTime()).toBeLessThan(w!.validFrom.getTime());
  });
});

describe('daysUntilExpiry', () => {
  const { daysUntilExpiry } = jest.requireActual('../src/modules/calculator/rate-validity');

  it('counts whole days left', () => {
    expect(daysUntilExpiry(d('2026-09-15'), d('2026-09-08'))).toBe(7);
  });

  it('is zero on the last day, not negative', () => {
    expect(daysUntilExpiry(d('2026-09-08'), d('2026-09-08'))).toBe(0);
  });

  it('goes negative once expired, so a caller can tell', () => {
    expect(daysUntilExpiry(d('2026-09-01'), d('2026-09-08'))).toBe(-7);
  });
});

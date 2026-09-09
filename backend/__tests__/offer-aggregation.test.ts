/**
 * Which offers a client is shown.
 *
 * Ion, 8 Sep. He wants the rates his Chinese agents enter to reach the client's
 * offer screen — several agents quote the same lane, and the client should see
 * the market rather than one number. But not all of it: "să nu arate zece
 * oferte inutile" (58:38). Three agents quoting Evergreen for the same sailing
 * week is one offer, not three, and the one that survives is the cheapest.
 *
 * What he wants beside it is a different carrier or a different week: "să vină
 * o ofertă de la Green, o ofertă de la CMG, o ofertă de la Cosco. Zile diferite"
 * (57:04).
 *
 * So the key is (shipping line, departure week) and the winner is the lowest
 * total. Sorting by price alone — which is what the calculator did — would have
 * filled the screen with the same carrier three times.
 */

import { bestPerLineAndWeek, isoWeekKey } from '../src/modules/calculator/offer-aggregation';

interface TestOffer {
  shippingLine: string;
  totalPriceUSD: number;
  departureDate?: Date | null;
  agentCompany?: string;
}

const offer = (
  shippingLine: string,
  totalPriceUSD: number,
  departureDate: string,
  agentCompany?: string
): TestOffer => ({
  shippingLine,
  totalPriceUSD,
  departureDate: new Date(`${departureDate}T00:00:00.000Z`),
  agentCompany,
});

describe('isoWeekKey', () => {
  it('puts a Monday and the Sunday after it in the same week', () => {
    expect(isoWeekKey(new Date('2026-09-07T00:00:00Z'))).toBe(
      isoWeekKey(new Date('2026-09-13T00:00:00Z'))
    );
  });

  it('separates that Sunday from the Monday after it', () => {
    expect(isoWeekKey(new Date('2026-09-13T00:00:00Z'))).not.toBe(
      isoWeekKey(new Date('2026-09-14T00:00:00Z'))
    );
  });

  it('carries the ISO week year, so new year does not collide with last', () => {
    // 31 Dec 2024 belongs to week 1 of 2025; 30 Dec 2024 to week 1 too.
    expect(isoWeekKey(new Date('2024-12-31T00:00:00Z'))).toBe('2025-W01');
  });
});

describe('bestPerLineAndWeek', () => {
  it('keeps one offer when three agents quote the same line and week', () => {
    const kept = bestPerLineAndWeek([
      offer('Evergreen', 6250, '2026-09-21', 'Copen'),
      offer('Evergreen', 6180, '2026-09-22', 'XinYun'),
      offer('Evergreen', 6400, '2026-09-23', 'CMG'),
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].totalPriceUSD).toBe(6180);
    expect(kept[0].agentCompany).toBe('XinYun');
  });

  it('keeps a different carrier on the same week', () => {
    const kept = bestPerLineAndWeek([
      offer('Evergreen', 6250, '2026-09-21'),
      offer('CMA CGM', 6400, '2026-09-22'),
      offer('Cosco', 6300, '2026-09-23'),
    ]);
    expect(kept).toHaveLength(3);
  });

  it('keeps the same carrier on a different week', () => {
    // Ion asked for different sailing dates explicitly — a cheaper rate two
    // weeks out is a real alternative, not a duplicate.
    const kept = bestPerLineAndWeek([
      offer('Evergreen', 6250, '2026-09-21'),
      offer('Evergreen', 6100, '2026-09-28'),
    ]);
    expect(kept).toHaveLength(2);
  });

  it('orders by price, cheapest first', () => {
    const kept = bestPerLineAndWeek([
      offer('Cosco', 6500, '2026-09-21'),
      offer('Evergreen', 6100, '2026-09-21'),
      offer('CMA CGM', 6300, '2026-09-21'),
    ]);
    expect(kept.map((o) => o.shippingLine)).toEqual(['Evergreen', 'CMA CGM', 'Cosco']);
  });

  it('treats a carrier name case- and spacing-insensitively', () => {
    // Agents type the same carrier differently. 'CMA CGM' and 'cma cgm' are one
    // line, and showing both would be exactly the noise Ion objected to.
    const kept = bestPerLineAndWeek([
      offer('CMA CGM', 6400, '2026-09-21'),
      offer('cma  cgm', 6200, '2026-09-22'),
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].totalPriceUSD).toBe(6200);
  });

  it('keeps an offer with no departure date rather than dropping it', () => {
    // Base-price offers have no sailing date. They are still real offers and
    // must not vanish because they cannot be grouped by week.
    const noDate: TestOffer = { shippingLine: 'MSC', totalPriceUSD: 6600 };
    const kept = bestPerLineAndWeek([noDate, offer('Evergreen', 6100, '2026-09-21')]);
    expect(kept).toHaveLength(2);
  });

  it('still dedupes two dateless offers on the same line', () => {
    const a: TestOffer = { shippingLine: 'MSC', totalPriceUSD: 6600 };
    const b: TestOffer = { shippingLine: 'MSC', totalPriceUSD: 6400 };
    const kept = bestPerLineAndWeek([a, b]);
    expect(kept).toHaveLength(1);
    expect(kept[0].totalPriceUSD).toBe(6400);
  });

  it('returns an empty list unchanged', () => {
    expect(bestPerLineAndWeek([])).toEqual([]);
  });

  it('is stable when two offers tie on price', () => {
    const kept = bestPerLineAndWeek([
      offer('Evergreen', 6200, '2026-09-21', 'first'),
      offer('Evergreen', 6200, '2026-09-22', 'second'),
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0].agentCompany).toBe('first');
  });
});

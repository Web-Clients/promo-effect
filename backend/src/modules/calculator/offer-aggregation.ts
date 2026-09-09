/**
 * Which offers a client is shown.
 *
 * Several Chinese agents quote the same lane, and Ion wants the client to see
 * that market rather than one number — but not all of it. Three agents quoting
 * Evergreen for the same sailing week is one offer, not three; what belongs
 * beside it is a different carrier or a different week.
 *
 * So offers are keyed by (shipping line, departure week) and the cheapest in
 * each key survives. Sorting by price alone, which is what the calculator did,
 * fills the screen with the same carrier repeated.
 */

import { PriceOffer } from './calculator.types';

/** `2026-W38`, with the ISO week year rather than the calendar one. */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // ISO weeks are numbered by the year their Thursday falls in, which is why
  // 31 December 2024 belongs to week 1 of 2025.
  const dayOfWeek = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const year = d.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Carrier names as agents type them: "CMA CGM", "cma  cgm", "Cma Cgm".
 * Showing those as three offers is precisely the noise being removed.
 */
function lineKey(shippingLine: string): string {
  return (shippingLine || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

type Aggregable = Pick<PriceOffer, 'shippingLine' | 'totalPriceUSD'> & {
  departureDate?: Date | string | null;
};

function weekPart(offer: Aggregable): string {
  // An offer with no sailing date — every base-price offer — is still a real
  // offer. It groups under its own key rather than being dropped.
  if (!offer.departureDate) return 'no-date';
  const d =
    offer.departureDate instanceof Date ? offer.departureDate : new Date(offer.departureDate);
  return Number.isNaN(d.getTime()) ? 'no-date' : isoWeekKey(d);
}

/**
 * One offer per carrier per sailing week, cheapest first.
 *
 * Ties keep the first seen, so a stable input gives a stable screen: an offer
 * that jumps position between two identical searches reads as a bug to the
 * person looking at it.
 */
export function bestPerLineAndWeek<T extends Aggregable>(offers: T[]): T[] {
  const best = new Map<string, T>();

  for (const offer of offers) {
    const key = `${lineKey(offer.shippingLine)}|${weekPart(offer)}`;
    const current = best.get(key);
    if (!current || offer.totalPriceUSD < current.totalPriceUSD) {
      best.set(key, offer);
    }
  }

  return [...best.values()].sort((a, b) => a.totalPriceUSD - b.totalPriceUSD);
}

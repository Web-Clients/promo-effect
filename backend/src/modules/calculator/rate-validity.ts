/**
 * When a stored rate may be quoted.
 *
 * One rule, expressed twice: `isQuotableOn` for code that already holds rows,
 * `agentPriceWhere` for code that is about to fetch them. Keeping both here —
 * and testing that they agree — is what stops the database filter and the
 * in-memory check from drifting apart, which is how `computeFromAgentPrices`
 * came to query agent_prices on route alone, filtering neither the validity
 * window nor the approval state.
 */

export const APPROVED = 'APPROVED';

export interface RateValidity {
  validFrom: Date;
  validUntil: Date;
}

export interface ApprovableRate extends RateValidity {
  approvalStatus?: string | null;
}

/** In force on `readyDate`. Inclusive at both ends: a rate is valid on its last day. */
export function isInForceOn(rate: RateValidity, readyDate: Date): boolean {
  return rate.validFrom <= readyDate && rate.validUntil >= readyDate;
}

/**
 * Approved *and* in force. Both are required for an agent rate.
 *
 * Fails closed on a missing approval state: an unmigrated or hand-inserted row
 * is treated as not approved, never as approved, so it cannot leak into a quote.
 */
export function isQuotableOn(rate: ApprovableRate, readyDate: Date): boolean {
  return rate.approvalStatus === APPROVED && isInForceOn(rate, readyDate);
}

export interface AgentPriceQuery {
  portOrigin: string;
  containerTypes: string[];
  weightRange: string;
  readyDate: Date;
}

/** The Prisma translation of `isQuotableOn`, narrowed to one route. */
export function agentPriceWhere(q: AgentPriceQuery) {
  return {
    portOrigin: { equals: q.portOrigin, mode: 'insensitive' as const },
    containerType: { in: q.containerTypes },
    weightRange: q.weightRange,
    approvalStatus: APPROVED,
    validFrom: { lte: q.readyDate },
    validUntil: { gte: q.readyDate },
  };
}

/**
 * The window to pre-fill when an agent enters a rate without picking an end date.
 *
 * Rates arrive roughly every two weeks, so the default closes at the next
 * half-month boundary: a rate entered on or before the 15th runs to the 15th,
 * one entered later runs to the last day of the month.
 */
export function defaultValidityWindow(from: Date): RateValidity {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth();
  const day = from.getUTCDate();

  const endDay = day <= 15 ? 15 : lastDayOfMonth(year, month);
  return {
    validFrom: from,
    validUntil: new Date(Date.UTC(year, month, endDay)),
  };
}

function lastDayOfMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Reject a window that cannot produce a quote.
 *
 * A window entirely in the past is refused. A window entirely in the *future*
 * is not — Ion enters October rates in September, and the guard against stale
 * data must not also block forward planning.
 */
export function assertValidityWindow(window: RateValidity, today: Date): void {
  if (window.validUntil < window.validFrom) {
    throw new Error('Valabilitatea se termină înainte să înceapă.');
  }
  if (window.validUntil < today) {
    throw new Error('Valabilitatea este în trecut — oferta nu ar putea fi folosită niciodată.');
  }
}

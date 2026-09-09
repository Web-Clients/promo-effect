/**
 * When a stored rate may be quoted.
 *
 * Background (Ion, 8 Sep 2026). Two complaints in one meeting traced back to
 * this rule being absent or partial:
 *
 *   - "prețul Ningbo nu este activ pe data de azi dar el oricum îl selectează"
 *   - cargo ready 15.09 returned an Evergreen rate that expired on 14.09
 *
 * And one defect the client never saw: `computeFromAgentPrices` queried
 * agent_prices on port + container + weight only, filtering neither the
 * validity window nor the approval state — so a PENDING or REJECTED Chinese
 * agent rate was quotable to a customer. Dormant only because the table is
 * still empty; it arms itself the day the agent portal is used.
 *
 * The rule lives here once and is expressed two ways: a predicate for code that
 * already holds rows, and a Prisma filter for code that is about to fetch them.
 * The tests below hold the two representations to the same rule.
 */

import {
  isInForceOn,
  isQuotableOn,
  agentPriceWhere,
  defaultValidityWindow,
  assertValidityWindow,
  APPROVED,
} from '../src/modules/calculator/rate-validity';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

const inForce = { validFrom: d('2026-09-01'), validUntil: d('2026-09-30') };

describe('isInForceOn', () => {
  it('accepts a date inside the window', () => {
    expect(isInForceOn(inForce, d('2026-09-15'))).toBe(true);
  });

  it('is inclusive on both ends — a rate is valid on its last day', () => {
    expect(isInForceOn(inForce, d('2026-09-01'))).toBe(true);
    expect(isInForceOn(inForce, d('2026-09-30'))).toBe(true);
  });

  it('rejects the day after expiry — the exact case Ion demonstrated', () => {
    const evergreen = { validFrom: d('2026-09-01'), validUntil: d('2026-09-14') };
    expect(isInForceOn(evergreen, d('2026-09-15'))).toBe(false);
  });

  it('rejects a date before the window opens', () => {
    expect(isInForceOn(inForce, d('2026-08-31'))).toBe(false);
  });
});

describe('isQuotableOn', () => {
  it('requires approval as well as being in force', () => {
    expect(isQuotableOn({ ...inForce, approvalStatus: APPROVED }, d('2026-09-15'))).toBe(true);
    expect(isQuotableOn({ ...inForce, approvalStatus: 'PENDING' }, d('2026-09-15'))).toBe(false);
    expect(isQuotableOn({ ...inForce, approvalStatus: 'REJECTED' }, d('2026-09-15'))).toBe(false);
  });

  it('an approved but expired rate is still not quotable', () => {
    const expired = { validFrom: d('2026-08-01'), validUntil: d('2026-08-31') };
    expect(isQuotableOn({ ...expired, approvalStatus: APPROVED }, d('2026-09-15'))).toBe(false);
  });

  it('treats a missing approval state as not approved, never as approved', () => {
    // Fail closed: an unmigrated or hand-inserted row must not leak into a quote.
    expect(isQuotableOn({ ...inForce, approvalStatus: null }, d('2026-09-15'))).toBe(false);
    expect(isQuotableOn({ ...inForce }, d('2026-09-15'))).toBe(false);
  });
});

describe('agentPriceWhere', () => {
  const where = agentPriceWhere({
    portOrigin: 'Ningbo',
    containerTypes: ['40HQ'],
    readyDate: d('2026-09-15'),
  });

  it('carries every constraint the predicate enforces', () => {
    // The three that were missing are the point of this test.
    expect(where.approvalStatus).toBe(APPROVED);
    expect(where.validFrom).toEqual({ lte: d('2026-09-15') });
    expect(where.validUntil).toEqual({ gte: d('2026-09-15') });
  });

  it('still narrows by route and container as before', () => {
    expect(where.containerType).toEqual({ in: ['40HQ'] });
    expect(where.portOrigin).toEqual({ equals: 'Ningbo', mode: 'insensitive' });
  });

  it('carries no weight clause — that comparison can never be true in SQL', () => {
    // The client's weight is kilograms; an agent's band is tonnes. Matching
    // them is weightBandMatches' job, in memory.
    expect('weightRange' in where).toBe(false);
  });

  it('agrees with the predicate on the same fixtures', () => {
    // Same rule, two representations. If one drifts, this fails.
    const readyDate = d('2026-09-15');
    const rows = [
      { approvalStatus: APPROVED, validFrom: d('2026-09-01'), validUntil: d('2026-09-30') },
      { approvalStatus: APPROVED, validFrom: d('2026-09-01'), validUntil: d('2026-09-14') },
      { approvalStatus: 'PENDING', validFrom: d('2026-09-01'), validUntil: d('2026-09-30') },
      { approvalStatus: APPROVED, validFrom: d('2026-09-20'), validUntil: d('2026-09-30') },
    ];
    const byPredicate = rows.filter((r) => isQuotableOn(r, readyDate));
    const byWhere = rows.filter(
      (r) =>
        r.approvalStatus === where.approvalStatus &&
        r.validFrom <= where.validFrom.lte &&
        r.validUntil >= where.validUntil.gte
    );
    expect(byWhere).toEqual(byPredicate);
    expect(byPredicate).toHaveLength(1);
  });
});

describe('defaultValidityWindow', () => {
  // Ion: rates arrive roughly every two weeks; when no end date is picked the
  // default is "ziua de mijloc sau ultima zi din calendar a lunii" (46:06).
  // Entered in the first half → runs to the 15th; second half → to month end.
  it('a rate entered early in the month runs to the 15th', () => {
    expect(defaultValidityWindow(d('2026-09-03'))).toEqual({
      validFrom: d('2026-09-03'),
      validUntil: d('2026-09-15'),
    });
  });

  it('a rate entered after the 15th runs to the last day of the month', () => {
    expect(defaultValidityWindow(d('2026-09-20')).validUntil).toEqual(d('2026-09-30'));
  });

  it('handles February in a non-leap year', () => {
    expect(defaultValidityWindow(d('2027-02-20')).validUntil).toEqual(d('2027-02-28'));
  });

  it('on the 15th itself the window still closes that day, not a month later', () => {
    expect(defaultValidityWindow(d('2026-09-15')).validUntil).toEqual(d('2026-09-15'));
  });
});

describe('assertValidityWindow', () => {
  const today = d('2026-09-08');

  it('refuses a window that has already expired', () => {
    expect(() =>
      assertValidityWindow({ validFrom: d('2026-08-01'), validUntil: d('2026-08-31') }, today)
    ).toThrow(/trecut/i);
  });

  it('allows a future window — Ion enters October rates in September', () => {
    // "Noi azi punem oferta care-i valabilă de pe 1 octombrie" (38:00).
    // The guard against past dates must not also block this.
    expect(() =>
      assertValidityWindow({ validFrom: d('2026-10-01'), validUntil: d('2026-10-31') }, today)
    ).not.toThrow();
  });

  it('allows a window that is open right now', () => {
    expect(() =>
      assertValidityWindow({ validFrom: d('2026-09-01'), validUntil: d('2026-09-30') }, today)
    ).not.toThrow();
  });

  it('refuses an inverted window', () => {
    expect(() =>
      assertValidityWindow({ validFrom: d('2026-10-31'), validUntil: d('2026-10-01') }, today)
    ).toThrow(/după|inainte|înainte/i);
  });
});

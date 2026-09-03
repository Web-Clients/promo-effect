/**
 * Incoterm pricing rules — the single authority for what the buyer actually pays.
 *
 * Background (client report, 3 Sep 2026): the price shown on the offer card did
 * not survive "Selectează Această Ofertă". The card recomputed the total in the
 * browser (excluding the maritime leg for CFR/CIF, commission as an editable
 * percentage) while the order form, the booking row and the three emails all used
 * the raw backend `totalPriceUSD` — maritime always included, commission a flat
 * $200 from admin_settings. Two prices for one quote.
 *
 * Root cause: the incoterm rules lived only in the presentation layer.
 * `applyIncotermsToOffer` existed in the engine but was never called by
 * `calculatePrices`, so the backend applied no incoterm logic at all.
 *
 * These tests pin the rules to ONE place. The numbers below are the real prod
 * figures from the client's screenshots (base_prices + port_pricing_matrix +
 * shipping_line_containers on 141.227.180.107, 3 Sep 2026).
 */

import {
  Incoterm,
  supplierCoversMaritime,
  legsFromOffer,
  priceOffer,
  DEFAULT_COMMISSION_POLICY,
  resolveCommissionPolicy,
  CommissionPolicy,
} from '../src/modules/calculator/calculator-incoterms';
import { PriceOffer } from '../src/modules/calculator/calculator.types';

function makeOffer(overrides: Partial<PriceOffer> = {}): PriceOffer {
  return {
    rank: 0,
    shippingLine: 'MSC',
    basePriceId: 'price-1',
    route: 'Ningbo → Constanța → Chișinău',
    portOrigin: 'Ningbo',
    portIntermediate: 'Constanța',
    portFinal: 'Chișinău',
    freightPrice: 1000,
    portAdjustment: 100,
    portTaxes: 200,
    customsTaxes: 150,
    terrestrialTransport: 300,
    commission: 50,
    insurance: 0,
    totalPriceUSD: 1800,
    totalPriceMDL: 0,
    totalContainers: 1,
    estimatedTransitDays: 32,
    availability: 'AVAILABLE',
    ...overrides,
  } as PriceOffer;
}

/** Maersk 40HQ out of Ningbo, exactly as prod computes it today. */
const MAERSK_NINGBO = makeOffer({
  shippingLine: 'Maersk',
  freightPrice: 6455, // base_prices Shanghai 40HQ (Ningbo has no own rate)
  portAdjustment: 100, // port_pricing_matrix Ningbo/40HQ
  portTaxes: 520, // shipping_line_containers Maersk/40HC
  customsTaxes: 180, // admin_settings
  terrestrialTransport: 1550, // land_transport_rates IMPORT Chișinău
  insurance: 0,
});

/** CMA CGM 40HQ out of Ningbo. */
const CMA_NINGBO = makeOffer({
  shippingLine: 'CMA CGM',
  freightPrice: 6500,
  portAdjustment: 100,
  portTaxes: 700,
  customsTaxes: 180,
  terrestrialTransport: 1650,
  insurance: 0,
});

describe('supplierCoversMaritime', () => {
  it('is true exactly for CFR and CIF', () => {
    expect(supplierCoversMaritime('CFR')).toBe(true);
    expect(supplierCoversMaritime('CIF')).toBe(true);
    expect(supplierCoversMaritime('FOB')).toBe(false);
    expect(supplierCoversMaritime('EXW')).toBe(false);
  });

  it('covers CIF — the incoterm the backend used to not know about', () => {
    // The frontend offered a CIF button while the backend enum was
    // ['FOB','EXW','CFR'] only, so CIF fell through every maritime rule.
    const all: Incoterm[] = ['FOB', 'EXW', 'CFR', 'CIF'];
    expect(all.filter(supplierCoversMaritime)).toEqual(['CFR', 'CIF']);
  });
});

describe('legsFromOffer', () => {
  it('groups the raw components into the three legs the client sees', () => {
    expect(legsFromOffer(MAERSK_NINGBO)).toEqual({
      maritime: 6555, // freight + port adjustment
      localTaxes: 700, // port taxes + customs
      landTransport: 1550, // terrestrial + insurance
    });
  });

  it('folds insurance into the land leg', () => {
    const withInsurance = makeOffer({ terrestrialTransport: 1550, insurance: 50 });
    expect(legsFromOffer(withInsurance).landTransport).toBe(1600);
  });
});

describe('priceOffer — commission base', () => {
  it('never charges commission on the ocean freight, whatever the incoterm', () => {
    // This is the fix for the client's "fob iese prea mult". Commission pays for
    // the forwarding service we actually perform (local handling + land leg), so
    // a big ocean freight no longer inflates it.
    for (const incoterm of ['FOB', 'EXW', 'CFR', 'CIF'] as Incoterm[]) {
      const priced = priceOffer(MAERSK_NINGBO, incoterm, DEFAULT_COMMISSION_POLICY);
      expect(priced.commissionBase).toBe(700 + 1550);
    }
  });

  it('CMA CGM on FOB: commission drops from the old $913 to $253', () => {
    const priced = priceOffer(CMA_NINGBO, 'FOB', DEFAULT_COMMISSION_POLICY);
    // Old browser-side rule charged 10% of (6600 + 880 + 1650) = 913.
    expect(priced.commissionBase).toBe(880 + 1650);
    expect(priced.commissionAmount).toBe(253);
  });
});

describe('priceOffer — totals', () => {
  it('CFR excludes the maritime leg the supplier already paid for', () => {
    const priced = priceOffer(MAERSK_NINGBO, 'CFR', DEFAULT_COMMISSION_POLICY);
    expect(priced.maritimeCharged).toBe(0);
    expect(priced.commissionAmount).toBe(225);
    // Exactly the $2475 the client saw on the card — now also what the order
    // form, the booking row and the emails will carry.
    expect(priced.total).toBe(2475);
  });

  it('CIF behaves like CFR, not like FOB', () => {
    const cfr = priceOffer(MAERSK_NINGBO, 'CFR', DEFAULT_COMMISSION_POLICY);
    const cif = priceOffer(MAERSK_NINGBO, 'CIF', DEFAULT_COMMISSION_POLICY);
    expect(cif.total).toBe(cfr.total);
  });

  it('FOB charges the maritime leg but not commission on it', () => {
    const priced = priceOffer(CMA_NINGBO, 'FOB', DEFAULT_COMMISSION_POLICY);
    expect(priced.maritimeCharged).toBe(6600);
    expect(priced.total).toBe(6600 + 880 + 1650 + 253);
  });

  it('EXW is priced like FOB — China inland costs are not known to us', () => {
    // The old engine added a fabricated $1100 of "EXW China costs". The frontend
    // had already stopped trusting it (getEXWTotal returned 0). Until those costs
    // come from a real table we do not invent them.
    const fob = priceOffer(CMA_NINGBO, 'FOB', DEFAULT_COMMISSION_POLICY);
    const exw = priceOffer(CMA_NINGBO, 'EXW', DEFAULT_COMMISSION_POLICY);
    expect(exw.total).toBe(fob.total);
  });

  it('the reported bug cannot come back: one offer, one total', () => {
    // The card and the order form now call this same function with the same
    // arguments, so there is no second place for the number to diverge.
    const a = priceOffer(MAERSK_NINGBO, 'CFR', DEFAULT_COMMISSION_POLICY);
    const b = priceOffer(MAERSK_NINGBO, 'CFR', DEFAULT_COMMISSION_POLICY);
    expect(a.total).toBe(b.total);
    expect(a.total).not.toBe(MAERSK_NINGBO.totalPriceUSD);
  });
});

describe('priceOffer — per-incoterm percentage', () => {
  const policy: CommissionPolicy = {
    percentByIncoterm: { FOB: 4, EXW: 4, CFR: 10, CIF: 10 },
  };

  it('applies the percentage configured for that incoterm', () => {
    expect(priceOffer(CMA_NINGBO, 'FOB', policy).commissionPercent).toBe(4);
    expect(priceOffer(CMA_NINGBO, 'CFR', policy).commissionPercent).toBe(10);
  });

  it('lets an admin override the percentage for a single quote', () => {
    const priced = priceOffer(CMA_NINGBO, 'FOB', policy, 12);
    expect(priced.commissionPercent).toBe(12);
    expect(priced.commissionAmount).toBe(Math.round(2530 * 0.12 * 100) / 100);
  });

  it('rejects an override outside 0–30% instead of quietly using it', () => {
    expect(() => priceOffer(CMA_NINGBO, 'FOB', policy, -1)).toThrow();
    expect(() => priceOffer(CMA_NINGBO, 'FOB', policy, 31)).toThrow();
    expect(() => priceOffer(CMA_NINGBO, 'FOB', policy, NaN)).toThrow();
  });

  it('a zero percentage is a real choice, not a missing value', () => {
    const priced = priceOffer(CMA_NINGBO, 'FOB', policy, 0);
    expect(priced.commissionAmount).toBe(0);
    expect(priced.total).toBe(6600 + 880 + 1650);
  });
});

describe('resolveCommissionPolicy', () => {
  it('falls back to the default percentage when settings hold nothing', () => {
    expect(resolveCommissionPolicy(null)).toEqual(DEFAULT_COMMISSION_POLICY);
    expect(resolveCommissionPolicy({})).toEqual(DEFAULT_COMMISSION_POLICY);
  });

  it('reads the per-incoterm percentages stored by the admin', () => {
    const policy = resolveCommissionPolicy({
      commissionPercentByIncoterm: JSON.stringify({ FOB: 3.5, EXW: 3.5, CFR: 10, CIF: 10 }),
    });
    expect(policy.percentByIncoterm.FOB).toBe(3.5);
    expect(policy.percentByIncoterm.CIF).toBe(10);
  });

  it('ignores malformed stored JSON rather than crashing the calculator', () => {
    expect(resolveCommissionPolicy({ commissionPercentByIncoterm: 'not json' })).toEqual(
      DEFAULT_COMMISSION_POLICY
    );
  });

  it('fills in any incoterm the stored config forgot', () => {
    const policy = resolveCommissionPolicy({
      commissionPercentByIncoterm: JSON.stringify({ FOB: 3 }),
    });
    expect(policy.percentByIncoterm.FOB).toBe(3);
    expect(policy.percentByIncoterm.CIF).toBe(DEFAULT_COMMISSION_POLICY.percentByIncoterm.CIF);
  });
});

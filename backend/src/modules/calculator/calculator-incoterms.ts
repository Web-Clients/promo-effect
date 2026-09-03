/**
 * Calculator Incoterms — the single authority for what the buyer pays.
 *
 * Every consumer (the calculate endpoint, the offer card, the order form, the
 * booking row, the three order emails) must go through `priceOffer`. Before this
 * module owned the rules they lived in the browser only: `OfferCard.tsx`
 * recomputed the total client-side while the backend handed out an untouched sum,
 * so the number changed the moment the client pressed "Selectează Această Ofertă".
 */

import { PriceOffer } from './calculator.types';

export type Incoterm = 'FOB' | 'EXW' | 'CFR' | 'CIF';

export const INCOTERMS: readonly Incoterm[] = ['FOB', 'EXW', 'CFR', 'CIF'] as const;

export function isIncoterm(value: unknown): value is Incoterm {
  return typeof value === 'string' && (INCOTERMS as readonly string[]).includes(value);
}

/**
 * Under CFR and CIF the seller has already paid the ocean freight to the port of
 * destination, so we must not bill the buyer for it a second time.
 */
export function supplierCoversMaritime(incoterm: Incoterm): boolean {
  return incoterm === 'CFR' || incoterm === 'CIF';
}

/** CFR/CIF quote one specific carrier — the one the supplier booked. */
export function requiresShippingLine(incoterm: Incoterm): boolean {
  return supplierCoversMaritime(incoterm);
}

// ─── Legs ────────────────────────────────────────────────────────────────────

export interface OfferLegs {
  /** Ocean freight for the whole shipment, including the origin-port adjustment. */
  maritime: number;
  /** Destination port handling + customs. */
  localTaxes: number;
  /** Port → final city, plus insurance when the client took it. */
  landTransport: number;
}

export function legsFromOffer(offer: PriceOffer): OfferLegs {
  return {
    maritime: offer.freightPrice + offer.portAdjustment,
    localTaxes: offer.portTaxes + offer.customsTaxes,
    landTransport: offer.terrestrialTransport + (offer.insurance || 0),
  };
}

// ─── Commission ──────────────────────────────────────────────────────────────

export interface CommissionPolicy {
  percentByIncoterm: Record<Incoterm, number>;
}

/**
 * 10% everywhere is the behaviour the client already had on CFR/CIF. FOB and EXW
 * kept the same percentage but the browser charged it on a base that included the
 * ~$6.600 ocean freight, which is what produced the client's "fob iese prea mult".
 * The base fix below (never on maritime) settles that; the percentages stay
 * configurable per incoterm so Promo-Efect can diverge them without a deploy.
 */
export const DEFAULT_COMMISSION_PERCENT = 10;

export const DEFAULT_COMMISSION_POLICY: CommissionPolicy = {
  percentByIncoterm: { FOB: 10, EXW: 10, CFR: 10, CIF: 10 },
};

export const MIN_COMMISSION_PERCENT = 0;
export const MAX_COMMISSION_PERCENT = 30;

/**
 * Read the per-incoterm percentages an admin stored in AdminSettings.
 * A missing, malformed or partial value falls back to the default rather than
 * failing the quote — a broken settings row must not take the calculator down.
 */
export function resolveCommissionPolicy(
  settings: { commissionPercentByIncoterm?: string | null } | null | undefined
): CommissionPolicy {
  const raw = settings?.commissionPercentByIncoterm;
  if (!raw) return DEFAULT_COMMISSION_POLICY;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_COMMISSION_POLICY;
  }
  if (!parsed || typeof parsed !== 'object') return DEFAULT_COMMISSION_POLICY;

  const stored = parsed as Record<string, unknown>;
  const percentByIncoterm = { ...DEFAULT_COMMISSION_POLICY.percentByIncoterm };
  for (const incoterm of INCOTERMS) {
    const value = stored[incoterm];
    if (typeof value === 'number' && isValidPercent(value)) {
      percentByIncoterm[incoterm] = value;
    }
  }
  return { percentByIncoterm };
}

function isValidPercent(value: number): boolean {
  return (
    Number.isFinite(value) && value >= MIN_COMMISSION_PERCENT && value <= MAX_COMMISSION_PERCENT
  );
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface PricedOffer {
  incoterm: Incoterm;
  /** 0 when the supplier already paid the freight (CFR/CIF). */
  maritimeCharged: number;
  localTaxes: number;
  landTransport: number;
  commissionPercent: number;
  /** What the percentage is applied to — never includes the ocean freight. */
  commissionBase: number;
  commissionAmount: number;
  total: number;
}

/**
 * Price one offer under one incoterm.
 *
 * The commission is charged on the services Promo-Efect actually performs — the
 * destination handling and the land leg — and never on the ocean freight, whoever
 * pays for it. That keeps the fee stable when freight rates swing and is what
 * makes a single percentage sane across all four incoterms.
 *
 * @param percentOverride an admin's per-quote percentage; must be 0–30.
 */
export function priceOffer(
  offer: PriceOffer,
  incoterm: Incoterm,
  policy: CommissionPolicy = DEFAULT_COMMISSION_POLICY,
  percentOverride?: number
): PricedOffer {
  const legs = legsFromOffer(offer);

  let commissionPercent = policy.percentByIncoterm[incoterm] ?? DEFAULT_COMMISSION_PERCENT;
  if (percentOverride !== undefined) {
    if (!isValidPercent(percentOverride)) {
      throw new Error(
        `Comision invalid: ${percentOverride}%. Se acceptă ${MIN_COMMISSION_PERCENT}–${MAX_COMMISSION_PERCENT}%.`
      );
    }
    commissionPercent = percentOverride;
  }

  const maritimeCharged = supplierCoversMaritime(incoterm) ? 0 : legs.maritime;
  const commissionBase = legs.localTaxes + legs.landTransport;
  const commissionAmount = round2((commissionBase * commissionPercent) / 100);
  const total = round2(maritimeCharged + legs.localTaxes + legs.landTransport + commissionAmount);

  return {
    incoterm,
    maritimeCharged,
    localTaxes: legs.localTaxes,
    landTransport: legs.landTransport,
    commissionPercent,
    commissionBase,
    commissionAmount,
    total,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

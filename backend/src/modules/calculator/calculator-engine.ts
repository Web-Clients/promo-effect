/**
 * Calculator Engine
 * Core price computation logic — extracted from calculator.service.ts
 * Supports EXW/FOB/CFR incoterms and multi-city final destination
 */

import prisma from '../../lib/prisma';
import {
  ContainerEntry,
  CalculatorInput,
  ContainerPriceBreakdown,
  PriceOffer,
  CalculatorResult,
} from './calculator.types';
import {
  isConstantaDestination,
  buildRouteString,
  estimateTransitDays,
  checkAvailability,
  DESTINATION_LABELS,
} from './calculator-routes';
import {
  Incoterm,
  requiresShippingLine,
  CommissionPolicy,
  DEFAULT_COMMISSION_POLICY,
  priceOffer,
} from './calculator-incoterms';
import { validateCalculatorInput } from './calculator-validation';

// Extend CalculatorInput with incoterms fields
export interface ExtendedCalculatorInput extends CalculatorInput {
  incoterm?: Incoterm;
  shippingLine?: string; // required for CFR
  finalDestination?: string; // e.g. 'chisinau', 'balti', 'constanta'
}

/**
 * Get exchange rate from external API with fallback
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from}`);
    if (!response.ok) throw new Error('Failed to fetch exchange rate');
    const data = await response.json();
    const rate = data.rates[to];
    if (!rate) throw new Error(`Exchange rate not found for ${from} → ${to}`);
    return rate;
  } catch {
    return 18.0; // Fallback MDL rate
  }
}

/**
 * Parse a weight range string like "10-15 tone" and return the upper bound as a number.
 * Falls back to parsing the first number found.
 */
export function parseWeightKg(weight: string): number {
  // NOTE: returns weight in TONNES (the DB bands are in tonnes). Name kept for
  // backward-compat. Accepts free kg input now:
  //   "5-10 tone" → 10 ; "25" → 25 ; "25500"/"25,500"/"25500 kg" → 25.5
  // Heuristic (per client): a plain number ≥ 1000 is kilograms → /1000; a small
  // number is tonnes. "25 000 → banda 25-26" ; "25 → tone".
  if (!weight) return 0;
  const s = String(weight).toLowerCase();
  // Range like "5-10 tone" — use the upper bound (already tonnes).
  const rangeMatch = s.match(/(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/);
  if (rangeMatch) return parseFloat(rangeMatch[2].replace(',', '.'));
  // Single value. Drop spaces; treat a comma before exactly 3 digits as a
  // thousands separator ("25,500" → "25500"), otherwise as a decimal comma.
  const cleaned = s.replace(/\s/g, '').replace(/,(?=\d{3}(\D|$))/g, '');
  const m = cleaned.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 0;
  let n = parseFloat(m[1].replace(',', '.'));
  if (n >= 1000) n = n / 1000; // kilograms → tonnes
  return n;
}

/**
 * Look up LandTransportRate for a given direction/city/weight.
 * Returns priceUSD or undefined if no matching row.
 */
export async function getLandTransportRate(
  direction: 'IMPORT' | 'EXPORT',
  city: string,
  weightKg: number
): Promise<number | undefined> {
  // Diacritic-insensitive city match. The frontend sends "chisinau" (no
  // diacritics) but the table stores "Chișinău", so a plain `contains` never
  // matched → the calc fell back to the generic 600 setting instead of the real
  // IMPORT rate (1550/1650...). Fetch by weight band, match city in JS.
  const strip = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[șş]/g, 's')
      .replace(/[țţ]/g, 't');
  const target = strip(city);
  const rates = await prisma.landTransportRate.findMany({
    where: {
      direction,
      weightMin: { lte: weightKg },
      weightMax: { gte: weightKg },
      active: true,
    },
  });
  const match = rates.find((r) => {
    const c = strip(r.city);
    return c === target || c.includes(target) || target.includes(c);
  });
  return match?.priceUSD;
}

/**
 * Normalize container-type aliases so lookups match across tables.
 * base_prices use "40HQ" while shipping_line_containers use "40HC" (same size),
 * which meant the per-line port tax never matched → fell back to the generic
 * setting. HQ≡HC (high cube), DV≡DC/GP (dry). Strips quotes/spaces/case.
 */
export function normContainerType(t: string): string {
  if (!t) return '';
  return t
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace('HQ', 'HC')
    .replace('DV', 'DC')
    .replace('GP', 'DC');
}

/**
 * Core calculation using BasePrice table
 */
export async function computeFromBasePrices(
  input: ExtendedCalculatorInput,
  settings: any,
  originAdjustment: number,
  portTaxes: number,
  terrestrialTransport: number,
  insurance: number,
  containers: ContainerEntry[],
  totalContainerCount: number,
  freightSurcharge: number,
  terrestrialSurcharge: number
): Promise<PriceOffer[]> {
  // Shanghai is the reference port: the rate every other origin is derived from.
  const REFERENCE_PORT = 'Shanghai';
  const portDestination = input.portDestination || 'Constanta';
  const readyDate = new Date(input.cargoReadyDate);
  const isConstanta = isConstantaDestination(portDestination);
  const containerTypes = [...new Set(containers.map((c) => c.type))];

  const destWhere = isConstanta
    ? {
        OR: [
          { portDestination: { contains: 'Constanta', mode: 'insensitive' as const } },
          { portDestination: { contains: 'Constanța', mode: 'insensitive' as const } },
        ],
      }
    : { portDestination: { contains: 'Odessa', mode: 'insensitive' as const } };

  const baseWhere = (origin: string) => ({
    portOrigin: { equals: origin, mode: 'insensitive' as const },
    ...destWhere,
    containerType: { in: containerTypes },
    isActive: true,
    validFrom: { lte: readyDate },
    validUntil: { gte: readyDate },
  });

  // CFR/CIF quotes arrive without a port of origin — the seller chose it. Price
  // the remaining legs off the reference port and mark the offer accordingly.
  const originForLookup = input.portOrigin || REFERENCE_PORT;
  let basePrices = await prisma.basePrice.findMany({ where: baseWhere(originForLookup) });

  // Reference-port logic: Shanghai is the reference port. If the selected origin
  // (e.g. Ningbo) has no own base price, use Shanghai's base price — the origin's
  // PortPricingMatrix adjustment (e.g. Ningbo +100) is applied on top below.
  // Tracked so the quote can SAY it is a reference price. Promo-Efect has no
  // Ningbo rows at all, so every Ningbo quote is really a Shanghai rate plus the
  // Ningbo port adjustment — which read to the client as "the Ningbo price isn't
  // active today but it picks it anyway".
  let referencePortUsed: string | undefined;
  if (!input.portOrigin && basePrices.length > 0) {
    referencePortUsed = REFERENCE_PORT;
  } else if (
    basePrices.length === 0 &&
    originForLookup.trim().toLowerCase() !== REFERENCE_PORT.toLowerCase()
  ) {
    basePrices = await prisma.basePrice.findMany({ where: baseWhere(REFERENCE_PORT) });
    if (basePrices.length > 0) referencePortUsed = REFERENCE_PORT;
  }

  if (basePrices.length === 0) return [];

  // Dedup: for same (shippingLine, portOrigin, portDestination, containerType) keep only latest updatedAt
  const dedupSeen = new Map<string, (typeof basePrices)[0]>();
  for (const price of basePrices) {
    const key = `${price.shippingLine}|${price.portOrigin}|${price.portDestination}|${price.containerType}`;
    const existing = dedupSeen.get(key);
    if (!existing || price.updatedAt > existing.updatedAt) {
      dedupSeen.set(key, price);
    }
  }
  const dedupedPrices = Array.from(dedupSeen.values());

  // Under CFR/CIF the supplier has already booked a carrier, so quoting the other
  // lines is meaningless — keep only the one that was selected. CIF used to fall
  // through this filter and get offered every line.
  const linePinned = input.incoterm ? requiresShippingLine(input.incoterm) : false;
  const filteredPrices =
    linePinned && input.shippingLine
      ? dedupedPrices.filter(
          (p) => p.shippingLine.toLowerCase() === (input.shippingLine || '').toLowerCase()
        )
      : dedupedPrices;

  // Preload ShippingLineContainer configs
  const shippingLineContainers = await prisma.shippingLineContainer.findMany({
    where: { isActive: true },
  });
  const slcMap = new Map<string, number>();
  for (const slc of shippingLineContainers) {
    slcMap.set(
      `${slc.shippingLine.toLowerCase()}__${normContainerType(slc.containerType)}`,
      slc.portTaxes
    );
  }

  // Preload TransportRate configs
  const transportRates = await prisma.transportRate.findMany({
    where: {
      isActive: true,
      destination: isConstanta ? 'Constanța' : 'Odessa',
    },
  });
  const trMap = new Map<string, number>();
  for (const tr of transportRates) {
    trMap.set(`${tr.containerType}__${tr.weightRange}`, tr.rate);
  }

  // Preload PortPricingMatrix adjustments for this port origin
  const portMatrixEntries = await prisma.portPricingMatrix.findMany({
    where: { portName: originForLookup },
  });
  const portMatrixMap = new Map<string, number>();
  for (const pm of portMatrixEntries) {
    portMatrixMap.set(pm.containerType, pm.adjustment);
  }

  // LandTransportRate: look up by finalDestination city and cargo weight
  const weightKg = parseWeightKg(input.cargoWeight || '');
  const finalDestCity =
    input.finalDestination && input.finalDestination !== 'constanta'
      ? input.finalDestination.charAt(0).toUpperCase() + input.finalDestination.slice(1)
      : null;
  const landRateFromTable = finalDestCity
    ? await getLandTransportRate('IMPORT', finalDestCity, weightKg)
    : undefined;

  // Group by shipping line
  const pricesByShippingLine = new Map<string, typeof filteredPrices>();
  for (const price of filteredPrices) {
    if (!pricesByShippingLine.has(price.shippingLine)) {
      pricesByShippingLine.set(price.shippingLine, []);
    }
    pricesByShippingLine.get(price.shippingLine)!.push(price);
  }

  const offers: PriceOffer[] = [];

  for (const [shippingLine, prices] of pricesByShippingLine) {
    const priceByType = new Map<string, (typeof basePrices)[0]>();
    for (const price of prices) {
      priceByType.set(price.containerType, price);
    }

    const missingTypes = containerTypes.filter((t) => !priceByType.has(t));
    if (missingTypes.length > 0) continue;

    const containerBreakdown: ContainerPriceBreakdown[] = [];
    let totalFreight = 0;
    let totalPortAdjustment = 0;
    let maxTransitDays = 0;

    for (const container of containers) {
      const price = priceByType.get(container.type)!;
      const containerTotal = (price.basePrice + originAdjustment) * container.quantity;

      containerBreakdown.push({
        type: container.type,
        quantity: container.quantity,
        unitPriceUSD: price.basePrice,
        totalPriceUSD: containerTotal,
        freightPrice: price.basePrice * container.quantity,
        portAdjustment: originAdjustment * container.quantity,
      });

      totalFreight += price.basePrice * container.quantity;
      totalPortAdjustment += originAdjustment * container.quantity;
      maxTransitDays = Math.max(maxTransitDays, price.transitDays);
    }

    const firstPrice = prices[0];
    const primaryContainerType = containers[0]?.type || containerTypes[0];

    const slcPortTaxes = slcMap.get(
      `${shippingLine.toLowerCase()}__${normContainerType(primaryContainerType)}`
    );
    const linePortTaxes = firstPrice.portTaxes ?? slcPortTaxes ?? portTaxes;

    const trRate = trMap.get(`${primaryContainerType}__${input.cargoWeight}`);
    // Priority: LandTransportRate table > BasePrice override > TransportRate table > admin setting
    const lineTerrestrialTransport =
      landRateFromTable ?? firstPrice.terrestrialTransport ?? trRate ?? terrestrialTransport;

    const lineCustomsTaxes = firstPrice.customsTaxes ?? settings.customsTaxes;
    const lineCommission = firstPrice.commission ?? settings.commission;

    const adjustedTerrestrialTransport = lineTerrestrialTransport + terrestrialSurcharge;

    // Apply PortPricingMatrix adjustment per container type on top of freight
    const portMatrixAdj = portMatrixMap.get(primaryContainerType) ?? 0;
    const adjustedFreight = totalFreight + freightSurcharge + portMatrixAdj;

    const totalFixedCosts =
      linePortTaxes + lineCustomsTaxes + adjustedTerrestrialTransport + lineCommission + insurance;

    const totalPriceUSD = adjustedFreight + totalPortAdjustment + totalFixedCosts;

    const portIntermediate = isConstanta ? 'Constanța' : 'Odessa';
    const route = buildRouteString(originForLookup, portIntermediate, input.finalDestination);

    offers.push({
      rank: 0,
      shippingLine,
      basePriceId: prices[0].id,
      route,
      portOrigin: input.portOrigin || originForLookup,
      portIntermediate,
      portFinal: 'Chișinău',
      freightPrice: adjustedFreight,
      portAdjustment: totalPortAdjustment,
      portTaxes: linePortTaxes,
      customsTaxes: lineCustomsTaxes,
      terrestrialTransport: adjustedTerrestrialTransport,
      commission: lineCommission,
      insurance,
      totalPriceUSD,
      totalPriceMDL: 0,
      containerBreakdown,
      totalContainers: totalContainerCount,
      estimatedTransitDays:
        maxTransitDays > 0
          ? maxTransitDays
          : estimateTransitDays(input.portOrigin, portDestination),
      availability: checkAvailability(readyDate),
      priceFromReferencePort: referencePortUsed,
    });
  }

  return offers;
}

/**
 * Core calculation using AgentPrice table (fallback)
 */
export async function computeFromAgentPrices(
  input: ExtendedCalculatorInput,
  settings: any,
  originAdjustment: number,
  portTaxes: number,
  terrestrialTransport: number,
  insurance: number,
  containers: ContainerEntry[],
  totalContainerCount: number,
  freightSurcharge: number,
  terrestrialSurcharge: number
): Promise<PriceOffer[]> {
  const portDestination = input.portDestination || 'Constanta';
  const readyDate = new Date(input.cargoReadyDate);
  const isConstanta = isConstantaDestination(portDestination);
  const containerTypes = [...new Set(containers.map((c) => c.type))];

  const agentPrices = await prisma.agentPrice.findMany({
    where: {
      portOrigin: { equals: input.portOrigin, mode: 'insensitive' },
      containerType: { in: containerTypes },
      weightRange: input.cargoWeight,
    },
    include: { agent: true },
  });

  if (agentPrices.length === 0) return [];

  // Group by shipping line
  const pricesByShippingLine = new Map<string, typeof agentPrices>();
  for (const price of agentPrices) {
    if (!pricesByShippingLine.has(price.shippingLine)) {
      pricesByShippingLine.set(price.shippingLine, []);
    }
    pricesByShippingLine.get(price.shippingLine)!.push(price);
  }

  const offers: PriceOffer[] = [];

  for (const [shippingLine, prices] of pricesByShippingLine) {
    const priceByType = new Map<string, (typeof agentPrices)[0]>();
    for (const price of prices) {
      priceByType.set(price.containerType, price);
    }

    const missingTypes = containerTypes.filter((t) => !priceByType.has(t));
    if (missingTypes.length > 0) continue;

    const containerBreakdown: ContainerPriceBreakdown[] = [];
    let totalFreight = 0;
    let totalPortAdjustment = 0;
    let latestDeparture: Date | null = null;

    for (const container of containers) {
      const price = priceByType.get(container.type)!;
      const containerTotal = (price.freightPrice + originAdjustment) * container.quantity;

      containerBreakdown.push({
        type: container.type,
        quantity: container.quantity,
        unitPriceUSD: price.freightPrice,
        totalPriceUSD: containerTotal,
        freightPrice: price.freightPrice * container.quantity,
        portAdjustment: originAdjustment * container.quantity,
      });

      totalFreight += price.freightPrice * container.quantity;
      totalPortAdjustment += originAdjustment * container.quantity;

      if (!latestDeparture || price.departureDate > latestDeparture) {
        latestDeparture = price.departureDate;
      }
    }

    const adjustedTerrestrialTransport = terrestrialTransport + terrestrialSurcharge;
    const adjustedFreight = totalFreight + freightSurcharge;
    const totalFixedCosts =
      portTaxes +
      settings.customsTaxes +
      adjustedTerrestrialTransport +
      settings.commission +
      insurance;
    const totalPriceUSD = adjustedFreight + totalPortAdjustment + totalFixedCosts;

    const portIntermediate = isConstanta ? 'Constanța' : 'Odessa';
    const route = buildRouteString(input.portOrigin, portIntermediate, input.finalDestination);

    offers.push({
      rank: 0,
      shippingLine,
      basePriceId: prices[0].id,
      route,
      portOrigin: input.portOrigin,
      portIntermediate,
      portFinal: 'Chișinău',
      freightPrice: adjustedFreight,
      portAdjustment: totalPortAdjustment,
      portTaxes,
      customsTaxes: settings.customsTaxes,
      terrestrialTransport: adjustedTerrestrialTransport,
      commission: settings.commission,
      insurance,
      totalPriceUSD,
      totalPriceMDL: 0,
      containerBreakdown,
      totalContainers: totalContainerCount,
      estimatedTransitDays: estimateTransitDays(input.portOrigin, portDestination),
      availability: checkAvailability(latestDeparture || readyDate),
    });
  }

  return offers;
}

/**
 * Sort and rank offers, apply exchange rate, apply client discount if any
 */
export function finalizeOffers(
  offers: PriceOffer[],
  exchangeRate: number,
  totalContainerCount: number,
  input: ExtendedCalculatorInput,
  client?: { discount?: number | null },
  commissionPolicy: CommissionPolicy = DEFAULT_COMMISSION_POLICY
): CalculatorResult {
  // Incoterm pricing FIRST — it decides whether the buyer pays the ocean freight
  // and what the commission comes to, so the ranking below must sort on that
  // number rather than on the raw sum. This is the only place the total is
  // computed; the offer card and the order form both render what lands here.
  const incoterm: Incoterm = input.incoterm || 'FOB';
  for (const offer of offers) {
    const priced = priceOffer(offer, incoterm, commissionPolicy);
    offer.incoterm = priced.incoterm;
    offer.maritimeCharged = priced.maritimeCharged;
    offer.localTaxesTotal = priced.localTaxes;
    offer.landTransportTotal = priced.landTransport;
    offer.commissionPercent = priced.commissionPercent;
    offer.commissionBase = priced.commissionBase;
    offer.commissionAmount = priced.commissionAmount;
    offer.commission = priced.commissionAmount;
    offer.totalPriceUSD = priced.total;
  }

  // Apply client discount before sorting
  if (client?.discount) {
    offers.forEach((o) => {
      o.totalPriceUSD = Math.round(o.totalPriceUSD * (1 - client.discount! / 100) * 100) / 100;
      o.discountApplied = client.discount!;
    });
  }

  offers.sort((a, b) => a.totalPriceUSD - b.totalPriceUSD);

  const top5 = offers.slice(0, 5).map((offer, index) => ({
    ...offer,
    rank: index + 1,
    totalPriceMDL: Math.round(offer.totalPriceUSD * exchangeRate * 100) / 100,
  }));

  return {
    offers: top5,
    exchangeRate,
    calculatedAt: new Date(),
    totalContainers: totalContainerCount,
    input: {
      ...input,
      portDestination: input.portDestination || 'Constanta',
      containers: input.containers || [],
    },
  };
}

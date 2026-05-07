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
  getIncotermsExtraCost,
  EXW_CHINA_COSTS,
  LAND_TRANSPORT_CHISINAU,
} from './calculator-incoterms';
import { validateCalculatorInput } from './calculator-validation';

// Extend CalculatorInput with incoterms fields
export interface ExtendedCalculatorInput extends CalculatorInput {
  incoterm?: Incoterm;
  shippingLine?: string; // required for CFR
  finalDestination?: string; // e.g. 'chisinau', 'balti', 'constanta'
}

/**
 * Compute incoterm + final destination adjustments on top of a base offer
 */
export function applyIncotermsToOffer(
  offer: PriceOffer,
  incoterm: Incoterm,
  finalDestination: string
): PriceOffer & {
  isPriceMissing: boolean;
  incoterm: Incoterm;
  rates: {
    china?: { total: number; breakdown: { transport: number; customs: number; storage: number } };
    maritime: {
      total: number;
      breakdown: { freight: number; portAdjustment: number; portTaxes: number };
    };
    landTransport?: {
      total: number;
      breakdown: { transport: number; expedition: number; localTaxes: number; commission: number };
    };
  };
  totalDays: number;
} {
  const { chinaExtra, landTransportExtra } = getIncotermsExtraCost(incoterm, finalDestination);

  const maritimeTotal = offer.freightPrice + offer.portAdjustment + offer.portTaxes;
  const landBase =
    offer.terrestrialTransport + offer.customsTaxes + offer.commission + (offer.insurance || 0);

  let totalUSD = offer.totalPriceUSD + chinaExtra + landTransportExtra;

  // For EXW maritime is NOT in supplier price — it's already in totalPriceUSD from base calc
  // For CFR maritime is already included — but totalPriceUSD from base includes it, so no subtraction needed

  const rates: any = {
    maritime: {
      total: maritimeTotal,
      breakdown: {
        freight: offer.freightPrice,
        portAdjustment: offer.portAdjustment,
        portTaxes: offer.portTaxes,
      },
    },
  };

  if (incoterm === 'EXW') {
    rates.china = {
      total: EXW_CHINA_COSTS.total,
      breakdown: {
        transport: EXW_CHINA_COSTS.transport,
        customs: EXW_CHINA_COSTS.customs,
        storage: EXW_CHINA_COSTS.warehousing,
      },
    };
  }

  if (finalDestination && finalDestination !== 'constanta') {
    rates.landTransport = {
      total: LAND_TRANSPORT_CHISINAU.total,
      breakdown: {
        transport: LAND_TRANSPORT_CHISINAU.transport,
        expedition: LAND_TRANSPORT_CHISINAU.expedition,
        localTaxes: LAND_TRANSPORT_CHISINAU.localTaxes,
        commission: LAND_TRANSPORT_CHISINAU.commission,
      },
    };
  }

  const destLabel = DESTINATION_LABELS[finalDestination] || finalDestination;
  const portIntermediate = offer.portIntermediate;
  const portFinal =
    finalDestination && finalDestination !== 'constanta' ? destLabel : portIntermediate;
  const route = buildRouteString(offer.portOrigin, portIntermediate, finalDestination);

  return {
    ...offer,
    incoterm,
    rates,
    totalPriceUSD: totalUSD,
    totalPriceMDL: 0, // will be filled by engine after exchange rate
    route,
    portFinal,
    totalDays: offer.estimatedTransitDays,
    isPriceMissing: false,
  };
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
  const portDestination = input.portDestination || 'Constanta';
  const readyDate = new Date(input.cargoReadyDate);
  const isConstanta = isConstantaDestination(portDestination);
  const containerTypes = [...new Set(containers.map((c) => c.type))];

  const basePrices = await prisma.basePrice.findMany({
    where: {
      portOrigin: input.portOrigin,
      ...(isConstanta
        ? {
            OR: [
              { portDestination: { contains: 'Constanta', mode: 'insensitive' } },
              { portDestination: { contains: 'Constanța', mode: 'insensitive' } },
            ],
          }
        : { portDestination: { contains: 'Odessa', mode: 'insensitive' } }),
      containerType: { in: containerTypes },
      isActive: true,
      validFrom: { lte: readyDate },
      validUntil: { gte: readyDate },
    },
  });

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

  // Filter by CFR shipping line if specified
  const filteredPrices =
    input.incoterm === 'CFR' && input.shippingLine
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
    slcMap.set(`${slc.shippingLine}__${slc.containerType}`, slc.portTaxes);
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

    const slcPortTaxes = slcMap.get(`${shippingLine}__${primaryContainerType}`);
    const linePortTaxes = firstPrice.portTaxes ?? slcPortTaxes ?? portTaxes;

    const trRate = trMap.get(`${primaryContainerType}__${input.cargoWeight}`);
    const lineTerrestrialTransport =
      firstPrice.terrestrialTransport ?? trRate ?? terrestrialTransport;

    const lineCustomsTaxes = firstPrice.customsTaxes ?? settings.customsTaxes;
    const lineCommission = firstPrice.commission ?? settings.commission;

    const adjustedTerrestrialTransport = lineTerrestrialTransport + terrestrialSurcharge;
    const adjustedFreight = totalFreight + freightSurcharge;

    const totalFixedCosts =
      linePortTaxes + lineCustomsTaxes + adjustedTerrestrialTransport + lineCommission + insurance;

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
      portOrigin: input.portOrigin,
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
 * Sort and rank offers, apply exchange rate
 */
export function finalizeOffers(
  offers: PriceOffer[],
  exchangeRate: number,
  totalContainerCount: number,
  input: ExtendedCalculatorInput
): CalculatorResult {
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

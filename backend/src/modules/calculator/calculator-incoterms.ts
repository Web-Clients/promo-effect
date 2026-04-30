/**
 * Calculator Incoterms
 * EXW / FOB / CFR specific calculation adjustments
 */

export type Incoterm = 'FOB' | 'EXW' | 'CFR';

export interface ChinaInlandCosts {
  transport: number;
  customs: number;
  warehousing: number;
  total: number;
}

export interface LandTransportCosts {
  transport: number;
  expedition: number;
  localTaxes: number;
  commission: number;
  total: number;
}

export interface IncotermsBreakdown {
  incoterm: Incoterm;
  china?: ChinaInlandCosts; // Only for EXW
  maritimeIncluded?: boolean; // true for CFR — freight is in supplier price
  landTransport?: LandTransportCosts; // Only when finalDestination !== constanta
}

// Fixed costs for EXW China inland
export const EXW_CHINA_COSTS: ChinaInlandCosts = {
  transport: 500,
  customs: 250,
  warehousing: 350,
  total: 1100,
};

// Fixed costs for land transport Constanta → Chisinau / inland Moldova
export const LAND_TRANSPORT_CHISINAU: LandTransportCosts = {
  transport: 1500,
  expedition: 300,
  localTaxes: 500,
  commission: 200,
  total: 2500,
};

/**
 * Get the extra cost to add to total based on incoterm
 */
export function getIncotermsExtraCost(
  incoterm: Incoterm,
  finalDestination: string
): {
  chinaExtra: number;
  landTransportExtra: number;
  maritimeIncluded: boolean;
} {
  const chinaExtra = incoterm === 'EXW' ? EXW_CHINA_COSTS.total : 0;
  // For CFR the maritime freight is already included in the price provided by supplier/agent
  const maritimeIncluded = incoterm === 'CFR';
  const needsLandTransport = finalDestination && finalDestination !== 'constanta';
  const landTransportExtra = needsLandTransport ? LAND_TRANSPORT_CHISINAU.total : 0;

  return { chinaExtra, landTransportExtra, maritimeIncluded };
}

/**
 * Build full structured incoterms breakdown for the output
 */
export function buildIncotermsBreakdown(
  incoterm: Incoterm,
  finalDestination: string
): IncotermsBreakdown {
  const breakdown: IncotermsBreakdown = { incoterm };

  if (incoterm === 'EXW') {
    breakdown.china = { ...EXW_CHINA_COSTS };
  }

  if (incoterm === 'CFR') {
    breakdown.maritimeIncluded = true;
  }

  if (finalDestination && finalDestination !== 'constanta') {
    breakdown.landTransport = { ...LAND_TRANSPORT_CHISINAU };
  }

  return breakdown;
}

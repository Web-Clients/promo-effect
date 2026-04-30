/**
 * Task F1 — Calculator unit tests
 * Covers: calculator-engine.ts, calculator-incoterms.ts,
 *         calculator-routes.ts, calculator-validation.ts
 */

import {
  applyIncotermsToOffer,
  finalizeOffers,
  getExchangeRate,
} from '../src/modules/calculator/calculator-engine';
import {
  getIncotermsExtraCost,
  buildIncotermsBreakdown,
  EXW_CHINA_COSTS,
  LAND_TRANSPORT_CHISINAU,
} from '../src/modules/calculator/calculator-incoterms';
import {
  isConstantaDestination,
  isOdessaDestination,
  requiresLandTransport,
  buildRouteString,
  estimateTransitDays,
  checkAvailability,
  DESTINATION_LABELS,
  ORIGIN_PORT_TRANSIT_DAYS,
} from '../src/modules/calculator/calculator-routes';
import { validateCalculatorInput } from '../src/modules/calculator/calculator-validation';
import { PriceOffer } from '../src/modules/calculator/calculator.types';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const FUTURE_DATE = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() + 2);
  return d.toISOString().split('T')[0];
})();

function makeOffer(overrides: Partial<PriceOffer> = {}): PriceOffer {
  return {
    rank: 0,
    shippingLine: 'MSC',
    basePriceId: 'price-1',
    route: 'Shanghai → Constanța',
    portOrigin: 'Shanghai',
    portIntermediate: 'Constanța',
    portFinal: 'Constanța',
    freightPrice: 1000,
    portAdjustment: 100,
    portTaxes: 200,
    customsTaxes: 150,
    terrestrialTransport: 300,
    commission: 50,
    insurance: 0,
    totalPriceUSD: 1800,
    totalPriceMDL: 0,
    containerBreakdown: [
      {
        type: '20DV',
        quantity: 1,
        unitPriceUSD: 1000,
        totalPriceUSD: 1000,
        freightPrice: 1000,
        portAdjustment: 100,
      },
    ],
    totalContainers: 1,
    estimatedTransitDays: 32,
    availability: 'AVAILABLE',
    ...overrides,
  };
}

// ─── calculator-incoterms.ts ─────────────────────────────────────────────────

describe('getIncotermsExtraCost', () => {
  it('FOB + constanta → zero extra costs', () => {
    const { chinaExtra, landTransportExtra, maritimeIncluded } = getIncotermsExtraCost(
      'FOB',
      'constanta'
    );
    expect(chinaExtra).toBe(0);
    expect(landTransportExtra).toBe(0);
    expect(maritimeIncluded).toBe(false);
  });

  it('EXW → adds China inland costs', () => {
    const { chinaExtra, landTransportExtra } = getIncotermsExtraCost('EXW', 'constanta');
    expect(chinaExtra).toBe(EXW_CHINA_COSTS.total);
    expect(chinaExtra).toBe(1100);
    expect(landTransportExtra).toBe(0);
  });

  it('FOB + chisinau → adds land transport', () => {
    const { chinaExtra, landTransportExtra } = getIncotermsExtraCost('FOB', 'chisinau');
    expect(chinaExtra).toBe(0);
    expect(landTransportExtra).toBe(LAND_TRANSPORT_CHISINAU.total);
    expect(landTransportExtra).toBe(2500);
  });

  it('EXW + chisinau → adds both China + land transport', () => {
    const { chinaExtra, landTransportExtra } = getIncotermsExtraCost('EXW', 'chisinau');
    expect(chinaExtra).toBe(1100);
    expect(landTransportExtra).toBe(2500);
  });

  it('CFR → maritimeIncluded=true', () => {
    const { maritimeIncluded } = getIncotermsExtraCost('CFR', 'constanta');
    expect(maritimeIncluded).toBe(true);
  });

  it('CFR + chisinau → maritimeIncluded=true AND land transport', () => {
    const { maritimeIncluded, landTransportExtra } = getIncotermsExtraCost('CFR', 'chisinau');
    expect(maritimeIncluded).toBe(true);
    expect(landTransportExtra).toBe(2500);
  });
});

describe('EXW_CHINA_COSTS constants', () => {
  it('breakdown sums to total: 500 + 250 + 350 = 1100', () => {
    const { transport, customs, warehousing, total } = EXW_CHINA_COSTS;
    expect(transport + customs + warehousing).toBe(total);
    expect(total).toBe(1100);
  });
});

describe('LAND_TRANSPORT_CHISINAU constants', () => {
  it('breakdown sums to total: 1500 + 300 + 500 + 200 = 2500', () => {
    const { transport, expedition, localTaxes, commission, total } = LAND_TRANSPORT_CHISINAU;
    expect(transport + expedition + localTaxes + commission).toBe(total);
    expect(total).toBe(2500);
  });
});

describe('buildIncotermsBreakdown', () => {
  it('EXW → has china costs, no maritimeIncluded', () => {
    const breakdown = buildIncotermsBreakdown('EXW', 'constanta');
    expect(breakdown.incoterm).toBe('EXW');
    expect(breakdown.china).toBeDefined();
    expect(breakdown.china!.total).toBe(1100);
    expect(breakdown.maritimeIncluded).toBeUndefined();
    expect(breakdown.landTransport).toBeUndefined();
  });

  it('CFR → maritimeIncluded=true, no china', () => {
    const breakdown = buildIncotermsBreakdown('CFR', 'constanta');
    expect(breakdown.maritimeIncluded).toBe(true);
    expect(breakdown.china).toBeUndefined();
  });

  it('FOB + chisinau → has landTransport', () => {
    const breakdown = buildIncotermsBreakdown('FOB', 'chisinau');
    expect(breakdown.landTransport).toBeDefined();
    expect(breakdown.landTransport!.total).toBe(2500);
  });

  it('FOB + constanta → minimal breakdown, no extras', () => {
    const breakdown = buildIncotermsBreakdown('FOB', 'constanta');
    expect(breakdown.china).toBeUndefined();
    expect(breakdown.landTransport).toBeUndefined();
    expect(breakdown.maritimeIncluded).toBeUndefined();
  });
});

// ─── calculator-routes.ts ─────────────────────────────────────────────────────

describe('isConstantaDestination', () => {
  it.each([
    ['Constanta', true],
    ['constanta', true],
    ['Constanța', true],
    ['CONSTANTA', true],
    ['Odessa', false],
    ['Shanghai', false],
  ])('"%s" → %s', (port, expected) => {
    expect(isConstantaDestination(port)).toBe(expected);
  });
});

describe('isOdessaDestination', () => {
  it.each([
    ['Odessa', true],
    ['ODESSA', true],
    ['odessa', true],
    ['Constanta', false],
  ])('"%s" → %s', (port, expected) => {
    expect(isOdessaDestination(port)).toBe(expected);
  });
});

describe('requiresLandTransport', () => {
  it.each([
    ['chisinau', true],
    ['balti', true],
    ['cahul', true],
    ['constanta', false],
    ['', false],
  ])('"%s" → %s', (dest, expected) => {
    expect(requiresLandTransport(dest)).toBe(expected);
  });
});

describe('buildRouteString', () => {
  it('no final destination → two-leg route', () => {
    expect(buildRouteString('Shanghai', 'Constanța', undefined)).toBe('Shanghai → Constanța');
  });

  it('finalDestination = constanta → two-leg route', () => {
    expect(buildRouteString('Shanghai', 'Constanța', 'constanta')).toBe('Shanghai → Constanța');
  });

  it('finalDestination = chisinau → three-leg route with label', () => {
    expect(buildRouteString('Shanghai', 'Constanța', 'chisinau')).toBe(
      'Shanghai → Constanța → Chișinău'
    );
  });

  it('finalDestination = balti → three-leg route', () => {
    expect(buildRouteString('Ningbo', 'Odessa', 'balti')).toBe('Ningbo → Odessa → Bălți');
  });
});

describe('DESTINATION_LABELS', () => {
  it('has correct labels for all inland destinations', () => {
    expect(DESTINATION_LABELS.constanta).toBe('Constanța');
    expect(DESTINATION_LABELS.chisinau).toBe('Chișinău');
    expect(DESTINATION_LABELS.balti).toBe('Bălți');
  });
});

describe('estimateTransitDays', () => {
  it('Shanghai → Constanta = 32 days', () => {
    expect(estimateTransitDays('Shanghai', 'Constanta')).toBe(32);
  });

  it('Shanghai → Constanța (diacritic) = 32 days', () => {
    expect(estimateTransitDays('Shanghai', 'Constanța')).toBe(32);
  });

  it('Shanghai → Odessa = 30 days', () => {
    expect(estimateTransitDays('Shanghai', 'Odessa')).toBe(30);
  });

  it('Tianjin → Constanta = 28 days (shorter route)', () => {
    expect(estimateTransitDays('Tianjin', 'Constanta')).toBe(28);
  });

  it('Unknown origin → fallback 30 days', () => {
    expect(estimateTransitDays('UnknownPort', 'Constanta')).toBe(30);
  });

  it.each(Object.keys(ORIGIN_PORT_TRANSIT_DAYS))('known port %s → returns valid number', (port) => {
    const days = estimateTransitDays(port, 'Constanta');
    expect(typeof days).toBe('number');
    expect(days).toBeGreaterThan(0);
  });
});

describe('checkAvailability', () => {
  it('date > 14 days away → AVAILABLE', () => {
    const d = new Date();
    d.setDate(d.getDate() + 20);
    expect(checkAvailability(d)).toBe('AVAILABLE');
  });

  it('date 8-14 days away → LIMITED', () => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    expect(checkAvailability(d)).toBe('LIMITED');
  });

  it('date ≤ 7 days away → UNAVAILABLE', () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    expect(checkAvailability(d)).toBe('UNAVAILABLE');
  });

  it('past date → UNAVAILABLE', () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    expect(checkAvailability(d)).toBe('UNAVAILABLE');
  });
});

// ─── calculator-validation.ts ─────────────────────────────────────────────────

describe('validateCalculatorInput', () => {
  const validInput = {
    portOrigin: 'Shanghai',
    containerType: '20DV',
    cargoWeight: '18-23',
    cargoReadyDate: FUTURE_DATE,
  };

  it('passes for valid input', () => {
    expect(() => validateCalculatorInput(validInput as any)).not.toThrow();
  });

  it('throws if portOrigin missing', () => {
    expect(() => validateCalculatorInput({ ...validInput, portOrigin: '' } as any)).toThrow(
      'Portul de origine este obligatoriu'
    );
  });

  it('throws if containerType missing', () => {
    expect(() => validateCalculatorInput({ ...validInput, containerType: '' } as any)).toThrow(
      'Tipul containerului este obligatoriu'
    );
  });

  it('throws if cargoWeight missing', () => {
    expect(() => validateCalculatorInput({ ...validInput, cargoWeight: '' } as any)).toThrow(
      'Greutatea mărfii este obligatorie'
    );
  });

  it('throws if cargoReadyDate missing', () => {
    expect(() => validateCalculatorInput({ ...validInput, cargoReadyDate: '' } as any)).toThrow(
      'Data pregătirii mărfii este obligatorie'
    );
  });

  it('throws for invalid date string', () => {
    expect(() =>
      validateCalculatorInput({ ...validInput, cargoReadyDate: 'not-a-date' } as any)
    ).toThrow('Data pregătirii mărfii este invalidă');
  });

  it('throws if date is in the past', () => {
    expect(() =>
      validateCalculatorInput({ ...validInput, cargoReadyDate: '2020-01-01' } as any)
    ).toThrow('Data pregătirii mărfii trebuie să fie în viitor');
  });

  it('throws if CFR without shippingLine', () => {
    expect(() =>
      validateCalculatorInput({
        ...validInput,
        incoterm: 'CFR',
        shippingLine: undefined,
      } as any)
    ).toThrow('Pentru CFR selectați linia maritimă');
  });

  it('passes if CFR with shippingLine', () => {
    expect(() =>
      validateCalculatorInput({
        ...validInput,
        incoterm: 'CFR',
        shippingLine: 'MSC',
      } as any)
    ).not.toThrow();
  });
});

// ─── calculator-engine.ts (pure functions) ───────────────────────────────────

describe('applyIncotermsToOffer', () => {
  it('FOB + constanta → total unchanged', () => {
    const offer = makeOffer({ totalPriceUSD: 1800 });
    const result = applyIncotermsToOffer(offer, 'FOB', 'constanta');
    expect(result.totalPriceUSD).toBe(1800);
    expect(result.incoterm).toBe('FOB');
    expect(result.isPriceMissing).toBe(false);
  });

  it('EXW + constanta → adds 1100', () => {
    const offer = makeOffer({ totalPriceUSD: 1800 });
    const result = applyIncotermsToOffer(offer, 'EXW', 'constanta');
    expect(result.totalPriceUSD).toBe(1800 + 1100);
    expect(result.rates.china).toBeDefined();
    expect(result.rates.china!.total).toBe(1100);
  });

  it('FOB + chisinau → adds land transport 2500', () => {
    const offer = makeOffer({ totalPriceUSD: 1800 });
    const result = applyIncotermsToOffer(offer, 'FOB', 'chisinau');
    expect(result.totalPriceUSD).toBe(1800 + 2500);
    expect(result.rates.landTransport).toBeDefined();
    expect(result.rates.landTransport!.total).toBe(2500);
  });

  it('EXW + chisinau → adds both 1100 + 2500 = 3600', () => {
    const offer = makeOffer({ totalPriceUSD: 1800 });
    const result = applyIncotermsToOffer(offer, 'EXW', 'chisinau');
    expect(result.totalPriceUSD).toBe(1800 + 1100 + 2500);
    expect(result.rates.china).toBeDefined();
    expect(result.rates.landTransport).toBeDefined();
  });

  it('includes maritime rate breakdown', () => {
    const offer = makeOffer({ freightPrice: 1000, portAdjustment: 100, portTaxes: 200 });
    const result = applyIncotermsToOffer(offer, 'FOB', 'constanta');
    expect(result.rates.maritime.total).toBe(1000 + 100 + 200);
    expect(result.rates.maritime.breakdown.freight).toBe(1000);
    expect(result.rates.maritime.breakdown.portAdjustment).toBe(100);
    expect(result.rates.maritime.breakdown.portTaxes).toBe(200);
  });

  it('builds correct route string for chisinau', () => {
    const offer = makeOffer();
    const result = applyIncotermsToOffer(offer, 'FOB', 'chisinau');
    expect(result.route).toContain('Chișinău');
  });

  it('no landTransport rates for constanta destination', () => {
    const offer = makeOffer();
    const result = applyIncotermsToOffer(offer, 'FOB', 'constanta');
    expect(result.rates.landTransport).toBeUndefined();
  });
});

describe('finalizeOffers', () => {
  it('sorts offers by totalPriceUSD ascending', () => {
    const offers = [
      makeOffer({ totalPriceUSD: 3000 }),
      makeOffer({ totalPriceUSD: 1500 }),
      makeOffer({ totalPriceUSD: 2000 }),
    ];
    const result = finalizeOffers(offers, 18, 1, {
      portOrigin: 'Shanghai',
      containerType: '20DV',
      cargoWeight: '18-23',
      cargoReadyDate: FUTURE_DATE,
      portDestination: 'Constanta',
      containers: [],
    } as any);
    expect(result.offers[0].totalPriceUSD).toBe(1500);
    expect(result.offers[1].totalPriceUSD).toBe(2000);
    expect(result.offers[2].totalPriceUSD).toBe(3000);
  });

  it('applies exchange rate for MDL conversion', () => {
    const offers = [makeOffer({ totalPriceUSD: 1000 })];
    const result = finalizeOffers(offers, 18, 1, {
      portOrigin: 'Shanghai',
      containerType: '20DV',
      cargoWeight: '18-23',
      cargoReadyDate: FUTURE_DATE,
      portDestination: 'Constanta',
      containers: [],
    } as any);
    expect(result.offers[0].totalPriceMDL).toBe(18000);
    expect(result.exchangeRate).toBe(18);
  });

  it('assigns rank 1..N to offers', () => {
    const offers = [makeOffer({ totalPriceUSD: 1000 }), makeOffer({ totalPriceUSD: 2000 })];
    const result = finalizeOffers(offers, 18, 2, {
      portOrigin: 'Shanghai',
      containerType: '20DV',
      cargoWeight: '18-23',
      cargoReadyDate: FUTURE_DATE,
      portDestination: 'Constanta',
      containers: [],
    } as any);
    expect(result.offers[0].rank).toBe(1);
    expect(result.offers[1].rank).toBe(2);
  });

  it('caps output at 5 offers', () => {
    const offers = Array.from({ length: 8 }, (_, i) =>
      makeOffer({ totalPriceUSD: 1000 + i * 100 })
    );
    const result = finalizeOffers(offers, 18, 1, {
      portOrigin: 'Shanghai',
      containerType: '20DV',
      cargoWeight: '18-23',
      cargoReadyDate: FUTURE_DATE,
      portDestination: 'Constanta',
      containers: [],
    } as any);
    expect(result.offers.length).toBeLessThanOrEqual(5);
  });

  it('empty offers → returns empty array', () => {
    const result = finalizeOffers([], 18, 0, {
      portOrigin: 'Shanghai',
      containerType: '20DV',
      cargoWeight: '18-23',
      cargoReadyDate: FUTURE_DATE,
      portDestination: 'Constanta',
      containers: [],
    } as any);
    expect(result.offers).toHaveLength(0);
  });
});

// ─── Edge case: weight boundary values ────────────────────────────────────────

describe('Weight boundary edge cases in validation', () => {
  const validInput = {
    portOrigin: 'Shanghai',
    containerType: '20DV',
    cargoReadyDate: FUTURE_DATE,
  };

  it('weight = "1-18" is valid', () => {
    expect(() =>
      validateCalculatorInput({ ...validInput, cargoWeight: '1-18' } as any)
    ).not.toThrow();
  });

  it('weight = "18-23" boundary is valid', () => {
    expect(() =>
      validateCalculatorInput({ ...validInput, cargoWeight: '18-23' } as any)
    ).not.toThrow();
  });

  it('weight = "23-24" boundary is valid', () => {
    expect(() =>
      validateCalculatorInput({ ...validInput, cargoWeight: '23-24' } as any)
    ).not.toThrow();
  });

  it('weight = "24-25" boundary is valid', () => {
    expect(() =>
      validateCalculatorInput({ ...validInput, cargoWeight: '24-25' } as any)
    ).not.toThrow();
  });
});

// ─── Incoterm × destination × container combination matrix ───────────────────

describe('Incoterm × destination combinations', () => {
  const incoterms = ['FOB', 'EXW', 'CFR'] as const;
  const destinations = ['constanta', 'chisinau', 'balti'] as const;
  const containerTypes = ['20DV', '40DV', '40HQ', '45HQ', '20OT', '40OT', '20RF'] as const;

  for (const incoterm of incoterms) {
    for (const destination of destinations) {
      it(`${incoterm} + ${destination} → valid total`, () => {
        const base = makeOffer({ totalPriceUSD: 2000 });
        const result = applyIncotermsToOffer(base, incoterm, destination);
        expect(result.totalPriceUSD).toBeGreaterThanOrEqual(2000);
        expect(result.isPriceMissing).toBe(false);
        expect(result.incoterm).toBe(incoterm);
      });
    }
  }

  for (const ct of containerTypes) {
    it(`container type ${ct} passes validation`, () => {
      const input = {
        portOrigin: 'Shanghai',
        containerType: ct,
        cargoWeight: '18-23',
        cargoReadyDate: FUTURE_DATE,
      };
      expect(() => validateCalculatorInput(input as any)).not.toThrow();
    });
  }
});

// ─── Snapshot tests for pricing breakdown ─────────────────────────────────────

describe('Pricing breakdown snapshots', () => {
  it('EXW + chisinau breakdown snapshot', () => {
    const offer = makeOffer({
      totalPriceUSD: 1800,
      freightPrice: 1000,
      portAdjustment: 100,
      portTaxes: 200,
    });
    const result = applyIncotermsToOffer(offer, 'EXW', 'chisinau');
    expect({
      totalPriceUSD: result.totalPriceUSD,
      chinaCost: result.rates.china?.total,
      landTransportCost: result.rates.landTransport?.total,
      maritimeTotal: result.rates.maritime.total,
    }).toMatchSnapshot();
  });

  it('FOB + constanta breakdown snapshot', () => {
    const offer = makeOffer({ totalPriceUSD: 1800 });
    const result = applyIncotermsToOffer(offer, 'FOB', 'constanta');
    expect({
      totalPriceUSD: result.totalPriceUSD,
      chinaCost: result.rates.china?.total,
      landTransportCost: result.rates.landTransport?.total,
    }).toMatchSnapshot();
  });
});

// ─── getExchangeRate (with fetch mock) ────────────────────────────────────────

describe('getExchangeRate', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns rate from API response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { MDL: 17.8 } }),
    }) as any;
    const rate = await getExchangeRate('USD', 'MDL');
    expect(rate).toBe(17.8);
  });

  it('returns fallback 18.0 when fetch fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as any;
    const rate = await getExchangeRate('USD', 'MDL');
    expect(rate).toBe(18.0);
  });

  it('returns fallback 18.0 when response not ok', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    }) as any;
    const rate = await getExchangeRate('USD', 'MDL');
    expect(rate).toBe(18.0);
  });
});

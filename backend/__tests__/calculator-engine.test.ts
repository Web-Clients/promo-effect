/**
 * Task F1 — Calculator unit tests
 * Covers: calculator-engine.ts, calculator-incoterms.ts,
 *         calculator-routes.ts, calculator-validation.ts
 */

import { finalizeOffers, getExchangeRate } from '../src/modules/calculator/calculator-engine';
import { Incoterm } from '../src/modules/calculator/calculator-incoterms';
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
    ).toThrow('Pentru CFR/CIF selectați linia maritimă');
  });

  it('throws if CIF without shippingLine — CIF used to slip past this check', () => {
    expect(() =>
      validateCalculatorInput({
        ...validInput,
        incoterm: 'CIF',
        shippingLine: undefined,
      } as any)
    ).toThrow('Pentru CFR/CIF selectați linia maritimă');
  });

  it('does not require a port of origin under CFR/CIF — the seller chose it', () => {
    for (const incoterm of ['CFR', 'CIF']) {
      expect(() =>
        validateCalculatorInput({
          ...validInput,
          portOrigin: '',
          incoterm,
          shippingLine: 'Maersk',
        } as any)
      ).not.toThrow();
    }
  });

  it('still requires a port of origin under FOB/EXW', () => {
    for (const incoterm of ['FOB', 'EXW']) {
      expect(() =>
        validateCalculatorInput({ ...validInput, portOrigin: '', incoterm } as any)
      ).toThrow();
    }
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

describe('finalizeOffers', () => {
  // finalizeOffers now DERIVES the total from the legs instead of passing through
  // whatever totalPriceUSD a caller happened to set. Ranking therefore has to
  // sort on the derived number — an offer with cheap freight but an expensive
  // land leg must not win just because its stale pre-incoterm sum was lower.
  it('sorts by the derived total, not by the incoming totalPriceUSD', () => {
    const offers = [
      makeOffer({ freightPrice: 3000, totalPriceUSD: 1 }),
      makeOffer({ freightPrice: 1000, totalPriceUSD: 99999 }),
      makeOffer({ freightPrice: 2000, totalPriceUSD: 500 }),
    ];
    const result = finalizeOffers(offers, 18, 1, {
      portOrigin: 'Shanghai',
      containerType: '20DV',
      cargoWeight: '18-23',
      cargoReadyDate: FUTURE_DATE,
      portDestination: 'Constanta',
      containers: [],
    } as any);
    // legs beyond freight are identical: +100 adj, 350 local, 300 land, 65 commission
    expect(result.offers.map((o) => o.totalPriceUSD)).toEqual([1815, 2815, 3815]);
  });

  it('applies exchange rate for MDL conversion', () => {
    const offers = [makeOffer()];
    const result = finalizeOffers(offers, 18, 1, {
      portOrigin: 'Shanghai',
      containerType: '20DV',
      cargoWeight: '18-23',
      cargoReadyDate: FUTURE_DATE,
      portDestination: 'Constanta',
      containers: [],
    } as any);
    expect(result.offers[0].totalPriceUSD).toBe(1815);
    expect(result.offers[0].totalPriceMDL).toBe(1815 * 18);
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

/**
 * Price one offer through the path `calculatePrices` actually takes.
 * The removed `applyIncotermsToOffer` was never called in production, so the
 * assertions that used it proved nothing about the live quote.
 */
function priceViaEngine(offer: PriceOffer, incoterm: Incoterm, finalDestination: string) {
  const result = finalizeOffers([{ ...offer }], 18, 1, {
    portOrigin: offer.portOrigin,
    containerType: '20DV',
    cargoWeight: '18-23',
    cargoReadyDate: FUTURE_DATE,
    portDestination: 'Constanta',
    containers: [],
    incoterm,
    finalDestination,
  } as never).offers[0];
  return result;
}

// ─── Incoterm × destination × container combination matrix ───────────────────

describe('Incoterm × destination combinations', () => {
  // CIF is in the matrix now. It used to be a frontend-only button: the backend
  // enum stopped at CFR, so a CIF quote skipped every maritime rule.
  const incoterms = ['FOB', 'EXW', 'CFR', 'CIF'] as const;
  const destinations = ['constanta', 'chisinau', 'balti'] as const;
  const containerTypes = ['20DV', '40DV', '40HQ', '45HQ', '20OT', '40OT', '20RF'] as const;

  for (const incoterm of incoterms) {
    for (const destination of destinations) {
      it(`${incoterm} + ${destination} → valid total`, () => {
        const result = priceViaEngine(makeOffer(), incoterm, destination);
        // legs: maritime 1100, local 350, land 300; commission 10% of 650 = 65
        const supplierPaysFreight = incoterm === 'CFR' || incoterm === 'CIF';
        expect(result.totalPriceUSD).toBe(supplierPaysFreight ? 715 : 1815);
        expect(result.maritimeCharged).toBe(supplierPaysFreight ? 0 : 1100);
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
  // The breakdown the offer card renders. Snapshotting it here means a change to
  // any leg or to the commission shows up as a reviewable diff instead of
  // quietly moving what the client is quoted.
  const breakdown = (incoterm: 'FOB' | 'EXW' | 'CFR' | 'CIF', destination: string) => {
    const result = priceViaEngine(makeOffer(), incoterm, destination);
    return {
      totalPriceUSD: result.totalPriceUSD,
      maritimeCharged: result.maritimeCharged,
      localTaxesTotal: result.localTaxesTotal,
      landTransportTotal: result.landTransportTotal,
      commissionPercent: result.commissionPercent,
      commissionBase: result.commissionBase,
      commissionAmount: result.commissionAmount,
    };
  };

  it('EXW + chisinau breakdown snapshot', () => {
    expect(breakdown('EXW', 'chisinau')).toMatchSnapshot();
  });

  it('FOB + constanta breakdown snapshot', () => {
    expect(breakdown('FOB', 'constanta')).toMatchSnapshot();
  });

  it('CFR + chisinau breakdown snapshot', () => {
    expect(breakdown('CFR', 'chisinau')).toMatchSnapshot();
  });

  it('CIF + chisinau breakdown snapshot', () => {
    expect(breakdown('CIF', 'chisinau')).toMatchSnapshot();
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

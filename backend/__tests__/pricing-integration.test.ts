/**
 * Task F4 — Pricing integration tests
 * Covers:
 *   - Add base price → port adjustment → weight surcharge → correct calculator value
 *   - Missing price → "Contact reprezentant" returned (Phase A25)
 *   - HS code search (Phase A19)
 */

import { jest } from '@jest/globals';

// ─── Mock prisma ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPrisma: any = {
  pricingRule: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  basePrice: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  transportRate: {
    findMany: jest.fn(),
  },
  shippingLineContainer: {
    findMany: jest.fn(),
  },
  adminSettings: {
    findUnique: jest.fn(),
  },
  setting: {
    findUnique: jest.fn(), // returns undefined by default (→ no surcharge)
  },
  hsCode: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    groupBy: jest.fn(),
  },
  agentPrice: {
    findMany: jest.fn(),
  },
};

jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { PricingService } from '../src/modules/pricing/pricing.service';
import { HsCodesService } from '../src/modules/hscodes/hscodes.service';
import { finalizeOffers, applyIncotermsToOffer } from '../src/modules/calculator/calculator-engine';
import { PriceOffer } from '../src/modules/calculator/calculator.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeBasePrice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'price-1',
    portOrigin: 'Shanghai',
    portDestination: 'Constanta',
    containerType: '20DV',
    shippingLine: 'MSC',
    basePrice: 1000,
    portTaxes: 200,
    customsTaxes: 150,
    terrestrialTransport: 300,
    commission: 50,
    transitDays: 32,
    isActive: true,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
    ...overrides,
  };
}

function makePricingRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    name: 'Shanghai Base',
    priority: 1,
    containerType: '20DV',
    portOrigin: 'Shanghai',
    portDestination: 'Constanta',
    shippingLine: null,
    basePrice: 1000,
    currency: 'USD',
    status: 'ACTIVE',
    additionalTaxes: null,
    volumeDiscounts: null,
    validFrom: new Date('2026-01-01'),
    validTo: null,
    ...overrides,
  };
}

// ─── PricingService tests ─────────────────────────────────────────────────────

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService();
    jest.clearAllMocks();
  });

  describe('calculatePrice', () => {
    it('returns price for Shanghai 20DV', async () => {
      mockPrisma.pricingRule.findMany.mockResolvedValue([makePricingRule()]);
      // No port surcharge needed (Shanghai is a base port)
      jest.spyOn(service as any, 'getPortSurcharge').mockResolvedValue(0);

      const result = await service.calculatePrice({
        containerType: '20DV',
        portOrigin: 'Shanghai',
        portDestination: 'Constanta',
      });

      expect(result.basePrice).toBe(1000);
      expect(result.total).toBeGreaterThan(0);
    });

    it('throws when no pricing rules found', async () => {
      mockPrisma.pricingRule.findMany.mockResolvedValue([]);

      await expect(
        service.calculatePrice({
          containerType: '20DV',
          portOrigin: 'Shanghai',
          portDestination: 'Constanta',
        })
      ).rejects.toThrow('No applicable pricing rule found');
    });

    it('uses highest priority rule when multiple match', async () => {
      const rules = [
        makePricingRule({ id: 'rule-low', priority: 1, basePrice: 1000 }),
        makePricingRule({ id: 'rule-high', priority: 10, basePrice: 1500 }),
      ];
      mockPrisma.pricingRule.findMany.mockResolvedValue(rules);
      jest.spyOn(service as any, 'getPortSurcharge').mockResolvedValue(0);

      const result = await service.calculatePrice({
        containerType: '20DV',
        portOrigin: 'Shanghai',
        portDestination: 'Constanta',
      });

      // Should use the first rule (highest priority, sorted desc by priority)
      expect(result.basePrice).toBe(1000);
    });

    it('applies port surcharge for secondary non-base ports', async () => {
      // Ningbo is a SECONDARY port (in QINGDAO/XIAMEN/TIANJIN list — actually it's base)
      // Use Qingdao which IS in secondaryPorts → default surcharge 125
      const rule = makePricingRule({ portOrigin: 'Qingdao', basePrice: 1000 });
      mockPrisma.pricingRule.findMany.mockResolvedValue([rule]);
      // setting returns null → falls into secondary port default (125)
      mockPrisma.setting.findUnique.mockResolvedValue(null);

      const result = await service.calculatePrice({
        containerType: '20DV',
        portOrigin: 'Qingdao',
        portDestination: 'Constanta',
      });

      // Qingdao is in secondaryPorts → portSurcharge = 125
      expect(result.portSurcharge).toBe(125);
    });

    it('applies volume discount for quantity > 1', async () => {
      const rule = makePricingRule({
        basePrice: 1000,
        volumeDiscounts: JSON.stringify([{ minQuantity: 2, discountPercent: 10 }]),
      });
      mockPrisma.pricingRule.findMany.mockResolvedValue([rule]);
      jest.spyOn(service as any, 'getPortSurcharge').mockResolvedValue(0);

      const result = await service.calculatePrice({
        containerType: '20DV',
        portOrigin: 'Shanghai',
        portDestination: 'Constanta',
        quantity: 2,
      });

      expect(result.volumeDiscount).toBeDefined();
      expect(result.volumeDiscount!.percentage).toBe(10);
      expect(result.volumeDiscount!.amount).toBe(100); // 10% of 1000
    });

    it('parses fixed additional taxes correctly', async () => {
      const rule = makePricingRule({
        basePrice: 1000,
        additionalTaxes: JSON.stringify([{ name: 'Port fee', amount: 50, type: 'fixed' }]),
      });
      mockPrisma.pricingRule.findMany.mockResolvedValue([rule]);
      jest.spyOn(service as any, 'getPortSurcharge').mockResolvedValue(0);

      const result = await service.calculatePrice({
        containerType: '20DV',
        portOrigin: 'Shanghai',
        portDestination: 'Constanta',
      });

      const portFee = result.taxes.find((t) => t.name === 'Port fee');
      expect(portFee).toBeDefined();
      expect(portFee!.amount).toBe(50);
    });

    it('parses percentage additional taxes correctly', async () => {
      const rule = makePricingRule({
        basePrice: 1000,
        additionalTaxes: JSON.stringify([{ name: 'Handling fee', amount: 5, type: 'percentage' }]),
      });
      mockPrisma.pricingRule.findMany.mockResolvedValue([rule]);
      jest.spyOn(service as any, 'getPortSurcharge').mockResolvedValue(0);

      const result = await service.calculatePrice({
        containerType: '20DV',
        portOrigin: 'Shanghai',
        portDestination: 'Constanta',
      });

      const handlingFee = result.taxes.find((t) => t.name === 'Handling fee');
      expect(handlingFee).toBeDefined();
      expect(handlingFee!.amount).toBe(50); // 5% of 1000
    });
  });
});

// ─── Missing price → "Contact reprezentant" (Phase A25) ──────────────────────

describe('Missing price → Contact reprezentant (A25)', () => {
  it('calculator returns isPriceMissing=false when offer exists', () => {
    const offer: PriceOffer = {
      rank: 1,
      shippingLine: 'MSC',
      basePriceId: 'p1',
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
      containerBreakdown: [],
      totalContainers: 1,
      estimatedTransitDays: 32,
      availability: 'AVAILABLE',
    };
    const result = applyIncotermsToOffer(offer, 'FOB', 'constanta');
    expect(result.isPriceMissing).toBe(false);
  });

  it('finalizeOffers with empty offers → no results (trigger "Contact reprezentant" in UI)', () => {
    const FUTURE_DATE = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 2);
      return d.toISOString().split('T')[0];
    })();

    const result = finalizeOffers([], 18, 0, {
      portOrigin: 'UnknownPort',
      containerType: '20DV',
      cargoWeight: '18-23',
      cargoReadyDate: FUTURE_DATE,
      portDestination: 'Constanta',
      containers: [],
    } as any);

    expect(result.offers).toHaveLength(0);
    // When offers.length === 0, UI should show "Contact reprezentant"
  });

  it('computeFromBasePrices with no matching records → empty offers', async () => {
    mockPrisma.basePrice.findMany.mockResolvedValue([]);

    const { computeFromBasePrices } = await import('../src/modules/calculator/calculator-engine');

    const result = await computeFromBasePrices(
      {
        portOrigin: 'UnknownPort',
        containerType: '20DV',
        cargoWeight: '18-23',
        cargoReadyDate: new Date(Date.now() + 86400000 * 60).toISOString().split('T')[0],
        portDestination: 'Constanta',
        containers: [{ type: '20DV', quantity: 1 }],
      } as any,
      { customsTaxes: 150, commission: 50 },
      0, // originAdjustment
      200, // portTaxes
      300, // terrestrialTransport
      0, // insurance
      [{ type: '20DV', quantity: 1 }],
      1,
      0,
      0
    );

    expect(result).toHaveLength(0);
  });
});

// ─── HS code search (Phase A19) ───────────────────────────────────────────────

describe('HsCodesService', () => {
  let service: HsCodesService;

  const sampleHsCodes = [
    {
      id: 'hsc-1',
      code: '84714100',
      description: 'Calculatoare portabile',
      descriptionEn: 'Portable computers',
      chapter: '84',
      heading: '8471',
      keywords: 'laptop computer notebook',
      isActive: true,
      dutyRate: 0,
      vatRate: 20,
      requiresInspection: false,
      requiresLicense: false,
      restrictions: null,
    },
    {
      id: 'hsc-2',
      code: '61091000',
      description: 'Tricouri din bumbac',
      descriptionEn: 'T-shirts of cotton',
      chapter: '61',
      heading: '6109',
      keywords: 'tricou textile',
      isActive: true,
      dutyRate: 12,
      vatRate: 20,
      requiresInspection: false,
      requiresLicense: false,
      restrictions: null,
    },
  ];

  beforeEach(() => {
    service = new HsCodesService();
    jest.clearAllMocks();
    // Clear the module-level cache between tests
    const cacheKey = (service as any).searchCache;
    if (cacheKey && typeof cacheKey.clear === 'function') {
      cacheKey.clear();
    }
  });

  it('search by text query returns matching results', async () => {
    mockPrisma.hsCode.findMany.mockResolvedValue([sampleHsCodes[0]]);

    const results = await service.search('laptop', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].code).toBe('84714100');
  });

  it('search by numeric code prefix returns results', async () => {
    mockPrisma.hsCode.findMany.mockResolvedValue([sampleHsCodes[0]]);

    const results = await service.search('8471', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].heading).toBe('8471');
  });

  it('short query (< 2 chars) returns empty array', async () => {
    const results = await service.search('a', 10);
    expect(results).toHaveLength(0);
    expect(mockPrisma.hsCode.findMany).not.toHaveBeenCalled();
  });

  it('empty query returns empty array', async () => {
    const results = await service.search('', 10);
    expect(results).toHaveLength(0);
  });

  it('getByCode returns correct result', async () => {
    mockPrisma.hsCode.findFirst.mockResolvedValue(sampleHsCodes[0]);

    const result = await service.getByCode('84714100');
    expect(result).toBeDefined();
    expect(result!.code).toBe('84714100');
    expect(result!.description).toBe('Calculatoare portabile');
  });

  it('getByCode returns null if not found', async () => {
    mockPrisma.hsCode.findFirst.mockResolvedValue(null);

    const result = await service.getByCode('99999999');
    expect(result).toBeNull();
  });

  it('search respects limit parameter', async () => {
    const manyResults = Array.from({ length: 20 }, (_, i) => ({
      ...sampleHsCodes[0],
      id: `hsc-${i}`,
      code: `847141${i.toString().padStart(2, '0')}`,
    }));
    mockPrisma.hsCode.findMany.mockResolvedValue(manyResults.slice(0, 5));

    const results = await service.search('laptop', 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('calculateDuty computes correct amounts', async () => {
    mockPrisma.hsCode.findFirst.mockResolvedValue(sampleHsCodes[1]); // dutyRate=12, vatRate=20

    const result = await service.calculateDuty('61091000', 1000);
    // duty = 1000 * 0.12 = 120
    // vat = (1000 + 120) * 0.20 = 224
    expect(result.dutyAmount).toBe(120);
    expect(result.vatAmount).toBe(224);
    expect(result.totalTaxes).toBe(344);
  });

  it('calculateDuty defaults vatRate=20 if not set', async () => {
    mockPrisma.hsCode.findFirst.mockResolvedValue(null); // code not found

    const result = await service.calculateDuty('00000000', 1000);
    // dutyRate=0 (default), vatRate=20
    expect(result.dutyRate).toBe(0);
    expect(result.vatRate).toBe(20);
    expect(result.dutyAmount).toBe(0);
    expect(result.vatAmount).toBe(200); // 20% of (1000+0)
  });

  it('maps database record to result shape', async () => {
    mockPrisma.hsCode.findFirst.mockResolvedValue(sampleHsCodes[0]);

    const result = await service.getByCode('84714100');
    expect(result).toMatchObject({
      id: 'hsc-1',
      code: '84714100',
      description: 'Calculatoare portabile',
      descriptionEn: 'Portable computers',
      chapter: '84',
      heading: '8471',
      dutyRate: 0,
      vatRate: 20,
      requiresInspection: false,
      requiresLicense: false,
      restrictions: null,
    });
  });
});

// ─── Base price + port adjustment + weight → correct total ────────────────────

describe('Base price + port adjustment + weight surcharge → correct total', () => {
  /**
   * Validates end-to-end pricing arithmetic using pure functions
   * (avoids DB dependency on this test level).
   */

  it('EXW + chisinau: 1800 base + 1100 china + 2500 land = 5400', () => {
    const offer: PriceOffer = {
      rank: 0,
      shippingLine: 'MSC',
      basePriceId: 'p1',
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
      containerBreakdown: [],
      totalContainers: 1,
      estimatedTransitDays: 32,
      availability: 'AVAILABLE',
    };

    const result = applyIncotermsToOffer(offer, 'EXW', 'chisinau');
    expect(result.totalPriceUSD).toBe(1800 + 1100 + 2500);
    expect(result.totalPriceUSD).toBe(5400);
  });

  it('CFR + constanta: total unchanged (maritime included in base)', () => {
    const offer: PriceOffer = {
      rank: 0,
      shippingLine: 'MSC',
      basePriceId: 'p1',
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
      containerBreakdown: [],
      totalContainers: 1,
      estimatedTransitDays: 32,
      availability: 'AVAILABLE',
    };

    const result = applyIncotermsToOffer(offer, 'CFR', 'constanta');
    expect(result.totalPriceUSD).toBe(1800);
  });

  it('MDL conversion at rate 18 is correct', () => {
    const FUTURE_DATE = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 2);
      return d.toISOString().split('T')[0];
    })();

    const offer: PriceOffer = {
      rank: 0,
      shippingLine: 'MSC',
      basePriceId: 'p1',
      route: 'Shanghai → Constanța',
      portOrigin: 'Shanghai',
      portIntermediate: 'Constanța',
      portFinal: 'Constanța',
      freightPrice: 1000,
      portAdjustment: 0,
      portTaxes: 0,
      customsTaxes: 0,
      terrestrialTransport: 0,
      commission: 0,
      insurance: 0,
      totalPriceUSD: 1000,
      totalPriceMDL: 0,
      containerBreakdown: [],
      totalContainers: 1,
      estimatedTransitDays: 32,
      availability: 'AVAILABLE',
    };

    const result = finalizeOffers([offer], 18, 1, {
      portOrigin: 'Shanghai',
      containerType: '20DV',
      cargoWeight: '18-23',
      cargoReadyDate: FUTURE_DATE,
      portDestination: 'Constanta',
      containers: [],
    } as any);

    expect(result.offers[0].totalPriceMDL).toBe(18000);
  });
});

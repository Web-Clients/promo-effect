/**
 * Pricing Service
 * 
 * Handles dynamic pricing rules and calculations
 */

import prisma from '../../lib/prisma';

export interface PricingCalculationParams {
  containerType: string; // 20ft, 40ft, 40HQ, Reefer
  portOrigin: string;
  portDestination: string;
  shippingLine?: string;
  quantity?: number; // For volume discounts
  date?: Date; // For seasonal pricing
  cargoWeight?: string; // Weight of cargo
  cargoType?: string; // Type of cargo
}

export interface PricingResult {
  basePrice: number;
  currency: string;
  taxes: Array<{ name: string; amount: number }>;
  volumeDiscount?: { percentage: number; amount: number };
  subtotal: number;
  total: number;
  ruleId: string;
  ruleName: string;
  portSurcharge?: number; // Port surcharge amount
  breakdown: {
    freight: number;
    portFees: number;
    customsEstimate: number;
    margin: number;
  };
}

export interface CreatePricingRuleDTO {
  name: string;
  priority?: number;
  containerType?: string;
  portOrigin?: string;
  portDestination?: string;
  shippingLine?: string;
  basePrice: number;
  currency?: string;
  additionalTaxes?: Array<{ name: string; amount: number; type: 'fixed' | 'percentage' }>;
  volumeDiscounts?: Array<{ minQuantity: number; discountPercent: number }>;
  validFrom: Date;
  validTo?: Date;
  specialConditions?: Record<string, any>;
  notes?: string;
}

export class PricingService {
  /**
   * Calculate price based on parameters
   * Supports port surcharges: base ports (Ningbo, Shanghai, Shenzhen) + surcharges for other ports
   */
  async calculatePrice(params: PricingCalculationParams): Promise<PricingResult> {
    const { containerType, portOrigin, portDestination, shippingLine, quantity = 1, date = new Date() } = params;

    // Base ports (main ports with base pricing)
    const BASE_PORTS = ['NINGBO', 'SHANGHAI', 'SHENZHEN'];
    const basePort = BASE_PORTS.find(p => portOrigin.toUpperCase().includes(p)) || 'SHANGHAI'; // Default to Shanghai if not found

    // Find applicable pricing rules
    // Build conditions: rule matches if field is null (any) OR matches the value
    const whereConditions: any = {
      status: 'ACTIVE',
      validFrom: { lte: date },
      OR: [
        { validTo: null },
        { validTo: { gte: date } },
      ],
      AND: [
        {
          OR: [
            { containerType: null },
            { containerType },
          ],
        },
        {
          OR: [
            { portOrigin: null },
            { portOrigin },
          ],
        },
        {
          OR: [
            { portDestination: null },
            { portDestination },
          ],
        },
        {
          OR: [
            { shippingLine: null },
            shippingLine ? { shippingLine } : {},
          ],
        },
      ],
    };

    const applicableRules = await (prisma as any).pricingRule.findMany({
      where: whereConditions,
      orderBy: { priority: 'desc' },
    });

    if (applicableRules.length === 0) {
      throw new Error('No applicable pricing rule found');
    }

    // Use highest priority rule
    const rule = applicableRules[0];

    // Calculate port surcharge
    let portSurcharge = 0;
    const portUpper = portOrigin.toUpperCase();
    
    // Check if port is a base port (no surcharge)
    const isBasePort = BASE_PORTS.some(p => portUpper.includes(p));
    
    if (!isBasePort) {
      // Get port surcharge from settings or calculate based on port type
      const portSurchargeSetting = await this.getPortSurcharge(portOrigin);
      
      if (portSurchargeSetting) {
        portSurcharge = portSurchargeSetting;
      } else {
        // Default surcharges based on port categories
        // Secondary ports: Qingdao, Xiamen, Tianjin (+100-150 USD)
        const secondaryPorts = ['QINGDAO', 'XIAMEN', 'TIANJIN'];
        if (secondaryPorts.some(p => portUpper.includes(p))) {
          portSurcharge = 125; // Average of 100-150
        } else {
          // River ports (+200-800 USD) - use average or check specific port
          portSurcharge = 400; // Average of 200-800, should be configured per port
        }
      }
    }

    // Parse additional taxes
    let taxes: Array<{ name: string; amount: number }> = [];
    if (rule.additionalTaxes) {
      try {
        const taxData = JSON.parse(rule.additionalTaxes);
        if (Array.isArray(taxData)) {
          taxes = taxData.map((tax: any) => {
            if (tax.type === 'percentage') {
              return {
                name: tax.name,
                amount: (rule.basePrice * tax.amount) / 100,
              };
            } else {
              return {
                name: tax.name,
                amount: tax.amount,
              };
            }
          });
        }
      } catch (e) {
        console.error('Failed to parse additional taxes:', e);
      }
    }

    // Calculate volume discount
    let volumeDiscount: { percentage: number; amount: number } | undefined;
    if (rule.volumeDiscounts && quantity > 1) {
      try {
        const discountData = JSON.parse(rule.volumeDiscounts);
        if (Array.isArray(discountData)) {
          // Find applicable discount (highest quantity threshold met)
          const applicableDiscount = discountData
            .filter((d: any) => quantity >= d.minQuantity)
            .sort((a: any, b: any) => b.minQuantity - a.minQuantity)[0];

          if (applicableDiscount) {
            const discountPercent = applicableDiscount.discountPercent;
            const discountAmount = (rule.basePrice * discountPercent) / 100;
            volumeDiscount = {
              percentage: discountPercent,
              amount: discountAmount,
            };
          }
        }
      } catch (e) {
        console.error('Failed to parse volume discounts:', e);
      }
    }

    // Calculate subtotal with port surcharge
    const basePrice = rule.basePrice;
    const priceWithSurcharge = basePrice + portSurcharge;
    const totalTaxes = taxes.reduce((sum, tax) => sum + tax.amount, 0);
    const discountAmount = volumeDiscount ? volumeDiscount.amount : 0;
    const subtotal = priceWithSurcharge + totalTaxes - discountAmount;

    // Estimate breakdown (simplified)
    const freight = basePrice * 0.7; // 70% freight
    const portFees = basePrice * 0.15; // 15% port fees
    const customsEstimate = basePrice * 0.1; // 10% customs estimate
    const margin = basePrice * 0.05; // 5% margin

    return {
      basePrice: priceWithSurcharge, // Include surcharge in base price
      currency: rule.currency,
      taxes: portSurcharge > 0 ? [
        ...taxes,
        { name: `Port Surcharge (${portOrigin})`, amount: portSurcharge }
      ] : taxes,
      volumeDiscount,
      subtotal,
      total: subtotal,
      ruleId: rule.id,
      ruleName: rule.name,
      breakdown: {
        freight: freight + (portSurcharge * 0.7), // Port surcharge mostly affects freight
        portFees: portFees + (portSurcharge * 0.3),
        customsEstimate,
        margin,
      },
      portSurcharge, // Include in result for transparency
    };
  }

  /**
   * Get port surcharge from settings
   */
  private async getPortSurcharge(portName: string): Promise<number | null> {
    try {
      const setting = await prisma.setting.findUnique({
        where: {
          category_key: {
            category: 'PRICING',
            key: `PORT_SURCHARGE_${portName.toUpperCase()}`,
          },
        },
      });

      if (setting && setting.value) {
        return parseFloat(setting.value);
      }
    } catch (error) {
      // Setting not found, return null to use defaults
    }
    return null;
  }

  /**
   * Set port surcharge for a specific port
   */
  async setPortSurcharge(portName: string, surcharge: number, updatedBy?: string): Promise<void> {
    await prisma.setting.upsert({
      where: {
        category_key: {
          category: 'PRICING',
          key: `PORT_SURCHARGE_${portName.toUpperCase()}`,
        },
      },
      create: {
        category: 'PRICING',
        key: `PORT_SURCHARGE_${portName.toUpperCase()}`,
        value: surcharge.toString(),
        type: 'NUMBER',
        description: `Port surcharge for ${portName}`,
        updatedBy,
      },
      update: {
        value: surcharge.toString(),
        updatedBy,
      },
    });
  }

  /**
   * Get all pricing rules
   */
  async getAllRules(filters?: {
    status?: string;
    containerType?: string;
    shippingLine?: string;
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.containerType) {
      where.containerType = filters.containerType;
    }
    if (filters?.shippingLine) {
      where.shippingLine = filters.shippingLine;
    }

    return (prisma as any).pricingRule.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { validFrom: 'desc' },
      ],
    });
  }

  /**
   * Get pricing rule by ID
   */
  async getRuleById(id: string) {
    return (prisma as any).pricingRule.findUnique({
      where: { id },
    });
  }

  /**
   * Create new pricing rule
   */
  async createRule(data: CreatePricingRuleDTO, createdBy?: string) {
    return (prisma as any).pricingRule.create({
      data: {
        name: data.name,
        priority: data.priority || 0,
        containerType: data.containerType,
        portOrigin: data.portOrigin,
        portDestination: data.portDestination,
        shippingLine: data.shippingLine,
        basePrice: data.basePrice,
        currency: data.currency || 'USD',
        additionalTaxes: data.additionalTaxes ? JSON.stringify(data.additionalTaxes) : null,
        volumeDiscounts: data.volumeDiscounts ? JSON.stringify(data.volumeDiscounts) : null,
        validFrom: data.validFrom,
        validTo: data.validTo,
        specialConditions: data.specialConditions ? JSON.stringify(data.specialConditions) : null,
        notes: data.notes,
        createdBy,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Update pricing rule
   */
  async updateRule(id: string, data: Partial<CreatePricingRuleDTO>, updatedBy?: string) {
    const updateData: any = {
      updatedBy,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.containerType !== undefined) updateData.containerType = data.containerType;
    if (data.portOrigin !== undefined) updateData.portOrigin = data.portOrigin;
    if (data.portDestination !== undefined) updateData.portDestination = data.portDestination;
    if (data.shippingLine !== undefined) updateData.shippingLine = data.shippingLine;
    if (data.basePrice !== undefined) updateData.basePrice = data.basePrice;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.additionalTaxes !== undefined) updateData.additionalTaxes = JSON.stringify(data.additionalTaxes);
    if (data.volumeDiscounts !== undefined) updateData.volumeDiscounts = JSON.stringify(data.volumeDiscounts);
    if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
    if (data.validTo !== undefined) updateData.validTo = data.validTo;
    if (data.specialConditions !== undefined) updateData.specialConditions = JSON.stringify(data.specialConditions);
    if (data.notes !== undefined) updateData.notes = data.notes;

    return (prisma as any).pricingRule.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete pricing rule (soft delete by setting status to INACTIVE)
   */
  async deleteRule(id: string, deletedBy?: string) {
    return (prisma as any).pricingRule.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        updatedBy: deletedBy,
      },
    });
  }

  /**
   * Get price history/trends
   */
  async getPriceHistory(params: {
    containerType?: string;
    portOrigin?: string;
    portDestination?: string;
    shippingLine?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const where: any = {};

    if (params.containerType) where.containerType = params.containerType;
    if (params.portOrigin) where.portOrigin = params.portOrigin;
    if (params.portDestination) where.portDestination = params.portDestination;
    if (params.shippingLine) where.shippingLine = params.shippingLine;
    if (params.dateFrom || params.dateTo) {
      where.validFrom = {};
      if (params.dateFrom) where.validFrom.gte = params.dateFrom;
      if (params.dateTo) where.validFrom.lte = params.dateTo;
    }

    return (prisma as any).pricingRule.findMany({
      where,
      orderBy: { validFrom: 'desc' },
      select: {
        id: true,
        name: true,
        basePrice: true,
        currency: true,
        containerType: true,
        portOrigin: true,
        portDestination: true,
        shippingLine: true,
        validFrom: true,
        validTo: true,
        createdAt: true,
      },
    });
  }
}

export const pricingService = new PricingService();


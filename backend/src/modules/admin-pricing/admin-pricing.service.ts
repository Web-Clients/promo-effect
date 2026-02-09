/**
 * Admin Pricing Service
 * Handles management of base prices, port adjustments, and admin settings
 */

import prisma from '../../lib/prisma';

// Base Price types
export interface BasePriceInput {
  shippingLine: string;
  portOrigin: string;
  portDestination: string;
  containerType: string;
  basePrice: number;
  transitDays: number;
  validFrom: Date;
  validUntil: Date;
  isActive?: boolean;
  // Per-line cost overrides (null = use global admin_settings)
  portTaxes?: number | null;
  terrestrialTransport?: number | null;
  customsTaxes?: number | null;
  commission?: number | null;
}

// Port Adjustment types
export interface PortAdjustmentInput {
  portName: string;
  adjustment: number;
  notes?: string;
}

// Admin Settings update type
export interface AdminSettingsInput {
  portTaxesConstanta?: number;
  terrestrialTransportConstanta?: number;
  portTaxesOdessa?: number;
  terrestrialTransportOdessa?: number;
  customsTaxes?: number;
  commission?: number;
  insuranceCost?: number;
  profitMarginPercent?: number;
  weightRanges?: string;
}

export class AdminPricingService {
  // ============================================
  // BASE PRICES
  // ============================================

  /**
   * Get all base prices
   */
  async getAllBasePrices(filters?: {
    shippingLine?: string;
    portOrigin?: string;
    portDestination?: string;
    containerType?: string;
    isActive?: boolean;
  }) {
    const where: any = {};

    if (filters?.shippingLine) where.shippingLine = filters.shippingLine;
    if (filters?.portOrigin) where.portOrigin = filters.portOrigin;
    if (filters?.portDestination) where.portDestination = filters.portDestination;
    if (filters?.containerType) where.containerType = filters.containerType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return prisma.basePrice.findMany({
      where,
      orderBy: [
        { shippingLine: 'asc' },
        { portOrigin: 'asc' },
        { containerType: 'asc' },
      ],
    });
  }

  /**
   * Get base price by ID
   */
  async getBasePriceById(id: string) {
    return prisma.basePrice.findUnique({
      where: { id },
    });
  }

  /**
   * Create new base price
   */
  async createBasePrice(data: BasePriceInput, createdBy?: string) {
    return prisma.basePrice.create({
      data: {
        shippingLine: data.shippingLine,
        portOrigin: data.portOrigin,
        portDestination: data.portDestination,
        containerType: data.containerType,
        basePrice: data.basePrice,
        transitDays: data.transitDays,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        isActive: data.isActive ?? true,
        portTaxes: data.portTaxes ?? null,
        terrestrialTransport: data.terrestrialTransport ?? null,
        customsTaxes: data.customsTaxes ?? null,
        commission: data.commission ?? null,
        createdBy,
      },
    });
  }

  /**
   * Update base price
   */
  async updateBasePrice(id: string, data: Partial<BasePriceInput>) {
    return prisma.basePrice.update({
      where: { id },
      data: {
        ...(data.shippingLine && { shippingLine: data.shippingLine }),
        ...(data.portOrigin && { portOrigin: data.portOrigin }),
        ...(data.portDestination && { portDestination: data.portDestination }),
        ...(data.containerType && { containerType: data.containerType }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.transitDays !== undefined && { transitDays: data.transitDays }),
        ...(data.validFrom && { validFrom: data.validFrom }),
        ...(data.validUntil && { validUntil: data.validUntil }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.portTaxes !== undefined && { portTaxes: data.portTaxes }),
        ...(data.terrestrialTransport !== undefined && { terrestrialTransport: data.terrestrialTransport }),
        ...(data.customsTaxes !== undefined && { customsTaxes: data.customsTaxes }),
        ...(data.commission !== undefined && { commission: data.commission }),
      },
    });
  }

  /**
   * Delete base price
   */
  async deleteBasePrice(id: string) {
    return prisma.basePrice.delete({
      where: { id },
    });
  }

  /**
   * Bulk create base prices
   */
  async bulkCreateBasePrices(prices: BasePriceInput[], createdBy?: string) {
    const results = [];
    for (const price of prices) {
      try {
        const created = await this.createBasePrice(price, createdBy);
        results.push({ success: true, data: created });
      } catch (error: any) {
        results.push({ success: false, error: error.message, data: price });
      }
    }
    return results;
  }

  /**
   * Get unique shipping lines
   */
  async getShippingLines() {
    const result = await prisma.basePrice.findMany({
      distinct: ['shippingLine'],
      select: { shippingLine: true },
    });
    return result.map((r) => r.shippingLine).sort();
  }

  /**
   * Get unique origin ports from base prices
   */
  async getOriginPorts() {
    const result = await prisma.basePrice.findMany({
      distinct: ['portOrigin'],
      select: { portOrigin: true },
    });
    return result.map((r) => r.portOrigin).sort();
  }

  /**
   * Get unique container types
   */
  async getContainerTypes() {
    const result = await prisma.basePrice.findMany({
      distinct: ['containerType'],
      select: { containerType: true },
    });
    return result.map((r) => r.containerType).sort();
  }

  // ============================================
  // PORT ADJUSTMENTS
  // ============================================

  /**
   * Get all port adjustments
   */
  async getAllPortAdjustments() {
    return prisma.portAdjustment.findMany({
      orderBy: { portName: 'asc' },
    });
  }

  /**
   * Get port adjustment by ID
   */
  async getPortAdjustmentById(id: string) {
    return prisma.portAdjustment.findUnique({
      where: { id },
    });
  }

  /**
   * Get port adjustment by port name
   */
  async getPortAdjustmentByName(portName: string) {
    return prisma.portAdjustment.findUnique({
      where: { portName },
    });
  }

  /**
   * Create port adjustment
   */
  async createPortAdjustment(data: PortAdjustmentInput) {
    return prisma.portAdjustment.create({
      data: {
        portName: data.portName,
        adjustment: data.adjustment,
        notes: data.notes,
      },
    });
  }

  /**
   * Update port adjustment
   */
  async updatePortAdjustment(id: string, data: Partial<PortAdjustmentInput>) {
    return prisma.portAdjustment.update({
      where: { id },
      data: {
        ...(data.portName && { portName: data.portName }),
        ...(data.adjustment !== undefined && { adjustment: data.adjustment }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  }

  /**
   * Delete port adjustment
   */
  async deletePortAdjustment(id: string) {
    return prisma.portAdjustment.delete({
      where: { id },
    });
  }

  // ============================================
  // ADMIN SETTINGS
  // ============================================

  /**
   * Get admin settings
   */
  async getAdminSettings() {
    let settings = await prisma.adminSettings.findUnique({
      where: { id: 1 },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.adminSettings.create({
        data: {
          id: 1,
          portTaxesConstanta: 221.67,
          terrestrialTransportConstanta: 600.0,
          portTaxesOdessa: 200.0,
          terrestrialTransportOdessa: 550.0,
          customsTaxes: 150.0,
          commission: 200.0,
          insuranceCost: 50.0,
          profitMarginPercent: 10.0,
          weightRanges: JSON.stringify([
            { label: "1-10 tone", min: 1, max: 10, enabled: true },
            { label: "10-20 tone", min: 10, max: 20, enabled: true },
            { label: "20-23 tone", min: 20, max: 23, enabled: true },
            { label: "23-24 tone", min: 23, max: 24, enabled: true }
          ]),
        },
      });
    }

    return settings;
  }

  /**
   * Update admin settings
   */
  async updateAdminSettings(data: AdminSettingsInput) {
    // Ensure settings exist
    await this.getAdminSettings();

    return prisma.adminSettings.update({
      where: { id: 1 },
      data: {
        ...(data.portTaxesConstanta !== undefined && { portTaxesConstanta: data.portTaxesConstanta }),
        ...(data.terrestrialTransportConstanta !== undefined && { terrestrialTransportConstanta: data.terrestrialTransportConstanta }),
        ...(data.portTaxesOdessa !== undefined && { portTaxesOdessa: data.portTaxesOdessa }),
        ...(data.terrestrialTransportOdessa !== undefined && { terrestrialTransportOdessa: data.terrestrialTransportOdessa }),
        ...(data.customsTaxes !== undefined && { customsTaxes: data.customsTaxes }),
        ...(data.commission !== undefined && { commission: data.commission }),
        ...(data.insuranceCost !== undefined && { insuranceCost: data.insuranceCost }),
        ...(data.profitMarginPercent !== undefined && { profitMarginPercent: data.profitMarginPercent }),
        ...(data.weightRanges !== undefined && { weightRanges: data.weightRanges }),
        // Also update legacy fields for backward compatibility
        ...(data.portTaxesConstanta !== undefined && { portTaxes: data.portTaxesConstanta }),
        ...(data.terrestrialTransportConstanta !== undefined && { terrestrialTransport: data.terrestrialTransportConstanta }),
      },
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  /**
   * Get pricing statistics for dashboard
   */
  async getPricingStats() {
    const [
      totalBasePrices,
      activeBasePrices,
      totalPortAdjustments,
      shippingLinesCount,
    ] = await Promise.all([
      prisma.basePrice.count(),
      prisma.basePrice.count({ where: { isActive: true } }),
      prisma.portAdjustment.count(),
      prisma.basePrice.findMany({ distinct: ['shippingLine'] }).then((r) => r.length),
    ]);

    return {
      totalBasePrices,
      activeBasePrices,
      totalPortAdjustments,
      shippingLinesCount,
    };
  }
}

export const adminPricingService = new AdminPricingService();
export default adminPricingService;

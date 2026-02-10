/**
 * Shipping Lines Service
 * Manages shipping line container configurations (local taxes)
 * and transport rates per container type & weight range
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// SHIPPING LINE CONTAINERS (Local Taxes)
// ============================================

interface ShippingLineContainerInput {
  shippingLine: string;
  containerType: string;
  portTaxes: number;
  isActive?: boolean;
}

class ShippingLinesService {

  // --- Shipping Line Containers ---

  async getAllShippingLineContainers(filters?: { shippingLine?: string; containerType?: string; isActive?: boolean }) {
    const where: any = {};
    if (filters?.shippingLine) where.shippingLine = filters.shippingLine;
    if (filters?.containerType) where.containerType = filters.containerType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return prisma.shippingLineContainer.findMany({
      where,
      orderBy: [{ shippingLine: 'asc' }, { containerType: 'asc' }],
    });
  }

  async getShippingLineContainerById(id: string) {
    return prisma.shippingLineContainer.findUnique({ where: { id } });
  }

  async createShippingLineContainer(data: ShippingLineContainerInput) {
    return prisma.shippingLineContainer.create({ data });
  }

  async updateShippingLineContainer(id: string, data: Partial<ShippingLineContainerInput>) {
    return prisma.shippingLineContainer.update({ where: { id }, data });
  }

  async deleteShippingLineContainer(id: string) {
    return prisma.shippingLineContainer.delete({ where: { id } });
  }

  /** Get distinct shipping lines that have container configs */
  async getDistinctShippingLines() {
    const results = await prisma.shippingLineContainer.findMany({
      distinct: ['shippingLine'],
      select: { shippingLine: true },
      orderBy: { shippingLine: 'asc' },
    });
    return results.map(r => r.shippingLine);
  }

  /** Get distinct container types configured */
  async getDistinctContainerTypes() {
    const results = await prisma.shippingLineContainer.findMany({
      distinct: ['containerType'],
      select: { containerType: true },
      orderBy: { containerType: 'asc' },
    });
    return results.map(r => r.containerType);
  }

  /** Lookup port taxes for a specific shipping line + container type */
  async getPortTaxes(shippingLine: string, containerType: string): Promise<number | null> {
    const record = await prisma.shippingLineContainer.findUnique({
      where: {
        shippingLine_containerType: { shippingLine, containerType },
      },
    });
    if (record && record.isActive) return record.portTaxes;
    return null;
  }

  /** Bulk upsert shipping line containers */
  async bulkUpsert(items: ShippingLineContainerInput[]) {
    const results = [];
    for (const item of items) {
      const result = await prisma.shippingLineContainer.upsert({
        where: {
          shippingLine_containerType: {
            shippingLine: item.shippingLine,
            containerType: item.containerType,
          },
        },
        update: { portTaxes: item.portTaxes, isActive: item.isActive ?? true },
        create: item,
      });
      results.push(result);
    }
    return results;
  }

  // --- Transport Rates ---

  async getAllTransportRates(filters?: { containerType?: string; destination?: string; isActive?: boolean }) {
    const where: any = {};
    if (filters?.containerType) where.containerType = filters.containerType;
    if (filters?.destination) where.destination = filters.destination;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return prisma.transportRate.findMany({
      where,
      orderBy: [{ containerType: 'asc' }, { weightRange: 'asc' }],
    });
  }

  async getTransportRateById(id: string) {
    return prisma.transportRate.findUnique({ where: { id } });
  }

  async createTransportRate(data: { containerType: string; weightRange: string; destination: string; rate: number; isActive?: boolean }) {
    return prisma.transportRate.create({ data });
  }

  async updateTransportRate(id: string, data: Partial<{ containerType: string; weightRange: string; destination: string; rate: number; isActive: boolean }>) {
    return prisma.transportRate.update({ where: { id }, data });
  }

  async deleteTransportRate(id: string) {
    return prisma.transportRate.delete({ where: { id } });
  }

  /** Lookup transport rate for a specific container type + weight range + destination */
  async getTransportRate(containerType: string, weightRange: string, destination: string): Promise<number | null> {
    const record = await prisma.transportRate.findUnique({
      where: {
        containerType_weightRange_destination: { containerType, weightRange, destination },
      },
    });
    if (record && record.isActive) return record.rate;
    return null;
  }

  /** Bulk upsert transport rates */
  async bulkUpsertTransportRates(items: { containerType: string; weightRange: string; destination: string; rate: number; isActive?: boolean }[]) {
    const results = [];
    for (const item of items) {
      const result = await prisma.transportRate.upsert({
        where: {
          containerType_weightRange_destination: {
            containerType: item.containerType,
            weightRange: item.weightRange,
            destination: item.destination,
          },
        },
        update: { rate: item.rate, isActive: item.isActive ?? true },
        create: item,
      });
      results.push(result);
    }
    return results;
  }

  /** Get distinct weight ranges from transport rates */
  async getDistinctWeightRanges() {
    const results = await prisma.transportRate.findMany({
      distinct: ['weightRange'],
      select: { weightRange: true },
      orderBy: { weightRange: 'asc' },
    });
    return results.map(r => r.weightRange);
  }
}

export const shippingLinesService = new ShippingLinesService();

/**
 * Suppliers Service
 * Handles reusable Chinese supplier records — distinct from Client (beneficiar).
 */

import prisma from '../../lib/prisma';

export interface CreateSupplierDTO {
  name: string;
  address?: string;
  contact?: string;
  phone?: string;
  email?: string;
  website?: string;
  country?: string;
  notes?: string;
}

export interface UpdateSupplierDTO {
  name?: string;
  address?: string;
  contact?: string;
  phone?: string;
  email?: string;
  website?: string;
  country?: string;
  notes?: string;
}

export interface SupplierFilters {
  search?: string;
  country?: string;
  page?: number;
  limit?: number;
}

export const suppliersService = {
  async list(filters: SupplierFilters = {}) {
    const { search, country, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contact: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (country) where.country = country;

    const [suppliers, total] = await Promise.all([
      (prisma.supplier as any).findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: {
          _count: { select: { bookings: true } },
        },
      }),
      (prisma.supplier as any).count({ where }),
    ]);

    return { suppliers, total, page, limit };
  },

  async findById(id: string) {
    return (prisma.supplier as any).findUnique({
      where: { id },
      include: {
        bookings: {
          select: { id: true, blNumber: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  },

  async findOrCreate(data: CreateSupplierDTO) {
    const existing = await (prisma.supplier as any).findFirst({
      where: { name: { equals: data.name, mode: 'insensitive' } },
    });
    if (existing) return { supplier: existing, created: false };

    const supplier = await (prisma.supplier as any).create({
      data: { ...data, country: data.country || 'China' },
    });
    return { supplier, created: true };
  },

  async create(data: CreateSupplierDTO) {
    return (prisma.supplier as any).create({
      data: { ...data, country: data.country || 'China' },
    });
  },

  async update(id: string, data: UpdateSupplierDTO) {
    return (prisma.supplier as any).update({ where: { id }, data });
  },

  async delete(id: string) {
    // Unlink bookings before deleting
    await prisma.booking.updateMany({
      where: { supplierId: id } as any,
      data: { supplierId: null } as any,
    });
    return (prisma.supplier as any).delete({ where: { id } });
  },
};

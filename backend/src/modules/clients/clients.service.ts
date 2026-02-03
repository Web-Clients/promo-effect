/**
 * Clients Service
 * Handles all client-related database operations
 */

import prisma from '../../lib/prisma';

// DTOs
export interface CreateClientDTO {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  bankAccount?: string;
  paymentTerms?: number;
  creditLimit?: number;
  discount?: number;
  rating?: number;
}

export interface UpdateClientDTO {
  companyName?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  bankAccount?: string;
  status?: string;
  paymentTerms?: number;
  creditLimit?: number;
  discount?: number;
  rating?: number;
}

export interface ClientFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ClientListResponse {
  clients: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ClientsService {
  /**
   * Get all clients with filters and pagination
   */
  async findAll(filters: ClientFilters): Promise<ClientListResponse> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status;
    }

    // Search filter (company name, contact person, email, tax ID)
    if (filters.search) {
      where.OR = [
        { companyName: { contains: filters.search, mode: 'insensitive' } },
        { contactPerson: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { taxId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Execute queries
    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          _count: {
            select: { bookings: true, invoices: true },
          },
        },
      }),
      prisma.client.count({ where }),
    ]);

    return {
      clients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single client by ID
   */
  async findOne(id: string) {
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        bookings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            totalPrice: true,
            createdAt: true,
            portOrigin: true,
            portDestination: true,
          },
        },
        invoices: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            amount: true,
            createdAt: true,
            dueDate: true,
          },
        },
        _count: {
          select: { bookings: true, invoices: true },
        },
      },
    });

    if (!client) {
      throw new Error('Client not found');
    }

    return client;
  }

  /**
   * Create new client
   */
  async create(data: CreateClientDTO, userId: string) {
    // Check for duplicate email
    const existingByEmail = await prisma.client.findUnique({
      where: { email: data.email },
    });

    if (existingByEmail) {
      throw new Error('A client with this email already exists');
    }

    // Check for duplicate taxId if provided
    if (data.taxId) {
      const existingByTaxId = await prisma.client.findUnique({
        where: { taxId: data.taxId },
      });

      if (existingByTaxId) {
        throw new Error('A client with this tax ID already exists');
      }
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        companyName: data.companyName,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        taxId: data.taxId,
        bankAccount: data.bankAccount,
        paymentTerms: data.paymentTerms || 30,
        creditLimit: data.creditLimit || 0,
        discount: data.discount || 0,
        rating: data.rating || 5.0,
        currentBalance: 0,
        status: 'ACTIVE',
      } as any,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CLIENT_CREATED',
        entityType: 'Client',
        entityId: client.id,
        changes: JSON.stringify({ companyName: client.companyName, email: client.email }),
      },
    });

    return client;
  }

  /**
   * Update existing client
   */
  async update(id: string, data: UpdateClientDTO, userId: string) {
    // Check if client exists
    const existing = await prisma.client.findUnique({ where: { id } });

    if (!existing) {
      throw new Error('Client not found');
    }

    // Check for duplicate email if changing
    if (data.email && data.email !== existing.email) {
      const existingByEmail = await prisma.client.findUnique({
        where: { email: data.email },
      });

      if (existingByEmail) {
        throw new Error('A client with this email already exists');
      }
    }

    // Check for duplicate taxId if changing
    if (data.taxId && data.taxId !== existing.taxId) {
      const existingByTaxId = await prisma.client.findUnique({
        where: { taxId: data.taxId },
      });

      if (existingByTaxId) {
        throw new Error('A client with this tax ID already exists');
      }
    }

    // Update client
    const updateData: any = {
      companyName: data.companyName,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      taxId: data.taxId,
      bankAccount: data.bankAccount,
      status: data.status,
    };

    // Add new fields if provided
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.creditLimit !== undefined) updateData.creditLimit = data.creditLimit;
    if (data.discount !== undefined) updateData.discount = data.discount;
    if (data.rating !== undefined) updateData.rating = data.rating;

    const client = await prisma.client.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CLIENT_UPDATED',
        entityType: 'Client',
        entityId: client.id,
        changes: JSON.stringify(data),
      },
    });

    return client;
  }

  /**
   * Soft delete client (set status to INACTIVE)
   */
  async delete(id: string, userId: string) {
    // Check if client exists
    const existing = await prisma.client.findUnique({ where: { id } });

    if (!existing) {
      throw new Error('Client not found');
    }

    // Check for active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        clientId: id,
        status: {
          in: ['CONFIRMED', 'IN_TRANSIT', 'SENT'],
        },
      },
    });

    if (activeBookings > 0) {
      throw new Error(`Cannot delete client with ${activeBookings} active bookings`);
    }

    // Soft delete - set status to INACTIVE
    await prisma.client.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CLIENT_DELETED',
        entityType: 'Client',
        entityId: id,
        changes: JSON.stringify({ previousStatus: existing.status, newStatus: 'INACTIVE' }),
      },
    });

    return { message: 'Client deleted successfully' };
  }

  /**
   * Get client statistics
   */
  async getStats() {
    const [total, active, inactive, suspended] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { status: 'ACTIVE' } }),
      prisma.client.count({ where: { status: 'INACTIVE' } }),
      prisma.client.count({ where: { status: 'SUSPENDED' } }),
    ]);

    const totalRevenue = await prisma.client.aggregate({
      _sum: { totalRevenue: true },
    });

    return {
      total,
      active,
      inactive,
      suspended,
      totalRevenue: totalRevenue._sum.totalRevenue || 0,
    };
  }
}

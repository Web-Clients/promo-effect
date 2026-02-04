/**
 * Agents Service
 * Manages Chinese agents for logistics operations
 */

import prisma from '../../lib/prisma';
import { randomBytes } from 'crypto';

export interface CreateAgentInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company: string;
  contactName: string;
  wechatId?: string;
}

export interface UpdateAgentInput {
  company?: string;
  contactName?: string;
  wechatId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  phone?: string;
  name?: string;
}

export interface AgentWithUser {
  id: string;
  agentCode: string;
  company: string;
  contactName: string;
  wechatId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
  };
  pricesCount: number;
  bookingsCount: number;
}

export class AgentsService {
  /**
   * Generate unique agent code
   */
  private generateAgentCode(): string {
    const prefix = 'AG';
    const randomPart = randomBytes(4).toString('hex').toUpperCase();
    return `${prefix}-${randomPart}`;
  }

  /**
   * Get all agents with their user info
   */
  async getAllAgents(filters?: {
    status?: string;
    search?: string;
  }): Promise<AgentWithUser[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { company: { contains: filters.search, mode: 'insensitive' } },
        { contactName: { contains: filters.search, mode: 'insensitive' } },
        { agentCode: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const agents = await prisma.agent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
        _count: {
          select: {
            prices: true,
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return agents.map((agent) => ({
      id: agent.id,
      agentCode: agent.agentCode,
      company: agent.company,
      contactName: agent.contactName,
      wechatId: agent.wechatId,
      status: agent.status,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      user: agent.user,
      pricesCount: agent._count.prices,
      bookingsCount: agent._count.bookings,
    }));
  }

  /**
   * Get agent by ID
   */
  async getAgentById(id: string): Promise<AgentWithUser | null> {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
        _count: {
          select: {
            prices: true,
            bookings: true,
          },
        },
      },
    });

    if (!agent) return null;

    return {
      id: agent.id,
      agentCode: agent.agentCode,
      company: agent.company,
      contactName: agent.contactName,
      wechatId: agent.wechatId,
      status: agent.status,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      user: agent.user,
      pricesCount: agent._count.prices,
      bookingsCount: agent._count.bookings,
    };
  }

  /**
   * Create new agent (creates user + agent profile)
   */
  async createAgent(data: CreateAgentInput, createdById: string): Promise<AgentWithUser> {
    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Un utilizator cu acest email există deja');
    }

    // Hash password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Generate agent code
    const agentCode = this.generateAgentCode();

    // Create user and agent in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user with AGENT role
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name,
          phone: data.phone,
          role: 'AGENT',
          emailVerified: true, // Agents created by admin are pre-verified
        },
      });

      // Create agent profile
      const agent = await tx.agent.create({
        data: {
          userId: user.id,
          agentCode,
          company: data.company,
          contactName: data.contactName,
          wechatId: data.wechatId,
          status: 'ACTIVE',
          createdById,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
            },
          },
          _count: {
            select: {
              prices: true,
              bookings: true,
            },
          },
        },
      });

      return agent;
    });

    return {
      id: result.id,
      agentCode: result.agentCode,
      company: result.company,
      contactName: result.contactName,
      wechatId: result.wechatId,
      status: result.status,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      user: result.user,
      pricesCount: result._count.prices,
      bookingsCount: result._count.bookings,
    };
  }

  /**
   * Update agent
   */
  async updateAgent(id: string, data: UpdateAgentInput): Promise<AgentWithUser> {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!agent) {
      throw new Error('Agent negăsit');
    }

    // Update agent and user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update user if name or phone provided
      if (data.name || data.phone) {
        await tx.user.update({
          where: { id: agent.userId },
          data: {
            ...(data.name && { name: data.name }),
            ...(data.phone !== undefined && { phone: data.phone }),
          },
        });
      }

      // Update agent
      const updated = await tx.agent.update({
        where: { id },
        data: {
          ...(data.company && { company: data.company }),
          ...(data.contactName && { contactName: data.contactName }),
          ...(data.wechatId !== undefined && { wechatId: data.wechatId }),
          ...(data.status && { status: data.status }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
            },
          },
          _count: {
            select: {
              prices: true,
              bookings: true,
            },
          },
        },
      });

      return updated;
    });

    return {
      id: result.id,
      agentCode: result.agentCode,
      company: result.company,
      contactName: result.contactName,
      wechatId: result.wechatId,
      status: result.status,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      user: result.user,
      pricesCount: result._count.prices,
      bookingsCount: result._count.bookings,
    };
  }

  /**
   * Delete agent (soft delete - set status to INACTIVE)
   */
  async deleteAgent(id: string): Promise<void> {
    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      throw new Error('Agent negăsit');
    }

    // Soft delete - set status to INACTIVE
    await prisma.agent.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  /**
   * Hard delete agent (removes agent and user)
   */
  async hardDeleteAgent(id: string): Promise<void> {
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            prices: true,
            bookings: true,
          },
        },
      },
    });

    if (!agent) {
      throw new Error('Agent negăsit');
    }

    // Check if agent has bookings
    if (agent._count.bookings > 0) {
      throw new Error('Nu se poate șterge agentul - are rezervări asociate');
    }

    // Delete agent and user in transaction
    await prisma.$transaction(async (tx) => {
      // Delete agent prices first
      await tx.agentPrice.deleteMany({
        where: { agentId: id },
      });

      // Delete agent
      await tx.agent.delete({
        where: { id },
      });

      // Delete user
      await tx.user.delete({
        where: { id: agent.userId },
      });
    });
  }

  /**
   * Get agent statistics
   */
  async getAgentStats() {
    const [total, active, inactive, suspended] = await Promise.all([
      prisma.agent.count(),
      prisma.agent.count({ where: { status: 'ACTIVE' } }),
      prisma.agent.count({ where: { status: 'INACTIVE' } }),
      prisma.agent.count({ where: { status: 'SUSPENDED' } }),
    ]);

    return {
      total,
      active,
      inactive,
      suspended,
    };
  }

  /**
   * Get agent's prices
   */
  async getAgentPrices(agentId: string) {
    return prisma.agentPrice.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get agent's bookings
   */
  async getAgentBookings(agentId: string) {
    return prisma.booking.findMany({
      where: { agentId },
      include: {
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  /**
   * Create price for agent (Admin action - auto approved)
   */
  async createAgentPrice(agentId: string, data: any) {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent negăsit');
    }

    return prisma.agentPrice.create({
      data: {
        agentId,
        freightPrice: data.freightPrice,
        shippingLine: data.shippingLine,
        portOrigin: data.portOrigin,
        containerType: data.containerType,
        weightRange: data.weightRange,
        validFrom: new Date(data.validFrom),
        validUntil: new Date(data.validUntil),
        departureDate: new Date(data.departureDate),
        reason: data.reason,
        approvalStatus: 'APPROVED', // Admin created prices are auto-approved
        approvedAt: new Date(),
      },
    });
  }

  /**
   * Update agent price (Admin action)
   */
  async updateAgentPrice(agentId: string, priceId: string, data: any) {
    const price = await prisma.agentPrice.findFirst({
      where: { id: priceId, agentId },
    });

    if (!price) {
      throw new Error('Prețul nu a fost găsit');
    }

    const updateData: any = {};
    if (data.freightPrice !== undefined) updateData.freightPrice = data.freightPrice;
    if (data.shippingLine) updateData.shippingLine = data.shippingLine;
    if (data.portOrigin) updateData.portOrigin = data.portOrigin;
    if (data.containerType) updateData.containerType = data.containerType;
    if (data.weightRange) updateData.weightRange = data.weightRange;
    if (data.validFrom) updateData.validFrom = new Date(data.validFrom);
    if (data.validUntil) updateData.validUntil = new Date(data.validUntil);
    if (data.departureDate) updateData.departureDate = new Date(data.departureDate);
    if (data.reason !== undefined) updateData.reason = data.reason;
    if (data.status) updateData.approvalStatus = data.status; // Allow changing status back to PENDING etc.

    // If setting to APPROVED, update timestamp
    if (data.status === 'APPROVED' && price.approvalStatus !== 'APPROVED') {
      updateData.approvedAt = new Date();
    }

    return prisma.agentPrice.update({
      where: { id: priceId },
      data: updateData,
    });
  }

  /**
   * Delete agent price (Admin action)
   */
  async deleteAgentPrice(agentId: string, priceId: string) {
    const price = await prisma.agentPrice.findFirst({
      where: { id: priceId, agentId },
    });

    if (!price) {
      throw new Error('Prețul nu a fost găsit');
    }

    await prisma.agentPrice.delete({
      where: { id: priceId },
    });
  }
}

export const agentsService = new AgentsService();
export default agentsService;

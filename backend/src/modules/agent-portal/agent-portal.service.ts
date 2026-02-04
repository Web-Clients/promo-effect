/**
 * Agent Portal Service
 * Allows Chinese agents to manage their own prices with admin approval workflow
 */

import prisma from '../../lib/prisma';
import { notificationService } from '../../services/notification.service';

export interface AgentPriceInput {
  freightPrice: number;
  shippingLine: string;
  portOrigin: string;
  containerType: string;
  weightRange: string;
  validFrom: Date;
  validUntil: Date;
  departureDate: Date;
  reason?: string;
}

export interface AgentPriceWithStatus {
  id: string;
  freightPrice: number;
  shippingLine: string;
  portOrigin: string;
  containerType: string;
  weightRange: string;
  validFrom: Date;
  validUntil: Date;
  departureDate: Date;
  approvalStatus: string;
  approvedAt: Date | null;
  rejectionReason: string | null;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class AgentPortalService {
  /**
   * Get agent profile by user ID
   */
  async getAgentByUserId(userId: string) {
    return prisma.agent.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Get all prices for an agent
   */
  async getAgentPrices(agentId: string, filters?: {
    approvalStatus?: string;
    shippingLine?: string;
  }): Promise<AgentPriceWithStatus[]> {
    const where: any = { agentId };

    if (filters?.approvalStatus) {
      where.approvalStatus = filters.approvalStatus;
    }

    if (filters?.shippingLine) {
      where.shippingLine = filters.shippingLine;
    }

    const prices = await prisma.agentPrice.findMany({
      where,
      orderBy: [
        { approvalStatus: 'asc' }, // PENDING first
        { createdAt: 'desc' },
      ],
    });

    return prices.map(p => ({
      id: p.id,
      freightPrice: p.freightPrice,
      shippingLine: p.shippingLine,
      portOrigin: p.portOrigin,
      containerType: p.containerType,
      weightRange: p.weightRange,
      validFrom: p.validFrom,
      validUntil: p.validUntil,
      departureDate: p.departureDate,
      approvalStatus: p.approvalStatus,
      approvedAt: p.approvedAt,
      rejectionReason: p.rejectionReason,
      reason: p.reason,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  /**
   * Create new price (submitted for approval)
   */
  async submitPrice(agentId: string, data: AgentPriceInput): Promise<AgentPriceWithStatus> {
    // Get agent info for notification
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { user: true },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Create price with PENDING status
    const price = await prisma.agentPrice.create({
      data: {
        agentId,
        freightPrice: data.freightPrice,
        shippingLine: data.shippingLine,
        portOrigin: data.portOrigin,
        containerType: data.containerType,
        weightRange: data.weightRange,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        departureDate: data.departureDate,
        reason: data.reason,
        approvalStatus: 'PENDING',
      },
    });

    // Notify admins about new price submission
    await this.notifyAdminsAboutNewPrice(agent, price);

    return {
      id: price.id,
      freightPrice: price.freightPrice,
      shippingLine: price.shippingLine,
      portOrigin: price.portOrigin,
      containerType: price.containerType,
      weightRange: price.weightRange,
      validFrom: price.validFrom,
      validUntil: price.validUntil,
      departureDate: price.departureDate,
      approvalStatus: price.approvalStatus,
      approvedAt: price.approvedAt,
      rejectionReason: price.rejectionReason,
      reason: price.reason,
      createdAt: price.createdAt,
      updatedAt: price.updatedAt,
    };
  }

  /**
   * Update existing price (resubmits for approval)
   */
  async updatePrice(
    agentId: string,
    priceId: string,
    data: Partial<AgentPriceInput>
  ): Promise<AgentPriceWithStatus> {
    // Verify price belongs to agent
    const existingPrice = await prisma.agentPrice.findFirst({
      where: {
        id: priceId,
        agentId,
      },
    });

    if (!existingPrice) {
      throw new Error('Price not found or does not belong to this agent');
    }

    // Get agent info for notification
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { user: true },
    });

    // Update price and reset to PENDING
    const price = await prisma.agentPrice.update({
      where: { id: priceId },
      data: {
        ...(data.freightPrice !== undefined && { freightPrice: data.freightPrice }),
        ...(data.shippingLine && { shippingLine: data.shippingLine }),
        ...(data.portOrigin && { portOrigin: data.portOrigin }),
        ...(data.containerType && { containerType: data.containerType }),
        ...(data.weightRange && { weightRange: data.weightRange }),
        ...(data.validFrom && { validFrom: data.validFrom }),
        ...(data.validUntil && { validUntil: data.validUntil }),
        ...(data.departureDate && { departureDate: data.departureDate }),
        ...(data.reason !== undefined && { reason: data.reason }),
        // Reset approval status
        approvalStatus: 'PENDING',
        approvedAt: null,
        approvedBy: null,
        rejectionReason: null,
      },
    });

    // Notify admins
    if (agent) {
      await this.notifyAdminsAboutNewPrice(agent, price);
    }

    return {
      id: price.id,
      freightPrice: price.freightPrice,
      shippingLine: price.shippingLine,
      portOrigin: price.portOrigin,
      containerType: price.containerType,
      weightRange: price.weightRange,
      validFrom: price.validFrom,
      validUntil: price.validUntil,
      departureDate: price.departureDate,
      approvalStatus: price.approvalStatus,
      approvedAt: price.approvedAt,
      rejectionReason: price.rejectionReason,
      reason: price.reason,
      createdAt: price.createdAt,
      updatedAt: price.updatedAt,
    };
  }

  /**
   * Delete price (only if PENDING or REJECTED)
   */
  async deletePrice(agentId: string, priceId: string): Promise<void> {
    const price = await prisma.agentPrice.findFirst({
      where: {
        id: priceId,
        agentId,
      },
    });

    if (!price) {
      throw new Error('Price not found or does not belong to this agent');
    }

    if (price.approvalStatus === 'APPROVED') {
      throw new Error('Cannot delete approved prices. Contact admin.');
    }

    await prisma.agentPrice.delete({
      where: { id: priceId },
    });
  }

  /**
   * Get agent's shipping lines (unique lines they work with)
   */
  async getAgentShippingLines(agentId: string): Promise<string[]> {
    const prices = await prisma.agentPrice.findMany({
      where: { agentId },
      distinct: ['shippingLine'],
      select: { shippingLine: true },
    });

    return prices.map(p => p.shippingLine);
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(agentId: string) {
    const [total, pending, approved, rejected, bookings] = await Promise.all([
      prisma.agentPrice.count({ where: { agentId } }),
      prisma.agentPrice.count({ where: { agentId, approvalStatus: 'PENDING' } }),
      prisma.agentPrice.count({ where: { agentId, approvalStatus: 'APPROVED' } }),
      prisma.agentPrice.count({ where: { agentId, approvalStatus: 'REJECTED' } }),
      prisma.booking.count({ where: { agentId } }),
    ]);

    return {
      prices: { total, pending, approved, rejected },
      bookings,
    };
  }

  // ============================================
  // ADMIN FUNCTIONS
  // ============================================

  /**
   * Get all pending prices for admin review
   */
  async getPendingPrices() {
    return prisma.agentPrice.findMany({
      where: { approvalStatus: 'PENDING' },
      include: {
        agent: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Oldest first
    });
  }

  /**
   * Approve a price
   */
  async approvePrice(priceId: string, adminUserId: string): Promise<void> {
    const price = await prisma.agentPrice.findUnique({
      where: { id: priceId },
      include: {
        agent: {
          include: { user: true },
        },
      },
    });

    if (!price) {
      throw new Error('Price not found');
    }

    if (price.approvalStatus !== 'PENDING') {
      throw new Error('Price is not pending approval');
    }

    // Update price status
    await prisma.agentPrice.update({
      where: { id: priceId },
      data: {
        approvalStatus: 'APPROVED',
        approvedBy: adminUserId,
        approvedAt: new Date(),
        rejectionReason: null,
      },
    });

    // Notify agent
    if (price.agent?.user) {
      await notificationService.sendNotification({
        userId: price.agent.user.id,
        type: 'PRICE_APPROVED',
        title: 'Prețul a fost aprobat',
        message: `Prețul pentru ${price.shippingLine}, ${price.portOrigin}, ${price.containerType} a fost aprobat și este acum activ.`,
        channels: { email: true, sms: false, push: true, whatsapp: false },
      });
    }
  }

  /**
   * Reject a price
   */
  async rejectPrice(priceId: string, adminUserId: string, reason: string): Promise<void> {
    const price = await prisma.agentPrice.findUnique({
      where: { id: priceId },
      include: {
        agent: {
          include: { user: true },
        },
      },
    });

    if (!price) {
      throw new Error('Price not found');
    }

    if (price.approvalStatus !== 'PENDING') {
      throw new Error('Price is not pending approval');
    }

    // Update price status
    await prisma.agentPrice.update({
      where: { id: priceId },
      data: {
        approvalStatus: 'REJECTED',
        approvedBy: adminUserId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Notify agent
    if (price.agent?.user) {
      await notificationService.sendNotification({
        userId: price.agent.user.id,
        type: 'PRICE_REJECTED',
        title: 'Prețul a fost respins',
        message: `Prețul pentru ${price.shippingLine}, ${price.portOrigin}, ${price.containerType} a fost respins. Motiv: ${reason}`,
        channels: { email: true, sms: false, push: true, whatsapp: false },
      });
    }
  }

  /**
   * Get approval statistics for admin
   */
  async getApprovalStats() {
    const [pending, approvedToday, rejectedToday] = await Promise.all([
      prisma.agentPrice.count({ where: { approvalStatus: 'PENDING' } }),
      prisma.agentPrice.count({
        where: {
          approvalStatus: 'APPROVED',
          approvedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.agentPrice.count({
        where: {
          approvalStatus: 'REJECTED',
          approvedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return { pending, approvedToday, rejectedToday };
  }

  // ============================================
  // PRIVATE HELPERS
  // ============================================

  /**
   * Notify all admins about new price submission
   */
  private async notifyAdminsAboutNewPrice(agent: any, price: any) {
    try {
      // Find all admin users
      const admins = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        },
      });

      for (const admin of admins) {
        await notificationService.sendNotification({
          userId: admin.id,
          type: 'PRICE_PENDING_APPROVAL',
          title: 'Preț nou pentru aprobare',
          message: `Agentul ${agent.company} (${agent.user.name}) a trimis un preț nou pentru aprobare: ${price.shippingLine}, ${price.portOrigin}, ${price.containerType} - $${price.freightPrice}`,
          channels: { email: true, sms: false, push: true, whatsapp: false },
        });
      }
    } catch (error) {
      console.error('[AgentPortal] Failed to notify admins:', error);
    }
  }
}

export const agentPortalService = new AgentPortalService();
export default agentPortalService;

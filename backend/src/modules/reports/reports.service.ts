/**
 * Reports Service
 * Business logic for reports and analytics
 */

import prisma from '../../lib/prisma';

export interface DashboardFilters {
  dateFrom?: Date;
  dateTo?: Date;
  clientId?: string;
}

export interface ContainerReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  clientId?: string;
  status?: string;
  portOrigin?: string;
  portDestination?: string;
  shippingLine?: string;
}

export interface FinancialReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  clientId?: string;
  groupBy?: 'day' | 'month' | 'quarter' | 'year';
}

export class ReportsService {
  /**
   * Get dashboard data (KPIs, charts, recent activity)
   */
  async getDashboard(filters: DashboardFilters = {}) {
    const { dateFrom, dateTo, clientId } = filters;

    const where: any = {};
    if (clientId) {
      where.clientId = clientId;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // KPIs
    const [
      totalContainers,
      containersInTransit,
      containersDelayed,
      containersDelivered,
      totalRevenue,
      totalInvoices,
      unpaidInvoices,
      totalClients,
    ] = await Promise.all([
      // Total containers
      prisma.container.count({
        where: {
          booking: clientId ? { clientId } : undefined,
        },
      }),

      // Containers in transit
      prisma.container.count({
        where: {
          currentStatus: { in: ['IN_TRANSIT', 'LOADED_ON_VESSEL', 'VESSEL_DEPARTURE'] },
          booking: clientId ? { clientId } : undefined,
        },
      }),

      // Containers delayed (ETA < now but not delivered)
      prisma.container.count({
        where: {
          eta: { lt: new Date() },
          currentStatus: { not: 'DELIVERED' },
          booking: clientId ? { clientId } : undefined,
        },
      }),

      // Containers delivered this month
      prisma.container.count({
        where: {
          currentStatus: 'DELIVERED',
          actualArrival: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
          booking: clientId ? { clientId } : undefined,
        },
      }),

      // Total revenue
      prisma.invoice.aggregate({
        where: {
          status: 'PAID',
          ...(clientId && { clientId }),
          ...(dateFrom || dateTo ? {
            paidDate: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          } : {}),
        },
        _sum: {
          amount: true,
        },
      }),

      // Total invoices
      prisma.invoice.count({
        where: {
          ...(clientId && { clientId }),
          ...(dateFrom || dateTo ? {
            issueDate: {
              ...(dateFrom && { gte: dateFrom }),
              ...(dateTo && { lte: dateTo }),
            },
          } : {}),
        },
      }),

      // Unpaid invoices
      prisma.invoice.count({
        where: {
          status: { in: ['UNPAID', 'OVERDUE'] },
          ...(clientId && { clientId }),
        },
      }),

      // Total clients
      prisma.client.count({
        where: {
          status: 'ACTIVE',
        },
      }),
    ]);

    // Recent bookings
    const recentBookings = await prisma.booking.findMany({
      where: clientId ? { clientId } : undefined,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    // Containers needing attention (delayed, customs hold, etc.)
    const containersNeedingAttention = await prisma.container.findMany({
      where: {
        OR: [
          { eta: { lt: new Date() }, currentStatus: { not: 'DELIVERED' } },
          { currentStatus: 'CUSTOMS_INSPECTION' },
        ],
        booking: clientId ? { clientId } : undefined,
      },
      take: 10,
      include: {
        booking: {
          include: {
            client: {
              select: {
                companyName: true,
              },
            },
          },
        },
      },
    });

    return {
      kpis: {
        totalContainers,
        containersInTransit,
        containersDelayed,
        containersDelivered,
        totalRevenue: totalRevenue._sum.amount || 0,
        totalInvoices,
        unpaidInvoices,
        totalClients,
      },
      recentBookings,
      containersNeedingAttention,
    };
  }

  /**
   * Get containers report
   */
  async getContainersReport(filters: ContainerReportFilters) {
    const {
      dateFrom,
      dateTo,
      clientId,
      status,
      portOrigin,
      portDestination,
      shippingLine,
    } = filters;

    const where: any = {
      booking: {},
    };

    if (clientId) {
      where.booking.clientId = clientId;
    }

    if (status) {
      where.currentStatus = status;
    }

    if (portOrigin) {
      where.booking.portOrigin = portOrigin;
    }

    if (portDestination) {
      where.booking.portDestination = portDestination;
    }

    if (shippingLine) {
      where.booking.shippingLine = shippingLine;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const containers = await prisma.container.findMany({
      where,
      include: {
        booking: {
          include: {
            client: {
              select: {
                id: true,
                companyName: true,
                email: true,
              },
            },
          },
        },
        trackingEvents: {
          orderBy: { eventDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Statistics
    const stats = {
      total: containers.length,
      byStatus: {} as Record<string, number>,
      byShippingLine: {} as Record<string, number>,
      byPort: {} as Record<string, number>,
    };

    containers.forEach((container) => {
      // By status
      const status = container.currentStatus || 'UNKNOWN';
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // By shipping line
      const line = container.booking.shippingLine || 'UNKNOWN';
      stats.byShippingLine[line] = (stats.byShippingLine[line] || 0) + 1;

      // By port
      const port = container.booking.portOrigin || 'UNKNOWN';
      stats.byPort[port] = (stats.byPort[port] || 0) + 1;
    });

    return {
      data: containers,
      statistics: stats,
    };
  }

  /**
   * Get financial report
   */
  async getFinancialReport(filters: FinancialReportFilters) {
    const { dateFrom, dateTo, clientId, groupBy = 'month' } = filters;

    const where: any = {};
    if (clientId) {
      where.clientId = clientId;
    }
    if (dateFrom || dateTo) {
      where.issueDate = {};
      if (dateFrom) where.issueDate.gte = dateFrom;
      if (dateTo) where.issueDate.lte = dateTo;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
          },
        },
        payments: true,
      },
      orderBy: { issueDate: 'desc' },
    });

    // Calculate totals
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0),
      0
    );
    const totalOutstanding = totalInvoiced - totalPaid;

    // Group by period
    const grouped: Record<string, any> = {};
    invoices.forEach((invoice) => {
      let key = '';
      const date = new Date(invoice.issueDate);

      switch (groupBy) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          invoiced: 0,
          paid: 0,
          outstanding: 0,
          count: 0,
        };
      }

      const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
      grouped[key].invoiced += invoice.amount;
      grouped[key].paid += paid;
      grouped[key].outstanding += invoice.amount - paid;
      grouped[key].count += 1;
    });

    return {
      summary: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        totalInvoices: invoices.length,
      },
      byPeriod: Object.values(grouped),
      byClient: invoices.reduce((acc, inv) => {
        const clientId = inv.clientId;
        if (!acc[clientId]) {
          acc[clientId] = {
            clientId,
            clientName: inv.client.companyName,
            invoiced: 0,
            paid: 0,
            outstanding: 0,
            count: 0,
          };
        }
        const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
        acc[clientId].invoiced += inv.amount;
        acc[clientId].paid += paid;
        acc[clientId].outstanding += inv.amount - paid;
        acc[clientId].count += 1;
        return acc;
      }, {} as Record<string, any>),
    };
  }

  /**
   * Get client performance report
   */
  async getClientPerformance(clientId?: string) {
    const where = clientId ? { clientId } : {};

    const clients = await prisma.client.findMany({
      where: {
        ...(clientId ? { id: clientId } : {}),
        status: 'ACTIVE',
      },
      include: {
        bookings: {
          include: {
            containers: true,
          },
        },
        invoices: {
          include: {
            payments: true,
          },
        },
      },
    });

    return clients.map((client) => {
      const totalBookings = client.bookings.length;
      const totalContainers = client.bookings.reduce(
        (sum, b) => sum + b.containers.length,
        0
      );
      const totalInvoiced = client.invoices.reduce((sum, inv) => sum + inv.amount, 0);
      const totalPaid = client.invoices.reduce(
        (sum, inv) => sum + inv.payments.reduce((pSum, p) => pSum + p.amount, 0),
        0
      );
      const averagePaymentDays = this.calculateAveragePaymentDays(client.invoices);

      return {
        clientId: client.id,
        companyName: client.companyName,
        metrics: {
          totalBookings,
          totalContainers,
          totalInvoiced,
          totalPaid,
          outstanding: totalInvoiced - totalPaid,
          averagePaymentDays,
          paymentRate: totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0,
        },
      };
    });
  }

  /**
   * Get operational report
   * Metrics: average transit time, delay rate, operational efficiency
   * Identifies: bottlenecks, improvements needed
   */
  async getOperationalReport(dateFrom?: Date, dateTo?: Date) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Get all containers with tracking events
    const containers = await prisma.container.findMany({
      where,
      include: {
        booking: {
          include: {
            client: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },
        trackingEvents: {
          orderBy: { eventDate: 'asc' },
        },
      },
    });

    // Calculate metrics
    const deliveredContainers = containers.filter((c) => c.currentStatus === 'DELIVERED');
    const delayedContainers = containers.filter((c) => {
      const containerWithExtras = c as any;
      return containerWithExtras.delayed === true || (c.eta && new Date(c.eta) < new Date() && c.currentStatus !== 'DELIVERED');
    });

    // Calculate average transit time
    let totalTransitDays = 0;
    let transitCount = 0;

    deliveredContainers.forEach((container) => {
      const departureEvent = container.trackingEvents.find(
        (e) => e.eventType === 'VESSEL_DEPARTURE' || e.eventType === 'LOADED_ON_VESSEL'
      );
      const arrivalEvent = container.trackingEvents.find(
        (e) => e.eventType === 'VESSEL_ARRIVAL' || e.eventType === 'DISCHARGED'
      );

      if (departureEvent && arrivalEvent) {
        const days = Math.floor(
          (new Date(arrivalEvent.eventDate).getTime() - new Date(departureEvent.eventDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (days > 0) {
          totalTransitDays += days;
          transitCount++;
        }
      } else if (container.booking.departureDate && container.actualArrival) {
        const days = Math.floor(
          (new Date(container.actualArrival).getTime() - new Date(container.booking.departureDate).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (days > 0) {
          totalTransitDays += days;
          transitCount++;
        }
      }
    });

    const averageTransitDays = transitCount > 0 ? Math.round(totalTransitDays / transitCount) : 0;

    // Calculate delay rate
    const delayRate = containers.length > 0 ? (delayedContainers.length / containers.length) * 100 : 0;

    // Calculate efficiency (on-time delivery rate)
    const onTimeContainers = deliveredContainers.filter((c) => {
      if (!c.eta) return false;
      const eta = new Date(c.eta);
      const actual = c.actualArrival ? new Date(c.actualArrival) : new Date();
      const diffDays = Math.floor((actual.getTime() - eta.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays <= 2; // On-time if within 2 days of ETA
    });
    const efficiencyRate = deliveredContainers.length > 0
      ? (onTimeContainers.length / deliveredContainers.length) * 100
      : 0;

    // Identify bottlenecks
    const bottlenecks: string[] = [];
    
    // Check delay rate
    if (delayRate > 20) {
      bottlenecks.push(`Rata întârzierilor este ridicată: ${delayRate.toFixed(1)}%`);
    }

    // Check average transit time
    if (averageTransitDays > 45) {
      bottlenecks.push(`Timpul mediu de tranzit este prea mare: ${averageTransitDays} zile`);
    }

    // Check efficiency
    if (efficiencyRate < 80) {
      bottlenecks.push(`Eficiența operațională este scăzută: ${efficiencyRate.toFixed(1)}%`);
    }

    // Port analysis
    const portDelays: Record<string, number> = {};
    delayedContainers.forEach((container) => {
      const port = container.booking.portOrigin || 'Unknown';
      portDelays[port] = (portDelays[port] || 0) + 1;
    });

    // Shipping line analysis
    const shippingLineDelays: Record<string, number> = {};
    delayedContainers.forEach((container) => {
      const line = container.booking.shippingLine || 'Unknown';
      shippingLineDelays[line] = (shippingLineDelays[line] || 0) + 1;
    });

    // Recommendations
    const recommendations: string[] = [];
    if (delayRate > 15) {
      recommendations.push('Recomandare: Analizați containerele întârziate pentru a identifica cauze comune');
    }
    if (averageTransitDays > 40) {
      recommendations.push('Recomandare: Optimizați rutele și negociați termene mai bune cu liniile maritime');
    }
    if (efficiencyRate < 85) {
      recommendations.push('Recomandare: Îmbunătățiți comunicarea cu clienții pentru pregătirea documentelor');
    }

    return {
      metrics: {
        totalContainers: containers.length,
        deliveredContainers: deliveredContainers.length,
        delayedContainers: delayedContainers.length,
        averageTransitDays,
        delayRate: Math.round(delayRate * 10) / 10,
        efficiencyRate: Math.round(efficiencyRate * 10) / 10,
        onTimeRate: deliveredContainers.length > 0
          ? Math.round((onTimeContainers.length / deliveredContainers.length) * 100 * 10) / 10
          : 0,
      },
      analysis: {
        bottlenecks,
        portDelays,
        shippingLineDelays,
        recommendations,
      },
      period: {
        from: dateFrom || new Date(new Date().setMonth(new Date().getMonth() - 1)),
        to: dateTo || new Date(),
      },
    };
  }

  /**
   * Calculate average payment days
   */
  private calculateAveragePaymentDays(invoices: any[]) {
    const paidInvoices = invoices.filter(
      (inv) => inv.status === 'PAID' && inv.paidDate && inv.issueDate
    );

    if (paidInvoices.length === 0) return 0;

    const totalDays = paidInvoices.reduce((sum, inv) => {
      const days = Math.floor(
        (new Date(inv.paidDate).getTime() - new Date(inv.issueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return sum + days;
    }, 0);

    return Math.round(totalDays / paidInvoices.length);
  }
}


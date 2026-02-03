/**
 * Admin Dashboard Service
 * Provides stats and overview data for the admin panel
 */

import prisma from '../../lib/prisma';

export interface DashboardStats {
  users: {
    total: number;
    admins: number;
    clients: number;
    agents: number;
    newThisMonth: number;
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    inTransit: number;
    delivered: number;
    thisMonth: number;
  };
  clients: {
    total: number;
    active: number;
    newThisMonth: number;
  };
  revenue: {
    totalUSD: number;
    thisMonthUSD: number;
    pendingPayments: number;
  };
  containers: {
    total: number;
    inTransit: number;
    delayed: number;
  };
}

export interface RecentActivity {
  type: 'booking' | 'user' | 'container' | 'payment';
  id: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class AdminDashboardService {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // User stats
    const [
      totalUsers,
      adminUsers,
      clientUsers,
      agentUsers,
      newUsersThisMonth,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.user.count({ where: { role: 'AGENT' } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

    // Booking stats
    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      inTransitBookings,
      deliveredBookings,
      bookingsThisMonth,
    ] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'PENDING' } }),
      prisma.booking.count({ where: { status: 'CONFIRMED' } }),
      prisma.booking.count({ where: { status: 'IN_TRANSIT' } }),
      prisma.booking.count({ where: { status: 'DELIVERED' } }),
      prisma.booking.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

    // Client stats
    const [totalClients, newClientsThisMonth] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

    // Revenue stats
    const [totalRevenue, revenueThisMonth] = await Promise.all([
      prisma.booking.aggregate({
        _sum: { totalPrice: true },
        where: { status: { not: 'CANCELLED' } },
      }),
      prisma.booking.aggregate({
        _sum: { totalPrice: true },
        where: {
          status: { not: 'CANCELLED' },
          createdAt: { gte: startOfMonth },
        },
      }),
    ]);

    // Container stats
    const [totalContainers, inTransitContainers, delayedContainers] = await Promise.all([
      prisma.container.count(),
      prisma.container.count({
        where: {
          booking: { status: 'IN_TRANSIT' },
        },
      }),
      prisma.container.count({ where: { delayed: true } }),
    ]);

    // Count pending invoices
    const pendingInvoices = await prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'PENDING' },
    });

    return {
      users: {
        total: totalUsers,
        admins: adminUsers,
        clients: clientUsers,
        agents: agentUsers,
        newThisMonth: newUsersThisMonth,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        inTransit: inTransitBookings,
        delivered: deliveredBookings,
        thisMonth: bookingsThisMonth,
      },
      clients: {
        total: totalClients,
        active: totalClients, // Could add active flag to client model
        newThisMonth: newClientsThisMonth,
      },
      revenue: {
        totalUSD: totalRevenue._sum.totalPrice || 0,
        thisMonthUSD: revenueThisMonth._sum.totalPrice || 0,
        pendingPayments: pendingInvoices._sum.totalAmount || 0,
      },
      containers: {
        total: totalContainers,
        inTransit: inTransitContainers,
        delayed: delayedContainers,
      },
    };
  }

  /**
   * Get recent bookings
   */
  async getRecentBookings(limit: number = 10) {
    return prisma.booking.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get recent users
   */
  async getRecentUsers(limit: number = 10) {
    return prisma.user.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        company: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  }

  /**
   * Get recent activity (combined feed)
   */
  async getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
    const [recentBookings, recentUsers] = await Promise.all([
      prisma.booking.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { companyName: true } },
        },
      }),
      prisma.user.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
        },
      }),
    ]);

    const activities: RecentActivity[] = [];

    // Add bookings
    for (const booking of recentBookings) {
      activities.push({
        type: 'booking',
        id: booking.id,
        description: `Rezervare ${booking.id} - ${booking.client?.companyName || 'N/A'} (${booking.status})`,
        timestamp: booking.createdAt,
        metadata: {
          status: booking.status,
          shippingLine: booking.shippingLine,
          portOrigin: booking.portOrigin,
          portDestination: booking.portDestination,
        },
      });
    }

    // Add users
    for (const user of recentUsers) {
      activities.push({
        type: 'user',
        id: user.id,
        description: `Utilizator nou: ${user.name} (${user.email})`,
        timestamp: user.createdAt,
        metadata: {
          email: user.email,
          name: user.name,
        },
      });
    }

    // Sort by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities.slice(0, limit);
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    const checks: Record<string, { status: 'ok' | 'warning' | 'error'; message: string }> = {};

    // Database check
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', message: 'Database connected' };
    } catch (error) {
      checks.database = { status: 'error', message: 'Database connection failed' };
    }

    // Check for overdue bookings
    const overdueCount = await prisma.booking.count({
      where: {
        status: 'IN_TRANSIT',
        eta: { lt: new Date() },
      },
    });

    if (overdueCount > 0) {
      checks.bookings = { status: 'warning', message: `${overdueCount} bookings past ETA` };
    } else {
      checks.bookings = { status: 'ok', message: 'All bookings on schedule' };
    }

    // Check delayed containers
    const delayedCount = await prisma.container.count({
      where: { delayed: true },
    });

    if (delayedCount > 5) {
      checks.containers = { status: 'warning', message: `${delayedCount} containers delayed` };
    } else if (delayedCount > 0) {
      checks.containers = { status: 'ok', message: `${delayedCount} containers with minor delays` };
    } else {
      checks.containers = { status: 'ok', message: 'No delayed containers' };
    }

    return checks;
  }
}

export const adminDashboardService = new AdminDashboardService();

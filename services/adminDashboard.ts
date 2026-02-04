/**
 * Admin Dashboard Service
 * Frontend service for admin dashboard API calls
 */

import api from './api';

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
  pricing: {
    basePrices: number;
    totalBasePrices: number;
    agentPrices: number;
    totalAgentPrices: number;
    portAdjustments: number;
  };
}

export interface RecentBooking {
  id: string;
  status: string;
  shippingLine: string;
  portOrigin: string;
  portDestination: string;
  containerType: string;
  totalPrice: number;
  createdAt: string;
  client?: {
    id: string;
    companyName: string;
    email: string;
  };
}

export interface RecentUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface RecentActivity {
  type: 'booking' | 'user' | 'container' | 'payment';
  id: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  [key: string]: {
    status: 'ok' | 'warning' | 'error';
    message: string;
  };
}

class AdminDashboardService {
  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<{ success: boolean; data: DashboardStats }>('/admin/dashboard/stats');
    return response.data.data;
  }

  /**
   * Get recent bookings
   */
  async getRecentBookings(limit: number = 10): Promise<RecentBooking[]> {
    const response = await api.get<{ success: boolean; data: RecentBooking[] }>('/admin/dashboard/recent-bookings', {
      params: { limit },
    });
    return response.data.data;
  }

  /**
   * Get recent users
   */
  async getRecentUsers(limit: number = 10): Promise<RecentUser[]> {
    const response = await api.get<{ success: boolean; data: RecentUser[] }>('/admin/dashboard/recent-users', {
      params: { limit },
    });
    return response.data.data;
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number = 20): Promise<RecentActivity[]> {
    const response = await api.get<{ success: boolean; data: RecentActivity[] }>('/admin/dashboard/activity', {
      params: { limit },
    });
    return response.data.data;
  }

  /**
   * Get system health
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const response = await api.get<{ success: boolean; data: SystemHealth }>('/admin/dashboard/health');
    return response.data.data;
  }
}

const adminDashboardService = new AdminDashboardService();
export default adminDashboardService;

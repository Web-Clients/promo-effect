/**
 * Admin Dashboard — orchestrator (~100 lines after C2 extraction).
 *
 * Sub-components extracted (Task C2):
 *   - AdminStats (KPI cards + breakdowns + system health)
 *   - AdminQuickActions (navigation tiles)
 *   - AdminRecentActivity (recent bookings + users)
 */

import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import adminDashboardService, {
  DashboardStats,
  RecentBooking,
  RecentUser,
  SystemHealth,
} from '../services/adminDashboard';
import { getErrorMessage, formatCurrency } from '../utils/formatters';
import { RECENT_BOOKINGS_COUNT } from '../config/constants';
import { AdminStats } from './admin/dashboard/AdminStats';
import { AdminQuickActions } from './admin/dashboard/AdminQuickActions';
import { AdminRecentActivity } from './admin/dashboard/AdminRecentActivity';
import { SkeletonCard } from './ui/Skeleton';

// ─── Local icon components ────────────────────────────────────────────────────

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const AlertIcon = ({ className }: { className?: string }) => (
  <svg
    className={`w-5 h-5${className ? ` ${className}` : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsData, bookingsData, usersData, healthData] = await Promise.all([
        adminDashboardService.getStats(),
        adminDashboardService.getRecentBookings(RECENT_BOOKINGS_COUNT),
        adminDashboardService.getRecentUsers(RECENT_BOOKINGS_COUNT),
        adminDashboardService.getSystemHealth(),
      ]);
      setStats(statsData);
      setRecentBookings(bookingsData);
      setRecentUsers(usersData);
      setSystemHealth(healthData);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Nu s-au putut încărca datele'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Se încarcă panoul admin">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-4 w-64 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200/50 dark:border-neutral-700/50"
            >
              <SkeletonCard />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <XCircleIcon />
        <p className="text-error-500">{error}</p>
        <Button onClick={loadData}>Reîncarcă</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading">
            Panou Admin
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Iată un rezumat al platformei.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="flex items-center gap-2">
          <RefreshIcon />
          Actualizează
        </Button>
      </div>

      {/* Stats + breakdowns */}
      {stats && <AdminStats stats={stats} systemHealth={systemHealth} />}

      {/* Quick Actions */}
      <AdminQuickActions />

      {/* Recent Activity */}
      <AdminRecentActivity recentBookings={recentBookings} recentUsers={recentUsers} />

      {/* Alerts */}
      {stats && (stats.containers.delayed > 0 || stats.revenue.pendingPayments > 0) && (
        <Card className="p-5 border-l-4 border-l-yellow-500">
          <h3 className="text-sm font-semibold text-primary-800 dark:text-white mb-3 flex items-center gap-2">
            <AlertIcon className="text-yellow-500" />
            Atenție necesară
          </h3>
          <div className="space-y-2">
            {stats.containers.delayed > 0 && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                • <span className="font-medium text-yellow-600">{stats.containers.delayed}</span>{' '}
                containere cu întârzieri
              </p>
            )}
            {stats.revenue.pendingPayments > 0 && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                •{' '}
                <span className="font-medium text-yellow-600">
                  {formatCurrency(stats.revenue.pendingPayments)}
                </span>{' '}
                facturi neachitate
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;

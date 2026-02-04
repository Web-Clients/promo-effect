/**
 * Admin Dashboard
 * Comprehensive admin panel with stats, recent activity, and quick actions
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import adminDashboardService, {
  DashboardStats,
  RecentBooking,
  RecentUser,
  RecentActivity,
  SystemHealth,
} from '../services/adminDashboard';
import { cn } from '../lib/utils';

// Icons
const UsersIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const PackageIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;
const DollarIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ShipIcon = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const TrendingUpIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>;
const AlertIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const CheckCircleIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const XCircleIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const RefreshIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>;
const SettingsIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const GlobeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ChartIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const ClockIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

const SpinnerIcon = () => (
  <svg className="animate-spin h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

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
        adminDashboardService.getRecentBookings(5),
        adminDashboardService.getRecentUsers(5),
        adminDashboardService.getSystemHealth(),
      ]);
      setStats(statsData);
      setRecentBookings(bookingsData);
      setRecentUsers(usersData);
      setSystemHealth(healthData);
    } catch (err: any) {
      setError(err.message || 'Nu s-au putut încărca datele');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400';
      case 'CONFIRMED': return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400';
      case 'IN_TRANSIT': return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400';
      case 'DELIVERED': return 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-400';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <SpinnerIcon />
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
            Bun venit, Ion! Iată un rezumat al platformei.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} className="flex items-center gap-2">
          <RefreshIcon />
          Actualizează
        </Button>
      </div>

      {/* Quick Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Users Card */}
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <UsersIcon />
              </div>
              <div className="flex-1">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Utilizatori</p>
                <p className="text-2xl font-bold text-primary-800 dark:text-white">{stats.users.total}</p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <TrendingUpIcon />
                  +{stats.users.newThisMonth} luna aceasta
                </p>
              </div>
            </div>
          </Card>

          {/* Bookings Card */}
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <PackageIcon />
              </div>
              <div className="flex-1">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Rezervări</p>
                <p className="text-2xl font-bold text-primary-800 dark:text-white">{stats.bookings.total}</p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <TrendingUpIcon />
                  {stats.bookings.thisMonth} luna aceasta
                </p>
              </div>
            </div>
          </Card>

          {/* Revenue Card */}
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
                <DollarIcon />
              </div>
              <div className="flex-1">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Venituri</p>
                <p className="text-2xl font-bold text-primary-800 dark:text-white">{formatCurrency(stats.revenue.totalUSD)}</p>
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <TrendingUpIcon />
                  {formatCurrency(stats.revenue.thisMonthUSD)} luna aceasta
                </p>
              </div>
            </div>
          </Card>

          {/* Containers Card */}
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                <ShipIcon />
              </div>
              <div className="flex-1">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Containere</p>
                <p className="text-2xl font-bold text-primary-800 dark:text-white">{stats.containers.total}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  {stats.containers.inTransit} în tranzit
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Second Row: Detailed Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bookings Breakdown */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-primary-800 dark:text-white mb-4">Stare Rezervări</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">În așteptare</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400">
                  {stats.bookings.pending}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Confirmate</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400">
                  {stats.bookings.confirmed}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">În tranzit</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400">
                  {stats.bookings.inTransit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Livrate</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400">
                  {stats.bookings.delivered}
                </span>
              </div>
            </div>
          </Card>

          {/* Users Breakdown */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-primary-800 dark:text-white mb-4">Tip Utilizatori</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Administratori</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400">
                  {stats.users.admins}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Clienți</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400">
                  {stats.users.clients}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">Agenți</span>
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400">
                  {stats.users.agents}
                </span>
              </div>
            </div>
          </Card>

          {/* System Health */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-primary-800 dark:text-white mb-4">Stare Sistem</h3>
            <div className="space-y-3">
              {systemHealth && (Object.entries(systemHealth) as [string, { status: 'ok' | 'warning' | 'error'; message: string }][]).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 capitalize">{key}</span>
                  <span className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    value.status === 'ok' && 'text-green-600 dark:text-green-400',
                    value.status === 'warning' && 'text-yellow-600 dark:text-yellow-400',
                    value.status === 'error' && 'text-red-600 dark:text-red-400',
                  )}>
                    {value.status === 'ok' && <CheckCircleIcon />}
                    {value.status === 'warning' && <AlertIcon />}
                    {value.status === 'error' && <XCircleIcon />}
                    {value.status === 'ok' ? 'OK' : value.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-primary-800 dark:text-white mb-4">Acțiuni Rapide</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Link to="/dashboard/admin-pricing" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <DollarIcon />
            <span className="text-xs font-medium text-center">Prețuri</span>
          </Link>
          <Link to="/dashboard/agents" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <GlobeIcon />
            <span className="text-xs font-medium text-center">Agenți</span>
          </Link>
          <Link to="/dashboard/clients" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <UsersIcon />
            <span className="text-xs font-medium text-center">Clienți</span>
          </Link>
          <Link to="/dashboard/bookings" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <PackageIcon />
            <span className="text-xs font-medium text-center">Rezervări</span>
          </Link>
          <Link to="/dashboard/reports" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <ChartIcon />
            <span className="text-xs font-medium text-center">Rapoarte</span>
          </Link>
          <Link to="/dashboard/adminSettings" className="flex flex-col items-center gap-2 p-4 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors">
            <SettingsIcon />
            <span className="text-xs font-medium text-center">Setări</span>
          </Link>
        </div>
      </Card>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-primary-800 dark:text-white">Rezervări Recente</h3>
            <Link to="/dashboard/bookings" className="text-xs text-accent-600 dark:text-accent-400 hover:underline">
              Vezi toate →
            </Link>
          </div>
          <div className="space-y-3">
            {recentBookings.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">Nu există rezervări recente</p>
            ) : (
              recentBookings.map((booking) => (
                <Link
                  key={booking.id}
                  to={`/dashboard/bookings/${booking.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-primary-800 dark:text-white truncate">{booking.id}</p>
                      <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', getStatusColor(booking.status))}>
                        {booking.status}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 truncate">
                      {booking.client?.companyName || 'N/A'} • {booking.portOrigin} → {booking.portDestination}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary-800 dark:text-white">{formatCurrency(booking.totalPrice)}</p>
                    <p className="text-xs text-neutral-400 flex items-center gap-1">
                      <ClockIcon />
                      {formatDate(booking.createdAt)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>

        {/* Recent Users */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-primary-800 dark:text-white">Utilizatori Noi</h3>
            <span className="text-xs text-neutral-400">Ultimii înregistrați</span>
          </div>
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">Nu există utilizatori noi</p>
            ) : (
              recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700/50"
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-sm">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-800 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400' :
                      user.role === 'AGENT' ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400'
                    )}>
                      {user.role}
                    </span>
                    <p className="text-xs text-neutral-400 mt-1">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Alerts Section */}
      {stats && (stats.containers.delayed > 0 || stats.revenue.pendingPayments > 0) && (
        <Card className="p-5 border-l-4 border-l-yellow-500">
          <h3 className="text-sm font-semibold text-primary-800 dark:text-white mb-3 flex items-center gap-2">
            <AlertIcon className="text-yellow-500" />
            Atenție necesară
          </h3>
          <div className="space-y-2">
            {stats.containers.delayed > 0 && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                • <span className="font-medium text-yellow-600">{stats.containers.delayed}</span> containere cu întârzieri
              </p>
            )}
            {stats.revenue.pendingPayments > 0 && (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                • <span className="font-medium text-yellow-600">{formatCurrency(stats.revenue.pendingPayments)}</span> facturi neachitate
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;

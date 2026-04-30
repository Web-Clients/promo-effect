/**
 * AdminStats — Quick stats cards + breakdowns for AdminDashboard.
 * Task C2 extraction.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { cn } from '../../../lib/utils';
import { DashboardStats, SystemHealth } from '../../../services/adminDashboard';
import { formatCurrency } from '../../../utils/formatters';

// ─── Local icon components ────────────────────────────────────────────────────

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);
const PackageIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
    />
  </svg>
);
const DollarIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);
const ShipIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);
const TrendingUpIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    />
  </svg>
);
const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminStatsProps {
  stats: DashboardStats;
  systemHealth: SystemHealth | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AdminStats: React.FC<AdminStatsProps> = ({ stats, systemHealth }) => {
  return (
    <>
      {/* Quick KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <UsersIcon />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Utilizatori</p>
              <p className="text-2xl font-bold text-primary-800 dark:text-white">
                {stats.users.total}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <TrendingUpIcon />+{stats.users.newThisMonth} luna aceasta
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <PackageIcon />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Rezervări</p>
              <p className="text-2xl font-bold text-primary-800 dark:text-white">
                {stats.bookings.total}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <TrendingUpIcon />
                {stats.bookings.thisMonth} luna aceasta
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400">
              <DollarIcon />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Venituri</p>
              <p className="text-2xl font-bold text-primary-800 dark:text-white">
                {formatCurrency(stats.revenue.totalUSD)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <TrendingUpIcon />
                {formatCurrency(stats.revenue.thisMonthUSD)} luna aceasta
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <ShipIcon />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Containere</p>
              <p className="text-2xl font-bold text-primary-800 dark:text-white">
                {stats.containers.total}
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                {stats.containers.inTransit} în tranzit
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <DollarIcon />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Configurare Prețuri</p>
              <div className="flex gap-4 items-end mt-1">
                <div>
                  <p className="text-xl font-bold text-primary-800 dark:text-white">
                    {stats.pricing?.totalBasePrices || 0}
                  </p>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Platformă</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-primary-800 dark:text-white">
                    {stats.pricing?.totalAgentPrices || 0}
                  </p>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wide">Agenți</p>
                </div>
              </div>
              <Link
                to="/dashboard/admin-pricing"
                className="text-xs text-teal-600 dark:text-teal-400 hover:underline mt-2 inline-block"
              >
                Gestionează toate &rarr;
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Breakdowns row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-primary-800 dark:text-white mb-4">
            Stare Rezervări
          </h3>
          <div className="space-y-3">
            {[
              {
                label: 'În așteptare',
                value: stats.bookings.pending,
                cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400',
              },
              {
                label: 'Confirmate',
                value: stats.bookings.confirmed,
                cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
              },
              {
                label: 'În tranzit',
                value: stats.bookings.inTransit,
                cls: 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400',
              },
              {
                label: 'Livrate',
                value: stats.bookings.delivered,
                cls: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
              },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">{label}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-primary-800 dark:text-white mb-4">
            Tip Utilizatori
          </h3>
          <div className="space-y-3">
            {[
              {
                label: 'Administratori',
                value: stats.users.admins,
                cls: 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400',
              },
              {
                label: 'Clienți',
                value: stats.users.clients,
                cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400',
              },
              {
                label: 'Agenți',
                value: stats.users.agents,
                cls: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400',
              },
            ].map(({ label, value, cls }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-neutral-500">{label}</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-primary-800 dark:text-white mb-4">
            Stare Sistem
          </h3>
          <div className="space-y-3">
            {systemHealth &&
              (
                Object.entries(systemHealth) as [
                  string,
                  { status: 'ok' | 'warning' | 'error'; message: string },
                ][]
              ).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-neutral-500 capitalize">{key}</span>
                  <span
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium',
                      value.status === 'ok' && 'text-green-600 dark:text-green-400',
                      value.status === 'warning' && 'text-yellow-600 dark:text-yellow-400',
                      value.status === 'error' && 'text-red-600 dark:text-red-400'
                    )}
                  >
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
    </>
  );
};

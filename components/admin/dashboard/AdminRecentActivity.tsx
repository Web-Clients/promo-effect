/**
 * AdminRecentActivity — Recent bookings + users tables for AdminDashboard.
 * Task C2 extraction.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../ui/Card';
import { cn } from '../../../lib/utils';
import { RecentBooking, RecentUser } from '../../../services/adminDashboard';
import { formatDate, formatCurrency, getStatusColor } from '../../../utils/formatters';

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

interface AdminRecentActivityProps {
  recentBookings: RecentBooking[];
  recentUsers: RecentUser[];
}

export const AdminRecentActivity: React.FC<AdminRecentActivityProps> = ({
  recentBookings,
  recentUsers,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {/* Recent Bookings */}
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-primary-800 dark:text-white">
          Rezervări Recente
        </h3>
        <Link
          to="/dashboard/bookings"
          className="text-xs text-accent-600 dark:text-accent-400 hover:underline"
        >
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
                  <p className="text-sm font-medium text-primary-800 dark:text-white truncate">
                    {booking.id}
                  </p>
                  <span
                    className={cn(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      getStatusColor(booking.status)
                    )}
                  >
                    {booking.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 truncate">
                  {booking.client?.companyName || 'N/A'} • {booking.portOrigin} →{' '}
                  {booking.portDestination}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-primary-800 dark:text-white">
                  {formatCurrency(booking.totalPrice)}
                </p>
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
                <p className="text-sm font-medium text-primary-800 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-neutral-500 truncate">{user.email}</p>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    'px-2 py-0.5 text-xs font-medium rounded-full',
                    user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
                      ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                      : user.role === 'AGENT'
                        ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400'
                  )}
                >
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
);

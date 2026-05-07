/**
 * Notifications Dropdown
 * Shows notifications grouped by date with type-specific icons and colors.
 * Polls every 30s for unread count; loads full list on open.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationsService, { Notification } from '../services/notifications';
import { cn } from '../lib/utils';
import { formatDateShort } from '../utils/formatters';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const isToday = (d: Date) => startOfDay(d).getTime() === startOfDay(new Date()).getTime();

const isYesterday = (d: Date) => {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return startOfDay(d).getTime() === startOfDay(y).getTime();
};

const isThisWeek = (d: Date) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return d >= weekAgo;
};

const groupNotifications = (notifications: Notification[]) => {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  for (const n of notifications) {
    const d = new Date(n.createdAt);
    if (isToday(d)) today.push(n);
    else if (isYesterday(d)) yesterday.push(n);
    else if (isThisWeek(d)) thisWeek.push(n);
    else older.push(n);
  }

  return { today, yesterday, thisWeek, older };
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Acum';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}z`;
  return formatDateShort(date);
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const BellIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

// Icon per notification type
const TypeIcon = ({ type }: { type: string }) => {
  if (type === 'ETA_1_DAYS' || type === 'ETA_TODAY') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (type === 'ETA_3_DAYS' || type === 'ETA_5_DAYS') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }
  if (type === 'BOOKING_CREATED') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    );
  }
  if (type === 'BOOKING_DELAYED') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
  }
  if (type === 'TELEX_RELEASE') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (type === 'DOCUMENTS_UPLOADED') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    );
  }
  if (type === 'PAYMENT_RECEIVED' || type === 'INVOICE_PAID') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  }
  if (type === 'INVOICE_OVERDUE') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        />
      </svg>
    );
  }
  if (type === 'PRICE_CHANGED') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
    );
  }
  if (type === 'EMAIL_PARSE_FAILED') {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    );
  }
  // fallback
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
};

// ─── Colors ───────────────────────────────────────────────────────────────────

const getTypeColor = (type: string) => {
  if (type === 'ETA_TODAY' || type === 'BOOKING_DELAYED') {
    return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
  }
  if (type === 'ETA_1_DAYS') {
    return 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400';
  }
  if (type === 'ETA_3_DAYS') {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400';
  }
  if (type === 'ETA_5_DAYS') {
    return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
  }
  if (type === 'BOOKING_CREATED') {
    return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
  }
  if (type === 'TELEX_RELEASE') {
    return 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400';
  }
  if (type === 'DOCUMENTS_UPLOADED') {
    return 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400';
  }
  if (type === 'PAYMENT_RECEIVED' || type === 'INVOICE_PAID') {
    return 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400';
  }
  if (type === 'INVOICE_OVERDUE') {
    return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
  }
  if (type === 'PRICE_CHANGED') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
  }
  if (type === 'EMAIL_PARSE_FAILED') {
    return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
  }
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400';
};

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeader = ({ label }: { label: string }) => (
  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-700">
    {label}
  </div>
);

// ─── Single notification row ──────────────────────────────────────────────────

const NotificationRow = ({
  notification,
  onMarkRead,
  onClick,
}: {
  notification: Notification;
  onMarkRead: (id: string, e: React.MouseEvent) => void;
  onClick: (n: Notification) => void;
}) => (
  <button
    key={notification.id}
    onClick={() => onClick(notification)}
    className={cn(
      'w-full text-left flex gap-3 px-4 py-3 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500',
      notification.read
        ? 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750'
        : 'bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30'
    )}
  >
    {/* Type icon */}
    <div
      className={cn(
        'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5',
        getTypeColor(notification.type)
      )}
    >
      <TypeIcon type={notification.type} />
    </div>

    {/* Content */}
    <div className="flex-1 min-w-0">
      <p
        className={cn(
          'text-sm leading-snug',
          notification.read
            ? 'text-neutral-700 dark:text-neutral-300'
            : 'text-neutral-900 dark:text-white font-medium'
        )}
      >
        {notification.title}
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2 leading-relaxed">
        {notification.message}
      </p>
      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mt-1">
        {formatTimeAgo(notification.createdAt)}
      </p>
    </div>

    {/* Unread dot + mark-read button */}
    <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
      {!notification.read && (
        <>
          <span className="w-2 h-2 rounded-full bg-primary-500" />
          <button
            onClick={(e) => onMarkRead(notification.id, e)}
            className="p-1 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            title="Marchează citit"
          >
            <CheckIcon />
          </button>
        </>
      )}
    </div>
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────

interface NotificationsDropdownProps {
  className?: string;
}

const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const loadUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  }, []);

  // Poll unread count every 30s
  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Load last 50 (read + unread) to allow proper grouping
      const response = await notificationsService.getNotifications({ limit: 50 });
      setNotifications(response.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) loadNotifications();
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await notificationsService.markAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }
    if (notification.bookingId) {
      navigate(`/dashboard/bookings/${notification.bookingId}`);
      setIsOpen(false);
    }
  };

  const grouped = groupNotifications(notifications);
  const hasAny = notifications.length > 0;
  const hasUnread = unreadCount > 0;

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
        aria-label="Notificări"
      >
        <BellIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Notificări</h3>
              {hasUnread && (
                <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {hasUnread && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Toate citite
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[480px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
              </div>
            ) : !hasAny ? (
              <div className="flex flex-col items-center justify-center py-10 text-neutral-500 dark:text-neutral-400">
                <BellIcon className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">Nicio notificare</p>
                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                  Vei fi notificat despre containere, plăți și documente.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                {grouped.today.length > 0 && (
                  <>
                    <SectionHeader label="Astăzi" />
                    {grouped.today.map((n) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        onMarkRead={handleMarkAsRead}
                        onClick={handleNotificationClick}
                      />
                    ))}
                  </>
                )}
                {grouped.yesterday.length > 0 && (
                  <>
                    <SectionHeader label="Ieri" />
                    {grouped.yesterday.map((n) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        onMarkRead={handleMarkAsRead}
                        onClick={handleNotificationClick}
                      />
                    ))}
                  </>
                )}
                {grouped.thisWeek.length > 0 && (
                  <>
                    <SectionHeader label="Săptămâna aceasta" />
                    {grouped.thisWeek.map((n) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        onMarkRead={handleMarkAsRead}
                        onClick={handleNotificationClick}
                      />
                    ))}
                  </>
                )}
                {grouped.older.length > 0 && (
                  <>
                    <SectionHeader label="Mai vechi" />
                    {grouped.older.map((n) => (
                      <NotificationRow
                        key={n.id}
                        notification={n}
                        onMarkRead={handleMarkAsRead}
                        onClick={handleNotificationClick}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {hasAny && (
            <div className="border-t border-neutral-200 dark:border-neutral-700 p-2">
              <button
                onClick={() => {
                  navigate('/dashboard/notifications');
                  setIsOpen(false);
                }}
                className="w-full py-2 text-sm text-center text-primary-600 dark:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Vezi toate notificările
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;

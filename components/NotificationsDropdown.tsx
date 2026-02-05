/**
 * Notifications Dropdown
 * Shows notifications in a dropdown when clicking the bell icon
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationsService, { Notification } from '../services/notifications';
import { cn } from '../lib/utils';

// Icons
const BellIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const PackageIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DollarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const getNotificationIcon = (type: string) => {
  if (type.includes('BOOKING') || type.includes('CONTAINER')) {
    return <PackageIcon />;
  }
  if (type.includes('PAYMENT') || type.includes('INVOICE')) {
    return <DollarIcon />;
  }
  return <InfoIcon />;
};

const getNotificationColor = (type: string) => {
  if (type.includes('CONFIRMED') || type.includes('DELIVERED') || type.includes('SUCCESS')) {
    return 'bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400';
  }
  if (type.includes('CANCELLED') || type.includes('FAILED') || type.includes('REJECTED')) {
    return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400';
  }
  if (type.includes('PENDING') || type.includes('WARNING')) {
    return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400';
  }
  return 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400';
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Acum';
  if (diffMins < 60) return `${diffMins} min`;
  if (diffHours < 24) return `${diffHours} ore`;
  if (diffDays < 7) return `${diffDays} zile`;
  return date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
};

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

  // Load unread count on mount
  useEffect(() => {
    loadUnreadCount();
    // Refresh count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationsService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Only load unread notifications
      const response = await notificationsService.getNotifications({ limit: 10, read: false });
      setNotifications(response.data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      loadNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(id);
      // Remove from list after marking as read
      setNotifications(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      // Clear the list after marking all as read
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      try {
        await notificationsService.markAsRead(notification.id);
        // Remove from list after marking as read
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error('Failed to mark as read:', err);
      }
    }

    // Navigate to related booking if exists
    if (notification.bookingId) {
      navigate(`/dashboard/bookings/${notification.bookingId}`);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleToggle}
        className="relative p-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
      >
        <BellIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              Notificari
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Marcheaza toate citite
              </button>
            )}
          </div>

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-neutral-500 dark:text-neutral-400">
                <BellIcon className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">Nu aveti notificari</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex gap-3 p-4 cursor-pointer transition-colors",
                      notification.read
                        ? "bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750"
                        : "bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                      getNotificationColor(notification.type)
                    )}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-sm",
                        notification.read
                          ? "text-neutral-900 dark:text-neutral-200"
                          : "text-neutral-900 dark:text-white font-medium"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>

                    {/* Mark as read button */}
                    {!notification.read && (
                      <button
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                        className="flex-shrink-0 p-1.5 text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        title="Marcheaza citit"
                      >
                        <CheckIcon />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-neutral-200 dark:border-neutral-700 p-2">
              <button
                onClick={() => {
                  navigate('/dashboard/notifications');
                  setIsOpen(false);
                }}
                className="w-full py-2 text-sm text-center text-primary-600 dark:text-primary-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Vezi toate notificarile
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;

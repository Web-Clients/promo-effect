/**
 * BookingsTable — Phase A4
 * Table render component. Columns per client mockup:
 * BL Number | Client | Linie Maritimă | Container | Rută | ETA | Preț | Status + TLX/DOC badges
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { User, UserRole } from '../../types';
import { BookingResponse } from '../../services/bookings';
import { TlxBadge, DocBadge, StatusBadge } from './BookingsBadges';
import { Button } from '../ui/Button';
import { PlusIcon, FileTextIcon } from '../icons';
import { SkeletonTableRow } from '../ui/Skeleton';
import { formatDateShort } from '../../utils/formatters';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getBlNumber(b: BookingResponse): string {
  if ((b as any).blNumber) return (b as any).blNumber;
  if (b.containers && b.containers.length > 0 && b.containers[0].blNumber) {
    return b.containers[0].blNumber;
  }
  return '';
}

export function getContainerNumber(b: BookingResponse): string {
  if ((b as any).containerNumber) return (b as any).containerNumber;
  if (b.containers && b.containers.length > 0 && b.containers[0].containerNumber) {
    return b.containers[0].containerNumber;
  }
  return '';
}

export function hasTelexRelease(b: BookingResponse): boolean {
  if ((b as any).telexReleased) return true;
  if (b.containers && b.containers.length > 0 && (b.containers[0] as any).telexRelease) {
    return true;
  }
  return false;
}

export function hasDocuments(b: BookingResponse): boolean {
  if ((b as any).documentsUploaded) return true;
  if (b.documents && b.documents.length > 0) return true;
  return false;
}

// ─── i18n key map ─────────────────────────────────────────────────────────────

const STATUS_I18N_KEYS: Record<string, string> = {
  DRAFT: 'status.pending',
  PENDING: 'status.pending',
  SUBMITTED: 'status.processing',
  CONFIRMED: 'status.confirmed',
  IN_TRANSIT: 'status.inTransit',
  DELIVERED: 'status.delivered',
  CANCELLED: 'status.cancelled',
};

// ─── Component ────────────────────────────────────────────────────────────────

interface BookingsTableProps {
  bookings: BookingResponse[];
  selectedRows: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  user: User;
  isLoading?: boolean;
  onNewBooking?: () => void;
  activeTab?: string;
  tabLabel?: string;
}

export const BookingsTable: React.FC<BookingsTableProps> = ({
  bookings,
  selectedRows,
  onSelectAll,
  onSelectRow,
  user,
  isLoading = false,
  onNewBooking,
  activeTab = 'all',
  tabLabel = '',
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" aria-label={t('bookings.loadingBookings')} aria-busy="true">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonTableRow key={i} cols={14} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
          <FileTextIcon className="h-8 w-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-2">
          {t('bookings.noBookings')}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md mb-4">
          {activeTab !== 'all'
            ? `${t('bookings.noBookingsInTab')} "${tabLabel}"`
            : t('bookings.createFirst')}
        </p>
        {activeTab === 'all' && onNewBooking && (
          <Button variant="accent" onClick={onNewBooking}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {t('bookings.createFirstBtn')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" aria-label={t('bookings.title')}>
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-700/50 border-b border-neutral-200 dark:border-neutral-700">
              {/* Checkbox */}
              <th scope="col" className="text-left p-4 w-12">
                <input
                  type="checkbox"
                  aria-label={t('bookings.selectAll')}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  checked={selectedRows.length > 0 && selectedRows.length === bookings.length}
                  className="w-4 h-4 rounded border-neutral-300 text-accent-500 focus:ring-accent-500"
                />
              </th>
              <Th>{t('bookings.date')}</Th>
              <Th>Nr. Comandă</Th>
              <Th>{t('bookings.blNumber')}</Th>
              {user.role !== UserRole.CLIENT && <Th>{t('bookings.beneficiary')}</Th>}
              <Th>{t('bookings.shippingLineShort')}</Th>
              <Th>{t('bookings.containerNumber')}</Th>
              <Th>{t('bookings.weight')}</Th>
              <Th>{t('bookings.route')}</Th>
              <Th>{t('bookings.eta')}</Th>
              <Th align="right">{t('bookings.price')}</Th>
              <Th align="center">TLX</Th>
              <Th align="center">DOC</Th>
              <Th>{t('bookings.status')}</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
            {bookings.map((b, index) => {
              const blNumber = getBlNumber(b);
              const containerNumber = getContainerNumber(b);
              const tlx = hasTelexRelease(b);
              const doc = hasDocuments(b);
              const route =
                b.portOrigin && b.portDestination
                  ? `${b.portOrigin} → ${b.portDestination}`
                  : b.portDestination || '—';

              return (
                <tr
                  key={b.id}
                  onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    'hover:bg-neutral-50 dark:hover:bg-neutral-700/30',
                    selectedRows.includes(b.id) && 'bg-accent-50/50 dark:bg-accent-500/10'
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Checkbox */}
                  <td className="p-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(b.id)}
                      onChange={(e) => onSelectRow(b.id, e.target.checked)}
                      className="w-4 h-4 rounded border-neutral-300 text-accent-500 focus:ring-accent-500"
                    />
                  </td>
                  {/* Data */}
                  <td className="p-4 whitespace-nowrap">
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">
                      {formatDateShort(b.createdAt)}
                    </span>
                  </td>
                  {/* Nr. Comandă (MDPE...) */}
                  <td className="p-4">
                    <span className="font-mono text-xs font-semibold text-primary-700 dark:text-primary-300 whitespace-nowrap">
                      {b.id.startsWith('MDPE') || b.id.startsWith('PE') ? (
                        b.id
                      ) : (
                        <span className="text-neutral-400 font-normal italic">—</span>
                      )}
                    </span>
                  </td>
                  {/* BL Nr */}
                  <td className="p-4">
                    <span className="font-mono font-semibold text-primary-800 dark:text-white text-sm">
                      {blNumber || (
                        <span className="text-neutral-400 font-normal italic text-xs">fără BL</span>
                      )}
                    </span>
                  </td>
                  {/* Beneficiar */}
                  {user.role !== UserRole.CLIENT && (
                    <td className="p-4">
                      <span className="text-sm text-neutral-600 dark:text-neutral-300 max-w-[140px] truncate block">
                        {(b as any).beneficiaryName || b.client?.companyName || 'N/A'}
                      </span>
                    </td>
                  )}
                  {/* Linie maritimă */}
                  <td className="p-4">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                      {b.shippingLine || '—'}
                    </span>
                  </td>
                  {/* Container Nr */}
                  <td className="p-4">
                    <span className="font-mono text-sm text-neutral-600 dark:text-neutral-300">
                      {containerNumber || '—'}
                    </span>
                  </td>
                  {/* Greutate */}
                  <td className="p-4">
                    <span className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                      {b.cargoWeight || '—'}
                    </span>
                  </td>
                  {/* Rută */}
                  <td className="p-4">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {route}
                    </span>
                  </td>
                  {/* ETA */}
                  <td className="p-4 whitespace-nowrap">
                    <span className="text-sm text-neutral-600 dark:text-neutral-300">
                      {b.eta ? formatDateShort(b.eta) : '—'}
                    </span>
                  </td>
                  {/* Preț */}
                  <td className="p-4 text-right">
                    <span className="font-semibold text-accent-500 whitespace-nowrap">
                      ${b.totalPrice?.toFixed(0) ?? '0'}
                    </span>
                  </td>
                  {/* TLX */}
                  <td className="p-4 text-center">
                    <TlxBadge active={tlx} />
                  </td>
                  {/* DOC */}
                  <td className="p-4 text-center">
                    <DocBadge active={doc} />
                  </td>
                  {/* Status */}
                  <td className="p-4">
                    <StatusBadge
                      status={b.status}
                      label={STATUS_I18N_KEYS[b.status] ? t(STATUS_I18N_KEYS[b.status]) : b.status}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Small helper for <th> ────────────────────────────────────────────────────

const Th: React.FC<{ children: React.ReactNode; align?: 'left' | 'right' | 'center' }> = ({
  children,
  align = 'left',
}) => (
  <th
    scope="col"
    className={cn(
      'p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400',
      align === 'right' && 'text-right',
      align === 'center' && 'text-center',
      align === 'left' && 'text-left'
    )}
  >
    {children}
  </th>
);

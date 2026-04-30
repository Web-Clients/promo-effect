/**
 * BookingsList — Phase A4/A5 (orchestrator ~150 lines)
 *
 * Page central Rezervări. Extracts logic into:
 * - BookingsFilters (search + tabs)
 * - BookingsTable (table render)
 * - BookingsBulkActions (bulk bar)
 * Tabs: TOATE | LA INCARCARE | IN DRUM | PORT | LIVRATE | ARHIVĂ
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { Button } from './ui/Button';
import { PlusIcon } from './icons';
import { useToast } from './ui/Toast';
import bookingsService, { BookingResponse, BookingFilters } from '../services/bookings';
import invoicesService from '../services/invoices';
import { getErrorMessage } from '../utils/formatters';
import {
  BULK_FETCH_LIMIT,
  DEFAULT_INVOICE_DUE_DAYS,
  SEARCH_DEBOUNCE_MS,
} from '../config/constants';

import { BookingsFilters, BOOKING_TABS, TabKey } from './bookings/BookingsFilters';
import { BookingsTable } from './bookings/BookingsTable';
import { BookingsBulkActions } from './bookings/BookingsBulkActions';
import { useConfirm } from '../hooks/useConfirm';

// ─── Tab → status mapping ────────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function filterByTab(bookings: BookingResponse[], tab: TabKey): BookingResponse[] {
  const now = new Date();

  if (tab === 'all') return bookings;

  if (tab === 'loading') {
    return bookings.filter((b) =>
      ['DRAFT', 'PENDING', 'SUBMITTED', 'CONFIRMED'].includes(b.status)
    );
  }

  if (tab === 'transit') {
    // IN_TRANSIT without arrivalDateConstanta set
    return bookings.filter((b) => b.status === 'IN_TRANSIT' && !(b as any).arrivalDateConstanta);
  }

  if (tab === 'port') {
    // IN_TRANSIT with arrivalDateConstanta set, or ARRIVED
    return bookings.filter((b) => {
      if (b.status === 'IN_TRANSIT' && (b as any).arrivalDateConstanta) return true;
      if (
        b.containers?.length &&
        ['ARRIVED', 'DISCHARGED'].includes(
          b.containers[0].currentStatus || b.containers[0].status || ''
        )
      )
        return true;
      return false;
    });
  }

  if (tab === 'delivered') {
    return bookings.filter(
      (b) =>
        b.status === 'DELIVERED' && now.getTime() - new Date(b.createdAt).getTime() < THIRTY_DAYS_MS
    );
  }

  if (tab === 'archive') {
    return bookings.filter(
      (b) =>
        b.status === 'CANCELLED' ||
        (b.status === 'DELIVERED' &&
          now.getTime() - new Date(b.createdAt).getTime() >= THIRTY_DAYS_MS)
    );
  }

  return bookings;
}

function countTabs(bookings: BookingResponse[]): Record<TabKey, number> {
  return {
    all: bookings.length,
    loading: filterByTab(bookings, 'loading').length,
    transit: filterByTab(bookings, 'transit').length,
    port: filterByTab(bookings, 'port').length,
    delivered: filterByTab(bookings, 'delivered').length,
    archive: filterByTab(bookings, 'archive').length,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

const BookingsList = ({ user }: { user: User }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { confirm: confirmDialog, ConfirmDialogNode } = useConfirm();

  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Load bookings
  const loadBookings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const filters: BookingFilters = { limit: BULK_FETCH_LIMIT, offset: 0 };
      if (searchTerm) filters.search = searchTerm;
      const res = await bookingsService.getBookings(filters);
      setBookings(res.bookings);
    } catch (err) {
      const msg = getErrorMessage(err, 'Eroare la încărcarea rezervărilor');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [searchTerm]); // eslint-disable-line

  const filteredBookings = useMemo(() => filterByTab(bookings, activeTab), [bookings, activeTab]);
  const tabCounts = useMemo(() => countTabs(bookings), [bookings]);

  const handleSelectAll = (checked: boolean) =>
    setSelectedRows(checked ? filteredBookings.map((b) => b.id) : []);

  const handleSelectRow = (id: string, checked: boolean) =>
    setSelectedRows((prev) => (checked ? [...prev, id] : prev.filter((r) => r !== id)));

  const bulkAction = useCallback(
    async (action: string) => {
      if (action === 'generateInvoices') {
        let ok = 0;
        let fail = 0;
        for (const booking of bookings.filter((b) => selectedRows.includes(b.id))) {
          try {
            const due = new Date();
            due.setDate(due.getDate() + DEFAULT_INVOICE_DUE_DAYS);
            await invoicesService.createInvoice({
              bookingId: booking.id,
              clientId: booking.clientId,
              dueDate: due.toISOString(),
            });
            ok++;
          } catch {
            fail++;
          }
        }
        if (ok) addToast(`${ok} facturi generate cu succes!`, 'success');
        if (fail) addToast(`${fail} facturi nu au putut fi generate`, 'error');
      } else if (action === 'delete') {
        const confirmed = await confirmDialog({
          title: t('bookings.deleteConfirmTitle', 'Ștergeți rezervările?'),
          message: `Sigur doriți să ștergeți ${selectedRows.length} ${selectedRows.length === 1 ? 'rezervare' : 'rezervări'}? Această acțiune nu poate fi anulată.`,
          variant: 'danger',
          confirmText: t('common.delete', 'Șterge'),
        });
        if (!confirmed) return;
        let ok = 0;
        let fail = 0;
        for (const id of selectedRows) {
          try {
            await bookingsService.cancelBooking(id);
            ok++;
          } catch {
            fail++;
          }
        }
        if (ok) {
          addToast(`${ok} rezerv${ok === 1 ? 'are ștearsă' : 'ări șterse'} cu succes!`, 'success');
          await loadBookings();
        }
        if (fail)
          addToast(`${fail} rezerv${fail === 1 ? 'are' : 'ări'} nu au putut fi șterse`, 'error');
      } else {
        addToast(`Acțiunea '${action}' nu este implementată încă.`, 'info');
      }
      setSelectedRows([]);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [confirmDialog, selectedRows, bookings, addToast, t]
  );

  const tabLabel = t(BOOKING_TABS.find((tab) => tab.key === activeTab)?.labelKey ?? '');

  return (
    <div className="space-y-6">
      {/* Confirm dialog portal */}
      {ConfirmDialogNode}

      {/* Bulk Actions */}
      <BookingsBulkActions
        selectedCount={selectedRows.length}
        onAction={bulkAction}
        onClear={() => setSelectedRows([])}
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading">
            {t('bookings.title')}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t('bookings.subtitle')}
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => navigate('/dashboard/bookings/new')}
          className="hidden md:inline-flex"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          {t('bookings.newBooking')}
        </Button>
      </div>

      {/* Filters + Tabs */}
      <BookingsFilters
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedRows([]);
        }}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        tabCounts={tabCounts}
        onRefresh={loadBookings}
      />

      {/* Error */}
      {error && (
        <div className="p-4 bg-error-50 dark:bg-error-500/20 border border-error-200 dark:border-error-500/30 rounded-xl">
          <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <BookingsTable
        bookings={filteredBookings}
        selectedRows={selectedRows}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        user={user}
        isLoading={isLoading}
        onNewBooking={() => navigate('/dashboard/bookings/new')}
        activeTab={activeTab}
        tabLabel={tabLabel}
      />

      {/* Footer count */}
      {!isLoading && filteredBookings.length > 0 && (
        <div className="px-1 text-sm text-neutral-500 dark:text-neutral-400">
          {filteredBookings.length}{' '}
          {filteredBookings.length === 1 ? t('bookings.countSingular') : t('bookings.countPlural')}
          {activeTab !== 'all' &&
            ` ${t('common.of')} ${bookings.length} ${t('common.total').toLowerCase()}`}
        </div>
      )}
    </div>
  );
};

export default BookingsList;

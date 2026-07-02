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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { Button } from './ui/Button';
import { PlusIcon } from './icons';
import { useToast } from './ui/Toast';
import bookingsService, {
  BookingResponse,
  BookingFilters,
  BookingTabCounts,
} from '../services/bookings';
import invoicesService from '../services/invoices';
import { getErrorMessage } from '../utils/formatters';
import {
  BULK_FETCH_LIMIT,
  DEFAULT_INVOICE_DUE_DAYS,
  DEFAULT_PAGE_SIZE,
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

  const [searchParams, setSearchParams] = useSearchParams();
  const validTabKeys = BOOKING_TABS.map((t) => t.key) as readonly TabKey[];
  const urlTab = searchParams.get('tab');
  const initialTab: TabKey =
    urlTab && (validTabKeys as readonly string[]).includes(urlTab) ? (urlTab as TabKey) : 'all';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Sync tab when URL changes (e.g. via Navigate redirect)
  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && (validTabKeys as readonly string[]).includes(t) && t !== activeTab) {
      setActiveTab(t as TabKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination
  const PAGE_SIZE = DEFAULT_PAGE_SIZE;
  const [currentPage, setCurrentPage] = useState(1);
  // Server-reported total for the *unfiltered* dataset (drives paging on the
  // "all" tab). For filtered tabs we page the client-side slice instead.
  const [serverTotal, setServerTotal] = useState(0);
  // Accurate per-tab totals from the stats endpoint (computed over ALL bookings
  // server-side, so badges are NOT capped by the fetch limit).
  const [tabTotals, setTabTotals] = useState<BookingTabCounts | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Reset to page 1 whenever the tab or the (debounced) search changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  /*
   * PAGINATION STRATEGY (documented per task requirement)
   * -----------------------------------------------------
   * Tab badge counts always come from bookingsService.getBookingTabCounts()
   * (Phase A8 /bookings/stats), which counts every non-archived booking on the
   * server — so badges reflect TRUE totals, never the fetch cap.
   *
   * The "all" tab uses TRUE server-side pagination: we fetch exactly one page
   * (limit=PAGE_SIZE, offset=(page-1)*PAGE_SIZE) and page against serverTotal.
   *
   * The other tabs are pseudo-statuses (transit/port/delivered<30d/archive) that
   * the backend list endpoint cannot express with a single status filter (they
   * also depend on arrivalDateConstanta and container.currentStatus). To keep the
   * existing tab semantics 100% intact and avoid risky backend changes, those
   * tabs still fetch a bulk slice (BULK_FETCH_LIMIT) and are filtered + paged
   * CLIENT-side. RESIDUAL LIMITATION: a single non-"all" tab with more than
   * BULK_FETCH_LIMIT (100) matching bookings would only page through the first
   * 100 rows — but its badge count stays accurate via the stats endpoint.
   */
  const loadBookings = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const isAllTab = activeTab === 'all';
      const filters: BookingFilters = isAllTab
        ? { limit: PAGE_SIZE, offset: (currentPage - 1) * PAGE_SIZE }
        : { limit: BULK_FETCH_LIMIT, offset: 0 };
      if (searchTerm) filters.search = searchTerm;

      const [res, counts] = await Promise.all([
        bookingsService.getBookings(filters),
        bookingsService.getBookingTabCounts().catch(() => null),
      ]);

      setBookings(res.bookings);
      setServerTotal(res.total ?? res.bookings.length);
      if (counts) setTabTotals(counts);
    } catch (err) {
      const msg = getErrorMessage(err, 'Eroare la încărcarea rezervărilor');
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPage, searchTerm, addToast]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // For the "all" tab the server already returned exactly one page, so don't
  // re-slice. For filtered tabs, apply the tab filter then page client-side.
  const tabFiltered = useMemo(() => filterByTab(bookings, activeTab), [bookings, activeTab]);
  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings;
    const start = (currentPage - 1) * PAGE_SIZE;
    return tabFiltered.slice(start, start + PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, bookings, tabFiltered, currentPage]);

  // Total items in the active view (accurate: from stats when available).
  const activeTotal =
    activeTab === 'all'
      ? (tabTotals?.all ?? serverTotal)
      : (tabTotals?.[activeTab] ?? tabFiltered.length);
  const totalPages = Math.max(1, Math.ceil(activeTotal / PAGE_SIZE));

  // Prefer accurate server-side tab totals; fall back to in-memory counts only
  // if the stats endpoint is unavailable (legacy backend).
  const tabCounts = useMemo(() => tabTotals ?? countTabs(bookings), [tabTotals, bookings]);

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
        // NOTE: this cancels the booking (moves it to Arhivă) — it does NOT
        // hard-delete. Copy reflects that so the user isn't misled.
        const confirmed = await confirmDialog({
          title: t('bookings.cancelConfirmTitle', 'Anulați rezervările?'),
          message: `Sigur doriți să anulați ${selectedRows.length} ${selectedRows.length === 1 ? 'rezervare' : 'rezervări'}? Vor fi mutate în Arhivă.`,
          variant: 'danger',
          confirmText: t('common.cancel', 'Anulează'),
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
          addToast(`${ok} rezerv${ok === 1 ? 'are anulată' : 'ări anulate'} cu succes!`, 'success');
          await loadBookings();
        }
        if (fail)
          addToast(`${fail} rezerv${fail === 1 ? 'are' : 'ări'} nu au putut fi anulate`, 'error');
      } else {
        addToast(`Acțiunea '${action}' nu este implementată încă.`, 'info');
      }
      setSelectedRows([]);
    },
    [confirmDialog, selectedRows, bookings, addToast, t, loadBookings]
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
          // Reflect tab in URL so deep-links and back/forward work
          const next = new URLSearchParams(searchParams);
          if (tab === 'all') next.delete('tab');
          else next.set('tab', tab);
          setSearchParams(next, { replace: true });
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

      {/* Footer count + pagination */}
      {!isLoading && filteredBookings.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
          <div className="text-sm text-neutral-500 dark:text-neutral-400">
            {activeTotal}{' '}
            {activeTotal === 1 ? t('bookings.countSingular') : t('bookings.countPlural')}
            {activeTab !== 'all' &&
              ` ${t('common.of')} ${tabCounts.all} ${t('common.total').toLowerCase()}`}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('common.page', 'Pagina')} {currentPage} {t('common.of')} {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {t('common.previous', 'Anterior')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  {t('common.next', 'Următor')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingsList;

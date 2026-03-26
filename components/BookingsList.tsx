import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { Button } from './ui/Button';
import {
  PlusIcon,
  SearchIcon,
  DownloadIcon,
  RefreshCwIcon,
  FileTextIcon,
  TrashIcon,
  XIcon,
} from './icons';
import { useToast } from './ui/Toast';
import bookingsService, { BookingResponse } from '../services/bookings';
import invoicesService from '../services/invoices';
import { cn } from '../lib/utils';

const statusTextMap: { [key: string]: string } = {
  DRAFT: 'Ciorna',
  PENDING: 'In Asteptare',
  SUBMITTED: 'Trimisa',
  CONFIRMED: 'Confirmata',
  IN_TRANSIT: 'In Tranzit',
  DELIVERED: 'Livrata',
  CANCELLED: 'Anulata',
};

// Status colors for new design
const statusColors: { [key: string]: string } = {
  DRAFT: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
  PENDING: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
  SUBMITTED: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  CONFIRMED: 'bg-info-100 text-info-700 dark:bg-info-500/20 dark:text-info-400',
  IN_TRANSIT: 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400',
  DELIVERED: 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-500',
  CANCELLED: 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-400',
};

// Tab definitions for the consolidated view
const BOOKING_TABS = [
  { key: 'all', label: 'Toate' },
  { key: 'loading', label: 'La Incarcare' },
  { key: 'transit', label: 'In Drum' },
  { key: 'port', label: 'Port' },
  { key: 'delivered', label: 'Livrate' },
] as const;

type TabKey = (typeof BOOKING_TABS)[number]['key'];

// Map tab keys to booking statuses
const TAB_STATUS_MAP: Record<TabKey, string[]> = {
  all: [],
  loading: ['DRAFT', 'PENDING', 'SUBMITTED', 'CONFIRMED'],
  transit: ['IN_TRANSIT'],
  port: [], // Special: IN_TRANSIT with portDestination matching (arrived at port)
  delivered: ['DELIVERED'],
};

// Helper: get BL number from booking (from containers or direct field)
function getBlNumber(b: BookingResponse): string {
  if (b.blNumber) return b.blNumber;
  if (b.containers && b.containers.length > 0 && b.containers[0].blNumber) {
    return b.containers[0].blNumber;
  }
  return '';
}

// Helper: get container number from booking
function getContainerNumber(b: BookingResponse): string {
  if (b.containerNumber) return b.containerNumber;
  if (b.containers && b.containers.length > 0 && b.containers[0].containerNumber) {
    return b.containers[0].containerNumber;
  }
  return '';
}

// Helper: check if documents are uploaded
function hasDocuments(b: BookingResponse): boolean {
  return !!(b.documents && b.documents.length > 0);
}

// Helper: check telex release
function hasTelexRelease(b: BookingResponse): boolean {
  if (b.telexRelease) return true;
  if (b.containers && b.containers.length > 0 && b.containers[0].telexRelease) {
    return true;
  }
  return false;
}

const BookingsList = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Load all bookings from API (we filter client-side by tab)
  useEffect(() => {
    const loadBookings = async () => {
      setIsLoading(true);
      setError('');

      try {
        const filters: any = {
          limit: 100,
          offset: 0,
        };

        if (searchTerm) {
          filters.search = searchTerm;
        }

        const response = await bookingsService.getBookings(filters);
        setBookings(response.bookings);
      } catch (err: any) {
        setError(err.message);
        addToast(err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, [searchTerm]);

  // Filter bookings by active tab
  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return bookings;

    if (activeTab === 'port') {
      // Port tab: IN_TRANSIT bookings where status indicates arrival at port
      // or CONFIRMED with ETA in the past (likely at port)
      return bookings.filter((b) => {
        // Check container-level status if available
        if (b.containers && b.containers.length > 0) {
          const containerStatus = b.containers[0].currentStatus || b.containers[0].status;
          if (['ARRIVED', 'DISCHARGED'].includes(containerStatus)) return true;
        }
        // Fallback: IN_TRANSIT with destination port Constanta and past ETA
        if (b.status === 'IN_TRANSIT' && b.eta) {
          const eta = new Date(b.eta);
          const now = new Date();
          if (eta <= now) return true;
        }
        return false;
      });
    }

    const allowedStatuses = TAB_STATUS_MAP[activeTab];
    return bookings.filter((b) => allowedStatuses.includes(b.status));
  }, [bookings, activeTab]);

  // Count per tab
  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      all: 0,
      loading: 0,
      transit: 0,
      port: 0,
      delivered: 0,
    };
    counts.all = bookings.length;

    for (const b of bookings) {
      if (TAB_STATUS_MAP.loading.includes(b.status)) counts.loading++;
      if (TAB_STATUS_MAP.transit.includes(b.status)) counts.transit++;
      if (TAB_STATUS_MAP.delivered.includes(b.status)) counts.delivered++;

      // Port logic
      if (b.containers && b.containers.length > 0) {
        const containerStatus = b.containers[0].currentStatus || b.containers[0].status;
        if (['ARRIVED', 'DISCHARGED'].includes(containerStatus)) {
          counts.port++;
          continue;
        }
      }
      if (b.status === 'IN_TRANSIT' && b.eta) {
        const eta = new Date(b.eta);
        if (eta <= new Date()) counts.port++;
      }
    }

    return counts;
  }, [bookings]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(filteredBookings.map((b) => b.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, id]);
    } else {
      setSelectedRows((prev) => prev.filter((rowId) => rowId !== id));
    }
  };

  const refreshBookings = async () => {
    const filters: any = { limit: 100, offset: 0 };
    if (searchTerm) filters.search = searchTerm;
    const response = await bookingsService.getBookings(filters);
    setBookings(response.bookings);
  };

  const bulkAction = async (action: string) => {
    if (action === 'generateInvoices') {
      const selectedBookings = bookings.filter((b) => selectedRows.includes(b.id));
      let successCount = 0;
      let errorCount = 0;

      for (const booking of selectedBookings) {
        try {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 30);

          await invoicesService.createInvoice({
            bookingId: booking.id,
            clientId: booking.clientId,
            dueDate: dueDate.toISOString(),
          });
          successCount++;
        } catch (err: any) {
          console.error(`Failed to create invoice for ${booking.id}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        addToast(`${successCount} facturi generate cu succes!`, 'success');
      }
      if (errorCount > 0) {
        addToast(`${errorCount} facturi nu au putut fi generate (poate exista deja)`, 'error');
      }
    } else if (action === 'delete') {
      const confirmDelete = window.confirm(
        `Sigur doriti sa stergeti ${selectedRows.length} ${selectedRows.length === 1 ? 'rezervare' : 'rezervari'}?`
      );

      if (!confirmDelete) {
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const bookingId of selectedRows) {
        try {
          await bookingsService.cancelBooking(bookingId);
          successCount++;
        } catch (err: any) {
          console.error(`Failed to delete booking ${bookingId}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        addToast(
          `${successCount} ${successCount === 1 ? 'rezervare stearsa' : 'rezervari sterse'} cu succes!`,
          'success'
        );
        await refreshBookings();
      }
      if (errorCount > 0) {
        addToast(
          `${errorCount} ${errorCount === 1 ? 'rezervare nu a putut fi stearsa' : 'rezervari nu au putut fi sterse'}`,
          'error'
        );
      }
    } else {
      addToast(`Actiunea '${action}' nu este implementata inca.`, 'info');
    }
    setSelectedRows([]);
  };

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-24 md:top-[80px] md:bottom-auto left-1/2 -translate-x-1/2 w-[95%] sm:w-auto z-50 animate-slide-up">
          <div className="bg-primary-800 text-white p-4 rounded-xl shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="font-medium text-sm whitespace-nowrap">
                {selectedRows.length}{' '}
                {selectedRows.length === 1 ? 'rezervare selectata' : 'rezervari selectate'}
              </span>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <Button variant="secondary" size="sm" onClick={() => bulkAction('export')}>
                  <DownloadIcon className="mr-2 h-4 w-4" /> Exporta
                </Button>
                <Button variant="secondary" size="sm" onClick={() => bulkAction('changeStatus')}>
                  <RefreshCwIcon className="mr-2 h-4 w-4" /> Schimba Starea
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => bulkAction('generateInvoices')}
                >
                  <FileTextIcon className="mr-2 h-4 w-4" /> Genereaza Facturi
                </Button>
                <Button variant="danger" size="sm" onClick={() => bulkAction('delete')}>
                  <TrashIcon className="mr-2 h-4 w-4" /> Sterge
                </Button>
                <button
                  onClick={() => setSelectedRows([])}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XIcon className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading">
            Rezervari
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Gestioneaza toate rezervarile de transport
          </p>
        </div>
        <Button
          variant="accent"
          onClick={() => navigate('/dashboard/bookings/new')}
          className="hidden md:inline-flex"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Rezervare Noua
        </Button>
      </div>

      {/* Status Tabs + Search */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-5">
        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 -mx-5 px-5">
          {BOOKING_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedRows([]);
              }}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2',
                activeTab === tab.key
                  ? 'bg-primary-800 text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold',
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300'
                )}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search Row */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Cauta dupa BL, container, client..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="!h-[46px] !w-[46px]"
              onClick={refreshBookings}
            >
              <RefreshCwIcon className="h-5 w-5" />
            </Button>
            <Button variant="secondary" size="icon" className="!h-[46px] !w-[46px]">
              <DownloadIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-error-50 dark:bg-error-500/20 border border-error-200 dark:border-error-500/30 rounded-xl">
          <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-800 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-neutral-500 dark:text-neutral-400">Se incarca rezervarile...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
            <FileTextIcon className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-2">
            Nu exista rezervari
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md mb-4">
            {activeTab !== 'all'
              ? `Nu exista rezervari in categoria "${BOOKING_TABS.find((t) => t.key === activeTab)?.label}"`
              : 'Incepeti prin a crea prima rezervare'}
          </p>
          {activeTab === 'all' && (
            <Button variant="accent" onClick={() => navigate('/dashboard/bookings/new')}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Creati Prima Rezervare
            </Button>
          )}
        </div>
      ) : (
        /* Bookings Table */
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-700/50 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="text-left p-4 w-12">
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      checked={
                        selectedRows.length > 0 && selectedRows.length === filteredBookings.length
                      }
                      className="w-4 h-4 rounded border-neutral-300 text-accent-500 focus:ring-accent-500"
                    />
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Data
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    BL Nr
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Port Dest.
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Linie
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Container Nr
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Greutate
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Tip
                  </th>
                  {user.role !== UserRole.CLIENT && (
                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                      Beneficiar
                    </th>
                  )}
                  <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Pret
                  </th>
                  <th className="text-center p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    TLX
                  </th>
                  <th className="text-center p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    DOC
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {filteredBookings.map((b, index) => {
                  const blNumber = getBlNumber(b);
                  const containerNumber = getContainerNumber(b);
                  const docUploaded = hasDocuments(b);
                  const telexDone = hasTelexRelease(b);

                  return (
                    <tr
                      key={b.id}
                      onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
                      className={cn(
                        'cursor-pointer transition-colors',
                        'hover:bg-neutral-50 dark:hover:bg-neutral-700/30',
                        selectedRows.includes(b.id) && 'bg-accent-50/50 dark:bg-accent-500/10'
                      )}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(b.id)}
                          onChange={(e) => handleSelectRow(b.id, e.target.checked)}
                          className="w-4 h-4 rounded border-neutral-300 text-accent-500 focus:ring-accent-500"
                        />
                      </td>
                      {/* Data */}
                      <td className="p-4">
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">
                          {new Date(b.createdAt).toLocaleDateString('ro-RO', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                          })}
                        </span>
                      </td>
                      {/* BL Nr - primary identifier */}
                      <td className="p-4">
                        <span className="font-mono font-semibold text-primary-800 dark:text-white text-sm">
                          {blNumber || (
                            <span className="text-neutral-400 font-normal italic">fara BL</span>
                          )}
                        </span>
                      </td>
                      {/* Port Dest. */}
                      <td className="p-4">
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">
                          {b.portDestination || 'Constanta'}
                        </span>
                      </td>
                      {/* Linie */}
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
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">
                          {b.cargoWeight ? `${b.cargoWeight} kg` : '—'}
                        </span>
                      </td>
                      {/* Tip container */}
                      <td className="p-4">
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">
                          {b.containerType || '—'}
                        </span>
                      </td>
                      {/* Beneficiar (client) */}
                      {user.role !== UserRole.CLIENT && (
                        <td className="p-4">
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">
                            {b.client?.companyName || 'N/A'}
                          </span>
                        </td>
                      )}
                      {/* Pret */}
                      <td className="p-4 text-right">
                        <span className="font-semibold text-accent-500">
                          ${b.totalPrice.toFixed(0)}
                        </span>
                      </td>
                      {/* TLX Badge */}
                      <td className="p-4 text-center">
                        {telexDone ? (
                          <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400 text-xs font-medium rounded">
                            TLX
                          </span>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600 text-xs">—</span>
                        )}
                      </td>
                      {/* DOC Badge */}
                      <td className="p-4 text-center">
                        {docUploaded ? (
                          <span className="inline-flex px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400 text-xs font-medium rounded">
                            DOC
                          </span>
                        ) : (
                          <span className="text-neutral-300 dark:text-neutral-600 text-xs">—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td className="p-4">
                        <span
                          className={cn(
                            'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
                            statusColors[b.status] || statusColors['DRAFT']
                          )}
                        >
                          {statusTextMap[b.status] || b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/30 flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {filteredBookings.length} {filteredBookings.length === 1 ? 'rezervare' : 'rezervari'}
              {activeTab !== 'all' && ` din ${bookings.length} total`}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled>
                Anterior
              </Button>
              <Button variant="ghost" size="sm" disabled>
                Urmator
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsList;

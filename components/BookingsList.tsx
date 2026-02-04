import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Booking, BookingStatus, UserRole } from '../types';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { PlusIcon, SearchIcon, DownloadIcon, RefreshCwIcon, FileTextIcon, TrashIcon, XIcon } from './icons';
import { useToast } from './ui/Toast';
import bookingsService, { BookingResponse } from '../services/bookings';
import invoicesService from '../services/invoices';
import { cn } from '../lib/utils';

const statusVariantMap: { [key: string]: 'blue' | 'yellow' | 'green' | 'red' | 'purple' | 'default' } = {
    'PENDING': 'yellow',
    'CONFIRMED': 'blue',
    'IN_TRANSIT': 'yellow',
    'DELIVERED': 'green',
    'CANCELLED': 'red',
    'SUBMITTED': 'purple',
    'DRAFT': 'default',
};

const statusTextMap: { [key: string]: string } = {
    'DRAFT': 'Ciornă',
    'PENDING': 'În Așteptare',
    'SUBMITTED': 'Trimisă',
    'CONFIRMED': 'Confirmată',
    'IN_TRANSIT': 'În Tranzit',
    'DELIVERED': 'Livrată',
    'CANCELLED': 'Anulată',
};

// Status colors for new design
const statusColors: { [key: string]: string } = {
    'DRAFT': 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
    'PENDING': 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    'SUBMITTED': 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    'CONFIRMED': 'bg-info-100 text-info-700 dark:bg-info-500/20 dark:text-info-400',
    'IN_TRANSIT': 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-400',
    'DELIVERED': 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-500',
    'CANCELLED': 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-400',
};

const BookingsList = ({ user }: { user: User; }) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Load bookings from API
  useEffect(() => {
    const loadBookings = async () => {
      setIsLoading(true);
      setError('');

      try {
        const filters: any = {
          limit: 100,
          offset: 0,
        };

        // Add filters
        if (filterStatus !== 'ALL') {
          filters.status = filterStatus;
        }

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
  }, [filterStatus, searchTerm]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(bookings.map(b => b.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRows(prev => [...prev, id]);
    } else {
      setSelectedRows(prev => prev.filter(rowId => rowId !== id));
    }
  };

  const bulkAction = async (action: string) => {
    if (action === 'generateInvoices') {
      // Generate invoices for selected bookings
      const selectedBookings = bookings.filter(b => selectedRows.includes(b.id));
      let successCount = 0;
      let errorCount = 0;

      for (const booking of selectedBookings) {
        try {
          // Set due date to 30 days from now
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
        addToast(`${errorCount} facturi nu au putut fi generate (poate există deja)`, 'error');
      }
    } else {
      addToast(`Acțiunea '${action}' nu este implementată încă.`, 'info');
    }
    setSelectedRows([]);
  };

  // Add debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Status filter tabs
  const statusTabs = [
    { value: 'ALL', label: 'Toate', count: bookings.length },
    { value: 'PENDING', label: 'În Așteptare' },
    { value: 'CONFIRMED', label: 'Confirmate' },
    { value: 'IN_TRANSIT', label: 'În Tranzit' },
    { value: 'DELIVERED', label: 'Livrate' },
    { value: 'CANCELLED', label: 'Anulate' },
  ];

  return (
    <div className="space-y-6">
      {/* Bulk Actions Bar */}
      {selectedRows.length > 0 && (
        <div className="fixed bottom-24 md:top-[80px] md:bottom-auto left-1/2 -translate-x-1/2 w-[95%] sm:w-auto z-50 animate-slide-up">
           <div className="bg-primary-800 text-white p-4 rounded-xl shadow-xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="font-medium text-sm whitespace-nowrap">
                      {selectedRows.length} {selectedRows.length === 1 ? 'rezervare selectată' : 'rezervări selectate'}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                        <Button variant="secondary" size="sm" onClick={() => bulkAction('export')}>
                          <DownloadIcon className="mr-2 h-4 w-4" /> Exportă
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => bulkAction('changeStatus')}>
                          <RefreshCwIcon className="mr-2 h-4 w-4" /> Schimbă Starea
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => bulkAction('generateInvoices')}>
                          <FileTextIcon className="mr-2 h-4 w-4" /> Generează Facturi
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => bulkAction('delete')}>
                          <TrashIcon className="mr-2 h-4 w-4" /> Șterge
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
            Rezervări
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Gestionează toate rezervările de transport
          </p>
        </div>
        <Button variant="accent" onClick={() => navigate('/dashboard/bookings/new')} className="hidden md:inline-flex">
            <PlusIcon className="mr-2 h-4 w-4" />
            Rezervare Nouă
        </Button>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-5">
        {/* Search and Filter Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Caută Nr. Rezervare sau Nr. Container..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full md:w-48 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7684' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2.5rem' }}
            >
              <option value="ALL">Toate Stările</option>
              <option value="DRAFT">Ciornă</option>
              <option value="SUBMITTED">Trimisă</option>
              <option value="CONFIRMED">Confirmată</option>
              <option value="IN_TRANSIT">În Tranzit</option>
              <option value="DELIVERED">Livrată</option>
              <option value="CANCELLED">Anulată</option>
            </select>
            <Button variant="secondary" size="icon" className="!h-[46px] !w-[46px]">
              <DownloadIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-5 px-5">
          {statusTabs.map(tab => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                filterStatus === tab.value
                  ? "bg-primary-800 text-white shadow-sm"
                  : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
              )}
            >
              {tab.label}
            </button>
          ))}
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
          <p className="text-neutral-500 dark:text-neutral-400">Se încarcă rezervările...</p>
        </div>
      ) : bookings.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
            <FileTextIcon className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-2">Nu există rezervări</h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md mb-4">
            {filterStatus !== 'ALL'
              ? `Nu există rezervări cu statusul "${statusTextMap[filterStatus]}"`
              : 'Începeți prin a crea prima rezervare'}
          </p>
          <Button variant="accent" onClick={() => navigate('/dashboard/bookings/new')}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Creați Prima Rezervare
          </Button>
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
                      checked={selectedRows.length > 0 && selectedRows.length === bookings.length}
                      className="w-4 h-4 rounded border-neutral-300 text-accent-500 focus:ring-accent-500"
                    />
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Nr. Rezervare</th>
                  {user.role !== UserRole.CLIENT && (
                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Client</th>
                  )}
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Linie Maritimă</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Container</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Rută</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">ETA</th>
                  <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Preț</th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {bookings.map((b, index) => (
                  <tr
                    key={b.id}
                    onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
                    className={cn(
                      "cursor-pointer transition-colors",
                      "hover:bg-neutral-50 dark:hover:bg-neutral-700/30",
                      selectedRows.includes(b.id) && "bg-accent-50/50 dark:bg-accent-500/10"
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
                    <td className="p-4">
                      <span className="font-mono font-semibold text-primary-800 dark:text-white">{b.id}</span>
                    </td>
                    {user.role !== UserRole.CLIENT && (
                      <td className="p-4">
                        <span className="text-sm text-neutral-600 dark:text-neutral-300">{b.client?.companyName || 'N/A'}</span>
                      </td>
                    )}
                    <td className="p-4">
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{b.shippingLine}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-neutral-600 dark:text-neutral-300">{b.containerType}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                        <span>{b.portOrigin}</span>
                        <span className="text-neutral-400">→</span>
                        <span>Constanța</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-neutral-600 dark:text-neutral-300">
                        {b.eta ? new Date(b.eta).toLocaleDateString('ro-RO') : 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-semibold text-accent-500">${b.totalPrice.toFixed(0)}</span>
                    </td>
                    <td className="p-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                        statusColors[b.status] || statusColors['DRAFT']
                      )}>
                        {statusTextMap[b.status] || b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/30 flex items-center justify-between">
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {bookings.length} {bookings.length === 1 ? 'rezervare' : 'rezervări'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" disabled>Anterior</Button>
              <Button variant="ghost" size="sm" disabled>Următor</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingsList;

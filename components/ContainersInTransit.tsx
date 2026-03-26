import React, { useState, useEffect } from 'react';
import { Badge } from './ui/Badge';
import { SearchIcon, RefreshCwIcon, ShipIcon, PackageIcon } from './icons';
import bookingsService, { BookingResponse } from '../services/bookings';
import { searchContainer, refreshTracking, Container } from '../services/tracking';
import ContainerMap from './ContainerMap';
import { cn } from '../lib/utils';

const statusVariantMap: { [key: string]: 'blue' | 'yellow' | 'green' | 'purple' | 'default' } = {
  CONFIRMED: 'blue',
  IN_TRANSIT: 'yellow',
  ARRIVED: 'green',
  SENT: 'purple',
};

const statusTextMap: { [key: string]: string } = {
  CONFIRMED: 'Confirmat',
  SENT: 'Expediat',
  IN_TRANSIT: 'În Tranzit',
  ARRIVED: 'Sosit',
};

interface TrackingEntry {
  data: Container | null;
  loadedAt: number;
}

const ContainersInTransit = () => {
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [trackingCache, setTrackingCache] = useState<Record<string, TrackingEntry>>({});
  const [trackingLoading, setTrackingLoading] = useState<Record<string, boolean>>({});
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const loadBookings = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [transitResult, confirmedResult, sentResult] = await Promise.all([
        bookingsService.getBookings({ status: 'IN_TRANSIT', limit: 500 }),
        bookingsService.getBookings({ status: 'CONFIRMED', limit: 500 }),
        bookingsService.getBookings({ status: 'SENT', limit: 500 }),
      ]);

      const all = [...transitResult.bookings, ...confirmedResult.bookings, ...sentResult.bookings];

      all.sort((a, b) => {
        const aEta = a.eta ? new Date(a.eta).getTime() : Infinity;
        const bEta = b.eta ? new Date(b.eta).getTime() : Infinity;
        return aEta - bEta;
      });

      setBookings(all);
    } catch (err: any) {
      setError(err.message || 'Eroare la încărcarea datelor');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const fetchTrackingData = async (bookingId: string, containerNumber: string) => {
    setTrackingLoading((prev) => ({ ...prev, [bookingId]: true }));
    try {
      const data = await searchContainer(containerNumber);
      setTrackingCache((prev) => ({ ...prev, [bookingId]: { data, loadedAt: Date.now() } }));
    } catch {
      setTrackingCache((prev) => ({ ...prev, [bookingId]: { data: null, loadedAt: Date.now() } }));
    } finally {
      setTrackingLoading((prev) => ({ ...prev, [bookingId]: false }));
    }
  };

  const handleRowClick = (bookingId: string, containerNumber?: string) => {
    if (expandedId === bookingId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(bookingId);
    if (containerNumber && trackingCache[bookingId] === undefined && !trackingLoading[bookingId]) {
      fetchTrackingData(bookingId, containerNumber);
    }
  };

  const handleRefreshTracking = async (
    e: React.MouseEvent,
    bookingId: string,
    containerId: string,
    containerNumber: string
  ) => {
    e.stopPropagation();
    setRefreshingId(bookingId);
    try {
      await refreshTracking(containerId);
      setTrackingCache((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      await fetchTrackingData(bookingId, containerNumber);
    } catch (err: any) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshingId(null);
    }
  };

  const filtered = bookings.filter((b) => {
    if (filterStatus !== 'ALL' && b.status !== filterStatus) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    const containerNum = b.containers?.[0]?.containerNumber?.toLowerCase() || '';
    const blNum = b.containers?.[0]?.blNumber?.toLowerCase() || '';
    const clientName = b.client?.companyName?.toLowerCase() || '';
    return (
      b.id.toLowerCase().includes(s) ||
      containerNum.includes(s) ||
      blNum.includes(s) ||
      clientName.includes(s) ||
      b.shippingLine?.toLowerCase().includes(s)
    );
  });

  const totalInTransit = bookings.filter((b) => b.status === 'IN_TRANSIT').length;
  const totalConfirmed = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const totalSent = bookings.filter((b) => b.status === 'SENT').length;

  const statusTabs = [
    { value: 'ALL', label: `Toate (${bookings.length})` },
    { value: 'IN_TRANSIT', label: `În Tranzit (${totalInTransit})` },
    { value: 'CONFIRMED', label: `Confirmate (${totalConfirmed})` },
    { value: 'SENT', label: `Expediate (${totalSent})` },
  ];

  const getDaysUntilEta = (eta: string | null | undefined) => {
    if (!eta) return null;
    return Math.ceil((new Date(eta).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const formatSyncTime = (lastSyncAt?: string) => {
    if (!lastSyncAt) return null;
    const diff = Date.now() - new Date(lastSyncAt).getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${minutes}m în urmă`;
    return `${minutes}m în urmă`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary-800 dark:text-white font-heading">
            Marfă în Drum
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Toate containerele active · click pe rând pentru hartă
          </p>
        </div>
        <button
          onClick={loadBookings}
          className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          title="Reîncarcă"
        >
          <RefreshCwIcon className={cn('h-5 w-5 text-neutral-500', isLoading && 'animate-spin')} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-800/10 dark:bg-primary-400/10 flex items-center justify-center">
              <PackageIcon className="h-5 w-5 text-primary-800 dark:text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Containere</p>
              <p className="text-xl font-bold text-primary-800 dark:text-white">
                {bookings.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-500/10 flex items-center justify-center">
              <ShipIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">În Tranzit</p>
              <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {totalInTransit}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
              <PackageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Confirmate</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{totalConfirmed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-500/10 flex items-center justify-center">
              <ShipIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Expediate</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{totalSent}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-5 space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Căutare: container, BL, client, linie..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                filterStatus === tab.value
                  ? 'bg-primary-800 text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-error-50 dark:bg-error-500/20 border border-error-200 dark:border-error-500/30 rounded-xl">
          <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading ? (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary-800 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-neutral-500 dark:text-neutral-400">Se încarcă containerele...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
            <ShipIcon className="h-8 w-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-2">
            Nu există containere în drum
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md">
            {search
              ? 'Nicio potrivire pentru căutarea dvs.'
              : 'Momentan nu există containere confirmate sau în tranzit.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-700/50 border-b border-neutral-200 dark:border-neutral-700">
                  <th className="w-10 p-4"></th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Nr.
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Container
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Beneficiar
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Tip
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Linie Maritimă
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    BL
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Greutate
                  </th>
                  <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Preț
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Rută
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    ETA
                  </th>
                  <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {filtered.map((b, index) => {
                  const container = b.containers?.[0];
                  const daysUntil = getDaysUntilEta(b.eta);
                  const isExpanded = expandedId === b.id;
                  const tracking = trackingCache[b.id];
                  const isTrackingLoading = trackingLoading[b.id];

                  // Build currentLocation for the map
                  const trackingLocation =
                    tracking?.data?._location?.latitude || tracking?.data?.currentLat
                      ? {
                          name:
                            tracking?.data?._location?.name ||
                            (tracking?.data?.currentLocation ?? undefined),
                          city: tracking?.data?._location?.city,
                          country: tracking?.data?._location?.country,
                          latitude:
                            tracking?.data?._location?.latitude || tracking?.data?.currentLat,
                          longitude:
                            tracking?.data?._location?.longitude || tracking?.data?.currentLng,
                        }
                      : undefined;

                  return (
                    <React.Fragment key={b.id}>
                      {/* Main row */}
                      <tr
                        onClick={() => handleRowClick(b.id, container?.containerNumber)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isExpanded
                            ? 'bg-blue-50 dark:bg-blue-900/10'
                            : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/30'
                        )}
                      >
                        {/* Chevron */}
                        <td className="p-4">
                          <svg
                            className={cn(
                              'h-4 w-4 text-neutral-400 transition-transform duration-200',
                              isExpanded && 'rotate-180'
                            )}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </td>
                        <td className="p-4 text-sm text-neutral-400">{index + 1}</td>
                        <td className="p-4">
                          <div>
                            <span className="font-mono font-semibold text-primary-800 dark:text-white text-sm">
                              {container?.containerNumber || b.id}
                            </span>
                            {container?.containerNumber && (
                              <p className="text-xs text-neutral-400 mt-0.5">{b.id}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-neutral-700 dark:text-neutral-200">
                            {b.client?.companyName || 'N/A'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">
                            {container?.type || b.containerType}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                            {b.shippingLine}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-sm text-neutral-600 dark:text-neutral-300">
                            {container?.blNumber || '—'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">
                            {container?.weightGross
                              ? `${(container.weightGross / 1000).toFixed(1)}t`
                              : b.cargoWeight || '—'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-sm font-semibold text-primary-800 dark:text-white">
                            ${b.totalPrice?.toLocaleString('ro-RO') || '0'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                            <span>{b.portOrigin}</span>
                            <span className="text-neutral-400">→</span>
                            <span>{b.portDestination || 'Constanța'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          {b.eta ? (
                            <div>
                              <span className="text-sm text-neutral-600 dark:text-neutral-300">
                                {new Date(b.eta).toLocaleDateString('ro-RO')}
                              </span>
                              {daysUntil !== null && (
                                <p
                                  className={cn(
                                    'text-xs mt-0.5',
                                    daysUntil <= 0
                                      ? 'text-green-600 dark:text-green-400 font-medium'
                                      : daysUntil <= 7
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : 'text-neutral-400'
                                  )}
                                >
                                  {daysUntil <= 0 ? 'Sosit!' : `${daysUntil} zile`}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-neutral-400">—</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge variant={statusVariantMap[b.status] || 'default'}>
                            {statusTextMap[b.status] || b.status}
                          </Badge>
                        </td>
                      </tr>

                      {/* Expanded map row */}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={12}
                            className="p-0 border-b border-neutral-200 dark:border-neutral-700"
                          >
                            <div className="p-4 bg-neutral-50 dark:bg-neutral-900/50">
                              {isTrackingLoading ? (
                                <div className="flex items-center justify-center py-10">
                                  <div className="w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full animate-spin mr-3"></div>
                                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                                    Se încarcă datele de tracking...
                                  </span>
                                </div>
                              ) : !container?.containerNumber ? (
                                <div className="flex items-center justify-center py-8 text-neutral-400">
                                  <span className="text-sm">
                                    Numărul containerului nu este disponibil
                                  </span>
                                </div>
                              ) : tracking?.data ? (
                                <div className="space-y-3">
                                  {/* Info bar */}
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-4 text-sm flex-wrap">
                                      {tracking.data._vessel?.name && (
                                        <span className="text-neutral-600 dark:text-neutral-300">
                                          🚢{' '}
                                          <span className="font-medium">
                                            {tracking.data._vessel.name}
                                          </span>
                                          {tracking.data._vessel.imo && (
                                            <span className="text-neutral-400 text-xs ml-1">
                                              IMO: {tracking.data._vessel.imo}
                                            </span>
                                          )}
                                        </span>
                                      )}
                                      {tracking.data._location?.name && (
                                        <span className="text-neutral-600 dark:text-neutral-300">
                                          📍 {tracking.data._location.name}
                                          {tracking.data._location.country &&
                                            `, ${tracking.data._location.country}`}
                                        </span>
                                      )}
                                      {tracking.data.lastSyncAt && (
                                        <span className="text-neutral-400 text-xs">
                                          Actualizat: {formatSyncTime(tracking.data.lastSyncAt)}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={(e) =>
                                        handleRefreshTracking(
                                          e,
                                          b.id,
                                          tracking.data!.id,
                                          container.containerNumber
                                        )
                                      }
                                      disabled={refreshingId === b.id}
                                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary-800 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                    >
                                      <RefreshCwIcon
                                        className={cn(
                                          'h-3.5 w-3.5',
                                          refreshingId === b.id && 'animate-spin'
                                        )}
                                      />
                                      Reîmprospătare tracking
                                    </button>
                                  </div>
                                  {/* Map */}
                                  <ContainerMap
                                    containerNumber={container.containerNumber}
                                    currentLocation={trackingLocation}
                                    vessel={tracking.data._vessel}
                                    route={tracking.data._route}
                                    originPort={b.portOrigin || undefined}
                                    destinationPort={b.portDestination || undefined}
                                    status={tracking.data.currentStatus}
                                    eta={tracking.data.eta || b.eta || undefined}
                                    height="320px"
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-8 gap-3">
                                  <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
                                    <ShipIcon className="h-6 w-6 text-neutral-400" />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                      Date de tracking indisponibile pentru{' '}
                                      <span className="font-mono font-medium">
                                        {container.containerNumber}
                                      </span>
                                    </p>
                                    <p className="text-xs text-neutral-400 mt-1">
                                      Containerul va fi sincronizat automat cu SeaRates în curând.
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Footer */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/30 px-4 py-3 flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
            <span>
              {filtered.length} {filtered.length === 1 ? 'container' : 'containere'}
            </span>
            <span>
              Valoare totală:{' '}
              <strong className="text-primary-800 dark:text-white">
                ${filtered.reduce((s, b) => s + (b.totalPrice || 0), 0).toLocaleString('ro-RO')}
              </strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ContainersInTransit);

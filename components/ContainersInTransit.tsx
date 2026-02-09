import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from './ui/Badge';
import { SearchIcon, RefreshCwIcon, ShipIcon, PackageIcon } from './icons';
import bookingsService, { BookingResponse } from '../services/bookings';
import { cn } from '../lib/utils';

const statusVariantMap: { [key: string]: 'blue' | 'yellow' | 'green' | 'purple' | 'default' } = {
    'CONFIRMED': 'blue',
    'IN_TRANSIT': 'yellow',
    'ARRIVED': 'green',
    'SENT': 'purple',
};

const statusTextMap: { [key: string]: string } = {
    'CONFIRMED': 'Confirmat',
    'SENT': 'Expediat',
    'IN_TRANSIT': 'În Tranzit',
    'ARRIVED': 'Sosit',
};

const ContainersInTransit = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState<BookingResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');

    const loadBookings = async () => {
        setIsLoading(true);
        setError('');
        try {
            // Fetch both IN_TRANSIT and CONFIRMED bookings
            const [transitResult, confirmedResult, sentResult] = await Promise.all([
                bookingsService.getBookings({ status: 'IN_TRANSIT', limit: 500 }),
                bookingsService.getBookings({ status: 'CONFIRMED', limit: 500 }),
                bookingsService.getBookings({ status: 'SENT', limit: 500 }),
            ]);

            const all = [
                ...transitResult.bookings,
                ...confirmedResult.bookings,
                ...sentResult.bookings,
            ];

            // Sort by ETA ascending (nearest first)
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

    // Filter by search and status
    const filtered = bookings.filter(b => {
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

    // Stats
    const totalInTransit = bookings.filter(b => b.status === 'IN_TRANSIT').length;
    const totalConfirmed = bookings.filter(b => b.status === 'CONFIRMED').length;
    const totalSent = bookings.filter(b => b.status === 'SENT').length;
    const totalValue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    const statusTabs = [
        { value: 'ALL', label: `Toate (${bookings.length})` },
        { value: 'IN_TRANSIT', label: `În Tranzit (${totalInTransit})` },
        { value: 'CONFIRMED', label: `Confirmate (${totalConfirmed})` },
        { value: 'SENT', label: `Expediate (${totalSent})` },
    ];

    const getDaysUntilEta = (eta: string | null) => {
        if (!eta) return null;
        const diff = Math.ceil((new Date(eta).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return diff;
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
                        Toate containerele active - confirmate, expediate și în tranzit
                    </p>
                </div>
                <button
                    onClick={loadBookings}
                    className="p-2.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                    title="Reîncarcă"
                >
                    <RefreshCwIcon className={cn("h-5 w-5 text-neutral-500", isLoading && "animate-spin")} />
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
                            <p className="text-xl font-bold text-primary-800 dark:text-white">{bookings.length}</p>
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
                            <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{totalInTransit}</p>
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
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                            <span className="text-green-600 dark:text-green-400 font-bold text-sm">$</span>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">Valoare Totală</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">${totalValue.toLocaleString('ro-RO')}</p>
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
                /* Empty */
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-12 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center mb-4">
                        <ShipIcon className="h-8 w-8 text-neutral-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary-800 dark:text-white mb-2">Nu există containere în drum</h3>
                    <p className="text-neutral-500 dark:text-neutral-400 text-center max-w-md">
                        {search ? 'Nicio potrivire pentru căutarea dvs.' : 'Momentan nu există containere confirmate sau în tranzit.'}
                    </p>
                </div>
            ) : (
                /* Table */
                <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-neutral-50 dark:bg-neutral-700/50 border-b border-neutral-200 dark:border-neutral-700">
                                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Nr.</th>
                                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Container</th>
                                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Beneficiar</th>
                                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Tip</th>
                                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Linie Maritimă</th>
                                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">BL</th>
                                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Greutate</th>
                                    <th className="text-right p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Preț</th>
                                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Rută</th>
                                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">ETA</th>
                                    <th className="text-left p-4 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                {filtered.map((b, index) => {
                                    const container = b.containers?.[0];
                                    const daysUntil = getDaysUntilEta(b.eta);

                                    return (
                                        <tr
                                            key={b.id}
                                            onClick={() => navigate(`/dashboard/bookings/${b.id}`)}
                                            className="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700/30"
                                        >
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
                                                            <p className={cn(
                                                                "text-xs mt-0.5",
                                                                daysUntil <= 0 ? "text-green-600 dark:text-green-400 font-medium" :
                                                                daysUntil <= 7 ? "text-orange-500 dark:text-orange-400" :
                                                                "text-neutral-400"
                                                            )}>
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
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Footer */}
                    <div className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/30 px-4 py-3 flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-400">
                        <span>{filtered.length} {filtered.length === 1 ? 'container' : 'containere'}</span>
                        <span>Valoare totală: <strong className="text-primary-800 dark:text-white">${filtered.reduce((s, b) => s + (b.totalPrice || 0), 0).toLocaleString('ro-RO')}</strong></span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContainersInTransit;

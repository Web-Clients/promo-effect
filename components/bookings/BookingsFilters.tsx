/**
 * BookingsFilters — Phase A4/A5
 * Search input + tab navigation with count badges.
 * Tabs: TOATE | LA INCARCARE | IN DRUM | PORT | LIVRATE | ARHIVĂ
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { SearchIcon, RefreshCwIcon, DownloadIcon, XIcon } from '../icons';
import { Button } from '../ui/Button';

export const BOOKING_TABS = [
  { key: 'all', labelKey: 'bookings.tabAll' },
  { key: 'loading', labelKey: 'bookings.tabLoading' },
  { key: 'transit', labelKey: 'bookings.tabTransit' },
  { key: 'port', labelKey: 'bookings.tabPort' },
  { key: 'delivered', labelKey: 'bookings.tabDelivered' },
  { key: 'archive', labelKey: 'bookings.tabArchive' },
] as const;

export type TabKey = (typeof BOOKING_TABS)[number]['key'];

interface BookingsFiltersProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  searchInput: string;
  onSearchChange: (value: string) => void;
  tabCounts: Record<TabKey, number>;
  onRefresh: () => void;
}

export const BookingsFilters: React.FC<BookingsFiltersProps> = ({
  activeTab,
  onTabChange,
  searchInput,
  onSearchChange,
  tabCounts,
  onRefresh,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-200/50 dark:border-neutral-700/50 p-5">
      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 -mx-5 px-5">
        {BOOKING_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2',
              activeTab === tab.key
                ? 'bg-primary-800 text-white shadow-sm'
                : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'
            )}
          >
            {t(tab.labelKey)}
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
            placeholder={t('bookings.searchPlaceholder')}
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label={t('common.clearSearch')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="!h-[46px] !w-[46px]"
            onClick={onRefresh}
            title={t('common.refresh')}
          >
            <RefreshCwIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="!h-[46px] !w-[46px]"
            title={t('common.export')}
          >
            <DownloadIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

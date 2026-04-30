/**
 * BookingsBulkActions — Phase A4
 * Floating bulk-action bar shown when rows are selected.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { DownloadIcon, RefreshCwIcon, FileTextIcon, TrashIcon, XIcon } from '../icons';

interface BookingsBulkActionsProps {
  selectedCount: number;
  onAction: (action: string) => void;
  onClear: () => void;
}

export const BookingsBulkActions: React.FC<BookingsBulkActionsProps> = ({
  selectedCount,
  onAction,
  onClear,
}) => {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-24 md:top-[80px] md:bottom-auto left-1/2 -translate-x-1/2 w-[95%] sm:w-auto z-50 animate-slide-up">
      <div className="bg-primary-800 text-white p-4 rounded-xl shadow-xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-medium text-sm whitespace-nowrap">
            {selectedCount}{' '}
            {selectedCount === 1
              ? t('bookings.bulkSelected_one')
              : t('bookings.bulkSelected_other')}
          </span>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Button variant="secondary" size="sm" onClick={() => onAction('export')}>
              <DownloadIcon className="mr-2 h-4 w-4" />
              {t('bookings.exportAction')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAction('changeStatus')}>
              <RefreshCwIcon className="mr-2 h-4 w-4" />
              {t('bookings.changeStatus')}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAction('generateInvoices')}>
              <FileTextIcon className="mr-2 h-4 w-4" />
              {t('bookings.generateInvoices')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => onAction('delete')}>
              <TrashIcon className="mr-2 h-4 w-4" />
              {t('bookings.deleteAction')}
            </Button>
            <button
              onClick={onClear}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Clear selection"
            >
              <XIcon className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

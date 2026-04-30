import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookingStatus } from '../../../types';
import { Badge } from '../../ui/Badge';

interface BookingHeaderProps {
  bookingNumber?: string;
  blNumber?: string;
  status?: BookingStatus;
  isNew: boolean;
  isAdmin: boolean;
  onBack: () => void;
}

type BadgeVariant = 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'teal' | 'orange';

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  DRAFT: { label: 'Schiță', variant: 'default' },
  SUBMITTED: { label: 'Trimis', variant: 'blue' },
  CONFIRMED: { label: 'Confirmat', variant: 'green' },
  IN_TRANSIT: { label: 'În Tranzit', variant: 'yellow' },
  DELIVERED: { label: 'Livrat', variant: 'teal' },
  CANCELLED: { label: 'Anulat', variant: 'red' },
  PENDING: { label: 'În Așteptare', variant: 'orange' },
};

const BookingHeader: React.FC<BookingHeaderProps> = ({
  bookingNumber,
  blNumber,
  status,
  isNew,
  isAdmin,
  onBack,
}) => {
  const statusCfg = status ? (STATUS_CONFIG[status] ?? { label: status, variant: 'default' as BadgeVariant }) : null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={onBack}
        className="p-2 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 shrink-0"
        aria-label="Înapoi la rezervări"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100 truncate">
            {isNew
              ? 'Cerere de Rezervare Nouă'
              : `Rezervare ${bookingNumber || '—'}`}
          </h3>
          {blNumber && (
            <span className="text-sm font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
              BL: {blNumber}
            </span>
          )}
          {statusCfg && (
            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingHeader;

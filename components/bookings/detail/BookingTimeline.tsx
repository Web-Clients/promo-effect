import React from 'react';
import { Card } from '../../ui/Card';

export interface TimelineEvent {
  id: string | number;
  label: string;
  description?: string;
  location?: string;
  timestamp?: string;
  status: 'completed' | 'current' | 'pending';
}

interface BookingTimelineProps {
  events?: TimelineEvent[];
  bookingStatus?: string;
}

// Default timeline events derived from booking status
const STATUS_FLOW = [
  { key: 'DRAFT', label: 'Cerere creată', description: 'Cerere trimisă și înregistrată' },
  { key: 'SUBMITTED', label: 'Trimis', description: 'Cerere transmisă spre confirmare' },
  { key: 'CONFIRMED', label: 'Confirmat', description: 'Rezervarea a fost confirmată' },
  { key: 'IN_TRANSIT', label: 'În Tranzit', description: 'Containerul este pe drum' },
  { key: 'DELIVERED', label: 'Livrat', description: 'Marfa a ajuns la destinație' },
];

function deriveEventsFromStatus(status?: string): TimelineEvent[] {
  if (!status) return STATUS_FLOW.map((s, i) => ({ id: i, ...s, status: 'pending' as const }));

  const currentIndex = STATUS_FLOW.findIndex((s) => s.key === status);

  return STATUS_FLOW.map((s, i) => {
    let evtStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (i < currentIndex) evtStatus = 'completed';
    else if (i === currentIndex) evtStatus = 'current';
    return { id: i, ...s, status: evtStatus };
  });
}

function formatTimestamp(ts?: string): string {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

const BookingTimeline: React.FC<BookingTimelineProps> = ({ events, bookingStatus }) => {
  const items = events && events.length > 0 ? events : deriveEventsFromStatus(bookingStatus);

  return (
    <Card>
      <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-200 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-5">
        Istoric Status
      </h4>

      <ol className="relative border-l-2 border-neutral-200 dark:border-neutral-700 ml-3 space-y-0">
        {items.map((evt, idx) => {
          const isLast = idx === items.length - 1;
          const iconColor =
            evt.status === 'completed'
              ? 'bg-green-500 border-green-500'
              : evt.status === 'current'
                ? 'bg-blue-600 border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30'
                : 'bg-neutral-200 dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600';

          return (
            <li key={evt.id} className={`${isLast ? '' : 'pb-6'} pl-6 relative`}>
              {/* Dot */}
              <span
                className={`absolute -left-[11px] top-0.5 flex w-5 h-5 rounded-full border-2 items-center justify-center ${iconColor}`}
              >
                {evt.status === 'completed' && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {evt.status === 'current' && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </span>

              {/* Content */}
              <div>
                <p
                  className={`text-sm font-semibold ${
                    evt.status === 'pending'
                      ? 'text-neutral-400 dark:text-neutral-500'
                      : 'text-neutral-800 dark:text-neutral-100'
                  }`}
                >
                  {evt.label}
                </p>
                {evt.description && (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {evt.description}
                  </p>
                )}
                {evt.location && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    📍 {evt.location}
                  </p>
                )}
                {evt.timestamp && (
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                    {formatTimestamp(evt.timestamp)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
};

export default BookingTimeline;

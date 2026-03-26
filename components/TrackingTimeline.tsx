import React from 'react';
import { TrackingEvent } from '../types';
import { cn } from '../lib/utils';
import { CheckIcon, MapPinIcon } from './icons';

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('ro-RO', { month: 'short', day: 'numeric' });
const formatTime = (dateString: string) =>
  new Date(dateString).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

export const TrackingTimeline = ({ events }: { events: TrackingEvent[] }) => {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 -bottom-4 w-0.5 bg-gradient-to-b from-primary-200 via-primary-400 to-primary-200 dark:from-primary-800 dark:via-primary-600 dark:to-primary-800"></div>

      <div className="space-y-6">
        {events.map((event, _idx) => {
          const isCompleted = event.status === 'completed';
          const isCurrent = event.status === 'current';
          const isPending = event.status === 'pending';

          return (
            <div key={event.id} className="relative pl-12">
              <div
                className={cn(
                  'absolute left-0 top-0 h-8 w-8 rounded-full flex items-center justify-center',
                  'border-4 transition-all duration-300',
                  isCompleted && 'bg-green-500 border-green-200 dark:border-green-800',
                  isCurrent &&
                    'bg-primary-500 border-primary-200 dark:border-primary-800 animate-pulse',
                  isPending &&
                    'bg-neutral-200 border-neutral-100 dark:bg-neutral-700 dark:border-neutral-600'
                )}
              >
                {isCompleted && <CheckIcon className="h-4 w-4 text-white" />}
                {isCurrent && <div className="h-3 w-3 bg-white rounded-full"></div>}
                {isPending && (
                  <div className="h-3 w-3 bg-neutral-400 dark:bg-neutral-500 rounded-full"></div>
                )}
              </div>

              <div
                className={cn(
                  'p-4 rounded-xl border transition-all duration-300',
                  isCompleted &&
                    'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/50',
                  isCurrent &&
                    'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800/50 shadow-lg',
                  isPending &&
                    'bg-neutral-50 border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700 opacity-70'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {event.title}
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                      {event.description}
                    </p>
                    {event.location && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-2 flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3" />
                        {event.location}
                      </p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {formatDate(event.timestamp)}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {formatTime(event.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

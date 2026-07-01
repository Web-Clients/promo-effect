import React from 'react';
import { cn } from '../lib/utils';
import { TrendingUpIcon, TrendingDownIcon } from './icons';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down';
  icon: React.ComponentType<{ className?: string }>;
  sparklineData: { value: number }[];
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  trend,
  icon: Icon,
  sparklineData,
}) => {
  // Define gradient IDs based on trend for unique gradients per card
  const gradientId = `sparkline-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div
      className={cn(
        'bg-white dark:bg-neutral-800 rounded-xl p-5 shadow-card',
        'border border-neutral-200/50 dark:border-neutral-700/50',
        'transition-all duration-300 ease-out',
        'hover:shadow-card-hover hover:-translate-y-1',
        'group cursor-default'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-3xl font-bold text-primary-800 dark:text-white mt-2 font-heading">
            {value}
          </p>
        </div>

        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
            'bg-gradient-to-br from-primary-800 to-primary-600',
            'group-hover:scale-110 group-hover:shadow-lg'
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>

      {/* Trend indicator — only shown when we have a real change value */}
      {change && change !== '...' && (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
              trend === 'up'
                ? 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-500'
                : 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-500'
            )}
          >
            {trend === 'up' ? (
              <TrendingUpIcon className="h-3.5 w-3.5" />
            ) : (
              <TrendingDownIcon className="h-3.5 w-3.5" />
            )}
            {change}
          </div>

          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            vs. luna anterioară
          </span>
        </div>
      )}

      {/* Sparkline Chart */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-4 h-12 -mx-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={trend === 'up' ? '#00C29A' : '#EF4444'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={trend === 'up' ? '#00C29A' : '#EF4444'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={trend === 'up' ? '#00C29A' : '#EF4444'}
                fill={`url(#${gradientId})`}
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default KPICard;

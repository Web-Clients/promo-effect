import React from 'react';
import { Card } from '../ui/Card';
import { PackageIcon, TruckIcon, CheckCircleIcon, AlertCircleIcon } from '../icons';
import { TrackingStats } from '../../services/tracking';

interface StatsCardsProps {
  stats: TrackingStats | null;
  loading: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  const statItems = [
    {
      label: 'Total Containere',
      value: stats?.totalContainers || 0,
      icon: PackageIcon,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'În Tranzit',
      value: stats?.inTransit || 0,
      icon: TruckIcon,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      label: 'Livrate',
      value: stats?.delivered || 0,
      icon: CheckCircleIcon,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Întârziate',
      value: stats?.delayed || 0,
      icon: AlertCircleIcon,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded-xl h-24"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statItems.map((item) => (
        <div key={item.label}>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                  {item.value}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.label}</p>
              </div>
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;

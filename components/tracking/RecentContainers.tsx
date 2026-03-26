import React from 'react';
import { Badge } from '../ui/Badge';
import { PackageIcon } from '../icons';
import { Container, getStatusLabel } from '../../services/tracking';
import { statusVariantMap } from './types';

interface RecentContainersProps {
  containers: Container[];
  onSelect: (containerNumber: string) => void;
  loading: boolean;
}

const RecentContainers: React.FC<RecentContainersProps> = ({ containers, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
        ))}
      </div>
    );
  }

  if (containers.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
        <PackageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nu există containere de afișat</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {containers.slice(0, 5).map((container) => (
        <div
          key={container.id}
          className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-700/50 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
          onClick={() => onSelect(container.containerNumber)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <PackageIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <p className="font-mono font-medium text-neutral-800 dark:text-neutral-100">
                {container.containerNumber}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {container.booking?.bookingNumber || 'N/A'} •{' '}
                {container.currentLocation || 'Necunoscut'}
              </p>
            </div>
          </div>
          <Badge variant={statusVariantMap[container.currentStatus] || 'default'}>
            {getStatusLabel(container.currentStatus)}
          </Badge>
        </div>
      ))}
    </div>
  );
};

export default RecentContainers;

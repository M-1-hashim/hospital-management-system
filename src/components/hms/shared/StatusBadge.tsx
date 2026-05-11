'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type StatusVariant =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'unpaid'
  | 'paid'
  | 'available'
  | 'occupied'
  | 'cleaning'
  | 'reserved'
  | 'default';

const statusColorMap: Record<
  StatusVariant,
  { className: string; dotColor: string }
> = {
  pending: {
    className:
      'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    dotColor: 'bg-yellow-500',
  },
  confirmed: {
    className:
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
    dotColor: 'bg-blue-500',
  },
  completed: {
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  cancelled: {
    className:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    dotColor: 'bg-red-500',
  },
  active: {
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  inactive: {
    className:
      'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
    dotColor: 'bg-gray-400',
  },
  unpaid: {
    className:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    dotColor: 'bg-red-500',
  },
  paid: {
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  available: {
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  occupied: {
    className:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
    dotColor: 'bg-red-500',
  },
  cleaning: {
    className:
      'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
    dotColor: 'bg-yellow-500',
  },
  reserved: {
    className:
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
    dotColor: 'bg-blue-500',
  },
  default: {
    className:
      'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
    dotColor: 'bg-gray-400',
  },
};

function getStatusVariant(status: string): StatusVariant {
  const normalized = status.toLowerCase().trim();
  if (normalized in statusColorMap) {
    return normalized as StatusVariant;
  }
  return 'default';
}

interface StatusBadgeProps {
  status: string;
  className?: string;
  showDot?: boolean;
}

export function StatusBadge({
  status,
  className,
  showDot = true,
}: StatusBadgeProps) {
  const variant = getStatusVariant(status);
  const colors = statusColorMap[variant];

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        colors.className,
        className
      )}
    >
      {showDot && (
        <span className={cn('inline-block size-1.5 rounded-full', colors.dotColor)} />
      )}
      {status}
    </Badge>
  );
}

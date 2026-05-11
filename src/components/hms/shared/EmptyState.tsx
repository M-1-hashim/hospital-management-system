'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center gap-4 py-16 text-center"
    >
      {Icon && (
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
          <Icon className="size-8 text-muted-foreground stroke-1" />
        </div>
      )}

      {title && (
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      )}

      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}

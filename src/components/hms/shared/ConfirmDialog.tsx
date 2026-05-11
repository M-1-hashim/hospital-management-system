'use client';

import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  loading: externalLoading,
}: ConfirmDialogProps) {
  const { t, isRTL } = useLanguageStore();
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = externalLoading ?? internalLoading;

  const handleConfirm = async () => {
    if (externalLoading === undefined) {
      setInternalLoading(true);
    }
    try {
      await onConfirm();
      if (externalLoading === undefined) {
        setInternalLoading(false);
      }
      onClose();
    } catch {
      if (externalLoading === undefined) {
        setInternalLoading(false);
      }
    }
  };

  const isDanger = variant === 'danger';

  return (
    <AlertDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent
        className={cn(
          'max-w-[calc(100vw-2rem)] sm:max-w-lg',
          isRTL && 'text-right'
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={cn('flex items-center gap-2', isDanger && 'text-red-600 dark:text-red-400')}>
            {isDanger && <AlertTriangle className="size-5" />}
            {title ?? t('confirm')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? t('warning')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel ?? t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              isDanger &&
                buttonVariants({
                  variant: 'destructive',
                })
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{t('loading')}</span>
              </>
            ) : (
              (confirmLabel ?? t('confirm'))
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

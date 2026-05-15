'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, CheckCircle2, Users, ChevronRight, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/store';

// ============================================================
// Types
// ============================================================

export interface QueueEntry {
  id: string;
  queueNumber: number;
  patientName: string;
  priority: string;
  status: string;
  department: string;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    fileNumber: string;
    phone: string;
  } | null;
}

interface QueueDisplayProps {
  department: string;
  currentServing: QueueEntry | null;
  nextInLine: QueueEntry[];
  totalWaiting: number;
  onCallNext: () => void;
  onComplete: () => void;
  announcing?: boolean;
  departmentFa?: string;
}

// ============================================================
// Component
// ============================================================

export function QueueDisplay({
  department,
  currentServing,
  nextInLine,
  totalWaiting,
  onCallNext,
  onComplete,
  announcing = false,
  departmentFa = department,
}: QueueDisplayProps) {
  const { t, isRTL } = useLanguageStore();

  const displayDept = isRTL ? departmentFa : department;

  // "Call Next" is enabled when there are waiting patients OR someone is being served
  const canCallNext = totalWaiting > 0;
  // "Complete" is only enabled when someone is currently being served
  const canComplete = currentServing !== null;

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-card p-6 shadow-sm shadow-black/[0.03] dark:ring-1 dark:ring-white/[0.06]">
      {/* ── Department Header ─────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
            <Users className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">{displayDept}</span>
        </div>
        <Badge variant="secondary" className="gap-1 text-xs">
          <span className="relative flex size-2">
            {totalWaiting > 0 && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            )}
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          {totalWaiting} {t('waiting_queue').toLowerCase()}
        </Badge>
      </div>

      {/* ── Current Serving (Large) ───────────────────────── */}
      <div className="flex flex-col items-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 px-8 py-6">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t('current_serving')}
        </span>
        <AnimatePresence mode="wait">
          {currentServing ? (
            <motion.div
              key={currentServing.id}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="mt-2 flex flex-col items-center"
            >
              <span className="text-5xl font-bold tabular-nums text-primary md:text-6xl">
                {String(currentServing.queueNumber).padStart(3, '0')}
              </span>
              <span className="mt-1 text-sm font-medium text-foreground">
                {currentServing.patientName}
              </span>
              {currentServing.priority === 'urgent' && (
                <Badge variant="destructive" className="mt-1 text-[10px] px-1.5 py-0">
                  {t('priority_urgent')}
                </Badge>
              )}
              {currentServing.priority === 'emergency' && (
                <Badge variant="destructive" className="mt-1 text-[10px] px-1.5 py-0">
                  {t('priority_emergency')}
                </Badge>
              )}
              {/* Announcing indicator */}
              {announcing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 flex items-center gap-1.5 text-xs text-primary"
                >
                  <Volume2 className="size-3.5 animate-pulse" />
                  <span>{isRTL ? 'در حال اعلام...' : 'Announcing...'}</span>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="mt-2 flex flex-col items-center"
            >
              <span className="text-5xl font-bold text-muted-foreground/30 md:text-6xl">—</span>
              <span className="mt-1 text-sm text-muted-foreground">{t('no_patients_in_queue')}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Next 3 in Line ────────────────────────────────── */}
      {nextInLine.length > 0 && (
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('next')}
          </span>
          <div className="flex flex-col gap-1.5">
            <AnimatePresence>
              {nextInLine.slice(0, 3).map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                  className="flex items-center gap-3 rounded-xl bg-muted/50 px-4 py-2.5 transition-colors hover:bg-muted"
                >
                  <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {entry.queueNumber}
                  </div>
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {entry.patientName}
                  </span>
                  {entry.priority === 'urgent' && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">!</Badge>
                  )}
                  {entry.priority === 'emergency' && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">!!</Badge>
                  )}
                  <ChevronRight className="size-4 text-muted-foreground/40" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Action Buttons ────────────────────────────────── */}
      <div className="flex gap-2">
        <Button
          onClick={onCallNext}
          disabled={!canCallNext}
          className={cn(
            'flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90',
            !canCallNext && 'opacity-50',
          )}
        >
          <Megaphone className="size-4" />
          {t('call_next')}
        </Button>
        <Button
          onClick={onComplete}
          disabled={!canComplete}
          variant="outline"
          className={cn(
            'flex-1 gap-2',
            !canComplete && 'opacity-50',
          )}
        >
          <CheckCircle2 className="size-4" />
          {t('completed')}
        </Button>
      </div>
    </div>
  );
}

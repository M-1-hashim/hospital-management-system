'use client';

import { useState, useCallback, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// ============================================================
// CollapsiblePanel — reusable section wrapper with collapse/expand
// Persists state per panel ID in localStorage
// ============================================================

interface CollapsiblePanelProps {
  /** Unique ID for localStorage persistence (e.g. "dashboard-daily-visits") */
  id: string;
  /** Section title */
  title: string;
  /** Optional icon shown before the title */
  icon?: LucideIcon;
  /** Optional badge/count shown after the title */
  badge?: string | number;
  /** Panel content */
  children: React.ReactNode;
  /** Start collapsed (default: open) */
  defaultOpen?: boolean;
  /** Extra class for the outer wrapper */
  className?: string;
  /** Extra class for the header row */
  headerClassName?: string;
  /** Hide the collapse toggle (panel stays open) */
  noToggle?: boolean;
}

const STORAGE_PREFIX = 'hms-panel-';

function loadState(id: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (v !== null) return v === '1';
  } catch { /* ignore */ }
  return fallback;
}

function saveState(id: string, isOpen: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, isOpen ? '1' : '0');
  } catch { /* ignore */ }
}

export function CollapsiblePanel({
  id,
  title,
  icon: Icon,
  badge,
  children,
  defaultOpen = true,
  className,
  headerClassName,
  noToggle = false,
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(() => loadState(id, defaultOpen));
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      saveState(id, next);
      return next;
    });
  }, [id]);

  // Don't render collapse toggle until mounted to avoid hydration mismatch
  const ChevronIcon = isOpen ? ChevronUp : ChevronDown;

  return (
    <div className={cn('rounded-2xl bg-card shadow-sm shadow-black/[0.03] dark:ring-1 dark:ring-white/[0.06] overflow-hidden', className)}>
      {/* ── Header ── */}
      <button
        type="button"
        onClick={toggle}
        disabled={noToggle}
        className={cn(
          'flex w-full items-center gap-2 px-5 py-4 text-start transition-colors hover:bg-muted/40',
          noToggle && 'cursor-default hover:bg-transparent',
          headerClassName,
        )}
      >
        {Icon && (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary" />
          </div>
        )}
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {badge !== undefined && (
          <span className="ms-1 inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {badge}
          </span>
        )}
        {!noToggle && mounted && (
          <span className="ms-auto">
            <ChevronIcon className="size-4 text-muted-foreground" />
          </span>
        )}
      </button>

      {/* ── Content ── */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

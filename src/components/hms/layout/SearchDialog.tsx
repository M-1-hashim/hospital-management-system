'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Receipt,
  Pill,
  FlaskConical,
  BedDouble,
  UserCog,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore, useNavStore } from '@/store';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import type { LucideIcon } from 'lucide-react';

interface SearchItem {
  key: string;
  icon: LucideIcon;
  category: string;
}

const searchItems: SearchItem[] = [
  { key: 'dashboard', icon: LayoutDashboard, category: 'main' },
  { key: 'patients', icon: Users, category: 'main' },
  { key: 'doctors', icon: Stethoscope, category: 'main' },
  { key: 'appointments', icon: CalendarDays, category: 'main' },
  { key: 'billing', icon: Receipt, category: 'finance' },
  { key: 'pharmacy', icon: Pill, category: 'medical' },
  { key: 'laboratory', icon: FlaskConical, category: 'medical' },
  { key: 'wards', icon: BedDouble, category: 'medical' },
  { key: 'staff', icon: UserCog, category: 'management' },
  { key: 'reports', icon: BarChart3, category: 'management' },
  { key: 'settings', icon: Settings, category: 'system' },
];

const categoryLabels: Record<string, string> = {
  main: 'Main',
  medical: 'Medical',
  finance: 'Finance',
  management: 'Management',
  system: 'System',
};

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const { t, isRTL } = useLanguageStore();
  const { setCurrentPage } = useNavStore();

  const handleSelect = useCallback(
    (key: string) => {
      setCurrentPage(key);
      onOpenChange(false);
    },
    [setCurrentPage, onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder={`${t('search')}...`}
        dir={isRTL ? 'rtl' : 'ltr'}
      />
      <CommandList dir={isRTL ? 'rtl' : 'ltr'}>
        <CommandEmpty>{t('no_data')}</CommandEmpty>

        {Object.entries(categoryLabels).map(([category, label], idx) => {
          const items = searchItems.filter((item) => item.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup
                heading={label}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                {items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.key}
                      value={`${t(item.key)} ${item.key}`}
                      onSelect={() => handleSelect(item.key)}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      className={cn(
                        'flex items-center gap-3',
                        isRTL && 'flex-row-reverse text-right'
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-emerald-600" />
                      <span className="flex-1">{t(item.key)}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}

'use client';

import { motion } from 'framer-motion';
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
  Globe,
  Sun,
  Moon,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavStore, useLanguageStore, useThemeStore, useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  key: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'patients', icon: Users },
  { key: 'doctors', icon: Stethoscope },
  { key: 'appointments', icon: CalendarDays },
  { key: 'billing', icon: Receipt },
  { key: 'pharmacy', icon: Pill },
  { key: 'laboratory', icon: FlaskConical },
  { key: 'wards', icon: BedDouble },
  { key: 'staff', icon: UserCog },
  { key: 'reports', icon: BarChart3 },
  { key: 'settings', icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { currentPage, setCurrentPage } = useNavStore();
  const { t, isRTL, locale, setLocale } = useLanguageStore();
  const { theme, toggleTheme } = useThemeStore();
  const { user } = useAuthStore();

  const handleNavClick = (key: string) => {
    setCurrentPage(key);
    onNavigate?.();
  };

  return (
    <div className="flex h-full flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <Plus className="size-6 text-white" strokeWidth={3} />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-bold text-white">
            {t('dashboard').split(' ').slice(0, 1)[0]}
          </span>
          <span className="truncate text-xs text-emerald-100/80">
            {isRTL ? 'سیستم مدیریت بیمارستان' : 'Hospital Management'}
          </span>
        </div>
      </div>

      <Separator className="bg-white/10" />

      {/* Navigation Items */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-1" role="navigation">
          {navItems.map((item) => {
            const isActive = currentPage === item.key;
            const Icon = item.icon;

            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleNavClick(item.key)}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      'hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                      isActive
                        ? 'bg-white/15 text-white shadow-sm'
                        : 'text-emerald-100/70'
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon
                      className={cn(
                        'size-5 shrink-0 transition-transform duration-200',
                        isActive && 'scale-110'
                      )}
                    />
                    <span className="truncate">{t(item.key)}</span>
                    {isActive && (
                      <motion.div
                        className="ms-auto size-1.5 rounded-full bg-white"
                        layoutId="activeIndicator"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {t(item.key)}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-white/10" />

      {/* Bottom Controls */}
      <div className="flex flex-col gap-2 p-3">
        {/* Language & Theme Toggles */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')}
                className="flex-1 justify-start gap-2 text-emerald-100/70 hover:bg-white/10 hover:text-white"
              >
                <Globe className="size-4" />
                <span className="text-xs">{locale === 'en' ? 'FA' : 'EN'}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('language')}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="flex-1 justify-start gap-2 text-emerald-100/70 hover:bg-white/10 hover:text-white"
              >
                {theme === 'light' ? (
                  <Moon className="size-4" />
                ) : (
                  <Sun className="size-4" />
                )}
                <span className="text-xs">
                  {t(theme === 'light' ? 'dark' : 'light')}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('theme')}</TooltipContent>
          </Tooltip>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
          <Avatar className="size-8 border-2 border-white/20">
            <AvatarFallback className="bg-emerald-400 text-xs font-bold text-white">
              {user?.fullName
                ? user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-xs font-semibold text-white">
              {user?.fullName ?? 'User'}
            </span>
            <Badge
              variant="secondary"
              className="mt-0.5 w-fit bg-white/10 text-[10px] text-emerald-100 hover:bg-white/15"
            >
              {user?.role ? t(user.role) : t('admin')}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { isRTL } = useLanguageStore();

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: 0 }}
        className="hidden lg:flex lg:w-64 xl:w-72"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <div className="flex h-full w-full flex-col bg-gradient-to-b from-emerald-600 to-teal-700 shadow-xl">
          <SidebarContent />
        </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
        <SheetContent
          side={isRTL ? 'right' : 'left'}
          className="w-72 p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <div className="flex h-full flex-col bg-gradient-to-b from-emerald-600 to-teal-700">
            <SidebarContent onNavigate={onMobileClose} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

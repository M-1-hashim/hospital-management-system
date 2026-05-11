'use client';

import { Menu, Search, Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavStore, useLanguageStore, useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { LucideIcon } from 'lucide-react';

// Module icon mapping for breadcrumb display
const moduleIcons: Record<string, LucideIcon> = {};
// Lazy import icons to avoid bundling issues
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
  Settings as SettingsIcon,
} from 'lucide-react';

Object.assign(moduleIcons, {
  dashboard: LayoutDashboard,
  patients: Users,
  doctors: Stethoscope,
  appointments: CalendarDays,
  billing: Receipt,
  pharmacy: Pill,
  laboratory: FlaskConical,
  wards: BedDouble,
  staff: UserCog,
  reports: BarChart3,
  settings: SettingsIcon,
});

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const { currentPage } = useNavStore();
  const { t, isRTL } = useLanguageStore();
  const { user, logout } = useAuthStore();

  const pageTitle = t(currentPage);
  const notificationCount = 3;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        'sm:gap-4 sm:px-6'
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Hamburger Menu (Mobile) */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* Breadcrumb + Title */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                }}
                className="text-muted-foreground"
              >
                HMS
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold">
                {pageTitle}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="truncate text-lg font-bold leading-tight">{pageTitle}</h1>
      </div>

      {/* Search Bar */}
      <Button
        variant="outline"
        className={cn(
          'hidden h-9 w-64 items-center gap-2 text-muted-foreground sm:flex',
          isRTL && 'flex-row-reverse'
        )}
        onClick={onSearchClick}
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-start text-sm">
          {t('search')}...
        </span>
        <kbd className="pointer-events-none ms-auto hidden select-none items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground md:inline-flex">
          {typeof navigator !== 'undefined' && /Mac|iPhone/.test(navigator.userAgent)
            ? '⌘'
            : 'Ctrl'}
          K
        </kbd>
      </Button>

      {/* Mobile Search Button */}
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={onSearchClick}
        aria-label={t('search')}
      >
        <Search className="size-5" />
      </Button>

      <Separator orientation="vertical" className="hidden h-6 sm:block" />

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative" aria-label={t('notifications')}>
            <Bell className="size-5" />
            {notificationCount > 0 && (
              <Badge className="absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-red-500 p-0 text-[10px] text-white hover:bg-red-600">
                {notificationCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-72">
          <DropdownMenuLabel>{t('notifications')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
            <span className="text-sm font-medium">{t('icu_beds_full')}</span>
            <span className="text-xs text-muted-foreground">5 {t('minutes')} ago</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
            <span className="text-sm font-medium">{t('expiring_meds')}</span>
            <span className="text-xs text-muted-foreground">1 {t('hour')} ago</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
            <span className="text-sm font-medium">{t('cancelled_appointments')}</span>
            <span className="text-xs text-muted-foreground">2 {t('hours')} ago</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'flex items-center gap-2 px-2',
              isRTL && 'flex-row-reverse'
            )}
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-emerald-100 text-xs font-bold text-emerald-700">
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
            <div className="hidden flex-col items-start sm:flex">
              <span className="text-sm font-medium">
                {user?.fullName ?? 'User'}
              </span>
              <span className="text-xs text-muted-foreground">
                {user?.role ? t(user.role) : ''}
              </span>
            </div>
            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-48">
          <DropdownMenuLabel>{t('profile')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="me-2 size-4" />
            {t('profile')}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="me-2 size-4" />
            {t('settings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={logout}
            className="text-red-600 focus:bg-red-50 focus:text-red-700"
          >
            <LogOut className="me-2 size-4" />
            {t('logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

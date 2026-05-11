'use client';

import { Menu, Search, Bell, ChevronDown, LogOut, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavStore, useLanguageStore, useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface HeaderProps { onMenuClick: () => void; onSearchClick: () => void; }

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const { currentPage } = useNavStore();
  const { t, isRTL } = useLanguageStore();
  const { user, logout } = useAuthStore();
  const pageTitle = t(currentPage);

  return (
    <header className={cn('sticky top-0 z-30 flex h-14 items-center gap-3 bg-background/80 px-4 backdrop-blur-xl sm:px-6', 'border-b border-border/50')} dir={isRTL ? 'rtl' : 'ltr'}>
      <Button variant="ghost" size="icon" className="lg:hidden size-8" onClick={onMenuClick}><Menu className="size-4" /></Button>
      <div className="flex-1"><h1 className="text-[15px] font-semibold tracking-tight">{pageTitle}</h1></div>

      {/* Search */}
      <button onClick={onSearchClick} className={cn('hidden h-9 w-56 items-center gap-2 rounded-xl bg-muted/50 px-3 text-[13px] text-muted-foreground transition-colors hover:bg-muted sm:flex', isRTL && 'flex-row-reverse')}>
        <Search className="size-3.5" />
        <span className="flex-1 truncate text-start">{t('search')}...</span>
        <kbd className="rounded-md border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{typeof navigator !== 'undefined' && /Mac|iPhone/.test(navigator.userAgent) ? '⌘' : '⌃'}K</kbd>
      </button>
      <Button variant="ghost" size="icon" className="sm:hidden size-8" onClick={onSearchClick}><Search className="size-4" /></Button>

      <Separator orientation="vertical" className="hidden h-5 sm:block" />

      {/* Notifications */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="relative size-8"><Bell className="size-4" />{<Badge className="absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 p-0 text-[9px] text-white">3</Badge>}</Button></DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-64">
          <DropdownMenuLabel>{t('notifications')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {[{ t: 'icu_beds_full', time: '5m' }, { t: 'expiring_meds', time: '1h' }, { t: 'cancelled_appointments', time: '2h' }].map((n, i) => <DropdownMenuItem key={i} className="flex flex-col items-start gap-0.5 py-2.5"><span className="text-sm">{t(n.t)}</span><span className="text-[11px] text-muted-foreground">{n.time}</span></DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn('flex items-center gap-2 px-1.5 h-8', isRTL && 'flex-row-reverse')}>
            <Avatar className="size-7 ring-1 ring-border/50"><AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">{user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}</AvatarFallback></Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user?.fullName?.split(' ')[0] ?? 'User'}</span>
            <ChevronDown className="hidden size-3 text-muted-foreground sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-44">
          <DropdownMenuLabel>{user?.fullName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => useNavStore.getState().setCurrentPage('settings')}><User className="me-2 size-3.5" />{t('profile')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => useNavStore.getState().setCurrentPage('settings')}><Settings className="me-2 size-3.5" />{t('settings')}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-red-600 focus:bg-red-50 focus:text-red-700"><LogOut className="me-2 size-3.5" />{t('logout')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

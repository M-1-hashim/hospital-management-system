'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, Bell, ChevronDown, LogOut, Settings, User, Volume2, VolumeX, CheckCheck, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavStore, useLanguageStore, useAuthStore, useNotificationStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { playNotificationSound } from '@/lib/notification-sound';

interface HeaderProps { onMenuClick: () => void; onSearchClick: () => void; }

// ---- Notification type icon & grouping ----

const NOTIFICATION_TYPE_ICONS: Record<string, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  appointment: '📅',
  urgent: '🚨',
  system: '⚙️',
  lab_result: '🔬',
  medicine_expiry: '💊',
  low_stock: '📦',
  bed: '🛏️',
  billing: '💰',
  blood_expiry: '🩸',
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  appointment: 'appointments',
  lab_result: 'laboratory',
  medicine_expiry: 'pharmacy',
  low_stock: 'pharmacy',
  bed: 'wards',
  billing: 'billing',
  blood_expiry: 'laboratory',
};

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const { currentPage } = useNavStore();
  const { t, isRTL } = useLanguageStore();
  const { user, logout } = useAuthStore();
  const { notifications, unreadCount, soundEnabled, setSoundEnabled, markAsRead, markAllAsRead, clearNotification, clearAll, addNotification } = useNotificationStore();
  const [notifSheetOpen, setNotifSheetOpen] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const pageTitle = t(currentPage);

  const handleNotificationClick = (id: string, link?: string) => {
    markAsRead(id);
    if (link) {
      useNavStore.getState().setCurrentPage(link);
      setNotifSheetOpen(false);
    }
  };

  const handleToggleTypeGroup = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleTestSound = () => {
    playNotificationSound('appointment');
    addNotification({
      title: 'test_notification',
      message: 'notification_sound_test_desc',
      type: 'success',
      link: undefined,
    });
  };

  // Group notifications by type
  const groupedNotifications = notifications.reduce((acc, notif) => {
    const type = notif.type || 'system';
    const groupKey = NOTIFICATION_TYPE_LABELS[type] || type;
    if (!acc[groupKey]) {
      acc[groupKey] = { type: groupKey, items: [] };
    }
    acc[groupKey].items.push(notif);
    return acc;
  }, {} as Record<string, { type: string; items: typeof notifications }>);

  // Sort groups: unread groups first, then by most recent notification
  const sortedGroups = Object.values(groupedNotifications).sort((a, b) => {
    const aUnread = a.items.filter((n) => !n.read).length;
    const bUnread = b.items.filter((n) => !n.read).length;
    if (bUnread !== aUnread) return bUnread - aUnread;
    return 0;
  });

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

      {/* Notifications Bell */}
      <Button
        variant="ghost"
        size="icon"
        className="relative size-8"
        onClick={() => setNotifSheetOpen(true)}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 p-0 text-[9px] text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* User */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={cn('flex items-center gap-2 px-1.5 h-8', isRTL && 'flex-row-reverse')}>
            <Avatar className="size-7 ring-1 ring-border/50"><AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">{user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}</AvatarFallback></Avatar>
            <span className="hidden text-sm font-medium sm:inline">{user?.fullName?.split(' ')[0] ?? 'User'}</span>
            <ChevronDown className="hidden size-3 text-muted-foreground sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-44 max-w-[85vw]">
          <DropdownMenuLabel>{user?.fullName}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => useNavStore.getState().setCurrentPage('settings')}><User className="me-2 size-3.5" />{t('profile')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => useNavStore.getState().setCurrentPage('settings')}><Settings className="me-2 size-3.5" />{t('settings')}</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-red-600 focus:bg-red-50 focus:text-red-700"><LogOut className="me-2 size-3.5" />{t('logout')}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Notification Sheet (Slide-in Panel) */}
      <Sheet open={notifSheetOpen} onOpenChange={setNotifSheetOpen}>
        <SheetContent side={isRTL ? 'left' : 'right'} className="w-full sm:w-[400px] p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-base flex items-center gap-2">
                <Bell className="size-4" />
                {t('notifications')}
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5">
                    {unreadCount}
                  </Badge>
                )}
              </SheetTitle>
              <div className="flex items-center gap-1">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground"
                    onClick={() => { markAllAsRead(); setExpandedTypes(new Set()); }}
                  >
                    <CheckCheck className="me-1 size-3.5" />
                    {t('mark_all_read')}
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Sound Toggle */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              <span className="text-xs">{t('notification_sound')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleTestSound}>
                {t('test_sound')}
              </Button>
              <Switch
                checked={soundEnabled}
                onCheckedChange={setSoundEnabled}
                className="scale-90"
              />
            </div>
          </div>

          {/* Notification List — Grouped by type */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-12">
                <Bell className="size-10 opacity-20" />
                <p className="text-sm">{t('no_notifications')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                <AnimatePresence mode="popLayout">
                  {sortedGroups.map((group) => {
                    const groupIcon = NOTIFICATION_TYPE_ICONS[group.items[0]?.type] || 'ℹ️';
                    const groupLabel = t(group.type) || group.type;
                    const groupUnread = group.items.filter((n) => !n.read).length;
                    const isExpanded = expandedTypes.has(group.type) || sortedGroups.length <= 1;

                    return (
                      <motion.div
                        key={group.type}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {/* Group Header */}
                        <button
                          className="flex items-center gap-2 w-full px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                          onClick={() => handleToggleTypeGroup(group.type)}
                        >
                          <span>{groupIcon}</span>
                          <span className="flex-1 text-start">{groupLabel}</span>
                          {groupUnread > 0 && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                              {groupUnread}
                            </Badge>
                          )}
                          <ExternalLink className="size-3 opacity-40" />
                        </button>

                        {/* Group Items */}
                        <AnimatePresence>
                          {isExpanded && group.items.map((notif) => (
                            <motion.div
                              key={notif.id}
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className="overflow-hidden"
                            >
                              <div
                                className={cn(
                                  'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50',
                                  !notif.read && 'bg-primary/5',
                                )}
                                onClick={() => handleNotificationClick(notif.id, notif.link)}
                              >
                                <span className="mt-0.5 text-base flex-shrink-0">
                                  {NOTIFICATION_TYPE_ICONS[notif.type] || groupIcon}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className={cn('text-sm truncate', !notif.read && 'font-semibold')}>
                                      {t(notif.title)}
                                    </p>
                                    <span className="text-[11px] text-muted-foreground flex-shrink-0">{notif.time}</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {t(notif.message)}
                                  </p>
                                  {/* Priority badge for critical/high */}
                                  {(notif.priority === 'critical' || notif.priority === 'high') && (
                                    <Badge
                                      variant="secondary"
                                      className={cn(
                                        'mt-1 text-[9px] px-1.5 py-0',
                                        notif.priority === 'critical'
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                                      )}
                                    >
                                      {notif.priority === 'critical' ? t('critical_alert') : notif.priority}
                                    </Badge>
                                  )}
                                </div>
                                {!notif.read && (
                                  <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-border/50 px-4 py-2 flex-shrink-0 flex gap-2">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-8 text-xs text-muted-foreground"
                  onClick={clearAll}
                >
                  <Trash2 className="me-1 size-3.5" />
                  {t('clear_all_notifications')}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

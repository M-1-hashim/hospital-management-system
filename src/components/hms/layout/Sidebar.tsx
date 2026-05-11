'use client';

import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Stethoscope, CalendarDays, Receipt, Pill, FlaskConical, BedDouble, UserCog, BarChart3, Settings, Globe, Sun, Moon, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavStore, useLanguageStore, useThemeStore, useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LucideIcon } from 'lucide-react';

interface NavItem { key: string; icon: LucideIcon }
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

  const handleNavClick = (key: string) => { setCurrentPage(key); onNavigate?.(); };

  return (
    <div className="flex h-full flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20">
          <Heart className="size-5 text-white" fill="white" fillOpacity={0.9} />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-bold text-sidebar-foreground">{isRTL ? 'بیمارستان' : 'HMS'}</span>
          <span className="truncate text-[11px] text-sidebar-foreground/50">{isRTL ? 'سیستم مدیریت' : 'Management System'}</span>
        </div>
      </div>

      {/* Nav Items */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="flex flex-col gap-0.5" role="navigation">
          {navItems.map((item) => {
            const isActive = currentPage === item.key;
            const Icon = item.icon;
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button onClick={() => handleNavClick(item.key)} className={cn('group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 hover:bg-sidebar-accent focus-visible:outline-none', isActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/60 hover:text-sidebar-foreground/90')} aria-current={isActive ? 'page' : undefined}>
                    {isActive && <motion.div layoutId="sidebarActiveIndicator" className={cn('absolute rounded-lg bg-sidebar-primary', isRTL ? 'right-0' : 'left-0', 'inset-y-1 w-[3px]')} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />}
                    <Icon className={cn('size-[18px] shrink-0', isActive && 'text-sidebar-primary')} />
                    <span className="truncate">{t(item.key)}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right"><span>{t(item.key)}</span></TooltipContent>
              </Tooltip>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Bottom */}
      <div className="flex flex-col gap-1 p-3 pt-0">
        <div className="flex items-center gap-1 rounded-lg bg-sidebar-accent/50 px-1 py-1">
          <Button variant="ghost" size="sm" onClick={() => setLocale(locale === 'en' ? 'fa' : 'en')} className="flex-1 justify-start gap-1.5 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"><Globe className="size-3.5" /><span className="text-[11px]">{locale === 'en' ? 'فارسی' : 'English'}</span></Button>
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="flex-1 justify-start gap-1.5 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent">{theme === 'light' ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}<span className="text-[11px]">{t(theme === 'light' ? 'dark' : 'light')}</span></Button>
        </div>
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <Avatar className="size-8 ring-2 ring-sidebar-primary/20"><AvatarFallback className="bg-sidebar-primary/20 text-[10px] font-bold text-sidebar-primary">{user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}</AvatarFallback></Avatar>
          <div className="flex min-w-0 flex-1 flex-col"><span className="truncate text-xs font-semibold text-sidebar-foreground">{user?.fullName ?? 'User'}</span><Badge variant="secondary" className="w-fit bg-sidebar-accent text-[9px] text-sidebar-foreground/70 px-1.5 py-0">{user?.role ? t(user.role) : t('admin')}</Badge></div>
        </div>
      </div>
    </div>
  );
}

interface SidebarProps { mobileOpen?: boolean; onMobileClose?: () => void; }

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { isRTL } = useLanguageStore();
  return (<>
    <motion.aside initial={false} animate={{ x: 0 }} className="hidden lg:flex lg:w-[260px] xl:w-[280px]" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex h-full w-full flex-col bg-sidebar"><SidebarContent /></div>
    </motion.aside>
    <Sheet open={mobileOpen} onOpenChange={(open) => !open && onMobileClose?.()}>
      <SheetContent side={isRTL ? 'right' : 'left'} className="w-[280px] p-0"><SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader><div className="flex h-full flex-col bg-sidebar"><SidebarContent onNavigate={onMobileClose} /></div></SheetContent>
    </Sheet>
  </>);
}

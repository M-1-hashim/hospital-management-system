'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useLanguageStore, useNavStore, useThemeStore, useNotificationStore } from '@/store';
import { applyThemeColors } from '@/lib/themes';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LoginPage } from './LoginPage';
import { SearchDialog } from './SearchDialog';
import DashboardPage from '@/components/hms/pages/DashboardPage';
import PatientsPage from '@/components/hms/pages/PatientsPage';
import { DoctorsPage } from '@/components/hms/pages/DoctorsPage';
import AppointmentsPage from '@/components/hms/pages/AppointmentsPage';
import { BillingPage } from '@/components/hms/pages/BillingPage';
import { PharmacyPage } from '@/components/hms/pages/PharmacyPage';
import { LaboratoryPage } from '@/components/hms/pages/LaboratoryPage';
import { WardsPage } from '@/components/hms/pages/WardsPage';
import { StaffPage } from '@/components/hms/pages/StaffPage';
import { ReportsPage } from '@/components/hms/pages/ReportsPage';
import { SettingsPage } from '@/components/hms/pages/SettingsPage';
import MedicalRecordsPage from '@/components/hms/pages/MedicalRecordsPage';
import { Toaster } from 'sonner';

const PAGE_MAP: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  patients: PatientsPage,
  doctors: DoctorsPage,
  appointments: AppointmentsPage,
  billing: BillingPage,
  pharmacy: PharmacyPage,
  laboratory: LaboratoryPage,
  wards: WardsPage,
  staff: StaffPage,
  reports: ReportsPage,
  settings: SettingsPage,
  medical_records: MedicalRecordsPage,
};

export function AppLayout() {
  const { isAuthenticated } = useAuthStore();
  const { isRTL, locale } = useLanguageStore();
  const { currentPage } = useNavStore();
  const { theme, colorTheme } = useThemeStore();
  const { startPolling, stopPolling } = useNotificationStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Sync theme to document
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);

  // Apply color theme CSS variables
  useEffect(() => { applyThemeColors(colorTheme, theme); }, [colorTheme, theme]);

  // Sync RTL direction to <html> element on mount and locale change
  useEffect(() => {
    const dir = isRTL ? 'rtl' : 'ltr';
    const lang = locale === 'fa' ? 'fa' : 'en';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }, [isRTL, locale]);

  // Auto-start notification polling when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => { stopPolling(); };
  }, [isAuthenticated, startPolling, stopPolling]);

  // Keyboard shortcut: Cmd/Ctrl+K for search
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k' && isAuthenticated) {
      e.preventDefault();
      setSearchOpen(prev => !prev);
    }
  }, [isAuthenticated]);
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isAuthenticated) return <LoginPage />;
  const PageComponent = PAGE_MAP[currentPage] || DashboardPage;

  return (
    <div className="flex h-screen overflow-hidden bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
      <div className="flex flex-1 flex-col min-h-0">
        <Header onMenuClick={() => setMobileSidebarOpen(true)} onSearchClick={() => setSearchOpen(true)} />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <main className="mx-auto w-full max-w-[1500px] overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8">
            <PageComponent />
          </main>
        </div>
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <Toaster position={isRTL ? 'top-left' : 'top-right'} richColors />
    </div>
  );
}

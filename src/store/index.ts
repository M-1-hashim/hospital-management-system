import { create } from 'zustand';
import { translations, type Locale } from '@/lib/i18n';

// ============================================================
// Types
// ============================================================

interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'accountant';
  email?: string;
  avatar?: string;
}

// ============================================================
// 1. useLanguageStore — i18n & RTL handling
// ============================================================

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  get isRTL(): boolean;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  locale: 'en',

  setLocale: (locale) => set({ locale }),

  t: (key: string) => {
    const { locale } = get();
    const translation = translations[locale]?.[key];
    if (translation) return translation;
    // Fallback: capitalise the key itself
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
  },

  get isRTL() {
    return get().locale === 'fa';
  },
}));

// ============================================================
// 2. useNavStore — current page & sidebar state
// ============================================================

interface NavState {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useNavStore = create<NavState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  isSidebarOpen: true,
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

// ============================================================
// 3. useAuthStore — authentication & role
// ============================================================

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  get role(): User['role'] | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,

  login: async (username: string, _password: string) => {
    // TODO: replace with real API call
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: _password }),
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();

      set({
        user: data.user as User,
        isAuthenticated: true,
      });
    } catch {
      set({ user: null, isAuthenticated: false });
      throw new Error('Invalid credentials');
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  get role() {
    return get().user?.role ?? null;
  },
}));

// ============================================================
// 4. useThemeStore — light / dark theme toggle
// ============================================================

interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',

  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
}));

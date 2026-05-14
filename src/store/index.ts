import { create } from 'zustand';
import { translations, type Locale } from '@/lib/i18n';
import { playNotificationSound, type NotificationSoundType } from '@/lib/notification-sound';

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

// ---------- Notification type for DB-backed notifications ----------

export interface DBNotification {
  id: string;
  userId: string | null;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  expiresAt: string | null;
  createdAt: string;
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

  setLocale: (locale) => {
    set({ locale });
    // Sync dir and lang on the <html> element immediately
    const dir = locale === 'fa' ? 'rtl' : 'ltr';
    const lang = locale === 'fa' ? 'fa' : 'en';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  },

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

const AUTH_TOKEN_KEY = 'hms-auth-token';
const AUTH_USER_KEY = 'hms-auth-user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
  get role(): User['role'] | null;
  get authHeaders(): Record<string, string>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  token: null,

  login: async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await res.json();

      if (!data.success || !data.token) {
        throw new Error('Invalid credentials');
      }

      const userData = data.user as User;
      const token = data.token as string;

      // Persist to localStorage (client-only)
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_TOKEN_KEY, token);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData));
      }

      set({
        user: userData,
        isAuthenticated: true,
        token,
      });
    } catch {
      // Clear any stale data
      if (typeof window !== 'undefined') {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
      set({ user: null, isAuthenticated: false, token: null });
      throw new Error('Invalid credentials');
    }
  },

  logout: () => {
    // Attempt server-side logout (best-effort)
    const { token } = get();
    if (token) {
      fetch('/api/auth?action=logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {
        // Swallow error — local cleanup always proceeds
      });
    }

    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }

    set({ user: null, isAuthenticated: false, token: null });
  },

  /**
   * Called once on app mount to restore a session from localStorage.
   * Validates the token against /api/auth/me.
   */
  initialize: async () => {
    if (typeof window === 'undefined') return;

    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem(AUTH_USER_KEY);

    if (!storedToken || !storedUser) {
      set({ user: null, isAuthenticated: false, token: null });
      return;
    }

    try {
      const res = await fetch('/api/auth', {
        method: 'GET',
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (res.ok) {
        const data = await res.json();
        set({
          user: data.user as User,
          isAuthenticated: true,
          token: storedToken,
        });
      } else {
        // Token is invalid or expired — clear everything
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        set({ user: null, isAuthenticated: false, token: null });
      }
    } catch {
      // Network error — keep existing state, will retry later
      // But parse what we have from localStorage for offline use
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        set({
          user: parsedUser,
          isAuthenticated: true,
          token: storedToken,
        });
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        set({ user: null, isAuthenticated: false, token: null });
      }
    }
  },

  get role() {
    return get().user?.role ?? null;
  },

  get authHeaders() {
    const { token } = get();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  },
}));

// ============================================================
// 4. useThemeStore — light / dark + color palette
// ============================================================

export const VALID_COLOR_THEMES = ['emerald', 'ocean', 'indigo', 'purple', 'teal', 'sunset', 'rose', 'crimson', 'slate'] as const;
export type ColorTheme = (typeof VALID_COLOR_THEMES)[number];

interface ThemeState {
  theme: 'light' | 'dark';
  colorTheme: ColorTheme;
  toggleTheme: () => void;
  setColorTheme: (t: ColorTheme) => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return JSON.parse(v) as T;
  } catch { /* ignore */ }
  return fallback;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'light',
  colorTheme: loadFromStorage<ColorTheme>('hms-color-theme', 'emerald'),

  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),

  setColorTheme: (colorTheme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hms-color-theme', JSON.stringify(colorTheme));
    }
    set({ colorTheme });
  },
}));

// ============================================================
// 5. useNotificationStore — HMS notifications with sound + polling
// ============================================================

export interface HMSNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'appointment' | 'urgent' | string;
  time: string;
  read: boolean;
  link?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
}

interface NotificationState {
  notifications: HMSNotification[];
  dbNotifications: DBNotification[];
  soundEnabled: boolean;
  unreadCount: number;
  isPolling: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  addNotification: (notification: Omit<HMSNotification, 'id' | 'time' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
  fetchNotifications: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  syncFromDB: () => void;
}

let _pollingTimer: ReturnType<typeof setInterval> | null = null;

/** Helper: format a date string into a relative time like "5m", "1h", "2d" */
function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 1) return 'now';
  if (diffM < 60) return `${diffM}m`;
  if (diffH < 24) return `${diffH}h`;
  return `${diffD}d`;
}

/** Map notification type to navigation page */
function notificationLink(type: string, entityType?: string | null): string | undefined {
  const linkMap: Record<string, string> = {
    appointment: 'appointments',
    lab_result: 'laboratory',
    medicine_expiry: 'pharmacy',
    low_stock: 'pharmacy',
    bed: 'wards',
    billing: 'billing',
    blood_expiry: 'laboratory',
  };
  if (linkMap[type]) return linkMap[type];
  if (entityType) {
    const entityMap: Record<string, string> = {
      appointment: 'appointments',
      patient: 'patients',
      doctor: 'doctors',
      lab_test: 'laboratory',
      medicine: 'pharmacy',
      bed: 'wards',
      invoice: 'billing',
      blood_bag: 'laboratory',
    };
    return entityMap[entityType];
  }
  return undefined;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [
    {
      id: 'seed-1',
      title: 'icu_beds_full',
      message: 'icu_beds_full_desc',
      type: 'urgent',
      time: '5m',
      read: false,
      link: 'wards',
      priority: 'high',
    },
    {
      id: 'seed-2',
      title: 'expiring_meds',
      message: 'expiring_meds_desc',
      type: 'warning',
      time: '1h',
      read: false,
      link: 'pharmacy',
      priority: 'medium',
    },
    {
      id: 'seed-3',
      title: 'cancelled_appointments',
      message: 'cancelled_appointments_desc',
      type: 'info',
      time: '2h',
      read: false,
      link: 'appointments',
      priority: 'low',
    },
  ],
  dbNotifications: [],
  soundEnabled: true,
  unreadCount: 3,
  isPolling: false,

  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

  addNotification: (notification) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const newNotification: HMSNotification = {
      ...notification,
      id,
      time: 'now',
      read: false,
    };
    set((state) => {
      const updated = [newNotification, ...state.notifications];
      const unreadCount = updated.filter((n) => !n.read).length;
      return { notifications: updated, unreadCount };
    });
    // Play notification sound if enabled
    if (get().soundEnabled) {
      const soundMap: Record<string, NotificationSoundType> = {
        info: 'info',
        success: 'success',
        warning: 'warning',
        error: 'error',
        appointment: 'appointment',
        urgent: 'urgent',
      };
      playNotificationSound(soundMap[notification.type] || 'info');
    }
  },

  markAsRead: (id) => {
    // Optimistic local update
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      const unreadCount = updated.filter((n) => !n.read).length;
      return { notifications: updated, unreadCount };
    });
    // Also call API (best-effort)
    const { authHeaders } = useAuthStore.getState();
    if (authHeaders.Authorization) {
      fetch(`/api/notifications?id=${id}`, {
        method: 'PUT',
        headers: authHeaders,
      }).catch(() => { /* ignore */ });
    }
  },

  markAllAsRead: () => {
    // Optimistic local update
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    // Also call API (best-effort)
    const { authHeaders } = useAuthStore.getState();
    if (authHeaders.Authorization) {
      fetch('/api/notifications?action=markAllRead', {
        method: 'PUT',
        headers: authHeaders,
      }).catch(() => { /* ignore */ });
    }
  },

  clearNotification: (id) =>
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      const unreadCount = updated.filter((n) => !n.read).length;
      return { notifications: updated, unreadCount };
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  fetchNotifications: async () => {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;

    try {
      const { authHeaders } = useAuthStore.getState();
      const res = await fetch('/api/notifications?limit=50', {
        headers: authHeaders,
      });
      if (res.ok) {
        const data = await res.json();
        const dbNotifs: DBNotification[] = data.notifications || [];
        set({ dbNotifications: dbNotifs });
        get().syncFromDB();
      }
    } catch {
      // Silently fail — polling will retry
    }
  },

  syncFromDB: () => {
    const { dbNotifications, notifications } = get();

    // Convert DB notifications to HMSNotification format
    const existingIds = new Set(notifications.map((n) => n.id));
    const newFromDB = dbNotifications
      .filter((db) => !existingIds.has(db.id))
      .map((db) => ({
        id: db.id,
        title: db.title,
        message: db.message,
        type: db.type as HMSNotification['type'],
        time: timeAgo(db.createdAt),
        read: db.isRead,
        link: notificationLink(db.type, db.relatedEntityType),
        priority: db.priority as HMSNotification['priority'],
        relatedEntityType: db.relatedEntityType,
        relatedEntityId: db.relatedEntityId,
      }));

    if (newFromDB.length === 0) return;

    // Merge with existing (deduplicate by id), DB ones first
    const mergedNotifications = [...newFromDB, ...notifications];
    const seen = new Set<string>();
    const deduped = mergedNotifications.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });

    const unreadCount = deduped.filter((n) => !n.read).length;
    set({ notifications: deduped, unreadCount });

    // Show toast for critical notifications that are new
    newFromDB.forEach((n) => {
      if (n.priority === 'critical' && !n.read) {
        // Use dynamic import to avoid circular dependency
        import('sonner').then(({ toast }) => {
          toast.error(n.title, {
            description: n.message,
            duration: 8000,
          });
        });
      } else if (n.priority === 'high' && !n.read) {
        import('sonner').then(({ toast }) => {
          toast.warning(n.title, {
            description: n.message,
            duration: 6000,
          });
        });
      }
    });

    // Play sound for new critical/high priority
    const criticalNew = newFromDB.filter(
      (n) => !n.read && (n.priority === 'critical' || n.priority === 'high')
    );
    if (criticalNew.length > 0 && get().soundEnabled) {
      playNotificationSound(criticalNew[0].priority === 'critical' ? 'urgent' : 'warning');
    }
  },

  startPolling: () => {
    if (_pollingTimer) return; // Already polling
    get().fetchNotifications(); // Fetch immediately
    _pollingTimer = setInterval(() => {
      get().fetchNotifications();
    }, 30_000); // Every 30 seconds
    set({ isPolling: true });
  },

  stopPolling: () => {
    if (_pollingTimer) {
      clearInterval(_pollingTimer);
      _pollingTimer = null;
    }
    set({ isPolling: false });
  },
}));

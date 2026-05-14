'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguageStore, useThemeStore, type ColorTheme } from '@/store';
import { ALL_THEMES } from '@/lib/themes';
import { apiFetch } from '@/lib/fetcher';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings,
  Plus,
  Edit,
  Trash2,
  Save,
  Database,
  Building2,
  Shield,
  Users as UsersIcon,
  RefreshCw,
  UserCircle,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  Palette,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import { BackupManager } from '@/components/hms/shared/BackupManager';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

/* ──────────────────────────── types ──────────────────────────── */

interface Department {
  id: string;
  name: string;
  nameFa: string;
  floor?: number;
  phone?: string;
  description?: string;
  headDoctor?: string;
  isActive: boolean;
}

interface UserRow {
  id: string;
  username: string;
  fullName: string;
  role: string;
  email?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  avatar?: string;
}

/* ──────────────────────────── helpers ──────────────────────────── */

const ROLE_COLORS: Record<string, { border: string; bg: string; icon: string }> = {
  admin:        { border: 'border-red-300 dark:border-red-800',     bg: 'bg-red-50 dark:bg-red-950/20',     icon: 'text-red-600' },
  doctor:       { border: 'border-blue-300 dark:border-blue-800',   bg: 'bg-blue-50 dark:bg-blue-950/20',   icon: 'text-blue-600' },
  nurse:        { border: 'border-emerald-300 dark:border-emerald-800', bg: 'bg-emerald-50 dark:bg-emerald-950/20', icon: 'text-emerald-600' },
  receptionist: { border: 'border-amber-300 dark:border-amber-800', bg: 'bg-amber-50 dark:bg-amber-950/20', icon: 'text-amber-600' },
  accountant:   { border: 'border-purple-300 dark:border-purple-800', bg: 'bg-purple-50 dark:bg-purple-950/20', icon: 'text-purple-600' },
};

function roleColor(role: string) {
  return ROLE_COLORS[role] ?? { border: 'border-gray-300', bg: 'bg-gray-50 dark:bg-gray-900/20', icon: 'text-gray-500' };
}

function formatDate(dateStr?: string | null, isRTL: boolean) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString(isRTL ? 'fa-IR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ═══════════════════════════ MAIN ═══════════════════════════ */

export function SettingsPage() {
  const { t, isRTL } = useLanguageStore();
  const { theme, toggleTheme, colorTheme, setColorTheme } = useThemeStore();

  /* ─── state ─── */
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Department dialog
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', nameFa: '', floor: '', phone: '', description: '' });

  // User dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', fullName: '', role: 'receptionist', email: '', phone: '', password: '' });

  // Confirm dialogs
  const [seedOpen, setSeedOpen] = useState(false);
  const [deleteUserOpen, setDeleteUserOpen] = useState(false);
  const [deleteDeptOpen, setDeleteDeptOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [targetDeptId, setTargetDeptId] = useState<string | null>(null);

  // Hospital form
  const [hospForm, setHospForm] = useState({
    hospital_name: '',
    hospital_name_fa: '',
    hospital_phone: '',
    hospital_address: '',
  });

  /* ─── data fetching ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [depRes, userRes, setRes] = await Promise.allSettled([
        apiFetch('/api/departments').catch(() => null),
        apiFetch('/api/users').catch(() => null),
        apiFetch('/api/settings').catch(() => null),
      ]);

      if (depRes.status === 'fulfilled' && depRes.value) {
        const d = depRes.value;
        setDepartments(Array.isArray(d.departments) ? d.departments : (Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : [])));
      }

      if (userRes.status === 'fulfilled' && userRes.value) {
        setUsers(userRes.value.users || []);
      }

      if (setRes.status === 'fulfilled' && setRes.value) {
        const raw = setRes.value.settings || setRes.value;
        const map: Record<string, string> = raw instanceof Object && !Array.isArray(raw) ? (raw as Record<string, string>) : {};
        setSettings(map);
        setHospForm({
          hospital_name: map.hospital_name || '',
          hospital_name_fa: map.hospital_name_fa || '',
          hospital_phone: map.hospital_phone || '',
          hospital_address: map.hospital_address || '',
        });
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ═══════════════ Hospital Info ═══════════════ */
  const saveHospitalInfo = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/settings', {
        method: 'PUT',
        body: hospForm,
      });
      toast.success(t('hospital_info_saved'));
      fetchData();
    } catch {
      toast.error(t('error'));
    } finally {
      setSaving(false);
    }
  };

  /* ═══════════════ Departments CRUD ═══════════════ */
  const saveDept = async () => {
    try {
      const isEdit = !!selectedDept;
      await apiFetch(isEdit ? `/api/departments?id=${selectedDept!.id}` : '/api/departments', {
        method: isEdit ? 'PUT' : 'POST',
        body: { ...deptForm, floor: Number(deptForm.floor) || 0 },
      });
      toast.success(t('saved'));
      setDeptDialogOpen(false);
      setSelectedDept(null);
      setDeptForm({ name: '', nameFa: '', floor: '', phone: '', description: '' });
      fetchData();
    } catch {
      toast.error(t('error'));
    }
  };

  const editDept = (d: Department) => {
    setSelectedDept(d);
    setDeptForm({ name: d.name, nameFa: d.nameFa, floor: String(d.floor || ''), phone: d.phone || '', description: d.description || '' });
    setDeptDialogOpen(true);
  };

  const confirmDeleteDept = (id: string) => {
    setTargetDeptId(id);
    setDeleteDeptOpen(true);
  };

  const deleteDept = async () => {
    if (!targetDeptId) return;
    try {
      await apiFetch(`/api/departments?id=${targetDeptId}`, { method: 'DELETE' });
      toast.success(t('deleted')); fetchData();
    } catch { toast.error(t('error')); }
  };

  /* ═══════════════ Users CRUD ═══════════════ */
  const openAddUser = () => {
    setUserForm({ username: '', fullName: '', role: 'receptionist', email: '', phone: '', password: '' });
    setShowPassword(false);
    setUserDialogOpen(true);
  };

  const saveUser = async () => {
    if (!userForm.username.trim() || !userForm.fullName.trim() || !userForm.password.trim()) {
      toast.error(t('username_required'));
      return;
    }
    setUserSaving(true);
    try {
      await apiFetch('/api/users', {
        method: 'POST',
        body: userForm,
      });
      toast.success(t('user_created'));
      setUserDialogOpen(false);
      fetchData();
    } catch {
      toast.error(t('error'));
    } finally {
      setUserSaving(false);
    }
  };

  const confirmDeleteUser = (id: string) => {
    setTargetUserId(id);
    setDeleteUserOpen(true);
  };

  const deactivateUser = async () => {
    if (!targetUserId) return;
    try {
      await apiFetch(`/api/users?id=${targetUserId}`, { method: 'DELETE' });
      toast.success(t('deactivate_user'));
      fetchData();
    } catch { toast.error(t('error')); }
  };

  /* ═══════════════ Seed ═══════════════ */
  const handleSeed = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        toast.success(isRTL ? `دیتابیس ریست شد: ${JSON.stringify(data.summary)}` : `Database seeded: ${JSON.stringify(data.summary)}`);
        setSeedOpen(false);
        fetchData();
      } else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  /* ═══════════════ Render ═══════════════ */
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-6"
    >
      {/* ─── Header ─── */}
      <motion.div variants={fadeUp} className="flex items-center gap-2">
        <Settings className="size-5 text-primary" />
        <h1 className="text-xl font-bold">{t('settings')}</h1>
      </motion.div>

      {/* ─── Tabs ─── */}
      <Tabs defaultValue="hospital">
        {/* FIX #1: TabsList scrollable on mobile */}
        <TabsList className="overflow-x-auto flex-wrap">
          <TabsTrigger value="hospital">
            <Building2 className="size-4" />{t('hospital_info_label')}
          </TabsTrigger>
          <TabsTrigger value="departments">{t('departments')}</TabsTrigger>
          <TabsTrigger value="users">
            <Shield className="size-4" />{t('users_label')}
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="size-4" />{t('backup_label')}
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="size-4" />{t('appearance_label')}
          </TabsTrigger>
        </TabsList>

        {/* ═══════════ HOSPITAL INFO TAB ═══════════ */}
        <TabsContent value="hospital" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('hospital_info_label')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-9 w-full" /></div>
                  ))}
                </div>
              ) : (
                <>
                  {/* FIX #2: grid-cols-1 md:grid-cols-2 — stacks on mobile, 2-col on md+ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t('name_en')}</Label>
                      <Input
                        value={hospForm.hospital_name}
                        onChange={(e) => setHospForm({ ...hospForm, hospital_name: e.target.value })}
                        placeholder="General Hospital"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('name_fa')}</Label>
                      <Input
                        value={hospForm.hospital_name_fa}
                        onChange={(e) => setHospForm({ ...hospForm, hospital_name_fa: e.target.value })}
                        dir="rtl"
                        placeholder="بیمارستان عمومی"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('phone')}</Label>
                      <Input
                        value={hospForm.hospital_phone}
                        onChange={(e) => setHospForm({ ...hospForm, hospital_phone: e.target.value })}
                        placeholder="021-12345678"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('address')}</Label>
                      <Input
                        value={hospForm.hospital_address}
                        onChange={(e) => setHospForm({ ...hospForm, hospital_address: e.target.value })}
                        placeholder="Tehran, Vali-Asr Street"
                      />
                    </div>
                  </div>
                  <Button onClick={saveHospitalInfo} className="bg-primary hover:bg-primary/90" disabled={saving}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    {t('save')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ DEPARTMENTS TAB ═══════════ */}
        <TabsContent value="departments" className="space-y-4 mt-4">
          {/* FIX #11: Add Department button — flex-wrap ensures accessibility on small screens */}
          <div className="flex justify-end">
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => { setSelectedDept(null); setDeptForm({ name: '', nameFa: '', floor: '', phone: '', description: '' }); setDeptDialogOpen(true); }}
            >
              <Plus className="size-4" />{t('add')}
            </Button>
          </div>
          <Card>
            {/* FIX #3: overflow-x-auto wrapper for horizontal scroll on mobile */}
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">{t('name')}</th>
                    <th className="p-3 text-start font-medium">{t('name_fa')}</th>
                    <th className="p-3 text-start font-medium">{t('description')}</th>
                    <th className="p-3 text-start font-medium">{t('phone')}</th>
                    <th className="p-3 text-start font-medium">{t('status')}</th>
                    <th className="p-3 text-start font-medium">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{dept.name}</td>
                      <td className="p-3" dir="rtl">{dept.nameFa}</td>
                      <td className="p-3">{dept.floor || '-'}</td>
                      <td className="p-3">{dept.phone || '-'}</td>
                      <td className="p-3"><StatusBadge status={dept.isActive ? 'active' : 'inactive'} /></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => editDept(dept)}><Edit className="size-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => confirmDeleteDept(dept.id)}><Trash2 className="size-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {departments.length === 0 && (
                <div className="py-12 text-center text-muted-foreground min-w-[600px]">
                  <Building2 className="size-10 mx-auto mb-2 opacity-30" /><p>{t('no_data')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════ USERS TAB ═══════════ */}
        <TabsContent value="users" className="space-y-6 mt-4">
          {/* Role cards — FIX #5: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 verified */}
          <motion.div variants={fadeUp} className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <Shield className="size-4 text-muted-foreground" />
              {t('access_roles')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { role: 'admin',        label: isRTL ? 'مدیر سیستم' : 'System Admin',        desc: isRTL ? 'دسترسی کامل به تمام بخش‌ها و تنظیمات' : 'Full access to all sections and settings' },
                { role: 'doctor',       label: isRTL ? 'پزشک' : 'Doctor',                     desc: isRTL ? 'بیماران، نوبت‌ها، نسخه‌ها و آزمایش‌ها' : 'Patients, appointments, prescriptions, labs' },
                { role: 'nurse',        label: isRTL ? 'پرستار' : 'Nurse',                      desc: isRTL ? 'بیماران بستری، تخت‌ها، علائم حیاتی' : 'Inpatients, beds, vital records' },
                { role: 'receptionist', label: isRTL ? 'پذیرش' : 'Receptionist',               desc: isRTL ? 'نوبت‌دهی، ثبت بیمار، پذیرش' : 'Appointments, patient registration, reception' },
                { role: 'accountant',   label: isRTL ? 'حسابدار' : 'Accountant',                 desc: isRTL ? 'فاکتورها، گزارش‌های مالی و هزینه‌ها' : 'Invoices, financial reports, expenses' },
              ].map((r) => {
                const c = roleColor(r.role);
                return (
                  <Card key={r.role} className={`border ${c.border} ${c.bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <UserCircle className={`size-5 ${c.icon}`} />
                        <p className="font-medium text-sm">{r.label}</p>
                      </div>
                      <Badge variant="outline" className="mt-1.5 text-xs">{r.role}</Badge>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{r.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </motion.div>

          {/* Default accounts reference — FIX #6: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 verified */}
          <motion.div variants={fadeUp}>
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Lock className="size-4 text-amber-500" />
                  {t('default_accounts')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  {[
                    { user: 'admin',        pass: 'admin123',      role: isRTL ? 'مدیر' : 'Admin' },
                    { user: 'doctor',       pass: 'doctor123',     role: isRTL ? 'پزشک' : 'Doctor' },
                    { user: 'nurse',        pass: 'nurse123',      role: isRTL ? 'پرستار' : 'Nurse' },
                    { user: 'receptionist', pass: 'reception123',  role: isRTL ? 'پذیرش' : 'Reception' },
                    { user: 'accountant',   pass: 'account123',    role: isRTL ? 'حسابدار' : 'Accountant' },
                  ].map((a) => (
                    <div key={a.user} className="flex items-center justify-between py-1.5 px-3 rounded-md bg-muted/50 border gap-2">
                      <div className="min-w-0">
                        <span className="font-mono font-semibold">{a.user}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="font-mono text-muted-foreground">{a.pass}</span>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{a.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* User accounts table */}
          <motion.div variants={fadeUp} className="space-y-3">
            {/* FIX #11: flex-wrap gap-2 ensures button stays accessible on mobile */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-medium flex items-center gap-2">
                <UsersIcon className="size-4 text-muted-foreground" />
                {t('user_accounts')}
                {!loading && (
                  <Badge variant="secondary" className="ml-1 text-xs font-normal">
                    {users.length}
                  </Badge>
                )}
              </h3>
              <Button className="bg-primary hover:bg-primary/90" onClick={openAddUser}>
                <Plus className="size-4" />{t('add_user')}
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground">
                    <UsersIcon className="size-12 mx-auto mb-3 opacity-20" />
                    <p>{t('no_users_registered')}</p>
                  </div>
                ) : (
                  <div className="max-h-[420px] overflow-auto">
                    <table className="w-full text-sm min-w-[700px]">
                      <thead className="sticky top-0 z-10 bg-background">
                        <tr className="border-b bg-muted/50">
                          <th className="p-3 text-start font-medium">{t('name')}</th>
                          <th className="p-3 text-start font-medium">{t('role')}</th>
                          <th className="p-3 text-start font-medium">{t('email')}</th>
                          <th className="p-3 text-start font-medium">{t('phone')}</th>
                          <th className="p-3 text-start font-medium">{t('status')}</th>
                          <th className="p-3 text-start font-medium">{t('last_login')}</th>
                          <th className="p-3 text-start font-medium">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => {
                          const c = roleColor(u.role);
                          return (
                            <tr key={u.id} className="border-b hover:bg-muted/30 transition-colors">
                              <td className="p-3">
                                <div>
                                  <p className="font-medium">{u.fullName}</p>
                                  <p className="text-xs text-muted-foreground font-mono">@{u.username}</p>
                                </div>
                              </td>
                              <td className="p-3">
                                <Badge variant="outline" className={`text-xs ${c.border} ${c.bg}`}>
                                  {u.role}
                                </Badge>
                              </td>
                              <td className="p-3 text-muted-foreground">{u.email || '-'}</td>
                              <td className="p-3 text-muted-foreground">{u.phone || '-'}</td>
                              <td className="p-3">
                                {u.isActive ? (
                                  <span className="inline-flex items-center gap-1 text-primary text-xs font-medium">
                                    <CheckCircle2 className="size-3.5" />
                                    {t('active_label')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400 text-xs font-medium">
                                    <XCircle className="size-3.5" />
                                    {t('inactive_label')}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                                {u.lastLogin ? (
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {formatDate(u.lastLogin, isRTL)}
                                  </span>
                                ) : (
                                  <span>{t('never')}</span>
                                )}
                              </td>
                              <td className="p-3">
                                {u.isActive && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-7 text-destructive hover:text-destructive"
                                    onClick={() => confirmDeleteUser(u.id)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ═══════════ BACKUP TAB ═══════════ */}
        <TabsContent value="backup" className="mt-4">
          <BackupManager />
        </TabsContent>

        {/* ═══════════ APPEARANCE TAB ═══════════ */}
        <TabsContent value="appearance" className="space-y-6 mt-4">
          {/* Light / Dark Toggle */}
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {theme === 'light' ? <Sun className="size-5 text-amber-500" /> : <Moon className="size-5 text-indigo-400" />}
                  {t('mode_label')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => { if (theme !== 'light') toggleTheme(); }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all flex-1 max-w-[160px]',
                      theme === 'light'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-transparent bg-muted/50 hover:bg-muted',
                    )}
                  >
                    <Sun className={cn('size-6', theme === 'light' ? 'text-amber-500' : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', theme === 'light' ? 'text-foreground' : 'text-muted-foreground')}>
                      {t('light')}
                    </span>
                    {theme === 'light' && (
                      <CheckCircle2 className="size-4 text-primary" />
                    )}
                  </button>
                  <button
                    onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all flex-1 max-w-[160px]',
                      theme === 'dark'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-transparent bg-muted/50 hover:bg-muted',
                    )}
                  >
                    <Moon className={cn('size-6', theme === 'dark' ? 'text-indigo-400' : 'text-muted-foreground')} />
                    <span className={cn('text-sm font-medium', theme === 'dark' ? 'text-foreground' : 'text-muted-foreground')}>
                      {t('dark')}
                    </span>
                    {theme === 'dark' && (
                      <CheckCircle2 className="size-4 text-primary" />
                    )}
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Color Theme Selector */}
          <motion.div variants={fadeUp}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="size-5 text-primary" />
                  {t('color_theme_label')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('color_theme_desc')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                  {ALL_THEMES.map((th) => {
                    const isActive = colorTheme === th.id;
                    return (
                      <button
                        key={th.id}
                        onClick={() => setColorTheme(th.id as ColorTheme)}
                        className={cn(
                          'group relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all hover:shadow-md cursor-pointer',
                          isActive
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-transparent bg-muted/50 hover:bg-muted hover:border-border/50',
                        )}
                      >
                        {/* Active check */}
                        {isActive && (
                          <div className={cn('absolute top-2 end-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground')}>
                            <svg className="size-3" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </div>
                        )}

                        {/* Color swatches */}
                        <div className="flex gap-1.5">
                          {th.swatches.map((color, i) => (
                            <span
                              key={i}
                              className="size-8 rounded-lg shadow-sm ring-1 ring-black/10 transition-transform group-hover:scale-110"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>

                        {/* Theme name */}
                        <span className={cn(
                          'text-xs font-medium transition-colors',
                          isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                        )}>
                          {isRTL ? th.labelFa : th.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* ═══════════ DEPARTMENT DIALOG ═══════════ */}
      {/* FIX #9: responsive width with w-[calc(100%-2rem)] */}
      <Dialog open={deptDialogOpen} onOpenChange={(v) => { setDeptDialogOpen(v); if (!v) setSelectedDept(null); }}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>{selectedDept ? t('edit') : t('add')} {t('departments')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* FIX #8: grid-cols-1 sm:grid-cols-2 — stacks on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('name_en')}</Label>
                <Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('name_fa')}</Label>
                <Input value={deptForm.nameFa} onChange={(e) => setDeptForm({ ...deptForm, nameFa: e.target.value })} dir="rtl" />
              </div>
            </div>
            {/* FIX #8: grid-cols-1 sm:grid-cols-2 — stacks on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{isRTL ? 'طبقه' : 'Floor'}</Label>
                <Input type="number" value={deptForm.floor} onChange={(e) => setDeptForm({ ...deptForm, floor: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('phone')}</Label>
                <Input value={deptForm.phone} onChange={(e) => setDeptForm({ ...deptForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{isRTL ? 'توضیحات' : 'Description'}</Label>
              <Textarea value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} />
            </div>
            <Button onClick={saveDept} className="w-full bg-primary hover:bg-primary/90">{t('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ USER DIALOG ═══════════ */}
      {/* FIX #9: responsive width with w-[calc(100%-2rem)] */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>{t('add_new_user')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* FIX #7: grid-cols-1 sm:grid-cols-2 — stacks on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('full_name_label')}</Label>
                <Input
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('username_label')}</Label>
                <Input
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="johndoe"
                  className="font-mono"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('role_label')}</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{isRTL ? 'مدیر سیستم' : 'System Admin'}</SelectItem>
                  <SelectItem value="doctor">{isRTL ? 'پزشک' : 'Doctor'}</SelectItem>
                  <SelectItem value="nurse">{isRTL ? 'پرستار' : 'Nurse'}</SelectItem>
                  <SelectItem value="receptionist">{isRTL ? 'پذیرش' : 'Receptionist'}</SelectItem>
                  <SelectItem value="accountant">{isRTL ? 'حسابدار' : 'Accountant'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* FIX #7: grid-cols-1 sm:grid-cols-2 — stacks on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('email_label')}</Label>
                <Input
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="user@hospital.com"
                  type="email"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('phone')}</Label>
                <Input
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="09120000000"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t('password_label')}</Label>
              <div className="relative">
                <Input
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  dir="ltr"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 size-9 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
            </div>
            <Button
              onClick={saveUser}
              className="w-full bg-primary hover:bg-primary/90"
              disabled={userSaving}
            >
              {userSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {t('create_user')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══════════ CONFIRM DIALOGS ═══════════ */}
      <ConfirmDialog
        open={seedOpen}
        onClose={() => setSeedOpen(false)}
        onConfirm={handleSeed}
        title={t('reset_database')}
        description={t('reset_database_warning')}
        variant="danger"
      />
      <ConfirmDialog
        open={deleteUserOpen}
        onClose={() => { setDeleteUserOpen(false); setTargetUserId(null); }}
        onConfirm={deactivateUser}
        title={t('deactivate_user')}
        description={t('deactivate_user_confirm')}
        variant="danger"
      />
      <ConfirmDialog
        open={deleteDeptOpen}
        onClose={() => { setDeleteDeptOpen(false); setTargetDeptId(null); }}
        onConfirm={deleteDept}
        title={t('delete_department')}
        description={t('delete_department_confirm')}
        variant="danger"
      />
    </motion.div>
  );
}

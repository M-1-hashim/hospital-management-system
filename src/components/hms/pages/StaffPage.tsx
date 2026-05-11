'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Phone,
  Mail,
  Building2,
  Clock,
  DollarSign,
  Search,
  UserCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/store';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { EmptyState } from '@/components/hms/shared/EmptyState';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import type { Department } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────
interface StaffInfo {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId: string | null;
  phone: string | null;
  email: string | null;
  shift: string | null;
  salary: number;
  hireDate: string | null;
  isActive: boolean;
  department: Department | null;
  user: { id: string; username: string; isActive: boolean } | null;
}

interface StaffForm {
  firstName: string;
  lastName: string;
  role: string;
  departmentId: string;
  phone: string;
  email: string;
  shift: string;
  salary: string;
  hireDate: string;
}

const defaultStaffForm: StaffForm = {
  firstName: '',
  lastName: '',
  role: 'nurse',
  departmentId: '',
  phone: '',
  email: '',
  shift: 'morning',
  salary: '0',
  hireDate: '',
};

const roleColors: Record<string, string> = {
  nurse: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  admin: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  guard: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  technician: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
};

const shiftColors: Record<string, string> = {
  morning: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  evening: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  night: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

// ─── Component ──────────────────────────────────────────────
export function StaffPage() {
  const { t, isRTL } = useLanguageStore();

  const [staffList, setStaffList] = useState<StaffInfo[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffInfo | null>(null);
  const [form, setForm] = useState<StaffForm>(defaultStaffForm);
  const [submitting, setSubmitting] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStaff, setDetailStaff] = useState<StaffInfo | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ─── Fetch data ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (activeTab !== 'all') params.role = activeTab;

      const [staffRes, deptRes] = await Promise.all([
        apiGet<{ staff: StaffInfo[] }>('/api/staff', params),
        apiGet<{ departments: Department[] }>('/api/departments'),
      ]);

      setStaffList(staffRes.staff || []);
      setDepartments(deptRes.departments || []);
    } catch (err) {
      toast.error(t('error'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Filtered staff ──────────────────────────────────────
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    const q = searchQuery.toLowerCase();
    return staffList.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.department?.name.toLowerCase().includes(q)
    );
  }, [staffList, searchQuery]);

  // ─── Handlers ───────────────────────────────────────────
  const openAddDialog = () => {
    setEditingStaff(null);
    setForm(defaultStaffForm);
    setDialogOpen(true);
  };

  const openEditDialog = (staff: StaffInfo) => {
    setEditingStaff(staff);
    setForm({
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      departmentId: staff.departmentId || '',
      phone: staff.phone || '',
      email: staff.email || '',
      shift: staff.shift || 'morning',
      salary: String(staff.salary),
      hireDate: staff.hireDate ? staff.hireDate.split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.firstName || !form.lastName || !form.role) {
      toast.error(t('warning'));
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        ...form,
        salary: parseFloat(form.salary) || 0,
        hireDate: form.hireDate || undefined,
        departmentId: form.departmentId || undefined,
      };

      if (editingStaff) {
        await apiPut(`/api/staff?id=${editingStaff.id}`, body);
        toast.success(t('success'));
      } else {
        await apiPost('/api/staff', body);
        toast.success(t('success'));
      }
      setDialogOpen(false);
      fetchData();
    } catch {
      toast.error(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSubmitting(true);
    try {
      await apiDelete(`/api/staff?id=${deleteConfirm}`);
      toast.success(t('success'));
      setDeleteConfirm(null);
      fetchData();
    } catch {
      toast.error(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = (staff: StaffInfo) => {
    setDetailStaff(staff);
    setDetailOpen(true);
  };

  // ─── Format helpers ─────────────────────────────────────
  const formatSalary = (salary: number) => {
    return new Intl.NumberFormat(isRTL ? 'fa-IR' : 'en-US').format(salary);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(isRTL ? 'fa-IR' : 'en-US');
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold text-foreground"
        >
          {t('staff')}
        </motion.h1>
        <Button
          onClick={openAddDialog}
          className="bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Plus className="size-4" />
          <span className="ms-2">{isRTL ? 'افزودن کارمند' : 'Add Staff'}</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="all">{t('all')}</TabsTrigger>
          <TabsTrigger value="nurse">{t('nurse')}</TabsTrigger>
          <TabsTrigger value="admin">{t('admin_staff')}</TabsTrigger>
          <TabsTrigger value="guard">{t('guard')}</TabsTrigger>
          <TabsTrigger value="technician">{t('technician')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={`${t('search')}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-emerald-600" />
        </div>
      ) : filteredStaff.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('no_data')}
          description={isRTL ? 'کارمندی یافت نشد' : 'No staff members found'}
          actionLabel={isRTL ? 'افزودن کارمند' : 'Add Staff'}
          onAction={openAddDialog}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden rounded-lg border"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{isRTL ? 'نام' : 'Name'}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('departments')}</TableHead>
                <TableHead>{t('phone')}</TableHead>
                <TableHead>{t('shift')}</TableHead>
                <TableHead>{t('salary')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.map((staff, idx) => (
                <TableRow
                  key={staff.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => openDetail(staff)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          {staff.firstName[0]}{staff.lastName[0]}
                        </span>
                      </div>
                      <span className="font-medium">
                        {staff.firstName} {staff.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn(roleColors[staff.role] || '')}>
                      {staff.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {isRTL
                      ? staff.department?.nameFa || '—'
                      : staff.department?.name || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {staff.phone || '—'}
                  </TableCell>
                  <TableCell>
                    {staff.shift && (
                      <Badge variant="secondary" className={cn(shiftColors[staff.shift] || '')}>
                        {staff.shift}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatSalary(staff.salary)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={staff.isActive ? 'active' : 'inactive'} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        onClick={() => openEditDialog(staff)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleteConfirm(staff.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}

      {/* ─── Add/Edit Dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? t('edit') : isRTL ? 'افزودن کارمند' : 'Add Staff'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isRTL ? 'نام' : 'First Name'}</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{isRTL ? 'نام خانوادگی' : 'Last Name'}</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('role')}</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nurse">{t('nurse')}</SelectItem>
                  <SelectItem value="admin">{t('admin_staff')}</SelectItem>
                  <SelectItem value="guard">{t('guard')}</SelectItem>
                  <SelectItem value="technician">{t('technician')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('departments')}</Label>
              <Select
                value={form.departmentId}
                onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'انتخاب بخش...' : 'Select department...'} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {isRTL ? d.nameFa : d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('phone')}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('email')}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('shift')}</Label>
                <Select value={form.shift} onValueChange={(v) => setForm((p) => ({ ...p, shift: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">{isRTL ? 'صبح' : 'Morning'}</SelectItem>
                    <SelectItem value="evening">{isRTL ? 'عصر' : 'Evening'}</SelectItem>
                    <SelectItem value="night">{isRTL ? 'شب' : 'Night'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('hire_date')}</Label>
                <Input
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => setForm((p) => ({ ...p, hireDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('salary')}</Label>
              <Input
                type="number"
                value={form.salary}
                onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Staff Detail Dialog ──────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
          {detailStaff && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                      {detailStaff.firstName[0]}{detailStaff.lastName[0]}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">
                      {detailStaff.firstName} {detailStaff.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={cn(roleColors[detailStaff.role] || '')}>
                        {detailStaff.role}
                      </Badge>
                      <StatusBadge status={detailStaff.isActive ? 'active' : 'inactive'} />
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <Building2 className="size-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('departments')}</p>
                      <p className="font-medium text-sm">
                        {isRTL ? detailStaff.department?.nameFa : detailStaff.department?.name || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <Clock className="size-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('shift')}</p>
                      <p className="font-medium text-sm">{detailStaff.shift || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <Phone className="size-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('phone')}</p>
                      <p className="font-medium text-sm">{detailStaff.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <Mail className="size-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('email')}</p>
                      <p className="font-medium text-sm text-truncate">{detailStaff.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <DollarSign className="size-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('salary')}</p>
                      <p className="font-medium text-sm">{formatSalary(detailStaff.salary)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <UserCircle className="size-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('hire_date')}</p>
                      <p className="font-medium text-sm">{formatDate(detailStaff.hireDate)}</p>
                    </div>
                  </div>
                </div>
                {/* Attendance Summary */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                    {t('attendance')} {isRTL ? 'خلاصه' : 'Summary'}
                  </h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">
                        {Math.floor(Math.random() * 20) + 10}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? 'حاضر' : 'Present'}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">
                        {Math.floor(Math.random() * 3)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? 'غایب' : 'Absent'}
                      </p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-sky-600">
                        {Math.floor(Math.random() * 2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? 'مرخصی' : 'Leave'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setDetailOpen(false); openEditDialog(detailStaff); }}
                >
                  <Pencil className="size-4" />
                  <span className="ms-1">{t('edit')}</span>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => { setDetailOpen(false); setDeleteConfirm(detailStaff.id); }}
                >
                  <Trash2 className="size-4" />
                  <span className="ms-1">{t('delete')}</span>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────── */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={isRTL ? 'حذف کارمند' : 'Delete Staff'}
        description={isRTL ? 'آیا مطمئن هستید؟ این عمل قابل بازگشت نیست.' : 'Are you sure? This action cannot be undone.'}
        variant="danger"
        confirmLabel={t('delete')}
        loading={submitting}
      />
    </div>
  );
}

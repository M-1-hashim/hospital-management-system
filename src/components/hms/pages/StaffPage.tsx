'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Pencil, Trash2, Loader2, Phone, Mail, Building2,
  Clock, DollarSign, Search, UserCircle, Calendar, ChevronLeft,
  ChevronRight, LogIn, LogOut, Download, AlertTriangle, CheckCircle2,
  XCircle,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { EmptyState } from '@/components/hms/shared/EmptyState';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import { CollapsiblePanel } from '@/components/hms/shared/CollapsiblePanel';
import type { Department } from '@/lib/db';
import * as XLSX from 'xlsx';

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

interface ShiftSchedule {
  id: string;
  staffId: string;
  date: string;
  shiftType: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  staff: { id: string; firstName: string; lastName: string; role: string; department: { id: string; name: string; nameFa: string } | null } | null;
}

interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalHours: number | null;
  status: string;
  notes: string | null;
  staff: { id: string; firstName: string; lastName: string; role: string; department: { id: string; name: string; nameFa: string } | null } | null;
}

interface PayrollRow {
  staffId: string;
  name: string;
  role: string;
  baseSalary: number;
  overtimeHours: number;
  deductions: number;
  bonuses: number;
  netPay: number;
}

const defaultStaffForm: StaffForm = {
  firstName: '', lastName: '', role: 'nurse', departmentId: '',
  phone: '', email: '', shift: 'morning', salary: '0', hireDate: '',
};

const roleColors: Record<string, string> = {
  nurse: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  admin: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  guard: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  technician: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
};

const shiftColors: Record<string, string> = {
  morning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  evening: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  night: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
};

const shiftBadgeDot: Record<string, string> = {
  morning: 'bg-yellow-500',
  evening: 'bg-blue-500',
  night: 'bg-purple-500',
};

const attendanceStatusColors: Record<string, string> = {
  present: 'text-emerald-600',
  absent: 'text-red-600',
  late: 'text-amber-600',
  half_day: 'text-sky-600',
};

// ─── Component ──────────────────────────────────────────────
export function StaffPage() {
  const { t, isRTL } = useLanguageStore();

  // ─── Staff State ──────────────────────────────────────────
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

  // ─── Shift State ──────────────────────────────────────────
  const [shifts, setShifts] = useState<ShiftSchedule[]>([]);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({ staffId: '', shiftType: 'morning', startTime: '08:00', endTime: '16:00', notes: '' });

  // ─── Attendance State ─────────────────────────────────────
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState({ presentToday: 0, absentToday: 0, lateToday: 0 });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceMonth, setAttendanceMonth] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  // ─── Payroll State ────────────────────────────────────────
  const [payrollRows, setPayrollRows] = useState<PayrollRow[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // ─── Fetch staff data ────────────────────────────────────
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

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Fetch shifts ────────────────────────────────────────
  const fetchShifts = useCallback(async () => {
    try {
      setShiftLoading(true);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      const res = await apiGet<{ shifts: ShiftSchedule[] }>('/api/shifts', {
        dateFrom: currentWeekStart.toISOString(),
        dateTo: weekEnd.toISOString(),
      });
      setShifts(res.shifts || []);
    } catch {
      toast.error(t('error'));
    } finally {
      setShiftLoading(false);
    }
  }, [currentWeekStart, t]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  // ─── Fetch attendance ─────────────────────────────────────
  const fetchAttendance = useCallback(async () => {
    try {
      setAttendanceLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await apiGet<{ attendances: AttendanceRecord[]; summary: { presentToday: number; absentToday: number; lateToday: number } }>('/api/attendance', {
        dateFrom: today,
        dateTo: today,
      });
      setAttendanceList(res.attendances || []);
      setAttendanceSummary(res.summary || { presentToday: 0, absentToday: 0, lateToday: 0 });
    } catch {
      toast.error(t('error'));
    } finally {
      setAttendanceLoading(false);
    }
  }, [t]);

  // ─── Week days helper ─────────────────────────────────────
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  // ─── Build heatmap data for attendance month view ─────────
  const heatmapDays = useMemo(() => {
    const [year, month] = attendanceMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${attendanceMonth}-${String(day).padStart(2, '0')}`;
      return { day, dateStr };
    });
  }, [attendanceMonth]);

  // ─── Attendance heatmap color ─────────────────────────────
  const getHeatmapColor = (dateStr: string) => {
    const record = attendanceList.find((a) => a.date?.startsWith(dateStr));
    if (!record) return 'bg-muted/30';
    switch (record.status) {
      case 'present': return 'bg-emerald-400';
      case 'absent': return 'bg-red-400';
      case 'late': return 'bg-amber-400';
      case 'half_day': return 'bg-sky-400';
      default: return 'bg-muted/30';
    }
  };

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
        s.department?.name.toLowerCase().includes(q),
    );
  }, [staffList, searchQuery]);

  // ─── Shifts grouped by day ───────────────────────────────
  const shiftsByDay = useMemo(() => {
    const map: Record<string, ShiftSchedule[]> = {};
    for (const shift of shifts) {
      const dayStr = new Date(shift.date).toISOString().split('T')[0];
      if (!map[dayStr]) map[dayStr] = [];
      map[dayStr].push(shift);
    }
    return map;
  }, [shifts]);

  // ─── Handlers ───────────────────────────────────────────
  const openAddDialog = () => {
    setEditingStaff(null);
    setForm(defaultStaffForm);
    setDialogOpen(true);
  };

  const openEditDialog = (staff: StaffInfo) => {
    setEditingStaff(staff);
    setForm({
      firstName: staff.firstName, lastName: staff.lastName, role: staff.role,
      departmentId: staff.departmentId || '', phone: staff.phone || '',
      email: staff.email || '', shift: staff.shift || 'morning',
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
      } else {
        await apiPost('/api/staff', body);
      }
      toast.success(t('success'));
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

  // ─── Shift handlers ───────────────────────────────────────
  const handleCreateShift = async () => {
    if (!shiftForm.staffId) { toast.error(t('warning')); return; }
    setSubmitting(true);
    try {
      const dateStr = weekDays[0].toISOString().split('T')[0];
      const startDateTime = `${dateStr}T${shiftForm.startTime}:00`;
      const endDateTime = `${dateStr}T${shiftForm.endTime}:00`;
      await apiPost('/api/shifts', {
        staffId: shiftForm.staffId,
        date: dateStr,
        shiftType: shiftForm.shiftType,
        startTime: startDateTime,
        endTime: endDateTime,
        notes: shiftForm.notes || undefined,
      });
      toast.success(t('shift_assigned'));
      setShiftDialogOpen(false);
      fetchShifts();
    } catch {
      toast.error(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteShift = async (id: string) => {
    try {
      await apiDelete(`/api/shifts?id=${id}`);
      toast.success(t('deleted'));
      fetchShifts();
    } catch {
      toast.error(t('error'));
    }
  };

  const prevWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };
  const nextWeek = () => {
    setCurrentWeekStart((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  // ─── Attendance handlers ──────────────────────────────────
  const handleClockIn = async (staffId: string) => {
    try {
      await apiPost('/api/attendance', { staffId });
      toast.success(t('clock_in_success'));
      fetchAttendance();
    } catch (err: unknown) {
      const e = err as { message?: string };
      if (e.message?.includes('409') || e.message?.includes('Already')) {
        toast.error(t('already_clocked_in'));
      } else {
        toast.error(t('error'));
      }
    }
  };

  const handleClockOut = async (attendanceId: string) => {
    try {
      await apiPut(`/api/attendance?id=${attendanceId}&action=clockOut`);
      toast.success(t('clock_out_success'));
      fetchAttendance();
    } catch {
      toast.error(t('error'));
    }
  };

  const handleMarkAbsent = async (attendanceId: string) => {
    try {
      await apiPut(`/api/attendance?id=${attendanceId}&action=markAbsent`);
      toast.success(t('success'));
      fetchAttendance();
    } catch {
      toast.error(t('error'));
    }
  };

  const handleMarkLate = async (attendanceId: string) => {
    try {
      await apiPut(`/api/attendance?id=${attendanceId}&action=markLate`);
      toast.success(t('success'));
      fetchAttendance();
    } catch {
      toast.error(t('error'));
    }
  };

  const exportAttendance = () => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = [
        [t('full_name'), t('role'), t('date'), t('clock_in'), t('clock_out'), t('total_hours'), t('status')],
        ...attendanceList.map((a) => [
          `${a.staff?.firstName || ''} ${a.staff?.lastName || ''}`,
          a.staff?.role || '',
          a.date ? new Date(a.date).toLocaleDateString() : '',
          a.clockIn ? new Date(a.clockIn).toLocaleTimeString() : '',
          a.clockOut ? new Date(a.clockOut).toLocaleTimeString() : '',
          a.totalHours || 0,
          a.status,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, t('attendance'));
      XLSX.writeFile(wb, `attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(t('attendance_exported'));
    } catch {
      toast.error(t('error'));
    }
  };

  // ─── Payroll handlers ─────────────────────────────────────
  const handleGeneratePayroll = async () => {
    try {
      setPayrollLoading(true);
      const [year, month] = attendanceMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1).toISOString();
      const monthEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

      const [allStaff, attRes] = await Promise.all([
        apiGet<{ staff: StaffInfo[] }>('/api/staff'),
        apiGet<{ attendances: AttendanceRecord[] }>('/api/attendance', { dateFrom: monthStart, dateTo: monthEnd }),
      ]);

      const allAtt = attRes.attendances || [];
      const rows: PayrollRow[] = allStaff.staff.map((s) => {
        const staffAtt = allAtt.filter((a) => a.staffId === s.id);
        const presentDays = staffAtt.filter((a) => a.status === 'present').length;
        const totalHrs = staffAtt.reduce((sum, a) => sum + (a.totalHours || 0), 0);
        const overtimeHours = Math.max(0, totalHrs - presentDays * 8);
        const deductions = staffAtt.filter((a) => a.status === 'absent').length * (s.salary / 30);
        const bonuses = Math.round(salary * 0.05); // 5% of salary as bonus
        const salary = s.salary;
        const netPay = salary - deductions + bonuses + overtimeHours * 20;
        return { staffId: s.id, name: `${s.firstName} ${s.lastName}`, role: s.role, baseSalary: salary, overtimeHours: Math.round(overtimeHours * 100) / 100, deductions: Math.round(deductions), bonuses, netPay: Math.round(netPay) };
      });
      setPayrollRows(rows);
      toast.success(t('payroll_generated'));
    } catch {
      toast.error(t('error'));
    } finally {
      setPayrollLoading(false);
    }
  };

  const exportPayroll = () => {
    try {
      const wb = XLSX.utils.book_new();
      const rows = [
        [t('full_name'), t('role'), t('base_salary'), t('overtime'), t('deductions'), t('bonuses'), t('net_pay')],
        ...payrollRows.map((r) => [r.name, r.role, r.baseSalary, r.overtimeHours, r.deductions, r.bonuses, r.netPay]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, t('payroll'));
      XLSX.writeFile(wb, `payroll_${attendanceMonth}.xlsx`);
      toast.success(t('success'));
    } catch {
      toast.error(t('error'));
    }
  };

  // ─── Format helpers ─────────────────────────────────────
  const formatSalary = (salary: number) =>
    new Intl.NumberFormat(isRTL ? 'fa-IR' : 'en-US').format(salary);
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(isRTL ? 'fa-IR' : 'en-US');
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <motion.h1 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl font-bold text-foreground">
          {t('staff')}
        </motion.h1>
        <Button onClick={openAddDialog} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="size-4" />
          <span className="ms-2">{t('add_staff')}</span>
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="roster">
        <TabsList className="bg-muted flex-wrap">
          <TabsTrigger value="roster" className="text-xs sm:text-sm">{t('staff_list')}</TabsTrigger>
          <TabsTrigger value="shifts" className="text-xs sm:text-sm">{t('shift_schedule')}</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs sm:text-sm">{t('attendance')}</TabsTrigger>
          <TabsTrigger value="payroll" className="text-xs sm:text-sm">{t('payroll')}</TabsTrigger>
        </TabsList>

        {/* ===== ROSTER TAB ===== */}
        <TabsContent value="roster" className="space-y-4">
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
            <Input placeholder={`${t('search')}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-9" />
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <EmptyState icon={Users} title={t('no_data')} description={t('no_staff_found')} actionLabel={t('add_staff')} onAction={openAddDialog} />
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <CollapsiblePanel id="staff-list" icon={Users} title={t('staff_list')} badge={filteredStaff.length} defaultOpen={true}>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>{t('full_name')}</TableHead>
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
                      {filteredStaff.map((staff) => (
                        <TableRow key={staff.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => openDetail(staff)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex size-8 items-center justify-center rounded-full bg-primary/10">
                                <span className="text-xs font-bold text-primary">{staff.firstName[0]}{staff.lastName[0]}</span>
                              </div>
                              <span className="font-medium">{staff.firstName} {staff.lastName}</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary" className={cn(roleColors[staff.role] || '')}>{staff.role}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{isRTL ? staff.department?.nameFa || '—' : staff.department?.name || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{staff.phone || '—'}</TableCell>
                          <TableCell>{staff.shift && <Badge variant="secondary" className={cn(shiftColors[staff.shift] || '')}>{staff.shift}</Badge>}</TableCell>
                          <TableCell className="font-medium">{formatSalary(staff.salary)}</TableCell>
                          <TableCell><StatusBadge status={staff.isActive ? 'active' : 'inactive'} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="size-7 text-primary hover:bg-primary/5" onClick={() => openEditDialog(staff)}><Pencil className="size-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="size-7 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleteConfirm(staff.id)}><Trash2 className="size-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsiblePanel>
            </motion.div>
          )}
        </TabsContent>

        {/* ===== SHIFT SCHEDULE TAB ===== */}
        <TabsContent value="shifts" className="space-y-4">
          <CollapsiblePanel id="shift-schedule" icon={Calendar} title={t('shift_schedule')}>
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="sm" onClick={prevWeek}><ChevronLeft className="size-4" /> {t('prev_week')}</Button>
              <div className="text-sm font-medium">
                {weekDays[0]?.toLocaleDateString()} — {weekDays[6]?.toLocaleDateString()}
              </div>
              <Button variant="outline" size="sm" onClick={nextWeek}>{t('next_week')} <ChevronRight className="size-4" /></Button>
            </div>

            <div className="flex justify-end mb-4">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { setShiftForm({ staffId: '', shiftType: 'morning', startTime: '08:00', endTime: '16:00', notes: '' }); setShiftDialogOpen(true); }}>
                <Plus className="size-4" /> {t('assign_shift')}
              </Button>
            </div>

            {shiftLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="size-8 animate-spin text-primary" /></div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Calendar className="size-10 mx-auto mb-2 opacity-30" /><p>{t('no_shifts_this_week')}</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-start font-medium">{t('full_name')}</th>
                      {weekDays.map((d) => (
                        <th key={d.toISOString()} className="p-2 text-center font-medium min-w-[100px]">
                          <div className="text-xs text-muted-foreground">{d.toLocaleDateString('en', { weekday: 'short' })}</div>
                          <div className="text-xs">{d.getDate()}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {staffList.filter((s) => s.isActive).map((staff) => (
                      <tr key={staff.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                              <span className="text-[10px] font-bold text-primary">{staff.firstName[0]}{staff.lastName[0]}</span>
                            </div>
                            <span className="text-xs font-medium">{staff.firstName} {staff.lastName}</span>
                          </div>
                        </td>
                        {weekDays.map((d) => {
                          const dayStr = d.toISOString().split('T')[0];
                          const dayShifts = shiftsByDay[dayStr]?.filter((s) => s.staffId === staff.id) || [];
                          return (
                            <td key={dayStr} className="p-1 text-center">
                              {dayShifts.map((shift) => (
                                <div key={shift.id} className="flex items-center justify-center gap-1 mb-1">
                                  <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', shiftColors[shift.shiftType])}>
                                    <span className={cn('inline-block size-1.5 rounded-full me-1', shiftBadgeDot[shift.shiftType])} />
                                    {shift.shiftType}
                                  </Badge>
                                  <Button variant="ghost" size="icon" className="size-5 text-destructive" onClick={() => handleDeleteShift(shift.id)}>
                                    <XCircle className="size-3" />
                                  </Button>
                                </div>
                              ))}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsiblePanel>
        </TabsContent>

        {/* ===== ATTENDANCE TAB ===== */}
        <TabsContent value="attendance" className="space-y-4">
          <CollapsiblePanel id="attendance-panel" icon={Clock} title={t('attendance')}>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="size-6 mx-auto text-emerald-600 mb-1" />
                  <p className="text-2xl font-bold text-emerald-700">{attendanceSummary.presentToday}</p>
                  <p className="text-xs text-emerald-600">{t('present_today')}</p>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
                <CardContent className="p-4 text-center">
                  <XCircle className="size-6 mx-auto text-red-600 mb-1" />
                  <p className="text-2xl font-bold text-red-700">{attendanceSummary.absentToday}</p>
                  <p className="text-xs text-red-600">{t('absent_today')}</p>
                </CardContent>
              </Card>
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="size-6 mx-auto text-amber-600 mb-1" />
                  <p className="text-2xl font-bold text-amber-700">{attendanceSummary.lateToday}</p>
                  <p className="text-xs text-amber-600">{t('late_today')}</p>
                </CardContent>
              </Card>
            </div>

            {/* Clock In / Out Buttons + Export */}
            <div className="flex flex-wrap gap-2 mb-4">
              {staffList.filter((s) => s.isActive).map((s) => {
                const existing = attendanceList.find((a) => a.staffId === s.id);
                return (
                  <Button key={s.id} size="sm" variant={existing?.clockIn ? 'outline' : 'default'} className="gap-1" disabled={existing?.clockOut ? true : false} onClick={() => existing?.clockIn ? handleClockOut(existing.id) : handleClockIn(s.id)}>
                    {existing?.clockIn ? (existing.clockOut ? <CheckCircle2 className="size-3" /> : <><LogOut className="size-3" /> {t('clock_out')}</>) : <><LogIn className="size-3" /> {t('clock_in')}</>}
                    <span className="text-[10px]">{s.firstName}</span>
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" onClick={exportAttendance}><Download className="size-3" /></Button>
            </div>

            {/* Today's Attendance Table */}
            <div className="overflow-x-auto mb-6">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>{t('full_name')}</TableHead>
                    <TableHead>{t('role')}</TableHead>
                    <TableHead>{t('clock_in')}</TableHead>
                    <TableHead>{t('clock_out')}</TableHead>
                    <TableHead>{t('total_hours')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="size-6 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : attendanceList.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('no_attendance_today')}</TableCell></TableRow>
                  ) : (
                    attendanceList.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell className="font-medium">{att.staff?.firstName} {att.staff?.lastName}</TableCell>
                        <TableCell>{att.staff?.role}</TableCell>
                        <TableCell className="text-xs">{att.clockIn ? new Date(att.clockIn).toLocaleTimeString() : '—'}</TableCell>
                        <TableCell className="text-xs">{att.clockOut ? new Date(att.clockOut).toLocaleTimeString() : '—'}</TableCell>
                        <TableCell>{att.totalHours?.toFixed(1) || '—'}</TableCell>
                        <TableCell><span className={cn('font-medium capitalize', attendanceStatusColors[att.status] || '')}>{att.status}</span></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="size-6 text-amber-600" title={t('mark_absent')} onClick={() => handleMarkAbsent(att.id)}><XCircle className="size-3" /></Button>
                            <Button variant="ghost" size="icon" className="size-6 text-yellow-600" title={t('mark_late')} onClick={() => handleMarkLate(att.id)}><AlertTriangle className="size-3" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Monthly Calendar Heatmap */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">{t('monthly_heatmap')}</h4>
                <Input type="month" value={attendanceMonth} onChange={(e) => setAttendanceMonth(e.target.value)} className="w-40 h-8 text-xs" />
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
                ))}
                {(() => {
                  const [year, month] = attendanceMonth.split('-').map(Number);
                  const firstDay = new Date(year, month - 1, 1).getDay();
                  const offset = firstDay === 0 ? 6 : firstDay - 1;
                  return Array.from({ length: offset }).map((_, i) => <div key={`empty-${i}`} />);
                })()}
                {heatmapDays.map(({ day, dateStr }) => (
                  <div key={dateStr} className={cn('rounded-sm aspect-square flex items-center justify-center text-[10px] font-medium', getHeatmapColor(dateStr))}>
                    {day}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-emerald-400" /> {t('present')}</div>
                <div className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-red-400" /> {t('absent')}</div>
                <div className="flex items-center gap-1"><span className="inline-block size-2 rounded-sm bg-amber-400" /> {t('late_today')}</div>
              </div>
            </div>
          </CollapsiblePanel>
        </TabsContent>

        {/* ===== PAYROLL TAB ===== */}
        <TabsContent value="payroll" className="space-y-4">
          <CollapsiblePanel id="payroll-panel" icon={DollarSign} title={t('payroll')}>
            <div className="flex items-center gap-3 mb-4">
              <Input type="month" value={attendanceMonth} onChange={(e) => setAttendanceMonth(e.target.value)} className="w-40 h-8 text-xs" />
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleGeneratePayroll} disabled={payrollLoading}>
                {payrollLoading && <Loader2 className="size-4 animate-spin" />}
                <DollarSign className="size-4" /> {t('generate_payroll')}
              </Button>
              {payrollRows.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportPayroll}><Download className="size-3" /> {t('export_payroll')}</Button>
              )}
            </div>

            {payrollRows.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>{t('full_name')}</TableHead>
                      <TableHead>{t('role')}</TableHead>
                      <TableHead>{t('base_salary')}</TableHead>
                      <TableHead>{t('overtime')}</TableHead>
                      <TableHead>{t('deductions')}</TableHead>
                      <TableHead>{t('bonuses')}</TableHead>
                      <TableHead>{t('net_pay')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRows.map((row) => (
                      <TableRow key={row.staffId}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>{formatSalary(row.baseSalary)}</TableCell>
                        <TableCell>{row.overtimeHours}h</TableCell>
                        <TableCell className="text-red-600">-{formatSalary(row.deductions)}</TableCell>
                        <TableCell className="text-emerald-600">+{formatSalary(row.bonuses)}</TableCell>
                        <TableCell className="font-bold text-primary">{formatSalary(row.netPay)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {payrollRows.length === 0 && !payrollLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="size-10 mx-auto mb-2 opacity-30" />
                <p>{t('no_data')}</p>
              </div>
            )}
          </CollapsiblePanel>
        </TabsContent>
      </Tabs>

      {/* ─── Add/Edit Dialog ─────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{editingStaff ? t('edit') : t('add_staff')}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('first_name')}</Label><Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{t('last_name')}</Label><Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
            </div>
            <div className="space-y-2">
              <Label>{t('role')}</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={form.departmentId} onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v }))}>
                <SelectTrigger><SelectValue placeholder={isRTL ? 'انتخاب بخش...' : 'Select department...'} /></SelectTrigger>
                <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{isRTL ? d.nameFa : d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('phone')}</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{t('email')}</Label><Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('shift')}</Label>
                <Select value={form.shift} onValueChange={(v) => setForm((p) => ({ ...p, shift: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">{t('shift_morning')}</SelectItem>
                    <SelectItem value="evening">{t('shift_evening')}</SelectItem>
                    <SelectItem value="night">{t('shift_night')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>{t('hire_date')}</Label><Input type="date" value={form.hireDate} onChange={(e) => setForm((p) => ({ ...p, hireDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>{t('salary')}</Label><Input type="number" value={form.salary} onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {submitting && <Loader2 className="size-4 animate-spin" />}{t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Shift Assign Dialog ──────────────────────────── */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="max-w-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader><DialogTitle>{t('assign_shift')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('select_staff')}</Label>
              <Select value={shiftForm.staffId} onValueChange={(v) => setShiftForm((p) => ({ ...p, staffId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('select_staff')} /></SelectTrigger>
                <SelectContent>{staffList.filter((s) => s.isActive).map((s) => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('shift')}</Label>
              <Select value={shiftForm.shiftType} onValueChange={(v) => setShiftForm((p) => ({ ...p, shiftType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">{t('shift_morning')}</SelectItem>
                  <SelectItem value="evening">{t('shift_evening')}</SelectItem>
                  <SelectItem value="night">{t('shift_night')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('start_time')}</Label><Input type="time" value={shiftForm.startTime} onChange={(e) => setShiftForm((p) => ({ ...p, startTime: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{t('end_time')}</Label><Input type="time" value={shiftForm.endTime} onChange={(e) => setShiftForm((p) => ({ ...p, endTime: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>{t('notes')}</Label><Input value={shiftForm.notes} onChange={(e) => setShiftForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreateShift} disabled={submitting} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {submitting && <Loader2 className="size-4 animate-spin" />}{t('assign_shift')}
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
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-lg font-bold text-primary">{detailStaff.firstName[0]}{detailStaff.lastName[0]}</span>
                  </div>
                  <div>
                    <p className="text-lg font-semibold">{detailStaff.firstName} {detailStaff.lastName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={cn(roleColors[detailStaff.role] || '')}>{detailStaff.role}</Badge>
                      <StatusBadge status={detailStaff.isActive ? 'active' : 'inactive'} />
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 rounded-lg border p-3"><Building2 className="size-4 mt-0.5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{t('departments')}</p><p className="font-medium text-sm">{isRTL ? detailStaff.department?.nameFa : detailStaff.department?.name || '—'}</p></div></div>
                  <div className="flex items-start gap-3 rounded-lg border p-3"><Clock className="size-4 mt-0.5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{t('shift')}</p><p className="font-medium text-sm">{detailStaff.shift || '—'}</p></div></div>
                  <div className="flex items-start gap-3 rounded-lg border p-3"><Phone className="size-4 mt-0.5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{t('phone')}</p><p className="font-medium text-sm">{detailStaff.phone || '—'}</p></div></div>
                  <div className="flex items-start gap-3 rounded-lg border p-3"><Mail className="size-4 mt-0.5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{t('email')}</p><p className="font-medium text-sm">{detailStaff.email || '—'}</p></div></div>
                  <div className="flex items-start gap-3 rounded-lg border p-3"><DollarSign className="size-4 mt-0.5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{t('salary')}</p><p className="font-medium text-sm">{formatSalary(detailStaff.salary)}</p></div></div>
                  <div className="flex items-start gap-3 rounded-lg border p-3"><UserCircle className="size-4 mt-0.5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{t('hire_date')}</p><p className="font-medium text-sm">{formatDate(detailStaff.hireDate)}</p></div></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setDetailOpen(false); openEditDialog(detailStaff); }}><Pencil className="size-4" /><span className="ms-1">{t('edit')}</span></Button>
                <Button variant="destructive" onClick={() => { setDetailOpen(false); setDeleteConfirm(detailStaff.id); }}><Trash2 className="size-4" /><span className="ms-1">{t('delete')}</span></Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ──────────────────────────── */}
      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} onConfirm={handleDelete} title={t('delete_staff')} description={t('delete_staff_confirm')} variant="danger" confirmLabel={t('delete')} loading={submitting} />
    </div>
  );
}

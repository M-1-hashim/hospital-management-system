'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CalendarDays,
  List,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  User,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  MoreHorizontal,
  Filter,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/store';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { EmptyState } from '@/components/hms/shared/EmptyState';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// ── Types ─────────────────────────────────────────────────────

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  fileNumber: string;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  isActive: boolean;
}

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: string;
  notes?: string;
  patient?: Patient;
  doctor?: Doctor;
}

type ViewMode = 'calendar' | 'list';
type StatusFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

// ── Helpers ───────────────────────────────────────────────────

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 17; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 17) slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ── Status Color Utilities ────────────────────────────────────

const statusDotColor: Record<string, string> = {
  pending: 'bg-yellow-400',
  confirmed: 'bg-blue-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-red-500',
  no_show: 'bg-gray-400',
};

// ── Animation Variants ────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ── Component ─────────────────────────────────────────────────

export default function AppointmentsPage() {
  const { t, isRTL } = useLanguageStore();

  // ── State ──────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [doctorFilter, setDoctorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar state
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formPatientId, setFormPatientId] = useState('');
  const [formDoctorId, setFormDoctorId] = useState('');
  const [formDate, setFormDate] = useState(formatDate(new Date()));
  const [formTime, setFormTime] = useState('09:00');
  const [formType, setFormType] = useState('visit');
  const [formNotes, setFormNotes] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // ── Data Fetching ──────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiGet<{ appointments: Appointment[] }>('/api/appointments', {
        limit: '200',
      });
      setAppointments(res.appointments || []);
    } catch {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await apiGet<{ patients: Patient[] }>('/api/patients', { limit: '500' });
      setPatients(res.patients || []);
    } catch {
      toast.error(t('error'));
    }
  }, [t]);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await apiGet<{ doctors: Doctor[] }>('/api/doctors');
      setDoctors(res.doctors || []);
    } catch {
      toast.error(t('error'));
    }
  }, [t]);

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
    fetchDoctors();
  }, [fetchAppointments, fetchPatients, fetchDoctors]);

  // ── Computed Values ────────────────────────────────────────

  const todayStr = formatDate(new Date());

  const filteredAppointments = useMemo(() => {
    let list = [...appointments];

    if (statusFilter !== 'all') {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (doctorFilter !== 'all') {
      list = list.filter((a) => a.doctorId === doctorFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => {
        const patientName = a.patient
          ? `${a.patient.firstName} ${a.patient.lastName}`.toLowerCase()
          : '';
        return patientName.includes(q) || a.id.toLowerCase().includes(q);
      });
    }

    return list;
  }, [appointments, statusFilter, doctorFilter, searchQuery]);

  const todayQueue = useMemo(() => {
    return appointments
      .filter((a) => a.date && a.date.startsWith(todayStr) && a.status === 'pending')
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, todayStr]);

  // Calendar: appointments grouped by date string
  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((a) => {
      if (a.date) {
        const key = a.date.split('T')[0];
        if (!map[key]) map[key] = [];
        map[key].push(a);
      }
    });
    return map;
  }, [appointments]);

  // Calendar: appointments for selected day
  const selectedDayAppointments = useMemo(() => {
    if (selectedDay === null) return [];
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    return (appointmentsByDate[dateStr] || []).sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDay, calYear, calMonth, appointmentsByDate]);

  // Active doctors for the form
  const activeDoctors = useMemo(() => doctors.filter((d) => d.isActive), [doctors]);

  // ── Calendar Navigation ────────────────────────────────────

  const goToPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  // ── Actions ────────────────────────────────────────────────

  const handleCreateAppointment = async () => {
    if (!formPatientId || !formDoctorId || !formDate || !formTime) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setFormLoading(true);
      await apiPost('/api/appointments', {
        patientId: formPatientId,
        doctorId: formDoctorId,
        date: formDate,
        time: formTime,
        type: formType,
        notes: formNotes || undefined,
      });
      toast.success(t('success'));
      setAddDialogOpen(false);
      resetForm();
      fetchAppointments();
    } catch {
      toast.error(t('error'));
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormPatientId('');
    setFormDoctorId('');
    setFormDate(formatDate(new Date()));
    setFormTime('09:00');
    setFormType('visit');
    setFormNotes('');
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      setActionLoading(true);
      await apiPut(`/api/appointments?id=${id}`, { status: newStatus });
      toast.success(t('success'));
      fetchAppointments();
    } catch {
      toast.error(t('error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAppointment) return;
    try {
      setActionLoading(true);
      await apiDelete(`/api/appointments?id=${selectedAppointment.id}`);
      toast.success(t('success'));
      setDeleteDialogOpen(false);
      setSelectedAppointment(null);
      fetchAppointments();
    } catch {
      toast.error(t('error'));
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render Helpers ─────────────────────────────────────────

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: t('pending'),
      confirmed: t('confirmed'),
      completed: t('completed'),
      cancelled: t('cancelled'),
      no_show: t('no_show'),
    };
    return map[status] || status;
  };

  const getTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      visit: t('visit_type'),
      followup: t('followup'),
      emergency: t('emergency'),
    };
    return map[type] || type;
  };

  const patientName = (p?: Patient) =>
    p ? `${p.firstName} ${p.lastName}` : '—';

  const doctorName = (d?: Doctor) =>
    d ? `Dr. ${d.firstName} ${d.lastName}` : '—';

  // ── Calendar Grid Rendering ────────────────────────────────

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(calYear, calMonth);
    const firstDay = getFirstDayOfMonth(calYear, calMonth);
    const isCurrentMonth =
      calYear === new Date().getFullYear() && calMonth === new Date().getMonth();
    const today = new Date().getDate();

    const cells: React.ReactNode[] = [];

    // Empty cells for days before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div
          key={`empty-start-${i}`}
          className="h-20 sm:h-24 rounded-lg border border-transparent p-1.5"
        />
      );
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayAppts = appointmentsByDate[dateStr] || [];
      const isToday = isCurrentMonth && day === today;
      const isSelected = selectedDay === day;
      const isSunday = new Date(calYear, calMonth, day).getDay() === 0;

      cells.push(
        <motion.button
          key={day}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setSelectedDay(day === selectedDay ? null : day)}
          className={cn(
            'relative h-20 sm:h-24 rounded-lg border p-1.5 text-start transition-all duration-200',
            'hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
            isSelected
              ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-500/30 dark:bg-emerald-950/30'
              : isToday
                ? 'border-emerald-400 bg-emerald-50/80 dark:bg-emerald-950/20'
                : 'border-border bg-card',
            isSunday && 'bg-red-50/40 dark:bg-red-950/10'
          )}
        >
          <span
            className={cn(
              'text-sm font-medium',
              isToday && 'flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs',
              isSelected && !isToday && 'text-emerald-700 dark:text-emerald-300'
            )}
          >
            {day}
          </span>

          {/* Appointment dots */}
          {dayAppts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-0.5">
              {dayAppts.slice(0, 4).map((a, idx) => (
                <span
                  key={idx}
                  className={cn(
                    'size-2 rounded-full',
                    statusDotColor[a.status] || 'bg-gray-400'
                  )}
                />
              ))}
              {dayAppts.length > 4 && (
                <span className="text-[10px] text-muted-foreground leading-none">
                  +{dayAppts.length - 4}
                </span>
              )}
            </div>
          )}

          {/* Count badge */}
          {dayAppts.length > 0 && (
            <span className="absolute end-1 top-1 text-[10px] font-medium text-muted-foreground">
              {dayAppts.length}
            </span>
          )}
        </motion.button>
      );
    }

    return cells;
  };

  // ── Main Render ────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Header ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('appointments')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and schedule patient appointments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-lg border bg-muted/50 p-0.5">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn(
                'gap-1.5 text-xs',
                viewMode === 'list' && 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              )}
            >
              <List className="size-3.5" />
              <span className="hidden sm:inline">List</span>
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={cn(
                'gap-1.5 text-xs',
                viewMode === 'calendar' && 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
              )}
            >
              <CalendarDays className="size-3.5" />
              <span className="hidden sm:inline">{t('calendar')}</span>
            </Button>
          </div>

          {/* Add Button */}
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t('book_appointment')}</span>
            <span className="sm:hidden">{t('add')}</span>
          </Button>
        </div>
      </motion.div>

      {/* ── Today's Queue ──────────────────────────────────── */}
      <AnimatePresence>
        {todayQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-emerald-800 dark:text-emerald-300">
                    <Clock className="size-4" />
                    {t('waiting_list')} ({todayQueue.length})
                  </CardTitle>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                    {t('pending')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-48">
                  <div className="flex flex-col gap-2">
                    {todayQueue.map((appt, idx) => (
                      <motion.div
                        key={appt.id}
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: idx * 0.04 }}
                        className="flex items-center justify-between rounded-lg bg-white dark:bg-gray-900 border p-3 gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold dark:bg-emerald-900 dark:text-emerald-300">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {patientName(appt.patient)}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="size-3" />
                              {appt.time} &middot; {doctorName(appt.doctor)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleStatusChange(appt.id, 'confirmed')}
                            disabled={actionLoading}
                          >
                            <CheckCircle2 className="size-3" />
                            {t('confirm')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => handleStatusChange(appt.id, 'cancelled')}
                            disabled={actionLoading}
                          >
                            <XCircle className="size-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Calendar View ──────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        >
          {/* Calendar Grid */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevMonth}
                    className="size-8"
                  >
                    <ChevronLeft className={cn('size-4', isRTL && 'rotate-180')} />
                  </Button>
                  <CardTitle className="text-lg font-semibold">
                    {MONTH_NAMES[calMonth]} {calYear}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNextMonth}
                    className="size-8"
                  >
                    <ChevronRight className={cn('size-4', isRTL && 'rotate-180')} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAY_LABELS.map((label, i) => (
                    <div
                      key={label}
                      className={cn(
                        'text-center text-xs font-medium py-1',
                        i === 0 ? 'text-red-500' : 'text-muted-foreground'
                      )}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Calendar Cells */}
                <div className="grid grid-cols-7 gap-1">
                  {loading ? (
                    Array.from({ length: 35 }).map((_, i) => (
                      <Skeleton key={i} className="h-20 sm:h-24 rounded-lg" />
                    ))
                  ) : (
                    renderCalendarGrid()
                  )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t">
                  {[
                    { color: 'bg-yellow-400', label: t('pending') },
                    { color: 'bg-blue-500', label: t('confirmed') },
                    { color: 'bg-emerald-500', label: t('completed') },
                    { color: 'bg-red-500', label: t('cancelled') },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={cn('size-2.5 rounded-full', color)} />
                      {label}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Selected Day Details */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  {selectedDay !== null
                    ? formatDisplayDate(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`)
                    : 'Select a day'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDay === null ? (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                    <CalendarDays className="size-8 stroke-1" />
                    <p className="text-sm">Click on a day to view appointments</p>
                  </div>
                ) : selectedDayAppointments.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="No appointments"
                    description="No appointments scheduled for this day"
                    actionLabel={t('book_appointment')}
                    onAction={() => {
                      setFormDate(`${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`);
                      setAddDialogOpen(true);
                    }}
                  />
                ) : (
                  <ScrollArea className="max-h-80">
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="flex flex-col gap-2"
                    >
                      {selectedDayAppointments.map((appt) => (
                        <motion.div
                          key={appt.id}
                          variants={itemVariants}
                          className="rounded-lg border p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-sm font-medium">
                              <Clock className="size-3.5 text-emerald-600" />
                              {appt.time}
                            </span>
                            <StatusBadge status={getStatusLabel(appt.status)} />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{patientName(appt.patient)}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Stethoscope className="size-3" />
                              {doctorName(appt.doctor)}
                            </p>
                          </div>
                          {appt.type && (
                            <Badge variant="outline" className="text-[10px]">
                              {getTypeLabel(appt.type)}
                            </Badge>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}

      {/* ── List View ───────────────────────────────────────── */}
      {viewMode === 'list' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-4"
        >
          {/* Filters Row */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Status Tabs */}
                <Tabs
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="h-9 flex-wrap">
                    <TabsTrigger value="all" className="text-xs">{t('all')}</TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs">{t('pending')}</TabsTrigger>
                    <TabsTrigger value="confirmed" className="text-xs">{t('confirmed')}</TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs">{t('completed')}</TabsTrigger>
                    <TabsTrigger value="cancelled" className="text-xs">{t('cancelled')}</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-2 sm:ms-auto">
                  {/* Doctor Filter */}
                  <Select value={doctorFilter} onValueChange={setDoctorFilter}>
                    <SelectTrigger className="w-[160px] h-9 text-xs">
                      <Filter className="size-3 me-1 text-muted-foreground" />
                      <SelectValue placeholder="All Doctors" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Doctors</SelectItem>
                      {activeDoctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          Dr. {d.firstName} {d.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder={`${t('search')} patient...`}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 w-[180px] ps-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointments Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredAppointments.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No appointments found"
                  description={
                    statusFilter !== 'all' || doctorFilter !== 'all' || searchQuery
                      ? 'Try adjusting your filters'
                      : 'Create your first appointment to get started'
                  }
                  actionLabel={t('book_appointment')}
                  onAction={() => setAddDialogOpen(true)}
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead className="text-xs font-semibold">{t('date')}</TableHead>
                        <TableHead className="text-xs font-semibold">{t('time')}</TableHead>
                        <TableHead className="text-xs font-semibold">{t('patients')}</TableHead>
                        <TableHead className="text-xs font-semibold">{t('doctor')}</TableHead>
                        <TableHead className="text-xs font-semibold">{t('visit_type')}</TableHead>
                        <TableHead className="text-xs font-semibold">{t('status')}</TableHead>
                        <TableHead className="text-xs font-semibold text-end">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <motion.tbody
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        {filteredAppointments.map((appt) => (
                          <motion.tr
                            key={appt.id}
                            variants={itemVariants}
                            className="border-b transition-colors hover:bg-muted/30"
                          >
                            <TableCell className="text-sm py-3">
                              {appt.date ? formatDisplayDate(appt.date.split('T')[0]) : '—'}
                            </TableCell>
                            <TableCell className="text-sm py-3">
                              <span className="flex items-center gap-1.5">
                                <Clock className="size-3 text-emerald-600" />
                                {appt.time}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm font-medium py-3">
                              {patientName(appt.patient)}
                            </TableCell>
                            <TableCell className="text-sm py-3">
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Stethoscope className="size-3" />
                                {doctorName(appt.doctor)}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm py-3">
                              <Badge variant="outline" className="text-[10px]">
                                {getTypeLabel(appt.type)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm py-3">
                              <StatusBadge status={getStatusLabel(appt.status)} />
                            </TableCell>
                            <TableCell className="text-sm py-3 text-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-7">
                                    <MoreHorizontal className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isRTL ? 'start' : 'end'}>
                                  {appt.status === 'pending' && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(appt.id, 'confirmed')}
                                      className="text-emerald-600 gap-2"
                                    >
                                      <CheckCircle2 className="size-3.5" />
                                      {t('confirm')}
                                    </DropdownMenuItem>
                                  )}
                                  {(appt.status === 'pending' || appt.status === 'confirmed') && (
                                    <DropdownMenuItem
                                      onClick={() => handleStatusChange(appt.id, 'completed')}
                                      className="text-blue-600 gap-2"
                                    >
                                      <CheckCircle2 className="size-3.5" />
                                      {t('completed')}
                                    </DropdownMenuItem>
                                  )}
                                  {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleStatusChange(appt.id, 'cancelled')}
                                        className="text-red-600 gap-2"
                                      >
                                        <XCircle className="size-3.5" />
                                        {t('cancelled')}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedAppointment(appt);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-red-600 gap-2"
                                  >
                                    <Trash2 className="size-3.5" />
                                    {t('delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Add Appointment Dialog ─────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Plus className="size-5 text-emerald-600" />
              {t('book_appointment')}
            </DialogTitle>
            <DialogDescription>
              Schedule a new appointment for a patient
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Patient Select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Patient <span className="text-red-500">*</span>
              </Label>
              <Select value={formPatientId} onValueChange={setFormPatientId}>
                <SelectTrigger className="w-full">
                  <User className="size-4 me-2 text-muted-foreground" />
                  <SelectValue placeholder="Select patient..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName} ({p.fileNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Doctor Select */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Doctor <span className="text-red-500">*</span>
              </Label>
              <Select value={formDoctorId} onValueChange={setFormDoctorId}>
                <SelectTrigger className="w-full">
                  <Stethoscope className="size-4 me-2 text-muted-foreground" />
                  <SelectValue placeholder="Select doctor..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {activeDoctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        Dr. {d.firstName} {d.lastName} — {d.specialty}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('date')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('time')} <span className="text-red-500">*</span>
                </Label>
                <Select value={formTime} onValueChange={setFormTime}>
                  <SelectTrigger className="w-full">
                    <Clock className="size-4 me-2 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {TIME_SLOTS.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('visit_type')}</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visit">{t('visit_type')}</SelectItem>
                  <SelectItem value="followup">{t('followup')}</SelectItem>
                  <SelectItem value="emergency">{t('emergency')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('notes')}</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                resetForm();
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleCreateAppointment}
              disabled={formLoading}
              className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
            >
              {formLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {t('book_appointment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────── */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedAppointment(null);
        }}
        onConfirm={handleDelete}
        title={t('delete')}
        description={`Are you sure you want to delete this appointment? This action cannot be undone.`}
        confirmLabel={t('delete')}
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}

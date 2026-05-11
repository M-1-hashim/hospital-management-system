'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BedDouble,
  Users,
  Stethoscope,
  DollarSign,
  AlertTriangle,
  Clock,
  UserCircle,
  ArrowUpRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLanguageStore, useAuthStore, useNavStore } from '@/store';
import { StatsCard } from '@/components/hms/shared/StatsCard';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface Stats {
  totalPatients: number;
  inpatientCount: number;
  outpatientCount: number;
  emergencyCount: number;
  totalDoctors: number;
  totalBeds: number;
  occupiedBeds: number;
  emptyBeds: number;
  todayAppointments: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalRevenue: number;
  unpaidInvoices: number;
  lowStockMedicines: number;
  expiringMedicines: number;
}

interface Patient {
  id: string;
  fullName: string;
  nationalId?: string;
  phone?: string;
  type: 'inpatient' | 'outpatient' | 'emergency';
  status: 'active' | 'inactive';
  createdAt: string;
}

interface Appointment {
  id: string;
  patientName: string;
  doctorName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  type?: string;
}

// ============================================================
// Constants
// ============================================================

const CHART_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#f59e0b', '#a855f7', '#ec4899'];

const PIE_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#f59e0b', '#a855f7'];

const BAR_COLORS = ['#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#f59e0b', '#a855f7'];

// ============================================================
// Animation Variants
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

// ============================================================
// Helper
// ============================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function generateDailyVisits() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, i) => ({
    day,
    visits: 18 + ((i * 7 + 3) % 11),
  }));
}

function generateDepartmentData(stats: Stats) {
  const total = stats.totalPatients || 1;
  return [
    { name: 'Internal', value: Math.round(total * 0.3) },
    { name: 'Surgery', value: Math.round(total * 0.2) },
    { name: 'Emergency', value: stats.emergencyCount || Math.round(total * 0.15) },
    { name: 'Pediatrics', value: Math.round(total * 0.2) },
    { name: 'OB/GYN', value: Math.round(total * 0.15) },
  ];
}

function generateMonthlyRevenue(currentMonthRevenue?: number) {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-based
  const monthFormatter = new Intl.DateTimeFormat('en', { month: 'short' });
  const months = Array.from({ length: 6 }, (_, i) => {
    const m = (currentMonth - 5 + i + 12) % 12;
    const d = new Date(now.getFullYear(), m, 1);
    return monthFormatter.format(d);
  });
  const base = currentMonthRevenue || 300000;
  return months.map((month, i) => ({
    month,
    revenue: Math.floor(base * (0.5 + ((i * 29 + 17) % 9) / 10)),
  }));
}

// ============================================================
// Sub-Components
// ============================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-xl" />
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[320px] w-full rounded-xl" />
        <Skeleton className="h-[320px] w-full rounded-xl" />
      </div>
      <Skeleton className="h-[300px] w-full rounded-xl" />
      {/* Bottom row skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-[300px] w-full rounded-xl" />
      </div>
      {/* Alerts skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[80px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

interface AlertCardProps {
  title: string;
  message: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  index: number;
}

function AlertCard({
  title,
  message,
  borderColor,
  iconBg,
  iconColor,
  index,
}: AlertCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      custom={index}
      className={cn('rounded-2xl bg-card p-4 shadow-sm shadow-black/[0.03] dark:ring-1 dark:ring-white/[0.06]', borderColor)}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            iconBg
          )}
        >
          <AlertTriangle className={cn('size-4', iconColor)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Custom Tooltip
// ============================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
  valueFormatter?: (value: number) => string;
}

function CustomTooltip({ active, payload, label, valueFormatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      {label && (
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">
            {valueFormatter ? valueFormatter(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function DashboardPage() {
  const { t, isRTL } = useLanguageStore();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<Stats | null>(null);
  const [recentPatients, setRecentPatients] = useState<Patient[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Data Fetching ─────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, patientsRes, appointmentsRes] = await Promise.allSettled([
        fetch('/api/settings?stats=true'),
        fetch('/api/patients?limit=5'),
        fetch('/api/appointments?status=confirmed'),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const data = await statsRes.value.json();
        // Map nested API response to flat Stats interface
        setStats({
          totalPatients: data.patients?.total || 0,
          inpatientCount: data.patients?.inpatients || 0,
          outpatientCount: data.patients?.outpatients || 0,
          emergencyCount: data.patients?.emergency || 0,
          totalDoctors: data.doctors?.active || data.doctors?.total || 0,
          totalBeds: data.beds?.total || 0,
          occupiedBeds: data.beds?.occupied || 0,
          emptyBeds: data.beds?.available || 0,
          todayAppointments: data.appointments?.today || 0,
          todayRevenue: data.revenue?.today || 0,
          monthlyRevenue: data.revenue?.month || 0,
          totalRevenue: (data.revenue?.today || 0) + (data.revenue?.month || 0),
          unpaidInvoices: data.revenue?.unpaid ? Math.round(data.revenue.unpaid / 100000) : 0,
          lowStockMedicines: data.medicines?.lowStock || 0,
          expiringMedicines: 0, // not in API
        });
      } else {
        // Fallback demo data
        setStats({
          totalPatients: 20,
          inpatientCount: 3,
          outpatientCount: 15,
          emergencyCount: 2,
          totalDoctors: 6,
          totalBeds: 5,
          occupiedBeds: 2,
          emptyBeds: 3,
          todayAppointments: 5,
          todayRevenue: 350000,
          monthlyRevenue: 5600000,
          totalRevenue: 12500000,
          unpaidInvoices: 1,
          lowStockMedicines: 2,
          expiringMedicines: 0,
        });
      }

      if (patientsRes.status === 'fulfilled' && patientsRes.value.ok) {
        const data = await patientsRes.value.json();
        setRecentPatients(Array.isArray(data) ? data : data.patients ?? []);
      }

      if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value.ok) {
        const data = await appointmentsRes.value.json();
        setTodayAppointments(Array.isArray(data) ? data : data.appointments ?? []);
      }
    } catch {
      // Fallback: load demo stats so UI never stays empty
      setStats({
        totalPatients: 20,
        inpatientCount: 3,
        outpatientCount: 15,
        emergencyCount: 2,
        totalDoctors: 6,
        totalBeds: 5,
        occupiedBeds: 2,
        emptyBeds: 3,
        todayAppointments: 5,
        todayRevenue: 350000,
        monthlyRevenue: 5600000,
        totalRevenue: 12500000,
        unpaidInvoices: 1,
        lowStockMedicines: 2,
        expiringMedicines: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Derived Data ──────────────────────────────────────────

  const dailyVisits = generateDailyVisits();
  const departmentData = stats ? generateDepartmentData(stats) : [];
  const monthlyRevenueData = generateMonthlyRevenue(stats?.monthlyRevenue);

  // ── Greeting ──────────────────────────────────────────────

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'good_morning' : hour < 18 ? 'good_afternoon' : 'good_evening';

  // ── Loading ───────────────────────────────────────────────

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t('dashboard')}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {user
                ? `${t(greeting)}, ${user.fullName}`
                : t(greeting)}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 sm:mt-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
              <ArrowUpRight className="size-3.5" />
              {t('export_excel')}
            </Button>
            <Button size="sm" className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => useNavStore.getState().setCurrentPage('reports')}>
              {t('reports')}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatsCard
          title={t('inpatients')}
          value={stats?.inpatientCount ?? 0}
          icon={BedDouble}
          trend="up"
          trendValue="+12%"
          color="blue"
          index={0}
        />
        <StatsCard
          title={t('outpatients')}
          value={stats?.outpatientCount ?? 0}
          icon={Users}
          trend="up"
          trendValue="+8%"
          color="green"
          index={1}
        />
        <StatsCard
          title={t('active') + ' ' + t('doctors')}
          value={stats?.totalDoctors ?? 0}
          icon={Stethoscope}
          trend="neutral"
          trendValue="0%"
          color="purple"
          index={2}
        />
        <StatsCard
          title={t('empty_beds')}
          value={stats?.emptyBeds ?? 0}
          icon={BedDouble}
          trend="down"
          trendValue="-5%"
          color="amber"
          index={3}
        />
        <StatsCard
          title={t('today_revenue')}
          value={formatCurrency(stats?.todayRevenue ?? 0)}
          icon={DollarSign}
          trend="up"
          trendValue="+18%"
          color="green"
          index={4}
        />
      </div>

      {/* ── Charts Row 1: Daily Visits + Department Pie ───── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Visits Line Chart */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl bg-card p-5 shadow-sm shadow-black/[0.03] dark:ring-1 dark:ring-white/[0.06]">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm"><Users className="size-4 text-white" /></div>
              <h3 className="text-sm font-semibold">{t('daily_visits')}</h3>
              <Badge variant="secondary" className="ms-auto text-[11px]">{t('weekly_income')}</Badge>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyVisits}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="visits"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: '#10b981', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                    name="Visits"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Patient Distribution PieChart */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl bg-card p-5 shadow-sm shadow-black/[0.03] dark:ring-1 dark:ring-white/[0.06]">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/50">
                <Stethoscope className="size-4 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-sm font-semibold">{t('patient_by_dept')}</h3>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {departmentData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Charts Row 2: Monthly Revenue BarChart ─────────── */}
      <motion.div variants={itemVariants}>
        <div className="rounded-2xl bg-card p-5 shadow-sm shadow-black/[0.03] dark:ring-1 dark:ring-white/[0.06]">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-sm font-semibold">{t('monthly_revenue')}</h3>
            <Badge variant="secondary" className="ml-auto text-xs">
              {t('monthly_income')}
            </Badge>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData} barCategoryGap="20%">
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={
                    <CustomTooltip valueFormatter={(v: number) => formatCurrency(v)} />
                  }
                />
                <Bar
                  dataKey="revenue"
                  radius={[6, 6, 0, 0]}
                  name="Revenue"
                >
                  {monthlyRevenueData.map((_, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={BAR_COLORS[index % BAR_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* ── Bottom Row: Recent Patients + Today's Appointments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Patients Table */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl bg-card p-5 shadow-sm shadow-black/[0.03] dark:ring-1 dark:ring-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                  <UserCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-sm font-semibold">{t('recent_patients')}</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                {recentPatients.length} {t('patients').toLowerCase()}
              </Badge>
            </div>
            {recentPatients.length > 0 ? (
              <ScrollArea className="max-h-[320px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr className="border-b">
                      <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">
                        {t('name')}
                      </th>
                      <th className="px-4 py-2.5 text-start font-medium text-muted-foreground">
                        {t('status')}
                      </th>
                      <th className="hidden px-4 py-2.5 text-start font-medium text-muted-foreground sm:table-cell">
                        {t('date')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPatients.map((patient, idx) => (
                      <tr
                        key={patient.id}
                        className={cn(
                          'border-b transition-colors hover:bg-muted/50',
                          idx === recentPatients.length - 1 && 'border-b-0'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-emerald-100 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                {patient.fullName
                                  ?.split(' ')
                                  .map((n: string) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2) ?? '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">
                                {patient.fullName}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {patient.type}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={patient.status} />
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                          {patient.createdAt
                            ? new Date(patient.createdAt).toLocaleDateString()
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <UserCircle className="mb-2 size-10 opacity-40" />
                <p className="text-sm">{t('no_data')}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Today's Appointments */}
        <motion.div variants={itemVariants}>
          <div className="rounded-2xl bg-card p-5 shadow-sm shadow-black/[0.03] dark:ring-1 dark:ring-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/50">
                  <Clock className="size-4 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className="text-sm font-semibold">{t('today_appointments')}</h3>
              </div>
              <Badge variant="secondary" className="text-xs">
                {todayAppointments.length} {t('appointments').toLowerCase()}
              </Badge>
            </div>
            {todayAppointments.length > 0 ? (
              <ScrollArea className="max-h-[320px]">
                <div className="divide-y">
                  {todayAppointments.map((appt, idx) => (
                    <div
                      key={appt.id}
                      className={cn(
                        'flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50',
                        idx === todayAppointments.length - 1 && 'border-b-0'
                      )}
                    >
                      <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg bg-muted">
                        <span className="text-xs font-bold leading-tight text-foreground">
                          {appt.time || '--:--'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {appt.patientName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t('doctor')}: {appt.doctorName}
                        </p>
                      </div>
                      <StatusBadge status={appt.status} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Clock className="mb-2 size-10 opacity-40" />
                <p className="text-sm">{t('no_data')}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Alerts Section ──────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="size-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-foreground">{t('alerts')}</h2>
        </div>
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* ICU Beds Full Alert */}
          <AlertCard
            title={t('icu_beds_full')}
            message={t('icu_full_message')}
            borderColor="border-l-red-500"
            iconBg="bg-red-100 dark:bg-red-900/50"
            iconColor="text-red-600 dark:text-red-400"
            index={0}
          />

          {/* Expiring Medicines Alert */}
          <AlertCard
            title={`${t('expiring_meds')} (${stats?.expiringMedicines ?? 0})`}
            message={`${stats?.expiringMedicines ?? 0} ${t('expiring_meds_message')}`}
            borderColor="border-l-amber-500"
            iconBg="bg-amber-100 dark:bg-amber-900/50"
            iconColor="text-amber-600 dark:text-amber-400"
            index={1}
          />

          {/* Cancelled Appointments Alert */}
          <AlertCard
            title={t('cancelled_appointments')}
            message={t('cancelled_appts_message')}
            borderColor="border-l-purple-500"
            iconBg="bg-purple-100 dark:bg-purple-900/50"
            iconColor="text-purple-600 dark:text-purple-400"
            index={2}
          />
        </motion.div>
      </motion.div>

      {/* ── Bottom Separator ────────────────────────────────── */}
      <Separator />
    </motion.div>
  );
}

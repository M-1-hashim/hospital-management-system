'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Calendar,
  DollarSign,
  Bed,
  FlaskConical,
  ListOrdered,
  Activity,
  Star,
  Clock,
  ArrowUpRight,
  TrendingUp,
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
  Area,
  AreaChart,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CollapsiblePanel } from '@/components/hms/shared/CollapsiblePanel';
import { StatsCard } from '@/components/hms/shared/StatsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguageStore, useAuthStore, useNavStore } from '@/store';
import { apiGet } from '@/lib/fetcher';
import { cn } from '@/lib/utils';

// ============================================================
// Types
// ============================================================

interface DashboardStats {
  patientsToday: number;
  appointmentsToday: number;
  revenueToday: number;
  bedsAvailable: number;
  pendingLabTests: number;
  queueWaiting: number;
}

interface WeeklyDay {
  day: string;
  date: string;
  count: number;
}

interface DepartmentDistItem {
  name: string;
  value: number;
}

interface TopDoctor {
  id: string;
  name: string;
  specialty: string;
  department: string;
  appointments: number;
  rating: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  details: string | null;
  createdAt: string;
  user: { fullName: string; role: string } | null;
}

interface QueueEntry {
  id: string;
  queueNumber: number;
  patientName: string;
  priority: string;
  status: string;
  department: string;
  calledAt?: string | null;
}

// ============================================================
// Constants
// ============================================================

const PIE_COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#a855f7', '#ec4899', '#ef4444', '#6366f1'];

const AREA_COLOR = 'hsl(var(--primary))';

// ============================================================
// Animation Variants
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
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
// Helpers
// ============================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function getActionIcon(action: string) {
  switch (action.toLowerCase()) {
    case 'create': return '➕';
    case 'update': return '✏️';
    case 'delete': return '🗑️';
    case 'login': return '🔑';
    case 'logout': return '🚪';
    case 'view': return '👁️';
    default: return '📋';
  }
}

// ============================================================
// Fallback / Mock Data Generators
// ============================================================

function fallbackStats(): DashboardStats {
  return {
    patientsToday: 12,
    appointmentsToday: 8,
    revenueToday: 4520,
    bedsAvailable: 7,
    pendingLabTests: 5,
    queueWaiting: 3,
  };
}

function fallbackWeeklyData(): WeeklyDay[] {
  const now = new Date();
  const days: WeeklyDay[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    days.push({
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      date: d.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 12) + 4,
    });
  }
  return days;
}

function fallbackDeptDist(): DepartmentDistItem[] {
  return [
    { name: 'Internal Medicine', value: 32 },
    { name: 'Surgery', value: 24 },
    { name: 'Emergency', value: 18 },
    { name: 'Pediatrics', value: 15 },
    { name: 'OB/GYN', value: 11 },
  ];
}

function fallbackTopDoctors(): TopDoctor[] {
  return [
    { id: '1', name: 'Dr. Sarah Johnson', specialty: 'Cardiology', department: 'Internal Medicine', appointments: 48, rating: 4.9 },
    { id: '2', name: 'Dr. Michael Chen', specialty: 'Orthopedics', department: 'Surgery', appointments: 42, rating: 4.8 },
    { id: '3', name: 'Dr. Emily Davis', specialty: 'Pediatrics', department: 'Pediatrics', appointments: 38, rating: 4.7 },
    { id: '4', name: 'Dr. James Wilson', specialty: 'Neurology', department: 'Internal Medicine', appointments: 35, rating: 4.6 },
    { id: '5', name: 'Dr. Lisa Park', specialty: 'Obstetrics', department: 'OB/GYN', appointments: 31, rating: 4.5 },
  ];
}

function fallbackAuditLogs(): AuditLogEntry[] {
  const now = new Date();
  return [
    { id: '1', action: 'create', entity: 'patient', details: 'New patient registered', createdAt: new Date(now.getTime() - 300000).toISOString(), user: { fullName: 'Admin User', role: 'admin' } },
    { id: '2', action: 'create', entity: 'appointment', details: 'Appointment booked for Dr. Sarah Johnson', createdAt: new Date(now.getTime() - 900000).toISOString(), user: { fullName: 'Receptionist', role: 'receptionist' } },
    { id: '3', action: 'update', entity: 'invoice', details: 'Invoice #1042 payment received', createdAt: new Date(now.getTime() - 1800000).toISOString(), user: { fullName: 'Accountant', role: 'accountant' } },
    { id: '4', action: 'create', entity: 'lab_test', details: 'Blood work ordered for patient', createdAt: new Date(now.getTime() - 3600000).toISOString(), user: { fullName: 'Dr. Michael Chen', role: 'doctor' } },
    { id: '5', action: 'update', entity: 'bed', details: 'Bed A-204 assigned to patient', createdAt: new Date(now.getTime() - 5400000).toISOString(), user: { fullName: 'Nurse Staff', role: 'nurse' } },
    { id: '6', action: 'login', entity: 'user', details: 'User logged in', createdAt: new Date(now.getTime() - 7200000).toISOString(), user: { fullName: 'Dr. Emily Davis', role: 'doctor' } },
  ];
}

function fallbackQueue(): QueueEntry[] {
  return [
    { id: '1', queueNumber: 1, patientName: 'Ahmad Rahimi', priority: 'normal', status: 'waiting', department: 'General' },
    { id: '2', queueNumber: 2, patientName: 'Maryam Hosseini', priority: 'normal', status: 'waiting', department: 'General' },
    { id: '3', queueNumber: 3, patientName: 'Reza Karimi', priority: 'urgent', status: 'waiting', department: 'General' },
  ];
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

function ChartTooltip({ active, payload, label, valueFormatter }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      {label && <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="inline-block size-2 rounded-full" style={{ backgroundColor: entry.color }} />
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
// Skeleton
// ============================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Skeleton className="h-[360px] w-full rounded-2xl lg:col-span-8" />
        <Skeleton className="h-[360px] w-full rounded-2xl lg:col-span-4" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[380px] w-full rounded-2xl" />
        <Skeleton className="h-[380px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function DashboardPage() {
  const { t, isRTL } = useLanguageStore();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyDay[]>([]);
  const [deptDist, setDeptDist] = useState<DepartmentDistItem[]>([]);
  const [topDoctors, setTopDoctors] = useState<TopDoctor[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [queueEntries, setQueueEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Data Fetching ─────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        apiGet<{ patients: { today: number }; beds: { available: number }; appointments: { today: number }; revenue: { today: number }; labTests: { pending: number } }>('/api/settings?stats=true'),
        apiGet<{ days: WeeklyDay[] }>('/api/reports?type=weeklyPatients'),
        apiGet<{ distribution: DepartmentDistItem[] }>('/api/reports?type=departmentDist'),
        apiGet<{ topDoctors: TopDoctor[] }>('/api/reports?type=topDoctors'),
        apiGet<{ logs: AuditLogEntry[] }>('/api/audit-logs?limit=10'),
        apiGet<{ queues: QueueEntry[] }>('/api/queue'),
      ]);

      // Stats
      if (results[0].status === 'fulfilled') {
        const d = results[0].value;
        setStats({
          patientsToday: d.patients?.today ?? 0,
          appointmentsToday: d.appointments?.today ?? 0,
          revenueToday: d.revenue?.today ?? 0,
          bedsAvailable: d.beds?.available ?? 0,
          pendingLabTests: d.labTests?.pending ?? 0,
          queueWaiting: results[5].status === 'fulfilled' ? (results[5].value.queues?.filter((q: QueueEntry) => q.status === 'waiting').length ?? 0) : 0,
        });
      } else {
        setStats(fallbackStats());
      }

      // Weekly data — use fallback if all values are zero (no historical data yet)
      if (results[1].status === 'fulfilled' && results[1].value.days?.length) {
        const hasData = results[1].value.days.some((d) => d.count > 0);
        setWeeklyData(hasData ? results[1].value.days : fallbackWeeklyData());
      } else {
        setWeeklyData(fallbackWeeklyData());
      }

      // Department distribution
      if (results[2].status === 'fulfilled' && results[2].value.distribution?.length) {
        setDeptDist(results[2].value.distribution);
      } else {
        setDeptDist(fallbackDeptDist());
      }

      // Top doctors
      if (results[3].status === 'fulfilled' && results[3].value.topDoctors?.length) {
        setTopDoctors(results[3].value.topDoctors);
      } else {
        setTopDoctors(fallbackTopDoctors());
      }

      // Audit logs
      if (results[4].status === 'fulfilled' && results[4].value.logs?.length) {
        setAuditLogs(results[4].value.logs);
      } else {
        setAuditLogs(fallbackAuditLogs());
      }

      // Queue — show called + waiting entries
      if (results[5].status === 'fulfilled' && results[5].value.queues?.length) {
        const allQueues = results[5].value.queues;
        const called = allQueues.filter((q) => q.status === 'called');
        const waiting = allQueues.filter((q) => q.status === 'waiting');
        // Put called first, then waiting
        setQueueEntries([...called, ...waiting]);
        // Update stats with real waiting count
        if (results[0].status === 'fulfilled') {
          setStats((prev) => prev ? { ...prev, queueWaiting: allQueues.filter((q) => q.status === 'waiting').length } : prev);
        }
      } else {
        setQueueEntries(fallbackQueue());
      }
    } catch {
      // Fallback demo data
      setStats(fallbackStats());
      setWeeklyData(fallbackWeeklyData());
      setDeptDist(fallbackDeptDist());
      setTopDoctors(fallbackTopDoctors());
      setAuditLogs(fallbackAuditLogs());
      setQueueEntries(fallbackQueue());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Greeting ──────────────────────────────────────────────

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'good_morning' : hour < 18 ? 'good_afternoon' : 'good_evening';

  // ── Loading ───────────────────────────────────────────────

  if (loading) {
    return <DashboardSkeleton />;
  }

  // ── Render ────────────────────────────────────────────────

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
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('dashboard')}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {user ? `${t(greeting)}, ${user.fullName}` : t(greeting)}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 sm:mt-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => useNavStore.getState().setCurrentPage('reports')}>
              <ArrowUpRight className="size-3.5" />
              {t('reports')}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Row (6 cards) ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatsCard title={t('patients_today')} value={stats?.patientsToday ?? 0} icon={Users} color="blue" trend="up" trendValue="+12%" index={0} />
        <StatsCard title={t('appointments_today')} value={stats?.appointmentsToday ?? 0} icon={Calendar} color="green" trend="up" trendValue="+5%" index={1} />
        <StatsCard title={t('revenue_today')} value={formatCurrency(stats?.revenueToday ?? 0)} icon={DollarSign} color="green" trend="up" trendValue="+18%" index={2} />
        <StatsCard title={t('beds_available')} value={stats?.bedsAvailable ?? 0} icon={Bed} color="purple" trend="neutral" trendValue="0%" index={3} />
        <StatsCard title={t('pending_tests')} value={stats?.pendingLabTests ?? 0} icon={FlaskConical} color="amber" trend="down" trendValue="-3%" index={4} />
        <StatsCard title={t('queue_waiting')} value={stats?.queueWaiting ?? 0} icon={ListOrdered} color="red" trend="up" trendValue="+2" index={5} />
      </div>

      {/* ── Charts Row (8/12 + 4/12) ─────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Weekly Patient Visits — Area Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <CollapsiblePanel id="dash-weekly-visits" title={t('weekly_trend')} icon={TrendingUp} badge={t('live_stats')}>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={AREA_COLOR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={AREA_COLOR} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
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
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={AREA_COLOR}
                    strokeWidth={2.5}
                    fill="url(#colorVisits)"
                    dot={{ fill: AREA_COLOR, r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: AREA_COLOR, stroke: '#fff', strokeWidth: 2 }}
                    name="Visits"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CollapsiblePanel>
        </motion.div>

        {/* Department Distribution — Pie Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <CollapsiblePanel id="dash-dept-dist" title={t('department_distribution')} icon={Activity}>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deptDist}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {deptDist.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
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
          </CollapsiblePanel>
        </motion.div>
      </div>

      {/* ── Bottom Section (2 columns) ─────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <CollapsiblePanel id="dash-recent-activity" title={t('recent_activity')} icon={Clock} badge={`${auditLogs.length}`}>
            <div className="max-h-[340px] overflow-y-auto">
              <div className="relative space-y-0">
                {auditLogs.map((log, idx) => (
                  <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {/* Timeline line */}
                    {idx < auditLogs.length - 1 && (
                      <div className="absolute top-8 bottom-0 start-[15px] w-px bg-border" />
                    )}
                    {/* Icon dot */}
                    <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                      {getActionIcon(log.action)}
                    </div>
                    {/* Content */}
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-foreground">
                        {log.details || `${log.action} ${log.entity}`}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{log.user?.fullName || 'System'}</span>
                        <span>•</span>
                        <span>{timeAgo(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsiblePanel>
        </motion.div>

        {/* Top Doctors Table */}
        <motion.div variants={itemVariants}>
          <CollapsiblePanel id="dash-top-doctors" title={t('top_doctors')} icon={Star} badge="5">
            <div className="max-h-[340px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="border-b">
                    <th className="px-3 py-2.5 text-start font-medium text-muted-foreground">{t('name')}</th>
                    <th className="hidden px-3 py-2.5 text-start font-medium text-muted-foreground md:table-cell">{t('specialty')}</th>
                    <th className="px-3 py-2.5 text-start font-medium text-muted-foreground">{t('visits')}</th>
                    <th className="px-3 py-2.5 text-start font-medium text-muted-foreground">{t('rating')}</th>
                  </tr>
                </thead>
                <tbody>
                  {topDoctors.map((doc, idx) => (
                    <tr
                      key={doc.id}
                      className={cn(
                        'border-b transition-colors hover:bg-muted/50',
                        idx === topDoctors.length - 1 && 'border-b-0',
                      )}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                            idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-muted-foreground/30 text-muted-foreground',
                          )}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{doc.name}</p>
                            <p className="truncate text-xs text-muted-foreground md:hidden">{doc.specialty}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden px-3 py-3 text-muted-foreground md:table-cell">{doc.specialty}</td>
                      <td className="px-3 py-3">
                        <Badge variant="secondary" className="font-semibold">{doc.appointments}</Badge>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Star className="size-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-medium text-foreground">{doc.rating.toFixed(1)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsiblePanel>
        </motion.div>
      </div>

      {/* ── Queue Widget ────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <CollapsiblePanel id="dash-queue-widget" title={t('waiting_queue')} icon={ListOrdered} badge={queueEntries.filter((q) => q.status === 'waiting').length.toString()}>
          <div className="space-y-4">
            {/* ── Called Patients (Currently Serving) ──────────── */}
            {(() => {
              const calledPatients = queueEntries.filter((q) => q.status === 'called');
              const waitingPatients = queueEntries.filter((q) => q.status === 'waiting');

              return (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Left column: Called patients */}
                  <div className="sm:col-span-1">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('current_serving')}</span>
                    {calledPatients.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {calledPatients.map((cp) => (
                          <div key={cp.id} className="flex flex-col items-center rounded-2xl bg-primary/10 px-5 py-4">
                            <span className="text-3xl font-bold text-primary">
                              {String(cp.queueNumber).padStart(3, '0')}
                            </span>
                            <span className="mt-0.5 text-sm font-medium text-foreground">{cp.patientName}</span>
                            <div className="mt-1 flex items-center gap-1.5">
                              <Badge variant="secondary" className="text-[10px]">{cp.department}</Badge>
                              {cp.calledAt && (
                                <span className="text-[10px] text-muted-foreground">{timeAgo(cp.calledAt)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/30 px-5 py-6">
                        <span className="text-3xl font-bold text-muted-foreground/40">—</span>
                        <span className="mt-1 text-xs text-muted-foreground">{t('no_patients_in_queue')}</span>
                      </div>
                    )}
                  </div>

                  {/* Middle column: Next in line (waiting) */}
                  <div className="sm:col-span-1">
                    <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('next')}</span>
                    {waitingPatients.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {waitingPatients.slice(0, 5).map((entry) => (
                          <div key={entry.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                            <Badge variant="outline" className="bg-background font-mono text-xs">{entry.queueNumber}</Badge>
                            <span className="flex-1 truncate text-sm text-foreground">{entry.patientName}</span>
                            <Badge variant="secondary" className="text-[10px] shrink-0">{entry.department}</Badge>
                            {entry.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0 shrink-0">!</Badge>
                            )}
                            {entry.priority === 'emergency' && (
                              <Badge variant="destructive" className="text-[10px] px-1 py-0 shrink-0">!!</Badge>
                            )}
                          </div>
                        ))}
                        {waitingPatients.length > 5 && (
                          <span className="text-xs text-muted-foreground text-center pt-1">
                            +{waitingPatients.length - 5} {isRTL ? 'بیمار دیگر' : 'more'}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center rounded-xl bg-muted/30 px-4 py-8">
                        <span className="text-sm text-muted-foreground">{t('no_patients_in_queue')}</span>
                      </div>
                    )}
                  </div>

                  {/* Right column: Stats + Navigate */}
                  <div className="sm:col-span-1 flex flex-col items-center justify-center gap-4">
                    <div className="text-center">
                      <span className="block text-4xl font-bold text-foreground">{waitingPatients.length}</span>
                      <span className="text-sm text-muted-foreground">{isRTL ? 'در صف انتظار' : t('waiting_queue').toLowerCase()}</span>
                    </div>
                    {calledPatients.length > 0 && (
                      <div className="text-center">
                        <span className="block text-2xl font-bold text-primary">{calledPatients.length}</span>
                        <span className="text-sm text-muted-foreground">{isRTL ? 'در حال خدمت' : 'serving'}</span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => useNavStore.getState().setCurrentPage('queue')}
                    >
                      <ArrowUpRight className="size-3.5" />
                      {t('queue')}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </CollapsiblePanel>
      </motion.div>
    </motion.div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, useLanguageStore } from '@/store';
import {
  User, CalendarDays, DollarSign, Users, TrendingUp, Clock,
  FileText, ChevronLeft, ChevronRight, CheckCircle2, Circle,
  AlertCircle, IndianRupee, Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface DoctorInfo {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  phone: string;
  email: string;
  department: { id: string; name: string; nameFa: string } | null;
  visitFee: number;
  salary: number;
  contractType: string;
  hireDate: string | null;
  rating: number;
  isActive: boolean;
}

interface Stats {
  todayAppointments: number;
  weekAppointments: number;
  completedThisMonth: number;
  totalPatientsSeen: number;
}

interface AppointmentItem {
  id: string;
  date: string;
  time: string;
  status: string;
  type: string;
  notes: string;
  patient: { id: string; firstName: string; lastName: string; fileNumber: string; phone?: string } | null;
}

interface VisitRecord {
  id: string;
  visitDate: string;
  chiefComplaint: string;
  diagnosis: string | null;
  patient: { id: string; firstName: string; lastName: string; fileNumber: string };
}

interface PayrollItem {
  id: string;
  month: number;
  year: number;
  baseSalary: number;
  overtime: number;
  bonus: number;
  deduction: number;
  totalPaid: number;
  status: string;
  paidDate: string | null;
  notes: string | null;
}

interface SalaryChartItem {
  month: number;
  year: number;
  label: string;
  total: number;
  bonus: number;
  deduction: number;
}

interface PortalData {
  doctor: DoctorInfo;
  stats: Stats;
  todayAppointments: AppointmentItem[];
  weekAppointments: AppointmentItem[];
  recentAppointments: AppointmentItem[];
  visitRecords: VisitRecord[];
  payrolls: PayrollItem[];
  currentMonthPayroll: PayrollItem | null;
  salaryChart: SalaryChartItem[];
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: 'در انتظار', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'تایید شده', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'تکمیل شده', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'لغو شده', color: 'bg-red-100 text-red-800' },
  no_show: { label: 'حاضر نشد', color: 'bg-gray-100 text-gray-800' },
  paid: { label: 'پرداخت شده', color: 'bg-green-100 text-green-800' },
  pending_pay: { label: 'در انتظار پرداخت', color: 'bg-orange-100 text-orange-800' },
};

const MONTH_NAMES_FA = [
  '', 'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
  'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
];

export default function DoctorPortalPage() {
  const { user } = useAuthStore();
  const { t } = useLanguageStore();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'salary' | 'patients'>('overview');

  const fetchPortal = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/doctor-portal?userId=' + user.id);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const json = await res.json();
        setError(json.error || 'خطا در دریافت اطلاعات');
      }
    } catch {
      setError('خطا در اتصال به سرور');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchPortal(); }, [fetchPortal]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">در حال بارگذاری...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="size-10 text-destructive" />
          <p className="text-sm text-destructive">{error || 'اطلاعات پروفایل دکتر یافت نشد'}</p>
          <Button onClick={fetchPortal} variant="outline" size="sm">تلاش مجدد</Button>
        </div>
      </div>
    );
  }

  const doc = data.doctor;
  const stats = data.stats;
  const tabItems = [
    { key: 'overview' as const, label: 'نمای کلی', icon: Activity },
    { key: 'appointments' as const, label: 'نوبت‌ها', icon: CalendarDays },
    { key: 'salary' as const, label: 'حقوق و دستمزد', icon: DollarSign },
    { key: 'patients' as const, label: 'بیماران', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header - Doctor Info */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-l from-teal-600 to-cyan-600 px-6 py-8 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur">
                {doc.firstName[0]}{doc.lastName[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold">دکتر {doc.firstName} {doc.lastName}</h1>
                <p className="mt-1 text-sm text-white/80">{doc.specialty} {doc.department ? '— ' + doc.department.nameFa : ''}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                    <User className="mr-1 size-3" /> {doc.contractType === 'fulltime' ? 'تمام وقت' : doc.contractType === 'parttime' ? 'پاره وقت' : 'قراردادی'}
                  </Badge>
                  {doc.isActive && (
                    <Badge variant="secondary" className="bg-green-500/20 text-green-100 text-xs">
                      <CheckCircle2 className="mr-1 size-3" /> فعال
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              <div className="rounded-xl bg-white/10 px-4 py-2 text-center backdrop-blur">
                <div className="text-2xl font-bold">{stats.totalPatientsSeen}</div>
                <div className="text-white/70">کل بیماران</div>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-2 text-center backdrop-blur">
                <div className="text-2xl font-bold">{stats.todayAppointments}</div>
                <div className="text-white/70">نوبت امروز</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-xl bg-muted p-1">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="size-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={CalendarDays} label="نوبت امروز" value={stats.todayAppointments} color="text-blue-600" bg="bg-blue-50" />
            <StatCard icon={Clock} label="نوبت این هفته" value={stats.weekAppointments} color="text-purple-600" bg="bg-purple-50" />
            <StatCard icon={CheckCircle2} label="تکمیل شده این ماه" value={stats.completedThisMonth} color="text-green-600" bg="bg-green-50" />
            <StatCard icon={DollarSign} label="حقوق پایه" value={doc.salary.toLocaleString()} suffix=" AFN" color="text-teal-600" bg="bg-teal-50" />
          </div>

          {/* Today Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-5 text-primary" />
                نوبت‌های امروز
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.todayAppointments.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">نوبتی برای امروز وجود ندارد</p>
              ) : (
                <div className="space-y-2">
                  {data.todayAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                          {apt.time}
                        </div>
                        <div>
                          <div className="font-medium">{apt.patient?.firstName} {apt.patient?.lastName}</div>
                          <div className="text-xs text-muted-foreground">{apt.patient?.fileNumber}</div>
                        </div>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'appointments' && (
        <div className="space-y-4">
          {/* Week Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-5 text-primary" />
                نوبت‌های این هفته
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 text-right font-medium">بیمار</th>
                      <th className="py-2 text-right font-medium">تاریخ</th>
                      <th className="py-2 text-right font-medium">ساعت</th>
                      <th className="py-2 text-right font-medium">وضعیت</th>
                      <th className="py-2 text-right font-medium">نوع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weekAppointments.map((apt) => (
                      <tr key={apt.id} className="border-b last:border-0">
                        <td className="py-2.5">{apt.patient?.firstName} {apt.patient?.lastName}</td>
                        <td className="py-2.5">{new Date(apt.date).toLocaleDateString('fa-AF')}</td>
                        <td className="py-2.5">{apt.time}</td>
                        <td className="py-2.5"><StatusBadge status={apt.status} /></td>
                        <td className="py-2.5">{apt.type === 'visit' ? 'ویزیت' : apt.type === 'followup' ? 'پیگیری' : 'اضطراری'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.weekAppointments.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">نوبتی در این هفته نیست</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-5 text-primary" />
                نوبت‌های اخیر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-xs">
                        <CalendarDays className="size-4" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{apt.patient?.firstName} {apt.patient?.lastName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(apt.date).toLocaleDateString('fa-AF')} — {apt.time}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="space-y-6">
          {/* Current Month Salary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="size-5 text-primary" />
                حقوق این ماه
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.currentMonthPayroll ? (
                <SalaryDetail payroll={data.currentMonthPayroll} />
              ) : (
                <p className="py-4 text-sm text-muted-foreground">اطلاعات حقوق این ماه هنوز ثبت نشده است</p>
              )}
            </CardContent>
          </Card>

          {/* Salary Chart */}
          {data.salaryChart.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-5 text-primary" />
                  نمودار حقوق ۶ ماه اخیر
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.salaryChart.map((item) => {
                    const maxTotal = Math.max(...data.salaryChart.map((s) => s.total), 1);
                    const width = (item.total / maxTotal) * 100;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <div className="w-16 text-sm text-muted-foreground">{item.label}</div>
                        <div className="flex-1">
                          <div className="h-6 w-full rounded-md bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-md bg-gradient-to-l from-teal-500 to-cyan-500 flex items-center justify-end px-2 transition-all duration-500"
                              style={{ width: width + '%' }}
                            >
                              <span className="text-xs font-medium text-white">{item.total.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payroll History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-5 text-primary" />
                تاریخچه حقوق
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 text-right font-medium">ماه</th>
                      <th className="py-2 text-right font-medium">حقوق پایه</th>
                      <th className="py-2 text-right font-medium">اضافه‌کاری</th>
                      <th className="py-2 text-right font-medium">پاداش</th>
                      <th className="py-2 text-right font-medium">کسورات</th>
                      <th className="py-2 text-right font-medium">مجموع</th>
                      <th className="py-2 text-right font-medium">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payrolls.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2.5">{MONTH_NAMES_FA[p.month]} {p.year}</td>
                        <td className="py-2.5">{p.baseSalary.toLocaleString()}</td>
                        <td className="py-2.5">{p.overtime.toLocaleString()}</td>
                        <td className="py-2.5 text-green-600">+{p.bonus.toLocaleString()}</td>
                        <td className="py-2.5 text-red-600">-{p.deduction.toLocaleString()}</td>
                        <td className="py-2.5 font-bold">{p.totalPaid.toLocaleString()} AFN</td>
                        <td className="py-2.5">
                          <Badge variant="secondary" className={p.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
                            {p.status === 'paid' ? 'پرداخت شده' : 'در انتظار'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.payrolls.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">اطلاعات حقوقی وجود ندارد</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'patients' && (
        <div className="space-y-4">
          {/* Visit Records */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-5 text-primary" />
                ویزیت‌های اخیر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.visitRecords.map((vr) => (
                  <div key={vr.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{vr.patient.firstName} {vr.patient.lastName}</div>
                        <div className="text-xs text-muted-foreground">
                          {vr.patient.fileNumber} — {new Date(vr.visitDate).toLocaleDateString('fa-AF')}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-sm">
                      {vr.chiefComplaint && (
                        <div><span className="text-muted-foreground">شکایت:</span> {vr.chiefComplaint}</div>
                      )}
                      {vr.diagnosis && (
                        <div><span className="text-muted-foreground">تشخیص:</span> {vr.diagnosis}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {data.visitRecords.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">ویزیت ثبت نشده است</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, suffix, color, bg }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  suffix?: string;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={'flex size-10 items-center justify-center rounded-lg ' + bg}>
          <Icon className={'size-5 ' + color} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-bold">{value}{suffix || ''}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
  const info = STATUS_MAP[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  return <Badge variant="secondary" className={'text-xs ' + info.color}>{info.label}</Badge>;
}

// Salary Detail Component
function SalaryDetail({ payroll }: { payroll: PayrollItem }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <SalaryRow label="حقوق پایه" value={payroll.baseSalary} />
        <SalaryRow label="اضافه‌کاری" value={payroll.overtime} />
        <SalaryRow label="پاداش" value={payroll.bonus} positive />
        <SalaryRow label="کسورات" value={payroll.deduction} negative />
      </div>
      <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
        <span className="font-bold">مجموع پرداختی</span>
        <span className="text-xl font-bold text-primary">{payroll.totalPaid.toLocaleString()} AFN</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">وضعیت:</span>
        <StatusBadge status={payroll.status === 'paid' ? 'paid' : 'pending_pay'} />
      </div>
    </div>
  );
}

function SalaryRow({ label, value, positive, negative }: { label: string; value: number; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={'font-bold ' + (positive ? 'text-green-600' : negative ? 'text-red-600' : '')}>
        {positive ? '+' : negative ? '-' : ''}{value.toLocaleString()} AFN
      </span>
    </div>
  );
}

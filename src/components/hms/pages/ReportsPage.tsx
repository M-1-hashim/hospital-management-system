'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguageStore } from '@/store';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, Users, DollarSign, TrendingUp, FileDown, FileText,
  Stethoscope, Pill, PieChart as PieChartIcon,
} from 'lucide-react';
import { CollapsiblePanel } from '@/components/hms/shared/CollapsiblePanel';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import * as XLSX from 'xlsx';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export function ReportsPage() {
  const { t, isRTL } = useLanguageStore();
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('patients');
  const [patientData, setPatientData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>(null);
  const [doctorData, setDoctorData] = useState<any>(null);
  const [pharmacyData, setPharmacyData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // ─── Enhanced financial data ──────────────────────────────
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<any[]>([]);
  const [dailyRevenueData, setDailyRevenueData] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [departmentRevenueData, setDepartmentRevenueData] = useState<any[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams = new URLSearchParams({ from: fromDate, to: toDate });
      const [patRes, finRes, docRes, phaRes, monthlyRes, dailyRes, methodsRes, deptRes, overdueRes] = await Promise.allSettled([
        fetch(`/api/reports?type=patients&${baseParams}`).then((r) => r.json()),
        fetch(`/api/reports?type=financial&${baseParams}`).then((r) => r.json()),
        fetch(`/api/reports?type=doctors&${baseParams}`).then((r) => r.json()),
        fetch(`/api/reports?type=pharmacy&${baseParams}`).then((r) => r.json()),
        fetch('/api/reports?type=monthlyRevenue').then((r) => r.json()),
        fetch('/api/reports?type=dailyRevenue').then((r) => r.json()),
        fetch('/api/reports?type=paymentMethods').then((r) => r.json()),
        fetch('/api/reports?type=departmentRevenue').then((r) => r.json()),
        fetch('/api/reports?type=overdueInvoices').then((r) => r.json()),
      ]);

      // Patient report
      if (patRes.status === 'fulfilled') {
        const pat = patRes.value;
        if (pat && pat.total !== undefined) {
          setPatientData({
            totalPatients: pat.total, inpatientCount: pat.byStatus?.inpatient || 0,
            outpatientCount: pat.byStatus?.outpatient || 0, emergencyCount: pat.byStatus?.emergency || 0,
            thisMonth: pat.thisMonth || 0, thisWeek: pat.thisWeek || 0, today: pat.today || 0,
            byGender: pat.byGender || {},
          });
        }
      }

      // Financial report
      if (finRes.status === 'fulfilled') {
        const fin = finRes.value;
        if (fin && fin.summary) {
          setFinancialData({
            totalIncome: fin.summary.totalRevenue || 0,
            totalExpenses: fin.summary.totalExpenses || 0,
            netProfit: (fin.summary.totalRevenue || 0) - (fin.summary.totalExpenses || 0),
            unpaidCount: fin.summary.unpaidCount || 0,
            paidCount: fin.summary.paidCount || 0,
            totalInvoices: fin.summary.totalInvoices || 0,
            invoices: fin.invoices || [],
          });
        }
      }

      // Doctor report
      if (docRes.status === 'fulfilled') {
        const doc = docRes.value;
        if (doc && doc.doctors) setDoctorData({ doctors: doc.doctors || [] });
      }

      // Pharmacy report
      if (phaRes.status === 'fulfilled') {
        const pha = phaRes.value;
        if (pha && pha.summary) {
          setPharmacyData({
            totalMedicines: pha.summary.totalMedicines || 0, lowStockCount: pha.summary.lowStock || 0,
            prescriptionCount: pha.summary.prescriptionsThisMonth || 0, expiringSoon: pha.summary.expiringSoon || 0,
            inventoryValue: pha.summary.inventoryValue || 0, medicines: pha.topMedicines || [],
          });
        }
      }

      // Enhanced financial data
      if (monthlyRes.status === 'fulfilled' && Array.isArray(monthlyRes.value)) {
        setMonthlyRevenueData(monthlyRes.value);
      }
      if (dailyRes.status === 'fulfilled' && Array.isArray(dailyRes.value)) {
        setDailyRevenueData(dailyRes.value.map((d: any) => ({ date: d.date.slice(5), amount: d.amount })));
      }
      if (methodsRes.status === 'fulfilled' && Array.isArray(methodsRes.value)) {
        setPaymentMethodData(methodsRes.value.map((d: any) => ({ name: d.method, value: d.count, total: d.total })));
      }
      if (deptRes.status === 'fulfilled' && deptRes.value?.departments) {
        setDepartmentRevenueData(deptRes.value.departments);
      }
      if (overdueRes.status === 'fulfilled' && overdueRes.value?.overdueInvoices) {
        setOverdueCount(overdueRes.value.overdueInvoices.length);
      }
    } catch {} finally { setLoading(false); }
  }, [fromDate, toDate]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const reportDate = new Date().toLocaleDateString();

      if (activeTab === 'patients' && patientData) {
        const rows = [
          [t('patients') + ' — ' + reportDate], [],
          [t('total_patients'), patientData.totalPatients],
          [t('inpatient_label'), patientData.inpatientCount],
          [t('outpatient_label'), patientData.outpatientCount],
          [t('emergency_label'), patientData.emergencyCount], [],
          [t('today_label'), patientData.today], [t('this_week'), patientData.thisWeek], [t('this_month'), patientData.thisMonth], [],
          [t('male_label'), patientData.byGender?.male || 0], [t('female_label'), patientData.byGender?.female || 0],
        ];
        deptChartData.forEach((d) => rows.push([d.name, d.count]));
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 25 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws, t('patients'));
      }

      if (activeTab === 'financial' && financialData) {
        const summaryRows = [
          [t('financial_report') + ' — ' + reportDate], [],
          [t('total_income'), financialData.totalIncome],
          [t('total_expenses'), financialData.totalExpenses],
          [t('net_profit_label'), financialData.netProfit],
          [t('unpaid_label'), financialData.unpaidCount],
          [t('paid_count') || 'Paid', financialData.paidCount],
          [t('total_invoices') || 'Total Invoices', financialData.totalInvoices],
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
        ws1['!cols'] = [{ wch: 25 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws1, t('summary'));
      }

      if (activeTab === 'doctors' && doctorData?.doctors) {
        const headers = [[t('doctor'), t('specialty'), t('visits'), t('completed_label')]];
        const rows = doctorData.doctors.map((d: any) => [
          `${d.firstName} ${d.lastName}`, d.specialty || '', d.totalAppointments || 0, d.completedAppointments || 0,
        ]);
        const ws = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
        ws['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 12 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws, t('doctors'));
      }

      if (activeTab === 'pharmacy' && pharmacyData) {
        const summaryRows = [
          [t('pharmacy') + ' — ' + reportDate], [],
          [t('total_medicines'), pharmacyData.totalMedicines],
          [t('low_stock'), pharmacyData.lowStockCount],
          [t('prescriptions_label'), pharmacyData.prescriptionCount],
          [t('expiring_meds'), pharmacyData.expiringSoon],
          [t('inventory_value'), pharmacyData.inventoryValue],
        ];
        const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
        ws1['!cols'] = [{ wch: 25 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, ws1, t('summary'));
      }

      const fileName = `HMS_${activeTab}_report_${fromDate}_to_${toDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(t('csv_exported'));
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Export failed');
    }
  };

  // Derive chart data
  const totalPatientsForChart = patientData?.totalPatients || 100;
  const deptChartData = patientData
    ? [
        { name: t('emergency_label'), count: patientData.emergencyCount || Math.round(totalPatientsForChart * 0.15) },
        { name: t('outpatient_label'), count: patientData.outpatientCount || Math.round(totalPatientsForChart * 0.55) },
        { name: t('inpatient_label'), count: patientData.inpatientCount || Math.round(totalPatientsForChart * 0.3) },
      ]
    : [
        { name: t('emergency_label'), count: 25 }, { name: t('internal'), count: 42 },
        { name: t('surgery'), count: 18 }, { name: t('pediatrics'), count: 30 },
        { name: 'Cardiology', count: 15 }, { name: t('ob_gyn'), count: 22 },
      ];

  const baseRevenue = financialData?.totalIncome || 2000000;
  const revenueTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    const variation = 0.6 + ((i * 37 + 13) % 11) / 10;
    return { date: d.toLocaleDateString(), income: Math.floor(baseRevenue * variation / 7) };
  });

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      {/* Date Filter */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <BarChart3 className="size-5 text-primary" />
        <h1 className="text-xl font-bold">{t('reports')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div><Label className="text-xs">{t('from')}</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" /></div>
          <div><Label className="text-xs">{t('to')}</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" /></div>
          <Button className="bg-primary hover:bg-primary/90" onClick={fetchReports}>{t('generate')}</Button>
          <Button variant="outline" onClick={exportExcel}><FileDown className="size-4" />Excel</Button>
          <Button variant="outline" onClick={() => window.print()}><FileText className="size-4" />PDF</Button>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="patients"><Users className="size-4" />{t('patients')}</TabsTrigger>
          <TabsTrigger value="financial"><DollarSign className="size-4" />{t('financial_report')}</TabsTrigger>
          <TabsTrigger value="doctors"><Stethoscope className="size-4" />{t('doctors')}</TabsTrigger>
          <TabsTrigger value="pharmacy"><Pill className="size-4" />{t('pharmacy')}</TabsTrigger>
        </TabsList>

        {/* Patients Report */}
        <TabsContent value="patients" className="space-y-4 mt-4">
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('total_patients_label'), value: patientData?.totalPatients || '—', color: 'blue' },
              { label: t('inpatient_label'), value: patientData?.inpatientCount || '—', color: 'red' },
              { label: t('outpatient_label'), value: patientData?.outpatientCount || '—', color: 'green' },
              { label: t('emergency_label'), value: patientData?.emergencyCount || '—', color: 'amber' },
            ].map((s, i) => (
              <Card key={i}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p></CardContent></Card>
            ))}
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CollapsiblePanel id="reports-patients-dept" icon={Users} title={t('patients_by_department')}>
              <div className="h-64"><ResponsiveContainer><BarChart data={deptChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </CollapsiblePanel>
            <CollapsiblePanel id="reports-patients-summary" title={t('patient_summary')}>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">{t('today_label')}</p><p className="text-lg font-bold">{patientData?.today || '—'}</p></div>
                  <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">{t('this_week')}</p><p className="text-lg font-bold">{patientData?.thisWeek || '—'}</p></div>
                  <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">{t('this_month')}</p><p className="text-lg font-bold">{patientData?.thisMonth || '—'}</p></div>
                  <div className="p-3 rounded-lg bg-muted/50"><p className="text-xs text-muted-foreground">{t('male_label')}</p><p className="text-lg font-bold">{patientData?.byGender?.male || '—'}</p></div>
                </div>
              </div>
            </CollapsiblePanel>
          </div>
        </TabsContent>

        {/* ===== Financial Report (Enhanced) ===== */}
        <TabsContent value="financial" className="space-y-4 mt-4">
          {/* Summary Cards */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('total_income'), value: financialData?.totalIncome ? Number(financialData.totalIncome).toLocaleString() : '—', color: 'emerald' },
              { label: t('total_expenses'), value: financialData?.totalExpenses ? Number(financialData.totalExpenses).toLocaleString() : '—', color: 'red' },
              { label: t('profit_loss'), value: financialData?.netProfit ? Number(financialData.netProfit).toLocaleString() : '—', color: financialData?.netProfit >= 0 ? 'emerald' : 'red' },
              { label: t('overdue_invoices'), value: overdueCount || '—', color: 'amber' },
            ].map((s, i) => (
              <Card key={i}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p></CardContent></Card>
            ))}
          </motion.div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Monthly Revenue vs Expenses */}
            <CollapsiblePanel id="reports-financial-pl" icon={TrendingUp} title={t('profit_loss')}>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={monthlyRevenueData.length > 0 ? monthlyRevenueData : [{ month: 'N/A', revenue: 0, expenses: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name={t('revenue')} />
                    <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('expenses_label')} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CollapsiblePanel>

            {/* Payment Method Analysis */}
            <CollapsiblePanel id="reports-financial-payments" icon={PieChartIcon} title={t('payment_method_analysis')}>
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={paymentMethodData.length > 0 ? paymentMethodData : [{ name: 'No data', value: 1 }]} innerRadius={50} outerRadius={80} dataKey="value" label>
                      {paymentMethodData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CollapsiblePanel>

            {/* Daily Revenue Trend */}
            <CollapsiblePanel id="reports-financial-daily" icon={TrendingUp} title={t('daily_revenue_trend')}>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={dailyRevenueData.length > 0 ? dailyRevenueData : [{ date: 'N/A', amount: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={false} name={t('daily_revenue')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CollapsiblePanel>

            {/* Revenue by Department */}
            <CollapsiblePanel id="reports-financial-dept" icon={DollarSign} title={t('revenue_by_department')}>
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={departmentRevenueData.length > 0 ? departmentRevenueData : [{ department: 'N/A', revenue: 0 }]} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="department" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CollapsiblePanel>
          </div>

          {/* Accounts Receivable Aging */}
          <CollapsiblePanel id="reports-financial-aging" icon={TrendingUp} title={t('accounts_receivable_aging')}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {[
                { label: t('aging_0_30'), value: financialData?.unpaidCount || 0, color: 'emerald' },
                { label: t('aging_31_60'), value: '—', color: 'amber' },
                { label: t('aging_61_90'), value: '—', color: 'orange' },
                { label: t('aging_90_plus'), value: overdueCount || 0, color: 'red' },
              ].map((s, i) => (
                <Card key={i}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p></CardContent></Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t('outstanding_payments')}: {financialData?.unpaidCount || 0} {t('unpaid_invoices')}</p>
          </CollapsiblePanel>
        </TabsContent>

        {/* Doctors Report */}
        <TabsContent value="doctors" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CollapsiblePanel id="reports-doctors-visits" icon={Stethoscope} title={t('visits_per_doctor')}>
              <div className="h-64"><ResponsiveContainer><BarChart data={doctorData?.doctors?.map((d: any) => ({ name: `${d.firstName} ${d.lastName}`, visits: d.totalAppointments || 0 })) || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} /><Tooltip /><Bar dataKey="visits" fill="#3b82f6" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
            </CollapsiblePanel>
            <CollapsiblePanel id="reports-doctors-performance" icon={Stethoscope} title={t('doctor_performance')}>
              <div className="space-y-3">
                {doctorData?.doctors?.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div><p className="font-medium text-sm">{d.firstName} {d.lastName}</p><p className="text-xs text-muted-foreground">{d.specialty || ''}</p></div>
                    <div className="text-end"><p className="font-medium">{d.totalAppointments || 0} {t('visits_label')}</p><Badge variant="outline" className="text-xs">{d.completedAppointments || 0} {t('completed_label')}</Badge></div>
                  </div>
                )) || <p className="text-sm text-muted-foreground text-center py-8">{t('no_data')}</p>}
              </div>
            </CollapsiblePanel>
          </div>
        </TabsContent>

        {/* Pharmacy Report */}
        <TabsContent value="pharmacy" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: t('total_medicines'), value: pharmacyData?.totalMedicines || '—' },
              { label: t('low_stock_label'), value: pharmacyData?.lowStockCount || '—' },
              { label: t('prescriptions_label'), value: pharmacyData?.prescriptionCount || '—' },
            ].map((s, i) => (
              <Card key={i}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></CardContent></Card>
            ))}
          </div>
          <CollapsiblePanel id="reports-pharmacy-top" icon={Pill} title={t('top_medicines')}>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {pharmacyData?.medicines?.map((m: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div><p className="font-medium text-sm">{m.name}{m.nameFa ? ` (${m.nameFa})` : ''}</p><p className="text-xs text-muted-foreground">{m.category || ''}</p></div>
                  <div className="text-end flex items-center gap-4"><div className="text-right"><p className="font-medium">{m.currentStock ?? m.stock ?? 0}</p><p className="text-xs text-muted-foreground">{m.totalUsed !== undefined ? `${m.totalUsed} ${t('used')}` : ''}</p></div></div>
                </div>
              )) || <p className="text-sm text-muted-foreground text-center py-8">{t('no_data')}</p>}
            </div>
          </CollapsiblePanel>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

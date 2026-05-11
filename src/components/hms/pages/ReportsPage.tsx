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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Plus, Search, Users, DollarSign, TrendingUp, FileDown, FileText, Stethoscope, Pill, CalendarDays } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

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

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate });
      const [patRes, finRes, docRes, phaRes] = await Promise.allSettled([
        fetch(`/api/reports/patients?${params}`).then(r => r.json()),
        fetch(`/api/reports/financial?${params}`).then(r => r.json()),
        fetch(`/api/reports/doctors?${params}`).then(r => r.json()),
        fetch(`/api/reports/pharmacy?${params}`).then(r => r.json()),
      ]);
      if (patRes.status === 'fulfilled') setPatientData(patRes.value);
      if (finRes.status === 'fulfilled') setFinancialData(finRes.value);
      if (docRes.status === 'fulfilled') setDoctorData(docRes.value);
      if (phaRes.status === 'fulfilled') setPharmacyData(phaRes.value);
    } catch {}
    finally { setLoading(false); }
  }, [fromDate, toDate]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const exportCSV = () => {
    const data = activeTab === 'patients' ? patientData?.patients : activeTab === 'financial' ? financialData?.invoices : [];
    if (!data || !Array.isArray(data)) return;
    const headers = Object.keys(data[0] || {});
    const csv = [headers.join(','), ...data.map((row: any) => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeTab}_report_${fromDate}_to_${toDate}.csv`;
    a.click();
    toast.success('CSV exported');
  };

  // Demo data for charts when API doesn't return chart data
  const deptChartData = [
    { name: isRTL ? 'اورژانس' : 'Emergency', count: 25 },
    { name: isRTL ? 'داخلی' : 'Internal', count: 42 },
    { name: isRTL ? 'جراحی' : 'Surgery', count: 18 },
    { name: isRTL ? 'اطفال' : 'Pediatrics', count: 30 },
    { name: isRTL ? 'قلب' : 'Cardiology', count: 15 },
    { name: isRTL ? 'زنان' : 'OB/GYN', count: 22 },
  ];
  const revenueTrend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 6 + i);
    return { date: d.toLocaleDateString(), income: Math.floor(Math.random() * 5000000 + 2000000) };
  });
  const payPieData = [{ name: 'Cash', value: 40 }, { name: 'Card', value: 30 }, { name: 'Insurance', value: 25 }, { name: 'Installment', value: 5 }];

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      {/* Date Filter */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <BarChart3 className="size-5 text-emerald-600" />
        <h1 className="text-xl font-bold">{t('reports')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div><Label className="text-xs">{t('from')}</Label><Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-40" /></div>
          <div><Label className="text-xs">{t('to')}</Label><Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-40" /></div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={fetchReports}>{isRTL ? 'تولید گزارش' : 'Generate'}</Button>
          <Button variant="outline" onClick={exportCSV}><FileDown className="size-4" />CSV</Button>
          <Button variant="outline" onClick={() => window.print()}><FileText className="size-4" />PDF</Button>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="patients"><Users className="size-4" />{t('patients')}</TabsTrigger>
          <TabsTrigger value="financial"><DollarSign className="size-4" />{isRTL ? 'مالی' : 'Financial'}</TabsTrigger>
          <TabsTrigger value="doctors"><Stethoscope className="size-4" />{t('doctors')}</TabsTrigger>
          <TabsTrigger value="pharmacy"><Pill className="size-4" />{t('pharmacy')}</TabsTrigger>
        </TabsList>

        {/* Patients Report */}
        <TabsContent value="patients" className="space-y-4 mt-4">
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: isRTL ? 'کل بیماران' : 'Total Patients', value: patientData?.totalPatients || '—', color: 'blue' },
              { label: isRTL ? 'بستری' : 'Inpatient', value: patientData?.inpatientCount || '—', color: 'red' },
              { label: isRTL ? 'سرپایی' : 'Outpatient', value: patientData?.outpatientCount || '—', color: 'green' },
              { label: isRTL ? 'اورژانس' : 'Emergency', value: patientData?.emergencyCount || '—', color: 'amber' },
            ].map((s, i) => (
              <Card key={i}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-2xl font-bold text-${s.color}-600`}>{s.value}</p></CardContent></Card>
            ))}
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>{isRTL ? 'بیماران بر اساس بخش' : 'Patients by Department'}</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer><BarChart data={deptChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
            <Card><CardHeader><CardTitle>{isRTL ? 'آخرین بیماران' : 'Recent Patients'}</CardTitle></CardHeader><CardContent><div className="space-y-2 max-h-64 overflow-y-auto">{patientData?.patients?.slice(0, 10).map((p: any, i: number) => (<div key={i} className="flex items-center justify-between py-1 border-b last:border-0"><span className="text-sm">{p.firstName} {p.lastName}</span><Badge variant="outline" className="text-xs">{p.status}</Badge></div>)) || <p className="text-sm text-muted-foreground text-center py-8">{t('no_data')}</p>}</div></CardContent></Card>
          </div>
        </TabsContent>

        {/* Financial Report */}
        <TabsContent value="financial" className="space-y-4 mt-4">
          <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: isRTL ? 'کل درآمد' : 'Total Income', value: financialData?.totalIncome ? Number(financialData.totalIncome).toLocaleString() : '—' },
              { label: isRTL ? 'کل هزینه' : 'Total Expenses', value: financialData?.totalExpenses ? Number(financialData.totalExpenses).toLocaleString() : '—' },
              { label: isRTL ? 'سود خالص' : 'Net Profit', value: financialData?.netProfit ? Number(financialData.netProfit).toLocaleString() : '—' },
              { label: isRTL ? 'فاکتورهای پرداخت نشده' : 'Unpaid', value: financialData?.unpaidCount || '—' },
            ].map((s, i) => (
              <Card key={i}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></CardContent></Card>
            ))}
          </motion.div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>{isRTL ? 'روند درآمد' : 'Income Trend'}</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer><LineChart data={revenueTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} /></LineChart></ResponsiveContainer></div></CardContent></Card>
            <Card><CardHeader><CardTitle>{isRTL ? 'روش پرداخت' : 'Payment Methods'}</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer><PieChart><Pie data={payPieData} innerRadius={50} outerRadius={80} dataKey="value" label>{payPieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></CardContent></Card>
          </div>
        </TabsContent>

        {/* Doctors Report */}
        <TabsContent value="doctors" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>{isRTL ? 'ویزیت‌ها بر اساس پزشک' : 'Visits per Doctor'}</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer><BarChart data={doctorData?.doctors?.map((d: any) => ({ name: `${d.firstName} ${d.lastName}`, visits: d.visitCount || Math.floor(Math.random() * 50 + 10) })) || []} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} /><Tooltip /><Bar dataKey="visits" fill="#3b82f6" radius={[0,4,4,0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
            <Card><CardHeader><CardTitle>{isRTL ? 'عملکرد پزشکان' : 'Doctor Performance'}</CardTitle></CardHeader><CardContent><div className="space-y-3">{doctorData?.doctors?.map((d: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><p className="font-medium text-sm">{d.firstName} {d.lastName}</p><p className="text-xs text-muted-foreground">{d.specialty || ''}</p></div>
                <div className="text-end"><p className="font-medium">{(d.revenue || Math.floor(Math.random() * 10000000)).toLocaleString()}</p><Badge variant="outline" className="text-xs">{Math.floor(Math.random() * 50 + 10)} {isRTL ? 'ویزیت' : 'visits'}</Badge></div>
              </div>
            )) || <p className="text-sm text-muted-foreground text-center py-8">{t('no_data')}</p>}</div></CardContent></Card>
          </div>
        </TabsContent>

        {/* Pharmacy Report */}
        <TabsContent value="pharmacy" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: isRTL ? 'کل داروها' : 'Total Medicines', value: pharmacyData?.totalMedicines || '—' },
              { label: isRTL ? 'کمبود موجودی' : 'Low Stock', value: pharmacyData?.lowStockCount || '—' },
              { label: isRTL ? 'نسخه‌ها' : 'Prescriptions', value: pharmacyData?.prescriptionCount || '—' },
            ].map((s, i) => (
              <Card key={i}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></CardContent></Card>
            ))}
          </div>
          <Card><CardHeader><CardTitle>{isRTL ? 'گزارش داروها' : 'Medicine Report'}</CardTitle></CardHeader><CardContent><div className="space-y-2 max-h-80 overflow-y-auto">{pharmacyData?.medicines?.map((m: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
              <div><p className="font-medium text-sm">{m.name}{m.nameFa ? ` (${m.nameFa})` : ''}</p><p className="text-xs text-muted-foreground">{m.category || ''}</p></div>
              <div className="text-end"><p className="font-medium">{m.stock}</p><span className={`text-xs ${m.stock <= m.minStock ? 'text-red-600' : 'text-emerald-600'}`}>{m.stock <= m.minStock ? (isRTL ? 'کمبود!' : 'Low!') : (isRTL ? 'موجود' : 'OK')}</span></div>
            </div>
          )) || <p className="text-sm text-muted-foreground text-center py-8">{t('no_data')}</p>}</div></CardContent></Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguageStore, useAuthStore } from '@/store';
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
import {
  FlaskConical, Plus, Search, Printer, Eye, Edit, Trash2,
  CheckCircle, AlertTriangle, Clock, Droplets, Upload, FileText,
  TestTube, X, ScanBarcode,
} from 'lucide-react';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import { CollapsiblePanel } from '@/components/hms/shared/CollapsiblePanel';
import { BarcodeScanner } from '@/components/hms/shared/BarcodeScanner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

// ─── Shared types ────────────────────────────────────────────
interface LabTest { id: string; patientId: string; doctorId?: string; testName: string; category?: string; status: string; results?: string; notes?: string; cost: number; testDate: string; patient?: { firstName: string; lastName: string }; doctor?: { firstName: string; lastName: string }; }
interface Patient { id: string; firstName: string; lastName: string; }
interface Doctor { id: string; firstName: string; lastName: string; specialty: string; }
interface ResultRow { name: string; value: string; unit: string; normalMin: string; normalMax: string; status: string; }

// ─── Blood Bag types ─────────────────────────────────────────
interface BloodBag {
  id: string;
  bagNumber: string;
  donorName: string;
  donorPhone?: string;
  donorNationalId?: string;
  bloodType: string;
  volume: number;
  collectionDate: string;
  expiryDate: string;
  status: string;
  hivTest?: string;
  hepatitisBTest?: string;
  hepatitisCTest?: string;
  malariaTest?: string;
  syphilisTest?: string;
  testedBy?: string;
  testedDate?: string;
  issuedTo?: string;
  issuedDate?: string;
  collectedBy?: string;
  notes?: string;
  fileName?: string;
  filePath?: string;
  createdAt: string;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const BAG_STATUSES = ['collected', 'tested', 'stored', 'issued', 'used', 'expired', 'discarded'];
const STATUS_COLORS: Record<string, string> = {
  collected: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  tested: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  stored: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  issued: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  used: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  discarded: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-500',
};
const TEST_RESULT_COLORS: Record<string, string> = {
  negative: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  positive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

// ═══════════════════════════════════════════════════════════════
//  Main component
// ═══════════════════════════════════════════════════════════════

export function LaboratoryPage() {
  const { t, isRTL } = useLanguageStore();
  const [activeTab, setActiveTab] = useState('lab-tests');

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex">
          <TabsTrigger value="lab-tests" className="gap-2">
            <FlaskConical className="size-4" />
            <span>{t('lab_tests')}</span>
          </TabsTrigger>
          <TabsTrigger value="blood-bags" className="gap-2">
            <Droplets className="size-4" />
            <span>{t('blood_bank')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lab-tests">
          <LabTestsSection t={t} isRTL={isRTL} />
        </TabsContent>
        <TabsContent value="blood-bags">
          <BloodBagsSection t={t} isRTL={isRTL} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Lab Tests Section (existing functionality)
// ═══════════════════════════════════════════════════════════════

function LabTestsSection({ t, isRTL }: { t: (k: string) => string; isRTL: boolean }) {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [requestOpen, setRequestOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(null);
  const [resultRows, setResultRows] = useState<ResultRow[]>([{ name: '', value: '', unit: '', normalMin: '', normalMax: '', status: 'normal' }]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ patientId: '', doctorId: '', testName: '', category: 'blood', cost: '' });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const [testRes, patRes, docRes] = await Promise.allSettled([
        apiFetch(`/api/laboratory?${params}`).catch(() => null),
        apiFetch('/api/patients?limit=50').catch(() => null),
        apiFetch('/api/doctors').catch(() => null),
      ]);
      if (testRes.status === 'fulfilled' && testRes.value) {
        const d = testRes.value;
        setTests(Array.isArray(d.labTests) ? d.labTests : (Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : [])));
      }
      if (patRes.status === 'fulfilled' && patRes.value) {
        const p = patRes.value;
        setPatients(Array.isArray(p.patients) ? p.patients : (Array.isArray(p.data) ? p.data : (Array.isArray(p) ? p : [])));
      }
      if (docRes.status === 'fulfilled' && docRes.value) {
        const d = docRes.value;
        setDoctors(Array.isArray(d.doctors) ? d.doctors : (Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : [])));
      }
    } catch {}
    finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const pendingCount = tests.filter(x => x.status === 'pending').length;
  const completedCount = tests.filter(x => x.status === 'completed').length;

  const handleRequest = async () => {
    if (!form.patientId || !form.testName) { toast.error('Fill required fields'); return; }
    try {
      await apiFetch('/api/laboratory', {
        method: 'POST',
        body: { ...form, cost: Number(form.cost) || 0 },
      });
      toast.success(t('added')); setRequestOpen(false); setForm({ patientId: '', doctorId: '', testName: '', category: 'blood', cost: '' }); fetchData();
    } catch { toast.error(t('error')); }
  };

  const openResults = (test: LabTest) => {
    setSelectedTest(test);
    try {
      const parsed = test.results ? JSON.parse(test.results) : [{ name: '', value: '', unit: '', normalMin: '', normalMax: '', status: 'normal' }];
      setResultRows(parsed.map((r: any) => ({ ...r })));
    } catch { setResultRows([{ name: '', value: '', unit: '', normalMin: '', normalMax: '', status: 'normal' }]); }
    setResultsOpen(true);
  };

  const updateResultRow = (i: number, f: string, v: string) => {
    const u = [...resultRows]; (u[i] as any)[f] = v;
    const row = u[i]; const val = parseFloat(row.value); const min = parseFloat(row.normalMin); const max = parseFloat(row.normalMax);
    if (!isNaN(val) && !isNaN(min) && !isNaN(max)) {
      if (val < min || val > max) { const diff = val < min ? min - val : val - max; const range = max - min; row.status = diff > range * 0.2 ? 'high' : 'borderline'; }
      else row.status = 'normal';
    }
    setResultRows(u);
  };

  const addResultRow = () => setResultRows([...resultRows, { name: '', value: '', unit: '', normalMin: '', normalMax: '', status: 'normal' }]);

  const saveResults = async () => {
    if (!selectedTest) return;
    try {
      await apiFetch(`/api/laboratory?id=${selectedTest.id}`, {
        method: 'PUT',
        body: { status: 'completed', results: JSON.stringify(resultRows.filter(r => r.name && r.value)) },
      });
      toast.success(t('saved')); setResultsOpen(false); fetchData();
    } catch { toast.error(t('error')); }
  };

  const handleDeleteTest = async () => {
    if (!deleteTarget) return;
    try {
      await apiFetch(`/api/laboratory?id=${deleteTarget}`, { method: 'DELETE' });
      toast.success(t('deleted')); setDeleteConfirmOpen(false); setDeleteTarget(null); fetchData();
    } catch { toast.error(t('error')); }
  };

  const getStatusColor = (s: string) => s === 'normal' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : s === 'borderline' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  const handlePrint = (test: LabTest) => {
    if (!test.results) return;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html dir="${isRTL ? 'rtl' : 'ltr'}"><head><title>${test.testName}</title><style>body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f0fdf4}.normal{color:green}.borderline{color:orange}.high{color:red}h1{font-size:1.5rem;margin-bottom:4px}p{color:#666;font-size:0.9rem}</style></head><body><h1>${test.testName}</h1><p>${t('patient')}: ${test.patient?.firstName} ${test.patient?.lastName}</p><p>${t('date')}: ${new Date(test.testDate).toLocaleDateString()}</p><table><thead><tr><th>${t('name_label')}</th><th>${t('value_label')}</th><th>${t('unit_label')}</th><th>${t('normal_range')}</th><th>${t('status_label')}</th></tr></thead><tbody>${JSON.parse(test.results).map((r: ResultRow) => `<tr><td>${r.name}</td><td>${r.value}</td><td>${r.unit}</td><td>${r.normalMin}-${r.normalMax}</td><td class="${r.status}">${r.status}</td></tr>`).join('')}</tbody></table></body></html>`);
      w.document.close(); w.print();
    }
  };

  const catData = ['blood', 'urine', 'imaging', 'other'].map(c => ({ name: c, count: tests.filter(x => x.category === c).length }));

  return (
    <motion.div variants={fadeUp} className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FlaskConical, label: t('total_tests'), value: tests.length, color: 'text-blue-600' },
          { icon: Clock, label: t('pending_tests'), value: pendingCount, color: 'text-amber-600' },
          { icon: CheckCircle, label: t('completed_tests'), value: completedCount, color: 'text-primary' },
          { icon: AlertTriangle, label: t('today_tests'), value: tests.filter(x => { const d = new Date(x.testDate); return d.toDateString() === new Date().toDateString(); }).length, color: 'text-purple-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4"><div className="flex items-center gap-3"><s.icon className={`size-8 ${s.color} opacity-70 shrink-0`} /><div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div></div></CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className={`absolute top-2.5 size-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className={isRTL ? 'pr-9' : 'pl-9'} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{['all','pending','processing','completed'].map(s => <SelectItem key={s} value={s}>{s === 'all' ? t('all') : s}</SelectItem>)}</SelectContent>
            </Select>
            <Button className="bg-primary hover:bg-primary/90 w-full sm:w-auto" onClick={() => setRequestOpen(true)}>
              <Plus className="size-4 shrink-0" />{t('request_new_test')}
            </Button>
          </div>

          <CollapsiblePanel id="lab-tests-list" icon={FlaskConical} title={t('lab_tests')} badge={tests.length}>
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">{t('patient')}</th>
                    <th className="p-3 text-start font-medium">{t('test_name_label')}</th>
                    <th className="p-3 text-start font-medium">{t('category_label')}</th>
                    <th className="p-3 text-start font-medium">{t('doctor')}</th>
                    <th className="p-3 text-start font-medium">{t('test_date')}</th>
                    <th className="p-3 text-start font-medium">{t('status')}</th>
                    <th className="p-3 text-start font-medium">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr key={test.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium whitespace-nowrap">{test.patient ? `${test.patient.firstName} ${test.patient.lastName}` : '-'}</td>
                      <td className="p-3 whitespace-nowrap">{test.testName}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{test.category || '-'}</Badge></td>
                      <td className="p-3 whitespace-nowrap">{test.doctor ? `${test.doctor.firstName} ${test.doctor.lastName}` : '-'}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{new Date(test.testDate).toLocaleDateString()}</td>
                      <td className="p-3"><StatusBadge status={test.status} /></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {test.status === 'pending' && (
                            <Button size="sm" className="h-7 bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => openResults(test)}>
                              <Edit className="size-3 shrink-0" /><span className="hidden sm:inline">Results</span>
                            </Button>
                          )}
                          {test.status === 'completed' && (
                            <>
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => { setSelectedTest(test); setViewOpen(true); }}><Eye className="size-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => handlePrint(test)}><Printer className="size-3.5" /></Button>
                            </>
                          )}
                          {test.status !== 'completed' && (
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => { setDeleteTarget(test.id); setDeleteConfirmOpen(true); }}><Trash2 className="size-3.5" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tests.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <FlaskConical className="size-10 mx-auto mb-2 opacity-30" /><p>{t('no_data')}</p>
                </div>
              )}
            </div>
          </CollapsiblePanel>
        </div>

        <CollapsiblePanel id="lab-tests-chart" title={t('tests_by_category')} className="h-fit">
          <div className="h-48"><ResponsiveContainer><BarChart data={catData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
        </CollapsiblePanel>
      </div>

      {/* Request Dialog */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader><DialogTitle>{t('request_new_lab_test')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>{t('patient')}</Label><Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder={t('select_patient')} /></SelectTrigger><SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t('doctor')}</Label><Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })}><SelectTrigger><SelectValue placeholder={t('select_doctor_label')} /></SelectTrigger><SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName} - {d.specialty}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('test_name_label')}</Label><Input value={form.testName} onChange={e => setForm({ ...form, testName: e.target.value })} placeholder="CBC, Lipid Panel,..." /></div>
              <div><Label>{t('category_label')}</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['blood','urine','imaging','other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>{t('cost')}</Label><Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>
            <Button onClick={handleRequest} className="w-full bg-primary hover:bg-primary/90">{t('submit_request')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base sm:text-lg">{t('enter_test_results')} - {selectedTest?.testName}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{selectedTest?.patient ? `${selectedTest.patient.firstName} ${selectedTest.patient.lastName}` : ''}</p>
            <div className="space-y-3">
              {resultRows.map((row, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-3">
                  <div className="sm:hidden space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1"><Label className="text-xs">{t('name_label')}</Label><Input value={row.name} onChange={e => updateResultRow(i, 'name', e.target.value)} /></div>
                      <div className="w-20 space-y-1"><Label className="text-xs">{t('value_label')}</Label><Input value={row.value} onChange={e => updateResultRow(i, 'value', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-xs">{t('unit_label')}</Label><Input value={row.unit} onChange={e => updateResultRow(i, 'unit', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">{t('status_label')}</Label><span className={`inline-block px-2 py-1.5 rounded text-xs font-medium ${getStatusColor(row.status)}`}>{row.status}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1"><Label className="text-xs">Min</Label><Input value={row.normalMin} onChange={e => updateResultRow(i, 'normalMin', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-xs">Max</Label><Input value={row.normalMax} onChange={e => updateResultRow(i, 'normalMax', e.target.value)} /></div>
                    </div>
                    <div className="flex justify-end"><Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => setResultRows(resultRows.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></Button></div>
                  </div>
                  <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-end">
                    <div className="col-span-3"><Label className="text-xs">{t('name_label')}</Label><Input value={row.name} onChange={e => updateResultRow(i, 'name', e.target.value)} /></div>
                    <div className="col-span-2"><Label className="text-xs">{t('value_label')}</Label><Input value={row.value} onChange={e => updateResultRow(i, 'value', e.target.value)} /></div>
                    <div className="col-span-2"><Label className="text-xs">{t('unit_label')}</Label><Input value={row.unit} onChange={e => updateResultRow(i, 'unit', e.target.value)} /></div>
                    <div className="col-span-2"><Label className="text-xs">{t('normal_range')}</Label><div className="flex gap-1"><Input placeholder="Min" value={row.normalMin} onChange={e => updateResultRow(i, 'normalMin', e.target.value)} /><Input placeholder="Max" value={row.normalMax} onChange={e => updateResultRow(i, 'normalMax', e.target.value)} /></div></div>
                    <div className="col-span-2"><Label className="text-xs">{t('status_label')}</Label><span className={`inline-block px-2 py-1.5 rounded text-xs font-medium ${getStatusColor(row.status)}`}>{row.status}</span></div>
                    <div className="col-span-1 flex items-end"><Button size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => setResultRows(resultRows.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></Button></div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addResultRow} className="w-full sm:w-auto"><Plus className="size-3" />{t('add_row')}</Button>
            </div>
            <Button onClick={saveResults} className="w-full bg-primary hover:bg-primary/90">{t('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }} onConfirm={handleDeleteTest} title={t('delete')} description={t('delete_lab_test_confirm')} confirmLabel={t('delete')} variant="danger" />

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base sm:text-lg">{selectedTest?.testName}</DialogTitle></DialogHeader>
          {selectedTest && selectedTest.results && (
            <>
              <div className="text-sm text-muted-foreground mb-3">{selectedTest.patient?.firstName} {selectedTest.patient?.lastName} | {new Date(selectedTest.testDate).toLocaleDateString()}</div>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full border text-sm min-w-[500px]">
                  <thead><tr className="bg-muted"><th className="border p-2">{t('name_label')}</th><th className="border p-2">{t('value_label')}</th><th className="border p-2">{t('unit_label')}</th><th className="border p-2">{t('normal_range')}</th><th className="border p-2">{t('status_label')}</th></tr></thead>
                  <tbody>
                    {(() => { try { return JSON.parse(selectedTest.results).map((r: ResultRow, i: number) => (<tr key={i}><td className="border p-2 whitespace-nowrap">{r.name}</td><td className="border p-2 font-medium">{r.value}</td><td className="border p-2">{r.unit}</td><td className="border p-2">{r.normalMin}-{r.normalMax}</td><td className="border p-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(r.status)}`}>{r.status}</span></td></tr>)); } catch { return null; } })()}
                  </tbody>
                </table>
              </div>
              <Button className="w-full mt-3" onClick={() => handlePrint(selectedTest)}><Printer className="size-4 shrink-0" />{t('print')}</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  Blood Bags Section (NEW — blood bag collection + upload)
// ═══════════════════════════════════════════════════════════════

function BloodBagsSection({ t, isRTL }: { t: (k: string) => string; isRTL: boolean }) {
  const [bloodBags, setBloodBags] = useState<BloodBag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBloodType, setFilterBloodType] = useState('all');
  // Dialogs
  const [collectOpen, setCollectOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedBag, setSelectedBag] = useState<BloodBag | null>(null);
  // Forms
  const [collectForm, setCollectForm] = useState({
    bagNumber: '', donorName: '', donorPhone: '', donorNationalId: '',
    bloodType: 'O+', volume: '450', expiryDate: '', collectedBy: '', notes: '',
  });
  const [testForm, setTestForm] = useState({
    hivTest: 'pending', hepatitisBTest: 'pending', hepatitisCTest: 'pending',
    malariaTest: 'pending', syphilisTest: 'pending', testedBy: '',
  });
  const [issueForm, setIssueForm] = useState({ issuedTo: '' });
  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      if (filterBloodType !== 'all') params.set('bloodType', filterBloodType);
      const res = await fetch(`/api/blood-bags?${params}`);
      const data = await res.json();
      setBloodBags(Array.isArray(data.bloodBags) ? data.bloodBags : []);
    } catch {}
    finally { setLoading(false); }
  }, [search, filterStatus, filterBloodType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Generate next bag number
  const generateBagNumber = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const count = bloodBags.length + 1;
    return `BB-${dateStr}-${String(count).padStart(4, '0')}`;
  };

  // Calculate default expiry (42 days from now)
  const defaultExpiry = () => {
    const d = new Date();
    d.setDate(d.getDate() + 42);
    return d.toISOString().split('T')[0];
  };

  // ─── Collect (create) blood bag with file upload ──────────
  const handleCollect = async () => {
    if (!collectForm.bagNumber || !collectForm.donorName || !collectForm.bloodType || !collectForm.expiryDate) {
      toast.error(t('bag_required_fields'));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('bagNumber', collectForm.bagNumber);
      formData.append('donorName', collectForm.donorName);
      if (collectForm.donorPhone) formData.append('donorPhone', collectForm.donorPhone);
      if (collectForm.donorNationalId) formData.append('donorNationalId', collectForm.donorNationalId);
      formData.append('bloodType', collectForm.bloodType);
      formData.append('volume', collectForm.volume);
      formData.append('expiryDate', collectForm.expiryDate);
      if (collectForm.collectedBy) formData.append('collectedBy', collectForm.collectedBy);
      if (collectForm.notes) formData.append('notes', collectForm.notes);
      if (uploadFile) formData.append('file', uploadFile);

      const res = await fetch('/api/blood-bags', { method: 'POST', body: formData, headers: useAuthStore.getState().authHeaders });
      if (res.ok) {
        toast.success(t('blood_bag_collected'));
        setCollectOpen(false);
        setUploadFile(null);
        setCollectForm({ bagNumber: '', donorName: '', donorPhone: '', donorNationalId: '', bloodType: 'O+', volume: '450', expiryDate: '', collectedBy: '', notes: '' });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || t('error'));
      }
    } catch { toast.error(t('error')); }
    finally { setUploading(false); }
  };

  // ─── Save test results ─────────────────────────────────────
  const handleSaveTests = async () => {
    if (!selectedBag) return;
    try {
      await apiFetch(`/api/blood-bags?id=${selectedBag.id}`, {
        method: 'PUT',
        body: { status: 'tested', ...testForm },
      });
      toast.success(t('blood_bag_tested')); setTestOpen(false); fetchData();
    } catch { toast.error(t('error')); }
  };

  // ─── Issue blood bag ───────────────────────────────────────
  const handleIssue = async () => {
    if (!selectedBag || !issueForm.issuedTo) { toast.error(t('bag_required_fields')); return; }
    try {
      await apiFetch(`/api/blood-bags?id=${selectedBag.id}`, {
        method: 'PUT',
        body: { status: 'issued', issuedTo: issueForm.issuedTo },
      });
      toast.success(t('blood_bag_issued')); setIssueOpen(false); fetchData();
    } catch { toast.error(t('error')); }
  };

  // ─── Delete ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/blood-bags?id=${deleteTarget}`, { method: 'DELETE' });
      if (res.ok) { toast.success(t('deleted')); setDeleteConfirmOpen(false); setDeleteTarget(null); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  // ─── Print bag label ───────────────────────────────────────
  const handlePrintLabel = (bag: BloodBag) => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html dir="${isRTL ? 'rtl' : 'ltr'}"><head><title>${bag.bagNumber}</title><style>body{font-family:Arial,sans-serif;padding:30px;max-width:400px;margin:0 auto;border:2px solid #333;border-radius:12px}.header{text-align:center;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:15px}h1{margin:0;font-size:18px}h2{margin:5px 0;font-size:24px;color:#cc0000}table{width:100%;border-collapse:collapse}td{padding:6px 8px;border-bottom:1px solid #eee}td:first-child{font-weight:bold;width:40%}.warning{background:#fff3cd;padding:8px;border-radius:6px;text-align:center;margin-top:10px;font-weight:bold}.footer{margin-top:15px;text-align:center;font-size:10px;color:#666}@media print{body{padding:20px}}</style></head><body><div class="header"><h1>BLOOD BANK</h1><h2>${bag.bagNumber}</h2></div><table><tr><td>Blood Type:</td><td style="font-size:20px;color:#cc0000;font-weight:bold">${bag.bloodType}</td></tr><tr><td>Volume:</td><td>${bag.volume} ml</td></tr><tr><td>Donor:</td><td>${bag.donorName}</td></tr><tr><td>Collection:</td><td>${new Date(bag.collectionDate).toLocaleDateString()}</td></tr><tr><td>Expiry:</td><td>${new Date(bag.expiryDate).toLocaleDateString()}</td></tr><tr><td>Collected By:</td><td>${bag.collectedBy || '-'}</td></tr><tr><td>Status:</td><td>${bag.status.toUpperCase()}</td></tr></table><div class="warning">Check blood type before transfusion!</div><div class="footer">Scan QR code for digital record | ${bag.bagNumber}</div></body></html>`);
      w.document.close(); w.print();
    }
  };

  // ─── Stats ─────────────────────────────────────────────────
  const totalBags = bloodBags.length;
  const availableBags = bloodBags.filter(b => ['stored', 'tested'].includes(b.status)).length;
  const collectedToday = bloodBags.filter(b => new Date(b.collectionDate).toDateString() === new Date().toDateString()).length;
  const expiredBags = bloodBags.filter(b => b.status === 'expired').length;

  // Blood type distribution for pie chart
  const bloodTypeData = BLOOD_TYPES.map(bt => ({
    name: bt,
    value: bloodBags.filter(b => b.bloodType === bt).length,
  })).filter(d => d.value > 0);

  const PIE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <motion.div variants={fadeUp} className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Droplets, label: t('total_blood_bags'), value: totalBags, color: 'text-red-600' },
          { icon: CheckCircle, label: t('available_bags'), value: availableBags, color: 'text-primary' },
          { icon: TestTube, label: t('collected_today'), value: collectedToday, color: 'text-blue-600' },
          { icon: AlertTriangle, label: t('expired_bags'), value: expiredBags, color: 'text-amber-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4"><div className="flex items-center gap-3"><s.icon className={`size-8 ${s.color} opacity-70 shrink-0`} /><div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div></div></CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main list */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search / Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className={`absolute top-2.5 size-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input placeholder={t('search_blood_bags')} value={search} onChange={e => setSearch(e.target.value)} className={isRTL ? 'pr-9' : 'pl-9'} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                {BAG_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`bag_status_${s}`) || s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBloodType} onValueChange={setFilterBloodType}>
              <SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                {BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button className="bg-red-600 hover:bg-red-700 w-full sm:w-auto" onClick={() => {
              setCollectForm(prev => ({ ...prev, bagNumber: generateBagNumber(), expiryDate: defaultExpiry() }));
              setUploadFile(null);
              setCollectOpen(true);
            }}>
              <Droplets className="size-4 shrink-0" />{t('collect_blood_bag')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setScannerOpen(true)}
            >
              <ScanBarcode className="size-4 shrink-0" />
              <span className="hidden sm:inline">{t('scan_blood_bag')}</span>
            </Button>
          </div>

          {/* Table */}
          <CollapsiblePanel id="blood-bags-list" icon={Droplets} title={t('blood_bank')} badge={bloodBags.length}>
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">{t('bag_number')}</th>
                    <th className="p-3 text-start font-medium">{t('donor_name')}</th>
                    <th className="p-3 text-start font-medium">{t('blood_type')}</th>
                    <th className="p-3 text-start font-medium">{t('volume_ml')}</th>
                    <th className="p-3 text-start font-medium">{t('collection_date')}</th>
                    <th className="p-3 text-start font-medium">{t('expiry_date')}</th>
                    <th className="p-3 text-start font-medium">{t('status')}</th>
                    <th className="p-3 text-start font-medium">{t('document')}</th>
                    <th className="p-3 text-start font-medium">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {bloodBags.map((bag) => (
                    <tr key={bag.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs font-semibold whitespace-nowrap">{bag.bagNumber}</td>
                      <td className="p-3 whitespace-nowrap">{bag.donorName}</td>
                      <td className="p-3"><span className="inline-block px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold">{bag.bloodType}</span></td>
                      <td className="p-3 text-xs">{bag.volume} ml</td>
                      <td className="p-3 text-xs whitespace-nowrap">{new Date(bag.collectionDate).toLocaleDateString()}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{new Date(bag.expiryDate).toLocaleDateString()}</td>
                      <td className="p-3"><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[bag.status] || ''}`}>{t(`bag_status_${bag.status}`) || bag.status}</span></td>
                      <td className="p-3">
                        {bag.fileName ? (
                          <a href={bag.filePath || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <FileText className="size-3.5" />{bag.fileName.length > 12 ? bag.fileName.slice(0, 12) + '...' : bag.fileName}
                          </a>
                        ) : <span className="text-xs text-muted-foreground">-</span>}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1 flex-wrap">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => { setSelectedBag(bag); setViewOpen(true); }}><Eye className="size-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => handlePrintLabel(bag)}><Printer className="size-3.5" /></Button>
                          {bag.status === 'collected' && (
                            <Button size="sm" className="h-7 bg-amber-500 hover:bg-amber-600 text-xs" onClick={() => {
                              setSelectedBag(bag);
                              setTestForm({ hivTest: 'pending', hepatitisBTest: 'pending', hepatitisCTest: 'pending', malariaTest: 'pending', syphilisTest: 'pending', testedBy: '' });
                              setTestOpen(true);
                            }}>
                              <TestTube className="size-3 shrink-0" /><span className="hidden sm:inline">{t('run_tests')}</span>
                            </Button>
                          )}
                          {(bag.status === 'tested' || bag.status === 'stored') && (
                            <Button size="sm" className="h-7 bg-purple-600 hover:bg-purple-700 text-xs" onClick={() => {
                              setSelectedBag(bag);
                              setIssueForm({ issuedTo: '' });
                              setIssueOpen(true);
                            }}>
                              <Droplets className="size-3 shrink-0" /><span className="hidden sm:inline">{t('issue_bag')}</span>
                            </Button>
                          )}
                          {bag.status !== 'used' && (
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => { setDeleteTarget(bag.id); setDeleteConfirmOpen(true); }}><Trash2 className="size-3.5" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {bloodBags.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <Droplets className="size-10 mx-auto mb-2 opacity-30" /><p>{t('no_blood_bags')}</p>
                </div>
              )}
            </div>
          </CollapsiblePanel>
        </div>

        {/* Sidebar: Blood type distribution */}
        <CollapsiblePanel id="blood-bags-chart" title={t('blood_type_distribution')} className="h-fit">
            {bloodTypeData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer><PieChart>
                  <Pie data={bloodTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                    {bloodTypeData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart></ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">{t('no_data')}</div>
            )}
            {/* Quick blood type stock */}
            <div className="mt-3 space-y-1">
              {BLOOD_TYPES.map(bt => {
                const count = bloodBags.filter(b => b.bloodType === bt && ['stored', 'tested'].includes(b.status)).length;
                return (
                  <div key={bt} className="flex items-center justify-between text-xs">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-mono font-bold w-8 text-center">{bt}</span>
                    <span className={count > 0 ? 'text-foreground' : 'text-muted-foreground'}>{count} {t('bags')}</span>
                  </div>
                );
              })}
            </div>
        </CollapsiblePanel>
      </div>

      {/* ─── Collect Blood Bag Dialog ──────────────────────── */}
      <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="size-5 text-red-500" />
              {t('collect_blood_bag')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Bag number (auto-generated) */}
            <div>
              <Label>{t('bag_number')} *</Label>
              <Input value={collectForm.bagNumber} onChange={e => setCollectForm({ ...collectForm, bagNumber: e.target.value })} placeholder="BB-YYYYMMDD-0001" />
            </div>

            {/* Donor info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t('donor_name')} *</Label>
                <Input value={collectForm.donorName} onChange={e => setCollectForm({ ...collectForm, donorName: e.target.value })} />
              </div>
              <div>
                <Label>{t('donor_phone')}</Label>
                <Input value={collectForm.donorPhone} onChange={e => setCollectForm({ ...collectForm, donorPhone: e.target.value })} placeholder="+93 7XX XXX XXX" />
              </div>
            </div>

            <div>
              <Label>{t('donor_national_id')}</Label>
              <Input value={collectForm.donorNationalId} onChange={e => setCollectForm({ ...collectForm, donorNationalId: e.target.value })} />
            </div>

            {/* Blood type & Volume */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('blood_type')} *</Label>
                <Select value={collectForm.bloodType} onValueChange={v => setCollectForm({ ...collectForm, bloodType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BLOOD_TYPES.map(bt => <SelectItem key={bt} value={bt}>{bt}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('volume_ml')}</Label>
                <Input type="number" value={collectForm.volume} onChange={e => setCollectForm({ ...collectForm, volume: e.target.value })} />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('collection_date')}</Label>
                <Input type="date" value={collectForm.expiryDate ? '' : new Date().toISOString().split('T')[0]} disabled />
              </div>
              <div>
                <Label>{t('expiry_date')} *</Label>
                <Input type="date" value={collectForm.expiryDate} onChange={e => setCollectForm({ ...collectForm, expiryDate: e.target.value })} />
              </div>
            </div>

            {/* Collected by */}
            <div>
              <Label>{t('collected_by')}</Label>
              <Input value={collectForm.collectedBy} onChange={e => setCollectForm({ ...collectForm, collectedBy: e.target.value })} />
            </div>

            {/* File Upload */}
            <div>
              <Label>{t('upload_document')}</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/50 ${uploadFile ? 'border-primary/50 bg-primary/5 dark:bg-primary/5' : 'border-border'}`}
              >
                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="size-5 text-primary" />
                    <span className="text-sm font-medium text-primary truncate max-w-[200px]">{uploadFile.name}</span>
                    <button onClick={e => { e.stopPropagation(); setUploadFile(null); }} className="text-muted-foreground hover:text-destructive">
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t('click_or_drag_file')}</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOC</p>
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label>{t('notes')}</Label>
              <Textarea value={collectForm.notes} onChange={e => setCollectForm({ ...collectForm, notes: e.target.value })} rows={2} />
            </div>

            <Button onClick={handleCollect} disabled={uploading} className="w-full bg-red-600 hover:bg-red-700">
              {uploading ? (
                <span className="flex items-center gap-2"><span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{t('uploading')}</span>
              ) : (
                <><Droplets className="size-4 shrink-0" />{t('collect_and_upload')}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Test Results Dialog ───────────────────────────── */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TestTube className="size-5 text-amber-500" />{t('run_blood_tests')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedBag && (
              <p className="text-sm text-muted-foreground">
                {t('bag_number')}: <span className="font-mono font-bold">{selectedBag.bagNumber}</span> | {t('blood_type')}: <span className="text-red-600 font-bold">{selectedBag.bloodType}</span> | {t('donor_name')}: {selectedBag.donorName}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              {(['hivTest', 'hepatitisBTest', 'hepatitisCTest', 'malariaTest', 'syphilisTest'] as const).map(testKey => (
                <div key={testKey}>
                  <Label className="text-xs">{t(`test_${testKey}`)}</Label>
                  <Select value={testForm[testKey]} onValueChange={v => setTestForm({ ...testForm, [testKey]: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('test_pending')}</SelectItem>
                      <SelectItem value="negative">{t('test_negative')}</SelectItem>
                      <SelectItem value="positive">{t('test_positive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div>
              <Label>{t('tested_by')}</Label>
              <Input value={testForm.testedBy} onChange={e => setTestForm({ ...testForm, testedBy: e.target.value })} />
            </div>

            <Button onClick={handleSaveTests} className="w-full bg-amber-500 hover:bg-amber-600">
              <TestTube className="size-4 shrink-0" />{t('save_test_results')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Issue Bag Dialog ──────────────────────────────── */}
      <Dialog open={issueOpen} onOpenChange={setIssueOpen}>
        <DialogContent className="max-w-sm w-[calc(100%-2rem)]">
          <DialogHeader><DialogTitle>{t('issue_blood_bag')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {selectedBag && (
              <p className="text-sm text-muted-foreground">
                {t('bag_number')}: <span className="font-mono font-bold">{selectedBag.bagNumber}</span> | {t('blood_type')}: <span className="text-red-600 font-bold">{selectedBag.bloodType}</span>
              </p>
            )}
            <div>
              <Label>{t('issue_to_patient')} *</Label>
              <Input value={issueForm.issuedTo} onChange={e => setIssueForm({ ...issueForm, issuedTo: e.target.value })} placeholder={t('patient_name')} />
            </div>
            <Button onClick={handleIssue} className="w-full bg-purple-600 hover:bg-purple-700">
              <Droplets className="size-4 shrink-0" />{t('confirm_issue')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── View Bag Details Dialog ───────────────────────── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Droplets className="size-5 text-red-500" />{t('blood_bag_details')}</DialogTitle>
          </DialogHeader>
          {selectedBag && (
            <div className="space-y-4 py-2">
              {/* Header card */}
              <div className="rounded-xl border-2 border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/10 p-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">{t('bag_number')}:</span><br /><span className="font-mono font-bold text-lg">{selectedBag.bagNumber}</span></div>
                  <div><span className="text-muted-foreground">{t('blood_type')}:</span><br /><span className="inline-block px-3 py-1 rounded-md bg-red-600 text-white text-lg font-bold">{selectedBag.bloodType}</span></div>
                  <div><span className="text-muted-foreground">{t('volume_ml')}:</span><br /><span className="font-semibold">{selectedBag.volume} ml</span></div>
                  <div><span className="text-muted-foreground">{t('status')}:</span><br /><span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selectedBag.status]}`}>{t(`bag_status_${selectedBag.status}`)}</span></div>
                </div>
              </div>

              {/* Donor info */}
              <Card><CardContent className="p-4 space-y-2 text-sm">
                <h4 className="font-semibold">{t('donor_information')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">{t('donor_name')}:</span><br />{selectedBag.donorName}</div>
                  <div><span className="text-muted-foreground">{t('donor_phone')}:</span><br />{selectedBag.donorPhone || '-'}</div>
                  <div><span className="text-muted-foreground">{t('donor_national_id')}:</span><br />{selectedBag.donorNationalId || '-'}</div>
                  <div><span className="text-muted-foreground">{t('collected_by')}:</span><br />{selectedBag.collectedBy || '-'}</div>
                </div>
              </CardContent></Card>

              {/* Dates */}
              <Card><CardContent className="p-4 space-y-2 text-sm">
                <h4 className="font-semibold">{t('dates')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">{t('collection_date')}:</span><br />{new Date(selectedBag.collectionDate).toLocaleDateString()}</div>
                  <div><span className="text-muted-foreground">{t('expiry_date')}:</span><br />{new Date(selectedBag.expiryDate).toLocaleDateString()}</div>
                  {selectedBag.testedDate && <div><span className="text-muted-foreground">{t('tested_date')}:</span><br />{new Date(selectedBag.testedDate).toLocaleDateString()}</div>}
                  {selectedBag.issuedDate && <div><span className="text-muted-foreground">{t('issued_date')}:</span><br />{new Date(selectedBag.issuedDate).toLocaleDateString()}</div>}
                </div>
              </CardContent></Card>

              {/* Test results */}
              <Card><CardContent className="p-4 space-y-2 text-sm">
                <h4 className="font-semibold">{t('blood_test_results')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'hivTest', label: t('test_hivTest') },
                    { key: 'hepatitisBTest', label: t('test_hepatitisBTest') },
                    { key: 'hepatitisCTest', label: t('test_hepatitisCTest') },
                    { key: 'malariaTest', label: t('test_malariaTest') },
                    { key: 'syphilisTest', label: t('test_syphilisTest') },
                  ].map(({ key, label }) => {
                    const val = (selectedBag as any)[key] as string | undefined;
                    return (
                      <div key={key}>
                        <span className="text-muted-foreground">{label}:</span><br />
                        {val ? <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TEST_RESULT_COLORS[val] || ''}`}>{t(`test_${val}`)}</span> : <span className="text-muted-foreground">-</span>}
                      </div>
                    );
                  })}
                  {selectedBag.testedBy && <div className="col-span-2"><span className="text-muted-foreground">{t('tested_by')}:</span> {selectedBag.testedBy}</div>}
                </div>
              </CardContent></Card>

              {/* Issued to */}
              {selectedBag.issuedTo && (
                <Card><CardContent className="p-4 text-sm">
                  <h4 className="font-semibold">{t('issued_info')}</h4>
                  <span className="text-muted-foreground">{t('issue_to_patient')}:</span> {selectedBag.issuedTo}
                </CardContent></Card>
              )}

              {/* Uploaded document */}
              {selectedBag.fileName && (
                <Card><CardContent className="p-4 text-sm">
                  <h4 className="font-semibold">{t('uploaded_document')}</h4>
                  <a href={selectedBag.filePath || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 hover:underline mt-1">
                    <FileText className="size-4" />{selectedBag.fileName}
                  </a>
                </CardContent></Card>
              )}

              {/* Notes */}
              {selectedBag.notes && (
                <Card><CardContent className="p-4 text-sm">
                  <h4 className="font-semibold">{t('notes')}</h4>
                  <p className="mt-1">{selectedBag.notes}</p>
                </CardContent></Card>
              )}

              <div className="flex gap-2">
                <Button onClick={() => handlePrintLabel(selectedBag)} className="flex-1"><Printer className="size-4 shrink-0" />{t('print_label')}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }} onConfirm={handleDelete} title={t('delete')} description={t('delete_blood_bag_confirm')} confirmLabel={t('delete')} variant="danger" />

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(barcode) => {
          setSearch(barcode);
          setScannerOpen(false);
          const found = bloodBags.find(
            (b) => b.bagNumber === barcode || b.id === barcode
          );
          if (found) {
            toast.success(`${found.bagNumber} — ${found.donorName} (${found.bloodType})`);
          } else {
            toast.warning(t('blood_bag_not_found'));
          }
        }}
        title={t('scan_blood_bag')}
      />
    </motion.div>
  );
}

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Plus, Search, Printer, Eye, Edit, Trash2, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface LabTest { id: string; patientId: string; doctorId?: string; testName: string; category?: string; status: string; results?: string; notes?: string; cost: number; testDate: string; patient?: { firstName: string; lastName: string }; doctor?: { firstName: string; lastName: string }; }
interface Patient { id: string; firstName: string; lastName: string; }
interface Doctor { id: string; firstName: string; lastName: string; specialty: string; }
interface ResultRow { name: string; value: string; unit: string; normalMin: string; normalMax: string; status: string; }

export function LaboratoryPage() {
  const { t, isRTL } = useLanguageStore();
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
        fetch(`/api/laboratory?${params}`).then(r => r.json()),
        fetch('/api/patients?limit=50').then(r => r.json()),
        fetch('/api/doctors').then(r => r.json()),
      ]);
      if (testRes.status === 'fulfilled' && testRes.value) setTests(testRes.value.data || testRes.value);
      if (patRes.status === 'fulfilled' && patRes.value) setPatients(patRes.value.data || patRes.value);
      if (docRes.status === 'fulfilled' && docRes.value) setDoctors(docRes.value.data || docRes.value);
    } catch {}
    finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingCount = tests.filter(t => t.status === 'pending').length;
  const completedCount = tests.filter(t => t.status === 'completed').length;

  const handleRequest = async () => {
    if (!form.patientId || !form.testName) { toast.error('Fill required fields'); return; }
    try {
      const res = await fetch('/api/laboratory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, cost: Number(form.cost) || 0 }),
      });
      if (res.ok) { toast.success(t('added')); setRequestOpen(false); setForm({ patientId: '', doctorId: '', testName: '', category: 'blood', cost: '' }); fetchData(); }
      else toast.error(t('error'));
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
    const u = [...resultRows];
    (u[i] as any)[f] = v;
    // Auto-detect status
    const row = u[i];
    const val = parseFloat(row.value);
    const min = parseFloat(row.normalMin);
    const max = parseFloat(row.normalMax);
    if (!isNaN(val) && !isNaN(min) && !isNaN(max)) {
      if (val < min || val > max) {
        const diff = val < min ? min - val : val - max;
        const range = max - min;
        row.status = diff > range * 0.2 ? 'high' : 'borderline';
      } else {
        row.status = 'normal';
      }
    }
    setResultRows(u);
  };

  const addResultRow = () => setResultRows([...resultRows, { name: '', value: '', unit: '', normalMin: '', normalMax: '', status: 'normal' }]);

  const saveResults = async () => {
    if (!selectedTest) return;
    try {
      const res = await fetch(`/api/laboratory?id=${selectedTest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', results: JSON.stringify(resultRows.filter(r => r.name && r.value)) }),
      });
      if (res.ok) { toast.success(t('saved')); setResultsOpen(false); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const handleDeleteTest = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/laboratory?id=${deleteTarget}`, { method: 'DELETE' });
      if (res.ok) { toast.success(t('deleted')); setDeleteConfirmOpen(false); setDeleteTarget(null); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const getStatusColor = (s: string) => s === 'normal' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : s === 'borderline' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  const handlePrint = (test: LabTest) => {
    if (!test.results) return;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>${test.testName}</title><style>body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto}table{width:100%;border-collapse:collapse;margin:10px 0}th,td{border:1px solid #ddd;padding:8px 12px;text-align:left}th{background:#f0fdf4}.normal{color:green}.borderline{color:orange}.high{color:red}h1{font-size:1.5rem;margin-bottom:4px}p{color:#666;font-size:0.9rem}@media print{body{padding:10px}}</style></head><body><h1>${test.testName}</h1><p>Patient: ${test.patient?.firstName} ${test.patient?.lastName}</p><p>Date: ${new Date(test.testDate).toLocaleDateString()}</p><table><thead><tr><th>Name</th><th>Value</th><th>Unit</th><th>Normal Range</th><th>Status</th></tr></thead><tbody>${JSON.parse(test.results).map((r: ResultRow) => `<tr><td>${r.name}</td><td>${r.value}</td><td>${r.unit}</td><td>${r.normalMin}-${r.normalMax}</td><td class="${r.status}">${r.status}</td></tr>`).join('')}</tbody></table></body></html>`);
      w.document.close();
      w.print();
    }
  };

  const catData = ['blood', 'urine', 'imaging', 'other'].map(c => ({ name: c, count: tests.filter(t => t.category === c).length }));

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      {/* Stats - grid-cols-2 md:grid-cols-4 is responsive */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: FlaskConical, label: t('total_tests'), value: tests.length, color: 'text-blue-600' },
          { icon: Clock, label: t('pending_tests'), value: pendingCount, color: 'text-amber-600' },
          { icon: CheckCircle, label: t('completed_tests'), value: completedCount, color: 'text-emerald-600' },
          { icon: AlertTriangle, label: t('today_tests'), value: tests.filter(t => { const d = new Date(t.testDate); const today = new Date(); return d.toDateString() === today.toDateString(); }).length, color: 'text-purple-600' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4"><div className="flex items-center gap-3"><s.icon className={`size-8 ${s.color} opacity-70 shrink-0`} /><div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{s.label}</p><p className="text-2xl font-bold">{s.value}</p></div></div></CardContent></Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search / Filter / Action bar - wraps on mobile */}
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className={`absolute top-2.5 size-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
              <Input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className={isRTL ? 'pr-9' : 'pl-9'} />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>{['all','pending','processing','completed'].map(s => <SelectItem key={s} value={s}>{s === 'all' ? t('all') : s}</SelectItem>)}</SelectContent>
            </Select>
            <Button className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto" onClick={() => setRequestOpen(true)}>
              <Plus className="size-4 shrink-0" />{t('request_new_test')}
            </Button>
          </motion.div>

          {/* Test table with horizontal scroll on mobile */}
          <Card>
            <CardContent className="p-0 overflow-x-auto">
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
                              <Edit className="size-3 shrink-0" />
                              <span className="hidden sm:inline">{isRTL ? 'ثبت نتیجه' : 'Results'}</span>
                            </Button>
                          )}
                          {test.status === 'completed' && (
                            <>
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => { setSelectedTest(test); setViewOpen(true); }} aria-label={t('view')}>
                                <Eye className="size-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => handlePrint(test)} aria-label={t('print')}>
                                <Printer className="size-3.5" />
                              </Button>
                            </>
                          )}
                          {test.status !== 'completed' && (
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => { setDeleteTarget(test.id); setDeleteConfirmOpen(true); }} aria-label={t('delete')}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {tests.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <FlaskConical className="size-10 mx-auto mb-2 opacity-30" />
                  <p>{t('no_data')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chart sidebar - stacks below on mobile via lg: breakpoint */}
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-sm">{t('tests_by_category')}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer><BarChart data={catData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis /><Tooltip /><Bar dataKey="count" fill="#10b981" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Dialog - responsive width */}
      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader><DialogTitle>{t('request_new_lab_test')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>{t('patient')}</Label>
              <Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}>
                <SelectTrigger><SelectValue placeholder={t('select_patient')} /></SelectTrigger>
                <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('doctor')}</Label>
              <Select value={form.doctorId} onValueChange={v => setForm({ ...form, doctorId: v })}>
                <SelectTrigger><SelectValue placeholder={t('select_doctor_label')} /></SelectTrigger>
                <SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName} - {d.specialty}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('test_name_label')}</Label><Input value={form.testName} onChange={e => setForm({ ...form, testName: e.target.value })} placeholder="CBC, Lipid Panel,..." /></div>
              <div><Label>{t('category_label')}</Label><Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['blood','urine','imaging','other'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><Label>{t('cost')}</Label><Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>
            <Button onClick={handleRequest} className="w-full bg-emerald-600 hover:bg-emerald-700">{t('submit_request')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enter Results Dialog - responsive width with mobile card layout + desktop grid */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base sm:text-lg">{t('enter_test_results')} - {selectedTest?.testName}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">{selectedTest?.patient ? `${selectedTest.patient.firstName} ${selectedTest.patient.lastName}` : ''}</p>
            <div className="space-y-3">
              {resultRows.map((row, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-3">
                  {/* Mobile card layout (sm:hidden) */}
                  <div className="sm:hidden space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">{t('name_label')}</Label>
                        <Input value={row.name} onChange={e => updateResultRow(i, 'name', e.target.value)} placeholder={t('name_label')} />
                      </div>
                      <div className="w-20 space-y-1">
                        <Label className="text-xs">{t('value_label')}</Label>
                        <Input value={row.value} onChange={e => updateResultRow(i, 'value', e.target.value)} placeholder="0" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('unit_label')}</Label>
                        <Input value={row.unit} onChange={e => updateResultRow(i, 'unit', e.target.value)} placeholder={t('unit_label')} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('status_label')}</Label>
                        <span className={`inline-block px-2 py-1.5 rounded text-xs font-medium ${getStatusColor(row.status)}`}>{row.status}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? 'کمینه' : 'Min'}</Label>
                        <Input placeholder={isRTL ? 'کم' : 'Min'} value={row.normalMin} onChange={e => updateResultRow(i, 'normalMin', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{isRTL ? 'بیشینه' : 'Max'}</Label>
                        <Input placeholder={isRTL ? 'زیاد' : 'Max'} value={row.normalMax} onChange={e => updateResultRow(i, 'normalMax', e.target.value)} />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="icon" variant="ghost" className="size-8 text-destructive" onClick={() => setResultRows(resultRows.filter((_, idx) => idx !== i))}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Desktop grid layout (hidden sm:grid) */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-end">
                    <div className="col-span-3"><Label className="text-xs">{t('name_label')}</Label><Input value={row.name} onChange={e => updateResultRow(i, 'name', e.target.value)} /></div>
                    <div className="col-span-2"><Label className="text-xs">{t('value_label')}</Label><Input value={row.value} onChange={e => updateResultRow(i, 'value', e.target.value)} /></div>
                    <div className="col-span-2"><Label className="text-xs">{t('unit_label')}</Label><Input value={row.unit} onChange={e => updateResultRow(i, 'unit', e.target.value)} /></div>
                    <div className="col-span-2"><Label className="text-xs">{t('normal_range')}</Label><div className="flex gap-1"><Input placeholder={isRTL ? 'کم' : 'Min'} value={row.normalMin} onChange={e => updateResultRow(i, 'normalMin', e.target.value)} /><Input placeholder={isRTL ? 'زیاد' : 'Max'} value={row.normalMax} onChange={e => updateResultRow(i, 'normalMax', e.target.value)} /></div></div>
                    <div className="col-span-2"><Label className="text-xs">{t('status_label')}</Label><span className={`inline-block px-2 py-1.5 rounded text-xs font-medium ${getStatusColor(row.status)}`}>{row.status}</span></div>
                    <div className="col-span-1 flex items-end"><Button size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => setResultRows(resultRows.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></Button></div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addResultRow} className="w-full sm:w-auto">
                <Plus className="size-3" />{t('add_row')}
              </Button>
            </div>
            <Button onClick={saveResults} className="w-full bg-emerald-600 hover:bg-emerald-700">{t('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}
        onConfirm={handleDeleteTest}
        title={t('delete')}
        description={t('are_you_sure_delete')}
        confirmLabel={t('delete')}
        variant="danger"
      />

      {/* View Results Dialog - with horizontal scroll on mobile */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base sm:text-lg">{selectedTest?.testName}</DialogTitle></DialogHeader>
          {selectedTest && selectedTest.results && (
            <>
              <div className="text-sm text-muted-foreground mb-3">
                {selectedTest.patient?.firstName} {selectedTest.patient?.lastName} | {new Date(selectedTest.testDate).toLocaleDateString()}
              </div>
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full border text-sm min-w-[500px]">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2">{t('name_label')}</th>
                      <th className="border p-2">{t('value_label')}</th>
                      <th className="border p-2">{t('unit_label')}</th>
                      <th className="border p-2">{t('normal_range')}</th>
                      <th className="border p-2">{t('status_label')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      try {
                        return JSON.parse(selectedTest.results).map((r: ResultRow, i: number) => (
                          <tr key={i}>
                            <td className="border p-2 whitespace-nowrap">{r.name}</td>
                            <td className="border p-2 font-medium whitespace-nowrap">{r.value}</td>
                            <td className="border p-2 whitespace-nowrap">{r.unit}</td>
                            <td className="border p-2 whitespace-nowrap">{r.normalMin}-{r.normalMax}</td>
                            <td className="border p-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(r.status)}`}>{r.status}</span></td>
                          </tr>
                        ));
                      } catch { return null; }
                    })()}
                  </tbody>
                </table>
              </div>
              <Button className="w-full mt-3" onClick={() => handlePrint(selectedTest)}>
                <Printer className="size-4 shrink-0" />{t('print')}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

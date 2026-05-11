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
import { Textarea } from '@/components/ui/textarea';
import { BedDouble, Plus, Search, User, ArrowRightLeft, LogOut, Grid3X3, List } from 'lucide-react';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface Bed { id: string; number: string; departmentId: string; roomNumber?: string; type: string; status: string; dailyRate: number; notes?: string; department?: { id: string; name: string; nameFa: string }; admissions?: { id: string; status: string; patient: { firstName: string; lastName: string } }[]; }
interface Admission { id: string; patientId: string; bedId: string; doctorId: string; diagnosis?: string; admitDate: string; dischargeDate?: string; status: string; patient?: { firstName: string; lastName: string }; bed?: Bed; doctor?: { firstName: string; lastName: string }; }
interface Patient { id: string; firstName: string; lastName: string; }
interface Doctor { id: string; firstName: string; lastName: string; specialty: string; }
interface Department { id: string; name: string; nameFa: string; }

const bedColors: Record<string, string> = { available: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:border-emerald-500', occupied: 'border-red-400 bg-red-50 dark:bg-red-950/20 hover:border-red-500', cleaning: 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 hover:border-amber-500', reserved: 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:border-blue-500' };
const typeBadge: Record<string, string> = { standard: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icu: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', vip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', pediatric: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };

export function WardsPage() {
  const { t, isRTL } = useLanguageStore();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [filterDept, setFilterDept] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [admitOpen, setAdmitOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [bedOpen, setBedOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [admitForm, setAdmitForm] = useState({ patientId: '', bedId: '', doctorId: '', diagnosis: '' });
  const [transferForm, setTransferForm] = useState({ toBedId: '' });

  const fetchData = useCallback(async () => {
    try {
      const [bedRes, admRes, patRes, docRes, depRes] = await Promise.allSettled([
        fetch('/api/wards').then(r => r.json()),
        fetch('/api/patients?limit=50').then(r => r.json()),
        fetch('/api/patients?limit=50').then(r => r.json()),
        fetch('/api/doctors').then(r => r.json()),
        fetch('/api/departments').then(r => r.json()),
      ]);
      if (bedRes.status === 'fulfilled' && bedRes.value) setBeds(bedRes.value.data || bedRes.value);
      if (patRes.status === 'fulfilled' && patRes.value) setPatients(patRes.value.data || patRes.value);
      if (docRes.status === 'fulfilled' && docRes.value) setDoctors(docRes.value.data || docRes.value);
      if (depRes.status === 'fulfilled' && depRes.value) setDepartments(depRes.value.data || depRes.value);
      // Build admissions from beds
      const adms: Admission[] = [];
      if (bedRes.status === 'fulfilled' && bedRes.value) {
        (bedRes.value.data || bedRes.value).forEach((b: Bed) => {
          b.admissions?.filter(a => a.status === 'active').forEach(a => {
            adms.push({ ...a, bed: b });
          });
        });
      }
      setAdmissions(adms);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const availableBeds = beds.filter(b => b.status === 'available');
  const filteredBeds = beds.filter(b => {
    if (filterDept !== 'all' && b.departmentId !== filterDept) return false;
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    return true;
  });

  // Group by department
  const groupedBeds = departments.map(d => ({ ...d, beds: filteredBeds.filter(b => b.departmentId === d.id) })).filter(g => g.beds.length > 0);

  const handleAdmit = async () => {
    if (!admitForm.patientId || !admitForm.bedId || !admitForm.doctorId) { toast.error('Fill required fields'); return; }
    try {
      const res = await fetch('/api/wards/admit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admitForm),
      });
      if (res.ok) { toast.success(isRTL ? 'بستری انجام شد' : 'Patient admitted'); setAdmitOpen(false); setAdmitForm({ patientId: '', bedId: '', doctorId: '', diagnosis: '' }); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const handleDischarge = async () => {
    if (!selectedAdmission) return;
    try {
      const res = await fetch('/api/wards/discharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionId: selectedAdmission.id, bedId: selectedAdmission.bedId }),
      });
      if (res.ok) { toast.success(isRTL ? 'ترخیص انجام شد' : 'Patient discharged'); setDischargeOpen(false); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const handleTransfer = async () => {
    if (!selectedAdmission || !transferForm.toBedId) { toast.error('Select target bed'); return; }
    try {
      const res = await fetch('/api/wards/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionId: selectedAdmission.id, fromBedId: selectedAdmission.bedId, toBedId: transferForm.toBedId }),
      });
      if (res.ok) { toast.success(isRTL ? 'انتقال انجام شد' : 'Transfer complete'); setTransferOpen(false); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const stats = [
    { label: isRTL ? 'کل تخت‌ها' : 'Total Beds', value: beds.length, color: 'text-blue-600' },
    { label: isRTL ? 'خالی' : 'Available', value: beds.filter(b => b.status === 'available').length, color: 'text-emerald-600' },
    { label: isRTL ? 'اشغال' : 'Occupied', value: beds.filter(b => b.status === 'occupied').length, color: 'text-red-600' },
    { label: isRTL ? 'نظافت' : 'Cleaning', value: beds.filter(b => b.status === 'cleaning').length, color: 'text-amber-600' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => <Card key={i}><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-3xl font-bold ${s.color}`}>{s.value}</p></CardContent></Card>)}
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterDept} onValueChange={setFilterDept}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{<SelectItem value="all">{t('all')}</SelectItem>}{departments.map(d => <SelectItem key={d.id} value={d.id}>{isRTL ? d.nameFa : d.name}</SelectItem>)}</SelectContent></Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{['all','available','occupied','cleaning','reserved'].map(s => <SelectItem key={s} value={s}>{s === 'all' ? t('all') : s}</SelectItem>)}</SelectContent></Select>
          <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setView('grid')}><Grid3X3 className="size-4" /></Button>
          <Button variant={view === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setView('table')}><List className="size-4" /></Button>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setAdmitOpen(true)}><Plus className="size-4" />{isRTL ? 'بستری بیمار' : 'Admit Patient'}</Button>
      </motion.div>

      {view === 'grid' ? (
        <div className="space-y-6">
          {groupedBeds.map(group => (
            <motion.div key={group.id} variants={fadeUp}>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><BedDouble className="size-4 text-emerald-600" />{isRTL ? group.nameFa : group.name} <Badge variant="outline" className="text-xs">{group.beds.length} {isRTL ? 'تخت' : 'beds'}</Badge></h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {group.beds.map(bed => {
                  const patient = bed.admissions?.find(a => a.status === 'active')?.patient;
                  return (
                    <Card key={bed.id} className={`cursor-pointer border-2 transition-all hover:shadow-md ${bedColors[bed.status] || ''}`} onClick={() => { setSelectedBed(bed); setBedOpen(true); }}>
                      <CardContent className="p-3 text-center">
                        <div className="text-lg font-bold">{bed.number}</div>
                        <div className="text-xs text-muted-foreground">{bed.roomNumber ? `Room ${bed.roomNumber}` : ''}</div>
                        <Badge className={`mt-1 text-xs ${typeBadge[bed.type] || ''}`}>{bed.type}</Badge>
                        <div className="mt-2"><StatusBadge status={bed.status} /></div>
                        {patient && <p className="text-xs font-medium mt-1 truncate">{patient.firstName} {patient.lastName}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{Number(bed.dailyRate).toLocaleString()}<span className="text-[10px]">/{isRTL ? 'روز' : 'day'}</span></p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start font-medium">{isRTL ? 'شماره تخت' : 'Bed#'}</th><th className="p-3 text-start font-medium">{isRTL ? 'اتاق' : 'Room'}</th><th className="p-3 text-start font-medium">{t('departments')}</th><th className="p-3 text-start font-medium">{isRTL ? 'نوع' : 'Type'}</th><th className="p-3 text-start font-medium">{t('status')}</th><th className="p-3 text-start font-medium">{isRTL ? 'بیمار' : 'Patient'}</th><th className="p-3 text-start font-medium">{isRTL ? 'قیمت روزانه' : 'Daily Rate'}</th></tr></thead>
              <tbody>
                {filteredBeds.map(bed => {
                  const patient = bed.admissions?.find(a => a.status === 'active')?.patient;
                  const admission = bed.admissions?.find(a => a.status === 'active');
                  return (
                    <tr key={bed.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => { setSelectedBed(bed); if (admission) { setSelectedAdmission({ ...admission, bed }); } setBedOpen(true); }}>
                      <td className="p-3 font-medium">{bed.number}</td>
                      <td className="p-3">{bed.roomNumber || '-'}</td>
                      <td className="p-3">{bed.department ? (isRTL ? bed.department.nameFa : bed.department.name) : '-'}</td>
                      <td className="p-3"><Badge className={`text-xs ${typeBadge[bed.type] || ''}`}>{bed.type}</Badge></td>
                      <td className="p-3"><StatusBadge status={bed.status} /></td>
                      <td className="p-3">{patient ? `${patient.firstName} ${patient.lastName}` : '-'}</td>
                      <td className="p-3">{Number(bed.dailyRate).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {filteredBeds.length === 0 && <Card className="py-16 text-center text-muted-foreground"><BedDouble className="size-12 mx-auto mb-3 opacity-30" /><p>{t('no_data')}</p></Card>}

      {/* Bed Detail Dialog */}
      <Dialog open={bedOpen} onOpenChange={setBedOpen}>
        <DialogContent className="max-w-sm">
          {selectedBed && (<>
            <DialogHeader><DialogTitle>{selectedBed.number} - {selectedBed.roomNumber}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between"><Badge className={typeBadge[selectedBed.type]}>{selectedBed.type}</Badge><StatusBadge status={selectedBed.status} /></div>
              <p>{t('departments')}: {selectedBed.department ? (isRTL ? selectedBed.department.nameFa : selectedBed.department.name) : '-'}</p>
              <p>{isRTL ? 'قیمت روزانه' : 'Daily Rate'}: {Number(selectedBed.dailyRate).toLocaleString()}</p>
              {selectedBed.admissions?.filter(a => a.status === 'active').map(adm => (
                <Card key={adm.id} className="p-3 bg-muted/50">
                  <p className="font-medium">{adm.patient?.firstName} {adm.patient?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'تشخیص' : 'Diagnosis'}: {adm.diagnosis || '-'}</p>
                  <p className="text-xs text-muted-foreground">{isRTL ? 'تاریخ بستری' : 'Admitted'}: {new Date(adm.admitDate).toLocaleDateString()}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedAdmission({ ...adm, bed: selectedBed }); setTransferOpen(true); }}><ArrowRightLeft className="size-3" />{isRTL ? 'انتقال' : 'Transfer'}</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => { setSelectedAdmission({ ...adm, bed: selectedBed }); setDischargeOpen(true); }}><LogOut className="size-3" />{isRTL ? 'ترخیص' : 'Discharge'}</Button>
                  </div>
                </Card>
              ))}
            </div>
          </>)}
        </DialogContent>
      </Dialog>

      {/* Admit Dialog */}
      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{isRTL ? 'بستری بیمار' : 'Admit Patient'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>{t('patient')}</Label><Select value={admitForm.patientId} onValueChange={v => setAdmitForm({ ...admitForm, patientId: v })}><SelectTrigger><SelectValue placeholder={isRTL ? 'انتخاب بیمار' : 'Select patient'} /></SelectTrigger><SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{isRTL ? 'تخت' : 'Bed'}</Label><Select value={admitForm.bedId} onValueChange={v => setAdmitForm({ ...admitForm, bedId: v })}><SelectTrigger><SelectValue placeholder={isRTL ? 'انتخاب تخت خالی' : 'Select available bed'} /></SelectTrigger><SelectContent>{availableBeds.map(b => <SelectItem key={b.id} value={b.id}>{b.number} ({b.department ? (isRTL ? b.department.nameFa : b.department.name) : ''}) - {b.type}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t('doctor')}</Label><Select value={admitForm.doctorId} onValueChange={v => setAdmitForm({ ...admitForm, doctorId: v })}><SelectTrigger><SelectValue placeholder={isRTL ? 'انتخاب پزشک' : 'Select doctor'} /></SelectTrigger><SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{isRTL ? 'تشخیص اولیه' : 'Primary Diagnosis'}</Label><Textarea value={admitForm.diagnosis} onChange={e => setAdmitForm({ ...admitForm, diagnosis: e.target.value })} /></div>
            <Button onClick={handleAdmit} className="w-full bg-emerald-600 hover:bg-emerald-700">{isRTL ? 'ثبت بستری' : 'Admit'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discharge Dialog */}
      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{isRTL ? 'ترخیص بیمار' : 'Discharge Patient'}</DialogTitle></DialogHeader>
          {selectedAdmission && <div className="space-y-3">
            <Card className="p-3"><p className="font-medium">{selectedAdmission.patient?.firstName} {selectedAdmission.patient?.lastName}</p><p className="text-xs text-muted-foreground">{isRTL ? 'تخت' : 'Bed'}: {selectedAdmission.bed?.number} | {isRTL ? 'تشخیص' : 'Diagnosis'}: {selectedAdmission.diagnosis}</p></Card>
            <Button onClick={handleDischarge} className="w-full bg-red-600 hover:bg-red-700">{isRTL ? 'تایید ترخیص' : 'Confirm Discharge'}</Button>
          </div>}</DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{isRTL ? 'انتقال بیمار' : 'Transfer Patient'}</DialogTitle></DialogHeader>
          {selectedAdmission && <div className="space-y-3">
            <Card className="p-3"><p className="text-sm">{isRTL ? 'تخت فعلی' : 'Current bed'}: <strong>{selectedAdmission.bed?.number}</strong> | {selectedAdmission.patient?.firstName} {selectedAdmission.patient?.lastName}</p></Card>
            <div><Label>{isRTL ? 'تخت مقصد' : 'Target Bed'}</Label><Select value={transferForm.toBedId} onValueChange={v => setTransferForm({ ...transferForm, toBedId: v })}><SelectTrigger><SelectValue placeholder={isRTL ? 'انتخاب تخت خالی' : 'Select available bed'} /></SelectTrigger><SelectContent>{availableBeds.filter(b => b.id !== selectedAdmission.bedId).map(b => <SelectItem key={b.id} value={b.id}>{b.number} - {b.type} ({b.department ? (isRTL ? b.department.nameFa : b.department.name) : ''})</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={handleTransfer} className="w-full bg-emerald-600 hover:bg-emerald-700">{isRTL ? 'تایید انتقال' : 'Confirm Transfer'}</Button>
          </div>}</DialogContent>
      </Dialog>
    </motion.div>
  );
}

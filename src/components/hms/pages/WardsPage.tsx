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
import { BedDouble, Plus, Search, User, ArrowRightLeft, LogOut, Grid3X3, List, Pencil, Trash2 } from 'lucide-react';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface Bed { id: string; number: string; departmentId: string; roomNumber?: string; type: string; status: string; dailyRate: number; notes?: string; department?: { id: string; name: string; nameFa: string }; admissions?: { id: string; status: string; patient: { firstName: string; lastName: string; fileNumber?: string }; doctor?: { firstName: string; lastName: string }; diagnosis?: string; admitDate: string }[]; }
interface Admission { id: string; patientId: string; bedId: string; doctorId: string; diagnosis?: string; admitDate: string; dischargeDate?: string; status: string; patient?: { firstName: string; lastName: string }; bed?: Bed; doctor?: { firstName: string; lastName: string }; }
interface Patient { id: string; firstName: string; lastName: string; }
interface Doctor { id: string; firstName: string; lastName: string; specialty: string; }
interface Department { id: string; name: string; nameFa: string; }

const bedColors: Record<string, string> = { available: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:border-emerald-500', occupied: 'border-red-400 bg-red-50 dark:bg-red-950/20 hover:border-red-500', cleaning: 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 hover:border-amber-500', reserved: 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:border-blue-500' };
const typeBadge: Record<string, string> = { standard: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', icu: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', vip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', pediatric: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };

interface BedFormState {
  number: string;
  departmentId: string;
  roomNumber: string;
  type: string;
  status: string;
  dailyRate: string;
  notes: string;
}

const emptyBedForm: BedFormState = { number: '', departmentId: '', roomNumber: '', type: 'standard', status: 'available', dailyRate: '', notes: '' };

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

  // Bed form management state
  const [bedFormOpen, setBedFormOpen] = useState(false);
  const [selectedBedForEdit, setSelectedBedForEdit] = useState<Bed | null>(null);
  const [bedForm, setBedForm] = useState<BedFormState>(emptyBedForm);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bedToDelete, setBedToDelete] = useState<Bed | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [bedRes, patRes, docRes, depRes] = await Promise.allSettled([
        fetch('/api/wards').then(r => r.json()),
        fetch('/api/patients?limit=50').then(r => r.json()),
        fetch('/api/doctors').then(r => r.json()),
        fetch('/api/departments').then(r => r.json()),
      ]);
      if (bedRes.status === 'fulfilled' && bedRes.value) {
        const bedData = bedRes.value.beds || bedRes.value.data || bedRes.value;
        setBeds(Array.isArray(bedData) ? bedData : []);
      }
      if (patRes.status === 'fulfilled' && patRes.value) setPatients(patRes.value.data || patRes.value);
      if (docRes.status === 'fulfilled' && docRes.value) setDoctors(docRes.value.data || docRes.value);
      if (depRes.status === 'fulfilled' && depRes.value) setDepartments(depRes.value.data || depRes.value);
      // Build admissions from beds
      const adms: Admission[] = [];
      if (bedRes.status === 'fulfilled' && bedRes.value) {
        const bedData = bedRes.value.beds || bedRes.value.data || bedRes.value;
        (Array.isArray(bedData) ? bedData : []).forEach((b: Bed) => {
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
      const res = await fetch('/api/wards?action=admit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admitForm),
      });
      if (res.ok) { toast.success(t('patient_admitted')); setAdmitOpen(false); setAdmitForm({ patientId: '', bedId: '', doctorId: '', diagnosis: '' }); fetchData(); }
      else { const err = await res.json().catch(() => ({})); toast.error(err.error || t('error')); }
    } catch { toast.error(t('error')); }
  };

  const handleDischarge = async () => {
    if (!selectedAdmission) return;
    try {
      const res = await fetch('/api/wards?action=discharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionId: selectedAdmission.id }),
      });
      if (res.ok) { toast.success(t('patient_discharged')); setDischargeOpen(false); fetchData(); }
      else { const err = await res.json().catch(() => ({})); toast.error(err.error || t('error')); }
    } catch { toast.error(t('error')); }
  };

  const handleTransfer = async () => {
    if (!selectedAdmission || !transferForm.toBedId) { toast.error('Select target bed'); return; }
    try {
      const res = await fetch('/api/wards?action=transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admissionId: selectedAdmission.id, newBedId: transferForm.toBedId }),
      });
      if (res.ok) { toast.success(t('transfer_complete')); setTransferOpen(false); fetchData(); }
      else { const err = await res.json().catch(() => ({})); toast.error(err.error || t('error')); }
    } catch { toast.error(t('error')); }
  };

  // Bed management handlers
  const openAddBed = () => {
    setSelectedBedForEdit(null);
    setBedForm(emptyBedForm);
    setBedFormOpen(true);
  };

  const openEditBed = (bed: Bed) => {
    setSelectedBedForEdit(bed);
    setBedForm({
      number: bed.number,
      departmentId: bed.departmentId,
      roomNumber: bed.roomNumber || '',
      type: bed.type,
      status: bed.status,
      dailyRate: String(bed.dailyRate),
      notes: bed.notes || '',
    });
    setBedFormOpen(true);
  };

  const handleSaveBed = async () => {
    if (!bedForm.number || !bedForm.departmentId) {
      toast.error(t('bed_and_dept_required'));
      return;
    }

    const payload = {
      number: bedForm.number,
      departmentId: bedForm.departmentId,
      roomNumber: bedForm.roomNumber || null,
      type: bedForm.type,
      status: bedForm.status,
      dailyRate: Number(bedForm.dailyRate) || 0,
      notes: bedForm.notes || null,
    };

    try {
      let res: Response;
      if (selectedBedForEdit) {
        res = await fetch(`/api/wards?id=${selectedBedForEdit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/wards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        toast.success(selectedBedForEdit
          ? t('bed_updated')
          : t('bed_added'));
        setBedFormOpen(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || t('error'));
      }
    } catch {
      toast.error(t('error'));
    }
  };

  const openDeleteBed = (bed: Bed) => {
    setBedToDelete(bed);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteBed = async () => {
    if (!bedToDelete) return;
    try {
      const res = await fetch(`/api/wards?id=${bedToDelete.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(t('bed_deleted'));
        setDeleteConfirmOpen(false);
        setBedToDelete(null);
        setBedOpen(false);
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || t('error'));
      }
    } catch {
      toast.error(t('error'));
    }
  };

  const stats = [
    { label: t('total_beds'), value: beds.length, color: 'text-blue-600' },
    { label: t('available'), value: beds.filter(b => b.status === 'available').length, color: 'text-emerald-600' },
    { label: t('occupied'), value: beds.filter(b => b.status === 'occupied').length, color: 'text-red-600' },
    { label: t('cleaning'), value: beds.filter(b => b.status === 'cleaning').length, color: 'text-amber-600' },
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openAddBed}><BedDouble className="size-4" />{t('add_bed')}</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setAdmitOpen(true)}><Plus className="size-4" />{t('admit_patient')}</Button>
        </div>
      </motion.div>

      {view === 'grid' ? (
        <div className="space-y-6">
          {groupedBeds.map(group => (
            <motion.div key={group.id} variants={fadeUp}>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><BedDouble className="size-4 text-emerald-600" />{isRTL ? group.nameFa : group.name} <Badge variant="outline" className="text-xs">{group.beds.length} {t('beds')}</Badge></h3>
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
              <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start font-medium">{t('bed_number_label')}</th><th className="p-3 text-start font-medium">{t('room_number_label')}</th><th className="p-3 text-start font-medium">{t('departments')}</th><th className="p-3 text-start font-medium">{t('bed_type_label')}</th><th className="p-3 text-start font-medium">{t('status')}</th><th className="p-3 text-start font-medium">{t('patient_label')}</th><th className="p-3 text-start font-medium">{t('daily_rate_label')}</th></tr></thead>
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
              <p>{t('daily_rate_label')}: {Number(selectedBed.dailyRate).toLocaleString()}</p>
              {selectedBed.notes && <p className="text-sm text-muted-foreground">{t('notes_label')}: {selectedBed.notes}</p>}
              {selectedBed.admissions?.filter(a => a.status === 'active').map(adm => (
                <Card key={adm.id} className="p-3 bg-muted/50">
                  <p className="font-medium">{adm.patient?.firstName} {adm.patient?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{t('primary_diagnosis_label')}: {adm.diagnosis || '-'}</p>
                  <p className="text-xs text-muted-foreground">{t('admit_patient_confirm')}: {new Date(adm.admitDate).toLocaleDateString()}</p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedAdmission({ ...adm, bed: selectedBed }); setTransferOpen(true); }}><ArrowRightLeft className="size-3" />{t('transfer')}</Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={() => { setSelectedAdmission({ ...adm, bed: selectedBed }); setDischargeOpen(true); }}><LogOut className="size-3" />{t('discharge')}</Button>
                  </div>
                </Card>
              ))}
              {/* Edit/Delete bed buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); openEditBed(selectedBed); }}><Pencil className="size-3" />{t('edit_bed')}</Button>
                <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); openDeleteBed(selectedBed); }}><Trash2 className="size-3" />{t('delete_bed')}</Button>
              </div>
            </div>
          </>)}
        </DialogContent>
      </Dialog>

      {/* Bed Form Dialog (Add/Edit) */}
      <Dialog open={bedFormOpen} onOpenChange={setBedFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedBedForEdit ? t('edit_bed') : t('add_bed')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('bed_number_label')} *</Label>
                <Input
                  value={bedForm.number}
                  onChange={e => setBedForm({ ...bedForm, number: e.target.value })}
                  placeholder="B101"
                />
              </div>
              <div>
                <Label>{t('room_number_label')}</Label>
                <Input
                  value={bedForm.roomNumber}
                  onChange={e => setBedForm({ ...bedForm, roomNumber: e.target.value })}
                  placeholder="201"
                />
              </div>
            </div>

            <div>
              <Label>{t('departments')} *</Label>
              <Select value={bedForm.departmentId} onValueChange={v => setBedForm({ ...bedForm, departmentId: v })}>
                <SelectTrigger><SelectValue placeholder={isRTL ? 'انتخاب بخش' : 'Select department'} /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{isRTL ? d.nameFa : d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('bed_type_label')}</Label>
                <Select value={bedForm.type} onValueChange={v => setBedForm({ ...bedForm, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">{t('standard')}</SelectItem>
                    <SelectItem value="icu">ICU</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="pediatric">{t('pediatric')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('status')}</Label>
                <Select value={bedForm.status} onValueChange={v => setBedForm({ ...bedForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">{t('available')}</SelectItem>
                    <SelectItem value="occupied">{t('occupied')}</SelectItem>
                    <SelectItem value="cleaning">{t('cleaning')}</SelectItem>
                    <SelectItem value="reserved">{t('reserved')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('daily_rate_label')}</Label>
              <Input
                type="number"
                value={bedForm.dailyRate}
                onChange={e => setBedForm({ ...bedForm, dailyRate: e.target.value })}
                placeholder="500000"
              />
            </div>

            <div>
              <Label>{t('notes_label')}</Label>
              <Textarea
                value={bedForm.notes}
                onChange={e => setBedForm({ ...bedForm, notes: e.target.value })}
                placeholder=""
                rows={3}
              />
            </div>

            <Button onClick={handleSaveBed} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {selectedBedForEdit ? t('update_bed') : t('add_bed')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setBedToDelete(null); }}
        onConfirm={handleDeleteBed}
        variant="danger"
        title={t('delete_bed')}
        description={bedToDelete
          ? `${t('delete_bed_confirm')} "${bedToDelete.number}"?`
          : ''}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
      />

      {/* Admit Dialog */}
      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{t('admit_patient')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>{t('patient')}</Label><Select value={admitForm.patientId} onValueChange={v => setAdmitForm({ ...admitForm, patientId: v })}><SelectTrigger><SelectValue placeholder={isRTL ? 'انتخاب بیمار' : 'Select patient'} /></SelectTrigger><SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t('bed_number_label')}</Label><Select value={admitForm.bedId} onValueChange={v => setAdmitForm({ ...admitForm, bedId: v })}><SelectTrigger><SelectValue placeholder={t('select_available_bed')} /></SelectTrigger><SelectContent>{availableBeds.map(b => <SelectItem key={b.id} value={b.id}>{b.number} ({b.department ? (isRTL ? b.department.nameFa : b.department.name) : ''}) - {b.type}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t('doctor')}</Label><Select value={admitForm.doctorId} onValueChange={v => setAdmitForm({ ...admitForm, doctorId: v })}><SelectTrigger><SelectValue placeholder={isRTL ? 'انتخاب پزشک' : 'Select doctor'} /></SelectTrigger><SelectContent>{doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>{t('primary_diagnosis_label')}</Label><Textarea value={admitForm.diagnosis} onChange={e => setAdmitForm({ ...admitForm, diagnosis: e.target.value })} /></div>
            <Button onClick={handleAdmit} className="w-full bg-emerald-600 hover:bg-emerald-700">{t('confirm_admit')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discharge Dialog */}
      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{t('discharge_patient')}</DialogTitle></DialogHeader>
          {selectedAdmission && <div className="space-y-3">
            <Card className="p-3"><p className="font-medium">{selectedAdmission.patient?.firstName} {selectedAdmission.patient?.lastName}</p><p className="text-xs text-muted-foreground">{t('bed_number_label')}: {selectedAdmission.bed?.number} | {t('primary_diagnosis_label')}: {selectedAdmission.diagnosis}</p></Card>
            <Button onClick={handleDischarge} className="w-full bg-red-600 hover:bg-red-700">{t('confirm_discharge')}</Button>
          </div>}</DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>{t('transfer_patient')}</DialogTitle></DialogHeader>
          {selectedAdmission && <div className="space-y-3">
            <Card className="p-3"><p className="text-sm">{t('current_bed')}: <strong>{selectedAdmission.bed?.number}</strong> | {selectedAdmission.patient?.firstName} {selectedAdmission.patient?.lastName}</p></Card>
            <div><Label>{t('target_bed')}</Label><Select value={transferForm.toBedId} onValueChange={v => setTransferForm({ ...transferForm, toBedId: v })}><SelectTrigger><SelectValue placeholder={t('select_available_bed')} /></SelectTrigger><SelectContent>{availableBeds.filter(b => b.id !== selectedAdmission.bedId).map(b => <SelectItem key={b.id} value={b.id}>{b.number} - {b.type} ({b.department ? (isRTL ? b.department.nameFa : b.department.name) : ''})</SelectItem>)}</SelectContent></Select></div>
            <Button onClick={handleTransfer} className="w-full bg-emerald-600 hover:bg-emerald-700">{t('confirm_transfer')}</Button>
          </div>}</DialogContent>
      </Dialog>
    </motion.div>
  );
}

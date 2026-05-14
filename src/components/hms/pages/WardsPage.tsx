'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguageStore } from '@/store';
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
import { BedDouble, Plus, Search, User, ArrowRightLeft, LogOut, Grid3X3, List, Pencil, Trash2, History, Printer } from 'lucide-react';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import { EmptyState } from '@/components/hms/shared/EmptyState';
import { CollapsiblePanel } from '@/components/hms/shared/CollapsiblePanel';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface Bed {
  id: string;
  number: string;
  departmentId: string;
  roomNumber?: string;
  type: string;
  status: string;
  dailyRate: number;
  notes?: string;
  department?: { id: string; name: string; nameFa: string };
  admissions?: {
    id: string;
    status: string;
    patient: { firstName: string; lastName: string; fileNumber?: string };
    doctor?: { firstName: string; lastName: string };
    diagnosis?: string;
    admitDate: string;
  }[];
}

interface Admission {
  id: string;
  patientId: string;
  bedId: string;
  doctorId: string;
  diagnosis?: string;
  admitDate: string;
  dischargeDate?: string;
  status: string;
  patient?: { firstName: string; lastName: string };
  bed?: Bed;
  doctor?: { firstName: string; lastName: string };
}

interface Patient { id: string; firstName: string; lastName: string; }
interface Doctor { id: string; firstName: string; lastName: string; specialty: string; }
interface Department { id: string; name: string; nameFa: string; }

const bedColors: Record<string, string> = {
  available: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:border-emerald-500',
  occupied: 'border-red-400 bg-red-50 dark:bg-red-950/20 hover:border-red-500',
  cleaning: 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 hover:border-amber-500',
  reserved: 'border-slate-400 bg-slate-50 dark:bg-slate-950/20 hover:border-slate-500',
  maintenance: 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 hover:border-blue-500',
};

const typeBadge: Record<string, string> = {
  standard: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  icu: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  vip: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  pediatric: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const statusDotColor: Record<string, string> = {
  available: 'bg-emerald-500',
  occupied: 'bg-red-500',
  cleaning: 'bg-amber-500',
  reserved: 'bg-slate-400',
  maintenance: 'bg-blue-500',
};

// ============================================================
// Visual Bed Map Component
// ============================================================

interface VisualBedMapProps {
  beds: Bed[];
  onBedClick: (bed: Bed) => void;
  department?: Department;
}

function VisualBedMap({ beds, onBedClick, department }: VisualBedMapProps) {
  const { t, isRTL } = useLanguageStore();

  if (beds.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BedDouble className="size-10 mx-auto mb-3 opacity-30" />
        <p>{t('no_data')}</p>
      </div>
    );
  }

  return (
    <div>
      {department && (
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
          <BedDouble className="size-4 text-primary shrink-0" />
          {isRTL ? department.nameFa : department.name}
          <Badge variant="outline" className="text-xs">{beds.length} {t('beds')}</Badge>
        </h3>
      )}
      {/* Responsive: 2 mobile → 4 tablet → 6 desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        {beds.map((bed) => {
          const patient = bed.admissions?.find((a) => a.status === 'active')?.patient;
          const admission = bed.admissions?.find((a) => a.status === 'active');
          return (
            <motion.div
              key={bed.id}
              variants={fadeUp}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer border-2 transition-all hover:shadow-lg ${bedColors[bed.status] || ''}`}
                onClick={() => onBedClick(bed)}
              >
                <CardContent className="p-3">
                  {/* Header: bed number + status dot */}
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xl font-bold tracking-tight">{bed.number}</span>
                    <span className={`inline-block size-3 rounded-full shrink-0 ${statusDotColor[bed.status] || 'bg-gray-300'}`} />
                  </div>
                  {/* Room number */}
                  {bed.roomNumber && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRTL ? `اتاق ${bed.roomNumber}` : `Room ${bed.roomNumber}`}
                    </p>
                  )}
                  {/* Type badge */}
                  <Badge className={`mt-1.5 text-[10px] ${typeBadge[bed.type] || ''}`}>
                    {bed.type.toUpperCase()}
                  </Badge>
                  {/* Occupied: patient name */}
                  {patient && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <User className="size-3 text-red-500 shrink-0" />
                      <p className="text-xs font-medium truncate">
                        {patient.firstName} {patient.lastName}
                      </p>
                    </div>
                  )}
                  {/* Status label */}
                  <div className="mt-1.5">
                    <StatusBadge status={bed.status} />
                  </div>
                  {/* Daily rate */}
                  {bed.dailyRate > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {Number(bed.dailyRate).toLocaleString()}/{isRTL ? 'روز' : 'day'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

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
  const [bedHistoryOpen, setBedHistoryOpen] = useState(false);
  const [bedHistory, setBedHistory] = useState<Admission[]>([]);
  const [bedHistoryLoading, setBedHistoryLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [bedRes, patRes, docRes, depRes] = await Promise.allSettled([
        apiFetch('/api/wards').catch(() => null),
        apiFetch('/api/patients?limit=50').catch(() => null),
        apiFetch('/api/doctors').catch(() => null),
        apiFetch('/api/departments').catch(() => null),
      ]);
      if (bedRes.status === 'fulfilled' && bedRes.value) {
        const bedData = bedRes.value.beds || bedRes.value.data || bedRes.value;
        setBeds(Array.isArray(bedData) ? bedData : []);
      }
      if (patRes.status === 'fulfilled' && patRes.value) {
        const p = patRes.value;
        setPatients(Array.isArray(p.patients) ? p.patients : (Array.isArray(p.data) ? p.data : (Array.isArray(p) ? p : [])));
      }
      if (docRes.status === 'fulfilled' && docRes.value) {
        const d = docRes.value;
        setDoctors(Array.isArray(d.doctors) ? d.doctors : (Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : [])));
      }
      if (depRes.status === 'fulfilled' && depRes.value) {
        const dp = depRes.value;
        setDepartments(Array.isArray(dp.departments) ? dp.departments : (Array.isArray(dp.data) ? dp.data : (Array.isArray(dp) ? dp : [])));
      }
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
      await apiFetch('/api/wards?action=admit', {
        method: 'POST',
        body: admitForm,
      });
      toast.success(t('patient_admitted')); setAdmitOpen(false); setAdmitForm({ patientId: '', bedId: '', doctorId: '', diagnosis: '' }); fetchData();
    } catch { toast.error(t('error')); }
  };

  const handleDischarge = async () => {
    if (!selectedAdmission) return;
    try {
      await apiFetch('/api/wards?action=discharge', {
        method: 'POST',
        body: { admissionId: selectedAdmission.id },
      });
      toast.success(t('patient_discharged')); setDischargeOpen(false); fetchData();
    } catch { toast.error(t('error')); }
  };

  const handleTransfer = async () => {
    if (!selectedAdmission || !transferForm.toBedId) { toast.error('Select target bed'); return; }
    try {
      await apiFetch('/api/wards?action=transfer', {
        method: 'POST',
        body: { admissionId: selectedAdmission.id, newBedId: transferForm.toBedId },
      });
      toast.success(t('transfer_complete')); setTransferOpen(false); fetchData();
    } catch { toast.error(t('error')); }
  };

  // Bed history handler
  const openBedHistory = async (bed: Bed) => {
    setSelectedBed(bed);
    setBedHistoryOpen(true);
    setBedHistoryLoading(true);
    try {
      const res = await apiFetch(`/api/wards?action=bedHistory&bedId=${bed.id}`);
      setBedHistory(Array.isArray(res) ? res : (res.history || []));
    } catch {
      setBedHistory([]);
    } finally {
      setBedHistoryLoading(false);
    }
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
      if (selectedBedForEdit) {
        await apiFetch(`/api/wards?id=${selectedBedForEdit.id}`, { method: 'PUT', body: payload });
      } else {
        await apiFetch('/api/wards', { method: 'POST', body: payload });
      }
      toast.success(selectedBedForEdit ? t('bed_updated') : t('bed_added'));
      setBedFormOpen(false);
      fetchData();
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
      await apiFetch(`/api/wards?id=${bedToDelete.id}`, { method: 'DELETE' });
      toast.success(t('bed_deleted'));
      setDeleteConfirmOpen(false);
      setBedToDelete(null);
      setBedOpen(false);
      fetchData();
    } catch {
      toast.error(t('error'));
    }
  };

  const stats = [
    { label: t('total_beds'), value: beds.length, color: 'text-blue-600' },
    { label: t('available'), value: beds.filter(b => b.status === 'available').length, color: 'text-primary' },
    { label: t('occupied'), value: beds.filter(b => b.status === 'occupied').length, color: 'text-red-600' },
    { label: t('cleaning'), value: beds.filter(b => b.status === 'cleaning').length, color: 'text-amber-600' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      {/* Stats — grid-cols-2 md:grid-cols-4 */}
      <motion.div variants={fadeUp}>
        <CollapsiblePanel id="wards-stats" icon={BedDouble} title={t('ward_overview')} defaultOpen={true}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((s, i) => (
              <Card key={i}>
                <CardContent className="p-3 sm:p-4 text-center">
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CollapsiblePanel>
      </motion.div>

      {/* Filters + View Toggle + Action Buttons — wraps on mobile */}
      <motion.div variants={fadeUp} className="flex flex-col gap-3">
        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-full min-w-[140px] sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>{isRTL ? d.nameFa : d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full min-w-[130px] sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['all', 'available', 'occupied', 'cleaning', 'reserved'].map(s => (
                <SelectItem key={s} value={s}>{s === 'all' ? t('all') : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 ms-auto">
            <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => setView('grid')} className="shrink-0">
              <Grid3X3 className="size-4" />
            </Button>
            <Button variant={view === 'table' ? 'default' : 'outline'} size="icon" onClick={() => setView('table')} className="shrink-0">
              <List className="size-4" />
            </Button>
          </div>
        </div>
        {/* Action buttons — full-width on mobile, row on larger screens */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={openAddBed}>
            <BedDouble className="size-4" />
            {t('add_bed')}
          </Button>
          <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90" onClick={() => setAdmitOpen(true)}>
            <Plus className="size-4" />
            {t('admit_patient')}
          </Button>
        </div>
      </motion.div>

      {/* Content */}
      {view === 'grid' ? (
        <CollapsiblePanel id="wards-bed-map" icon={Grid3X3} title={t('bed_map')} badge={filteredBeds.length} defaultOpen={true}>
          <div className="space-y-6">
          {groupedBeds.map(group => (
            <motion.div key={group.id} variants={fadeUp}>
              <VisualBedMap
                beds={group.beds}
                department={group}
                onBedClick={(bed) => {
                  setSelectedBed(bed);
                  const adm = bed.admissions?.find(a => a.status === 'active');
                  if (adm) setSelectedAdmission({ ...adm, bed });
                  setBedOpen(true);
                }}
              />
            </motion.div>
          ))}
          {groupedBeds.length === 0 && filteredBeds.length > 0 && (
            <VisualBedMap
              beds={filteredBeds}
              onBedClick={(bed) => {
                setSelectedBed(bed);
                const adm = bed.admissions?.find(a => a.status === 'active');
                if (adm) setSelectedAdmission({ ...adm, bed });
                setBedOpen(true);
              }}
            />
          )}
          </div>
        </CollapsiblePanel>
      ) : (
        /* Table view — horizontal scroll wrapper with min-width */
        <CollapsiblePanel id="wards-bed-table" icon={List} title={t('bed_list')} badge={filteredBeds.length} defaultOpen={true}>
          <div className="-mx-5 overflow-x-auto">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">{t('bed_number_label')}</th>
                    <th className="p-3 text-start font-medium">{t('room_number_label')}</th>
                    <th className="p-3 text-start font-medium">{t('departments')}</th>
                    <th className="p-3 text-start font-medium">{t('bed_type_label')}</th>
                    <th className="p-3 text-start font-medium">{t('status')}</th>
                    <th className="p-3 text-start font-medium">{t('patient_label')}</th>
                    <th className="p-3 text-start font-medium">{t('daily_rate_label')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBeds.map(bed => {
                    const patient = bed.admissions?.find(a => a.status === 'active')?.patient;
                    const admission = bed.admissions?.find(a => a.status === 'active');
                    return (
                      <tr
                        key={bed.id}
                        className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => { setSelectedBed(bed); if (admission) { setSelectedAdmission({ ...admission, bed }); } setBedOpen(true); }}
                      >
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
            </div>
        </CollapsiblePanel>
      )}

      {filteredBeds.length === 0 && (
        <Card className="py-12 sm:py-16 text-center text-muted-foreground">
          <BedDouble className="size-10 sm:size-12 mx-auto mb-3 opacity-30" />
          <p>{t('no_data')}</p>
        </Card>
      )}

      {/* ─── Bed Detail Dialog ─── */}
      <Dialog open={bedOpen} onOpenChange={setBedOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          {selectedBed && (<>
            <DialogHeader>
              <DialogTitle className="text-lg">{selectedBed.number} {selectedBed.roomNumber ? `- ${selectedBed.roomNumber}` : ''}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Badge className={typeBadge[selectedBed.type]}>{selectedBed.type}</Badge>
                <StatusBadge status={selectedBed.status} />
              </div>
              <p className="text-sm">{t('departments')}: {selectedBed.department ? (isRTL ? selectedBed.department.nameFa : selectedBed.department.name) : '-'}</p>
              <p className="text-sm">{t('daily_rate_label')}: {Number(selectedBed.dailyRate).toLocaleString()}</p>
              {selectedBed.notes && <p className="text-sm text-muted-foreground">{t('notes_label')}: {selectedBed.notes}</p>}
              {selectedBed.admissions?.filter(a => a.status === 'active').map(adm => (
                <Card key={adm.id} className="p-3 bg-muted/50">
                  <p className="font-medium">{adm.patient?.firstName} {adm.patient?.lastName}</p>
                  <p className="text-xs text-muted-foreground">{t('primary_diagnosis_label')}: {adm.diagnosis || '-'}</p>
                  <p className="text-xs text-muted-foreground">{t('admit_patient_confirm')}: {new Date(adm.admitDate).toLocaleDateString()}</p>
                  <div className="flex flex-col sm:flex-row gap-2 mt-2">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => { setSelectedAdmission({ ...adm, bed: selectedBed }); setTransferOpen(true); }}>
                      <ArrowRightLeft className="size-3" />
                      {t('transfer')}
                    </Button>
                    <Button size="sm" className="w-full sm:w-auto bg-red-600 hover:bg-red-700" onClick={() => { setSelectedAdmission({ ...adm, bed: selectedBed }); setDischargeOpen(true); }}>
                      <LogOut className="size-3" />
                      {t('discharge')}
                    </Button>
                  </div>
                </Card>
              ))}
              {/* Bed History button */}
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={(e) => { e.stopPropagation(); openBedHistory(selectedBed); }}>
                <History className="size-3" />
                {t('bed_history')}
              </Button>
              {/* Edit/Delete bed buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" className="w-full sm:flex-1" onClick={(e) => { e.stopPropagation(); openEditBed(selectedBed); }}>
                  <Pencil className="size-3" />
                  {t('edit_bed')}
                </Button>
                <Button variant="outline" size="sm" className="w-full sm:flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); openDeleteBed(selectedBed); }}>
                  <Trash2 className="size-3" />
                  {t('delete_bed')}
                </Button>
              </div>
            </div>
          </>)}
        </DialogContent>
      </Dialog>

      {/* ─── Bed Form Dialog (Add/Edit) ─── */}
      <Dialog open={bedFormOpen} onOpenChange={setBedFormOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-lg">{selectedBedForEdit ? t('edit_bed') : t('add_bed')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {/* Bed number + Room number — stacked on mobile, side-by-side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'انتخاب بخش' : 'Select department'} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{isRTL ? d.nameFa : d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Type + Status — stacked on mobile, side-by-side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <Button onClick={handleSaveBed} className="w-full bg-primary hover:bg-primary/90">
              {selectedBedForEdit ? t('update_bed') : t('add_bed')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation Dialog ─── */}
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

      {/* ─── Admit Dialog ─── */}
      <Dialog open={admitOpen} onOpenChange={setAdmitOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-lg">{t('admit_patient')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>{t('patient')}</Label>
              <Select value={admitForm.patientId} onValueChange={v => setAdmitForm({ ...admitForm, patientId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'انتخاب بیمار' : 'Select patient'} />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('bed_number_label')}</Label>
              <Select value={admitForm.bedId} onValueChange={v => setAdmitForm({ ...admitForm, bedId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={t('select_available_bed')} />
                </SelectTrigger>
                <SelectContent>
                  {availableBeds.map(b => <SelectItem key={b.id} value={b.id}>{b.number} ({b.department ? (isRTL ? b.department.nameFa : b.department.name) : ''}) - {b.type}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('doctor')}</Label>
              <Select value={admitForm.doctorId} onValueChange={v => setAdmitForm({ ...admitForm, doctorId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={isRTL ? 'انتخاب پزشک' : 'Select doctor'} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('primary_diagnosis_label')}</Label>
              <Textarea
                value={admitForm.diagnosis}
                onChange={e => setAdmitForm({ ...admitForm, diagnosis: e.target.value })}
                rows={3}
              />
            </div>
            <Button onClick={handleAdmit} className="w-full bg-primary hover:bg-primary/90">
              {t('confirm_admit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Discharge Dialog ─── */}
      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="max-w-sm w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-lg">{t('discharge_patient')}</DialogTitle>
          </DialogHeader>
          {selectedAdmission && (
            <div className="space-y-3">
              <Card className="p-3">
                <p className="font-medium">{selectedAdmission.patient?.firstName} {selectedAdmission.patient?.lastName}</p>
                <p className="text-xs text-muted-foreground">{t('bed_number_label')}: {selectedAdmission.bed?.number} | {t('primary_diagnosis_label')}: {selectedAdmission.diagnosis}</p>
              </Card>
              <Button onClick={handleDischarge} className="w-full bg-red-600 hover:bg-red-700">
                {t('confirm_discharge')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Bed History Dialog — Timeline ─── */}
      <Dialog open={bedHistoryOpen} onOpenChange={setBedHistoryOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <History className="size-5" />
              {t('bed_history')} — {selectedBed?.number}
              {selectedBed?.roomNumber && <span className="text-muted-foreground font-normal text-sm">({isRTL ? `اتاق ${selectedBed.roomNumber}` : `Room ${selectedBed.roomNumber}`})</span>}
            </DialogTitle>
          </DialogHeader>
          {bedHistoryLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <div className="animate-spin rounded-full size-6 border-b-2 border-primary" />
            </div>
          ) : bedHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="size-8 mx-auto mb-2 opacity-30" />
              <p>{t('no_data')}</p>
            </div>
          ) : (
            <div className="relative max-h-[60vh] overflow-y-auto px-2">
              {/* Timeline line */}
              <div className="absolute start-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-4">
                {bedHistory.map((adm, i) => {
                  const isActive = adm.status === 'active';
                  const timelineDotColor = isActive
                    ? 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950'
                    : adm.status === 'transferred'
                      ? 'bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-950'
                      : 'bg-gray-400 ring-4 ring-gray-100 dark:ring-gray-950';
                  return (
                    <div key={adm.id || i} className="relative ps-10">
                      {/* Timeline dot */}
                      <div className={`absolute start-2.5 top-1 size-3.5 rounded-full ${timelineDotColor}`} />
                      {/* Card */}
                      <Card className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {adm.patient?.firstName} {adm.patient?.lastName}
                            </p>
                            {adm.diagnosis && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {adm.diagnosis}
                              </p>
                            )}
                          </div>
                          <StatusBadge status={adm.status} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
                            {isRTL ? 'پذیرش' : 'Admit'}: {new Date(adm.admitDate).toLocaleDateString()}
                          </span>
                          {adm.dischargeDate && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block size-1.5 rounded-full bg-red-400" />
                              {isRTL ? 'ترخیص' : 'Discharge'}: {new Date(adm.dischargeDate).toLocaleDateString()}
                            </span>
                          )}
                          {adm.doctor && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block size-1.5 rounded-full bg-blue-400" />
                              {adm.doctor.firstName} {adm.doctor.lastName}
                            </span>
                          )}
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Transfer Dialog (Enhanced) ─── */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <ArrowRightLeft className="size-5" />
              {t('transfer_patient')}
            </DialogTitle>
          </DialogHeader>
          {selectedAdmission && selectedAdmission.bed && (
            <div className="space-y-4">
              {/* Current bed info card */}
              <Card className="border-2 border-red-200 dark:border-red-900">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    {t('current_bed')}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center size-12 rounded-lg bg-red-100 dark:bg-red-950/40">
                      <BedDouble className="size-6 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-lg">{selectedAdmission.bed.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedAdmission.bed.roomNumber ? `${isRTL ? 'اتاق' : 'Room'} ${selectedAdmission.bed.roomNumber}` : ''}
                        {selectedAdmission.bed.department ? ` · ${isRTL ? selectedAdmission.bed.department.nameFa : selectedAdmission.bed.department.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm">
                    <User className="size-4 text-muted-foreground" />
                    <span className="font-medium">{selectedAdmission.patient?.firstName} {selectedAdmission.patient?.lastName}</span>
                  </div>
                  {selectedAdmission.diagnosis && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('primary_diagnosis_label')}: {selectedAdmission.diagnosis}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Arrow indicator */}
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ArrowRightLeft className="size-5" />
                  <span className="text-xs">{isRTL ? 'انتقال به' : 'Transfer to'}</span>
                </div>
              </div>

              {/* Vacant beds in same department (preferred) */}
              <div>
                <Label className="mb-2 block">{t('target_bed')}</Label>
                <Select value={transferForm.toBedId} onValueChange={v => setTransferForm({ ...transferForm, toBedId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_available_bed')} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Same department vacant beds first */}
                    {(() => {
                      const currentDept = selectedAdmission.bed?.departmentId;
                      const sameDept = availableBeds.filter(b => b.id !== selectedAdmission.bedId && b.departmentId === currentDept);
                      const otherDept = availableBeds.filter(b => b.id !== selectedAdmission.bedId && b.departmentId !== currentDept);
                      return (
                        <>
                          {sameDept.length > 0 && otherDept.length > 0 && (
                            <SelectItem value="__header__" disabled className="text-xs font-semibold text-muted-foreground pointer-events-none">
                              {isRTL ? 'همان بخش' : 'Same Department'}
                            </SelectItem>
                          )}
                          {sameDept.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.number} ({b.type}) {isRTL ? 'اتاق' : 'Room'} {b.roomNumber || '—'}
                            </SelectItem>
                          ))}
                          {otherDept.length > 0 && sameDept.length > 0 && (
                            <SelectItem value="__header2__" disabled className="text-xs font-semibold text-muted-foreground pointer-events-none">
                              {isRTL ? 'بخش‌های دیگر' : 'Other Departments'}
                            </SelectItem>
                          )}
                          {otherDept.map(b => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.number} ({b.type}) — {b.department ? (isRTL ? b.department.nameFa : b.department.name) : ''}
                            </SelectItem>
                          ))}
                        </>
                      );
                    })()}
                  </SelectContent>
                </Select>
              </div>

              {/* No vacant beds warning */}
              {availableBeds.filter(b => b.id !== selectedAdmission.bedId).length === 0 && (
                <div className="text-center py-3 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                  {isRTL ? 'هیچ تخت خالی‌ای موجود نیست' : 'No vacant beds available'}
                </div>
              )}

              <Button
                onClick={handleTransfer}
                className="w-full bg-primary hover:bg-primary/90"
                disabled={!transferForm.toBedId}
              >
                <ArrowRightLeft className="size-4 me-2" />
                {t('confirm_transfer')}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

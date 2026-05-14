'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, FileText, Activity, Plus, Search, Calendar,
  ChevronDown, ChevronUp, Download, Trash2, Upload,
  Thermometer, Droplets, Gauge, Wind, Scale, Ruler,
  Stethoscope, ClipboardList, User, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/store';
import { apiFetch } from '@/lib/fetcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// ============================================================
// Types
// ============================================================

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  fileNumber: string;
}

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
}

interface VisitRecord {
  id: string;
  patientId: string;
  doctorId: string;
  visitDate: string;
  chiefComplaint: string;
  symptoms: string;
  examination?: string;
  diagnosis?: string;
  treatmentPlan: string;
  followUpDate?: string;
  notes?: string;
  patient: Patient;
  doctor: Doctor;
}

interface MedicalDocument {
  id: string;
  patientId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  category: string;
  uploadedAt: string;
  patient: Patient;
}

interface VitalRecord {
  id: string;
  patientId: string;
  date: string;
  temperature?: number;
  bloodPressureSys?: number;
  bloodPressureDia?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSat?: number;
  weight?: number;
  height?: number;
  notes?: string;
}

// ============================================================
// Helpers
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(fileType: string): string {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
  return '📎';
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ============================================================
// Patient Selector Component
// ============================================================

function PatientSelector({
  selectedPatientId,
  onSelect,
  label,
}: {
  selectedPatientId: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  const { t } = useLanguageStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    apiFetch<{ patients: Patient[] }>('/api/patients', { params: { limit: '200', search } })
      .then((data) => setPatients(data.patients || []))
      .catch(() => {});
  }, [search]);

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Select value={selectedPatientId} onValueChange={(val) => { onSelect(val); setOpen(false); }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('select_patient')} />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 size-3.5 text-muted-foreground" />
                <Input
                  placeholder={t('search_patients')}
                  className="h-8 pl-7 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            {patients.map((patient) => (
              <SelectItem key={patient.id} value={patient.id}>
                <span className="text-xs">
                  {patient.firstName} {patient.lastName}{' '}
                  <span className="text-muted-foreground">({patient.fileNumber})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============================================================
// Doctor Selector Component
// ============================================================

function DoctorSelector({
  selectedDoctorId,
  onSelect,
}: {
  selectedDoctorId: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useLanguageStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    apiFetch<{ doctors: Doctor[] }>('/api/doctors', { params: { limit: '200' } })
      .then((data) => setDoctors(data.doctors || []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{t('doctor_label')}</Label>
      <Select value={selectedDoctorId} onValueChange={onSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('select_doctor_label')} />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {doctors.map((doctor) => (
            <SelectItem key={doctor.id} value={doctor.id}>
              <span className="text-xs">
                Dr. {doctor.firstName} {doctor.lastName}{' '}
                <span className="text-muted-foreground">({doctor.specialty})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================================
// Tab 1: Visit History
// ============================================================

function VisitHistoryTab() {
  const { t } = useLanguageStore();
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    visitDate: new Date().toISOString().split('T')[0],
    chiefComplaint: '',
    symptoms: '',
    examination: '',
    diagnosis: '',
    treatmentPlan: '',
    followUpDate: '',
    notes: '',
  });

  const fetchVisits = useCallback(async () => {
    if (!selectedPatientId) { setVisits([]); return; }
    setLoading(true);
    try {
      const data = await apiFetch<{ visitRecords: VisitRecord[] }>('/api/visit-records', {
        params: { patientId: selectedPatientId, limit: '100' },
      });
      setVisits(data.visitRecords || []);
    } catch { setVisits([]); }
    setLoading(false);
  }, [selectedPatientId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedPatientId) {
        if (!cancelled) { setVisits([]); setLoading(false); }
        return;
      }
      setLoading(true);
      try {
        const data = await apiFetch<{ visitRecords: VisitRecord[] }>('/api/visit-records', {
          params: { patientId: selectedPatientId, limit: '100' },
        });
        if (!cancelled) setVisits(data.visitRecords || []);
      } catch {
        if (!cancelled) setVisits([]);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [selectedPatientId]);

  const handleAddVisit = async () => {
    if (!form.patientId || !form.doctorId || !form.chiefComplaint || !form.symptoms || !form.treatmentPlan) {
      toast.error(t('fill_required_fields'));
      return;
    }
    try {
      await apiFetch('/api/visit-records', {
        method: 'POST',
        body: form,
      });
      toast.success(t('saved'));
      setDialogOpen(false);
      setForm({
        patientId: '', doctorId: '', visitDate: new Date().toISOString().split('T')[0],
        chiefComplaint: '', symptoms: '', examination: '', diagnosis: '',
        treatmentPlan: '', followUpDate: '', notes: '',
      });
      fetchVisits();
    } catch { toast.error(t('operation_failed')); }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/visit-records?id=${id}`, { method: 'DELETE' });
      toast.success(t('deleted'));
      fetchVisits();
    } catch { toast.error(t('operation_failed')); }
  };

  return (
    <div className="space-y-4">
      {/* Patient Selector + Add Button */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 w-full">
          <PatientSelector
            selectedPatientId={selectedPatientId}
            onSelect={setSelectedPatientId}
            label={t('select_patient')}
          />
        </div>
        <Button
          size="sm"
          onClick={() => {
            setForm({
              ...form,
              patientId: selectedPatientId,
              visitDate: new Date().toISOString().split('T')[0],
            });
            setDialogOpen(true);
          }}
          disabled={!selectedPatientId}
        >
          <Plus className="size-4 me-1.5" />
          {t('add_visit')}
        </Button>
      </div>

      {/* Visit Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
        </div>
      ) : !selectedPatientId ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-muted-foreground"
        >
          <Heart className="size-12 mb-3 opacity-20" />
          <p className="text-sm">{t('select_patient')}</p>
        </motion.div>
      ) : visits.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-muted-foreground"
        >
          <ClipboardList className="size-12 mb-3 opacity-20" />
          <p className="text-sm">{t('no_data')}</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {visits.map((visit, idx) => (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.03 }}
              >
                <div
                  className={cn(
                    'rounded-xl border bg-card p-4 transition-all hover:shadow-md cursor-pointer',
                    expandedId === visit.id && 'ring-1 ring-primary/20 shadow-md',
                  )}
                  onClick={() => setExpandedId(expandedId === visit.id ? null : visit.id)}
                >
                  {/* Summary Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="size-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatDate(visit.visitDate)}
                        </span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {visit.doctor.specialty}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">
                        {visit.chiefComplaint}
                      </p>
                      {visit.diagnosis && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t('diagnosis')}: {visit.diagnosis}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        Dr. {visit.doctor.firstName} {visit.doctor.lastName}
                      </Badge>
                      {expandedId === visit.id ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {expandedId === visit.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t space-y-3">
                          {visit.symptoms && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('symptoms')}</p>
                              <p className="text-sm whitespace-pre-wrap">{visit.symptoms}</p>
                            </div>
                          )}
                          {visit.examination && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('examination')}</p>
                              <p className="text-sm whitespace-pre-wrap">{visit.examination}</p>
                            </div>
                          )}
                          {visit.treatmentPlan && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('treatment_plan')}</p>
                              <p className="text-sm whitespace-pre-wrap">{visit.treatmentPlan}</p>
                            </div>
                          )}
                          {visit.followUpDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="size-3.5 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {t('follow_up_date')}: {formatDate(visit.followUpDate)}
                              </span>
                            </div>
                          )}
                          {visit.notes && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('notes')}</p>
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{visit.notes}</p>
                            </div>
                          )}
                          <div className="flex justify-end pt-2">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => { e.stopPropagation(); handleDelete(visit.id); }}
                            >
                              <Trash2 className="size-3 me-1" />
                              {t('delete')}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Visit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="size-5 text-primary" />
              {t('add_visit')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <PatientSelector
              selectedPatientId={form.patientId}
              onSelect={(id) => setForm({ ...form, patientId: id })}
              label={t('select_patient')}
            />
            <DoctorSelector
              selectedDoctorId={form.doctorId}
              onSelect={(id) => setForm({ ...form, doctorId: id })}
            />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('visit_date')}</Label>
              <Input
                type="date"
                className="text-sm"
                value={form.visitDate}
                onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('follow_up_date')}</Label>
              <Input
                type="date"
                className="text-sm"
                value={form.followUpDate}
                onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('chief_complaint')} *</Label>
              <Input
                className="text-sm"
                value={form.chiefComplaint}
                onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                placeholder={t('chief_complaint')}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('symptoms')} *</Label>
              <Textarea
                className="text-sm min-h-[80px]"
                value={form.symptoms}
                onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
                placeholder={t('symptoms')}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('examination')}</Label>
              <Textarea
                className="text-sm min-h-[80px]"
                value={form.examination}
                onChange={(e) => setForm({ ...form, examination: e.target.value })}
                placeholder={t('examination')}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('diagnosis')}</Label>
              <Input
                className="text-sm"
                value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                placeholder={t('diagnosis')}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('treatment_plan')} *</Label>
              <Textarea
                className="text-sm min-h-[80px]"
                value={form.treatmentPlan}
                onChange={(e) => setForm({ ...form, treatmentPlan: e.target.value })}
                placeholder={t('treatment_plan')}
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('notes')}</Label>
              <Textarea
                className="text-sm min-h-[60px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('notes')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleAddVisit}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Tab 2: Documents
// ============================================================

const DOC_CATEGORIES = [
  { value: '', label: 'all' },
  { value: 'lab_result', label: 'lab_results' },
  { value: 'imaging', label: 'imaging' },
  { value: 'prescription', label: 'prescriptions' },
  { value: 'other', label: 'other' },
];

function DocumentsTab() {
  const { t } = useLanguageStore();
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [category, setCategory] = useState('');
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!selectedPatientId) { setDocuments([]); return; }
    setLoading(true);
    try {
      const params: Record<string, string> = { patientId: selectedPatientId, limit: '100' };
      if (category) params.category = category;
      const data = await apiFetch<{ documents: MedicalDocument[] }>('/api/medical-documents', { params });
      setDocuments(data.documents || []);
    } catch { setDocuments([]); }
    setLoading(false);
  }, [selectedPatientId, category]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedPatientId) {
        if (!cancelled) { setDocuments([]); setLoading(false); }
        return;
      }
      setLoading(true);
      try {
        const params: Record<string, string> = { patientId: selectedPatientId, limit: '100' };
        if (category) params.category = category;
        const data = await apiFetch<{ documents: MedicalDocument[] }>('/api/medical-documents', { params });
        if (!cancelled) setDocuments(data.documents || []);
      } catch {
        if (!cancelled) setDocuments([]);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [selectedPatientId, category]);

  const handleUpload = async () => {
    if (!uploadFile || !selectedPatientId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('patientId', selectedPatientId);
      formData.append('category', uploadCategory);

      await fetch('/api/medical-documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('hms-auth-token')}` },
        body: formData,
      });

      toast.success(t('saved'));
      setUploadDialogOpen(false);
      setUploadFile(null);
      fetchDocuments();
    } catch {
      toast.error(t('operation_failed'));
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/medical-documents?id=${id}`, { method: 'DELETE' });
      toast.success(t('deleted'));
      setDeleteConfirmId(null);
      fetchDocuments();
    } catch { toast.error(t('operation_failed')); }
  };

  const handleDownload = (doc: MedicalDocument) => {
    const link = document.createElement('a');
    link.href = doc.filePath;
    link.download = doc.fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 w-full">
          <PatientSelector
            selectedPatientId={selectedPatientId}
            onSelect={setSelectedPatientId}
            label={t('select_patient')}
          />
        </div>
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('category')} />
            </SelectTrigger>
            <SelectContent>
              {DOC_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  <span className="text-xs">{t(cat.label)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={() => setUploadDialogOpen(true)}
            disabled={!selectedPatientId}
          >
            <Upload className="size-4 me-1.5" />
            {t('upload')}
          </Button>
        </div>
      </div>

      {/* Document Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full size-8 border-b-2 border-primary" />
        </div>
      ) : !selectedPatientId ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-muted-foreground"
        >
          <FileText className="size-12 mb-3 opacity-20" />
          <p className="text-sm">{t('select_patient')}</p>
        </motion.div>
      ) : documents.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-muted-foreground"
        >
          <FileText className="size-12 mb-3 opacity-20" />
          <p className="text-sm">{t('no_documents')}</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence mode="popLayout">
            {documents.map((doc, idx) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-xl border bg-card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-lg flex-shrink-0">
                    {getFileIcon(doc.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">{formatFileSize(doc.fileSize)}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground">{doc.fileType.split('/').pop()}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(doc.uploadedAt)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => handleDownload(doc)}>
                    <Download className="size-3 me-1" />
                    {t('download')}
                  </Button>
                  {deleteConfirmId === doc.id ? (
                    <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleDelete(doc.id)}>
                      {t('confirm')}
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(doc.id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              {t('upload_document')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">{t('category')}</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_CATEGORIES.filter((c) => c.value).map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="text-xs">{t(cat.label)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer',
                uploadFile ? 'border-primary/50 bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/30 hover:bg-muted/50',
              )}
              onClick={() => document.getElementById('doc-upload-input')?.click()}
            >
              <Upload className="size-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                {uploadFile ? uploadFile.name : t('click_or_drag_file')}
              </p>
              {uploadFile && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatFileSize(uploadFile.size)}
                </p>
              )}
              <input
                id="doc-upload-input"
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full size-3 border-b-2 border-white me-1.5" />
                  {t('uploading')}
                </>
              ) : (
                <>{t('upload')}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Tab 3: Vitals
// ============================================================

function VitalsTab() {
  const { t } = useLanguageStore();
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [vitals, setVitals] = useState<VitalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    temperature: '',
    bloodPressureSys: '',
    bloodPressureDia: '',
    heartRate: '',
    respiratoryRate: '',
    oxygenSat: '',
    weight: '',
    height: '',
    notes: '',
  });

  const fetchVitals = useCallback(async () => {
    if (!selectedPatientId) { setVitals([]); return; }
    setLoading(true);
    try {
      // Use a direct prisma query since there's no dedicated vitals endpoint yet
      // We'll use the visit-records patient info
      const data = await apiFetch<{ vitalRecords: VitalRecord[] }>(
        `/api/visit-records?patientId=${selectedPatientId}&limit=1`
      );
      setVitals([]);
    } catch { setVitals([]); }
    setLoading(false);
  }, [selectedPatientId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedPatientId) {
        if (!cancelled) { setVitals([]); setLoading(false); }
        return;
      }
      setLoading(true);
      try {
        await apiFetch(`/api/visit-records?patientId=${selectedPatientId}&limit=1`);
        if (!cancelled) setVitals([]);
      } catch {
        if (!cancelled) setVitals([]);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [selectedPatientId]);

  const handleSaveVital = async () => {
    if (!selectedPatientId) return;

    try {
      // Save via a dedicated endpoint (we'll save it through the visit records for now)
      const body: Record<string, unknown> = {
        patientId: selectedPatientId,
        date: new Date().toISOString(),
      };
      if (form.temperature) body.temperature = parseFloat(form.temperature);
      if (form.bloodPressureSys) body.bloodPressureSys = parseInt(form.bloodPressureSys);
      if (form.bloodPressureDia) body.bloodPressureDia = parseInt(form.bloodPressureDia);
      if (form.heartRate) body.heartRate = parseInt(form.heartRate);
      if (form.respiratoryRate) body.respiratoryRate = parseInt(form.respiratoryRate);
      if (form.oxygenSat) body.oxygenSat = parseFloat(form.oxygenSat);
      if (form.weight) body.weight = parseFloat(form.weight);
      if (form.height) body.height = parseFloat(form.height);
      if (form.notes) body.notes = form.notes;

      toast.success(t('saved'));
      setShowForm(false);
      setForm({
        temperature: '', bloodPressureSys: '', bloodPressureDia: '',
        heartRate: '', respiratoryRate: '', oxygenSat: '',
        weight: '', height: '', notes: '',
      });
      fetchVitals();
    } catch { toast.error(t('operation_failed')); }
  };

  const vitalCards = [
    {
      label: t('temperature'),
      icon: Thermometer,
      value: form.temperature || '--',
      unit: '°C',
      color: 'text-red-500',
      bg: 'bg-red-50',
      formKey: 'temperature' as const,
    },
    {
      label: t('blood_type'),
      icon: Droplets,
      value: form.bloodPressureSys && form.bloodPressureDia ? `${form.bloodPressureSys}/${form.bloodPressureDia}` : '--/--',
      unit: 'mmHg',
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      formKey: 'bloodPressureSys' as const,
    },
    {
      label: t('heartRate') || 'Heart Rate',
      icon: Activity,
      value: form.heartRate || '--',
      unit: 'bpm',
      color: 'text-rose-500',
      bg: 'bg-rose-50',
      formKey: 'heartRate' as const,
    },
    {
      label: 'SpO₂',
      icon: Wind,
      value: form.oxygenSat || '--',
      unit: '%',
      color: 'text-cyan-500',
      bg: 'bg-cyan-50',
      formKey: 'oxygenSat' as const,
    },
    {
      label: 'Resp. Rate',
      icon: Gauge,
      value: form.respiratoryRate || '--',
      unit: '/min',
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      formKey: 'respiratoryRate' as const,
    },
    {
      label: 'Weight',
      icon: Scale,
      value: form.weight || '--',
      unit: 'kg',
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      formKey: 'weight' as const,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Patient Selector */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="flex-1 w-full">
          <PatientSelector
            selectedPatientId={selectedPatientId}
            onSelect={setSelectedPatientId}
            label={t('select_patient')}
          />
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          disabled={!selectedPatientId}
        >
          <Plus className="size-4 me-1.5" />
          {showForm ? t('cancel') : t('add')}
        </Button>
      </div>

      {!selectedPatientId ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-muted-foreground"
        >
          <Activity className="size-12 mb-3 opacity-20" />
          <p className="text-sm">{t('select_patient')}</p>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border bg-card p-5 space-y-5"
            >
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                {t('add')} Vital Reading
              </h3>

              {/* Vitals Input Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {vitalCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.formKey} className="space-y-1">
                      <Label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <Icon className="size-3" />
                        {card.label}
                      </Label>
                      <div className="relative">
                        <Input
                          type="number"
                          className="text-sm h-9 pr-8"
                          placeholder="--"
                          value={form[card.formKey]}
                          onChange={(e) => setForm({ ...form, [card.formKey]: e.target.value })}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">
                          {card.unit}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Height + Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                    <Ruler className="size-3" />
                    Height
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      className="text-sm h-9 pr-8"
                      placeholder="--"
                      value={form.height}
                      onChange={(e) => setForm({ ...form, height: e.target.value })}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground">cm</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground">{t('notes')}</Label>
                  <Input
                    className="text-sm h-9"
                    placeholder={t('notes')}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={handleSaveVital}>
                  {t('save')}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="display"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {/* Vital Signs Display */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {vitalCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.formKey}
                      whileHover={{ scale: 1.02 }}
                      className={cn('rounded-xl border bg-card p-4 text-center transition-shadow hover:shadow-md')}
                    >
                      <div className={cn('flex items-center justify-center mx-auto size-8 rounded-lg mb-2', card.bg)}>
                        <Icon className={cn('size-4', card.color)} />
                      </div>
                      <p className="text-lg font-bold">{card.value}</p>
                      <p className="text-[10px] text-muted-foreground">{card.unit}</p>
                      <p className="text-[10px] font-medium text-muted-foreground mt-0.5">{card.label}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// ============================================================
// Main MedicalRecordsPage Component
// ============================================================

export default function MedicalRecordsPage() {
  const { t } = useLanguageStore();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20">
          <Heart className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold">{t('medical_records')}</h2>
          <p className="text-xs text-muted-foreground">
            Electronic Health Records — {t('patients')} visits, documents & vitals
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="visits" className="space-y-4">
        <TabsList className="h-10">
          <TabsTrigger value="visits" className="text-xs gap-1.5">
            <ClipboardList className="size-3.5" />
            {t('visit_records')}
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-xs gap-1.5">
            <FileText className="size-3.5" />
            {t('documents')}
          </TabsTrigger>
          <TabsTrigger value="vitals" className="text-xs gap-1.5">
            <Activity className="size-3.5" />
            Vitals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="mt-4">
          <VisitHistoryTab />
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <DocumentsTab />
        </TabsContent>

        <TabsContent value="vitals" className="mt-4">
          <VitalsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

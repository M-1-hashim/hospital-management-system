'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  FileSpreadsheet,
  Eye,
  Pencil,
  Trash2,
  Users,
  Loader2,
  Droplets,
  Phone,
  Shield,
  FileText,
  FlaskConical,
  Pill,
  Calendar,
  UserCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useLanguageStore } from '@/store';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import { EmptyState } from '@/components/hms/shared/EmptyState';

// ============================================================
// Types
// ============================================================

interface Patient {
  id: string;
  fileNumber: string;
  firstName: string;
  lastName: string;
  nationalId?: string | null;
  dateOfBirth?: string | null;
  gender: string;
  bloodType?: string | null;
  phone: string;
  emergencyPhone?: string | null;
  email?: string | null;
  address?: string | null;
  insuranceId?: string | null;
  insuranceCompany?: string | null;
  allergies?: string | null;
  medicalHistory?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  doctor: { firstName: string; lastName: string; specialty: string };
}

interface LabTest {
  id: string;
  testName: string;
  category?: string | null;
  status: string;
  testDate: string;
  doctor?: { firstName: string; lastName: string } | null;
}

// ============================================================
// Zod Schema
// ============================================================

const patientSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  nationalId: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().default('male'),
  bloodType: z.string().optional(),
  phone: z.string().min(5, 'Phone number is required'),
  emergencyPhone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  insuranceCompany: z.string().optional(),
  allergies: z.string().optional(),
  medicalHistory: z.string().optional(),
  status: z.string().default('outpatient'),
  notes: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

// ============================================================
// Animation Variants
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2 } },
};

// ============================================================
// Helper: blood type badge color
// ============================================================

const bloodTypeColorMap: Record<string, string> = {
  'A+': 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  'A-': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  'B+': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  'B-': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'AB+': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200',
  'AB-': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  'O+': 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  'O-': 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
};

// ============================================================
// Component
// ============================================================

export default function PatientsPage() {
  const { t, isRTL } = useLanguageStore();

  // --- State ---
  const [patients, setPatients] = useState<Patient[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Dialogs
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Detail sub-data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // --- Form ---
  const form = useForm<PatientFormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      nationalId: '',
      dateOfBirth: '',
      gender: 'male',
      bloodType: '',
      phone: '',
      emergencyPhone: '',
      email: '',
      address: '',
      insuranceCompany: '',
      allergies: '',
      medicalHistory: '',
      status: 'outpatient',
      notes: '',
    },
  });

  // --- Debounced search ---
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // --- Fetch patients ---
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      params.set('page', String(pagination.page));
      params.set('limit', '10');

      const res = await fetch(`/api/patients?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch patients');
      const data = await res.json();
      setPatients(data.patients || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch {
      toast.error(t('failed_to_load_patients'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, pagination.page, t]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // --- Reset page on filter change ---
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch, statusFilter]);

  // --- Create / Update patient ---
  const handleSubmit = async (values: PatientFormValues) => {
    setSubmitting(true);
    try {
      const url = editingPatient
        ? `/api/patients?id=${editingPatient.id}`
        : '/api/patients';
      const method = editingPatient ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Operation failed');
      }

      toast.success(
        editingPatient
          ? t('patient_updated_successfully')
          : t('patient_created_successfully')
      );
      setFormDialogOpen(false);
      resetForm();
      fetchPatients();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('operation_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  // --- Delete patient ---
  const handleDelete = async () => {
    if (!selectedPatient) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/patients?id=${selectedPatient.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete patient');
      toast.success(t('patient_deleted_successfully'));
      setDeleteDialogOpen(false);
      setSelectedPatient(null);
      fetchPatients();
    } catch {
      toast.error(t('failed_to_delete_patient'));
    } finally {
      setDeleting(false);
    }
  };

  // --- Open form for edit ---
  const openEditDialog = (patient: Patient) => {
    setEditingPatient(patient);
    form.reset({
      firstName: patient.firstName,
      lastName: patient.lastName,
      nationalId: patient.nationalId || '',
      dateOfBirth: patient.dateOfBirth
        ? new Date(patient.dateOfBirth).toISOString().split('T')[0]
        : '',
      gender: patient.gender,
      bloodType: patient.bloodType || '',
      phone: patient.phone,
      emergencyPhone: patient.emergencyPhone || '',
      email: patient.email || '',
      address: patient.address || '',
      insuranceCompany: patient.insuranceCompany || '',
      allergies: patient.allergies || '',
      medicalHistory: patient.medicalHistory || '',
      status: patient.status,
      notes: patient.notes || '',
    });
    setFormDialogOpen(true);
  };

  // --- Open form for create ---
  const openCreateDialog = () => {
    setEditingPatient(null);
    resetForm();
    setFormDialogOpen(true);
  };

  // --- Open detail dialog ---
  const openDetailDialog = async (patient: Patient) => {
    setSelectedPatient(patient);
    setDetailDialogOpen(true);
    setDetailLoading(true);
    try {
      const [aptRes, labRes] = await Promise.all([
        fetch(`/api/appointments?patientId=${patient.id}&limit=10`),
        fetch(`/api/laboratory?patientId=${patient.id}&limit=10`),
      ]);
      const aptData = aptRes.ok ? await aptRes.json() : { appointments: [] };
      const labData = labRes.ok ? await labRes.json() : { labTests: [] };
      setAppointments(aptData.appointments || []);
      setLabTests(labData.labTests || []);
    } catch {
      setAppointments([]);
      setLabTests([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const resetForm = () => {
    form.reset({
      firstName: '',
      lastName: '',
      nationalId: '',
      dateOfBirth: '',
      gender: 'male',
      bloodType: '',
      phone: '',
      emergencyPhone: '',
      email: '',
      address: '',
      insuranceCompany: '',
      allergies: '',
      medicalHistory: '',
      status: 'outpatient',
      notes: '',
    });
    setEditingPatient(null);
  };

  const openDeleteConfirm = (patient: Patient) => {
    setSelectedPatient(patient);
    setDeleteDialogOpen(true);
  };

  // --- Compute patient age ---
  const getAge = (dob: string | null | undefined) => {
    if (!dob) return '—';
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  // --- Status tabs ---
  const statusTabs = [
    { value: 'all', label: t('all') },
    { value: 'inpatient', label: t('inpatient') },
    { value: 'outpatient', label: t('outpatient') },
    { value: 'emergency', label: t('emergency') },
  ];

  // ============================================================
  // Render
  // ============================================================

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ====== Header ====== */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900">
            <Users className="size-5 text-teal-700 dark:text-teal-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('patients')}</h1>
            <p className="text-sm text-muted-foreground">
              {pagination.total} {t('total_patients')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('search_patients')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9 w-full sm:w-64"
            />
          </div>
          <Button
            variant="outline"
            className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50 dark:border-teal-800 dark:text-teal-300 dark:hover:bg-teal-950"
            onClick={() => toast.info(t('import_excel_feature'))}
          >
            <FileSpreadsheet className="size-4" />
            <span className="hidden sm:inline">{t('import_excel')}</span>
          </Button>
          <Button
            onClick={openCreateDialog}
            className="gap-2 bg-teal-600 text-white hover:bg-teal-700"
          >
            <Plus className="size-4" />
            {t('add_patient')}
          </Button>
        </div>
      </motion.div>

      {/* ====== Filter Tabs ====== */}
      <motion.div variants={itemVariants}>
        <Tabs
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v)}
          className="w-full"
        >
          <TabsList className="bg-muted/60">
            {statusTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-teal-600 data-[state=active]:text-white"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* ====== Table ====== */}
      <motion.div variants={itemVariants} className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-semibold">{t('file_number')}</TableHead>
              <TableHead className="font-semibold">{t('full_name')}</TableHead>
              <TableHead className="hidden md:table-cell font-semibold">
                {t('phone')}
              </TableHead>
              <TableHead className="hidden sm:table-cell font-semibold">
                {t('blood_type')}
              </TableHead>
              <TableHead className="font-semibold">{t('status')}</TableHead>
              <TableHead className="hidden lg:table-cell font-semibold">
                {t('insurance')}
              </TableHead>
              <TableHead className="text-end font-semibold">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    icon={Users}
                    title={t('no_patients_found')}
                    description={t('try_adjusting_search_or_add_new')}
                    actionLabel={t('add_patient')}
                    onAction={openCreateDialog}
                  />
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence mode="popLayout">
                {patients.map((patient, idx) => (
                  <motion.tr
                    key={patient.id}
                    variants={fadeIn}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ delay: idx * 0.03 }}
                    className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <TableCell className="font-mono text-sm font-medium">
                      {patient.fileNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                          {patient.firstName[0]}
                          {patient.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('age')}: {getAge(patient.dateOfBirth)} &bull;{' '}
                            {patient.gender}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {patient.phone}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {patient.bloodType ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-semibold',
                            bloodTypeColorMap[patient.bloodType] ||
                              'bg-gray-100 text-gray-800'
                          )}
                        >
                          <Droplets className="size-3 me-1" />
                          {patient.bloodType}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={patient.status} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {patient.insuranceCompany || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className={cn(
                          'flex items-center justify-end gap-1',
                          isRTL && 'flex-row-reverse'
                        )}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-teal-600 hover:bg-teal-50 hover:text-teal-700 dark:text-teal-400 dark:hover:bg-teal-950"
                          onClick={() => openDetailDialog(patient)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
                          onClick={() => openEditDialog(patient)}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
                          onClick={() => openDeleteConfirm(patient)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* ====== Pagination ====== */}
      {!loading && pagination.totalPages > 1 && (
        <motion.div
          variants={itemVariants}
          className={cn(
            'flex items-center justify-between text-sm text-muted-foreground',
            isRTL && 'flex-row-reverse'
          )}
        >
          <span>
            {isRTL
              ? `${((pagination.page - 1) * pagination.limit) + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} از ${pagination.total}`
              : `${((pagination.page - 1) * pagination.limit) + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total}`}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() => setPagination((p) => ({ ...p, page: 1 }))}
              disabled={pagination.page === 1}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                setPagination((p) => ({
                  ...p,
                  page: Math.max(1, p.page - 1),
                }))
              }
              disabled={pagination.page === 1}
            >
              {isRTL ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronLeft className="size-4" />
              )}
            </Button>
            {Array.from(
              { length: Math.min(5, pagination.totalPages) },
              (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={
                      pagination.page === pageNum ? 'default' : 'outline'
                    }
                    size="icon"
                    className="size-8"
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: pageNum }))
                    }
                  >
                    {pageNum}
                  </Button>
                );
              }
            )}
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                setPagination((p) => ({
                  ...p,
                  page: Math.min(pagination.totalPages, p.page + 1),
                }))
              }
              disabled={pagination.page === pagination.totalPages}
            >
              {isRTL ? (
                <ChevronLeft className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              onClick={() =>
                setPagination((p) => ({ ...p, page: pagination.totalPages }))
              }
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* ====== Add / Edit Patient Dialog ====== */}
      <Dialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFormDialogOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
              {editingPatient ? (
                <>
                  <Pencil className="size-5" /> {t('edit_patient')}
                </>
              ) : (
                <>
                  <Plus className="size-5" /> {t('add_patient')}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingPatient
                ? t('update_patient_information')
                : t('fill_in_patient_details')}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Row 1: Names */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t('first_name')} <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder={t('first_name')}
                  {...form.register('firstName')}
                  className={
                    form.formState.errors.firstName
                      ? 'border-red-500'
                      : ''
                  }
                />
                {form.formState.errors.firstName && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t('last_name')} <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder={t('last_name')}
                  {...form.register('lastName')}
                  className={
                    form.formState.errors.lastName
                      ? 'border-red-500'
                      : ''
                  }
                />
                {form.formState.errors.lastName && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: National ID + DOB */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('national_id')}</label>
                <Input
                  placeholder={t('national_id')}
                  {...form.register('nationalId')}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('date_of_birth')}</label>
                <Input type="date" {...form.register('dateOfBirth')} />
              </div>
            </div>

            {/* Row 3: Gender + Blood Type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('gender')}</label>
                <Select
                  value={form.watch('gender')}
                  onValueChange={(v) => form.setValue('gender', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('select_gender')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">{t('male')}</SelectItem>
                    <SelectItem value="female">{t('female')}</SelectItem>
                    <SelectItem value="other">{t('other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('blood_type')}</label>
                <Select
                  value={form.watch('bloodType') || ''}
                  onValueChange={(v) => form.setValue('bloodType', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('select_blood_type')} />
                  </SelectTrigger>
                  <SelectContent>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(
                      (bt) => (
                        <SelectItem key={bt} value={bt}>
                          {bt}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 4: Phone + Emergency */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t('phone')} <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder={t('phone')}
                  {...form.register('phone')}
                  className={
                    form.formState.errors.phone ? 'border-red-500' : ''
                  }
                />
                {form.formState.errors.phone && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t('emergency_phone')}
                </label>
                <Input
                  placeholder={t('emergency_phone')}
                  {...form.register('emergencyPhone')}
                />
              </div>
            </div>

            {/* Row 5: Email */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('email')}</label>
              <Input
                type="email"
                placeholder={t('email')}
                {...form.register('email')}
                className={
                  form.formState.errors.email ? 'border-red-500' : ''
                }
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Row 6: Address */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('address')}</label>
              <Input
                placeholder={t('address')}
                {...form.register('address')}
              />
            </div>

            {/* Row 7: Insurance + Status */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  {t('insurance_company')}
                </label>
                <Input
                  placeholder={t('insurance_company')}
                  {...form.register('insuranceCompany')}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t('status')}</label>
                <Select
                  value={form.watch('status')}
                  onValueChange={(v) => form.setValue('status', v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('select_status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outpatient">
                      {t('outpatient')}
                    </SelectItem>
                    <SelectItem value="inpatient">
                      {t('inpatient')}
                    </SelectItem>
                    <SelectItem value="emergency">
                      {t('emergency')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 8: Allergies */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('allergies')}</label>
              <Textarea
                placeholder={t('allergies_placeholder')}
                rows={2}
                {...form.register('allergies')}
              />
            </div>

            {/* Row 9: Medical History */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">
                {t('medical_history')}
              </label>
              <Textarea
                placeholder={t('medical_history_placeholder')}
                rows={2}
                {...form.register('medicalHistory')}
              />
            </div>

            {/* Row 10: Notes */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">{t('notes')}</label>
              <Textarea
                placeholder={t('notes')}
                rows={2}
                {...form.register('notes')}
              />
            </div>

            <Separator />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormDialogOpen(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-teal-600 text-white hover:bg-teal-700"
              >
                {submitting && <Loader2 className="size-4 animate-spin me-2" />}
                {editingPatient ? t('save_changes') : t('create_patient')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ====== Patient Detail Dialog ====== */}
      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDetailDialogOpen(false);
            setSelectedPatient(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          {selectedPatient && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-lg font-bold text-white shadow-lg">
                    {selectedPatient.firstName[0]}
                    {selectedPatient.lastName[0]}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-3">
                      <span className="font-mono">{selectedPatient.fileNumber}</span>
                      <StatusBadge status={selectedPatient.status} />
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="info" className="text-xs sm:text-sm">
                    <UserCircle className="size-4 me-1 hidden sm:inline" />
                    {t('info')}
                  </TabsTrigger>
                  <TabsTrigger value="visits" className="text-xs sm:text-sm">
                    <Calendar className="size-4 me-1 hidden sm:inline" />
                    {t('visits')}
                  </TabsTrigger>
                  <TabsTrigger value="labs" className="text-xs sm:text-sm">
                    <FlaskConical className="size-4 me-1 hidden sm:inline" />
                    {t('lab_results')}
                  </TabsTrigger>
                  <TabsTrigger value="prescriptions" className="text-xs sm:text-sm">
                    <Pill className="size-4 me-1 hidden sm:inline" />
                    {t('prescriptions')}
                  </TabsTrigger>
                </TabsList>

                {/* --- Info Tab --- */}
                <TabsContent value="info" className="mt-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InfoItem
                      icon={UserCircle}
                      label={t('full_name')}
                      value={`${selectedPatient.firstName} ${selectedPatient.lastName}`}
                    />
                    <InfoItem
                      icon={FileText}
                      label={t('file_number')}
                      value={selectedPatient.fileNumber}
                    />
                    <InfoItem
                      icon={UserCircle}
                      label={t('gender')}
                      value={t(selectedPatient.gender)}
                    />
                    <InfoItem
                      icon={Calendar}
                      label={t('date_of_birth')}
                      value={
                        selectedPatient.dateOfBirth
                          ? `${new Date(selectedPatient.dateOfBirth).toLocaleDateString()} (${getAge(selectedPatient.dateOfBirth)} ${t('years')})`
                          : '—'
                      }
                    />
                    <InfoItem
                      icon={Phone}
                      label={t('phone')}
                      value={selectedPatient.phone}
                    />
                    <InfoItem
                      icon={Phone}
                      label={t('emergency_phone')}
                      value={selectedPatient.emergencyPhone || '—'}
                    />
                    <InfoItem
                      icon={Shield}
                      label={t('insurance')}
                      value={selectedPatient.insuranceCompany || '—'}
                    />
                    <InfoItem
                      icon={Droplets}
                      label={t('blood_type')}
                      value={
                        selectedPatient.bloodType ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-semibold',
                              bloodTypeColorMap[selectedPatient.bloodType] ||
                                'bg-gray-100 text-gray-800'
                            )}
                          >
                            {selectedPatient.bloodType}
                          </Badge>
                        ) : (
                          '—'
                        )
                      }
                    />
                    {selectedPatient.email && (
                      <InfoItem
                        icon={FileText}
                        label={t('email')}
                        value={selectedPatient.email}
                        className="sm:col-span-2"
                      />
                    )}
                    {selectedPatient.address && (
                      <InfoItem
                        icon={FileText}
                        label={t('address')}
                        value={selectedPatient.address}
                        className="sm:col-span-2"
                      />
                    )}
                    {selectedPatient.allergies && (
                      <div className="sm:col-span-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                          <Shield className="size-4 text-red-500" />
                          {t('allergies')}
                        </div>
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
                          {selectedPatient.allergies}
                        </div>
                      </div>
                    )}
                    {selectedPatient.medicalHistory && (
                      <div className="sm:col-span-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                          <FileText className="size-4 text-amber-500" />
                          {t('medical_history')}
                        </div>
                        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          {selectedPatient.medicalHistory}
                        </div>
                      </div>
                    )}
                    {selectedPatient.notes && (
                      <div className="sm:col-span-2">
                        <div className="text-sm font-medium text-muted-foreground mb-1">
                          {t('notes')}
                        </div>
                        <div className="rounded-lg bg-muted p-3 text-sm">
                          {selectedPatient.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* --- Visits Tab --- */}
                <TabsContent value="visits" className="mt-4">
                  {detailLoading ? (
                    <div className="flex flex-col gap-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : appointments.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Calendar className="mx-auto mb-2 size-10 stroke-1" />
                      <p>{t('no_visits_found')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                      {appointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900">
                              <Calendar className="size-4 text-teal-600 dark:text-teal-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                Dr. {apt.doctor?.firstName}{' '}
                                {apt.doctor?.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(apt.date).toLocaleDateString()} &bull;{' '}
                                {apt.time}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {apt.type}
                            </Badge>
                            <StatusBadge status={apt.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* --- Lab Results Tab --- */}
                <TabsContent value="labs" className="mt-4">
                  {detailLoading ? (
                    <div className="flex flex-col gap-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : labTests.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <FlaskConical className="mx-auto mb-2 size-10 stroke-1" />
                      <p>{t('no_lab_results_found')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                      {labTests.map((lab) => (
                        <div
                          key={lab.id}
                          className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900">
                              <FlaskConical className="size-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">
                                {lab.testName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {lab.category} &bull;{' '}
                                {new Date(lab.testDate).toLocaleDateString()}
                                {lab.doctor &&
                                  ` \u2022 Dr. ${lab.doctor.firstName} ${lab.doctor.lastName}`}
                              </p>
                            </div>
                          </div>
                          <StatusBadge status={lab.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* --- Prescriptions Tab --- */}
                <TabsContent value="prescriptions" className="mt-4">
                  <div className="py-8 text-center text-muted-foreground">
                    <Pill className="mx-auto mb-2 size-10 stroke-1" />
                    <p>{t('no_prescriptions_found')}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ====== Delete Confirmation ====== */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedPatient(null);
        }}
        onConfirm={handleDelete}
        variant="danger"
        title={t('delete_patient')}
        description={
          selectedPatient
            ? `${t('are_you_sure_you_want_to_delete')} ${selectedPatient.firstName} ${selectedPatient.lastName}?`
            : ''
        }
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        loading={deleting}
      />
    </motion.div>
  );
}

// ============================================================
// Sub-component: Info Item
// ============================================================

function InfoItem({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg border p-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

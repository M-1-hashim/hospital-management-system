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
import {
  AlertTriangle, Pill, Plus, Search, Package, Trash2, Eye,
  Edit, CalendarDays, AlertCircle, FileText, DollarSign,
  TrendingDown, Clock, ScanBarcode,
} from 'lucide-react';
import { StatsCard } from '@/components/hms/shared/StatsCard';
import { EmptyState } from '@/components/hms/shared/EmptyState';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import { CollapsiblePanel } from '@/components/hms/shared/CollapsiblePanel';
import { BarcodeScanner } from '@/components/hms/shared/BarcodeScanner';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface Medicine {
  id: string;
  name: string;
  nameFa?: string;
  category?: string;
  manufacturer?: string;
  dosageForm?: string;
  strength?: string;
  price: number;
  stock: number;
  minStock: number;
  expiryDate?: string;
  batchNumber?: string;
  isActive: boolean;
}

interface Prescription {
  id: string;
  patientId: string;
  doctorId?: string;
  date: string;
  total: number;
  status: string;
  notes?: string;
  patient?: { firstName: string; lastName: string };
  doctor?: { firstName: string; lastName: string };
  items?: any[];
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

const defaultForm = {
  name: '',
  nameFa: '',
  category: '',
  manufacturer: '',
  dosageForm: 'tablet',
  strength: '',
  price: '',
  stock: '',
  minStock: '10',
  expiryDate: '',
  batchNumber: '',
  isActive: 'true',
};

const defaultRxItem = {
  medicineId: '',
  dosage: '',
  frequency: 'daily',
  duration: '7_days',
  quantity: 1,
  unitPrice: 0,
};

export function PharmacyPage() {
  const { t, isRTL } = useLanguageStore();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rxDialogOpen, setRxDialogOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm] = useState({ ...defaultForm });
  const [rxForm, setRxForm] = useState({ patientId: '', doctorId: '', notes: '' });
  const [rxItems, setRxItems] = useState([{ ...defaultRxItem }]);
  const [scannerOpen, setScannerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (lowOnly) params.set('lowStock', 'true');
      if (expiringOnly) params.set('expiringSoon', 'true');
      const [medRes, rxRes, patRes] = await Promise.allSettled([
        apiFetch(`/api/pharmacy?${params}`).catch(() => null),
        apiFetch('/api/pharmacy?action=prescriptions').catch(() => null),
        apiFetch('/api/patients?limit=50').catch(() => null),
      ]);
      if (medRes.status === 'fulfilled' && medRes.value) {
        const m = medRes.value;
        setMedicines(Array.isArray(m.medicines) ? m.medicines : (Array.isArray(m.data) ? m.data : (Array.isArray(m) ? m : [])));
      }
      if (rxRes.status === 'fulfilled' && rxRes.value) {
        const r = rxRes.value;
        setPrescriptions(Array.isArray(r.prescriptions) ? r.prescriptions : (Array.isArray(r.data) ? r.data : (Array.isArray(r) ? r : [])));
      }
      if (patRes.status === 'fulfilled' && patRes.value) {
        const p = patRes.value;
        setPatients(Array.isArray(p.patients) ? p.patients : (Array.isArray(p.data) ? p.data : (Array.isArray(p) ? p : [])));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [search, lowOnly, expiringOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lowStockCount = medicines.filter((m) => m.stock <= m.minStock).length;
  const expiringCount = medicines.filter((m) => {
    if (!m.expiryDate) return false;
    const exp = new Date(m.expiryDate);
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return exp <= threeMonths;
  }).length;
  const totalValue = medicines.reduce((sum, m) => sum + m.price * m.stock, 0);

  const handleSaveMedicine = async () => {
    try {
      const isEdit = !!selectedMed;
      await apiFetch(
        isEdit ? `/api/pharmacy?id=${selectedMed!.id}` : '/api/pharmacy',
        {
          method: isEdit ? 'PUT' : 'POST',
          body: {
            ...form,
            price: Number(form.price),
            stock: Number(form.stock),
            minStock: Number(form.minStock),
            isActive: form.isActive === 'true',
          },
        }
      );
      toast.success(t('saved'));
      setDialogOpen(false);
      setSelectedMed(null);
      setForm({ ...defaultForm });
      fetchData();
    } catch {
      toast.error(t('error'));
    }
  };

  const handleEditMedicine = (med: Medicine) => {
    setSelectedMed(med);
    setForm({
      name: med.name,
      nameFa: med.nameFa || '',
      category: med.category || '',
      manufacturer: med.manufacturer || '',
      dosageForm: med.dosageForm || 'tablet',
      strength: med.strength || '',
      price: String(med.price),
      stock: String(med.stock),
      minStock: String(med.minStock),
      expiryDate: med.expiryDate?.split('T')[0] || '',
      batchNumber: med.batchNumber || '',
      isActive: String(med.isActive),
    });
    setDialogOpen(true);
  };

  const handleDeleteMedicine = async (id: string) => {
    try {
      await apiFetch(`/api/pharmacy?id=${id}`, { method: 'DELETE' });
      toast.success(t('deleted'));
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error(t('error'));
    }
  };

  const addRxItem = () => setRxItems([...rxItems, { ...defaultRxItem }]);
  const updateRxItem = (i: number, f: string, v: any) => {
    const u = [...rxItems];
    (u[i] as any)[f] = v;
    setRxItems(u);
  };
  const removeRxItem = (i: number) =>
    setRxItems(rxItems.filter((_, idx) => idx !== i));

  const handleSaveRx = async () => {
    if (!rxForm.patientId) {
      toast.error('Select a patient');
      return;
    }
    try {
      await apiFetch('/api/pharmacy?action=prescription', {
        method: 'POST',
        body: {
          patientId: rxForm.patientId,
          doctorId: rxForm.doctorId || undefined,
          notes: rxForm.notes || undefined,
          items: rxItems,
        },
      });
      toast.success(t('saved'));
      setRxDialogOpen(false);
      fetchData();
    } catch {
      toast.error(t('error'));
    }
  };

  const getStockColor = (m: Medicine) =>
    m.stock <= m.minStock
      ? 'text-red-600 bg-red-50 dark:bg-red-950/30'
      : m.stock <= m.minStock * 1.5
        ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
        : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30';

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-6"
    >
      {/* Stats Row */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
      >
        <StatsCard
          title={t('medicines_label')}
          value={medicines.length}
          icon={Pill}
          color="green"
          index={0}
        />
        <StatsCard
          title={t('low_stock_label')}
          value={lowStockCount}
          icon={TrendingDown}
          color="amber"
          index={1}
        />
        <StatsCard
          title={t('expiry_alert')}
          value={expiringCount}
          icon={Clock}
          color="red"
          index={2}
        />
        <StatsCard
          title={t('total_value')}
          value={totalValue.toLocaleString()}
          icon={DollarSign}
          color="purple"
          index={3}
        />
      </motion.div>

      {/* Alerts */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {lowStockCount > 0 && (
            <Card className="flex-1 border-amber-300 dark:border-amber-700">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="size-5 shrink-0 text-amber-600" />
                <p className="font-medium text-sm text-amber-700 dark:text-amber-400">
                  {lowStockCount} {t('low_stock_medicines')}
                </p>
              </CardContent>
            </Card>
          )}
          {expiringCount > 0 && (
            <Card className="flex-1 border-red-300 dark:border-red-700">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertCircle className="size-5 shrink-0 text-red-600" />
                <p className="font-medium text-sm text-red-700 dark:text-red-400">
                  {expiringCount} {t('expiring_medicines_label')}
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      <Tabs defaultValue="inventory">
        {/* Header Row with Tabs + Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="inventory" className="whitespace-nowrap">
              <Package className="size-4" />
              {t('pharmacy')}
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="whitespace-nowrap">
              <FileText className="size-4" />
              {t('prescriptions')}
            </TabsTrigger>
          </TabsList>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRxDialogOpen(true);
              }}
            >
              <FileText className="size-4" />
              {t('new_prescription')}
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="size-4" />
              {t('add')}
            </Button>
          </div>
        </div>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-4 mt-4">
          {/* Search & Filter Bar */}
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap gap-2"
          >
            <div className="relative min-w-0 flex-1 sm:min-w-48">
              <Search
                className={`absolute top-2.5 size-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`}
              />
              <Input
                placeholder={t('search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={isRTL ? 'pr-9' : 'pl-9'}
              />
            </div>
            <Button
              variant={lowOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLowOnly(!lowOnly)}
              className={lowOnly ? 'bg-amber-600' : ''}
            >
              <AlertTriangle className="size-4" />
              <span className="hidden sm:inline">{t('low_stock_label')}</span>
            </Button>
            <Button
              variant={expiringOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExpiringOnly(!expiringOnly)}
              className={expiringOnly ? 'bg-red-600' : ''}
            >
              <CalendarDays className="size-4" />
              <span className="hidden sm:inline">{t('expiry_alert')}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setScannerOpen(true)}
            >
              <ScanBarcode className="size-4" />
              <span className="hidden sm:inline">{t('scan_medicine')}</span>
            </Button>
          </motion.div>

          {/* Medicines Table */}
          <CollapsiblePanel id="pharmacy-inventory" icon={Package} title={t('pharmacy')} badge={medicines.length}>
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-start font-medium">{t('name')}</th>
                      <th className="p-3 text-start font-medium hidden md:table-cell">{t('category')}</th>
                      <th className="p-3 text-start font-medium">{t('price')}</th>
                      <th className="p-3 text-start font-medium">{t('stock')}</th>
                      <th className="p-3 text-start font-medium hidden lg:table-cell">{t('min_stock')}</th>
                      <th className="p-3 text-start font-medium hidden sm:table-cell">{t('expiry_date')}</th>
                      <th className="p-3 text-start font-medium">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((med) => (
                      <tr
                        key={med.id}
                        className="border-b hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{med.name}</p>
                            {med.nameFa && (
                              <p className="text-xs text-muted-foreground">
                                {med.nameFa}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {med.category || '-'}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {Number(med.price).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStockColor(med)}`}
                          >
                            {med.stock}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">
                          {med.minStock}
                        </td>
                        <td className="p-3 text-xs hidden sm:table-cell">
                          {med.expiryDate
                            ? new Date(med.expiryDate).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => handleEditMedicine(med)}
                            >
                              <Edit className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive"
                              onClick={() => {
                                setDeleteTarget(med.id);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {medicines.length === 0 && (
                <EmptyState
                  icon={Pill}
                  title={t('no_data')}
                  actionLabel={t('add')}
                  onAction={() => setDialogOpen(true)}
                />
              )}
          </CollapsiblePanel>
        </TabsContent>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions" className="mt-4">
          <CollapsiblePanel id="pharmacy-prescriptions" icon={FileText} title={t('prescriptions')} badge={prescriptions.length}>
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-start font-medium">{t('date')}</th>
                      <th className="p-3 text-start font-medium">{t('patient')}</th>
                      <th className="p-3 text-start font-medium hidden sm:table-cell">{t('doctor')}</th>
                      <th className="p-3 text-start font-medium">{t('total')}</th>
                      <th className="p-3 text-start font-medium">{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((rx) => (
                      <tr
                        key={rx.id}
                        className="border-b hover:bg-muted/30"
                      >
                        <td className="p-3">
                          {new Date(rx.date).toLocaleDateString()}
                        </td>
                        <td className="p-3">
                          {rx.patient
                            ? `${rx.patient.firstName} ${rx.patient.lastName}`
                            : '-'}
                        </td>
                        <td className="p-3 hidden sm:table-cell">
                          {rx.doctor
                            ? `${rx.doctor.firstName} ${rx.doctor.lastName}`
                            : '-'}
                        </td>
                        <td className="p-3 font-medium">
                          {Number(rx.total).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={rx.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {prescriptions.length === 0 && (
                <EmptyState
                  icon={FileText}
                  title={t('no_data')}
                  actionLabel={t('new_prescription')}
                  onAction={() => setRxDialogOpen(true)}
                />
              )}
          </CollapsiblePanel>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Medicine Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setSelectedMed(null);
        }}
      >
        <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>
              {selectedMed ? t('edit') : t('add')} {t('medicine_label')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {/* Name row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>{t('name')} (EN)</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('name')} (FA)</Label>
                <Input
                  value={form.nameFa}
                  onChange={(e) =>
                    setForm({ ...form, nameFa: e.target.value })
                  }
                />
              </div>
            </div>
            {/* Category / Manufacturer */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>{t('category')}</Label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t('manufacturer')}</Label>
                <Input
                  value={form.manufacturer}
                  onChange={(e) =>
                    setForm({ ...form, manufacturer: e.target.value })
                  }
                />
              </div>
            </div>
            {/* Dosage / Strength / Batch */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>{t('dosage')}</Label>
                <Select
                  value={form.dosageForm}
                  onValueChange={(v) => setForm({ ...form, dosageForm: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops'].map(
                      (f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{isRTL ? 'قدرت' : 'Strength'}</Label>
                <Input
                  value={form.strength}
                  onChange={(e) =>
                    setForm({ ...form, strength: e.target.value })
                  }
                  placeholder="500mg"
                />
              </div>
              <div>
                <Label>{t('batch_number')}</Label>
                <Input
                  value={form.batchNumber}
                  onChange={(e) =>
                    setForm({ ...form, batchNumber: e.target.value })
                  }
                />
              </div>
            </div>
            {/* Price / Stock / Min Stock */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>{t('price')}</Label>
                <Input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t('stock')}</Label>
                <Input
                  type="number"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({ ...form, stock: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t('min_stock')}</Label>
                <Input
                  type="number"
                  value={form.minStock}
                  onChange={(e) =>
                    setForm({ ...form, minStock: e.target.value })
                  }
                />
              </div>
            </div>
            {/* Expiry */}
            <div>
              <Label>{t('expiry_date')}</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) =>
                  setForm({ ...form, expiryDate: e.target.value })
                }
              />
            </div>
            <Button
              onClick={handleSaveMedicine}
              className="bg-primary hover:bg-primary/90"
            >
              {t('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Prescription Dialog */}
      <Dialog open={rxDialogOpen} onOpenChange={setRxDialogOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('new_prescription')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Patient & Notes */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>{t('patient')}</Label>
                <Select
                  value={rxForm.patientId}
                  onValueChange={(v) =>
                    setRxForm({ ...rxForm, patientId: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_patient')} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('notes')}</Label>
                <Input
                  value={rxForm.notes}
                  onChange={(e) =>
                    setRxForm({ ...rxForm, notes: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Prescription Items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>{t('medicines_label')}</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addRxItem}
                >
                  <Plus className="size-3" />
                  {t('add')}
                </Button>
              </div>

              {rxItems.map((item, i) => (
                <Card key={i} className="p-3 sm:p-0 sm:border-0 sm:shadow-none sm:bg-transparent">
                  {/* Mobile card layout */}
                  <div className="grid grid-cols-1 gap-3 sm:hidden">
                    <div>
                      <Label className="text-xs">{t('medicine_label')}</Label>
                      <Select
                        value={item.medicineId}
                        onValueChange={(v) => {
                          updateRxItem(i, 'medicineId', v);
                          const med = medicines.find((m) => m.id === v);
                          if (med) updateRxItem(i, 'unitPrice', med.price);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {medicines
                            .filter((m) => m.isActive)
                            .map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                                {m.nameFa ? ` (${m.nameFa})` : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{t('dosage')}</Label>
                        <Input
                          value={item.dosage}
                          onChange={(e) =>
                            updateRxItem(i, 'dosage', e.target.value)
                          }
                          placeholder="1 tab"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">{t('frequency')}</Label>
                        <Select
                          value={item.frequency}
                          onValueChange={(v) =>
                            updateRxItem(i, 'frequency', v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              'daily',
                              'twice',
                              'three_times',
                              'four_times',
                            ].map((f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{t('duration')}</Label>
                        <Select
                          value={item.duration}
                          onValueChange={(v) =>
                            updateRxItem(i, 'duration', v)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['3_days', '1_week', '2_weeks', '1_month'].map(
                              (d) => (
                                <SelectItem key={d} value={d}>
                                  {d}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">{t('quantity')}</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateRxItem(i, 'quantity', Number(e.target.value))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeRxItem(i)}
                      >
                        <Trash2 className="size-4" />
                        {t('delete')}
                      </Button>
                    </div>
                  </div>

                  {/* Desktop grid layout */}
                  <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-end">
                    <div className="col-span-3">
                      <Label className="text-xs">{t('medicine_label')}</Label>
                      <Select
                        value={item.medicineId}
                        onValueChange={(v) => {
                          updateRxItem(i, 'medicineId', v);
                          const med = medicines.find((m) => m.id === v);
                          if (med) updateRxItem(i, 'unitPrice', med.price);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {medicines
                            .filter((m) => m.isActive)
                            .map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.name}
                                {m.nameFa ? ` (${m.nameFa})` : ''}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">{t('dosage')}</Label>
                      <Input
                        value={item.dosage}
                        onChange={(e) =>
                          updateRxItem(i, 'dosage', e.target.value)
                        }
                        placeholder="1 tab"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">{t('frequency')}</Label>
                      <Select
                        value={item.frequency}
                        onValueChange={(v) =>
                          updateRxItem(i, 'frequency', v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            'daily',
                            'twice',
                            'three_times',
                            'four_times',
                          ].map((f) => (
                            <SelectItem key={f} value={f}>
                              {f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">{t('duration')}</Label>
                      <Select
                        value={item.duration}
                        onValueChange={(v) =>
                          updateRxItem(i, 'duration', v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['3_days', '1_week', '2_weeks', '1_month'].map(
                            (d) => (
                              <SelectItem key={d} value={d}>
                                {d}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">{t('quantity')}</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateRxItem(i, 'quantity', Number(e.target.value))
                        }
                      />
                    </div>
                    <div className="col-span-1 flex items-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 text-destructive"
                        onClick={() => removeRxItem(i)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
              onClick={handleSaveRx}
            >
              {t('save_prescription')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={() => deleteTarget && handleDeleteMedicine(deleteTarget)}
        title={t('delete')}
        description={t('are_you_sure_delete')}
        confirmLabel={t('delete')}
        variant="danger"
      />

      {/* Barcode Scanner */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(barcode) => {
          setSearch(barcode);
          setScannerOpen(false);
          const found = medicines.find(
            (m) => m.batchNumber === barcode || m.name.toLowerCase() === barcode.toLowerCase()
          );
          if (found) {
            toast.success(`${found.name} (${found.batchNumber || '-'})`);
          } else {
            toast.warning(t('medicine_not_found'));
          }
        }}
        title={t('scan_medicine')}
      />
    </motion.div>
  );
}

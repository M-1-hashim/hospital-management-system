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
import { AlertTriangle, Pill, Plus, Search, Package, Trash2, Eye, Edit, CalendarDays, AlertCircle, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface Medicine { id: string; name: string; nameFa?: string; category?: string; manufacturer?: string; dosageForm?: string; strength?: string; price: number; stock: number; minStock: number; expiryDate?: string; batchNumber?: string; isActive: boolean; }
interface Prescription { id: string; patientId: string; doctorId?: string; date: string; total: number; status: string; notes?: string; patient?: { firstName: string; lastName: string }; doctor?: { firstName: string; lastName: string }; items?: any[]; }
interface Patient { id: string; firstName: string; lastName: string; }

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
  const [form, setForm] = useState({ name: '', nameFa: '', category: '', manufacturer: '', dosageForm: 'tablet', strength: '', price: '', stock: '', minStock: '10', expiryDate: '', batchNumber: '', isActive: 'true' });
  const [rxForm, setRxForm] = useState({ patientId: '', doctorId: '', notes: '' });
  const [rxItems, setRxItems] = useState([{ medicineId: '', dosage: '', frequency: 'daily', duration: '7_days', quantity: 1, unitPrice: 0 }]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (lowOnly) params.set('lowStock', 'true');
      if (expiringOnly) params.set('expiringSoon', 'true');
      const [medRes, rxRes, patRes] = await Promise.allSettled([
        fetch(`/api/pharmacy?${params}`).then(r => r.json()),
        fetch('/api/pharmacy?action=prescriptions').then(r => r.json()),
        fetch('/api/patients?limit=50').then(r => r.json()),
      ]);
      if (medRes.status === 'fulfilled' && medRes.value) setMedicines(medRes.value.data || medRes.value);
      if (rxRes.status === 'fulfilled' && rxRes.value) setPrescriptions(rxRes.value.data || rxRes.value);
      if (patRes.status === 'fulfilled' && patRes.value) setPatients(patRes.value.data || patRes.value);
    } catch {}
    finally { setLoading(false); }
  }, [search, lowOnly, expiringOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const lowStockCount = medicines.filter(m => m.stock <= m.minStock).length;
  const expiringCount = medicines.filter(m => { if (!m.expiryDate) return false; const exp = new Date(m.expiryDate); const threeMonths = new Date(); threeMonths.setMonth(threeMonths.getMonth() + 3); return exp <= threeMonths; }).length;

  const handleSaveMedicine = async () => {
    try {
      const isEdit = !!selectedMed;
      const res = await fetch(isEdit ? `/api/pharmacy?id=${selectedMed!.id}` : '/api/pharmacy', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock), minStock: Number(form.minStock), isActive: form.isActive === 'true' }),
      });
      if (res.ok) { toast.success(t('saved')); setDialogOpen(false); setSelectedMed(null); setForm({ name: '', nameFa: '', category: '', manufacturer: '', dosageForm: 'tablet', strength: '', price: '', stock: '', minStock: '10', expiryDate: '', batchNumber: '', isActive: 'true' }); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const handleEditMedicine = (med: Medicine) => {
    setSelectedMed(med);
    setForm({ name: med.name, nameFa: med.nameFa || '', category: med.category || '', manufacturer: med.manufacturer || '', dosageForm: med.dosageForm || 'tablet', strength: med.strength || '', price: String(med.price), stock: String(med.stock), minStock: String(med.minStock), expiryDate: med.expiryDate?.split('T')[0] || '', batchNumber: med.batchNumber || '', isActive: String(med.isActive) });
    setDialogOpen(true);
  };

  const handleDeleteMedicine = async (id: string) => {
    try {
      const res = await fetch(`/api/pharmacy?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success(t('deleted')); setDeleteConfirmOpen(false); setDeleteTarget(null); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const addRxItem = () => setRxItems([...rxItems, { medicineId: '', dosage: '', frequency: 'daily', duration: '7_days', quantity: 1, unitPrice: 0 }]);
  const updateRxItem = (i: number, f: string, v: any) => { const u = [...rxItems]; (u[i] as any)[f] = v; setRxItems(u); };
  const removeRxItem = (i: number) => setRxItems(rxItems.filter((_, idx) => idx !== i));

  const handleSaveRx = async () => {
    if (!rxForm.patientId) { toast.error('Select a patient'); return; }
    try {
      const res = await fetch('/api/pharmacy?action=prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: rxForm.patientId, doctorId: rxForm.doctorId || undefined, notes: rxForm.notes || undefined, items: rxItems }),
      });
      if (res.ok) { toast.success(t('saved')); setRxDialogOpen(false); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const getStockColor = (m: Medicine) => m.stock <= m.minStock ? 'text-red-600 bg-red-50 dark:bg-red-950/30' : m.stock <= m.minStock * 1.5 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30';

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      {/* Alerts */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
          {lowStockCount > 0 && <Card className="border-amber-300 dark:border-amber-700"><CardContent className="p-3 flex items-center gap-3"><AlertTriangle className="size-5 text-amber-600" /><div><p className="font-medium text-sm text-amber-700 dark:text-amber-400">{lowStockCount} {t('low_stock_medicines')}</p></div></CardContent></Card>}
          {expiringCount > 0 && <Card className="border-red-300 dark:border-red-700"><CardContent className="p-3 flex items-center gap-3"><AlertCircle className="size-5 text-red-600" /><div><p className="font-medium text-sm text-red-700 dark:text-red-400">{expiringCount} {t('expiring_medicines_label')}</p></div></CardContent></Card>}
        </motion.div>
      )}

      <Tabs defaultValue="inventory">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList><TabsTrigger value="inventory"><Package className="size-4" />{t('pharmacy')}</TabsTrigger><TabsTrigger value="prescriptions"><FileText className="size-4" />{t('prescriptions')}</TabsTrigger></TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setRxDialogOpen(true); }}><FileText className="size-4" />{t('new_prescription')}</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setDialogOpen(true)}><Plus className="size-4" />{t('add')}</Button>
          </div>
        </div>

        <TabsContent value="inventory" className="space-y-4 mt-4">
          <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48"><Search className={`absolute top-2.5 size-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} /><Input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className={isRTL ? 'pr-9' : 'pl-9'} /></div>
            <Button variant={lowOnly ? 'default' : 'outline'} size="sm" onClick={() => setLowOnly(!lowOnly)} className={lowOnly ? 'bg-amber-600' : ''}><AlertTriangle className="size-4" />{t('low_stock_label')}</Button>
            <Button variant={expiringOnly ? 'default' : 'outline'} size="sm" onClick={() => setExpiringOnly(!expiringOnly)} className={expiringOnly ? 'bg-red-600' : ''}><CalendarDays className="size-4" />{t('expiry_alert')}</Button>
          </motion.div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start font-medium">{t('name')}</th><th className="p-3 text-start font-medium">{t('category')}</th><th className="p-3 text-start font-medium">{t('price')}</th><th className="p-3 text-start font-medium">{t('stock')}</th><th className="p-3 text-start font-medium">{t('min_stock')}</th><th className="p-3 text-start font-medium">{t('expiry_date')}</th><th className="p-3 text-start font-medium">{t('actions')}</th></tr></thead>
                <tbody>
                  {medicines.map((med) => (
                    <tr key={med.id} className="border-b hover:bg-muted/30">
                      <td className="p-3"><div><p className="font-medium">{med.name}</p>{med.nameFa && <p className="text-xs text-muted-foreground">{med.nameFa}</p>}</div></td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{med.category || '-'}</Badge></td>
                      <td className="p-3">{Number(med.price).toLocaleString()}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStockColor(med)}`}>{med.stock}</span></td>
                      <td className="p-3 text-muted-foreground">{med.minStock}</td>
                      <td className="p-3 text-xs">{med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : '-'}</td>
                      <td className="p-3"><div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => handleEditMedicine(med)}><Edit className="size-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => { setDeleteTarget(med.id); setDeleteConfirmOpen(true); }}><Trash2 className="size-3.5" /></Button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {medicines.length === 0 && <div className="py-12 text-center text-muted-foreground"><Pill className="size-10 mx-auto mb-2 opacity-30" /><p>{t('no_data')}</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prescriptions" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start font-medium">{t('date')}</th><th className="p-3 text-start font-medium">{t('patient')}</th><th className="p-3 text-start font-medium">{t('doctor')}</th><th className="p-3 text-start font-medium">{t('total')}</th><th className="p-3 text-start font-medium">{t('status')}</th></tr></thead>
                <tbody>
                  {prescriptions.map((rx) => (
                    <tr key={rx.id} className="border-b hover:bg-muted/30">
                      <td className="p-3">{new Date(rx.date).toLocaleDateString()}</td>
                      <td className="p-3">{rx.patient ? `${rx.patient.firstName} ${rx.patient.lastName}` : '-'}</td>
                      <td className="p-3">{rx.doctor ? `${rx.doctor.firstName} ${rx.doctor.lastName}` : '-'}</td>
                      <td className="p-3 font-medium">{Number(rx.total).toLocaleString()}</td>
                      <td className="p-3"><StatusBadge status={rx.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {prescriptions.length === 0 && <div className="py-12 text-center text-muted-foreground"><FileText className="size-10 mx-auto mb-2 opacity-30" /><p>{t('no_data')}</p></div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Medicine Dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) setSelectedMed(null); }}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{selectedMed ? t('edit') : t('add')} {t('medicine_label')}</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3"><div><Label>{t('name')} (EN)</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label>{t('name')} (FA)</Label><Input value={form.nameFa} onChange={e => setForm({ ...form, nameFa: e.target.value })} /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>{t('category')}</Label><Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div><div><Label>{t('manufacturer')}</Label><Input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} /></div></div>
            <div className="grid grid-cols-3 gap-3"><div><Label>{t('dosage')}</Label><Select value={form.dosageForm} onValueChange={v => setForm({ ...form, dosageForm: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['tablet','capsule','syrup','injection','cream','drops'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div><div><Label>{isRTL ? 'قدرت' : 'Strength'}</Label><Input value={form.strength} onChange={e => setForm({ ...form, strength: e.target.value })} placeholder="500mg" /></div><div><Label>{t('batch_number')}</Label><Input value={form.batchNumber} onChange={e => setForm({ ...form, batchNumber: e.target.value })} /></div></div>
            <div className="grid grid-cols-3 gap-3"><div><Label>{t('price')}</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div><div><Label>{t('stock')}</Label><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div><div><Label>{t('min_stock')}</Label><Input type="number" value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} /></div></div>
            <div><Label>{t('expiry_date')}</Label><Input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} /></div>
            <Button onClick={handleSaveMedicine} className="bg-emerald-600 hover:bg-emerald-700">{t('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Prescription Dialog */}
      <Dialog open={rxDialogOpen} onOpenChange={setRxDialogOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{t('new_prescription')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('patient')}</Label><Select value={rxForm.patientId} onValueChange={v => setRxForm({ ...rxForm, patientId: v })}><SelectTrigger><SelectValue placeholder={t('select_patient')} /></SelectTrigger><SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('notes')}</Label><Input value={rxForm.notes} onChange={e => setRxForm({ ...rxForm, notes: e.target.value })} /></div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center"><Label>{t('medicines_label')}</Label><Button size="sm" variant="outline" onClick={addRxItem}><Plus className="size-3" />{t('add')}</Button></div>
              {rxItems.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-3"><Label className="text-xs">{t('medicine_label')}</Label><Select value={item.medicineId} onValueChange={v => { updateRxItem(i, 'medicineId', v); const med = medicines.find(m => m.id === v); if (med) updateRxItem(i, 'unitPrice', med.price); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{medicines.filter(m => m.isActive).map(m => <SelectItem key={m.id} value={m.id}>{m.name}{m.nameFa ? ` (${m.nameFa})` : ''}</SelectItem>)}</SelectContent></Select></div>
                  <div className="col-span-2"><Label className="text-xs">{t('dosage')}</Label><Input value={item.dosage} onChange={e => updateRxItem(i, 'dosage', e.target.value)} placeholder="1 tab" /></div>
                  <div className="col-span-2"><Label className="text-xs">{t('frequency')}</Label><Select value={item.frequency} onValueChange={v => updateRxItem(i, 'frequency', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['daily','twice','three_times','four_times'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
                  <div className="col-span-2"><Label className="text-xs">{t('duration')}</Label><Select value={item.duration} onValueChange={v => updateRxItem(i, 'duration', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['3_days','1_week','2_weeks','1_month'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
                  <div className="col-span-2"><Label className="text-xs">{t('quantity')}</Label><Input type="number" value={item.quantity} onChange={e => updateRxItem(i, 'quantity', Number(e.target.value))} /></div>
                  <div className="col-span-1 flex items-end"><Button size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => removeRxItem(i)}><Trash2 className="size-4" /></Button></div>
                </div>
              ))}
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveRx}>{t('save_prescription')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }}
        onConfirm={() => deleteTarget && handleDeleteMedicine(deleteTarget)}
        title={t('delete')}
        description={t('are_you_sure_delete')}
        confirmLabel={t('delete')}
        variant="danger"
      />
    </motion.div>
  );
}

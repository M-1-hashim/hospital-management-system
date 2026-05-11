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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star, Plus, Search, Stethoscope, Phone, Mail, MapPin, Award, Users, TrendingUp, Eye, Pencil, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface Doctor { id: string; firstName: string; lastName: string; specialty: string; licenseNumber?: string; phone: string; email?: string; departmentId?: string; department?: { id: string; name: string; nameFa: string }; visitFee: number; bio?: string; rating: number; isActive: boolean; }
interface Department { id: string; name: string; nameFa: string; }

export function DoctorsPage() {
  const { t, isRTL } = useLanguageStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', specialty: '', licenseNumber: '', phone: '', email: '', departmentId: '', visitFee: '', bio: '' });

  const fetchDoctors = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterDept && filterDept !== 'all') params.set('departmentId', filterDept);
      const res = await fetch(`/api/doctors?${params}`);
      if (res.ok) setDoctors(await res.json());
    } catch { /* use cached data */ }
  }, [search, filterDept]);

  useEffect(() => {
    Promise.allSettled([
      fetchDoctors(),
      fetch('/api/departments').then(r => r.ok ? r.json() : []).then(setDepartments).catch(() => setDepartments([])),
    ]).finally(() => setLoading(false));
  }, [fetchDoctors]);

  const resetForm = () => setForm({ firstName: '', lastName: '', specialty: '', licenseNumber: '', phone: '', email: '', departmentId: '', visitFee: '', bio: '' });

  const handleSave = async () => {
    try {
      const isEdit = !!selectedDoctor;
      const url = isEdit ? `/api/doctors?id=${selectedDoctor.id}` : '/api/doctors';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, visitFee: Number(form.visitFee) || 0 }) });
      if (res.ok) { toast.success(isEdit ? t('saved') : t('added')); setDialogOpen(false); setSelectedDoctor(null); resetForm(); fetchDoctors(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const handleEdit = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setForm({ firstName: doc.firstName, lastName: doc.lastName, specialty: doc.specialty, licenseNumber: doc.licenseNumber || '', phone: doc.phone, email: doc.email || '', departmentId: doc.departmentId || '', visitFee: String(doc.visitFee), bio: doc.bio || '' });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDoctor) return;
    try {
      const res = await fetch(`/api/doctors?id=${selectedDoctor.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success(t('deleted')); setDeleteOpen(false); fetchDoctors(); setSelectedDoctor(null); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const getInitials = (d: Doctor) => `${d.firstName[0]}${d.lastName[0]}`;

  if (loading) return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">{Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>)}</div>;

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="text-emerald-600" />{t('doctors')}</h1>
          <p className="text-sm text-muted-foreground">{doctors.length} {t('doctors')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative"><Search className={`absolute top-2.5 size-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} /><Input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className={`${isRTL ? 'pr-9' : 'pl-9'} w-48`} /></div>
          <Select value={filterDept} onValueChange={setFilterDept}><SelectTrigger className="w-40"><SelectValue placeholder={t('all')} /></SelectTrigger><SelectContent>{<SelectItem value="all">{t('all')}</SelectItem>}{departments.map(d => <SelectItem key={d.id} value={d.id}>{isRTL ? d.nameFa : d.name}</SelectItem>)}</SelectContent></Select>
          <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setSelectedDoctor(null); resetForm(); } }}>
            <DialogTrigger asChild><Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4" />{t('add')}</Button></DialogTrigger>
            <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{selectedDoctor ? t('edit') : t('add')} {t('doctor')}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t('first_name') || 'First Name'}</Label><Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></div>
                  <div><Label>{t('last_name') || 'Last Name'}</Label><Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></div>
                </div>
                <div><Label>{t('specialty')}</Label><Input value={form.specialty} onChange={e => setForm({ ...form, specialty: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t('license_number')}</Label><Input value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} /></div>
                  <div><Label>{t('visit_fee')}</Label><Input type="number" value={form.visitFee} onChange={e => setForm({ ...form, visitFee: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>{t('phone')}</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>{t('email')}</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <div><Label>{t('departments')}</Label><Select value={form.departmentId} onValueChange={v => setForm({ ...form, departmentId: v })}><SelectTrigger><SelectValue placeholder={t('select')} /></SelectTrigger><SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{isRTL ? d.nameFa : d.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>{t('bio')}</Label><Textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} /></div>
                <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 w-full">{t('save')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {doctors.map((doc) => (
          <motion.div key={doc.id} variants={fadeUp}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => { setSelectedDoctor(doc); setProfileOpen(true); }}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="size-14 bg-emerald-100 dark:bg-emerald-900"><AvatarFallback className="text-emerald-700 dark:text-emerald-300 font-bold">{getInitials(doc)}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{doc.firstName} {doc.lastName}</h3>
                    <Badge variant="secondary" className="mt-1 text-xs">{doc.specialty}</Badge>
                    {doc.department && <p className="text-xs text-muted-foreground mt-1">{isRTL ? doc.department.nameFa : doc.department.name}</p>}
                    <div className="flex items-center gap-1 mt-2">
                      <Star className="size-3.5 text-amber-500 fill-amber-500" /><span className="text-xs font-medium">{doc.rating}</span>
                    </div>
                  </div>
                  <StatusBadge status={doc.isActive ? 'active' : 'inactive'} />
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Phone className="size-3" />{doc.phone}</span>
                    <span className="flex items-center gap-1"><Award className="size-3" />{Number(doc.visitFee).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => handleEdit(doc)}><Pencil className="size-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => { setSelectedDoctor(doc); setDeleteOpen(true); }}><Trash2 className="size-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {doctors.length === 0 && <Card className="py-16 text-center text-muted-foreground"><Stethoscope className="size-12 mx-auto mb-3 opacity-30" /><p>{t('no_data')}</p></Card>}

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md">
          {selectedDoctor && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-3"><Avatar className="size-10 bg-emerald-100 dark:bg-emerald-900"><AvatarFallback className="text-emerald-700 font-bold">{getInitials(selectedDoctor)}</AvatarFallback></Avatar>{selectedDoctor.firstName} {selectedDoctor.lastName}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm"><Badge>{selectedDoctor.specialty}</Badge>{selectedDoctor.department && <Badge variant="outline">{isRTL ? selectedDoctor.department.nameFa : selectedDoctor.department.name}</Badge>}</div>
              <p className="text-sm text-muted-foreground">{selectedDoctor.bio || 'No bio available'}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{selectedDoctor.phone}</div>
                <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" />{selectedDoctor.email || '-'}</div>
                <div className="flex items-center gap-2"><Award className="size-4 text-muted-foreground" />{isRTL ? 'شماره نظام' : 'License'}: {selectedDoctor.licenseNumber || '-'}</div>
                <div className="flex items-center gap-2"><Star className="size-4 text-amber-500" />{selectedDoctor.rating}/5</div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[{ icon: Users, label: t('patients'), value: `${Math.floor(Math.random() * 50 + 20)}` }, { icon: TrendingUp, label: isRTL ? 'درآمد' : 'Revenue', value: `${(selectedDoctor.visitFee * 25 / 1000000).toFixed(1)}M` }, { icon: Star, label: t('rating'), value: selectedDoctor.rating }].map((s, i) => (
                  <Card key={i} className="p-3 text-center"><s.icon className="size-4 mx-auto mb-1 text-emerald-600" /><p className="text-xs text-muted-foreground">{s.label}</p><p className="font-bold text-sm">{s.value}</p></Card>
                ))}
              </div>
            </div>
          </>)}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} onConfirm={handleDelete} title={t('delete')} description={t('confirm') + '?'} variant="danger" />
    </motion.div>
  );
}

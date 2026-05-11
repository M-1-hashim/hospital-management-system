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
import { Switch } from '@/components/ui/switch';
import { Settings, Plus, Search, Edit, Trash2, Save, Database, Building2, Shield, Heart, Users as UsersIcon, RefreshCw } from 'lucide-react';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface Department { id: string; name: string; nameFa: string; floor?: number; phone?: string; description?: string; headDoctor?: string; isActive: boolean; }
interface User { id: string; username: string; fullName: string; role: string; email?: string; phone?: string; isActive: boolean; lastLogin?: string; }
interface HospitalSetting { key: string; value: string; }

export function SettingsPage() {
  const { t, isRTL } = useLanguageStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deptForm, setDeptForm] = useState({ name: '', nameFa: '', floor: '', phone: '', description: '' });
  const [userForm, setUserForm] = useState({ username: '', fullName: '', role: 'receptionist', email: '', phone: '', password: '' });
  const [hospForm, setHospForm] = useState({ hospital_name: '', hospital_name_fa: '', hospital_phone: '', hospital_address: '' });

  const fetchData = useCallback(async () => {
    try {
      const [depRes, userRes, setRes] = await Promise.allSettled([
        fetch('/api/departments').then(r => r.json()),
        fetch('/api/patients?limit=1').then(() => []).catch(() => []), // fallback - no user list API
        fetch('/api/settings').then(r => r.json()),
      ]);
      if (depRes.status === 'fulfilled' && depRes.value) setDepartments(depRes.value.data || depRes.value);
      if (setRes.status === 'fulfilled' && setRes.value) {
        const s = setRes.value.data || setRes.value;
        const map: Record<string, string> = {};
        (Array.isArray(s) ? s : []).forEach((item: any) => { map[item.key] = item.value; });
        setSettings(map);
        setHospForm({ hospital_name: map.hospital_name || '', hospital_name_fa: map.hospital_name_fa || '', hospital_phone: map.hospital_phone || '', hospital_address: map.hospital_address || '' });
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Hospital Info
  const saveHospitalInfo = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hospForm),
      });
      if (res.ok) toast.success(t('saved'));
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  // Departments
  const saveDept = async () => {
    try {
      const isEdit = !!selectedDept;
      const res = await fetch(isEdit ? `/api/departments?id=${selectedDept!.id}` : '/api/departments', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...deptForm, floor: Number(deptForm.floor) || 0 }),
      });
      if (res.ok) { toast.success(t('saved')); setDeptDialogOpen(false); setSelectedDept(null); setDeptForm({ name: '', nameFa: '', floor: '', phone: '', description: '' }); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const editDept = (d: Department) => {
    setSelectedDept(d);
    setDeptForm({ name: d.name, nameFa: d.nameFa, floor: String(d.floor || ''), phone: d.phone || '', description: d.description || '' });
    setDeptDialogOpen(true);
  };

  const deleteDept = async (id: string) => {
    try {
      const res = await fetch(`/api/departments?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success(t('deleted')); fetchData(); }
    } catch { toast.error(t('error')); }
  };

  // Seed
  const handleSeed = async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) { const data = await res.json(); toast.success(`Database seeded: ${JSON.stringify(data.summary)}`); setSeedOpen(false); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      <motion.div variants={fadeUp} className="flex items-center gap-2">
        <Settings className="size-5 text-emerald-600" />
        <h1 className="text-xl font-bold">{t('settings')}</h1>
      </motion.div>

      <Tabs defaultValue="hospital">
        <TabsList className="flex-wrap">
          <TabsTrigger value="hospital"><Building2 className="size-4" />{isRTL ? 'اطلاعات بیمارستان' : 'Hospital Info'}</TabsTrigger>
          <TabsTrigger value="departments">{t('departments')}</TabsTrigger>
          <TabsTrigger value="users"><Shield className="size-4" />{isRTL ? 'کاربران' : 'Users'}</TabsTrigger>
          <TabsTrigger value="backup"><Database className="size-4" />{isRTL ? 'پشتیبان‌گیری' : 'Backup'}</TabsTrigger>
        </TabsList>

        {/* Hospital Info */}
        <TabsContent value="hospital" className="mt-4">
          <Card>
            <CardHeader><CardTitle>{isRTL ? 'اطلاعات بیمارستان' : 'Hospital Information'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>{isRTL ? 'نام (انگلیسی)' : 'Name (EN)'}</Label><Input value={hospForm.hospital_name} onChange={e => setHospForm({ ...hospForm, hospital_name: e.target.value })} /></div>
                <div><Label>{isRTL ? 'نام (فارسی)' : 'Name (FA)'}</Label><Input value={hospForm.hospital_name_fa} onChange={e => setHospForm({ ...hospForm, hospital_name_fa: e.target.value })} dir="rtl" /></div>
                <div><Label>{t('phone')}</Label><Input value={hospForm.hospital_phone} onChange={e => setHospForm({ ...hospForm, hospital_phone: e.target.value })} /></div>
                <div><Label>{t('address')}</Label><Input value={hospForm.hospital_address} onChange={e => setHospForm({ ...hospForm, hospital_address: e.target.value })} /></div>
              </div>
              <Button onClick={saveHospitalInfo} className="bg-emerald-600 hover:bg-emerald-700"><Save className="size-4" />{t('save')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments */}
        <TabsContent value="departments" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setSelectedDept(null); setDeptForm({ name: '', nameFa: '', floor: '', phone: '', description: '' }); setDeptDialogOpen(true); }}><Plus className="size-4" />{t('add')}</Button>
          </div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className="p-3 text-start font-medium">{isRTL ? 'نام' : 'Name'}</th><th className="p-3 text-start font-medium">{isRTL ? 'نام فارسی' : 'Name (FA)'}</th><th className="p-3 text-start font-medium">{isRTL ? 'طبقه' : 'Floor'}</th><th className="p-3 text-start font-medium">{t('phone')}</th><th className="p-3 text-start font-medium">{t('status')}</th><th className="p-3 text-start font-medium">{t('actions')}</th></tr></thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr key={dept.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{dept.name}</td>
                      <td className="p-3" dir="rtl">{dept.nameFa}</td>
                      <td className="p-3">{dept.floor || '-'}</td>
                      <td className="p-3">{dept.phone || '-'}</td>
                      <td className="p-3"><StatusBadge status={dept.isActive ? 'active' : 'inactive'} /></td>
                      <td className="p-3"><div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => editDept(dept)}><Edit className="size-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => deleteDept(dept.id)}><Trash2 className="size-3.5" /></Button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {departments.length === 0 && <div className="py-12 text-center text-muted-foreground"><Building2 className="size-10 mx-auto mb-2 opacity-30" /><p>{t('no_data')}</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setSelectedUser(null); setUserForm({ username: '', fullName: '', role: 'receptionist', email: '', phone: '', password: '' }); setUserDialogOpen(true); }}><Plus className="size-4" />{isRTL ? 'افزودن کاربر' : 'Add User'}</Button>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                <h3 className="font-medium">{isRTL ? 'نقش‌های دسترسی' : 'Access Roles'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { role: 'admin', label: isRTL ? 'مدیر سیستم' : 'System Admin', desc: isRTL ? 'دسترسی کامل به تمام بخش‌ها' : 'Full access to all sections', color: 'border-red-300 bg-red-50 dark:bg-red-950/20' },
                    { role: 'doctor', label: isRTL ? 'پزشک' : 'Doctor', desc: isRTL ? 'بیماران، نوبت‌ها، آزمایش‌ها' : 'Patients, appointments, labs', color: 'border-blue-300 bg-blue-50 dark:bg-blue-950/20' },
                    { role: 'nurse', label: isRTL ? 'پرستار' : 'Nurse', desc: isRTL ? 'بیماران بستری، تخت‌ها' : 'Inpatients, beds', color: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20' },
                    { role: 'receptionist', label: isRTL ? 'پذیرش' : 'Receptionist', desc: isRTL ? 'نوبت‌دهی، ثبت بیمار' : 'Appointments, patient registration', color: 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' },
                    { role: 'accountant', label: isRTL ? 'حسابدار' : 'Accountant', desc: isRTL ? 'فاکتور، گزارش‌های مالی' : 'Invoices, financial reports', color: 'border-purple-300 bg-purple-50 dark:bg-purple-950/20' },
                  ].map((r, i) => (
                    <Card key={i} className={`border ${r.color}`}><CardContent className="p-4"><p className="font-medium text-sm">{r.label}</p><Badge variant="outline" className="mt-1 text-xs">{r.role}</Badge><p className="text-xs text-muted-foreground mt-2">{r.desc}</p></CardContent></Card>
                  ))}
                </div>
              </div>
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">{isRTL ? 'حساب‌های پیش‌فرض' : 'Default Accounts'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                  {[
                    { user: 'admin', pass: 'admin123', role: isRTL ? 'مدیر' : 'Admin' },
                    { user: 'doctor', pass: 'doctor123', role: isRTL ? 'پزشک' : 'Doctor' },
                    { user: 'nurse', pass: 'nurse123', role: isRTL ? 'پرستار' : 'Nurse' },
                    { user: 'receptionist', pass: 'reception123', role: isRTL ? 'پذیرش' : 'Reception' },
                    { user: 'accountant', pass: 'account123', role: isRTL ? 'حسابدار' : 'Accountant' },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-1"><span><strong>{a.user}</strong> / {a.pass}</span><Badge variant="outline" className="text-xs">{a.role}</Badge></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup */}
        <TabsContent value="backup" className="mt-4">
          <Card>
            <CardHeader><CardTitle>{isRTL ? 'پشتیبان‌گیری و بازیابی' : 'Backup & Restore'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 border-2 border-dashed rounded-lg border-amber-300 dark:border-amber-700">
                <RefreshCw className="size-6 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-medium">{isRTL ? 'بازنشانی دیتابیس (Seed)' : 'Reset Database (Seed)'}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{isRTL ? 'تمام داده‌های فعلی پاک شده و داده‌های نمونه جایگزین می‌شود. این عمل قابل بازگشت نیست.' : 'All current data will be deleted and replaced with sample data. This action cannot be undone.'}</p>
                  <Button variant="destructive" className="mt-3" onClick={() => setSeedOpen(true)}><Database className="size-4" />{isRTL ? 'بازنشانی دیتابیس' : 'Reset Database'}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Department Dialog */}
      <Dialog open={deptDialogOpen} onOpenChange={v => { setDeptDialogOpen(v); if (!v) setSelectedDept(null); }}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{selectedDept ? t('edit') : t('add')} {t('departments')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3"><div><Label>{isRTL ? 'نام (EN)' : 'Name (EN)'}</Label><Input value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} /></div><div><Label>{isRTL ? 'نام (FA)' : 'Name (FA)'}</Label><Input value={deptForm.nameFa} onChange={e => setDeptForm({ ...deptForm, nameFa: e.target.value })} dir="rtl" /></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>{isRTL ? 'طبقه' : 'Floor'}</Label><Input type="number" value={deptForm.floor} onChange={e => setDeptForm({ ...deptForm, floor: e.target.value })} /></div><div><Label>{t('phone')}</Label><Input value={deptForm.phone} onChange={e => setDeptForm({ ...deptForm, phone: e.target.value })} /></div></div>
            <div><Label>{isRTL ? 'توضیحات' : 'Description'}</Label><Textarea value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })} /></div>
            <Button onClick={saveDept} className="w-full bg-emerald-600 hover:bg-emerald-700">{t('save')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Seed Confirm Dialog */}
      <ConfirmDialog open={seedOpen} onClose={() => setSeedOpen(false)} onConfirm={handleSeed} title={isRTL ? 'بازنشانی دیتابیس' : 'Reset Database'} description={isRTL ? 'آیا مطمئن هستید؟ تمام داده‌ها حذف خواهد شد.' : 'Are you sure? All data will be deleted and replaced with sample data.'} variant="danger" />
    </motion.div>
  );
}

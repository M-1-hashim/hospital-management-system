'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguageStore } from '@/store';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Star, Plus, Search, Stethoscope, Phone, Mail, Award,
  Users, TrendingUp, Pencil, Trash2, LayoutGrid, List,
  Building2, UserCheck,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import { StatsCard } from '@/components/hms/shared/StatsCard';
import { EmptyState } from '@/components/hms/shared/EmptyState';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  licenseNumber?: string;
  phone: string;
  email?: string;
  departmentId?: string;
  department?: { id: string; name: string; nameFa: string };
  visitFee: number;
  bio?: string;
  rating: number;
  isActive: boolean;
}

interface Department {
  id: string;
  name: string;
  nameFa: string;
}

export function DoctorsPage() {
  const { t, isRTL } = useLanguageStore();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    specialty: '',
    licenseNumber: '',
    phone: '',
    email: '',
    departmentId: '',
    visitFee: '',
    bio: '',
  });

  const fetchDoctors = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterDept && filterDept !== 'all') params.set('departmentId', filterDept);
    const res = await fetch(`/api/doctors?${params}`);
    if (res.ok) return await res.json();
    return [];
  }, [search, filterDept]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [docResult, deptResult] = await Promise.allSettled([
        fetchDoctors(),
        fetch('/api/departments')
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ]);
      if (!cancelled) {
        if (docResult.status === 'fulfilled' && docResult.value) setDoctors(docResult.value);
        if (deptResult.status === 'fulfilled' && deptResult.value) setDepartments(deptResult.value);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [fetchDoctors]);

  const resetForm = () =>
    setForm({
      firstName: '',
      lastName: '',
      specialty: '',
      licenseNumber: '',
      phone: '',
      email: '',
      departmentId: '',
      visitFee: '',
      bio: '',
    });

  const handleSave = async () => {
    try {
      const isEdit = !!selectedDoctor;
      const url = isEdit ? `/api/doctors?id=${selectedDoctor.id}` : '/api/doctors';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, visitFee: Number(form.visitFee) || 0 }),
      });
      if (res.ok) {
        toast.success(isEdit ? t('saved') : t('added'));
        setDialogOpen(false);
        setSelectedDoctor(null);
        resetForm();
        fetchDoctors().then((data) => { if (data) setDoctors(data); });
      } else {
        toast.error(t('error'));
      }
    } catch {
      toast.error(t('error'));
    }
  };

  const handleEdit = (doc: Doctor) => {
    setSelectedDoctor(doc);
    setForm({
      firstName: doc.firstName,
      lastName: doc.lastName,
      specialty: doc.specialty,
      licenseNumber: doc.licenseNumber || '',
      phone: doc.phone,
      email: doc.email || '',
      departmentId: doc.departmentId || '',
      visitFee: String(doc.visitFee),
      bio: doc.bio || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDoctor) return;
    try {
      const res = await fetch(`/api/doctors?id=${selectedDoctor.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('deleted'));
        setDeleteOpen(false);
        fetchDoctors().then((data) => { if (data) setDoctors(data); });
        setSelectedDoctor(null);
      } else {
        toast.error(t('error'));
      }
    } catch {
      toast.error(t('error'));
    }
  };

  const getInitials = (d: Doctor) => `${d.firstName[0]}${d.lastName[0]}`;

  // Stats computation
  const stats = useMemo(() => {
    const total = doctors.length;
    const active = doctors.filter((d) => d.isActive).length;
    const deptCount = new Set(doctors.filter((d) => d.departmentId).map((d) => d.departmentId)).size;
    const avgRating = total > 0 ? (doctors.reduce((s, d) => s + d.rating, 0) / total).toFixed(1) : '0';
    return { total, active, deptCount, avgRating };
  }, [doctors]);

  if (loading) {
    return (
      <div className="space-y-6 p-4">
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-6"
    >
      {/* ─── Stats Row ─── */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <StatsCard
          title={t('total_doctors') || 'Total Doctors'}
          value={stats.total}
          icon={Stethoscope}
          color="green"
          index={0}
        />
        <StatsCard
          title={t('active') || 'Active'}
          value={stats.active}
          icon={UserCheck}
          color="blue"
          index={1}
        />
        <StatsCard
          title={t('departments') || 'Departments'}
          value={stats.deptCount}
          icon={Building2}
          color="purple"
          index={2}
        />
        <StatsCard
          title={t('avg_rating') || 'Avg Rating'}
          value={stats.avgRating}
          icon={Star}
          color="amber"
          index={3}
        />
      </motion.div>

      {/* ─── Header: Title + Search / Filter / View Toggle / Add ─── */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4">
        {/* Title row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Stethoscope className="text-emerald-600" />
              {t('doctors')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {stats.total} {t('doctors')} · {stats.active} {t('active')}
            </p>
          </div>
        </div>

        {/* Controls – stack on mobile, row on sm+ */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              className={`absolute top-2.5 size-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`}
            />
            <Input
              placeholder={t('search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${isRTL ? 'pr-9' : 'pl-9'} w-full`}
            />
          </div>

          {/* Department filter */}
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder={t('all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all')}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {isRTL ? d.nameFa : d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex items-center gap-1">
            <Button
              variant={view === 'grid' ? 'default' : 'outline'}
              size="icon"
              className="size-9"
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="icon"
              className="size-9"
              onClick={() => setView('list')}
            >
              <List className="size-4" />
            </Button>
          </div>

          {/* Add button */}
          <Dialog
            open={dialogOpen}
            onOpenChange={(v) => {
              setDialogOpen(v);
              if (!v) {
                setSelectedDoctor(null);
                resetForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                <Plus className="size-4" />
                {t('add')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
              <DialogHeader>
                <DialogTitle>
                  {selectedDoctor ? t('edit') : t('add')} {t('doctor')}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>{t('first_name') || 'First Name'}</Label>
                    <Input
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('last_name') || 'Last Name'}</Label>
                    <Input
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('specialty')}</Label>
                  <Input
                    value={form.specialty}
                    onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>{t('license_number')}</Label>
                    <Input
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('visit_fee')}</Label>
                    <Input
                      type="number"
                      value={form.visitFee}
                      onChange={(e) => setForm({ ...form, visitFee: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>{t('phone')}</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{t('email')}</Label>
                    <Input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>{t('departments')}</Label>
                  <Select
                    value={form.departmentId}
                    onValueChange={(v) => setForm({ ...form, departmentId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('select')} />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {isRTL ? d.nameFa : d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('bio')}</Label>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-700 w-full"
                >
                  {t('save')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* ─── Grid View ─── */}
      {view === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <motion.div key={doc.id} variants={fadeUp}>
              <Card
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => {
                  setSelectedDoctor(doc);
                  setProfileOpen(true);
                }}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="size-14 shrink-0 bg-emerald-100 dark:bg-emerald-900">
                      <AvatarFallback className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                        {getInitials(doc)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate">
                          {doc.firstName} {doc.lastName}
                        </h3>
                        <StatusBadge status={doc.isActive ? 'active' : 'inactive'} />
                      </div>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {doc.specialty}
                      </Badge>
                      {doc.department && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {isRTL ? doc.department.nameFa : doc.department.name}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="size-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-medium">{doc.rating}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="size-3" />
                        <span className="truncate max-w-24">{doc.phone}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="size-3" />
                        {Number(doc.visitFee).toLocaleString()}
                      </span>
                    </div>
                    <div
                      className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => handleEdit(doc)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setDeleteOpen(true);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* ─── List (Table) View ─── */}
      {view === 'list' && (
        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-start font-medium whitespace-nowrap">
                        {t('doctor')}
                      </th>
                      <th className="p-3 text-start font-medium whitespace-nowrap">
                        {t('specialty')}
                      </th>
                      <th className="p-3 text-start font-medium whitespace-nowrap">
                        {t('departments')}
                      </th>
                      <th className="p-3 text-start font-medium whitespace-nowrap">
                        {t('phone')}
                      </th>
                      <th className="p-3 text-start font-medium whitespace-nowrap">
                        {t('rating')}
                      </th>
                      <th className="p-3 text-start font-medium whitespace-nowrap">
                        {t('status')}
                      </th>
                      <th className="p-3 text-start font-medium whitespace-nowrap">
                        {t('visit_fee')}
                      </th>
                      <th className="p-3 text-start font-medium whitespace-nowrap">
                        {t('actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((doc) => (
                      <tr
                        key={doc.id}
                        className="border-b hover:bg-muted/30 cursor-pointer group"
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setProfileOpen(true);
                        }}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 shrink-0 bg-emerald-100 dark:bg-emerald-900">
                              <AvatarFallback className="text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                                {getInitials(doc)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium whitespace-nowrap">
                              {doc.firstName} {doc.lastName}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge variant="secondary" className="text-xs">
                            {doc.specialty}
                          </Badge>
                        </td>
                        <td className="p-3 whitespace-nowrap text-muted-foreground">
                          {doc.department
                            ? isRTL
                              ? doc.department.nameFa
                              : doc.department.name
                            : '-'}
                        </td>
                        <td className="p-3 whitespace-nowrap">{doc.phone}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Star className="size-3 text-amber-500 fill-amber-500" />
                            {doc.rating}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <StatusBadge status={doc.isActive ? 'active' : 'inactive'} />
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {Number(doc.visitFee).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div
                            className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7"
                              onClick={() => handleEdit(doc)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive"
                              onClick={() => {
                                setSelectedDoctor(doc);
                                setDeleteOpen(true);
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
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Empty State ─── */}
      {doctors.length === 0 && (
        <EmptyState
          icon={Stethoscope}
          title={t('no_data')}
          description={t('no_doctors_desc') || 'No doctors found. Add a new doctor to get started.'}
          actionLabel={t('add')}
          onAction={() => setDialogOpen(true)}
        />
      )}

      {/* ─── Profile Dialog ─── */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
          {selectedDoctor && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="size-10 bg-emerald-100 dark:bg-emerald-900 shrink-0">
                    <AvatarFallback className="text-emerald-700 font-bold">
                      {getInitials(selectedDoctor)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate">
                      {selectedDoctor.firstName} {selectedDoctor.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge
                        status={selectedDoctor.isActive ? 'active' : 'inactive'}
                      />
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge>{selectedDoctor.specialty}</Badge>
                  {selectedDoctor.department && (
                    <Badge variant="outline">
                      {isRTL
                        ? selectedDoctor.department.nameFa
                        : selectedDoctor.department.name}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedDoctor.bio || 'No bio available'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{selectedDoctor.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{selectedDoctor.email || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {isRTL ? 'شماره نظام' : 'License'}: {selectedDoctor.licenseNumber || '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="size-4 text-amber-500 shrink-0" />
                    <span>{selectedDoctor.rating}/5</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[
                    {
                      icon: Users,
                      label: t('patients'),
                      value: `${
                        selectedDoctor.id
                          ? selectedDoctor.id.charCodeAt(0) % 40 + 10
                          : '—'
                      }`,
                    },
                    {
                      icon: TrendingUp,
                      label: isRTL ? 'درآمد' : 'Revenue',
                      value: `${(selectedDoctor.visitFee * 25 / 1000000).toFixed(1)}M`,
                    },
                    {
                      icon: Star,
                      label: t('rating'),
                      value: selectedDoctor.rating,
                    },
                  ].map((s, i) => (
                    <Card key={i} className="p-3 text-center">
                      <s.icon className="size-4 mx-auto mb-1 text-emerald-600" />
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <p className="font-bold text-sm">{s.value}</p>
                    </Card>
                  ))}
                </div>
                {/* Action buttons in profile */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setProfileOpen(false);
                      handleEdit(selectedDoctor);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    {t('edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setProfileOpen(false);
                      setSelectedDoctor(selectedDoctor);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    {t('delete')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t('delete')}
        description={
          selectedDoctor
            ? `${t('confirm')} ${selectedDoctor.firstName} ${selectedDoctor.lastName}?`
            : t('confirm') + '?'
        }
        variant="danger"
      />
    </motion.div>
  );
}

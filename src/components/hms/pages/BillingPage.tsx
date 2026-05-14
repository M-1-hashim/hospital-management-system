'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLanguageStore } from '@/store';
import { apiFetch, apiPost, apiPut } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Receipt, Plus, Search, Printer, Eye, Trash2, DollarSign,
  CreditCard, TrendingUp, AlertCircle, CalendarDays, User,
  FileDown, Send, Shield, Clock, Loader2,
} from 'lucide-react';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { EmptyState } from '@/components/hms/shared/EmptyState';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import { CollapsiblePanel } from '@/components/hms/shared/CollapsiblePanel';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface InvoiceItem {
  id?: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  paidAmount: number;
  dueDate: string | null;
  notes: string | null;
  createdAt: string;
  patient?: { firstName: string; lastName: string; insuranceCompany?: string | null; insuranceId?: string | null };
  items?: InvoiceItem[];
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  referenceNumber: string | null;
  status: string;
  paidAt: string;
  receivedBy: string | null;
  notes: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    total: number;
    paymentStatus: string;
    patient?: { id: string; firstName: string; lastName: string };
  };
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'cash' },
  { value: 'card', label: 'card' },
  { value: 'insurance', label: 'insurance_payment' },
  { value: 'installment', label: 'installment' },
  { value: 'mixed', label: 'mixed_payment' },
] as const;

export function BillingPage() {
  const { t, isRTL } = useLanguageStore();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [form, setForm] = useState({ patientId: '', discount: 0, tax: 0, paymentMethod: 'cash' });
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', type: 'service', quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // ─── Payment state ────────────────────────────────────────
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [invoicePayments, setInvoicePayments] = useState<PaymentRecord[]>([]);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', referenceNumber: '', notes: '' });
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // ─── Chart state ──────────────────────────────────────────
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<any[]>([]);
  const [dailyRevenueData, setDailyRevenueData] = useState<any[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);

  // ─── Installments / Overdue state ─────────────────────────
  const [overdueInvoices, setOverdueInvoices] = useState<any[]>([]);
  const [installmentsLoading, setInstallmentsLoading] = useState(false);

  /* ─── Data fetching ─── */
  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);

      const [invRes, statRes, patRes] = await Promise.allSettled([
        apiFetch(`/api/billing?${params}`).catch(() => null),
        apiFetch('/api/billing?stats=true').catch(() => null),
        apiFetch('/api/patients?limit=50').catch(() => null),
      ]);
      if (invRes.status === 'fulfilled' && invRes.value) {
        const invData = invRes.value;
        setInvoices(Array.isArray(invData.invoices) ? invData.invoices : (Array.isArray(invData.data) ? invData.data : (Array.isArray(invData) ? invData : [])));
      }
      if (statRes.status === 'fulfilled' && statRes.value) {
        const s = statRes.value;
        setStats({
          todayRevenue: s.todayIncome || 0,
          monthlyRevenue: s.monthIncome || 0,
          unpaidInvoices: s.totalUnpaid || 0,
          paidInvoices: s.totalPaid || 0,
        });
      }
      if (patRes.status === 'fulfilled' && patRes.value) {
        const patData = patRes.value;
        setPatients(Array.isArray(patData.patients) ? patData.patients : (Array.isArray(patData.data) ? patData.data : (Array.isArray(patData) ? patData : [])));
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── Fetch chart data ─── */
  const fetchChartData = useCallback(async () => {
    try {
      setChartsLoading(true);
      const [monthlyRes, dailyRes, methodsRes] = await Promise.allSettled([
        apiFetch('/api/reports?type=monthlyRevenue').catch(() => null),
        apiFetch('/api/reports?type=dailyRevenue').catch(() => null),
        apiFetch('/api/reports?type=paymentMethods').catch(() => null),
      ]);
      if (monthlyRes.status === 'fulfilled' && Array.isArray(monthlyRes.value)) {
        setMonthlyRevenueData(monthlyRes.value.map((d: any) => ({ month: d.month, revenue: d.revenue, expenses: d.expenses })));
      }
      if (dailyRes.status === 'fulfilled' && Array.isArray(dailyRes.value)) {
        setDailyRevenueData(dailyRes.value.map((d: any) => ({ date: d.date.slice(5), amount: d.amount })));
      }
      if (methodsRes.status === 'fulfilled' && Array.isArray(methodsRes.value)) {
        setPaymentMethodData(methodsRes.value.map((d: any) => ({ name: d.method, value: d.count, total: d.total })));
      }
    } catch {} finally {
      setChartsLoading(false);
    }
  }, []);

  /* ─── Fetch invoice payments ─── */
  const fetchInvoicePayments = useCallback(async (invoiceId: string) => {
    try {
      const res = await apiFetch<{ payments: PaymentRecord[] }>('/api/payments', { invoiceId });
      setInvoicePayments(res.payments || []);
    } catch {
      setInvoicePayments([]);
    }
  }, []);

  /* ─── Fetch overdue invoices ─── */
  const fetchOverdue = useCallback(async () => {
    try {
      setInstallmentsLoading(true);
      const res = await apiFetch<{ overdueInvoices: any[] }>('/api/reports?type=overdueInvoices');
      setOverdueInvoices(res.overdueInvoices || []);
    } catch {} finally {
      setInstallmentsLoading(false);
    }
  }, []);

  /* ─── Line-item helpers ─── */
  const addItem = () => setItems([...items, { description: '', type: 'service', quantity: 1, unitPrice: 0, total: 0 }]);
  const updateItem = (i: number, field: string, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    updated[i].total = updated[i].quantity * updated[i].unitPrice;
    setItems(updated);
  };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  /* ─── Totals ─── */
  const subtotal = items.reduce((s, it) => s + it.total, 0);
  const discountAmt = subtotal * (form.discount / 100);
  const taxAmt = (subtotal - discountAmt) * (form.tax / 100);
  const total = subtotal - discountAmt + taxAmt;

  /* ─── Actions ─── */
  const handleCreate = async () => {
    if (!form.patientId) { toast.error('Select a patient'); return; }
    try {
      await apiFetch('/api/billing', { method: 'POST', body: { patientId: form.patientId, subtotal, discount: discountAmt, tax: taxAmt, total, paymentMethod: form.paymentMethod, items } });
      toast.success(t('added'));
      setCreateOpen(false);
      setItems([{ description: '', type: 'service', quantity: 1, unitPrice: 0, total: 0 }]);
      setForm({ patientId: '', discount: 0, tax: 0, paymentMethod: 'cash' });
      fetchData();
    } catch { toast.error(t('error')); }
  };

  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/billing?id=${deleteTarget}`, { method: 'DELETE' });
      if (res.ok) { toast.success(t('deleted')); setDeleteConfirmOpen(false); setDeleteTarget(null); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const handlePay = async (inv: Invoice) => {
    const amount = inv.total - inv.paidAmount;
    try {
      await apiFetch(`/api/billing?id=${inv.id}`, { method: 'PUT', body: { paidAmount: inv.paidAmount + amount, paymentStatus: 'paid' } });
      toast.success(t('paid')); fetchData();
    } catch { toast.error(t('error')); }
  };

  /* ─── Add Payment to Invoice ─── */
  const handleAddPayment = async () => {
    if (!selectedInvoice || !paymentForm.amount) { toast.error(t('warning')); return; }
    setPaymentSubmitting(true);
    try {
      await apiPost('/api/payments', {
        invoiceId: selectedInvoice.id,
        amount: parseFloat(paymentForm.amount),
        method: paymentForm.method,
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: paymentForm.notes || undefined,
      });
      toast.success(t('payment_added'));
      setPaymentDialogOpen(false);
      setPaymentForm({ amount: '', method: 'cash', referenceNumber: '', notes: '' });
      fetchInvoicePayments(selectedInvoice.id);
      fetchData();
    } catch { toast.error(t('error')); }
    finally { setPaymentSubmitting(false); }
  };

  /* ─── Print ─── */
  const printInvoice = () => {
    const w = window.open('', '_blank');
    if (!w || !selectedInvoice) return;
    const inv = selectedInvoice;
    w.document.write(`<html dir="${isRTL ? 'rtl' : 'ltr'}"><head><title>${inv.invoiceNumber}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{color:#059669;border-bottom:3px solid #059669;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:8px;text-align:${isRTL ? 'right' : 'left'}}th{background:#f0fdf4}.total-row{font-weight:bold;background:#f0fdf4}.amount{text-align:right}</style></head><body><h1>${isRTL ? 'فاکتور' : 'Invoice'}: ${inv.invoiceNumber}</h1><p>${isRTL ? 'تاریخ' : 'Date'}: ${new Date(inv.createdAt).toLocaleDateString()}</p><p>${isRTL ? 'بیمار' : 'Patient'}: ${inv.patient?.firstName || ''} ${inv.patient?.lastName || ''}</p><p>${isRTL ? 'روش پرداخت' : 'Payment'}: ${inv.paymentMethod} | ${isRTL ? 'وضعیت' : 'Status'}: ${inv.paymentStatus}</p><table><thead><tr><th>${isRTL ? 'شرح' : 'Description'}</th><th>${isRTL ? 'نوع' : 'Type'}</th><th>${isRTL ? 'تعداد' : 'Qty'}</th><th class="amount">${isRTL ? 'قیمت واحد' : 'Unit Price'}</th><th class="amount">${isRTL ? 'مبلغ' : 'Total'}</th></tr></thead><tbody>${(inv.items || []).map((i) => `<tr><td>${i.description}</td><td>${i.type}</td><td>${i.quantity}</td><td class="amount">${Number(i.unitPrice).toLocaleString()}</td><td class="amount">${Number(i.total).toLocaleString()}</td></tr>`).join('')}</tbody></table><table><tr><td>${isRTL ? 'جمع فرعی' : 'Subtotal'}</td><td class="amount">${Number(inv.subtotal).toLocaleString()}</td></tr><tr><td>${isRTL ? 'تخفیف' : 'Discount'}</td><td class="amount">-${Number(inv.discount).toLocaleString()}</td></tr><tr><td>${isRTL ? 'مالیات' : 'Tax'}</td><td class="amount">${Number(inv.tax).toLocaleString()}</td></tr><tr class="total-row"><td>${isRTL ? 'مبلغ نهایی' : 'Total'}</td><td class="amount">${Number(inv.total).toLocaleString()}</td></tr><tr><td>${isRTL ? 'پرداخت شده' : 'Paid'}</td><td class="amount">${Number(inv.paidAmount).toLocaleString()}</td></tr><tr><td>${isRTL ? 'باقیمانده' : 'Balance'}</td><td class="amount" style="color:${inv.paymentStatus === 'paid' ? 'green' : 'red'}">${Number(inv.total - inv.paidAmount).toLocaleString()}</td></tr></table></body></html>`);
    w.document.close(); w.print();
  };

  /* ─── View invoice detail (loads payments) ─── */
  const openViewDialog = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setViewOpen(true);
    fetchInvoicePayments(inv.id);
  };

  /* ─── Send reminder ─── */
  const sendReminder = () => {
    toast.success(t('reminder_sent'));
  };

  /* ─── Render ─── */
  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      {/* ── Stats Cards ── */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: t('today_revenue'), value: Number(stats.todayRevenue || 0).toLocaleString(), color: 'emerald' },
          { icon: TrendingUp, label: t('monthly_revenue_label'), value: Number(stats.monthlyRevenue || 0).toLocaleString(), color: 'blue' },
          { icon: Receipt, label: t('paid_invoices'), value: stats.paidInvoices || '—', color: 'green' },
          { icon: AlertCircle, label: t('unpaid_invoices'), value: stats.unpaidInvoices || 0, color: 'red' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${s.color}-100 dark:bg-${s.color}-900/30`}>
                  <s.icon className={`size-5 text-${s.color}-600`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                  <p className="text-lg font-bold truncate">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="invoices">
        <TabsList className="w-full sm:w-auto flex-wrap">
          <TabsTrigger value="invoices" className="flex-1 sm:flex-initial text-xs sm:text-sm">{t('billing')}</TabsTrigger>
          <TabsTrigger value="create" className="flex-1 sm:flex-initial text-xs sm:text-sm">{t('create_new_invoice')}</TabsTrigger>
          <TabsTrigger value="installments" className="flex-1 sm:flex-initial text-xs sm:text-sm">{t('installments')}</TabsTrigger>
          <TabsTrigger value="charts" className="flex-1 sm:flex-initial text-xs sm:text-sm" onClick={fetchChartData}>{t('charts')}</TabsTrigger>
        </TabsList>

        {/* ===== Invoices Tab ===== */}
        <TabsContent value="invoices" className="space-y-4">
          <CollapsiblePanel id="billing-invoice-list" title={t('billing')} icon={Receipt} badge={invoices.length}>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className={`absolute top-2.5 size-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} />
                <Input placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} className={isRTL ? 'pr-9' : 'pl-9'} />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue /></SelectTrigger>
                <SelectContent>{['all', 'paid', 'unpaid', 'partial'].map((s) => (<SelectItem key={s} value={s}>{s === 'all' ? t('all') : s}</SelectItem>))}</SelectContent>
              </Select>
            </motion.div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-start font-medium">{t('invoice_number')}</th>
                        <th className="p-3 text-start font-medium">{t('patient')}</th>
                        <th className="p-3 text-start font-medium">{t('invoice_date')}</th>
                        <th className="p-3 text-start font-medium">{t('total')}</th>
                        <th className="p-3 text-start font-medium">{t('payment_method')}</th>
                        <th className="p-3 text-start font-medium">{t('status')}</th>
                        <th className="p-3 text-start font-medium">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                          <td className="p-3">{inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : '-'}</td>
                          <td className="p-3 text-xs">{new Date(inv.createdAt).toLocaleDateString()}</td>
                          <td className="p-3 font-medium">{Number(inv.total).toLocaleString()}</td>
                          <td className="p-3"><Badge variant="outline" className="text-xs">{inv.paymentMethod}</Badge></td>
                          <td className="p-3"><StatusBadge status={inv.paymentStatus} /></td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => openViewDialog(inv)}><Eye className="size-3.5" /></Button>
                              {inv.paymentStatus !== 'paid' && (
                                <Button size="sm" className="h-7 bg-primary hover:bg-primary/90 text-xs gap-1" onClick={() => handlePay(inv)}>
                                  <DollarSign className="size-3" /><span className="hidden sm:inline">{t('paid')}</span>
                                </Button>
                              )}
                              {inv.paymentStatus !== 'paid' && (
                                <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => { setDeleteTarget(inv.id); setDeleteConfirmOpen(true); }}><Trash2 className="size-3.5" /></Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {invoices.length === 0 && <div className="py-12 text-center text-muted-foreground"><Receipt className="size-10 mx-auto mb-2 opacity-30" /><p>{t('no_data')}</p></div>}
              </CardContent>
            </Card>
          </CollapsiblePanel>
        </TabsContent>

        {/* ===== Create Invoice Tab ===== */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{t('create_new_invoice')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label>{t('patient')}</Label><Select value={form.patientId} onValueChange={(v) => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder={t('select_patient')} /></SelectTrigger><SelectContent>{patients.map((p) => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select></div>
                <div className="space-y-1.5"><Label>{t('discount')} (%)</Label><Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>{t('tax')} (%)</Label><Input type="number" value={form.tax} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} /></div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between"><h4 className="font-medium">{t('items')}</h4><Button size="sm" variant="outline" onClick={addItem}><Plus className="size-3" />{t('add')}</Button></div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-2 items-end">
                    <div className="col-span-1 sm:col-span-3 lg:col-span-4"><Label className="text-xs">{t('description')}</Label><Input value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} /></div>
                    <div className="col-span-1 sm:col-span-3 lg:col-span-2"><Label className="text-xs">{t('type')}</Label><Select value={item.type} onValueChange={(v) => updateItem(i, 'type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['service', 'medicine', 'lab', 'room', 'doctor'].map((tp) => (<SelectItem key={tp} value={tp}>{tp}</SelectItem>))}</SelectContent></Select></div>
                    <div className="col-span-1 sm:col-span-2 lg:col-span-1"><Label className="text-xs">{t('quantity')}</Label><Input type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))} /></div>
                    <div className="col-span-1 sm:col-span-2 lg:col-span-2"><Label className="text-xs">{t('unit_price')}</Label><Input type="number" value={item.unitPrice} onChange={(e) => updateItem(i, 'unitPrice', Number(e.target.value))} /></div>
                    <div className="col-span-1 sm:col-span-1 lg:col-span-2"><Label className="text-xs">{t('amount')}</Label><Input value={Number(item.total).toLocaleString()} readOnly className="bg-muted" /></div>
                    <div className="col-span-1 flex justify-end"><Button size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => removeItem(i)}><Trash2 className="size-4" /></Button></div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-end">
                <div className="w-full sm:w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span>{t('subtotal')}</span><span>{subtotal.toLocaleString()}</span></div>
                  {form.discount > 0 && <div className="flex justify-between text-amber-600"><span>{t('discount')} ({form.discount}%)</span><span>-{discountAmt.toLocaleString()}</span></div>}
                  {form.tax > 0 && <div className="flex justify-between"><span>{t('tax')} ({form.tax}%)</span><span>+{taxAmt.toLocaleString()}</span></div>}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg"><span>{t('total')}</span><span className="text-primary">{total.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end gap-3">
                <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}><SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => (<SelectItem key={m.value} value={m.value}>{t(m.label)}</SelectItem>))}</SelectContent></Select>
                <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90" onClick={handleCreate}>{t('create_new_invoice')}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Installments Tab ===== */}
        <TabsContent value="installments" className="space-y-4">
          <CollapsiblePanel id="billing-installments" icon={Clock} title={t('installments')}>
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={fetchOverdue}><AlertCircle className="size-4" /> {t('overdue_invoices')}</Button>
            </div>
            {installmentsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-primary" /></div>
            ) : overdueInvoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><Clock className="size-10 mx-auto mb-2 opacity-30" /><p>{t('no_data')}</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">{t('invoice_number')}</th>
                    <th className="p-3 text-start font-medium">{t('patient')}</th>
                    <th className="p-3 text-start font-medium">{t('total')}</th>
                    <th className="p-3 text-start font-medium">{t('balance')}</th>
                    <th className="p-3 text-start font-medium">{t('status')}</th>
                    <th className="p-3 text-start font-medium">{t('actions')}</th>
                  </tr></thead>
                  <tbody>
                    {overdueInvoices.map((inv: any) => {
                      const balance = (inv.total || 0) - (inv.paidAmount || 0);
                      return (
                        <tr key={inv.id} className="border-b hover:bg-muted/30">
                          <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                          <td className="p-3">{inv.patient?.firstName} {inv.patient?.lastName}</td>
                          <td className="p-3">{Number(inv.total || 0).toLocaleString()}</td>
                          <td className="p-3 font-medium text-red-600">{balance.toLocaleString()}</td>
                          <td className="p-3"><Badge variant="destructive" className="text-xs">{t('overdue_alert')}</Badge></td>
                          <td className="p-3"><Button size="sm" variant="outline" onClick={sendReminder}><Send className="size-3" /> {t('send_reminder')}</Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* Partial payment invoices */}
            <h4 className="font-medium text-sm mt-6 mb-3">{t('partial_payments')}</h4>
            {invoices.filter((inv) => inv.paymentStatus === 'partial').length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t('no_data')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead><tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">{t('invoice_number')}</th>
                    <th className="p-3 text-start font-medium">{t('patient')}</th>
                    <th className="p-3 text-start font-medium">{t('total')}</th>
                    <th className="p-3 text-start font-medium">{t('paid')}</th>
                    <th className="p-3 text-start font-medium">{t('balance')}</th>
                  </tr></thead>
                  <tbody>
                    {invoices.filter((inv) => inv.paymentStatus === 'partial').map((inv) => (
                      <tr key={inv.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => openViewDialog(inv)}>
                        <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="p-3">{inv.patient?.firstName} {inv.patient?.lastName}</td>
                        <td className="p-3">{Number(inv.total).toLocaleString()}</td>
                        <td className="p-3 text-emerald-600">{Number(inv.paidAmount).toLocaleString()}</td>
                        <td className="p-3 font-medium text-amber-600">{(inv.total - inv.paidAmount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsiblePanel>
        </TabsContent>

        {/* ===== Charts Tab ===== */}
        <TabsContent value="charts" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('total_income'), value: Number(stats.monthlyRevenue || 0).toLocaleString(), color: 'emerald' },
              { label: t('total_outstanding'), value: (stats.unpaidInvoices || 0).toLocaleString(), color: 'red' },
              { label: t('overdue_invoices'), value: overdueInvoices.length || '—', color: 'amber' },
              { label: t('today_collections'), value: Number(stats.todayRevenue || 0).toLocaleString(), color: 'sky' },
            ].map((s, i) => (
              <Card key={i}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`text-xl font-bold text-${s.color}-600`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <CollapsiblePanel id="billing-charts" title={t('charts')} icon={TrendingUp}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Monthly Revenue vs Expenses */}
              <Card>
                <CardHeader><CardTitle>{t('income_vs_expense')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyRevenueData.length > 0 ? monthlyRevenueData : [{ month: 'N/A', revenue: 0, expenses: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name={t('revenue')} />
                        <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name={t('expenses_label')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Distribution */}
              <Card>
                <CardHeader><CardTitle>{t('payment_method_analysis')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={paymentMethodData.length > 0 ? paymentMethodData : [{ name: 'No data', value: 1 }]} innerRadius={50} outerRadius={80} dataKey="value" label>
                          {paymentMethodData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Revenue Trend */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>{t('daily_revenue_trend')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyRevenueData.length > 0 ? dailyRevenueData : [{ date: 'N/A', amount: 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} name={t('daily_revenue')} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CollapsiblePanel>
        </TabsContent>
      </Tabs>

      {/* ── Delete Confirm Dialog ── */}
      <ConfirmDialog open={deleteConfirmOpen} onClose={() => { setDeleteConfirmOpen(false); setDeleteTarget(null); }} onConfirm={handleDeleteInvoice} title={`${t('delete')} ${t('invoice')}`} description={t('delete_invoice_confirm')} confirmLabel={t('delete')} variant="danger" />

      {/* ── View Invoice Dialog (Enhanced with payments & insurance) ── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="size-5" />{selectedInvoice.invoiceNumber}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                {/* Patient & Invoice Info */}
                <div className="flex flex-col sm:flex-row gap-1 sm:gap-4">
                  <p>{t('patient')}: {selectedInvoice.patient?.firstName} {selectedInvoice.patient?.lastName}</p>
                  <p>{t('invoice_date')}: {new Date(selectedInvoice.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{selectedInvoice.paymentMethod}</Badge>
                  <StatusBadge status={selectedInvoice.paymentStatus} />
                  {selectedInvoice.dueDate && new Date(selectedInvoice.dueDate) < new Date() && selectedInvoice.paymentStatus !== 'paid' && (
                    <Badge variant="destructive" className="gap-1"><AlertCircle className="size-3" />{t('overdue_alert')}</Badge>
                  )}
                </div>

                {/* Insurance Coverage */}
                {selectedInvoice.patient?.insuranceCompany && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <h4 className="font-medium text-xs flex items-center gap-1 mb-2"><Shield className="size-3" />{t('insurance_coverage')}</h4>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div><p className="text-xs text-muted-foreground">{t('insurance_company')}</p><p className="font-medium text-xs">{selectedInvoice.patient.insuranceCompany}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t('insurance_responsibility')}</p><p className="font-medium text-xs">{(selectedInvoice.total * 0.7).toLocaleString()}</p></div>
                      <div><p className="text-xs text-muted-foreground">{t('patient_responsibility')}</p><p className="font-medium text-xs">{(selectedInvoice.total * 0.3).toLocaleString()}</p></div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">{t('insurance_claim_status')}</p>
                      <Badge variant="outline" className="text-xs">{selectedInvoice.paymentMethod === 'insurance' ? t('claim_submitted') : t('claim_pending')}</Badge>
                    </div>
                  </div>
                )}

                {/* Items Table */}
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[360px] border text-xs mt-2">
                    <thead><tr className="bg-muted"><th className="border p-2">{t('description')}</th><th className="border p-2">{t('type')}</th><th className="border p-2 text-end">{t('amount')}</th></tr></thead>
                    <tbody>{(selectedInvoice.items || []).map((item, i) => (<tr key={i}><td className="border p-2">{item.description}</td><td className="border p-2">{item.type}</td><td className="border p-2 text-end">{Number(item.total).toLocaleString()}</td></tr>))}</tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="text-end space-y-1 font-medium">
                  <p>{t('subtotal')}: {Number(selectedInvoice.subtotal).toLocaleString()}</p>
                  {selectedInvoice.discount > 0 && <p className="text-amber-600">{t('discount')}: -{Number(selectedInvoice.discount).toLocaleString()}</p>}
                  {selectedInvoice.tax > 0 && <p>{t('tax')}: +{Number(selectedInvoice.tax).toLocaleString()}</p>}
                  <Separator />
                  <p>{t('total')}: {Number(selectedInvoice.total).toLocaleString()}</p>
                  <p>{t('paid')}: {Number(selectedInvoice.paidAmount).toLocaleString()}</p>
                  <p className={selectedInvoice.paymentStatus === 'paid' ? 'text-primary' : 'text-destructive'}>
                    {t('running_balance')}: {Number(selectedInvoice.total - selectedInvoice.paidAmount).toLocaleString()}
                  </p>
                </div>

                <Separator />

                {/* Payment History */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{t('payment_history')}</h4>
                    {selectedInvoice.paymentStatus !== 'paid' && (
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs" onClick={() => setPaymentDialogOpen(true)}>
                        <Plus className="size-3" />{t('add_payment_btn')}
                      </Button>
                    )}
                  </div>
                  {invoicePayments.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">{t('no_payments_yet')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border">
                        <thead><tr className="bg-muted"><th className="border p-2">{t('date')}</th><th className="border p-2">{t('amount')}</th><th className="border p-2">{t('payment_method')}</th><th className="border p-2">{t('payment_reference')}</th><th className="border p-2">{t('status')}</th></tr></thead>
                        <tbody>
                          {invoicePayments.map((p) => (
                            <tr key={p.id}>
                              <td className="border p-2">{new Date(p.paidAt).toLocaleDateString()}</td>
                              <td className="border p-2 font-medium">{Number(p.amount).toLocaleString()}</td>
                              <td className="border p-2">{p.method}</td>
                              <td className="border p-2">{p.referenceNumber || '—'}</td>
                              <td className="border p-2"><StatusBadge status={p.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <Button className="w-full" onClick={printInvoice}><Printer className="size-4" />{t('print')}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add Payment Dialog ── */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{t('add_payment_btn')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>{t('payment_amount')}</Label><Input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} placeholder={String(selectedInvoice ? selectedInvoice.total - selectedInvoice.paidAmount : 0)} /></div>
            <div className="space-y-2">
              <Label>{t('select_method')}</Label>
              <Select value={paymentForm.method} onValueChange={(v) => setPaymentForm((p) => ({ ...p, method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((m) => (<SelectItem key={m.value} value={m.value}>{t(m.label)}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>{t('payment_reference')}</Label><Input value={paymentForm.referenceNumber} onChange={(e) => setPaymentForm((p) => ({ ...p, referenceNumber: e.target.value }))} /></div>
            <div className="space-y-2"><Label>{t('notes')}</Label><Input value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleAddPayment} disabled={paymentSubmitting} className="bg-primary hover:bg-primary/90">{paymentSubmitting && <Loader2 className="size-4 animate-spin" />}{t('add_payment_btn')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

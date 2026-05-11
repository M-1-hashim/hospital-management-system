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
import { Separator } from '@/components/ui/separator';
import { Receipt, Plus, Search, Printer, Eye, Trash2, DollarSign, CreditCard, TrendingUp, AlertCircle, CalendarDays, User } from 'lucide-react';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { EmptyState } from '@/components/hms/shared/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface InvoiceItem { id?: string; description: string; type: string; quantity: number; unitPrice: number; total: number; }
interface Invoice { id: string; invoiceNumber: string; patientId: string; subtotal: number; discount: number; tax: number; total: number; paymentMethod: string; paymentStatus: string; paidAmount: number; createdAt: string; patient?: { firstName: string; lastName: string }; items?: InvoiceItem[]; }
interface Patient { id: string; firstName: string; lastName: string; }

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'];

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
  const [items, setItems] = useState<InvoiceItem[]>([{ description: '', type: 'service', quantity: 1, unitPrice: 0, total: 0 }]);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const [invRes, statRes, patRes] = await Promise.allSettled([
        fetch(`/api/billing?${params}`).then(r => r.json()),
        fetch('/api/billing/stats').then(r => r.json()),
        fetch('/api/patients?limit=50').then(r => r.json()),
      ]);
      if (invRes.status === 'fulfilled' && invRes.value) setInvoices(invRes.value.data || invRes.value);
      if (statRes.status === 'fulfilled' && statRes.value) setStats(statRes.value);
      if (patRes.status === 'fulfilled' && patRes.value) setPatients(patRes.value.data || patRes.value);
    } catch {}
    finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const addItem = () => setItems([...items, { description: '', type: 'service', quantity: 1, unitPrice: 0, total: 0 }]);
  const updateItem = (i: number, field: string, value: any) => {
    const updated = [...items];
    (updated[i] as any)[field] = value;
    updated[i].total = updated[i].quantity * updated[i].unitPrice;
    setItems(updated);
  };
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discountAmt = subtotal * (form.discount / 100);
  const taxAmt = (subtotal - discountAmt) * (form.tax / 100);
  const total = subtotal - discountAmt + taxAmt;

  const handleCreate = async () => {
    if (!form.patientId) { toast.error('Select a patient'); return; }
    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: form.patientId, subtotal, discount: discountAmt, tax: taxAmt, total, paymentMethod: form.paymentMethod, items }),
      });
      if (res.ok) { toast.success(t('added')); setCreateOpen(false); setItems([{ description: '', type: 'service', quantity: 1, unitPrice: 0, total: 0 }]); setForm({ patientId: '', discount: 0, tax: 0, paymentMethod: 'cash' }); fetchData(); }
      else toast.error(t('error'));
    } catch { toast.error(t('error')); }
  };

  const handlePay = async (inv: Invoice) => {
    const amount = inv.total - inv.paidAmount;
    try {
      const res = await fetch(`/api/billing?id=${inv.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paidAmount: inv.paidAmount + amount, paymentStatus: 'paid' }) });
      if (res.ok) { toast.success(t('paid')); fetchData(); }
    } catch { toast.error(t('error')); }
  };

  const printInvoice = () => {
    const w = window.open('', '_blank');
    if (!w || !selectedInvoice) return;
    const inv = selectedInvoice;
    w.document.write(`<html dir="${isRTL ? 'rtl' : 'ltr'}"><head><title>${inv.invoiceNumber}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#333}h1{color:#059669;border-bottom:3px solid #059669;padding-bottom:10px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{border:1px solid #ddd;padding:8px;text-align:${isRTL ? 'right' : 'left'}}th{background:#f0fdf4}.total-row{font-weight:bold;background:#f0fdf4}.amount{text-align:right}</style></head><body><h1>${isRTL ? 'فاکتور' : 'Invoice'}: ${inv.invoiceNumber}</h1><p>${isRTL ? 'تاریخ' : 'Date'}: ${new Date(inv.createdAt).toLocaleDateString()}</p><p>${isRTL ? 'بیمار' : 'Patient'}: ${inv.patient?.firstName || ''} ${inv.patient?.lastName || ''}</p><p>${isRTL ? 'روش پرداخت' : 'Payment'}: ${inv.paymentMethod} | ${isRTL ? 'وضعیت' : 'Status'}: ${inv.paymentStatus}</p><table><thead><tr><th>${isRTL ? 'شرح' : 'Description'}</th><th>${isRTL ? 'نوع' : 'Type'}</th><th>${isRTL ? 'تعداد' : 'Qty'}</th><th class="amount">${isRTL ? 'قیمت واحد' : 'Unit Price'}</th><th class="amount">${isRTL ? 'مبلغ' : 'Total'}</th></tr></thead><tbody>${(inv.items || []).map(i => `<tr><td>${i.description}</td><td>${i.type}</td><td>${i.quantity}</td><td class="amount">${Number(i.unitPrice).toLocaleString()}</td><td class="amount">${Number(i.total).toLocaleString()}</td></tr>`).join('')}</tbody></table><table><tr><td>${isRTL ? 'جمع فرعی' : 'Subtotal'}</td><td class="amount">${Number(inv.subtotal).toLocaleString()}</td></tr><tr><td>${isRTL ? 'تخفیف' : 'Discount'}</td><td class="amount">-${Number(inv.discount).toLocaleString()}</td></tr><tr><td>${isRTL ? 'مالیات' : 'Tax'}</td><td class="amount">${Number(inv.tax).toLocaleString()}</td></tr><tr class="total-row"><td>${isRTL ? 'مبلغ نهایی' : 'Total'}</td><td class="amount">${Number(inv.total).toLocaleString()}</td></tr><tr><td>${isRTL ? 'پرداخت شده' : 'Paid'}</td><td class="amount">${Number(inv.paidAmount).toLocaleString()}</td></tr><tr><td>${isRTL ? 'باقیمانده' : 'Balance'}</td><td class="amount" style="color:${inv.paymentStatus === 'paid' ? 'green' : 'red'}">${Number(inv.total - inv.paidAmount).toLocaleString()}</td></tr></table></body></html>`);
    w.document.close();
    w.print();
  };

  const revenueData = Array.from({ length: 6 }, (_, i) => ({ month: ['Jan','Feb','Mar','Apr','May','Jun'][i], revenue: Math.floor(Math.random() * 5000000 + 2000000) }));
  const payMethodData = [{ name: 'Cash', value: 45 }, { name: 'Card', value: 30 }, { name: 'Insurance', value: 20 }, { name: 'Installment', value: 5 }];

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: t('today_revenue'), value: Number(stats.todayRevenue || 0).toLocaleString(), color: 'emerald' },
          { icon: TrendingUp, label: isRTL ? 'درآمد ماهانه' : 'Monthly Revenue', value: Number(stats.monthlyRevenue || 0).toLocaleString(), color: 'blue' },
          { icon: Receipt, label: isRTL ? 'فاکتورهای پرداخت شده' : 'Paid Invoices', value: '—', color: 'green' },
          { icon: AlertCircle, label: isRTL ? 'پرداخت نشده' : 'Unpaid', value: stats.unpaidInvoices || 0, color: 'red' },
        ].map((s, i) => (
          <Card key={i}><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`p-2 rounded-lg bg-${s.color}-100 dark:bg-${s.color}-900/30`}><s.icon className={`size-5 text-${s.color}-600`} /></div><div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold">{s.value}</p></div></div></CardContent></Card>
        ))}
      </motion.div>

      <Tabs defaultValue="invoices">
        <TabsList><TabsTrigger value="invoices">{t('billing')}</TabsTrigger><TabsTrigger value="create">{isRTL ? 'صدور فاکتور' : 'Create Invoice'}</TabsTrigger><TabsTrigger value="charts">{isRTL ? 'نمودارها' : 'Charts'}</TabsTrigger></TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className={`absolute top-2.5 size-4 text-muted-foreground ${isRTL ? 'right-3' : 'left-3'}`} /><Input placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} className={isRTL ? 'pr-9' : 'pl-9'} /></div>
            <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{['all','paid','unpaid','partial'].map(s => <SelectItem key={s} value={s}>{s === 'all' ? t('all') : s}</SelectItem>)}</SelectContent></Select>
          </motion.div>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50"><th className={`p-3 text-start font-medium`}>{isRTL ? 'شماره فاکتور' : 'Invoice#'}</th><th className="p-3 text-start font-medium">{t('patient')}</th><th className="p-3 text-start font-medium">{isRTL ? 'تاریخ' : 'Date'}</th><th className="p-3 text-start font-medium">{t('total')}</th><th className="p-3 text-start font-medium">{t('payment_method')}</th><th className="p-3 text-start font-medium">{t('status')}</th><th className="p-3 text-start font-medium">{t('actions')}</th></tr></thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="p-3">{inv.patient ? `${inv.patient.firstName} ${inv.patient.lastName}` : '-'}</td>
                      <td className="p-3 text-xs">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 font-medium">{Number(inv.total).toLocaleString()}</td>
                      <td className="p-3"><Badge variant="outline" className="text-xs">{inv.paymentMethod}</Badge></td>
                      <td className="p-3"><StatusBadge status={inv.paymentStatus} /></td>
                      <td className="p-3"><div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => { setSelectedInvoice(inv); setViewOpen(true); }}><Eye className="size-3.5" /></Button>
                        {inv.paymentStatus !== 'paid' && <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => handlePay(inv)}>{t('paid')}</Button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invoices.length === 0 && <div className="py-12 text-center text-muted-foreground"><Receipt className="size-10 mx-auto mb-2 opacity-30" /><p>{t('no_data')}</p></div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>{isRTL ? 'صدور فاکتور جدید' : 'Create New Invoice'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><Label>{t('patient')}</Label><Select value={form.patientId} onValueChange={v => setForm({ ...form, patientId: v })}><SelectTrigger><SelectValue placeholder={isRTL ? 'انتخاب بیمار' : 'Select patient'} /></SelectTrigger><SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>{isRTL ? 'تخفیف (%)' : 'Discount (%)'}</Label><Input type="number" value={form.discount} onChange={e => setForm({ ...form, discount: Number(e.target.value) })} /></div>
                <div><Label>{isRTL ? 'مالیات (%)' : 'Tax (%)'}</Label><Input type="number" value={form.tax} onChange={e => setForm({ ...form, tax: Number(e.target.value) })} /></div>
              </div>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between"><h4 className="font-medium">{isRTL ? 'آیتم‌ها' : 'Items'}</h4><Button size="sm" variant="outline" onClick={addItem}><Plus className="size-3" />{t('add')}</Button></div>
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4"><Label className="text-xs">{isRTL ? 'شرح' : 'Description'}</Label><Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder={isRTL ? 'خدمت یا دارو' : 'Service or medicine'} /></div>
                    <div className="col-span-2"><Label className="text-xs">{isRTL ? 'نوع' : 'Type'}</Label><Select value={item.type} onValueChange={v => updateItem(i, 'type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['service','medicine','lab','room','doctor'].map(tp => <SelectItem key={tp} value={tp}>{tp}</SelectItem>)}</SelectContent></Select></div>
                    <div className="col-span-1"><Label className="text-xs">{isRTL ? 'تعداد' : 'Qty'}</Label><Input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} /></div>
                    <div className="col-span-2"><Label className="text-xs">{isRTL ? 'قیمت واحد' : 'Unit Price'}</Label><Input type="number" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} /></div>
                    <div className="col-span-2"><Label className="text-xs">{isRTL ? 'مبلغ' : 'Total'}</Label><Input value={Number(item.total).toLocaleString()} readOnly className="bg-muted" /></div>
                    <div className="col-span-1"><Button size="icon" variant="ghost" className="size-9 text-destructive" onClick={() => removeItem(i)}><Trash2 className="size-4" /></Button></div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><span>{isRTL ? 'جمع فرعی' : 'Subtotal'}</span><span>{subtotal.toLocaleString()}</span></div>
                  {form.discount > 0 && <div className="flex justify-between text-amber-600"><span>{isRTL ? 'تخفیف' : 'Discount'} ({form.discount}%)</span><span>-{discountAmt.toLocaleString()}</span></div>}
                  {form.tax > 0 && <div className="flex justify-between"><span>{isRTL ? 'مالیات' : 'Tax'} ({form.tax}%)</span><span>+{taxAmt.toLocaleString()}</span></div>}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg"><span>{t('total')}</span><span className="text-emerald-600">{total.toLocaleString()}</span></div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Select value={form.paymentMethod} onValueChange={v => setForm({ ...form, paymentMethod: v })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{['cash','card','insurance','installment'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate}>{isRTL ? 'صدور فاکتور' : 'Create Invoice'}</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>{isRTL ? 'درآمد ماهانه' : 'Monthly Revenue'}</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer><BarChart data={revenueData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="revenue" fill="#10b981" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div></CardContent></Card>
            <Card><CardHeader><CardTitle>{isRTL ? 'روش پرداخت' : 'Payment Methods'}</CardTitle></CardHeader><CardContent><div className="h-64"><ResponsiveContainer><PieChart><Pie data={payMethodData} innerRadius={50} outerRadius={80} dataKey="value" label>{payMethodData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Invoice Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-lg">
          {selectedInvoice && (<>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Receipt />{selectedInvoice.invoiceNumber}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <p>{t('patient')}: {selectedInvoice.patient?.firstName} {selectedInvoice.patient?.lastName}</p>
              <p>{isRTL ? 'تاریخ' : 'Date'}: {new Date(selectedInvoice.createdAt).toLocaleDateString()}</p>
              <StatusBadge status={selectedInvoice.paymentStatus} />
              <table className="w-full border text-xs mt-2"><thead><tr className="bg-muted"><th className="border p-2">{isRTL ? 'شرح' : 'Description'}</th><th className="border p-2">{isRTL ? 'نوع' : 'Type'}</th><th className="border p-2 text-end">{isRTL ? 'مبلغ' : 'Amount'}</th></tr></thead><tbody>{(selectedInvoice.items || []).map((item, i) => <tr key={i}><td className="border p-2">{item.description}</td><td className="border p-2">{item.type}</td><td className="border p-2 text-end">{Number(item.total).toLocaleString()}</td></tr>)}</tbody></table>
              <div className="text-end space-y-1 font-medium"><p>{isRTL ? 'جمع' : 'Total'}: {Number(selectedInvoice.total).toLocaleString()}</p><p>{isRTL ? 'پرداخت شده' : 'Paid'}: {Number(selectedInvoice.paidAmount).toLocaleString()}</p></div>
              <Button className="w-full" onClick={printInvoice}><Printer className="size-4" />{t('print')}</Button>
            </div>
          </>)}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

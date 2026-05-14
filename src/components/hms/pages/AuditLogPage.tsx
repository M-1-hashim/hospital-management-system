'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguageStore } from '@/store';
import { apiFetch } from '@/lib/fetcher';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield,
  Search,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Clock,
  User,
  FileText,
  Activity,
  Loader2,
  Filter,
  X,
  Timer,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

/* ──────────────────────────── Types ──────────────────────────── */

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    username: string;
    role: string;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FilterOptions {
  users: { id: string; fullName: string; role: string }[];
  actions: string[];
  entities: string[];
}

/* ──────────────────────────── Helpers ──────────────────────────── */

const ACTION_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  create: { bg: 'bg-emerald-100 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', icon: '✅' },
  update: { bg: 'bg-sky-100 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-400', icon: '✏️' },
  delete: { bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', icon: '🗑️' },
  login: { bg: 'bg-violet-100 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-400', icon: '🔑' },
  logout: { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', icon: '🚪' },
  view: { bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', icon: '👁️' },
};

function getActionStyle(action: string) {
  return ACTION_STYLES[action] || { bg: 'bg-gray-100 dark:bg-gray-800/30', text: 'text-gray-600 dark:text-gray-400', icon: '📋' };
}

function formatDateTime(dateStr: string, isRTL: boolean) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(isRTL ? 'fa-IR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getTodayDateStr() {
  return new Date().toISOString().split('T')[0];
}

function getDaysAgoDateStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

/* ──────────────────────────── Sort Config ──────────────────────────── */

type SortField = 'createdAt' | 'user' | 'action' | 'entity';
type SortOrder = 'asc' | 'desc';

/* ═══════════════════════════ MAIN ═══════════════════════════ */

export function AuditLogPage() {
  const { t, isRTL } = useLanguageStore();

  // Data state
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ users: [], actions: [], entities: [] });
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    entity: '',
    search: '',
    from: '',
    to: '',
  });

  // Sort state
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Expand details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch audit logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(pagination.page),
        limit: '20',
        sortField,
        sortOrder,
      };

      if (filters.userId) params.userId = filters.userId;
      if (filters.action) params.action = filters.action;
      if (filters.entity) params.entity = filters.entity;
      if (filters.search) params.search = filters.search;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const data = await apiFetch<{
        logs: AuditLog[];
        pagination: PaginationInfo;
        filters: FilterOptions;
      }>('/api/audit-logs', { params });

      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      setFilterOptions(data.filters || { users: [], actions: [], entities: [] });
    } catch {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, sortField, sortOrder, filters, t]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        fetchLogs();
      }, 60000);
    } else {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    }
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, fetchLogs]);

  // Reset filters
  const resetFilters = () => {
    setFilters({ userId: '', action: '', entity: '', search: '', from: '', to: '' });
  };

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportData = logs.map((log) => ({
        [t('time')]: formatDateTime(log.createdAt, isRTL),
        [t('name')]: log.user?.fullName || '—',
        [t('role')]: log.user?.role || '—',
        [t('type')]: t(`action_${log.action}`) || log.action,
        [t('entity')]: log.entity,
        'ID': log.entityId || '—',
        [t('details')]: log.details || '—',
        [t('ip_address')]: log.ipAddress || '—',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');

      // Auto-size columns
      const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
        wch: Math.max(key.length + 2, 15),
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `audit-log-${getTodayDateStr()}.xlsx`);
      toast.success(t('export'));
    } catch {
      toast.error(t('error'));
    }
  };

  const hasActiveFilters = filters.userId || filters.action || filters.entity || filters.search || filters.from || filters.to;

  const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-primary" />
          <h1 className="text-xl font-bold">{t('audit_log')}</h1>
          <Badge variant="secondary" className="text-xs font-normal">
            {pagination.total} {isRTL ? 'رکورد' : 'records'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <div className="flex items-center gap-2 mr-2">
            <Timer className="size-3.5 text-muted-foreground" />
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              className="scale-90"
            />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {isRTL ? 'بروزرسانی خودکار' : 'Auto-refresh 60s'}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={logs.length === 0}>
            <Download className="size-3.5" />
            {t('export_excel')}
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('filter')}</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground ml-auto" onClick={resetFilters}>
                  <X className="size-3" />
                  {t('reset')}
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="sm:col-span-2 lg:col-span-1">
                <div className="relative">
                  <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder={t('search') + '...'}
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="ps-8 h-9 text-sm"
                  />
                </div>
              </div>

              {/* User filter */}
              <Select value={filters.userId} onValueChange={(v) => setFilters({ ...filters, userId: v === '_all' ? '' : v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t('users_label')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('all')} {t('users_label')}</SelectItem>
                  {filterOptions.users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action filter */}
              <Select value={filters.action} onValueChange={(v) => setFilters({ ...filters, action: v === '_all' ? '' : v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t('type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('all')} {t('type')}</SelectItem>
                  {filterOptions.actions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {getActionStyle(a).icon} {t(`action_${a}`) || a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Entity filter */}
              <Select value={filters.entity} onValueChange={(v) => setFilters({ ...filters, entity: v === '_all' ? '' : v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t('entity')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">{t('all')} {t('entity')}</SelectItem>
                  {filterOptions.entities.map((e) => (
                    <SelectItem key={e} value={e}>
                      {t(e) || e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date range */}
              <div>
                <Label className="text-xs text-muted-foreground">{t('from')}</Label>
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('to')}</Label>
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>

              {/* Quick date range buttons */}
              <div className="flex items-end gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setFilters({ ...filters, from: getTodayDateStr(), to: getTodayDateStr() })}
                >
                  {t('today_label')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setFilters({ ...filters, from: getDaysAgoDateStr(7), to: getTodayDateStr() })}
                >
                  {t('this_week')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs"
                  onClick={() => setFilters({ ...filters, from: getDaysAgoDateStr(30), to: getTodayDateStr() })}
                >
                  {t('this_month')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Audit Logs Table */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Shield className="size-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{t('no_data')}</p>
                <p className="text-xs mt-1">
                  {isRTL ? 'هنوز لاگ حسابرسی ثبت نشده است' : 'No audit logs recorded yet'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr className="border-b bg-muted/50">
                        {/* Time */}
                        <th className="p-3 text-start font-medium">
                          <button
                            onClick={() => handleSort('createdAt')}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            <Clock className="size-3" />
                            {t('time')}
                            <ArrowUpDown className="size-3 text-muted-foreground" />
                            {sortField === 'createdAt' && (
                              <span className="text-[10px] text-primary">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        </th>
                        {/* User */}
                        <th className="p-3 text-start font-medium">
                          <button
                            onClick={() => handleSort('user')}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            <User className="size-3" />
                            {t('name')}
                            <ArrowUpDown className="size-3 text-muted-foreground" />
                          </button>
                        </th>
                        {/* Action */}
                        <th className="p-3 text-start font-medium">
                          <button
                            onClick={() => handleSort('action')}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            <Activity className="size-3" />
                            {t('type')}
                            <ArrowUpDown className="size-3 text-muted-foreground" />
                            {sortField === 'action' && (
                              <span className="text-[10px] text-primary">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        </th>
                        {/* Entity */}
                        <th className="p-3 text-start font-medium">
                          <button
                            onClick={() => handleSort('entity')}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            <FileText className="size-3" />
                            {t('entity')}
                            <ArrowUpDown className="size-3 text-muted-foreground" />
                            {sortField === 'entity' && (
                              <span className="text-[10px] text-primary">
                                {sortOrder === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </button>
                        </th>
                        {/* Entity ID */}
                        <th className="p-3 text-start font-medium">ID</th>
                        {/* Details */}
                        <th className="p-3 text-start font-medium">{t('details')}</th>
                        {/* IP Address */}
                        <th className="p-3 text-start font-medium">{t('ip_address')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => {
                        const actionStyle = getActionStyle(log.action);
                        const isExpanded = expandedId === log.id;

                        return (
                          <tr
                            key={log.id}
                            className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          >
                            <td className="p-3 text-xs whitespace-nowrap">
                              {formatDateTime(log.createdAt, isRTL)}
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-xs">{log.user?.fullName || '—'}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {log.user?.role || '—'}
                                </p>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge
                                variant="secondary"
                                className={cn('text-[11px] font-medium gap-1 px-2 py-0.5', actionStyle.bg, actionStyle.text)}
                              >
                                <span className="text-xs">{actionStyle.icon}</span>
                                {t(`action_${log.action}`) || log.action}
                              </Badge>
                            </td>
                            <td className="p-3 text-xs">{t(log.entity) || log.entity}</td>
                            <td className="p-3">
                              <code className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded font-mono">
                                {log.entityId ? (log.entityId.length > 8 ? log.entityId.slice(0, 8) + '...' : log.entityId) : '—'}
                              </code>
                            </td>
                            <td className="p-3">
                              <div className="max-w-[200px]">
                                <p className="text-xs text-muted-foreground truncate">
                                  {log.details || '—'}
                                </p>
                                {isExpanded && log.userAgent && (
                                  <p className="text-[10px] text-muted-foreground/60 mt-1 truncate">
                                    {log.userAgent}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <code className="text-[11px] text-muted-foreground font-mono">
                                {log.ipAddress || '—'}
                              </code>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                    <p className="text-xs text-muted-foreground">
                      {isRTL
                        ? `صفحه ${pagination.page} از ${pagination.totalPages} (${pagination.total} رکورد)`
                        : `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} records)`}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        disabled={pagination.page <= 1}
                        onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                      >
                        <ChevronLeft className="size-4" />
                      </Button>
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
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
                            variant={pagination.page === pageNum ? 'default' : 'outline'}
                            size="icon"
                            className="size-8 text-xs"
                            onClick={() => setPagination({ ...pagination, page: pageNum })}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default AuditLogPage;

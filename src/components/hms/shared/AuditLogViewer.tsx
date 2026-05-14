'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguageStore } from '@/store';
import { apiFetch } from '@/lib/fetcher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============================================================
// Types
// ============================================================

interface AuditLogUser {
  id: string;
  username: string;
  fullName: string;
  role: string;
}

interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: AuditLogUser;
}

interface AuditLogViewerProps {
  userId?: string;
  entity?: string;
  entityId?: string;
  limit?: number;
  compact?: boolean;
}

// ============================================================
// Action badge configuration
// ============================================================

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  create: { label: 'action_create', color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' },
  update: { label: 'action_update', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  delete: { label: 'action_delete', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  login: { label: 'action_login', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  logout: { label: 'action_logout', color: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  view: { label: 'action_view', color: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-900/30' },
};

function getActionStyle(action: string) {
  return ACTION_CONFIG[action] || { label: action, color: 'text-muted-foreground', bg: 'bg-muted' };
}

// ============================================================
// Component
// ============================================================

export function AuditLogViewer({
  userId,
  entity,
  entityId,
  limit: initialLimit = 20,
  compact = false,
}: AuditLogViewerProps) {
  const { t } = useLanguageStore();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const limit = initialLimit;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(limit),
        offset: String(offset),
      };
      if (userId) params.userId = userId;
      if (entity) params.entity = entity;
      if (entityId) params.entityId = entityId;
      if (actionFilter) params.action = actionFilter;

      const data = await apiFetch<{ auditLogs: AuditLogEntry[]; total: number }>(
        '/api/audit-logs',
        { params }
      );
      setLogs(data.auditLogs || []);
      setTotal(data.total || 0);
    } catch { setLogs([]); }
    setLoading(false);
  }, [userId, entity, entityId, actionFilter, offset, limit]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          limit: String(limit),
          offset: String(offset),
        };
        if (userId) params.userId = userId;
        if (entity) params.entity = entity;
        if (entityId) params.entityId = entityId;
        if (actionFilter) params.action = actionFilter;
        const data = await apiFetch<{ auditLogs: AuditLogEntry[]; total: number }>('/api/audit-logs', { params });
        if (!cancelled) {
          setLogs(data.auditLogs || []);
          setTotal(data.total || 0);
        }
      } catch {
        if (!cancelled) setLogs([]);
      }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [userId, entity, entityId, actionFilter, offset, limit]);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(fetchLogs, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs]);

  const hasMore = offset + limit < total;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  const actionOptions = [
    { value: '', label: 'all' },
    { value: 'create', label: 'action_create' },
    { value: 'update', label: 'action_update' },
    { value: 'delete', label: 'action_delete' },
    { value: 'login', label: 'action_login' },
    { value: 'logout', label: 'action_logout' },
    { value: 'view', label: 'action_view' },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="size-4 text-primary" />
          <h3 className={cn('font-semibold', compact ? 'text-sm' : 'text-base')}>{t('audit_log')}</h3>
          {total > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {total}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setOffset(0); }}>
            <SelectTrigger className={cn('w-32', compact ? 'h-7 text-[10px]' : 'h-8 text-xs')}>
              <SelectValue placeholder={t('filter')} />
            </SelectTrigger>
            <SelectContent>
              {actionOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="text-xs">{t(opt.label)}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size={compact ? 'sm' : 'default'}
            className={cn(compact && 'h-7 text-xs gap-1')}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={cn('size-3', autoRefresh && 'animate-spin')} />
            {!compact && (autoRefresh ? 'On' : 'Auto')}
          </Button>
          <Button
            variant="ghost"
            size={compact ? 'sm' : 'default'}
            className={cn(compact && 'h-7 text-xs')}
            onClick={fetchLogs}
            disabled={loading}
          >
            <RefreshCw className={cn('size-3', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Log Table */}
      <div className={cn('rounded-xl border bg-card overflow-hidden', compact ? '' : '')}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className={cn('font-medium text-muted-foreground px-3 py-2', compact ? 'text-[10px]' : 'text-xs')}>{t('time')}</th>
                <th className={cn('font-medium text-muted-foreground px-3 py-2', compact ? 'text-[10px]' : 'text-xs')}>{t('full_name')}</th>
                <th className={cn('font-medium text-muted-foreground px-3 py-2', compact ? 'text-[10px]' : 'text-xs')}>{t('actions')}</th>
                <th className={cn('font-medium text-muted-foreground px-3 py-2', compact ? 'text-[10px]' : 'text-xs')}>{t('entity')}</th>
                {!compact && (
                  <th className={cn('font-medium text-muted-foreground px-3 py-2', 'text-xs')}>{t('details')}</th>
                )}
                {!compact && (
                  <th className={cn('font-medium text-muted-foreground px-3 py-2', 'text-xs')}>{t('ip_address')}</th>
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={compact ? 4 : 6} className="text-center py-8 text-muted-foreground">
                      <Shield className="size-8 mx-auto mb-2 opacity-20" />
                      <p className={cn(compact ? 'text-[10px]' : 'text-xs')}>{t('no_data')}</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log, idx) => {
                    const actionStyle = getActionStyle(log.action);
                    const timeStr = new Date(log.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className={cn('px-3 py-2 whitespace-nowrap', compact ? 'text-[10px]' : 'text-xs text-muted-foreground')}>
                          {timeStr}
                        </td>
                        <td className={cn('px-3 py-2', compact ? 'text-[10px]' : 'text-xs')}>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{log.user?.fullName || log.userId}</span>
                            <Badge variant="outline" className="text-[8px] px-1 py-0">
                              {log.user?.role || '-'}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px] px-1.5 py-0 font-medium', actionStyle.bg, actionStyle.color)}
                          >
                            {t(actionStyle.label)}
                          </Badge>
                        </td>
                        <td className={cn('px-3 py-2', compact ? 'text-[10px]' : 'text-xs')}>
                          <span className="font-medium">{log.entity}</span>
                          {log.entityId && (
                            <span className="text-[10px] text-muted-foreground ms-1.5">#{log.entityId.slice(0, 6)}</span>
                          )}
                        </td>
                        {!compact && (
                          <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                            {log.details || '-'}
                          </td>
                        )}
                        {!compact && (
                          <td className="px-3 py-2 text-[10px] text-muted-foreground font-mono">
                            {log.ipAddress || '-'}
                          </td>
                        )}
                      </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30">
            <p className={cn('text-muted-foreground', compact ? 'text-[10px]' : 'text-xs')}>
              {currentPage} / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-7 text-xs', offset === 0 && 'opacity-40')}
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
              >
                <ChevronLeft className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-7 text-xs', !hasMore && 'opacity-40')}
                disabled={!hasMore}
                onClick={() => setOffset(offset + limit)}
              >
                <ChevronRight className="size-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLogViewer;

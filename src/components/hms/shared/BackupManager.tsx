'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguageStore } from '@/store';
import { apiFetch } from '@/lib/fetcher';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/hms/shared/ConfirmDialog';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Clock,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  CalendarDays,
  FileArchive,
  ToggleLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackupRecord {
  id: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  type: string;
  status: string;
  createdAt: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateStr: string, isRTL: boolean) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(isRTL ? 'fa-IR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function BackupManager() {
  const { t, isRTL } = useLanguageStore();

  // State
  const [records, setRecords] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-backup settings
  const [autoBackup, setAutoBackup] = useState(false);
  const [autoBackupFreq, setAutoBackupFreq] = useState<'daily' | 'weekly'>('daily');

  // Storage calculation
  const [storageUsed, setStorageUsed] = useState(0);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ records: BackupRecord[] }>('/api/backup');
      setRecords(data.records || []);

      // Calculate total storage
      const totalSize = (data.records || []).reduce((sum, r) => sum + r.fileSize, 0);
      setStorageUsed(totalSize);

      // Find last successful backup date
      const lastBackup = (data.records || []).find(
        (r) => r.status === 'completed' && r.type !== 'restore'
      );
      if (lastBackup) {
        setLastBackupDate(lastBackup.createdAt);
      }
    } catch {
      toast.error(t('error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Create backup
  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const data = await apiFetch<{
        success: boolean;
        message: string;
        record: BackupRecord;
        downloadUrl: string;
        fileSize: number;
      }>('/api/backup', { method: 'POST' });

      toast.success(data.message || t('saved'));
      fetchRecords();
    } catch {
      toast.error(t('error'));
    } finally {
      setCreating(false);
    }
  };

  // Download backup
  const handleDownload = (filePath: string) => {
    window.open(filePath, '_blank');
  };

  // Restore dialog handlers
  const openRestoreDialog = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setRestoreDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        toast.error('Please select a .zip file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const proceedRestore = () => {
    setRestoreDialogOpen(false);
    setConfirmRestoreOpen(true);
  };

  // Restore backup
  const handleRestore = async () => {
    if (!selectedFile) return;

    setRestoring(true);
    setConfirmRestoreOpen(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const data = await apiFetch<{
        success: boolean;
        message: string;
        totalRecordsImported: number;
      }>('/api/backup?action=restore', {
        method: 'POST',
        body: formData,
        noAuth: true,
      });

      toast.success(`${data.message} (${data.totalRecordsImported} records)`);
      fetchRecords();
    } catch {
      toast.error(t('error'));
    } finally {
      setRestoring(false);
    }
  };

  const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-6">
      {/* Header + Create Button */}
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Database className="size-5 text-primary" />
            {t('backup_system')}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t('backup_restore')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={openRestoreDialog}
            disabled={restoring}
          >
            <Upload className="size-4" />
            {t('restore_backup')}
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={handleCreateBackup}
            disabled={creating}
          >
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Database className="size-4" />
            )}
            {t('create_backup')}
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Last Backup */}
        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('last_backup')}</p>
                  <p className="text-sm font-medium">
                    {lastBackupDate ? formatDate(lastBackupDate, isRTL) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Storage Usage */}
        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/30">
                  <HardDrive className="size-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Storage</p>
                  <p className="text-sm font-medium">{formatFileSize(storageUsed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Total Backups */}
        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/30">
                  <FileArchive className="size-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('backup_history')}</p>
                  <p className="text-sm font-medium">{records.length} files</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Auto-Backup Settings */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <ToggleLeft className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t('automatic_backup')}</p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL
                      ? 'به صورت خودکار پشتیبان بگیرید'
                      : 'Automatically create backups'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={autoBackupFreq}
                  onValueChange={(v) => setAutoBackupFreq(v as 'daily' | 'weekly')}
                  disabled={!autoBackup}
                >
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">
                      {isRTL ? 'روزانه' : 'Daily'}
                    </SelectItem>
                    <SelectItem value="weekly">
                      {isRTL ? 'هفتگی' : 'Weekly'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Switch
                  checked={autoBackup}
                  onCheckedChange={setAutoBackup}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Restoring Overlay */}
      {restoring && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed rounded-xl border-primary/30 bg-primary/5"
        >
          <Loader2 className="size-10 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-medium">{t('restore_backup')}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isRTL
                ? 'لطفاً صبر کنید، در حال بازیابی...'
                : 'Please wait, restoring data...'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Backup Records Table */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="size-4" />
              {t('backup_history')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Database className="size-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">{t('no_data')}</p>
                <p className="text-xs mt-1">
                  {isRTL
                    ? 'هنوز پشتیبانی ایجاد نشده است'
                    : 'No backups created yet'}
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-start font-medium">{t('date')}</th>
                      <th className="p-3 text-start font-medium">{t('type')}</th>
                      <th className="p-3 text-start font-medium">{t('status')}</th>
                      <th className="p-3 text-start font-medium">Size</th>
                      <th className="p-3 text-start font-medium">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr
                        key={record.id}
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 text-xs">
                          {formatDate(record.createdAt, isRTL)}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              record.type === 'restore'
                                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                                : record.type === 'auto'
                                  ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/20 dark:text-sky-400'
                                  : 'border-primary/30 bg-primary/5 text-primary'
                            )}
                          >
                            {record.type === 'restore'
                              ? t('restore')
                              : record.type === 'auto'
                                ? t('automatic_backup')
                                : t('backup')}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {record.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                              <CheckCircle2 className="size-3.5" />
                              {t('completed')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400 text-xs font-medium">
                              <XCircle className="size-3.5" />
                              {t('failed')}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {formatFileSize(record.fileSize)}
                        </td>
                        <td className="p-3">
                          {record.status === 'completed' &&
                          record.type !== 'restore' &&
                          record.filePath ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleDownload(record.filePath)}
                            >
                              <Download className="size-3" />
                              {t('download')}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Restore File Dialog */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-5 text-amber-500" />
              {t('restore_backup')}
            </DialogTitle>
            <DialogDescription>
              {isRTL
                ? 'یک فایل پشتیبان (.zip) انتخاب کنید. تمام داده‌های فعلی جایگزین می‌شوند.'
                : 'Select a backup file (.zip). All current data will be replaced.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="size-5 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {isRTL
                  ? 'هشدار: این عملیات تمام داده‌های فعلی را پاک کرده و با داده‌های فایل پشتیبان جایگزین می‌کند. این عمل قابل بازگشت نیست.'
                  : 'Warning: This will erase all current data and replace it with backup data. This action cannot be undone.'}
              </p>
            </div>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleFileSelect}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileArchive className="size-5 text-primary" />
                  <span className="text-sm font-medium">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({formatFileSize(selectedFile.size)})
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="size-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? 'انتخاب فایل پشتیبان' : 'Select backup file'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    .zip {isRTL ? 'فایل' : 'file'}
                  </p>
                </>
              )}
            </div>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={!selectedFile}
              onClick={proceedRestore}
            >
              <RefreshCw className="size-4" />
              {t('restore_backup')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Restore Dialog */}
      <ConfirmDialog
        open={confirmRestoreOpen}
        onClose={() => setConfirmRestoreOpen(false)}
        onConfirm={handleRestore}
        title={t('restore_backup')}
        description={
          isRTL
            ? 'آیا مطمئن هستید؟ تمام داده‌های فعلی پاک و جایگزین خواهند شد.'
            : 'Are you sure? All current data will be erased and replaced.'
        }
        variant="danger"
      />
    </div>
  );
}

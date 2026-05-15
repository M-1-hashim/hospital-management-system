'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListOrdered,
  Plus,
  Megaphone,
  CheckCircle2,
  Trash2,
  Search,
  Filter,
  UserPlus,
  Volume2,
  VolumeX,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CollapsiblePanel } from '@/components/hms/shared/CollapsiblePanel';
import { StatusBadge } from '@/components/hms/shared/StatusBadge';
import { QueueDisplay, type QueueEntry } from '@/components/hms/shared/QueueDisplay';
import { useLanguageStore } from '@/store';
import { apiFetch } from '@/lib/fetcher';
import { cn } from '@/lib/utils';
import { playNotificationSound } from '@/lib/notification-sound';
import { announcePatient, stopAnnouncement, isAnnouncing } from '@/lib/voice-announce';

// ============================================================
// Types
// ============================================================

type PriorityFilter = 'all' | 'normal' | 'urgent' | 'emergency';

interface Department {
  id: string;
  name: string;
  nameFa: string;
}

// ============================================================
// Constants
// ============================================================

const DEPARTMENTS = ['General', 'Emergency', 'Internal Medicine', 'Surgery', 'Pediatrics', 'OB/GYN'];

const DEPARTMENT_FA: Record<string, string> = {
  'General': 'عمومی',
  'Emergency': 'اورژانس',
  'Internal Medicine': 'داخلی',
  'Surgery': 'جراحی',
  'Pediatrics': 'اطفال',
  'OB/GYN': 'زنان و زایمان',
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

// ============================================================
// Main Component
// ============================================================

export default function QueuePage() {
  const { t, isRTL, locale } = useLanguageStore();
  const soundEnabledRef = useRef(true);
  const voiceEnabledRef = useRef(true);

  const [queues, setQueues] = useState<QueueEntry[]>([]);
  const [selectedDept, setSelectedDept] = useState('General');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPriority, setWalkInPriority] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [submitting, setSubmitting] = useState(false);
  const [calling, setCalling] = useState(false);
  const [announcing, setAnnouncing] = useState(false);

  // ── Fetch Queues ──────────────────────────────────────────

  const fetchQueues = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (selectedDept) params.department = selectedDept;

      const data = await apiFetch<{ queues: QueueEntry[] }>('/api/queue', { params });
      setQueues(data.queues || []);
    } catch {
      setQueues([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDept]);

  useEffect(() => {
    setLoading(true);
    fetchQueues();
    const interval = setInterval(fetchQueues, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchQueues]);

  // ── Derived State ─────────────────────────────────────────

  const filteredQueues = queues.filter((q) => {
    if (priorityFilter !== 'all' && q.priority !== priorityFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !q.patientName.toLowerCase().includes(query) &&
        !String(q.queueNumber).includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  const waitingQueues = filteredQueues.filter((q) => q.status === 'waiting');
  const calledQueues = filteredQueues.filter((q) => q.status === 'called');
  const completedQueues = filteredQueues.filter((q) => q.status === 'completed');

  const currentServing = calledQueues.length > 0 ? calledQueues[0] : null;
  const nextInLine = waitingQueues.slice(0, 3);

  // ── Voice Announcement Helper ─────────────────────────────

  const speakQueueNumber = useCallback((entry: QueueEntry) => {
    if (!voiceEnabledRef.current) return;
    setAnnouncing(true);

    announcePatient({
      queueNumber: entry.queueNumber,
      patientName: entry.patientName,
      department: selectedDept,
      locale: locale === 'fa' ? 'fa' : 'en',
      repeatCount: 2,
      speed: locale === 'fa' ? 0.85 : 0.95,
      volume: 1,
    }).then(() => {
      setAnnouncing(false);
    }).catch(() => {
      setAnnouncing(false);
    });
  }, [selectedDept, locale]);

  // ── Handlers ──────────────────────────────────────────────

  const handleCallNext = useCallback(async () => {
    setCalling(true);
    try {
      const called = await apiFetch<{ queue: QueueEntry }>('/api/queue', {
        method: 'PUT',
        params: { id: currentServing?.id || '' },
        body: { action: 'call_next' },
      });
      if (called.queue) {
        toast.success(`${t('queue_called')}: #${String(called.queue.queueNumber).padStart(3, '0')} — ${called.queue.patientName}`);
        // Play notification sound
        if (soundEnabledRef.current) {
          playNotificationSound('appointment');
        }
        // Voice announcement
        speakQueueNumber(called.queue);
      }
      fetchQueues();
    } catch (error) {
      toast.error(t('error'));
    } finally {
      setCalling(false);
    }
  }, [currentServing, fetchQueues, t, speakQueueNumber]);

  const handleRecall = useCallback(() => {
    if (!currentServing) return;
    if (soundEnabledRef.current) {
      playNotificationSound('appointment');
    }
    speakQueueNumber(currentServing);
  }, [currentServing, speakQueueNumber]);

  const handleStopAnnouncement = useCallback(() => {
    stopAnnouncement();
    setAnnouncing(false);
    toast.info(isRTL ? 'صدای اعلان متوقف شد' : 'Announcement stopped');
  }, [isRTL]);

  const handleComplete = useCallback(async () => {
    if (!currentServing) return;
    stopAnnouncement();
    try {
      await apiFetch('/api/queue', {
        method: 'PUT',
        params: { id: currentServing.id },
        body: { action: 'complete' },
      });
      toast.success(t('completed'));
      fetchQueues();
    } catch {
      toast.error(t('error'));
    }
  }, [currentServing, fetchQueues, t]);

  const handleRemove = useCallback(async (id: string) => {
    try {
      await apiFetch('/api/queue', {
        method: 'DELETE',
        params: { id },
      });
      toast.success(t('deleted'));
      fetchQueues();
    } catch {
      toast.error(t('error'));
    }
  }, [fetchQueues, t]);

  const handleAddWalkIn = useCallback(async () => {
    if (!walkInName.trim()) {
      toast.error(t('fill_required_fields'));
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/api/queue', {
        method: 'POST',
        body: {
          patientName: walkInName.trim(),
          department: selectedDept,
          priority: walkInPriority,
        },
      });
      toast.success(t('added'));
      setWalkInName('');
      setWalkInPriority('normal');
      setWalkInOpen(false);
      fetchQueues();
    } catch {
      toast.error(t('error'));
    } finally {
      setSubmitting(false);
    }
  }, [walkInName, walkInPriority, selectedDept, fetchQueues, t]);

  // ── Loading ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-[500px] w-full rounded-2xl" />
          <Skeleton className="h-[500px] w-full rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('queue')}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('queue_display')}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                soundEnabledRef.current = !soundEnabledRef.current;
                toast.info(soundEnabledRef.current
                  ? (isRTL ? 'صدای اعلان روشن شد' : 'Sound enabled')
                  : (isRTL ? 'صدای اعلان خاموش شد' : 'Sound muted')
                );
              }}
              title={soundEnabledRef.current
                ? (isRTL ? 'قطع صدا' : 'Mute sound')
                : (isRTL ? 'وصل صدا' : 'Enable sound')
              }
            >
              {soundEnabledRef.current ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </Button>
            {/* Voice Announcement Toggle */}
            <Button
              variant="outline"
              size="icon"
              className={cn(
                'gap-1',
                voiceEnabledRef.current && 'border-primary text-primary bg-primary/10'
              )}
              onClick={() => {
                voiceEnabledRef.current = !voiceEnabledRef.current;
                toast.info(voiceEnabledRef.current
                  ? (isRTL ? 'صدای بلند فعال شد' : 'Voice announcement enabled')
                  : (isRTL ? 'صدای بلند غیرفعال شد' : 'Voice announcement disabled')
                );
              }}
              title={voiceEnabledRef.current
                ? (isRTL ? 'خاموش کردن صدای فارسی' : 'Disable voice')
                : (isRTL ? 'فعال کردن صدای فارسی' : 'Enable voice')
              }
            >
              <Megaphone className="size-4" />
            </Button>
            {/* Walk-in Patient */}
            <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setWalkInOpen(true)}>
              <UserPlus className="size-4" />
              {t('walk_in_patient')}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Department Selector ────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-wrap gap-2">
          {DEPARTMENTS.map((dept) => (
            <Button
              key={dept}
              variant={selectedDept === dept ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDept(dept)}
              className={cn(
                'rounded-xl',
                selectedDept === dept && 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              {isRTL ? (DEPARTMENT_FA[dept] || dept) : dept}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* ── Stats Cards ───────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/50">
                <Clock className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{waitingQueues.length}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? 'در انتظار' : 'Waiting'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/50">
                <Megaphone className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{calledQueues.length}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? 'فراخوانی شده' : 'Called'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{completedQueues.length}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? 'تکمیل شده' : 'Completed'}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/50">
                <ListOrdered className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{queues.length}</p>
                <p className="text-xs text-muted-foreground">{isRTL ? 'مجموع' : 'Total'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Main Grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Queue Display */}
        <motion.div variants={itemVariants} className="lg:col-span-4">
          <QueueDisplay
            department={selectedDept}
            currentServing={currentServing}
            nextInLine={nextInLine}
            totalWaiting={waitingQueues.length}
            onCallNext={handleCallNext}
            onComplete={handleComplete}
            announcing={announcing}
            departmentFa={DEPARTMENT_FA[selectedDept] || selectedDept}
          />

          {/* Recall / Stop Announcement Buttons */}
          {currentServing && (
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                className={cn(
                  'flex-1 gap-2 text-sm',
                  announcing && 'animate-pulse border-primary text-primary'
                )}
                onClick={announcing ? handleStopAnnouncement : handleRecall}
                disabled={calling}
              >
                {announcing ? (
                  <>
                    <VolumeX className="size-4" />
                    {isRTL ? 'توقف' : 'Stop'}
                  </>
                ) : (
                  <>
                    <RotateCcw className="size-4" />
                    {isRTL ? 'دوباره صدا بزن' : 'Recall'}
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>

        {/* Right: Patient List */}
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <CollapsiblePanel
            id="queue-patient-list"
            title={t('waiting_queue')}
            icon={ListOrdered}
            badge={`${waitingQueues.length} ${t('waiting_queue').toLowerCase()}`}
          >
            {/* Filters */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-xs flex-1">
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('search_patients')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-9"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-muted-foreground" />
                {(['all', 'normal', 'urgent', 'emergency'] as PriorityFilter[]).map((p) => (
                  <Button
                    key={p}
                    variant={priorityFilter === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriorityFilter(p)}
                    className={cn(
                      'h-7 rounded-lg px-2.5 text-xs',
                      priorityFilter === p && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {p === 'all' ? t('all') : t(`priority_${p}`)}
                  </Button>
                ))}
              </div>
            </div>

            {/* Patient List */}
            <div className="max-h-[420px] overflow-y-auto">
              {filteredQueues.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr className="border-b">
                      <th className="px-3 py-2.5 text-start font-medium text-muted-foreground">#</th>
                      <th className="px-3 py-2.5 text-start font-medium text-muted-foreground">{t('name')}</th>
                      <th className="hidden px-3 py-2.5 text-start font-medium text-muted-foreground sm:table-cell">{t('priority')}</th>
                      <th className="px-3 py-2.5 text-start font-medium text-muted-foreground">{t('status')}</th>
                      <th className="px-3 py-2.5 text-start font-medium text-muted-foreground">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredQueues.map((entry) => (
                        <motion.tr
                          key={entry.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            'border-b transition-colors hover:bg-muted/50 last:border-b-0',
                            entry.status === 'called' && 'bg-primary/5 border-l-4 border-l-primary'
                          )}
                        >
                          <td className="px-3 py-3">
                            <Badge variant="outline" className="font-mono text-xs">
                              {String(entry.queueNumber).padStart(3, '0')}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-medium text-foreground">{entry.patientName}</span>
                            {entry.status === 'called' && (
                              <span className="ml-2 inline-flex items-center gap-1">
                                <Megaphone className="size-3 text-primary animate-pulse" />
                                <span className="text-[10px] text-primary font-medium">
                                  {isRTL ? 'فراخوانی' : 'CALLED'}
                                </span>
                              </span>
                            )}
                          </td>
                          <td className="hidden px-3 py-3 sm:table-cell">
                            <PriorityBadge priority={entry.priority} />
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={entry.status} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              {entry.status === 'called' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                    onClick={() => handleComplete()}
                                    title={t('completed')}
                                  >
                                    <CheckCircle2 className="size-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                    onClick={() => speakQueueNumber(entry)}
                                    title={isRTL ? 'صدا زدن' : 'Announce'}
                                  >
                                    <Megaphone className="size-3.5" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                                onClick={() => handleRemove(entry.id)}
                                title={t('delete')}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <ListOrdered className="mb-2 size-10 opacity-40" />
                  <p className="text-sm">{t('no_patients_in_queue')}</p>
                </div>
              )}
            </div>
          </CollapsiblePanel>
        </motion.div>
      </div>

      {/* ── Walk-in Dialog ─────────────────────────────────── */}
      <AnimatePresence>
        {walkInOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setWalkInOpen(false)}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-foreground">{t('walk_in_patient')}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {isRTL ? DEPARTMENT_FA[selectedDept] : selectedDept}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">{t('name')}</label>
                    <Input
                      placeholder={t('name')}
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddWalkIn()}
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">{t('priority')}</label>
                    <div className="flex gap-2">
                      {(['normal', 'urgent', 'emergency'] as const).map((p) => (
                        <Button
                          key={p}
                          variant={walkInPriority === p ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setWalkInPriority(p)}
                          className={cn(
                            'flex-1 rounded-xl',
                            walkInPriority === p
                              ? p === 'emergency'
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : p === 'urgent'
                                  ? 'bg-amber-500 text-white hover:bg-amber-600'
                                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : '',
                          )}
                        >
                          {t(`priority_${p}`)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setWalkInOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button
                    className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleAddWalkIn}
                    disabled={!walkInName.trim() || submitting}
                  >
                    {submitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="size-4 rounded-full border-2 border-current border-t-transparent"
                      />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {t('add')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================
// Sub-Components
// ============================================================

function PriorityBadge({ priority }: { priority: string }) {
  const { t } = useLanguageStore();
  const colorMap: Record<string, string> = {
    normal: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
    urgent: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
    emergency: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  };
  return (
    <Badge variant="outline" className={cn('text-xs', colorMap[priority] || colorMap.normal)}>
      {t(`priority_${priority}` as 'priority_normal' | 'priority_urgent' | 'priority_emergency')}
    </Badge>
  );
}

'use client';

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  toPersianDigits,
  getShamsiMonthName,
  getCurrentTripleDate,
  jalaliToGregorian,
  gregorianToJalali,
  getJalaliMonthDays,
} from '@/lib/calendar-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Trash2,
  Gift,
  Bell,
  Edit3,
  BookOpen,
  StickyNote,
  Cake,
  Download,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface Note {
  id: string;
  title: string;
  content: string;
  date: string; // ISO date string
  type: 'birthday' | 'general' | 'baluch' | 'reminder';
  shamsiMonth?: number;
  shamsiDay?: number;
  recurrence?: 'none' | 'weekly' | 'monthly' | 'yearly';
  reminderAt?: string; // ISO datetime — for countdown
  createdAt: string;
}

interface NotesTabProps {
  isDark: boolean;
  themeColor: string;
  themeGradient: string;
}

// ============================================
// Constants
// ============================================

const STORAGE_KEY = 'baluchistan-nama-notes';

const TYPE_CONFIG: Record<
  Note['type'],
  { label: string; icon: React.ReactNode; borderColor: string; bgClass: string; badgeClass: string }
> = {
  birthday: {
    label: 'تولد',
    icon: <Cake className="h-3.5 w-3.5" />,
    borderColor: 'border-r-pink-500',
    bgClass: 'bg-pink-50 dark:bg-pink-950/20',
    badgeClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300 border-pink-200 dark:border-pink-800',
  },
  general: {
    label: 'عمومی',
    icon: <StickyNote className="h-3.5 w-3.5" />,
    borderColor: 'border-r-[--theme-color]',
    bgClass: '',
    badgeClass: '',
  },
  baluch: {
    label: 'بلوچی',
    icon: <BookOpen className="h-3.5 w-3.5" />,
    borderColor: 'border-r-purple-500',
    bgClass: 'bg-purple-50 dark:bg-purple-950/20',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  reminder: {
    label: 'یادآوری',
    icon: <Bell className="h-3.5 w-3.5" />,
    borderColor: 'border-r-amber-500',
    bgClass: 'bg-amber-50 dark:bg-amber-950/20',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
};

// ============================================
// Helpers
// ============================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function loadNotes(): Note[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes: Note[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Storage full or unavailable
  }
}

/** Days until a given Shamsi month/day from today */
function daysUntilShamsiDate(
  currentShamsi: { year: number; month: number; day: number },
  targetMonth: number,
  targetDay: number
): number | null {
  if (!targetMonth || !targetDay) return null;
  const todayGreg = jalaliToGregorian(
    currentShamsi.year,
    currentShamsi.month,
    currentShamsi.day
  );
  const today = new Date(todayGreg.gy, todayGreg.gm - 1, todayGreg.gd);

  // Try current year first
  let targetGreg = jalaliToGregorian(currentShamsi.year, targetMonth, targetDay);
  let target = new Date(targetGreg.gy, targetGreg.gm - 1, targetGreg.gd);

  let diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // If already passed this year, try next year
  if (diff < 0) {
    targetGreg = jalaliToGregorian(currentShamsi.year + 1, targetMonth, targetDay);
    target = new Date(targetGreg.gy, targetGreg.gm - 1, targetGreg.gd);
    diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return diff;
}

function formatNoteDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const { jy, jm, jd } = gregorianToJalali(
      d.getFullYear(),
      d.getMonth() + 1,
      d.getDate()
    );
    return `${toPersianDigits(jd)} ${getShamsiMonthName(jm)} ${toPersianDigits(jy)}`;
  } catch {
    return isoDate;
  }
}

/** فرمت شمارشگر معکوس تا یک زمان هدف (ISO) */
function formatCountdown(targetISO: string, nowMs: number): string | null {
  const target = new Date(targetISO).getTime();
  if (isNaN(target)) return null;
  let diff = Math.floor((target - nowMs) / 1000);
  if (diff < 0) return 'گذشت';
  const d = Math.floor(diff / 86400); diff %= 86400;
  const h = Math.floor(diff / 3600); diff %= 3600;
  const m = Math.floor(diff / 60); const s = diff % 60;
  const p = (n: number) => toPersianDigits(String(n).padStart(2, '0'));
  if (d > 0) return `${p(d)} روز و ${p(h)}:${p(m)}:${p(s)}`;
  return `${p(h)}:${p(m)}:${p(s)}`;
}

// ============================================
// Component
// ============================================

export default function NotesTab({ isDark, themeColor, themeGradient }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>(() => loadNotes());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formType, setFormType] = useState<Note['type']>('general');
  const [formShamsiMonth, setFormShamsiMonth] = useState<string>('');
  const [formShamsiDay, setFormShamsiDay] = useState<string>('');
  const [formRecurrence, setFormRecurrence] = useState<Note['recurrence']>('none');
  const [formReminderAt, setFormReminderAt] = useState<string>('');

  // تیکر زنده برای شمارشگرهای معکوس
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Persist on change
  useEffect(() => {
    saveNotes(notes);
  }, [notes]);

  // ── Birthday / Reminder alerts ──
  useEffect(() => {
    const { shamsi } = getCurrentTripleDate();
    const alerts: string[] = [];

    notes.forEach((note) => {
      if (
        (note.type === 'birthday' || note.type === 'reminder') &&
        note.shamsiMonth &&
        note.shamsiDay
      ) {
        if (note.shamsiMonth === shamsi.month && note.shamsiDay === shamsi.day) {
          if (note.type === 'birthday') {
            alerts.push(`🎂 تولد ${note.title} مبارک!`);
          } else {
            alerts.push(`🔔 یادآوری: ${note.title}`);
          }
        }
      }
    });

    alerts.forEach((msg, i) => {
      setTimeout(() => {
        toast.success(msg, { duration: 6000 });
      }, i * 800);
    });
  }, [notes]);

  // ── Upcoming birthdays ──
  const upcomingBirthdays = useMemo(() => {
    const { shamsi } = getCurrentTripleDate();
    return notes
      .filter((n) => n.type === 'birthday' && n.shamsiMonth && n.shamsiDay)
      .map((n) => {
        const days = daysUntilShamsiDate(shamsi, n.shamsiMonth!, n.shamsiDay!);
        return { ...n, daysUntil: days };
      })
      .filter((n) => n.daysUntil !== null && n.daysUntil >= 0 && n.daysUntil <= 30)
      .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));
  }, [notes]);

  // Today's birthdays
  const todayBirthdays = useMemo(() => {
    const { shamsi } = getCurrentTripleDate();
    return notes.filter(
      (n) =>
        n.type === 'birthday' &&
        n.shamsiMonth === shamsi.month &&
        n.shamsiDay === shamsi.day
    );
  }, [notes]);

  // ── Form helpers ──
  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormContent('');
    setFormType('general');
    setFormShamsiMonth('');
    setFormShamsiDay('');
    setFormRecurrence('none');
    setFormReminderAt('');
    setEditingNote(null);
  }, []);

  const openEdit = useCallback((note: Note) => {
    setEditingNote(note);
    setFormTitle(note.title);
    setFormContent(note.content);
    setFormType(note.type);
    setFormShamsiMonth(note.shamsiMonth ? String(note.shamsiMonth) : '');
    setFormShamsiDay(note.shamsiDay ? String(note.shamsiDay) : '');
    setFormRecurrence(note.recurrence || 'none');
    setFormReminderAt(note.reminderAt ? note.reminderAt.slice(0, 16) : '');
    setSheetOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!formTitle.trim()) {
      toast.error('لطفاً عنوان یادداشت را وارد کنید');
      return;
    }

    if (editingNote) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNote.id
            ? {
                ...n,
                title: formTitle.trim(),
                content: formContent.trim(),
                type: formType,
                shamsiMonth: formShamsiMonth ? Number(formShamsiMonth) : undefined,
                shamsiDay: formShamsiDay ? Number(formShamsiDay) : undefined,
                recurrence: formRecurrence,
                reminderAt: formReminderAt ? new Date(formReminderAt).toISOString() : undefined,
              }
            : n
        )
      );
      toast.success('یادداشت بروزرسانی شد');
    } else {
      const newNote: Note = {
        id: generateId(),
        title: formTitle.trim(),
        content: formContent.trim(),
        date: new Date().toISOString(),
        type: formType,
        shamsiMonth: formShamsiMonth ? Number(formShamsiMonth) : undefined,
        shamsiDay: formShamsiDay ? Number(formShamsiDay) : undefined,
        recurrence: formRecurrence,
        reminderAt: formReminderAt ? new Date(formReminderAt).toISOString() : undefined,
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => [newNote, ...prev]);
      toast.success('یادداشت ذخیره شد');
    }

    resetForm();
    setSheetOpen(false);
  }, [editingNote, formTitle, formContent, formType, formShamsiMonth, formShamsiDay, formRecurrence, resetForm]);

  const handleDelete = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.success('یادداشت حذف شد');
  }, []);

  // ── Export / Import backup ──
  const exportNotes = useCallback(() => {
    try {
      const data = JSON.stringify(notes, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `baluchistan-nama-notes-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('یادداشت‌ها ذخیره (خروجی) شدند');
    } catch {
      toast.error('خطا در خروجی گرفتن یادداشت‌ها');
    }
  }, [notes]);

  const importRef = useRef<HTMLInputElement>(null);
  const importNotes = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (Array.isArray(parsed)) {
          setNotes((prev) => {
            const merged = [...parsed];
            prev.forEach((n) => {
              if (!merged.find((m: Note) => m.id === n.id)) merged.push(n);
            });
            return merged;
          });
          toast.success('یادداشت‌ها با موفقیت وارد شدند');
        } else {
          toast.error('فرمت فایل معتبر نیست');
        }
      } catch {
        toast.error('خطا در خواندن فایل');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  // Available days for selected month
  const availableDays = useMemo(() => {
    const { shamsi } = getCurrentTripleDate();
    const m = formShamsiMonth ? Number(formShamsiMonth) : 0;
    if (!m) return 31;
    return getJalaliMonthDays(shamsi.year, m);
  }, [formShamsiMonth]);

  // Sorted notes for display
  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notes]
  );

  // ── Render ──
  return (
    <div className="space-y-4 px-1" dir="rtl">
      {/* ── Birthday Celebration Banner ── */}
      {todayBirthdays.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: themeGradient }}>
          <div className="absolute -top-4 -left-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-2 -right-2 h-14 w-14 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Cake className="h-6 w-6" />
              <h3 className="text-lg font-bold">تولد مبارک! 🎉</h3>
            </div>
            {todayBirthdays.map((n) => (
              <p key={n.id} className="text-sm text-white/90">
                🎂 {n.title}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Upcoming Birthdays ── */}
      {upcomingBirthdays.length > 0 && (
        <div
          className={cn(
            'rounded-2xl border p-4',
            isDark
              ? 'border-pink-800/40 bg-pink-950/20'
              : 'border-pink-200 bg-pink-50/60'
          )}
        >
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-pink-700 dark:text-pink-300">
            <Gift className="h-4 w-4" />
            تولدهای پیش رو
          </h3>
          <div className="space-y-2">
            {upcomingBirthdays.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'flex items-center justify-between rounded-xl px-3 py-2',
                  n.daysUntil === 0
                    ? isDark
                      ? 'bg-pink-800/30 ring-2 ring-pink-500/50'
                      : 'bg-pink-100 ring-2 ring-pink-300'
                    : isDark
                      ? 'bg-white/5'
                      : 'bg-white/60'
                )}
              >
                <div className="flex items-center gap-2">
                  <Cake className="h-3.5 w-3.5 text-pink-500" />
                  <span className="text-sm font-medium">{n.title}</span>
                </div>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    n.daysUntil === 0
                      ? 'bg-pink-500 text-white'
                      : n.daysUntil <= 7
                        ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  )}
                >
                  {n.daysUntil === 0
                    ? 'امروز!'
                    : `${toPersianDigits(n.daysUntil)} روز مانده`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Notes List Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <StickyNote className="h-5 w-5" style={{ color: themeColor }} />
          یادداشت‌ها
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-100 text-slate-500'
            )}
          >
            {toPersianDigits(notes.length)}
          </span>
        </h2>

        {/* Backup buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={exportNotes}
            className={cn(
              'rounded-lg p-2 transition-colors',
              isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            )}
            aria-label="خروجی گرفتن از یادداشت‌ها"
            title="خروجی (بکاپ)"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className={cn(
              'rounded-lg p-2 transition-colors',
              isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            )}
            aria-label="وارد کردن یادداشت‌ها"
            title="ورودی (بازیابی)"
          >
            <Upload className="h-4 w-4" />
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json"
            onChange={importNotes}
            className="hidden"
          />
        </div>

        {/* Add Button */}
        <Sheet
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open);
            if (!open) resetForm();
          }}
        >
          <SheetTrigger asChild>
            <Button
              size="sm"
              className="rounded-xl text-white shadow-md"
              style={{ background: themeGradient }}
            >
              <Plus className="ml-1.5 h-4 w-4" />
              یادداشت جدید
            </Button>
          </SheetTrigger>

          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-right">
                {editingNote ? 'ویرایش یادداشت' : 'یادداشت جدید'}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4 pb-8">
              {/* Title */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">عنوان</label>
                <Input
                  placeholder="عنوان یادداشت..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="rounded-xl text-right"
                />
              </div>

              {/* Content */}
              <div>
                <label className="mb-1.5 block text-sm font-medium">متن یادداشت</label>
                <Textarea
                  placeholder="متن یادداشت خود را بنویسید..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={4}
                  className="rounded-xl text-right resize-none"
                />
              </div>

              {/* Type selector */}
              <div>
                <label className="mb-2 block text-sm font-medium">نوع</label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['general', StickyNote, 'عمومی'],
                      ['birthday', Cake, 'تولد'],
                      ['baluch', BookOpen, 'بلوچی'],
                      ['reminder', Bell, 'یادآوری'],
                    ] as const
                  ).map(([type, Icon, label]) => {
                    const cfg = TYPE_CONFIG[type];
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormType(type)}
                        className={cn(
                          'flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all',
                          formType === type
                            ? cfg.badgeClass + ' border-current'
                            : isDark
                              ? 'border-slate-700 text-slate-400 hover:border-slate-600'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Shamsi date (for birthday/reminder) */}
              {(formType === 'birthday' || formType === 'reminder') && (
                <div
                  className={cn(
                    'rounded-xl border p-4',
                    isDark
                      ? 'border-slate-700 bg-slate-800/50'
                      : 'border-slate-200 bg-slate-50'
                  )}
                >
                  <label className="mb-2.5 block text-sm font-medium">
                    {formType === 'birthday' ? 'تاریخ تولد شمسی' : 'تاریخ یادآوری شمسی'}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">ماه</label>
                      <Select value={formShamsiMonth} onValueChange={setFormShamsiMonth}>
                        <SelectTrigger className="rounded-xl text-right">
                          <SelectValue placeholder="انتخاب ماه" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <SelectItem key={m} value={String(m)}>
                              {getShamsiMonthName(m)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">روز</label>
                      <Select value={formShamsiDay} onValueChange={setFormShamsiDay}>
                        <SelectTrigger className="rounded-xl text-right">
                          <SelectValue placeholder="انتخاب روز" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: availableDays }, (_, i) => i + 1).map(
                            (d) => (
                              <SelectItem key={d} value={String(d)}>
                                {toPersianDigits(d)}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Recurrence selector */}
              {(formType === 'reminder' || formType === 'baluch') && (
                <div className={cn(
                  'rounded-xl border p-4',
                  isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
                )}>
                  <label className="mb-2.5 block text-sm font-medium">تکرار</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([['none', 'بدون تکرار'], ['weekly', 'هفتگی'], ['monthly', 'ماهانه'], ['yearly', 'سالانه']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormRecurrence(val)}
                        className={cn(
                          'rounded-lg px-3 py-2 text-xs font-medium transition-all border',
                          formRecurrence === val
                            ? 'border-current text-white'
                            : isDark
                              ? 'border-slate-700 text-slate-400 hover:border-slate-600'
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        )}
                        style={formRecurrence === val ? { background: themeGradient, borderColor: themeColor } : {}}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* شمارشگر معکوس / زمان یادآوری */}
              {(formType === 'reminder' || formType === 'general' || formType === 'baluch') && (
                <div className={cn(
                  'rounded-xl border p-4',
                  isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
                )}>
                  <label className="mb-2 block text-sm font-medium">⏳ زمان یادآوری (شمارشگر معکوس)</label>
                  <input
                    type="datetime-local"
                    value={formReminderAt}
                    onChange={(e) => setFormReminderAt(e.target.value)}
                    className={cn(
                      'w-full rounded-lg px-3 py-2 text-sm border',
                      isDark ? 'bg-slate-900/60 text-slate-100 border-slate-700' : 'bg-white text-slate-800 border-slate-200'
                    )}
                  />
                  <p className="mt-1.5 text-[11px] opacity-60">با تنظیم زمان، شمارشگر معکوس لحظه‌ای در کارت یادداشت نمایش داده می‌شود.</p>
                </div>
              )}

              {/* Save button */}
              <Button
                className="w-full rounded-xl text-white shadow-md"
                style={{ background: themeGradient }}
                onClick={handleSave}
              >
                <Edit3 className="ml-2 h-4 w-4" />
                {editingNote ? 'بروزرسانی' : 'ذخیره یادداشت'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── Notes List ── */}
      {sortedNotes.length === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10',
            isDark
              ? 'border-slate-700 text-slate-500'
              : 'border-slate-200 text-slate-400'
          )}
        >
          <StickyNote className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">هنوز یادداشتی ندارید</p>
          <p className="mt-1 text-xs opacity-70">برای شروع دکمه «یادداشت جدید» را بزنید</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar">
          {sortedNotes.map((note) => {
            const cfg = TYPE_CONFIG[note.type];
            const isGeneral = note.type === 'general';
            return (
              <div
                key={note.id}
                className={cn(
                  'group relative rounded-xl border-r-4 p-4 transition-all duration-200',
                  isDark
                    ? 'bg-white/5 hover:bg-white/8 border border-white/10'
                    : 'bg-white/80 hover:bg-white border border-slate-100',
                  cfg.borderColor,
                  !isGeneral && cfg.bgClass
                )}
                style={
                  isGeneral
                    ? ({ borderRightColor: themeColor } as React.CSSProperties)
                    : undefined
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h4 className="text-sm font-bold truncate">{note.title}</h4>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] px-1.5 py-0',
                          isGeneral
                            ? isDark
                              ? 'bg-white/10 text-slate-300 border-white/20'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                            : cfg.badgeClass
                        )}
                      >
                        {cfg.icon}
                        {cfg.label}
                      </Badge>
                    </div>
                    {note.content && (
                      <p
                        className={cn(
                          'text-sm leading-6 line-clamp-2',
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        )}
                      >
                        {note.content.length > 60
                          ? note.content.substring(0, 60) + '...'
                          : note.content}
                      </p>
                    )}
                    {note.recurrence && note.recurrence !== 'none' && (
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full inline-block ml-1',
                        isDark ? 'bg-green-900/30 text-green-400' : 'bg-green-50 text-green-700'
                      )}>
                        {note.recurrence === 'weekly' ? 'هفتگی' : note.recurrence === 'monthly' ? 'ماهانه' : 'سالانه'}
                      </span>
                    )}
                    {note.reminderAt &&
                      (() => {
                        const cd = formatCountdown(note.reminderAt, nowMs);
                        if (!cd) return null;
                        const passed = cd === 'گذشت';
                        return (
                          <div
                            className={cn(
                              'mt-2 flex items-center gap-1.5 text-xs font-bold',
                              passed
                                ? isDark
                                  ? 'text-red-400'
                                  : 'text-red-500'
                                : isDark
                                  ? 'text-amber-300'
                                  : 'text-amber-600'
                            )}
                          >
                            <span>⏳</span>
                            <span>{passed ? 'یادآوری زمان گذشت' : `مانده: ${cd}`}</span>
                          </div>
                        );
                      })()}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'text-[11px]',
                          isDark ? 'text-slate-600' : 'text-slate-400'
                        )}
                      >
                        {formatNoteDate(note.date)}
                      </span>
                      {note.shamsiMonth && note.shamsiDay && (
                        <span
                          className={cn(
                            'text-[11px] px-1.5 py-0.5 rounded-full',
                            isDark
                              ? 'bg-white/5 text-slate-500'
                              : 'bg-slate-50 text-slate-400'
                          )}
                        >
                          {toPersianDigits(note.shamsiDay)}{' '}
                          {getShamsiMonthName(note.shamsiMonth)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(note)}
                      className={cn(
                        'rounded-lg p-1.5 transition-colors',
                        isDark
                          ? 'hover:bg-white/10 text-slate-400'
                          : 'hover:bg-slate-100 text-slate-400'
                      )}
                      aria-label="ویرایش"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className={cn(
                        'rounded-lg p-1.5 transition-colors',
                        isDark
                          ? 'hover:bg-red-900/30 text-red-400'
                          : 'hover:bg-red-50 text-red-400'
                      )}
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

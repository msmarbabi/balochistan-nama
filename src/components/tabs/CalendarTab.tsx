'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  gregorianToJalali,
  jalaliToGregorian,
  gregorianToHijri,
  getJalaliMonthDays,
  getFirstDayOfMonth,
  toPersianDigits,
  SHAMSI_MONTH_NAMES,
  QAMARI_MONTH_NAMES,
  PERSIAN_DAY_NAMES,
  GREGORIAN_MONTH_NAMES,
  getPersianDayName,
  type TripleDate,
} from '@/lib/calendar-utils';
import { getDayInfo } from '@/lib/calendar-data';
import { getMonthTheme, getSeasonIcon, getSeasonName } from '@/lib/themes';
import { ChevronLeft, ChevronRight, StickyNote, Share2 } from 'lucide-react';
import { useSettings } from '@/lib/settings';
import { shareDateCard } from '@/lib/share-card';

// ============================================
// Props
// ============================================

interface CalendarTabProps {
  isDark: boolean;
  themeGradient: string;
  themeColor: string;
  onDaySelect: (day: number) => void;
  selectedDay: number;
  notes?: any[]; // Array of note objects with shamsiMonth/shamsiDay
}

// ============================================
// Helper: compute triple date for a Shamsi day
// ============================================

function computeTripleDate(jy: number, jm: number, jd: number): TripleDate {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const { hy, hm, hd } = gregorianToHijri(gy, gm, gd);
  return {
    shamsi: { year: jy, month: jm, day: jd },
    miladi: { year: gy, month: gm, day: gd },
    qamari: { year: hy, month: hm, day: hd },
  };
}

// ============================================
// Day cell data (pre-computed)
// ============================================

interface DayCellData {
  day: number;
  tripleDate: TripleDate;
  dayName: string;
  isHoliday: boolean;
  hasNamedDay: boolean;
  hasBaluchEvent: boolean;
  isToday: boolean;
  qamariDay: number;
  hasNotes: boolean;
  notes: any[];
}

// ============================================
// Component
// ============================================

export default function CalendarTab({
  isDark,
  themeGradient,
  themeColor,
  onDaySelect,
  selectedDay,
  notes,
}: CalendarTabProps) {
  const { locationName } = useSettings();
  const [sharing, setSharing] = useState(false);
  // --- Current viewing month/year (Shamsi) ---
  const todayTriple = useMemo(() => {
    const now = new Date();
    const gy = now.getFullYear();
    const gm = now.getMonth() + 1;
    const gd = now.getDate();
    return gregorianToJalali(gy, gm, gd);
  }, []);

  const [viewYear, setViewYear] = useState(todayTriple.jy);
  const [viewMonth, setViewMonth] = useState(todayTriple.jm);

  const theme = useMemo(
    () => getMonthTheme(viewMonth, isDark),
    [viewMonth, isDark]
  );

  const seasonName = useMemo(() => getSeasonName(viewMonth), [viewMonth]);
  const seasonIcon = useMemo(() => getSeasonIcon(viewMonth), [viewMonth]);

  // --- Calendar grid data ---
  const daysInMonth = useMemo(
    () => getJalaliMonthDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const firstDayOffset = useMemo(
    () => getFirstDayOfMonth(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  // Today's Shamsi date for highlighting
  const todayJy = todayTriple.jy;
  const todayJm = todayTriple.jm;
  const todayJd = todayTriple.jd;

  // Pre-compute all day cell data
  const dayCells: DayCellData[] = useMemo(() => {
    const cells: DayCellData[] = [];
    
    // Build a quick lookup for notes by shamsi month/day
    const notesByDate = new Map<string, any[]>();
    if (notes) {
      notes.forEach((note) => {
        if (note.shamsiMonth && note.shamsiDay) {
          const key = `${note.shamsiMonth}-${note.shamsiDay}`;
          if (!notesByDate.has(key)) {
            notesByDate.set(key, []);
          }
          notesByDate.get(key)!.push(note);
        }
      });
    }
    
    for (let d = 1; d <= daysInMonth; d++) {
      const triple = computeTripleDate(viewYear, viewMonth, d);
      const dayInfo = getDayInfo(
        triple.shamsi.month,
        triple.shamsi.day,
        triple.miladi.month,
        triple.miladi.day,
        triple.qamari.month,
        triple.qamari.day
      );
      const { year: gy, month: gm, day: gd } = triple.miladi;
      const dayName = getPersianDayName(gy, gm, gd);
      
      // Check for notes on this day
      const noteKey = `${triple.shamsi.month}-${triple.shamsi.day}`;
      const dayNotes = notesByDate.get(noteKey) || [];

      cells.push({
        day: d,
        tripleDate: triple,
        dayName,
        isHoliday: dayInfo.holidays.length > 0,
        hasNamedDay: dayInfo.namedDays.length > 0,
        hasBaluchEvent: dayInfo.baluchEvents.length > 0,
        hasNotes: dayNotes.length > 0,
        notes: dayNotes,
        isToday: viewYear === todayJy && viewMonth === todayJm && d === todayJd,
        qamariDay: triple.qamari.day,
      });
    }
    return cells;
  }, [viewYear, viewMonth, daysInMonth, todayJy, todayJm, todayJd, notes]);

  // --- Selected day details ---
  const selectedCellData = useMemo(() => {
    if (selectedDay < 1 || selectedDay > daysInMonth) return null;
    return dayCells.find((c) => c.day === selectedDay) ?? null;
  }, [selectedDay, dayCells, daysInMonth]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedCellData) return null;
    const t = selectedCellData.tripleDate;
    return getDayInfo(
      t.shamsi.month,
      t.shamsi.day,
      t.miladi.month,
      t.miladi.day,
      t.qamari.month,
      t.qamari.day
    );
  }, [selectedCellData]);

  // --- Navigation handlers ---
  const goToPrevMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 1) {
        setViewYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 12) {
        setViewYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  // --- Calendar source label ---
  function calendarSourceLabel(calendar: string) {
    switch (calendar) {
      case 'shamsi': return 'شمسی';
      case 'gregorian': return 'میلادی';
      case 'qamari': return 'قمری';
      default: return '';
    }
  }

  // ============================================
  // Render
  // ============================================

  return (
    <div className="flex flex-col gap-4 px-1 pb-4" dir="rtl">
      {/* ======== Header with month navigation ======== */}
      <div
        className="relative overflow-hidden rounded-xl px-4 py-3"
        style={{ background: themeGradient }}
      >
        <div className="flex items-center justify-between">
          {/* Prev month button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={goToPrevMonth}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/30 active:scale-95"
              aria-label="ماه قبلی"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <button
              onClick={async () => {
                setSharing(true);
                try {
                  await shareDateCard(locationName);
                } catch {}
                setSharing(false);
              }}
              disabled={sharing}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/30 active:scale-95 disabled:opacity-50"
              aria-label="اشتراک‌گذاری تصویر تاریخ"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          {/* Month / Year / Season */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-lg" role="img" aria-label={seasonName}>
                {seasonIcon}
              </span>
              <h2 className="text-lg font-bold text-white">
                {SHAMSI_MONTH_NAMES[viewMonth - 1]}
              </h2>
              <span className="text-sm font-medium text-white/70">
                {toPersianDigits(viewYear)}
              </span>
            </div>
            <span className="text-xs font-medium text-white/60">{seasonName}</span>
          </div>

          {/* Next month button */}
          <button
            onClick={goToNextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/30 active:scale-95"
            aria-label="ماه بعدی"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ======== Day-of-week header row ======== */}
      <div className="grid grid-cols-7 gap-1">
        {PERSIAN_DAY_NAMES.map((name, idx) => (
          <div
            key={name}
            className={`flex h-9 items-center justify-center text-xs font-semibold transition-colors duration-300 ${
              idx === 6
                ? 'text-red-500 dark:text-red-400'
                : isDark
                  ? 'text-gray-400'
                  : 'text-gray-500'
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* ======== Calendar grid ======== */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for offset */}
        {Array.from({ length: firstDayOffset }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[3.5rem]" />
        ))}

        {/* Day cells */}
        {dayCells.map((cell) => {
          const isSelected = cell.day === selectedDay;
          const isToday = cell.isToday;

          return (
            <button
              key={cell.day}
              onClick={() => onDaySelect(cell.day)}
              className={
                'relative flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-xl text-center transition-all duration-300 active:scale-95 ' +
                (cell.isHoliday
                  ? ''
                  : isDark
                    ? 'hover:bg-white/5'
                    : 'hover:bg-gray-100')
              }
              style={
                cell.isHoliday
                  ? { backgroundColor: theme.holidayBg }
                  : undefined
              }
              aria-label={`${toPersianDigits(cell.day)} ${SHAMSI_MONTH_NAMES[viewMonth - 1]}`}
            >
              {/* Today ring */}
              {isToday && (
                <span
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{
                    boxShadow: `inset 0 0 0 2.5px ${theme.primary}`,
                  }}
                />
              )}

              {/* Selected highlight */}
              {isSelected && (
                <span
                  className="pointer-events-none absolute inset-0 rounded-xl"
                  style={{ backgroundColor: theme.primary, opacity: 0.15 }}
                />
              )}

              {/* Shamsi day number */}
              <span
                className={
                  'relative text-base font-bold leading-none ' +
                  (isToday
                    ? 'text-white'
                    : cell.isHoliday
                      ? 'text-red-600 dark:text-red-400'
                      : isSelected
                        ? ''
                        : isDark
                          ? 'text-gray-100'
                          : 'text-gray-800'
                  )
                }
                style={
                  isToday
                    ? {
                        backgroundColor: theme.primary,
                        borderRadius: '50%',
                        padding: '2px 6px',
                        lineHeight: '1.25rem',
                      }
                    : undefined
                }
              >
                {toPersianDigits(cell.day)}
              </span>

              {/* Qamari day (small, only if different) */}
              {cell.qamariDay && cell.qamariDay !== cell.day && !isNaN(cell.qamariDay) && (
                <span
                  className={
                    'relative text-[10px] leading-none ' +
                    (isDark ? 'text-gray-500' : 'text-gray-400')
                  }
                >
                  {toPersianDigits(cell.qamariDay)}
                </span>
              )}

              {/* Event indicator dots */}
              <div className="relative flex items-center justify-center gap-0.5">
                {cell.isHoliday && (
                  <span className="block h-1.5 w-1.5 rounded-full bg-red-500" />
                )}
                {cell.hasBaluchEvent && (
                  <span className="block h-1.5 w-1.5 rounded-full bg-purple-500" />
                )}
                {cell.hasNamedDay && (
                  <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
                {cell.hasNotes && (
                  <span className="block h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ======== Selected Day Details ======== */}
      {selectedCellData && selectedDayEvents && (
        <div
          className="rounded-xl p-4 transition-all duration-300"
          style={{
            backgroundColor: isDark ? theme.cardBg : '#ffffff',
            borderRight: `4px solid ${themeColor}`,
            boxShadow: isDark
              ? '0 2px 12px rgba(0,0,0,0.3)'
              : '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          {/* Triple date display */}
          <div className="mb-3 flex flex-col gap-1.5">
            <p className="text-sm font-bold" style={{ color: theme.textAccent }}>
              {toPersianDigits(selectedCellData.tripleDate.shamsi.day)}{' '}
              {SHAMSI_MONTH_NAMES[selectedCellData.tripleDate.shamsi.month - 1]}{' '}
              {toPersianDigits(selectedCellData.tripleDate.shamsi.year)}{' '}
              شمسی
            </p>
            <p
              className={
                'text-xs ' + (isDark ? 'text-gray-400' : 'text-gray-500')
              }
            >
              {toPersianDigits(selectedCellData.tripleDate.miladi.day)}{' '}
              {GREGORIAN_MONTH_NAMES[selectedCellData.tripleDate.miladi.month - 1]}{' '}
              {toPersianDigits(selectedCellData.tripleDate.miladi.year)}{' '}
              میلادی
            </p>
            <p
              className={
                'text-xs ' + (isDark ? 'text-gray-400' : 'text-gray-500')
              }
            >
              {toPersianDigits(selectedCellData.tripleDate.qamari.day)}{' '}
              {QAMARI_MONTH_NAMES[selectedCellData.tripleDate.qamari.month - 1]}{' '}
              {toPersianDigits(selectedCellData.tripleDate.qamari.year)}{' '}
              قمری
            </p>
          </div>

          {/* Day name */}
          <div className="mb-3 flex items-center gap-2">
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: theme.primary + '18',
                color: theme.textAccent,
              }}
            >
              {selectedCellData.dayName}
            </span>
          </div>

          {/* Events list */}
          {selectedDayEvents.all.length > 0 ? (
            <div className="flex flex-col gap-2">
              {selectedDayEvents.holidays.map((ev, i) => (
                <div
                  key={`hol-${i}`}
                  className="flex items-start justify-between gap-2 rounded-lg bg-red-50 p-2.5 dark:bg-red-950/30"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      {ev.name}
                    </span>
                    <span className="text-[10px] text-red-500 dark:text-red-400">
                      {calendarSourceLabel(ev.calendar)}
                    </span>
                  </div>
                  <span className="shrink-0">🔴 تعطیل</span>
                </div>
              ))}

              {selectedDayEvents.namedDays.map((ev, i) => (
                <div
                  key={`named-${i}`}
                  className="flex items-start justify-between gap-2 rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-950/30"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {ev.name}
                    </span>
                    <span className="text-[10px] text-emerald-500 dark:text-emerald-400">
                      {calendarSourceLabel(ev.calendar)}
                    </span>
                  </div>
                  <span className="shrink-0">🟢 نام‌گذاری شده</span>
                </div>
              ))}

              {selectedDayEvents.baluchEvents.map((ev, i) => (
                <div
                  key={`baluch-${i}`}
                  className="flex items-start justify-between gap-2 rounded-lg bg-purple-50 p-2.5 dark:bg-purple-950/30"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {ev.name}
                    </span>
                    <span className="text-[10px] text-purple-500 dark:text-purple-400">
                      {calendarSourceLabel(ev.calendar)}
                    </span>
                  </div>
                  <span className="shrink-0">🟣 بلوچستان</span>
                </div>
              ))}
            </div>
          ) : (
            <p
              className={
                'text-center text-sm ' +
                (isDark ? 'text-gray-500' : 'text-gray-400')
              }
            >
              رویداد خاصی برای این روز ثبت نشده است
            </p>
          )}

          {/* یادداشت‌های این روز */}
          {selectedCellData.hasNotes && selectedCellData.notes && selectedCellData.notes.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: theme.textAccent }}>
                <StickyNote size={13} /> یادداشت‌های این روز
              </div>
              {selectedCellData.notes.map((n, i) => (
                <div
                  key={`note-${i}`}
                  className="rounded-lg p-2.5"
                  style={{
                    backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.1)',
                    borderRight: '3px solid #f59e0b',
                  }}
                >
                  <div className="text-sm font-medium" style={{ color: isDark ? '#fde68a' : '#92400e' }}>{n.title}</div>
                  {n.content && <div className="text-xs mt-0.5 leading-relaxed" style={{ color: isDark ? '#d6c08a' : '#a16207' }}>{n.content}</div>}
                  {n.shamsiMonth && n.shamsiDay && (
                    <div className="text-[10px] mt-1" style={{ color: isDark ? '#b8934d' : '#b45309' }}>
                      {toPersianDigits(n.shamsiDay)} {SHAMSI_MONTH_NAMES[(n.shamsiMonth || 1) - 1]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======== Legend ======== */}
      <div className="flex flex-wrap items-center justify-center gap-4 px-2">
        <div className="flex items-center gap-1.5">
          <span className="block h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className={"text-xs " + (isDark ? "text-gray-400" : "text-gray-500")}>تعطیل</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="block h-2.5 w-2.5 rounded-full bg-purple-500" />
          <span className={"text-xs " + (isDark ? "text-gray-400" : "text-gray-500")}>بلوچستان</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className={"text-xs " + (isDark ? "text-gray-400" : "text-gray-500")}>نام‌گذاری شده</span>
        </div>
      </div>
    </div>
  );
}

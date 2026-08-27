'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Compass,
  BookOpen,
  StickyNote,
  Sun,
  Moon,
  MapPin,
  Bell,
  Settings,
} from 'lucide-react';
import CalendarTab from '@/components/tabs/CalendarTab';
import ClockCompassTab from '@/components/tabs/ClockCompassTab';
import PrayerWeatherTab from '@/components/tabs/PrayerWeatherTab';
import CultureTab from '@/components/tabs/CultureTab';
import TasbeehTab from '@/components/tabs/TasbeehTab';
import NotesTab from '@/components/tabs/NotesTab';
import TasbeehIcon from '@/components/TasbeehIcon';
import SettingsSheet from '@/components/SettingsSheet';
import { getCurrentTripleDate, toPersianDigits, getShamsiMonthName, getSeason } from '@/lib/calendar-utils';
import { getNextPrayer, calculatePrayerTimes } from '@/lib/prayer-times';
import { useSettings } from '@/lib/settings';
import { schedulePrayerNotifications, checkNotificationPermission } from '@/lib/prayer-notify';
import { t } from '@/lib/i18n';
import { getMonthTheme, getSeasonName, getSeasonIcon } from '@/lib/themes';

type TabId = 'calendar' | 'clock' | 'prayer' | 'tasbeeh' | 'culture' | 'notes';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'calendar', label: 'تقویم', icon: <Calendar size={18} /> },
  { id: 'clock', label: 'ساعت', icon: <Clock size={18} /> },
  { id: 'prayer', label: 'نماز', icon: <Compass size={18} /> },
  { id: 'tasbeeh', label: 'تسبیح', icon: <TasbeehIcon size={18} /> },
  { id: 'culture', label: 'فرهنگ', icon: <BookOpen size={18} /> },
  { id: 'notes', label: 'یادداشت', icon: <StickyNote size={18} /> },
];

export default function Home() {
  // Get current triple date (must be before useState that uses it)
  const tripleDate = useMemo(() => getCurrentTripleDate(), []);
  const currentMonth = tripleDate.shamsi.month;
  const currentDay = tripleDate.shamsi.day;

  const [activeTab, setActiveTab] = useState<TabId>('calendar');
  const [isDark, setIsDark] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(currentDay);
  const [nextPrayerInfo, setNextPrayerInfo] = useState({ name: '', remaining: '' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'default'>('default');
  const [calendarNotes, setCalendarNotes] = useState<any[]>([]);
  const { lat, lng, method, locationName, lang } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadNotes = useCallback(() => {
    try {
      const raw = localStorage.getItem('baluchistan-nama-notes');
      setCalendarNotes(raw ? JSON.parse(raw) : []);
    } catch {
      setCalendarNotes([]);
    }
  }, []);

  // بارگذاری یادداشت‌ها در ابتدا و بعد از هر بار باز کردن تب یادداشت (برای همگام‌سازی با تقویم)
  useEffect(() => {
    loadNotes();
  }, [loadNotes, activeTab]);

  // Get theme based on current Shamsi month
  const theme = useMemo(() => getMonthTheme(currentMonth, isDark), [currentMonth, isDark]);

  // Update next prayer info every minute
  useEffect(() => {
    const update = () => {
      const pt = calculatePrayerTimes(new Date(), lat, lng, 3.5, method);
      const np = getNextPrayer(pt);
      setNextPrayerInfo({ name: np.name, remaining: np.remaining });
      setCurrentTime(new Date());
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [lat, lng, method]);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // ثبت Service Worker (حالت آفلاین / نصب PWA)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Request notification permission
  const requestNotification = useCallback(async () => {
    const ok = await schedulePrayerNotifications(lat, lng, method);
    setNotificationPermission(ok ? 'granted' : 'denied');
  }, [lat, lng, method]);

  // زمان‌بندی مجدد هنگام تغییر موقعیت یا روش نماز
  useEffect(() => {
    checkNotificationPermission().then((granted) => {
      if (granted) schedulePrayerNotifications(lat, lng, method);
    });
  }, [lat, lng, method]);

  // Toggle dark mode
  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  }, []);

  // Handle day selection in calendar
  const handleDaySelect = useCallback((day: number) => {
    setSelectedDay(day);
  }, []);

  return (
    <div
      className="min-h-[100dvh] flex flex-col transition-colors duration-500"
      style={{ background: isDark ? '#0f172a' : '#f8fafc' }}
    >
      {/* ===== HEADER ===== */}
      <header
        className="sticky top-0 z-40 tab-bar"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(248, 250, 252, 0.88)',
          borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg"
              style={{ background: theme.gradient }}
            >
              بل
            </div>
            <div>
              <h1
                className="text-base font-extrabold leading-tight"
                style={{ color: theme.primary }}
              >
                بلوچستان نما
              </h1>
              <p className="text-[10px] leading-tight" style={{ color: isDark ? '#94a3b8' : '#94a3b8' }}>
                {getSeasonIcon(currentMonth)} {getSeasonName(currentMonth)} • {toPersianDigits(currentMonth)} {getShamsiMonthName(currentMonth)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Next prayer badge */}
            {nextPrayerInfo.name && (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium"
                style={{
                  background: isDark ? 'rgba(5,150,105,0.15)' : 'rgba(5,150,105,0.1)',
                  color: theme.primary,
                }}
              >
                <Bell size={12} />
                <span>{nextPrayerInfo.name}: {nextPrayerInfo.remaining}</span>
              </div>
            )}
            {/* Notification button */}
            <button
              onClick={requestNotification}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 relative"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                color: notificationPermission === 'granted' ? '#10b981' : (isDark ? '#fbbf24' : '#f59e0b'),
              }}
              aria-label="اعلان‌ها"
            >
              <Bell size={16} />
              {notificationPermission !== 'granted' && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-red-500" />
              )}
            </button>
            {/* Settings */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                color: isDark ? '#94a3b8' : '#64748b',
              }}
              aria-label="تنظیمات"
            >
              <Settings size={18} />
            </button>
            {/* Dark mode toggle */}
            <button
              onClick={toggleDark}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                color: isDark ? '#fbbf24' : '#f59e0b',
              }}
              aria-label={isDark ? 'حالت روشن' : 'حالت تاریک'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* Location badge */}
        <div className="flex items-center justify-center gap-1 pb-2">
          <MapPin size={11} style={{ color: theme.primary }} />
          <span className="text-[10px]" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
            {locationName}، سیستان و بلوچستان
          </span>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
        <div className="max-w-lg mx-auto px-3 py-3">
          {activeTab === 'calendar' && (
            <CalendarTab
              isDark={isDark}
              themeGradient={theme.gradient}
              themeColor={theme.primary}
              onDaySelect={handleDaySelect}
              selectedDay={selectedDay ?? currentDay}
              notes={calendarNotes}
            />
          )}
          {activeTab === 'clock' && (
            <ClockCompassTab
              isDark={isDark}
              themeColor={theme.primary}
              themeGradient={theme.gradient}
            />
          )}
          {activeTab === 'prayer' && (
            <PrayerWeatherTab
              isDark={isDark}
              themeColor={theme.primary}
              themeGradient={theme.gradient}
            />
          )}
          {activeTab === 'tasbeeh' && (
            <TasbeehTab
              isDark={isDark}
              themeColor={theme.primary}
              themeGradient={theme.gradient}
            />
          )}
          {activeTab === 'culture' && (
            <CultureTab
              isDark={isDark}
              themeColor={theme.primary}
              themeGradient={theme.gradient}
            />
          )}
          {activeTab === 'notes' && (
            <NotesTab
              isDark={isDark}
              themeColor={theme.primary}
              themeGradient={theme.gradient}
            />
          )}
        </div>
      </main>

      {/* ===== BOTTOM TAB BAR ===== */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 tab-bar"
        style={{
          background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)',
          borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
        }}
      >
        <div className="max-w-lg mx-auto flex items-center justify-around px-1 py-1.5">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-2.5 rounded-xl transition-all duration-300 min-w-[48px] ${
                  isActive ? 'scale-105' : 'hover:scale-102'
                }`}
                style={{
                  color: isActive ? theme.primary : isDark ? '#64748b' : '#94a3b8',
                  background: isActive
                    ? isDark
                      ? `${theme.primary}15`
                      : `${theme.primary}12`
                    : 'transparent',
                }}
                aria-label={tab.label}
              >
                <div className={`transition-transform duration-300 ${isActive ? 'animate-float' : ''}`}>
                  {tab.icon}
                </div>
                <span className={`text-[9px] font-medium transition-all duration-300 ${isActive ? 'font-bold' : ''}`}>
                  {t(`tab.${tab.id}`, lang)}
                </span>
                {isActive && (
                  <div
                    className="absolute -bottom-0 w-5 h-0.5 rounded-full"
                    style={{ background: theme.primary }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {/* Safe area for notched devices */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        isDark={isDark}
        themeColor={theme.primary}
        themeGradient={theme.gradient}
      />
    </div>
  );
}
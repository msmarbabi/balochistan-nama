'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { RotateCcw, Volume2, VolumeX, Plus, Minus, Award, Clock, ChevronDown } from 'lucide-react';
import { toPersianDigits } from '@/lib/calendar-utils';
import TasbeehIcon from '@/components/TasbeehIcon';

// ============================================
// Types
// ============================================

interface TasbeehTabProps {
  isDark: boolean;
  themeColor: string;
  themeGradient: string;
}

interface DhikrPreset {
  id: string;
  name: string;
  arabic: string;
  target: number;
  description: string;
}

interface SavedSession {
  id: string;
  presetId: string;
  count: number;
  target: number;
  date: string;
}

// ============================================
// Dhikr Presets
// ============================================

const DHIKR_PRESETS: DhikrPreset[] = [
  { id: 'subhanallah', name: 'سبحان الله', arabic: 'سُبْحَانَ اللّٰهِ', target: 33, description: 'منزّه است الله' },
  { id: 'alhamdulillah', name: 'الحمدلله', arabic: 'اَلْحَمْدُ لِلّٰهِ', target: 33, description: 'ستایش خداست' },
  { id: 'allahuakbar', name: 'الله اکبر', arabic: 'اَللّٰهُ اَکْبَرُ', target: 34, description: 'خدا بزرگ‌ترین است' },
  { id: 'lailaha', name: 'لا اله الا الله', arabic: 'لَا اِلٰهَ اِلَّا اللّٰهُ', target: 100, description: 'معبودی جز الله نیست' },
  { id: 'astaghfirullah', name: 'استغفرالله', arabic: 'اَسْتَغْفِرُ اللّٰهَ', target: 100, description: 'از الله آمرزش می‌طلبم' },
  { id: 'salawat', name: 'صلوات', arabic: 'اَللّٰهُمَّ صَلِّ عَلَی مُحَمَّدٍ', target: 100, description: 'درود بر محمد (ص)' },
  { id: 'hawqala', name: 'حوقله', arabic: 'لَا حَوْلَ وَلَا قُوَّةَ اِلَّا بِاللّٰهِ', target: 33, description: 'هیچ قدرتی جز به خدا نیست' },
  { id: 'custom', name: 'سفارشی', arabic: '', target: 100, description: 'ذکر دلخواه خود را وارد کنید' },
];

// ============================================
// Component
// ============================================

export default function TasbeehTab({ isDark, themeColor, themeGradient }: TasbeehTabProps) {
  // State
  const [selectedPreset, setSelectedPreset] = useState<DhikrPreset>(DHIKR_PRESETS[0]);
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [daily, setDaily] = useState<Record<string, number>>({});
  const [isVibrating, setIsVibrating] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [customTarget, setCustomTarget] = useState(100);
  const [customName, setCustomName] = useState('');
  const [customArabic, setCustomArabic] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SavedSession[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const circleRef = useRef<SVGCircleElement>(null);

  // Load state from localStorage
  useEffect(() => {
    try {
      const savedCount = localStorage.getItem('tasbeeh-count');
      const savedTotal = localStorage.getItem('tasbeeh-total');
      const savedPreset = localStorage.getItem('tasbeeh-preset');
      const savedHistory = localStorage.getItem('tasbeeh-history');
      const savedSound = localStorage.getItem('tasbeeh-sound');
      
      if (savedCount) setCount(parseInt(savedCount));
      if (savedTotal) setTotalCount(parseInt(savedTotal));
      if (savedPreset) {
        const found = DHIKR_PRESETS.find(p => p.id === savedPreset);
        if (found) setSelectedPreset(found);
      }
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      if (savedSound) setSoundOn(savedSound === 'true');
      const savedDaily = localStorage.getItem('tasbeeh-daily');
      if (savedDaily) setDaily(JSON.parse(savedDaily));
    } catch {}
  }, []);

  // Save count
  useEffect(() => {
    try {
      localStorage.setItem('tasbeeh-count', String(count));
      localStorage.setItem('tasbeeh-total', String(totalCount));
      localStorage.setItem('tasbeeh-preset', selectedPreset.id);
    } catch {}
  }, [count, totalCount, selectedPreset.id]);

  // Save sound preference
  useEffect(() => {
    try { localStorage.setItem('tasbeeh-sound', String(soundOn)); } catch {}
  }, [soundOn]);

  // Save daily stats
  useEffect(() => {
    try { localStorage.setItem('tasbeeh-daily', JSON.stringify(daily)); } catch {}
  }, [daily]);

  // دنباله روزانه (streak) و تعداد امروز
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = daily[todayKey] || 0;
  const streak = useMemo(() => {
    let s = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const key = new Date(d.getTime() - i * 86400000).toISOString().slice(0, 10);
      const val = daily[key] || 0;
      if (i === 0 && val === 0) continue; // امروز هنوز ذکر نخونده — دنباله از دیروز ادامه دارد
      if (val > 0) s++;
      else break;
    }
    return s;
  }, [daily]);

  // Vibration feedback
  const vibrate = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }, []);

  // Play click sound
  const playClick = useCallback(() => {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.value = 0.1;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }, [soundOn]);

  // Play completion sound
  const playComplete = useCallback(() => {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      [0, 150, 300].forEach((delay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 1000;
        osc.type = 'sine';
        gain.gain.value = 0.1;
        osc.start(ctx.currentTime + delay / 1000);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay / 1000 + 0.15);
        osc.stop(ctx.currentTime + delay / 1000 + 0.15);
      });
    } catch {}
  }, [soundOn]);

  // Handle tap
  const handleTap = useCallback(() => {
    const target = selectedPreset.id === 'custom' ? customTarget : selectedPreset.target;
    const newCount = count + 1;
    const todayKey = new Date().toISOString().slice(0, 10);
    setCount(newCount);
    setTotalCount(prev => prev + 1);
    setDaily(prev => ({ ...prev, [todayKey]: (prev[todayKey] || 0) + 1 }));
    setIsVibrating(true);
    setTimeout(() => setIsVibrating(false), 150);

    if (newCount >= target) {
      // Completed!
      playComplete();
      vibrate([100, 50, 100, 50, 200]);
      // Save to history
      const session: SavedSession = {
        id: Date.now().toString(),
        presetId: selectedPreset.id,
        count: newCount,
        target,
        date: new Date().toISOString(),
      };
      const newHistory = [session, ...history].slice(0, 50);
      setHistory(newHistory);
      try { localStorage.setItem('tasbeeh-history', JSON.stringify(newHistory)); } catch {}
      // Auto reset after a moment
      setTimeout(() => setCount(0), 1500);
    } else {
      playClick();
      vibrate(30);
    }
  }, [count, selectedPreset, customTarget, history, playClick, playComplete, vibrate]);

  // Reset
  const handleReset = useCallback(() => {
    setCount(0);
    vibrate(50);
  }, [vibrate]);

  // Select preset
  const selectPreset = useCallback((preset: DhikrPreset) => {
    setSelectedPreset(preset);
    setCount(0);
    setShowPresets(false);
  }, []);

  // Computed
  const target = selectedPreset.id === 'custom' ? customTarget : selectedPreset.target;
  const progress = Math.min(count / target, 1);
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - progress);

  // Styles
  const cardBg = isDark ? 'bg-[#1e293b]' : 'bg-white';
  const textColor = isDark ? 'text-[#f1f5f9]' : 'text-[#1e293b]';
  const mutedColor = isDark ? 'text-[#94a3b8]' : 'text-[#64748b]';

  const isComplete = count >= target;

  return (
    <div className="flex flex-col gap-4 px-4 pb-6" dir="rtl">
      {/* Main counter card */}
      <div className={`${cardBg} rounded-2xl shadow-lg overflow-hidden`}>
        {/* Header with dhikr name and dropdown */}
        <div className="px-5 py-3 text-center relative" style={{ background: themeGradient }}>
          <div className="flex items-center justify-between mb-1">
            <button
              onClick={() => setShowPresets(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all active:scale-95"
              aria-label="انتخاب ذکر"
            >
              <TasbeehIcon size={16} />
              <span className="text-white font-bold text-sm">{selectedPreset.name}</span>
              <ChevronDown size={14} />
            </button>
            <div className="text-white/70 text-xs">ذکر انتخابی</div>
          </div>
          {selectedPreset.arabic && (
            <div className="text-white/90 text-xl mt-0.5" style={{ fontFamily: "'Traditional Arabic', 'Vazirmatn', serif" }}>
              {selectedPreset.arabic}
            </div>
          )}
          <div className="text-white/60 text-xs mt-0.5">{selectedPreset.description}</div>
        </div>

        {/* Counter area */}
        <div className="p-6">
          {/* Circular progress + tap area */}
          <div className="flex justify-center mb-5">
            <button
              onClick={handleTap}
              className="relative transition-transform duration-150 active:scale-95"
              style={{
                transform: isVibrating ? 'scale(0.95)' : 'scale(1)',
              }}
              aria-label="شمارش"
            >
              <svg width="200" height="200" viewBox="0 0 200 200">
                {/* Background circle */}
                <circle
                  cx="100" cy="100" r="90"
                  fill="none"
                  stroke={isDark ? '#1e293b' : '#f1f5f9'}
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  ref={circleRef}
                  cx="100" cy="100" r="90"
                  fill="none"
                  stroke={isComplete ? '#10b981' : themeColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  transform="rotate(-90 100 100)"
                  style={{
                    transition: 'stroke-dashoffset 0.3s ease-out',
                    filter: isComplete
                      ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))'
                      : `drop-shadow(0 0 6px ${themeColor}40)`,
                  }}
                />
              </svg>
              {/* Center text */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ top: 0 }}
              >
                <span
                  className={`text-5xl font-bold font-mono ${isComplete ? 'text-green-500' : textColor}`}
                  style={{
                    textShadow: isComplete
                      ? '0 0 20px rgba(16,185,129,0.5)'
                      : `0 0 15px ${themeColor}30`,
                  }}
                >
                  {toPersianDigits(count)}
                </span>
                <span className={`text-sm mt-1 ${mutedColor}`}>
                  از {toPersianDigits(target)}
                </span>
                {isComplete && <span className="text-green-500 text-sm font-bold mt-1">تکمیل شد!</span>}
              </div>
            </button>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setSoundOn(!soundOn)}
              className={`p-3 rounded-xl transition-all hover:scale-110 active:scale-95 ${
                soundOn ? '' : 'opacity-50'
              }`}
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
              aria-label={soundOn ? 'قطع صدا' : 'فعال‌سازی صدا'}
            >
              {soundOn ? <Volume2 size={18} style={{ color: themeColor }} /> : <VolumeX size={18} style={{ color: mutedColor }} />}
            </button>

            <button
              onClick={handleReset}
              className="p-3 rounded-xl transition-all hover:scale-110 active:scale-95"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
              aria-label="بازنشانی"
            >
              <RotateCcw size={18} style={{ color: mutedColor }} />
            </button>

            <button
              onClick={() => setShowPresets(true)}
              className="p-3 rounded-xl transition-all hover:scale-110 active:scale-95"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
              aria-label="انتخاب ذکر"
            >
              <TasbeehIcon size={18} style={{ color: themeColor }} />
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-3 rounded-xl transition-all hover:scale-110 active:scale-95"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
              aria-label="تاریخچه"
            >
              <Clock size={18} style={{ color: mutedColor }} />
            </button>
          </div>

          {/* آمار روزانه + دنباله */}
          <div className={`text-center mt-4 flex items-center justify-center gap-4 text-xs ${mutedColor}`}>
            <span>ذکر امروز: <span className="font-bold" style={{ color: themeColor }}>{toPersianDigits(todayCount)}</span></span>
            <span className="opacity-40">|</span>
            <span>🔥 دنباله: <span className="font-bold" style={{ color: themeColor }}>{toPersianDigits(streak)}</span> روز</span>
          </div>
        </div>
      </div>

      {/* Preset Selection Modal */}
      {showPresets && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setShowPresets(false)}>
          <div
            className={`${cardBg} w-full max-w-lg rounded-t-2xl p-5 pb-8 max-h-[70vh] overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between mb-4 ${textColor}`}>
              <h3 className="font-bold">انتخاب ذکر</h3>
              <button onClick={() => setShowPresets(false)} className={`text-lg ${mutedColor}`}>✕</button>
            </div>
            <div className="flex flex-col gap-2">
              {DHIKR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset)}
                  className={`p-4 rounded-xl text-right transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    selectedPreset.id === preset.id ? 'ring-2' : ''
                  } ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}
                  style={selectedPreset.id === preset.id ? { ringColor: themeColor, borderColor: themeColor, borderWidth: 1 } : {}}
                >
                  <div className={`font-bold ${textColor}`}>{preset.name}</div>
                  <div className={`text-sm mt-0.5 ${mutedColor}`} style={{ fontFamily: "'Traditional Arabic', serif" }}>{preset.arabic}</div>
                  <div className={`text-xs mt-1 ${mutedColor}`}>{preset.description} — هدف: {toPersianDigits(preset.target)}</div>
                </button>
              ))}
            </div>

            {/* Custom target editor */}
            {selectedPreset.id === 'custom' && (
              <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                <div className={`text-sm font-bold mb-2 ${textColor}`}>تنظیمات ذکر سفارشی</div>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="نام ذکر..."
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className={`p-2.5 rounded-lg text-sm ${textColor} ${isDark ? 'bg-white/5 border-[#334155]' : 'bg-white border-[#e2e8f0]'} border`}
                    dir="rtl"
                  />
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${mutedColor}`}>تعداد هدف:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCustomTarget(Math.max(1, customTarget - 10))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                      >
                        <Minus size={14} />
                      </button>
                      <span className={`font-mono font-bold ${textColor}`}>{toPersianDigits(customTarget)}</span>
                      <button
                        onClick={() => setCustomTarget(Math.min(1000, customTarget + 10))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History Panel */}
      {showHistory && (
        <div className={`${cardBg} rounded-xl p-5 shadow-lg`}>
          <div className="flex items-center gap-2 mb-3">
            <Award size={16} style={{ color: themeColor }} />
            <h3 className={`text-sm font-bold ${textColor}`}>تاریخچه ذکرها</h3>
          </div>
          {history.length === 0 ? (
            <div className={`text-center text-sm py-4 ${mutedColor}`}>هنوز ذکری تکمیل نشده</div>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto no-scrollbar">
              {history.map((session) => {
                const preset = DHIKR_PRESETS.find(p => p.id === session.presetId);
                const date = new Date(session.date);
                return (
                  <div key={session.id} className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`text-sm font-bold ${textColor}`}>{preset?.name || 'ذکر'}</span>
                        <span className={`text-xs mr-2 ${mutedColor}`}>
                          {toPersianDigits(session.count)} / {toPersianDigits(session.target)}
                        </span>
                      </div>
                      <span className={`text-[10px] ${mutedColor}`}>
                        {date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
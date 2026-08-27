'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sun,
  Sunrise,
  CloudSun,
  Sunset,
  Moon,
  Thermometer,
  Droplets,
  Wind,
  Compass,
  MapPin,
  RefreshCw,
  TrendingUp,
  Umbrella,
  Eye,
  Gauge,
} from 'lucide-react';
import {
  calculatePrayerTimes,
  getNextPrayer,
  getPrayerList,
  isPrayerPassed,
  PRAYER_ORDER,
  type PrayerTimes,
} from '@/lib/prayer-times';
import { toPersianDigits } from '@/lib/calendar-utils';
import { calcQibla } from '@/lib/qibla';
import { useSettings } from '@/lib/settings';

// ============================================
// Types
// ============================================

interface WeatherCurrent {
  temp: number;
  feelsLike: number;
  condition: string;
  icon: string;
  humidity: number;
  wind: number;
  windDir: string;
  pressure: number;
}

interface WeatherForecast {
  date: string;
  max: number;
  min: number;
  condition: string;
  icon: string;
  sunrise: string;
  sunset: string;
  uvIndex: number;
  rainChance: number;
}

interface WeatherData {
  current: WeatherCurrent;
  forecast: WeatherForecast[];
  location: string;
}

interface PrayerWeatherTabProps {
  isDark: boolean;
  themeColor: string;
  themeGradient: string;
}

// ============================================
// Prayer icon mapping
// ============================================

const PRAYER_ICONS: Record<string, React.ReactNode> = {
  fajr: <Moon size={16} />,
  sunrise: <Sunrise size={16} />,
  dhuhr: <Sun size={16} />,
  asr: <CloudSun size={16} />,
  maghrib: <Sunset size={16} />,
  isha: <Moon size={16} />,
};

// ============================================
// Weather helpers (direct Open-Meteo — works in APK without server)
// ============================================

function mapWeatherCode(code: number): { text: string; icon: string } {
  const map: Record<number, { text: string; icon: string }> = {
    0: { text: 'صاف', icon: '☀️' },
    1: { text: 'کمی ابری', icon: '🌤️' },
    2: { text: 'نیمه ابری', icon: '⛅' },
    3: { text: 'ابری', icon: '☁️' },
    45: { text: 'مه‌آلود', icon: '🌫️' },
    48: { text: 'مه یخ‌زده', icon: '🌫️' },
    51: { text: 'نم‌نم باران سبک', icon: '🌦️' },
    53: { text: 'نم‌نم باران متوسط', icon: '🌦️' },
    55: { text: 'نم‌نم باران شدید', icon: '🌧️' },
    61: { text: 'باران سبک', icon: '🌧️' },
    63: { text: 'باران متوسط', icon: '🌧️' },
    65: { text: 'باران شدید', icon: '🌧️' },
    71: { text: 'برف سبک', icon: '🌨️' },
    73: { text: 'برف متوسط', icon: '🌨️' },
    75: { text: 'برف شدید', icon: '❄️' },
    80: { text: 'رگبار سبک', icon: '🌦️' },
    81: { text: 'رگبار متوسط', icon: '🌧️' },
    82: { text: 'رگبار شدید', icon: '⛈️' },
    95: { text: 'رعد و برق', icon: '⛈️' },
    96: { text: 'رعد و برق با تگرگ', icon: '⛈️' },
    99: { text: 'رعد و برق شدید با تگرگ', icon: '⛈️' },
  };
  return map[code] || { text: 'نامشخص', icon: '🌡️' };
}

function mapWindDirection(deg: number): string {
  const dirs = ['شمالی', 'شمال شرقی', 'شرقی', 'جنوب شرقی', 'جنوبی', 'جنوب غربی', 'غربی', 'شمال غربی'];
  const index = Math.round(deg / 45) % 8;
  return dirs[index];
}

async function fetchWeatherDirect(lat: number, lng: number, locationName: string): Promise<WeatherData> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max&timezone=Asia/Tehran&forecast_days=3`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Weather API error');
  const data = await res.json();
  const wi = mapWeatherCode(data.current.weather_code);
  return {
    current: {
      temp: Math.round(data.current.temperature_2m),
      feelsLike: Math.round(data.current.apparent_temperature),
      condition: wi.text,
      icon: wi.icon,
      humidity: data.current.relative_humidity_2m,
      wind: Math.round(data.current.wind_speed_10m),
      windDir: mapWindDirection(data.current.wind_direction_10m),
      pressure: Math.round(data.current.surface_pressure),
    },
    forecast: data.daily.time.map((date: string, i: number) => ({
      date,
      max: Math.round(data.daily.temperature_2m_max[i]),
      min: Math.round(data.daily.temperature_2m_min[i]),
      condition: mapWeatherCode(data.daily.weather_code[i]).text,
      icon: mapWeatherCode(data.daily.weather_code[i]).icon,
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
      uvIndex: data.daily.uv_index_max[i],
      rainChance: data.daily.precipitation_probability_max[i],
    })),
    location: locationName,
  };
}

// ============================================
// Component
// ============================================

export default function PrayerWeatherTab({ isDark, themeColor, themeGradient }: PrayerWeatherTabProps) {
  const { lat, lng, method, locationName } = useSettings();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [, setTick] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState(false);
  const [lastFetched, setLastFetched] = useState<string>('');

  const fetchWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(false);
    try {
      // مستقیم از Open-Meteo — بدون سرور، هم تو وب هم تو APK کار می‌کنه
      const data = await fetchWeatherDirect(lat, lng, locationName);
      setWeather(data);
      setLastFetched(new Date().toISOString());
    } catch {
      setWeatherError(true);
    } finally {
      setWeatherLoading(false);
    }
  }, [lat, lng, locationName]);

  // Calculate prayer times on mount and when date changes (و با تغییر موقعیت/روش)
  useEffect(() => {
    const calc = () => {
      const times = calculatePrayerTimes(new Date(), lat, lng, 3.5, method);
      setPrayerTimes(times);
    };
    calc();

    // Recalculate every minute (for next prayer countdown)
    const timer = setInterval(() => {
      calc();
      setTick((t) => t + 1);
    }, 60000);

    return () => clearInterval(timer);
  }, [lat, lng, method]);

  // Fetch weather on mount
  useEffect(() => {
    fetchWeather();
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  // Styles
  const cardBg = isDark ? 'bg-[#1e293b]' : 'bg-white';
  const textColor = isDark ? 'text-[#f1f5f9]' : 'text-[#1e293b]';
  const mutedColor = isDark ? 'text-[#94a3b8]' : 'text-[#64748b]';
  const borderCol = isDark ? 'border-[#334155]' : 'border-[#e2e8f0]';

  // Next prayer info
  const nextPrayer = prayerTimes ? getNextPrayer(prayerTimes) : null;
  const prayerList = prayerTimes ? getPrayerList(prayerTimes) : [];

  // Current prayer key (the one that is next or closest)
  const currentPrayerKey = (() => {
    if (!prayerTimes) return null;
    for (const key of PRAYER_ORDER) {
      if (!isPrayerPassed(prayerTimes[key])) return key;
    }
    return PRAYER_ORDER[0];
  })();

  // ---- Render Prayer Times Section ----
  const renderPrayerTimes = () => {
    if (!prayerTimes) {
      return (
        <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
          <div
            className="p-6 text-center"
            style={{ background: themeGradient }}
          >
            <div className="animate-pulse text-white/80 text-sm">در حال محاسبه...</div>
          </div>
        </div>
      );
    }

    return (
      <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
        <div
          className="px-5 pt-5 pb-4"
          style={{ background: themeGradient }}
        >
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-white/90" />
            <h2 className="text-white font-bold text-base">
              اوقات شرعی ورکات (روش MWL)
            </h2>
          </div>

          {nextPrayer && (
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4">
              <div className="text-white/70 text-xs mb-1">نماز بعدی</div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white text-2xl font-bold">{nextPrayer.name}</span>
                  <span className="text-white/80 text-lg mr-2">{nextPrayer.time}</span>
                </div>
                <div className="text-left">
                  <div className="text-white/60 text-xs">مانده تا</div>
                  <div className="text-white text-sm font-bold">{nextPrayer.remaining}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex flex-col gap-2">
            {prayerList.map((prayer) => {
              const passed = isPrayerPassed(prayerTimes[prayer.key]);
              const isCurrent = prayer.key === currentPrayerKey;
              return (
                <div
                  key={prayer.key}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                    passed ? 'opacity-50' : ''
                  } ${
                    isCurrent ? 'ring-1' : ''
                  } ${
                    isDark
                      ? (isCurrent ? 'bg-white/5 ring-white/20' : 'hover:bg-white/5')
                      : (isCurrent ? 'bg-black/5 ring-black/20' : 'hover:bg-black/[0.03]')
                  }`}
                  style={isCurrent ? { boxShadow: `0 0 12px ${themeColor}40` } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <div
                      style={{ color: isCurrent ? themeColor : (isDark ? '#94a3b8' : '#64748b') }}
                    >
                      {PRAYER_ICONS[prayer.key]}
                    </div>
                    <span
                      className={`font-medium text-sm ${isCurrent ? textColor : mutedColor}`}
                    >
                      {prayer.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: themeColor,
                          boxShadow: `0 0 6px ${themeColor}80`,
                          animation: 'pulse-glow 2s ease-in-out infinite',
                        }}
                      />
                    )}
                    <span
                      className={`font-mono text-sm ${isCurrent ? 'font-bold' : ''}`}
                      style={{ color: isCurrent ? themeColor : (isDark ? '#e2e8f0' : '#1e293b') }}
                    >
                      {prayer.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`mt-4 text-center text-xs ${mutedColor}`}>
            خلبان نما اهل سنت — منطقه ورکات
          </div>
        </div>
      </div>
    );
  };

  // ---- Render Weather Widget ----
  const renderWeather = () => {
    if (weatherLoading && !weather) {
      return (
        <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
          <div className="p-8 text-center">
            <div className="animate-spin-slow inline-block text-4xl mb-3">🌀</div>
            <div className={`text-sm ${mutedColor}`}>در حال دریافت اطلاعات آب و هوا...</div>
          </div>
        </div>
      );
    }

    if (weatherError && !weather) {
      return (
        <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
          <div
            className="px-5 py-4"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, #92400e, #78350f)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer size={16} className="text-white/90" />
                <h2 className="text-white font-bold text-base">آب و هوا</h2>
              </div>
              <button onClick={fetchWeather} className="text-white/80 hover:text-white transition-colors">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          <div className="p-6 text-center">
            <div className="text-3xl mb-3">⚠️</div>
            <div className={`text-sm ${mutedColor} mb-3`}>خطا در دریافت اطلاعات آب و هوا</div>
            <button
              onClick={fetchWeather}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-105 active:scale-95"
              style={{ background: themeGradient }}
            >
              تلاش مجدد
            </button>
          </div>
        </div>
      );
    }

    if (!weather) return null;

    const wc = weather.current;

    return (
      <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
        {/* Header */}
        <div
          className="px-5 py-4"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, #92400e, #78350f)'
              : 'linear-gradient(135deg, #f59e0b, #d97706)',
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Thermometer size={16} className="text-white/90" />
              <h2 className="text-white font-bold text-base">آب و هوا</h2>
            </div>
            <div className="flex items-center gap-3">
              {lastFetched && (
                <span className="text-white/50 text-[10px]">
                  {new Date(lastFetched).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={fetchWeather}
                className="text-white/80 hover:text-white transition-all hover:rotate-180 duration-500"
                disabled={weatherLoading}
              >
                <RefreshCw size={14} className={weatherLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
          <span className="text-white/60 text-xs">{weather.location}</span>
        </div>

        <div className="p-5">
          {/* Main temperature display */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="text-7xl" style={{ filter: weatherLoading ? 'blur(2px)' : 'none' }}>
              {wc.icon}
            </div>
            <div>
              <div className={`text-4xl font-bold ${textColor}`}>
                {toPersianDigits(wc.temp)}°C
              </div>
              <div className={`text-sm ${mutedColor}`}>
                {wc.condition}
              </div>
            </div>
          </div>

          {/* Weather details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${mutedColor}`}>
                <Thermometer size={13} />
                <span className="text-xs">احساس دما</span>
              </div>
              <div className={`text-base font-bold ${textColor}`}>
                {toPersianDigits(wc.feelsLike)}°C
              </div>
            </div>

            <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${mutedColor}`}>
                <Droplets size={13} />
                <span className="text-xs">رطوبت</span>
              </div>
              <div className={`text-base font-bold ${textColor}`}>
                {toPersianDigits(wc.humidity)}٪
              </div>
            </div>

            <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${mutedColor}`}>
                <Wind size={13} />
                <span className="text-xs">سرعت باد</span>
              </div>
              <div className={`text-base font-bold ${textColor}`}>
                {toPersianDigits(wc.wind)} km/h
              </div>
            </div>

            <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${mutedColor}`}>
                <Compass size={13} />
                <span className="text-xs">جهت باد</span>
              </div>
              <div className={`text-sm font-bold ${textColor}`}>
                {wc.windDir}
              </div>
            </div>

            <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${mutedColor}`}>
                <Gauge size={13} />
                <span className="text-xs">فشار هوا</span>
              </div>
              <div className={`text-base font-bold ${textColor}`}>
                {toPersianDigits(wc.pressure)} hPa
              </div>
            </div>

            <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${mutedColor}`}>
                <Eye size={13} />
                <span className="text-xs">وضوح هوا</span>
              </div>
              <div className={`text-sm font-bold ${textColor}`}>
                {wc.humidity < 30 ? 'خوب' : wc.humidity < 60 ? 'متوسط' : 'کم'}
              </div>
            </div>
          </div>

          {/* 3-Day Forecast */}
          {weather.forecast && weather.forecast.length > 0 && (
            <div className="mt-5">
              <div className={`flex items-center gap-1.5 mb-3 ${mutedColor}`}>
                <TrendingUp size={14} />
                <span className="text-xs font-medium">پیش‌بینی ۳ روزه</span>
              </div>
              <div className="flex gap-2">
                {weather.forecast.map((day, idx) => {
                  const d = new Date(day.date);
                  const dayName = idx === 0 ? 'امروز' : 
                    ['یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه','شنبه'][d.getDay()];
                  return (
                    <div
                      key={day.date}
                      className={`flex-1 rounded-lg p-3 text-center ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}
                    >
                      <div className={`text-[10px] mb-2 ${mutedColor}`}>{dayName}</div>
                      <div className="text-2xl mb-1">{day.icon}</div>
                      <div className={`text-xs font-bold ${textColor}`}>
                        {toPersianDigits(day.max)}°
                      </div>
                      <div className={`text-[10px] ${mutedColor}`}>
                        {toPersianDigits(day.min)}°
                      </div>
                      {day.rainChance > 0 && (
                        <div className={`flex items-center justify-center gap-0.5 mt-1 text-[9px] text-blue-400`}>
                          <Umbrella size={8} />
                          {toPersianDigits(day.rainChance)}٪
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---- Render Qibla Direction ----
  const renderQibla = () => {
    const QIBLA_DEGREES = Math.round(calcQibla(lat, lng));

    return (
      <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
        <div
          className="px-5 py-4"
          style={{ background: themeGradient }}
        >
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-white/90" />
            <h2 className="text-white font-bold text-base">جهت قبله</h2>
          </div>
        </div>

        <div className="p-5">
          <div className="flex justify-center mb-4">
            <div className="relative" style={{ width: 140, height: 140 }}>
              <div
                className="absolute inset-0 rounded-full cyberpunk-border"
                style={{
                  background: isDark
                    ? 'radial-gradient(circle, #1e293b 0%, #0f172a 100%)'
                    : 'radial-gradient(circle, #ffffff 0%, #f1f5f9 100%)',
                }}
              >
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 140 140">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = i * 30;
                    const rad = (angle * Math.PI) / 180;
                    const isCardinal = i % 3 === 0;
                    const outerR = 67;
                    const innerR = isCardinal ? 56 : 60;
                    return (
                      <line
                        key={i}
                        x1={70 + outerR * Math.sin(rad)}
                        y1={70 - outerR * Math.cos(rad)}
                        x2={70 + innerR * Math.sin(rad)}
                        y2={70 - innerR * Math.cos(rad)}
                        stroke={isCardinal ? themeColor : (isDark ? '#475569' : '#cbd5e1')}
                        strokeWidth={isCardinal ? 2 : 0.8}
                        strokeLinecap="round"
                      />
                    );
                  })}

                  <text x="70" y="20" textAnchor="middle" fill={themeColor} fontSize="11" fontWeight="bold">N</text>
                  <text x="70" y="132" textAnchor="middle" fill={isDark ? '#94a3b8' : '#475569'} fontSize="10">S</text>
                  <text x="130" y="74" textAnchor="middle" fill={isDark ? '#94a3b8' : '#475569'} fontSize="10">E</text>
                  <text x="10" y="74" textAnchor="middle" fill={isDark ? '#94a3b8' : '#475569'} fontSize="10">W</text>

                  <line
                    x1="70" y1="70"
                    x2={70 + 50 * Math.sin((QIBLA_DEGREES * Math.PI) / 180)}
                    y2={70 - 50 * Math.cos((QIBLA_DEGREES * Math.PI) / 180)}
                    stroke="#eab308"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray="4 3"
                  />
                  <circle
                    cx={70 + 50 * Math.sin((QIBLA_DEGREES * Math.PI) / 180)}
                    cy={70 - 50 * Math.cos((QIBLA_DEGREES * Math.PI) / 180)}
                    r="4"
                    fill="#eab308"
                  />
                  <circle cx="70" cy="70" r="3" fill={themeColor} />
                </svg>
              </div>
            </div>
          </div>

          <div className={`text-center ${textColor}`}>
            <div className="text-lg font-bold">
              {toPersianDigits(QIBLA_DEGREES)}° از شمال غربی
            </div>
            <div className={`text-sm mt-1 ${mutedColor}`}>
              جهت قبله از ورکات
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ---- Render ----
  return (
    <div className="flex flex-col gap-4 px-4 pb-6" dir="rtl">
      {renderPrayerTimes()}
      {renderWeather()}
      {renderQibla()}
    </div>
  );
}
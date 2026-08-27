// ============================================
// بلوچستان نما - Prayer Times (MWL Method)
// برای ورکات، لاشار، سیستان و بلوچستان
// عرض: ۲۶.۲° شمالی | طول: ۶۱.۸° شرقی | منطقه زمانی: ۳.۵+
// روش: MWL (Muslim World League)
// ============================================

import { toPersianDigits } from './calendar-utils';

// ============================================
// Types
// ============================================

export interface PrayerTimes {
  fajr: string;      // اذان صبح
  sunrise: string;   // طلوع آفتاب
  dhuhr: string;     // ظهر
  asr: string;       // عصر
  maghrib: string;   // مغرب
  isha: string;      // عشاء
}

export interface PrayerInfo {
  name: string;      // نام فارسی نماز
  time: string;      // زمان به صورت HH:MM
  hour: number;      // ساعت (اعشاری)
  key: keyof PrayerTimes;
}

export interface NextPrayerResult {
  name: string;
  time: string;
  remaining: string;
}

// ============================================
// روش‌های محاسبه نماز (اهل سنت / شیعه)
// ============================================

export type PrayerMethodKey =
  | 'MWL'
  | 'ISNA'
  | 'EGYPT'
  | 'KARACHI'
  | 'UMM_AL_QURA'
  | 'TEHRAN';

export interface PrayerMethodConfig {
  label: string;
  fajrAngle: number;     // زاویه اذان صبح
  ishaAngle: number;     // زاویه عشاء
  asrFactor: 1 | 2;      // ۱ = شافعی/مالکی، ۲ = حنفی
  maghribAngle: number;  // زاویه مغرب (معمولاً ۰.۸۳۳؛ تهران ۴.۵)
  ishaOffsetMin?: number; // عشاء = مغرب + X دقیقه (ام‌القری)
  school?: string;
}

export const PRAYER_METHODS: Record<PrayerMethodKey, PrayerMethodConfig> = {
  MWL:         { label: 'مسلم ورلد لیگ (MWL)',   fajrAngle: 18,   ishaAngle: 17,   asrFactor: 1, maghribAngle: 0.833, school: 'شافعی/مالکی' },
  ISNA:        { label: 'آمریکای شمالی (ISNA)',  fajrAngle: 15,   ishaAngle: 15,   asrFactor: 1, maghribAngle: 0.833 },
  EGYPT:       { label: 'مصر (Egyptian)',        fajrAngle: 19.5, ishaAngle: 17.5, asrFactor: 1, maghribAngle: 0.833 },
  KARACHI:     { label: 'کراچی (اهل سنت - حنفی)', fajrAngle: 18,   ishaAngle: 18,   asrFactor: 2, maghribAngle: 0.833, school: 'حنفی' },
  UMM_AL_QURA: { label: 'ام‌القری مکه',           fajrAngle: 18.5, ishaAngle: 17,   asrFactor: 1, maghribAngle: 0.833, ishaOffsetMin: 90 },
  TEHRAN:      { label: 'تهران (شیعه)',          fajrAngle: 17.7, ishaAngle: 22,   asrFactor: 1, maghribAngle: 4.5 },
};

const SUNRISE_ANGLE = 0.833;   // زاویه طلوع/غروب (استاندارد)


// ============================================
// Helper: Solar Position Math
// ============================================

/**
 * محاسبه تاریخ ژولین
 * Calculate Julian Date from a JavaScript Date
 */
function julianDate(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate() + date.getUTCHours() / 24 + date.getUTCMinutes() / 1440 + date.getUTCSeconds() / 86400;

  if (month <= 2) {
    return (
      Math.floor(365.25 * (year - 1)) +
      Math.floor(30.6001 * (month + 13)) +
      day + 1720994.5
    );
  }

  return (
    Math.floor(365.25 * (year)) +
    Math.floor(30.6001 * (month + 1)) +
    day + 1720994.5
  );
}

/**
 * محاسبه عدد روز از ابتدای سال
 * Calculate the day of the year (1-366)
 */
function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * محاسبه میل انحراف خورشید
 * Calculate Equation of Time (in minutes)
 */
function equationOfTime(doy: number): number {
  const B = (2 * Math.PI / 365) * (doy - 81);
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

/**
 * محاسبه میل شمس (declination) به درجه
 * Calculate Sun's declination angle in degrees
 */
function solarDeclination(doy: number): number {
  return 23.45 * Math.sin((2 * Math.PI / 365) * (doy + 284));
}

/**
 * تبدیل درجه به رادیان
 */
function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * تبدیل رادیان به درجه
 */
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * نرمال‌سازی ساعت به محدوده ۰-۲۴
 */
function normalizeHour(h: number): number {
  h = h % 24;
  if (h < 0) h += 24;
  return h;
}

/**
 * محاسبه ساعت نماز بر اساس زاویه خورشید
 * Calculate hour angle for a given sun altitude
 */
function hourAngle(angle: number, lat: number, decl: number): number {
  const cosHA =
    (Math.sin(toRad(angle)) - Math.sin(toRad(lat)) * Math.sin(toRad(decl))) /
    (Math.cos(toRad(lat)) * Math.cos(toRad(decl)));

  // Check for values outside [-1, 1] (sun never reaches this angle)
  if (cosHA > 1) return -1;  // Sun never goes below this angle
  if (cosHA < -1) return -1; // Sun never reaches this angle

  return toDeg(Math.acos(cosHA)) / 15; // Convert to hours
}

/**
 * فرمت کردن ساعت اعشاری به HH:MM فارسی
 */
function formatTime(decimalHours: number): string {
  if (decimalHours < 0) return '--:--';

  let hours = Math.floor(decimalHours);
  const minutes = Math.floor((decimalHours - hours) * 60 + 0.5);

  if (minutes >= 60) {
    hours += 1;
    const newMin = minutes - 60;
    return toPersianDigits(String(hours).padStart(2, '0')) + ':' + toPersianDigits(String(newMin).padStart(2, '0'));
  }

  return (
    toPersianDigits(String(hours).padStart(2, '0')) +
    ':' +
    toPersianDigits(String(minutes).padStart(2, '0'))
  );
}

// ============================================
// Main Prayer Time Calculation
// ============================================

/**
 * محاسبه اوقات شرعی با روش انتخابی
 * Calculate prayer times using a selectable method
 *
 * @param date - تاریخ میلادی
 * @param lat - عرض جغرافیایی (پیش‌فرض: ورکات ۲۶.۲)
 * @param lng - طول جغرافیایی (پیش‌فرض: ورکات ۶۱.۸)
 * @param tz - منطقه زمانی (پیش‌فرض: ۳.۵+)
 * @param method - روش محاسبه (پیش‌فرض: کراچی/حنفی برای مناطق اهل سنت)
 */
export function calculatePrayerTimes(
  date: Date,
  lat: number = 26.2,
  lng: number = 61.8,
  tz: number = 3.5,
  method: PrayerMethodKey = 'KARACHI'
): PrayerTimes {
  const cfg = PRAYER_METHODS[method] ?? PRAYER_METHODS.KARACHI;
  const doy = dayOfYear(date);
  const eot = equationOfTime(doy);
  const decl = solarDeclination(doy);

  // ظهر (نیمه شرعی)
  const dhuhr = normalizeHour(12 + tz - lng / 15 - eot / 60);

  // اذان صبح — زاویه فجرِ روش
  const fajrHA = hourAngle(-cfg.fajrAngle, lat, decl);
  const fajr = fajrHA >= 0 ? normalizeHour(dhuhr - fajrHA) : -1;

  // طلوع آفتاب — زاویه استاندارد ۰.۸۳۳
  const sunriseHA = hourAngle(-SUNRISE_ANGLE, lat, decl);
  const sunrise = sunriseHA >= 0 ? normalizeHour(dhuhr - sunriseHA) : -1;

  // عصر — ضریب مذهبی (۱ شافعی/مالکی، ۲ حنفی)
  const asrAltRad = Math.atan(
    cfg.asrFactor / (1 + Math.tan(toRad(Math.abs(lat - decl))))
  );
  const asrAlt = toDeg(asrAltRad);
  const asrHA = hourAngle(asrAlt, lat, decl);
  const asr = asrHA >= 0 ? normalizeHour(dhuhr + asrHA) : -1;

  // مغرب — زاویه مخصوص روش (تهران ۴.۵، بقیه ۰.۸۳۳)
  const maghribHA = hourAngle(-cfg.maghribAngle, lat, decl);
  const maghrib =
    maghribHA >= 0
      ? normalizeHour(dhuhr + maghribHA)
      : sunriseHA >= 0
        ? normalizeHour(dhuhr + sunriseHA)
        : -1;

  // عشاء — یا با زاویه، یا با فاصله‌ی دقیقه از مغرب (ام‌القری)
  let isha: number;
  if (cfg.ishaOffsetMin != null) {
    isha = maghrib >= 0 ? normalizeHour(maghrib + cfg.ishaOffsetMin / 60) : -1;
  } else {
    const ishaHA = hourAngle(-cfg.ishaAngle, lat, decl);
    isha = ishaHA >= 0 ? normalizeHour(dhuhr + ishaHA) : -1;
  }

  return {
    fajr: formatTime(fajr),
    sunrise: formatTime(sunrise),
    dhuhr: formatTime(dhuhr),
    asr: formatTime(asr),
    maghrib: formatTime(maghrib),
    isha: formatTime(isha),
  };
}

// ============================================
// Persian Prayer Names
// ============================================

export const PRAYER_NAMES: Record<keyof PrayerTimes, string> = {
  fajr: 'اذان صبح',
  sunrise: 'طلوع آفتاب',
  dhuhr: 'ظهر',
  asr: 'عصر',
  maghrib: 'مغرب',
  isha: 'عشاء',
};

export const PRAYER_SHORT_NAMES: Record<keyof PrayerTimes, string> = {
  fajr: 'صبح',
  sunrise: 'طلوع',
  dhuhr: 'ظهر',
  asr: 'عصر',
  maghrib: 'مغرب',
  isha: 'عشاء',
};

// Order of prayers throughout the day
export const PRAYER_ORDER: (keyof PrayerTimes)[] = [
  'fajr',
  'sunrise',
  'dhuhr',
  'asr',
  'maghrib',
  'isha',
];

// ============================================
// Next Prayer
// ============================================

/**
 * محاسبه نماز بعدی و زمان باقیمانده
 * Find the next upcoming prayer and remaining time
 */
export function getNextPrayer(prayerTimes: PrayerTimes): NextPrayerResult {
  const now = new Date();
  const currentDecimalHours = now.getHours() + now.getMinutes() / 60;

  let nextName = '';
  let nextTime = '';
  let nextDecimal = Infinity;

  // Parse prayer times to find the next one
  for (const key of PRAYER_ORDER) {
    const timeStr = prayerTimes[key];
    if (timeStr === '--:--') continue;

    // Parse HH:MM (may have Persian digits)
    const cleaned = timeStr
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .trim();
    const parts = cleaned.split(':');
    if (parts.length !== 2) continue;

    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1], 10);
    const decimal = hour + minute / 60;

    if (decimal > currentDecimalHours && decimal < nextDecimal) {
      nextDecimal = decimal;
      nextName = PRAYER_SHORT_NAMES[key];
      nextTime = timeStr;
    }
  }

  // If no prayer found for today (all passed), return tomorrow's Fajr
  if (nextName === '') {
    nextName = PRAYER_SHORT_NAMES.fajr;
    nextTime = prayerTimes.fajr;
    // Calculate remaining time until tomorrow's fajr
    const fajrCleaned = prayerTimes.fajr
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .trim();
    const fajrParts = fajrCleaned.split(':');
    if (fajrParts.length === 2) {
      const fajrHour = parseInt(fajrParts[0], 10);
      const fajrMin = parseInt(fajrParts[1], 10);
      const fajrDecimal = fajrHour + fajrMin / 60;
      const hoursUntilMidnight = 24 - currentDecimalHours;
      const totalRemaining = hoursUntilMidnight + fajrDecimal;
      return {
        name: nextName,
        time: nextTime,
        remaining: formatRemaining(totalRemaining),
      };
    }
  }

  const remaining = nextDecimal - currentDecimalHours;

  return {
    name: nextName,
    time: nextTime,
    remaining: formatRemaining(remaining),
  };
}

/**
 * فرمت کردن زمان باقیمانده به فارسی
 */
function formatRemaining(decimalHours: number): string {
  if (decimalHours < 0) return '';

  const totalMinutes = Math.floor(decimalHours * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return toPersianDigits(`${hours} ساعت و ${minutes} دقیقه`);
  } else if (hours > 0) {
    return toPersianDigits(`${hours} ساعت`);
  } else {
    return toPersianDigits(`${minutes} دقیقه`);
  }
}

/**
 * دریافت لیست کامل اوقات شرعی با اطلاعات فارسی
 */
export function getPrayerList(prayerTimes: PrayerTimes): PrayerInfo[] {
  return PRAYER_ORDER.map((key) => {
    const timeStr = prayerTimes[key];
    const cleaned = timeStr
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .trim();
    const parts = cleaned.split(':');
    const hour = parts.length === 2 ? parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60 : 0;

    return {
      name: PRAYER_NAMES[key],
      time: timeStr,
      hour,
      key,
    };
  });
}

/**
 * بررسی آیا نماز فعلی گذشته است یا نه
 */
export function isPrayerPassed(prayerTime: string): boolean {
  const now = new Date();
  const currentDecimalHours = now.getHours() + now.getMinutes() / 60;

  const cleaned = prayerTime
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .trim();
  const parts = cleaned.split(':');
  if (parts.length !== 2) return false;

  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  return currentDecimalHours > hour + minute / 60;
}

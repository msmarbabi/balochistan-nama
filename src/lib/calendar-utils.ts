import * as jalaali from 'jalaali-js';

// ============================================
// Hijri (Qamari) Calendar Conversion
// Pure implementation - no external library needed
// ============================================

function intPart(floatNum: number): number {
  if (floatNum < 0) return Math.ceil(floatNum - 0.0000001);
  return Math.floor(floatNum + 0.0000001);
}

function gregorianToJulianDay(gy: number, gm: number, gd: number): number {
  if (gm <= 2) { gy -= 1; gm += 12; }
  const A = Math.floor(gy / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (gy + 4716)) + Math.floor(30.6001 * (gm + 1)) + gd + B - 1524.5;
}

function julianDayToHijri(jd: number): { hy: number; hm: number; hd: number } {
  const L = Math.floor(jd - 1948440 + 10632);
  const N = Math.floor((L - 1) / 10631);
  const L2 = L - 10631 * N + 354;
  const J = Math.floor((10985 - L2) / 5316) * Math.floor((50 * L2) / 17719)
    + Math.floor(L2 / 5670) * Math.floor((43 * L2) / 15238);
  const L3 = L2 - Math.floor((30 - J) / 15) * Math.floor((17719 * J) / 50)
    - Math.floor(J / 16) * Math.floor((15238 * J) / 43) + 29;
  const M = Math.floor((24 * L3) / 709);
  const D = L3 - Math.floor((709 * M) / 24);
  const Y = 30 * N + J - 30;
  return { hy: Y, hm: M, hd: D };
}

function hijriToJulianDay(hy: number, hm: number, hd: number): number {
  return Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
}

function julianDayToGregorian(jd: number): { gy: number; gm: number; gd: number } {
  const Z = intPart(jd + 0.5);
  const A = Math.floor((Z - 1867216.25) / 36524.25);
  const A2 = Z + 1 + A - Math.floor(A / 4);
  const B = A2 + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const gd = B - D - Math.floor(30.6001 * E);
  const gm = E < 14 ? E - 1 : E - 13;
  const gy = gm > 2 ? C - 4716 : C - 4715;
  return { gy, gm, gd };
}

// ============================================
// Types
// ============================================

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface TripleDate {
  /** Shamsi (Jalali) date */
  shamsi: {
    year: number;
    month: number;
    day: number;
  };
  /** Miladi (Gregorian) date */
  miladi: {
    year: number;
    month: number;
    day: number;
  };
  /** Qamari (Hijri) date */
  qamari: {
    year: number;
    month: number;
    day: number;
  };
}

// ============================================
// Persian Names
// ============================================

/** نام ماه‌های شمسی */
export const SHAMSI_MONTH_NAMES: readonly string[] = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** نام ماه‌های قمری */
export const QAMARI_MONTH_NAMES: readonly string[] = [
  'محرم',
  'صفر',
  'ربیع‌الاول',
  'ربیع‌الثانی',
  'جمادی‌الاول',
  'جمادی‌الثانی',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذی‌القعده',
  'ذی‌الحجه',
] as const;

/** نام روزهای هفته */
export const PERSIAN_DAY_NAMES: readonly string[] = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
] as const;

/** نام ماه‌های میلادی به فارسی */
export const GREGORIAN_MONTH_NAMES: readonly string[] = [
  'ژانویه',
  'فوریه',
  'مارس',
  'آوریل',
  'مه',
  'ژوئن',
  'ژوئیه',
  'اوت',
  'سپتامبر',
  'اکتبر',
  'نوامبر',
  'دسامبر',
] as const;

// ============================================
// Conversion Functions
// ============================================

/**
 * تبدیل تاریخ میلادی به شمسی
 * Gregorian to Jalali (Shamsi)
 */
export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number
): { jy: number; jm: number; jd: number } {
  const result = jalaali.toJalaali(gy, gm, gd);
  return {
    jy: result.jy,
    jm: result.jm,
    jd: result.jd,
  };
}

/**
 * تبدیل تاریخ شمسی به میلادی
 * Jalali (Shamsi) to Gregorian
 */
export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number
): { gy: number; gm: number; gd: number } {
  const result = jalaali.toGregorian(jy, jm, jd);
  return {
    gy: result.gy,
    gm: result.gm,
    gd: result.gd,
  };
}

/**
 * تبدیل تاریخ میلادی به قمری
 * Gregorian to Hijri (Qamari)
 */
export function gregorianToHijri(
  gy: number,
  gm: number,
  gd: number
): { hy: number; hm: number; hd: number } {
  const jd = gregorianToJulianDay(gy, gm, gd);
  return julianDayToHijri(jd);
}

/**
 * تبدیل تاریخ قمری به میلادی
 * Hijri (Qamari) to Gregorian
 */
export function hijriToGregorian(
  hy: number,
  hm: number,
  hd: number
): { gy: number; gm: number; gd: number } {
  const jd = hijriToJulianDay(hy, hm, hd);
  return julianDayToGregorian(jd);
}

/**
 * دریافت تاریخ امروز در سه تقویم
 * Get today's date in all three calendar systems
 */
export function getCurrentTripleDate(): TripleDate {
  const now = new Date();
  const gy = now.getFullYear();
  const gm = now.getMonth() + 1;
  const gd = now.getDate();

  const { jy, jm, jd } = gregorianToJalali(gy, gm, gd);
  const { hy, hm, hd } = gregorianToHijri(gy, gm, gd);

  return {
    shamsi: { year: jy, month: jm, day: jd },
    miladi: { year: gy, month: gm, day: gd },
    qamari: { year: hy, month: hm, day: hd },
  };
}

// ============================================
// Season & Calendar Helpers
// ============================================

/**
 * دریافت فصل بر اساس ماه شمسی
 * Get the season based on Jalali month
 */
export function getSeason(jalaliMonth: number): Season {
  if (jalaliMonth >= 1 && jalaliMonth <= 3) return 'spring';
  if (jalaliMonth >= 4 && jalaliMonth <= 6) return 'summer';
  if (jalaliMonth >= 7 && jalaliMonth <= 9) return 'autumn';
  return 'winter';
}

/**
 * دریافت تعداد روزهای یک ماه شمسی
 * Get the number of days in a Jalali month
 */
export function getJalaliMonthDays(jy: number, jm: number): number {
  // months 1-6 have 31 days, months 7-11 have 30 days
  // month 12 has 29 days (30 in leap years)
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  if (jm === 12) return isJalaliLeapYear(jy) ? 30 : 29;
  return 0;
}

/**
 * بررسی سال کبیسه شمسی
 * Check if a Jalali year is a leap year
 */
export function isJalaliLeapYear(jy: number): boolean {
  return jalaali.isLeapJalaaliYear(jy);
}

/**
 * دریافت روز اول ماه شمسی (۰=شنبه تا ۶=جمعه)
 * Get the first day of a Jalali month
 * Returns 0-6 where 0=Saturday, 6=Friday
 */
export function getFirstDayOfMonth(jy: number, jm: number): number {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, 1);
  const date = new Date(gy, gm - 1, gd);
  // getDay() returns 0=Sunday, 6=Saturday
  // We need 0=Saturday, 1=Sunday, ..., 6=Friday
  const dayOfWeek = date.getDay();
  return (dayOfWeek + 1) % 7;
}

// ============================================
// Utility Helpers
// ============================================

/**
 * تبدیل اعداد به فارسی
 * Convert numbers to Persian digits
 */
export function toPersianDigits(num: number | string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(num).replace(/[0-9]/g, (d) => persianDigits[parseInt(d)]);
}

/**
 * دریافت نام فارسی ماه شمسی
 */
export function getShamsiMonthName(month: number): string {
  return SHAMSI_MONTH_NAMES[month - 1] || '';
}

/**
 * دریافت نام فارسی ماه قمری
 */
export function getQamariMonthName(month: number): string {
  return QAMARI_MONTH_NAMES[month - 1] || '';
}

/**
 * دریافت نام فارسی ماه میلادی
 */
export function getGregorianMonthName(month: number): string {
  return GREGORIAN_MONTH_NAMES[month - 1] || '';
}

/**
 * دریافت نام فارسی روز هفته (بر اساس تاریخ میلادی)
 */
export function getPersianDayName(gy: number, gm: number, gd: number): string {
  const date = new Date(gy, gm - 1, gd);
  const dayOfWeek = date.getDay();
  // Convert Sunday=0 to our index where Saturday=0
  const index = (dayOfWeek + 1) % 7;
  return PERSIAN_DAY_NAMES[index];
}

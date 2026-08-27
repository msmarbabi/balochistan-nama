// ============================================
// Types
// ============================================

export type CalendarType = 'shamsi' | 'gregorian' | 'qamari';
export type DayEventType = 'holiday' | 'named_day' | 'baluch_event';

export interface DayEvent {
  name: string;
  type: DayEventType;
  calendar: CalendarType;
}

export interface DayInfo {
  holidays: DayEvent[];
  namedDays: DayEvent[];
  baluchEvents: DayEvent[];
  all: DayEvent[];
}

// ============================================
// Shamsi Official Holidays (تعطیلات رسمی شمسی)
// ============================================

/**
 * تعطیلات رسمی شمسی ایران
 * کلید به فرمت "ماه/روز" شمسی
 */
export const shamsiHolidays: Record<string, string> = {
  '1/1': 'نوروز',
  '1/2': 'نوروز',
  '1/3': 'نوروز',
  '1/4': 'نوروز',
  '1/12': 'روز جمهوری اسلامی',
  '1/13': 'سیزده‌بدر',
  '3/14': 'رحلت امام خمینی',
  '3/15': 'قیام ۱۵ خرداد',
  '11/22': 'پیروزی انقلاب اسلامی',
  '12/29': 'ملی شدن صنعت نفت',
};

// ============================================
// Shamsi Named Days (ایام نام‌گذاری شده شمسی)
// ============================================

/**
 * ایام نام‌گذاری شده شمسی
 * کلید به فرمت "ماه/روز" شمسی
 */
export const shamsiNamedDays: Record<string, string> = {
  '1/7': 'روز صنعت و معدن',
  '1/12': 'روز جمهوری اسلامی',
  '1/13': 'روز طبیعت',
  '2/3': 'روز بزرگداشت حکیم عمر خیام',
  '2/15': 'روز بزرگداشت شیخ بهایی',
  '3/1': 'روز اسناد ملی/روز حفظ آثار باستانی',
  '3/5': 'روز بزرگداشت مولوی',
  '4/1': 'روز سینا',
  '5/6': 'روز بزرگداشت علامه طباطبایی',
  '6/1': 'روز بزرگداشت ابوعلی سینا',
  '6/13': 'روز تعاون',
  '6/31': 'آخرین روز شهریور',
  '7/8': 'روز بزرگداشت مولانا عبدالرحمن جامی',
  '7/13': 'روز تعاون',
  '8/10': 'روز بزرگداشت شیخ صدوق',
  '9/1': 'روز بسیج',
  '9/5': 'روز بزرگداشت خواجوی کرمانی',
  '9/16': 'روز دانشجو',
  '10/5': 'روز بزرگداشت شمس',
  '11/22': 'روز بزرگداشت احمد شاملو',
  '12/5': 'روز بزرگداشت خواجه نصیر',
};

// ============================================
// Gregorian Holidays (تعطیلات میلادی)
// ============================================

/**
 * تعطیلات میلادی
 * کلید به فرمت "ماه/روز" میلادی
 */
export const gregorianHolidays: Record<string, string> = {
  '1/1': 'روز اول میلادی',
  '3/20': 'روز زمین',
  '3/21': 'نوروز بین‌المللی',
  '5/1': 'روز کارگر',
  '10/24': 'روز سازمان ملل',
  '12/25': 'کریسمس',
  '12/31': 'شب سال نو میلادی',
};

// ============================================
// Qamari (Sunni) Holidays (تعطیلات قمری - اهل سنت)
// ============================================

/**
 * تعطیلات قمری (نسخه اهل سنت)
 * کلید به فرمت "ماه/روز" قمری
 */
export const qamariHolidays: Record<string, string> = {
  '1/1': 'آغاز سال هجری قمری',
  '1/10': 'روز عاشورا (اهل سنت)',
  '3/12': 'مولد النبی صلی الله علیه وسلم',
  '7/27': 'شب معراج',
  '8/15': 'شب قدر',
  '9/1': 'آغاز ماه رمضان',
  '9/27': 'شب قدر',
  '10/1': 'عید فطر',
  '10/2': 'عید فطر',
  '10/3': 'عید فطر',
  '12/8': 'روز عرفه',
  '12/9': 'عید قربان',
  '12/10': 'عید قربان',
  '12/10': 'عید قربان (سوم)',
};

// ============================================
// Qamari Named Days (ایام نام‌گذاری شده قمری)
// ============================================

/**
 * ایام نام‌گذاری شده قمری
 * کلید به فرمت "ماه/روز" قمری
 */
export const qamariNamedDays: Record<string, string> = {
  '1/1': 'آغاز سال هجری',
  '1/7': 'شهادت امام صادق (اهل سنت)',
  '1/10': 'عاشورای حسینی',
  '3/12': 'میلاد پیامبر اکرم',
  '7/27': 'اسراء و معراج',
  '8/15': 'شب برائت',
  '9/27': 'شب قدر',
  '12/9': 'عرفه',
};

// ============================================
// Baluchistan Special Events (ایام ویژه بلوچستان)
// ============================================

/**
 * ایام ویژه بلوچستان
 * کلید به فرمت "ماه/روز" شمسی
 * این تاریخ‌ها برای مردم بلوچ اهمیت فرهنگی و تاریخی دارند
 */
export const baluchistanEvents: Record<string, string> = {
  '1/1': 'نوروز بلوچی - جشن باستانی بلوچ‌ها',
  '1/15': 'روز فرهنگ بلوچ',
  '2/2': 'روز زبان بلوچی',
  '3/20': 'جشن بهار بلوچی',
  '5/15': 'روز بلوچستان',
  '6/20': 'جشن گندم‌کاروان بلوچ',
  '9/15': 'یادبود شاعران بلوچ',
  '10/10': 'جشن برداشت بلوچی',
  '11/5': 'روز میراث بلوچ',
  '12/15': 'شب یلدا بلوچی',
};

// ============================================
// Helper Functions
// ============================================

/**
 * دریافت اطلاعات روز شامل تعطیلات، ایام نام‌گذاری شده و رویدادهای بلوچستان
 * 
 * @param jalaliMonth ماه شمسی (۱-۱۲)
 * @param jalaliDay روز شمسی (۱-۳۱)
 * @param gregorianMonth ماه میلادی (۱-۱۲)
 * @param gregorianDay روز میلادی (۱-۳۱)
 * @param hijriMonth ماه قمری (۱-۱۲)
 * @param hijriDay روز قمری (۱-۳۰)
 * @returns اطلاعات کامل روز شامل تمام رویدادها
 */
export function getDayInfo(
  jalaliMonth: number,
  jalaliDay: number,
  gregorianMonth: number,
  gregorianDay: number,
  hijriMonth: number,
  hijriDay: number
): DayInfo {
  const holidays: DayEvent[] = [];
  const namedDays: DayEvent[] = [];
  const baluchEvents: DayEvent[] = [];

  // --- Shamsi holidays ---
  const shamsiKey = `${jalaliMonth}/${jalaliDay}`;
  if (shamsiHolidays[shamsiKey]) {
    holidays.push({
      name: shamsiHolidays[shamsiKey],
      type: 'holiday',
      calendar: 'shamsi',
    });
  }

  // --- Shamsi named days ---
  if (shamsiNamedDays[shamsiKey]) {
    namedDays.push({
      name: shamsiNamedDays[shamsiKey],
      type: 'named_day',
      calendar: 'shamsi',
    });
  }

  // --- Gregorian holidays ---
  const gregorianKey = `${gregorianMonth}/${gregorianDay}`;
  if (gregorianHolidays[gregorianKey]) {
    holidays.push({
      name: gregorianHolidays[gregorianKey],
      type: 'holiday',
      calendar: 'gregorian',
    });
  }

  // --- Qamari holidays (Sunni) ---
  const qamariKey = `${hijriMonth}/${hijriDay}`;
  if (qamariHolidays[qamariKey]) {
    holidays.push({
      name: qamariHolidays[qamariKey],
      type: 'holiday',
      calendar: 'qamari',
    });
  }

  // --- Qamari named days ---
  if (qamariNamedDays[qamariKey]) {
    namedDays.push({
      name: qamariNamedDays[qamariKey],
      type: 'named_day',
      calendar: 'qamari',
    });
  }

  // --- Baluchistan events ---
  if (baluchistanEvents[shamsiKey]) {
    baluchEvents.push({
      name: baluchistanEvents[shamsiKey],
      type: 'baluch_event',
      calendar: 'shamsi',
    });
  }

  return {
    holidays,
    namedDays,
    baluchEvents,
    all: [...holidays, ...namedDays, ...baluchEvents],
  };
}

/**
 * بررسی اینکه آیا یک روز شمسی تعطیل رسمی است
 */
export function isShamsiHoliday(jalaliMonth: number, jalaliDay: number): boolean {
  const key = `${jalaliMonth}/${jalaliDay}`;
  return key in shamsiHolidays;
}

/**
 * بررسی اینکه آیا یک روز قمری تعطیل رسمی (اهل سنت) است
 */
export function isQamariHoliday(hijriMonth: number, hijriDay: number): boolean {
  const key = `${hijriMonth}/${hijriDay}`;
  return key in qamariHolidays;
}

/**
 * دریافت لیست تمام تعطیلات شمسی سال جاری
 */
export function getAllShamsiHolidaysOfYear(jalaliYear: number): Array<{
  month: number;
  day: number;
  name: string;
}> {
  return Object.entries(shamsiHolidays).map(([key, name]) => {
    const [m, d] = key.split('/').map(Number);
    return { month: m, day: d, name };
  });
}

/**
 * دریافت لیست تمام رویدادهای بلوچستان سال جاری
 */
export function getAllBaluchistanEventsOfYear(): Array<{
  month: number;
  day: number;
  name: string;
}> {
  return Object.entries(baluchistanEvents).map(([key, name]) => {
    const [m, d] = key.split('/').map(Number);
    return { month: m, day: d, name };
  });
}

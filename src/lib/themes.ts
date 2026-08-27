// ============================================
// بلوچستان نما - Seasonal & Monthly Color Themes
// VIBRANT/LIVELY color scheme with strong gradients
// ============================================

export interface MonthTheme {
  primary: string;
  secondary: string;
  accent: string;
  gradient: string; // CSS gradient for backgrounds
  textAccent: string;
  cardBg: string;
  holidayBg: string;
}

export interface SeasonTheme {
  name: string;
  nameEn: string;
  icon: string;
  months: number[]; // Shamsi months 1-12
  theme: MonthTheme;
}

// ============================================
// Monthly Themes — Light Mode (Vibrant)
// ============================================

const monthlyThemesLight: Record<number, MonthTheme> = {
  1: {
    // فروردین — Vibrant green, renewal of spring
    primary: '#059669',
    secondary: '#10b981',
    accent: '#34d399',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #34d399 100%)',
    textAccent: '#047857',
    cardBg: '#ecfdf5',
    holidayBg: '#d1fae5',
  },
  2: {
    // اردیبهشت — Vibrant pink/rose, blossoms
    primary: '#e11d48',
    secondary: '#f43f5e',
    accent: '#fb7185',
    gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #fb7185 100%)',
    textAccent: '#be123c',
    cardBg: '#fff1f2',
    holidayBg: '#ffe4e6',
  },
  3: {
    // خرداد — Vibrant yellow/lime, full spring
    primary: '#eab308',
    secondary: '#84cc16',
    accent: '#fbbf24',
    gradient: 'linear-gradient(135deg, #eab308 0%, #84cc16 50%, #fbbf24 100%)',
    textAccent: '#a16207',
    cardBg: '#fefce8',
    holidayBg: '#fef9c3',
  },
  4: {
    // تیر — Vibrant orange/amber, summer heat
    primary: '#ea580c',
    secondary: '#f97316',
    accent: '#fb923c',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 50%, #fb923c 100%)',
    textAccent: '#c2410c',
    cardBg: '#fff7ed',
    holidayBg: '#ffedd5',
  },
  5: {
    // مرداد — Vibrant red/orange, peak summer
    primary: '#dc2626',
    secondary: '#ef4444',
    accent: '#f87171',
    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #f87171 100%)',
    textAccent: '#b91c1c',
    cardBg: '#fef2f2',
    holidayBg: '#fee2e2',
  },
  6: {
    // شهریور — Vibrant gold/amber, late summer
    primary: '#b45309',
    secondary: '#d97706',
    accent: '#f59e0b',
    gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 50%, #f59e0b 100%)',
    textAccent: '#92400e',
    cardBg: '#fffbeb',
    holidayBg: '#fef3c7',
  },
  7: {
    // مهر — Vibrant orange/brown, autumn
    primary: '#9a3412',
    secondary: '#c2410c',
    accent: '#ea580c',
    gradient: 'linear-gradient(135deg, #c2410c 0%, #9a3412 50%, #ea580c 100%)',
    textAccent: '#7c2d12',
    cardBg: '#fff7ed',
    holidayBg: '#fed7aa',
  },
  8: {
    // آبان — Vibrant red/crimson, deep autumn
    primary: '#991b1b',
    secondary: '#b91c1c',
    accent: '#dc2626',
    gradient: 'linear-gradient(135deg, #b91c1c 0%, #991b1b 50%, #dc2626 100%)',
    textAccent: '#7f1d1d',
    cardBg: '#fef2f2',
    holidayBg: '#fecaca',
  },
  9: {
    // آذر — Vibrant teal/cyan, pre-winter
    primary: '#0e7490',
    secondary: '#0891b2',
    accent: '#22d3ee',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 50%, #22d3ee 100%)',
    textAccent: '#155e75',
    cardBg: '#ecfeff',
    holidayBg: '#cffafe',
  },
  10: {
    // دی — Vibrant blue/indigo, winter
    primary: '#1d4ed8',
    secondary: '#2563eb',
    accent: '#3b82f6',
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #3b82f6 100%)',
    textAccent: '#1e40af',
    cardBg: '#eff6ff',
    holidayBg: '#dbeafe',
  },
  11: {
    // بهمن — Vibrant purple/violet, deep winter
    primary: '#6d28d9',
    secondary: '#7c3aed',
    accent: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #8b5cf6 100%)',
    textAccent: '#5b21b6',
    cardBg: '#f5f3ff',
    holidayBg: '#ede9fe',
  },
  12: {
    // اسفند — Vibrant emerald/jade, pre-spring
    primary: '#047857',
    secondary: '#059669',
    accent: '#10b981',
    gradient: 'linear-gradient(135deg, #059669 0%, #047857 50%, #10b981 100%)',
    textAccent: '#065f46',
    cardBg: '#ecfdf5',
    holidayBg: '#a7f3d0',
  },
};

// ============================================
// Monthly Themes — Dark Mode (Deeper, more saturated)
// ============================================

const monthlyThemesDark: Record<number, MonthTheme> = {
  1: {
    primary: '#059669',
    secondary: '#10b981',
    accent: '#34d399',
    gradient: 'linear-gradient(135deg, #065f46 0%, #047857 40%, #059669 100%)',
    textAccent: '#6ee7b7',
    cardBg: '#022c22',
    holidayBg: '#064e3b',
  },
  2: {
    primary: '#e11d48',
    secondary: '#f43f5e',
    accent: '#fb7185',
    gradient: 'linear-gradient(135deg, #9f1239 0%, #be123c 40%, #e11d48 100%)',
    textAccent: '#fda4af',
    cardBg: '#2a0a0e',
    holidayBg: '#4c0519',
  },
  3: {
    primary: '#eab308',
    secondary: '#84cc16',
    accent: '#fbbf24',
    gradient: 'linear-gradient(135deg, #713f12 0%, #854d0e 40%, #a16207 100%)',
    textAccent: '#fde047',
    cardBg: '#1c1a04',
    holidayBg: '#422006',
  },
  4: {
    primary: '#ea580c',
    secondary: '#f97316',
    accent: '#fb923c',
    gradient: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 40%, #c2410c 100%)',
    textAccent: '#fdba74',
    cardBg: '#1c0f05',
    holidayBg: '#431407',
  },
  5: {
    primary: '#dc2626',
    secondary: '#ef4444',
    accent: '#f87171',
    gradient: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 100%)',
    textAccent: '#fca5a5',
    cardBg: '#1a0505',
    holidayBg: '#450a0a',
  },
  6: {
    primary: '#b45309',
    secondary: '#d97706',
    accent: '#f59e0b',
    gradient: 'linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 100%)',
    textAccent: '#fcd34d',
    cardBg: '#1a0e02',
    holidayBg: '#451a03',
  },
  7: {
    primary: '#9a3412',
    secondary: '#c2410c',
    accent: '#ea580c',
    gradient: 'linear-gradient(135deg, #431407 0%, #7c2d12 40%, #9a3412 100%)',
    textAccent: '#fdba74',
    cardBg: '#170c04',
    holidayBg: '#3b0f03',
  },
  8: {
    primary: '#991b1b',
    secondary: '#b91c1c',
    accent: '#dc2626',
    gradient: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 40%, #991b1b 100%)',
    textAccent: '#fca5a5',
    cardBg: '#160505',
    holidayBg: '#3b0606',
  },
  9: {
    primary: '#0e7490',
    secondary: '#0891b2',
    accent: '#22d3ee',
    gradient: 'linear-gradient(135deg, #083344 0%, #155e75 40%, #0e7490 100%)',
    textAccent: '#67e8f9',
    cardBg: '#042f2e',
    holidayBg: '#164e63',
  },
 10: {
    primary: '#1d4ed8',
    secondary: '#2563eb',
    accent: '#3b82f6',
    gradient: 'linear-gradient(135deg, #172554 0%, #1e3a5f 40%, #1d4ed8 100%)',
    textAccent: '#93c5fd',
    cardBg: '#0c1a3d',
    holidayBg: '#1e3a5f',
  },
  11: {
    primary: '#6d28d9',
    secondary: '#7c3aed',
    accent: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 40%, #6d28d9 100%)',
    textAccent: '#c4b5fd',
    cardBg: '#0f0524',
    holidayBg: '#2e1065',
  },
 12: {
    primary: '#047857',
    secondary: '#059669',
    accent: '#10b981',
    gradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 40%, #047857 100%)',
    textAccent: '#6ee7b7',
    cardBg: '#011a14',
    holidayBg: '#022c22',
  },
};

// ============================================
// Season Themes
// ============================================

export const seasonThemes: SeasonTheme[] = [
  {
    name: 'بهار',
    nameEn: 'spring',
    icon: '🌸',
    months: [1, 2, 3],
    theme: monthlyThemesLight[1],
  },
  {
    name: 'تابستان',
    nameEn: 'summer',
    icon: '☀️',
    months: [4, 5, 6],
    theme: monthlyThemesLight[4],
  },
  {
    name: 'پاییز',
    nameEn: 'autumn',
    icon: '🍂',
    months: [7, 8, 9],
    theme: monthlyThemesLight[7],
  },
  {
    name: 'زمستان',
    nameEn: 'winter',
    icon: '❄️',
    months: [10, 11, 12],
    theme: monthlyThemesLight[10],
  },
];

// ============================================
// Exported Functions
// ============================================

/**
 * دریافت تم رنگی ماه شمسی
 * Get the color theme for a Shamsi month (1-12)
 */
export function getMonthTheme(month: number, isDark: boolean = false): MonthTheme {
  const clampedMonth = Math.max(1, Math.min(12, month));
  if (isDark) {
    return monthlyThemesDark[clampedMonth];
  }
  return monthlyThemesLight[clampedMonth];
}

/**
 * دریافت تم رنگی فصل
 * Get the color theme for a season
 */
export function getSeasonTheme(season: string): SeasonTheme {
  const found = seasonThemes.find(
    (s) => s.nameEn === season || s.name === season
  );
  return found || seasonThemes[0];
}

/**
 * دریافت گرادیان CSS ماه شمسی
 * Get the CSS linear-gradient string for a Shamsi month
 */
export function getMonthGradient(month: number, isDark: boolean = false): string {
  const theme = getMonthTheme(month, isDark);
  return theme.gradient;
}

/**
 * دریافت نام فارسی ماه شمسی
 */
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

/**
 * دریافت نام فارسی فصل بر اساس ماه شمسی
 */
export function getSeasonName(month: number): string {
  if (month >= 1 && month <= 3) return 'بهار';
  if (month >= 4 && month <= 6) return 'تابستان';
  if (month >= 7 && month <= 9) return 'پاییز';
  return 'زمستان';
}

/**
 * دریافت آیکون فصل
 */
export function getSeasonIcon(month: number): string {
  if (month >= 1 && month <= 3) return '🌸';
  if (month >= 4 && month <= 6) return '☀️';
  if (month >= 7 && month <= 9) return '🍂';
  return '❄️';
}

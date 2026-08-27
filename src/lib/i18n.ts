// سیستم ترجمه ساده (فارسی ⇄ بلوچی)
// تدریجاً تکمیل می‌شود؛ رشته‌های پرکاربرد ابتدا آورده شده‌اند.

export type LangKey = 'fa' | 'bal';

type Entry = { fa: string; bal: string };

export const STRINGS: Record<string, Entry> = {
  'tab.calendar': { fa: 'تقویم', bal: 'تَقويم' },
  'tab.clock': { fa: 'ساعت', bal: 'ساعت' },
  'tab.prayer': { fa: 'نماز', bal: 'نماز' },
  'tab.tasbeeh': { fa: 'تسبیح', bal: 'تَسبیح' },
  'tab.culture': { fa: 'فرهنگ', bal: 'فرهنگ' },
  'tab.notes': { fa: 'یادداشت', bal: 'یادداشت' },

  'app.name': { fa: 'بلوچستان نما', bal: 'بلوچستان نما' },

  'settings.title': { fa: 'تنظیمات', bal: 'تَنظیمات' },
  'settings.location': { fa: 'موقعیت', bal: 'جاهگاه' },
  'settings.prayerMethod': { fa: 'روش محاسبه نماز', bal: 'روش حساب نماز' },
  'settings.language': { fa: 'زبان رابط', bal: 'زوان ءِ روئیت' },

  'header.prayer': { fa: 'اوقات شرعی', bal: 'اوقات شرعی' },
  'header.weather': { fa: 'هواشناسی', bal: 'هَوا' },
  'header.notes': { fa: 'یادداشت‌ها', bal: 'یادداشت‌ء' },
  'header.tasbeeh': { fa: 'تسبیح', bal: 'تَسبیح' },
  'header.culture': { fa: 'فرهنگ بلوچی', bal: 'فرهنگ بلوچ' },
  'header.clock': { fa: 'ساعت و قطب‌نما', bal: 'ساعت ءَ قطبنما' },

  'btn.newNote': { fa: 'یادداشت جدید', bal: 'یادداشت نوک' },
  'btn.share': { fa: 'اشتراک‌گذاری', bal: 'شِریک کُراگ' },
  'btn.backup': { fa: 'بکاپ', bal: 'بکاپ' },
};

export function t(key: string, lang: LangKey): string {
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[lang] ?? entry.fa;
}

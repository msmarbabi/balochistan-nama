'use client';

import { useSettings, CITIES, PRAYER_METHODS } from '@/lib/settings';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  themeColor: string;
  themeGradient: string;
}

export default function SettingsSheet({ open, onOpenChange, isDark, themeColor, themeGradient }: Props) {
  const settings = useSettings();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-right">تنظیمات</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-1 py-3">
          {/* انتخاب شهر / موقعیت */}
          <div className={cn(
            'rounded-xl border p-4',
            isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
          )}>
            <label className="mb-2 block text-sm font-medium">📍 شهر / موقعیت</label>
            <Select
              value={settings.locationName}
              onValueChange={(val) => {
                const city = CITIES.find((c) => c.name === val);
                if (city) updateSettings({ lat: city.lat, lng: city.lng, locationName: city.name });
              }}
            >
              <SelectTrigger className="rounded-xl text-right">
                <SelectValue placeholder="انتخاب شهر" />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-[11px] opacity-60">
              در صورت مجاز بودنِ موقعیت دستگاه، قبله با دقتِ مختصاتِ خودتون محاسبه می‌شود.
            </p>
          </div>

          {/* روش محاسبه نماز */}
          <div className={cn(
            'rounded-xl border p-4',
            isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
          )}>
            <label className="mb-2 block text-sm font-medium">🕌 روش محاسبه نماز (اهل سنت / شیعه)</label>
            <Select
              value={settings.method}
              onValueChange={(val) => updateSettings({ method: val as keyof typeof PRAYER_METHODS })}
            >
              <SelectTrigger className="rounded-xl text-right">
                <SelectValue placeholder="انتخاب روش" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRAYER_METHODS).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>
                    {cfg.label}{cfg.school ? ` — ${cfg.school}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-[11px] opacity-60">
              برای منطقه لاشار و روستای ورکات، روش «کراچی (حنفی)» یا «ام‌القری مکه» توصیه می‌شود.
            </p>
          </div>

          {/* زبان (آماده‌سازی) */}
          <div className={cn(
            'rounded-xl border p-4',
            isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'
          )}>
            <label className="mb-2 block text-sm font-medium">🌐 زبان رابط</label>
            <Select
              value={settings.lang}
              onValueChange={(val) => updateSettings({ lang: val as 'fa' | 'bal' })}
            >
              <SelectTrigger className="rounded-xl text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fa">فارسی</SelectItem>
                <SelectItem value="bal">بلوچی (بزودی)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full rounded-xl py-3 text-white font-bold shadow-md"
            style={{ background: themeGradient }}
          >
            بستن
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

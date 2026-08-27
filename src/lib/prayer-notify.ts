'use client';

import { LocalNotifications } from '@capacitor/local-notifications';
import { calculatePrayerTimes, type PrayerMethodKey } from './prayer-times';
import { toPersianDigits } from './calendar-utils';

const NOTIF_IDS: Record<string, number> = {
  fajr: 101,
  sunrise: 102,
  dhuhr: 103,
  asr: 104,
  maghrib: 105,
  isha: 106,
};

const PRAYER_TITLES: Record<string, string> = {
  fajr: 'اذان صبح',
  sunrise: 'طلوع آفتاب',
  dhuhr: 'ظهر',
  asr: 'عصر',
  maghrib: 'مغرب',
  isha: 'عشاء',
};

function parseHM(t: string): { h: number; m: number } {
  const cleaned = t.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).trim();
  const parts = cleaned.split(':');
  return { h: parseInt(parts[0], 10), m: parseInt(parts[1], 10) };
}

/** زمان‌بندی نوتیفیکیشن‌های روزانه اذان (بومی، حتی وقتی اپ بسته است) */
export async function schedulePrayerNotifications(
  lat: number,
  lng: number,
  method: PrayerMethodKey
): Promise<boolean> {
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return false;

    const pt = calculatePrayerTimes(new Date(), lat, lng, 3.5, method);

    const notifs = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((key) => {
      const { h, m } = parseHM(pt[key]);
      return {
        id: NOTIF_IDS[key],
        title: 'بلوچستان نما — اذان',
        body: `وقت ${PRAYER_TITLES[key]} (${toPersianDigits(pt[key])})`,
        schedule: { on: { hour: h, minute: m }, repeats: true },
        sound: 'default',
      };
    });

    await LocalNotifications.cancel({
      notifications: Object.values(NOTIF_IDS).map((id) => ({ id })),
    });
    await LocalNotifications.schedule({ notifications: notifs });
    return true;
  } catch {
    return false;
  }
}

export async function cancelPrayerNotifications(): Promise<void> {
  try {
    await LocalNotifications.cancel({
      notifications: Object.values(NOTIF_IDS).map((id) => ({ id })),
    });
  } catch {}
}

export async function checkNotificationPermission(): Promise<boolean> {
  try {
    const perm = await LocalNotifications.checkPermissions();
    return perm.display === 'granted';
  } catch {
    return false;
  }
}

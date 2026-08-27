'use client';

import {
  getCurrentTripleDate,
  toPersianDigits,
  getShamsiMonthName,
} from './calendar-utils';
import { getMonthTheme, getSeasonName, getSeasonIcon } from './themes';

// ساخت تصویر کارت تاریخ سه‌گانه (شمسی/میلادی/قمری) با رنگ فصل
export async function buildDateCardBlob(locationName: string): Promise<Blob> {
  // اطمینان از بارگذاری فونت فارسی
  try {
    await (document as any).fonts?.ready;
  } catch {}

  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas not supported');

  const triple = getCurrentTripleDate();
  const month = triple.shamsi.month;
  const theme = getMonthTheme(month, false);
  const season = getSeasonName(month);
  const seasonIcon = getSeasonIcon(month);

  // پس‌زمینه گرادیان
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, theme.primary);
  grad.addColorStop(1, theme.secondary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // لایه نیمه‌شفاف برای خوانایی
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';

  // عنوان
  ctx.font = "bold 54px Vazirmatn, Tahoma, sans-serif";
  ctx.fillText('بلوچستان نما', W / 2, 130);

  // فصل
  ctx.font = "40px Vazirmatn, Tahoma, sans-serif";
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(`${seasonIcon} ${season}`, W / 2, 200);

  // تاریخ شمسی بزرگ
  ctx.font = "bold 200px Vazirmatn, Tahoma, sans-serif";
  ctx.fillStyle = '#ffffff';
  ctx.fillText(toPersianDigits(triple.shamsi.day), W / 2, 560);

  ctx.font = "bold 70px Vazirmatn, Tahoma, sans-serif";
  ctx.fillText(
    `${getShamsiMonthName(month)} ${toPersianDigits(triple.shamsi.year)}`,
    W / 2,
    660
  );

  // خط جداکننده
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(300, 740);
  ctx.lineTo(780, 740);
  ctx.stroke();

  // تاریخ میلادی
  ctx.font = "44px Vazirmatn, Tahoma, sans-serif";
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(
    `${toPersianDigits(triple.miladi.day)} ${monthNameGreg(triple.miladi.month)} ${toPersianDigits(triple.miladi.year)}`,
    W / 2,
    830
  );

  // تاریخ قمری
  ctx.fillText(
    `${toPersianDigits(triple.qamari.day)} ${qamariMonthName(triple.qamari.month)} ${toPersianDigits(triple.qamari.year)} قمری`,
    W / 2,
    910
  );

  // موقعیت
  ctx.font = "38px Vazirmatn, Tahoma, sans-serif";
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(`📍 ${locationName}، سیستان و بلوچستان`, W / 2, 1010);

  // پایین
  ctx.font = "32px Vazirmatn, Tahoma, sans-serif";
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  const now = new Date();
  ctx.fillText(
    `امروز ${toPersianDigits(now.toLocaleDateString('fa-IR').slice(0, 10))}`,
    W / 2,
    1140
  );

  return await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), 'image/png')
  );
}

function monthNameGreg(m: number): string {
  const names = [
    'ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن',
    'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر',
  ];
  return names[(m - 1) % 12];
}

function qamariMonthName(m: number): string {
  const names = [
    'محرم', 'صفر', 'ربیع‌الاول', 'ربیع‌الثانی', 'جمادی‌الاول', 'جمادی‌الثانی',
    'رجب', 'شعبان', 'رمضان', 'شوال', 'ذیقعده', 'ذیحجه',
  ];
  return names[(m - 1) % 12];
}

// اشتراک‌گذاری یا دانلود کارت
export async function shareDateCard(locationName: string): Promise<void> {
  const blob = await buildDateCardBlob(locationName);
  const file = new File([blob], 'balochistan-nama.png', { type: 'image/png' });

  const shareData: any = {
    title: 'بلوچستان نما',
    text: 'تاریخ امروز به روایت بلوچستان نما',
    files: [file],
  };

  if (typeof navigator !== 'undefined' && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
    await (navigator as any).share(shareData);
  } else if (typeof navigator !== 'undefined' && (navigator as any).share) {
    await (navigator as any).share({ title: shareData.title, text: shareData.text });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'balochistan-nama.png';
    a.click();
    URL.revokeObjectURL(url);
  }
}

// محاسبه زاویه قبله (از شمال، صفر درجه = شمال، به سمت عقربه‌های ساعت)
// بر اساس فرمول great-circle bearing به سمت کعبه

const KAABA_LAT = 21.4225; // عرض جغرافیایی کعبه
const KAABA_LON = 39.8262; // طول جغرافیایی کعبه

/**
 * محاسبه زاویه قبله از شمال برای یک نقطه جغرافیایی
 * @param lat عرض جغرافیایی (درجه)
 * @param lon طول جغرافیایی (درجه)
 * @returns زاویه از شمال به درجه (۰-۳۶۰)
 */
export function calcQibla(lat: number, lon: number): number {
  if (isNaN(lat) || isNaN(lon)) return 253; // مقدار پیش‌فرض ایمن
  const phi = (lat * Math.PI) / 180;
  const phiK = (KAABA_LAT * Math.PI) / 180;
  const dLambda = ((KAABA_LON - lon) * Math.PI) / 180;
  const y = Math.sin(dLambda);
  const x =
    Math.cos(phi) * Math.sin(phiK) -
    Math.sin(phi) * Math.cos(phiK) * Math.cos(dLambda);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return ((bearing + 360) % 360);
}

/** مختصات پیش‌فرض برنامه (ورکات، لاشار) */
export const DEFAULT_LOCATION = { lat: 26.2, lon: 61.8 };

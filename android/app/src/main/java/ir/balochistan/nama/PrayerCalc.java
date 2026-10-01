package ir.balochistan.nama;

import android.content.Context;
import android.location.Location;
import android.location.LocationManager;
import android.util.Log;
import org.json.JSONObject;
import java.util.Calendar;
import java.util.TimeZone;
import java.text.SimpleDateFormat;
import java.util.Locale;

/**
 * PrayerCalc — محاسبهٔ اوقات شرعی در Native (Java)
 * استفاده می‌شود برای به‌روز نگه‌داشتن widget_data.json بدون باز کردن اپ.
 *
 * الگوریتم: همان JS prayer.js (مرجعی) — با همان تنظیمات:
 * - fajr/maghrib/sunrise/... از ایزوتروپیک و ارتفاع خورشید
 * - ارتفاع و عرض/طول از settings (یا آخرین location)
 *
 * خروجی: JSONObject با keys:
 *   fajr/dhuhr/asr/maghrib/isha  → epoch ms
 *   fajrLabel/...                 → "HH:MM"
 */
public class PrayerCalc {

    private static final String TAG = "PrayerCalc";

    /**
     * محاسبهٔ اوقات شرعی برای یک تاریخ و مختصات.
     * @param lat  عرض جغرافیایی
     * @param lng  طول جغرافیایی
     * @param tzOff offset timezone بر حسب ساعت (مثلاً ایران = 3.5)
     * @param cal  Calendar تاریخ
     * @return JSONObject با کلیدهای fajr/dhuhr/asr/maghrib/isha + labelها
     */
    public static JSONObject calc(double lat, double lng, double tzOff, Calendar cal) {
        JSONObject out = new JSONObject();
        try {
            double jd = toJulianDay(cal);
            double dayNum = jd - 2451545.0 + 0.5;

            // equation of time (دقیقه)
            double T = dayNum / 36525.0;
            double L = (280.46646 + T * (36000.76983 + T * 0.000303)) % 360;
            if (L < 0) L += 360;
            double g = Math.toRadians((357.52911 + T * (35999.05029 - 0.0001537 * T)) % 360);
            double eqT = (22.820 * Math.sin(g) + 9.870 * Math.sin(2 * L + 2 * Math.PI * g) * 1e-4);
            eqT = eqT; // simplify

            double decl = Math.toRadians(-23.439 * Math.sin(Math.toRadians(L))); // simplified declination

            // Dhuhr: وسط خورشید
            double dhuhrHour = 12.0 - eqT / 60.0;
            // تبدیل به local solar → tz
            double lngHour = lng / 15.0;
            double dhuhrLocal = (dhuhrHour + lngHour - tzOff + 24) % 24;

            // Asr: وقتی سایه = ۱× ارتفاع + وسط
            double asrAlt = Math.atan(1.0 / (1.0 + Math.tan(Math.abs(Math.toRadians(lat)))));
            double asrHour = Math.acos(Math.cos(Math.toRadians(Math.abs(lat - decl))) * Math.cos(asrAlt)
                    / (Math.cos(Math.toRadians(lat)) * Math.sin(asrAlt))
                    - Math.tan(Math.toRadians(lat)) * Math.tan(asrAlt)) / (2 * Math.PI) * 24;
            double asrLocal = dhuhrLocal + asrHour;

            // Maghrib: غروب (خورشید = افق)
            double setHour = Math.acos(-Math.tan(Math.toRadians(lat)) * Math.tan(decl)) / (2 * Math.PI) * 24;
            double maghribLocal = dhuhrLocal + setHour;

            // Isha: ۱۸ درجه بعد غروب
            double ishaOffset = (18.0 * Math.PI / 180.0);
            double ishaLocal = maghribLocal + ishaOffset * 12.0 / Math.PI;

            // Fajr: ۱۸ درجه قبل طلوع
            double sunriseHour = Math.acos(-Math.tan(Math.toRadians(lat)) * Math.tan(decl)) / (2 * Math.PI) * 24;
            double fajrLocal = dhuhrLocal - sunriseHour;

            // clamp
            fajrLocal = clamp01(fajrLocal, 0.25, 5.0);
            maghribLocal = clamp01(maghribLocal, 17.0, 21.0);

            JSONObject times = new JSONObject();
            JSONObject labels = new JSONObject();
            SimpleDateFormat sdf = new SimpleDateFormat("HH:mm", Locale.US);
            sdf.setTimeZone(TimeZone.getTimeZone("GMT"));

            String[][] pairs = {
                {"fajr", String.valueOf(fajrLocal)},
                {"dhuhr", String.valueOf(dhuhrLocal)},
                {"asr", String.valueOf(asrLocal)},
                {"maghrib", String.valueOf(maghribLocal)},
                {"isha", String.valueOf(ishaLocal)}
            };
            for (String[] p : pairs) {
                String key = p[0];
                double hourVal = Double.parseDouble(p[1]);
                // Convert local hour to epoch ms
                long epochMs = toEpochMs(cal, tzOff, hourVal);
                times.put(key, epochMs);
                labels.put(key, hourToLabel(hourVal));
            }
            out.put("times", times);
            out.put("timeLabels", labels);
            out.put("date", cal.get(Calendar.YEAR) + "-" +
                String.format("%02d", cal.get(Calendar.MONTH) + 1) + "-" +
                String.format("%02d", cal.get(Calendar.DAY_OF_MONTH)));
        } catch (Exception e) {
            Log.w(TAG, "PrayerCalc failed: " + e.getMessage());
        }
        return out;
    }

    private static String hourToLabel(double h) {
        int hh = (int) Math.floor(h);
        int mm = (int) Math.round((h - hh) * 60);
        if (mm == 60) { mm = 0; hh++; }
        return String.format("%02d:%02d", hh % 24, mm);
    }

    private static long toEpochMs(Calendar cal, double tzOff, double hourLocal) {
        // hourLocal is local time (with tzOff applied), convert to epoch ms
        Calendar utc = Calendar.getInstance();
        utc.clear();
        utc.set(cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH),
                (int)(hourLocal % 24), 0, 0);
        // subtract tzOff to get UTC
        utc.set(Calendar.HOUR_OF_DAY, (int)(hourLocal - tzOff) % 24);
        utc.set(Calendar.MINUTE, 0);
        long utcMillis = utc.getTimeInMillis();
        return utcMillis;
    }

    private static double clamp01(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }

    private static double toJulianDay(Calendar cal) {
        int y = cal.get(Calendar.YEAR);
        int m = cal.get(Calendar.MONTH) + 1;
        int d = cal.get(Calendar.DAY_OF_MONTH);
        double jd;
        if (m <= 2) { y -= 1; m += 12; }
        double A = y / 100;
        double B = 2 - A + A / 4;
        jd = Math.floor(365.25 * (y + 4715)) +
             Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
        return jd;
    }

    // ------------------------------------------------------------------
    // Helpers for widget providers (called when widget_data.json is missing/stale)
    // ------------------------------------------------------------------

    /** Loads lat/lng/tzOffset from data.json settings written by JS. */
    public static double[] loadGeo(Context ctx) {
        double[] def = { 26.84, 60.17, 3.5 }; // Werkat default
        try {
            java.io.File f = new java.io.File(ctx.getFilesDir(), "data.json");
            if (f.exists()) {
                byte[] bytes = new byte[(int) f.length()];
                try (java.io.FileInputStream in = new java.io.FileInputStream(f)) { in.read(bytes); }
                JSONObject j = new JSONObject(new String(bytes, "UTF-8"));
                JSONObject s = j.optJSONObject("settings");
                if (s != null) {
                    def[0] = s.optDouble("lat", def[0]);
                    def[1] = s.optDouble("lng", def[1]);
                    def[2] = s.optDouble("tz", def[2]);
                }
            }
        } catch (Exception e) { Log.w(TAG, "loadGeo: " + e.getMessage()); }
        return def;
    }

    /**
     * Writes a fresh widget_data.json (prayer times) using native calc,
     * preserving any existing keys (weather, events, notes, etc.) that JS wrote.
     * Returns true on success.
     */
    public static boolean ensureWidgetData(Context ctx) {
        try {
            double[] geo = loadGeo(ctx);
            Calendar cal = Calendar.getInstance();
            JSONObject prayer = calc(geo[0], geo[1], geo[2], cal);
            String date = cal.get(Calendar.YEAR) + "-" +
                String.format("%02d", cal.get(Calendar.MONTH) + 1) + "-" +
                String.format("%02d", cal.get(Calendar.DAY_OF_MONTH));

            java.io.File f = new java.io.File(ctx.getFilesDir(), "widget_data.json");
            JSONObject merged = new JSONObject();
            if (f.exists()) {
                byte[] bytes = new byte[(int) f.length()];
                try (java.io.FileInputStream in = new java.io.FileInputStream(f)) { in.read(bytes); }
                merged = new JSONObject(new String(bytes, "UTF-8"));
            }
            // Merge prayer-related keys (times / timeLabels), keep rest
            JSONObject out = new JSONObject();
            JSONObject times = prayer.optJSONObject("times");
            JSONObject labels = prayer.optJSONObject("timeLabels");
            if (times != null && times.length() > 0) {
                out.put("times", times);
            }
            if (labels != null && labels.length() > 0) {
                out.put("timeLabels", labels);
            }
            out.put("date", date);
            out.put("updated", System.currentTimeMillis());
            // Preserve non-prayer keys from existing file
            java.util.Iterator<String> keys = merged.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                if (!out.has(k)) out.put(k, merged.get(k));
            }
            try (java.io.FileWriter w = new java.io.FileWriter(f)) {
                w.write(out.toString());
            }
            Log.i(TAG, "widget_data.json refreshed natively");
            return true;
        } catch (Exception e) {
            Log.w(TAG, "ensureWidgetData failed: " + e.getMessage());
            return false;
        }
    }
}

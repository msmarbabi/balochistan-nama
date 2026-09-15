package ir.balochistan.nama;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import org.json.JSONObject;

/** ویجت «وقت بعدی» — بزرگ و خوانا: نام وقت، ساعت، شمارش معکوس، تاریخ */
public class NextPrayerWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateOne(context, mgr, id);
    }

    private static String faDigits(String s) {
        String fa = "۰۱۲۳۴۵۶۷۸۹";
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (c >= '0' && c <= '9') sb.append(fa.charAt(c - '0'));
            else sb.append(c);
        }
        return sb.toString();
    }

    private static void updateOne(Context context, AppWidgetManager mgr, int id) {
        RemoteViews v = new RemoteViews(context.getPackageName(), R.layout.widget_next_layout);
        String name = "--", time = "--:--", remain = "", dateLine = "", city = "";
        try {
            File f = new File(context.getFilesDir(), "widget_data.json");
            if (f.exists()) {
                FileInputStream fis = new FileInputStream(f);
                BufferedReader r = new BufferedReader(new InputStreamReader(fis, "UTF-8"));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
                r.close(); fis.close();
                JSONObject j = new JSONObject(sb.toString());
                name = j.optString("nextLabel", "");
                if (name.isEmpty()) name = j.optString("next", "");
                time = faDigits(j.optString("nextTime", "--:--"));
                // شمارش معکوس از epoch ms وقت بعدی
                JSONObject times = j.optJSONObject("times");
                String nk = j.optString("next", "");
                if (times != null && nk != null && !nk.isEmpty() && times.has(nk) && !times.isNull(nk)) {
                    long target = times.optLong(nk);
                    long diff = target - System.currentTimeMillis();
                    if (diff > 0) {
                        long h = diff / 3600000, m = (diff % 3600000) / 60000;
                        remain = h > 0 ? ("⏳ " + faDigits(h + "س " + m + "د") + " مانده")
                                       : ("⏳ " + faDigits(String.valueOf(m)) + " دقیقه مانده");
                    } else if (diff > -90 * 60000) {
                        remain = "🕌 اکنون";
                    }
                }
                String wd = j.optString("weekday", "");
                String jl = j.optString("jalali", "");
                if (!jl.isEmpty()) dateLine = (wd.isEmpty() ? "" : wd + " • ") + jl;
                city = j.optString("city", "");
            }
        } catch (Exception ignored) { }

        v.setTextViewText(R.id.nwName, name);
        v.setTextViewText(R.id.nwTime, time);
        v.setTextViewText(R.id.nwRemain, remain);
        v.setTextViewText(R.id.nwDate, faDigits(dateLine));
        v.setTextViewText(R.id.nwCity, city);

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            android.app.PendingIntent pi = android.app.PendingIntent.getActivity(context, 0, launch,
                android.os.Build.VERSION.SDK_INT >= 23 ? android.app.PendingIntent.FLAG_IMMUTABLE : 0);
            v.setOnClickPendingIntent(R.id.widget_root, pi);
        }
        mgr.updateAppWidget(id, v);
    }

    public static void pushUpdate(Context context, AppWidgetManager mgr, JSONObject data) {
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, NextPrayerWidgetProvider.class));
        for (int id : ids) updateOne(context, mgr, id);
    }
}

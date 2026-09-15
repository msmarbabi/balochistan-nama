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

public class PrayerWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, PrayerWidgetProvider.class));
        for (int id : ids) updateWidget(context, mgr, id);
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

    private void updateWidget(Context context, AppWidgetManager mgr, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

        String fajr = "--:--", dhuhr = "--:--", asr = "--:--", maghrib = "--:--", isha = "--:--";
        String dateLine = "", hijriLine = "", nextLine = "", city = "";

        try {
            File f = new File(context.getFilesDir(), "widget_data.json");
            if (f.exists()) {
                FileInputStream fis = new FileInputStream(f);
                BufferedReader reader = new BufferedReader(new InputStreamReader(fis, "UTF-8"));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close(); fis.close();
                JSONObject j = new JSONObject(sb.toString());

                // v1.16 رفع باگ: زمان‌ها در timeLabels (رشته) ذخیره می‌شوند، نه ریشه
                JSONObject labels = j.optJSONObject("timeLabels");
                if (labels != null) {
                    fajr = labels.optString("fajr", fajr);
                    dhuhr = labels.optString("dhuhr", dhuhr);
                    asr = labels.optString("asr", asr);
                    maghrib = labels.optString("maghrib", maghrib);
                    isha = labels.optString("isha", isha);
                }
                // تاریخ جلالی/هجری/روز هفته از payload
                String wd = j.optString("weekday", "");
                String jl = j.optString("jalali", "");
                if (!jl.isEmpty()) dateLine = (wd.isEmpty() ? "" : wd + " • ") + jl;
                hijriLine = j.optString("hijri", "");
                city = j.optString("city", "");
                String nl = j.optString("nextLabel", "");
                String nt = j.optString("nextTime", "");
                if (!nl.isEmpty() && !nt.isEmpty()) nextLine = "بعدی: " + nl + " — " + faDigits(nt);
                else if (!nt.isEmpty()) nextLine = "بعدی: " + faDigits(nt);
            }
        } catch (Exception e) { /* keep fallback */ }

        views.setTextViewText(R.id.widget_date, faDigits(dateLine.isEmpty() ? "--" : dateLine));
        views.setTextViewText(R.id.widget_hijri, faDigits(hijriLine));
        views.setTextViewText(R.id.widget_next, faDigits(nextLine));
        views.setTextViewText(R.id.widget_city, city);
        views.setTextViewText(R.id.widget_fajr, "فجر " + faDigits(fajr));
        views.setTextViewText(R.id.widget_dhuhr, "ظهر " + faDigits(dhuhr));
        views.setTextViewText(R.id.widget_asr, "عصر " + faDigits(asr));
        views.setTextViewText(R.id.widget_maghrib, "مغرب " + faDigits(maghrib));
        views.setTextViewText(R.id.widget_isha, "عشا " + faDigits(isha));

        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            android.app.PendingIntent pi = android.app.PendingIntent.getActivity(context, 0, launch,
                android.os.Build.VERSION.SDK_INT >= 23 ? android.app.PendingIntent.FLAG_IMMUTABLE : 0);
            views.setOnClickPendingIntent(R.id.widget_root, pi);
        }

        mgr.updateAppWidget(appWidgetId, views);
    }

    /** آپدیت فوری همه نمونه‌ها (از syncWidgets bridge) */
    public static void pushUpdate(Context context, AppWidgetManager mgr, JSONObject data) {
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, PrayerWidgetProvider.class));
        for (int id : ids) {
            new PrayerWidgetProvider().updateWidget(context, mgr, id);
        }
    }
}

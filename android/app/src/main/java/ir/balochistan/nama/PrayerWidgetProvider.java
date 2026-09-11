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
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
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
        // initial update
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, PrayerWidgetProvider.class));
        for (int id : ids) updateWidget(context, mgr, id);
    }

    private void updateWidget(Context context, AppWidgetManager mgr, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_layout);

        // Default prayer times (fallback if file not present)
        String fajr = "--:--", dhuhr = "--:--", asr = "--:--", maghrib = "--:--", isha = "--:--";

        // Read widget_data.json written by the web app (Files dir)
        try {
            File f = new File(context.getFilesDir(), "widget_data.json");
            if (f.exists()) {
                FileInputStream fis = new FileInputStream(f);
                BufferedReader reader = new BufferedReader(new InputStreamReader(fis));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close(); fis.close();
                JSONObject j = new JSONObject(sb.toString());
                fajr = j.optString("fajr", fajr);
                dhuhr = j.optString("dhuhr", dhuhr);
                asr = j.optString("asr", asr);
                maghrib = j.optString("maghrib", maghrib);
                isha = j.optString("isha", isha);
            }
        } catch (Exception e) { /* keep fallback */ }

        // Date string
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy/MM/dd", new Locale("fa"));
        String dateStr = sdf.format(new Date());

        views.setTextViewText(R.id.widget_date, dateStr);
        views.setTextViewText(R.id.widget_fajr, "فجر " + fajr);
        views.setTextViewText(R.id.widget_dhuhr, "ظهر " + dhuhr);
        views.setTextViewText(R.id.widget_asr, "عصر " + asr);
        views.setTextViewText(R.id.widget_maghrib, "مغرب " + maghrib);
        views.setTextViewText(R.id.widget_isha, "عشا " + isha);

        // Tap to open app
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch != null) {
            android.app.PendingIntent pi = android.app.PendingIntent.getActivity(context, 0, launch,
                android.os.Build.VERSION.SDK_INT >= 23 ? android.app.PendingIntent.FLAG_IMMUTABLE : 0);
            views.setOnClickPendingIntent(R.id.widget_root, pi);
        }

        mgr.updateAppWidget(appWidgetId, views);
    }

    /** آپدیت فوری همه نمونه‌ها (از syncWidgets bridge) — v1.9 */
    public static void pushUpdate(Context context, AppWidgetManager mgr, JSONObject data) {
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, PrayerWidgetProvider.class));
        for (int id : ids) {
            // updateWidget داده را خودش از فایل می‌خواند؛ data فقط برای سازگاری امضاست
            new PrayerWidgetProvider().updateWidget(context, mgr, id);
        }
    }
}

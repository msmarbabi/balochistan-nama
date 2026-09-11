package ir.balochistan.nama;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class WeatherWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateOne(context, mgr, id);
    }

    static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, WeatherWidgetProvider.class));
        for (int id : ids) updateOne(ctx, mgr, id);
    }

    /** آپدیت فوری (از syncWidgets bridge) — v1.9 */
    public static void pushUpdate(Context context, AppWidgetManager mgr, JSONObject data) {
        int[] ids = mgr.getAppWidgetIds(new ComponentName(context, WeatherWidgetProvider.class));
        for (int id : ids) updateOne(context, mgr, id);
    }

    private static void updateOne(Context ctx, AppWidgetManager mgr, int id) {
        RemoteViews rv = new RemoteViews(ctx.getPackageName(), R.layout.widget_weather_layout);
        String temp = "--°";
        String desc = "آب‌وهوا";
        String wind = "";
        String dateLine = "";
        String evLine = "";
        try {
            File f = new File(ctx.getFilesDir(), "widget_data.json");
            if (f.exists()) {
                JSONObject o = new JSONObject(readAll(f));
                JSONObject w = o.optJSONObject("weather");
                if (w != null) {
                    if (w.has("temp") && !w.isNull("temp")) temp = w.optInt("temp") + "°";
                    if (w.has("code") && !w.isNull("code")) desc = WeatherCodes.fa(w.optInt("code"));
                    if (w.has("wind") && !w.isNull("wind")) wind = "💨 " + w.optInt("wind") + "km/h";
                }
                String wd = o.optString("weekday", "");
                String jl = o.optString("jalali", "");
                if (!jl.isEmpty()) dateLine = (wd.isEmpty() ? "" : wd + " • ") + jl;
                evLine = o.optString("hijri", "");
            }
        } catch (Exception ignored) { }
        rv.setTextViewText(R.id.wwTemp, temp);
        rv.setTextViewText(R.id.wwDesc, desc);
        rv.setTextViewText(R.id.wwWind, wind);
        rv.setTextViewText(R.id.wwDate, dateLine);
        rv.setTextViewText(R.id.wwHijri, evLine);
        mgr.updateAppWidget(id, rv);
    }

    private static String readAll(File f) throws Exception {
        FileInputStream in = new FileInputStream(f);
        byte[] buf = new byte[(int) f.length()];
        int read = in.read(buf);
        in.close();
        return new String(buf, 0, read, StandardCharsets.UTF_8);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent.getAction();
        if ("ir.balochistan.nama.WEATHER_UPDATE".equals(a)) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, WeatherWidgetProvider.class));
            for (int id : ids) updateOne(ctx, mgr, id);
        }
    }
}

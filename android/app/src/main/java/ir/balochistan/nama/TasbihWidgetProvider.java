package ir.balochistan.nama;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;

/** ویجت تسبیح — شمارنده لمسی روی صفحه اصلی (مرحله ۵ v1.16) */
public class TasbihWidgetProvider extends AppWidgetProvider {
    public static final String ACTION_COUNT = "ir.balochistan.nama.TASBIH_COUNT";
    public static final String ACTION_RESET = "ir.balochistan.nama.TASBIH_RESET";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String a = intent.getAction();
        if (ACTION_COUNT.equals(a) || ACTION_RESET.equals(a)) {
            SharedPreferences p = ctx.getSharedPreferences("tasbih_widget", Context.MODE_PRIVATE);
            if (ACTION_RESET.equals(a)) p.edit().putInt("count", 0).apply();
            else p.edit().putInt("count", p.getInt("count", 0) + 1).apply();
            if (ACTION_COUNT.equals(a)) {
                try {
                    android.os.Vibrator vb = (android.os.Vibrator) ctx.getSystemService(Context.VIBRATOR_SERVICE);
                    if (vb != null) vb.vibrate(25);
                } catch (Exception ignored) { }
            }
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(ctx, TasbihWidgetProvider.class));
            for (int id : ids) updateOne(ctx, mgr, id);
        }
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateOne(ctx, mgr, id);
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

    private static void updateOne(Context ctx, AppWidgetManager mgr, int id) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_tasbih_layout);
        SharedPreferences p = ctx.getSharedPreferences("tasbih_widget", Context.MODE_PRIVATE);
        int count = p.getInt("count", 0);

        String name = "تسبیح", target = "";
        try {
            File f = new File(ctx.getFilesDir(), "widget_data.json");
            if (f.exists()) {
                FileInputStream fis = new FileInputStream(f);
                BufferedReader r = new BufferedReader(new InputStreamReader(fis, "UTF-8"));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = r.readLine()) != null) sb.append(line);
                r.close(); fis.close();
                JSONObject o = new JSONObject(sb.toString());
                JSONObject t = o.optJSONObject("tasbih");
                if (t != null) {
                    name = t.optString("name", name);
                    int tg = t.optInt("target", 0);
                    if (tg > 0) target = " / " + faDigits(String.valueOf(tg));
                }
            }
        } catch (Exception ignored) { }

        v.setTextViewText(R.id.twName, name);
        v.setTextViewText(R.id.twCount, faDigits(String.valueOf(count)) + (target.isEmpty() ? "" : target));

        Intent ci = new Intent(ctx, TasbihWidgetProvider.class).setAction(ACTION_COUNT);
        PendingIntent cpi = PendingIntent.getBroadcast(ctx, 1, ci,
            PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        v.setOnClickPendingIntent(R.id.twPlus, cpi);

        Intent ri = new Intent(ctx, TasbihWidgetProvider.class).setAction(ACTION_RESET);
        PendingIntent rpi = PendingIntent.getBroadcast(ctx, 2, ri,
            PendingIntent.FLAG_UPDATE_CURRENT | (android.os.Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        v.setOnClickPendingIntent(R.id.twReset, rpi);

        mgr.updateAppWidget(id, v);
    }

    public static void pushUpdate(Context context, AppWidgetManager mgr, JSONObject data) {
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, TasbihWidgetProvider.class));
        for (int id : ids) updateOne(context, mgr, id);
    }
}

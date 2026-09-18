package ir.balochistan.nama;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.app.PendingIntent;

public class DhikrWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        updateWidget(context, mgr);
    }
    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (intent == null) return;
        String action = intent.getAction();
        if ("com.balochistan.DHIKR_PLUS".equals(action) || "com.balochistan.DHIKR_RESET".equals(action)) {
            SharedPreferences sp = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE);
            int count = sp.getInt("widget_dhikr_count", 0);
            int target = sp.getInt("widget_dhikr_target", 100);
            if ("com.balochistan.DHIKR_PLUS".equals(action)) {
                count++;
                if (count >= target) count = 0;
            } else {
                count = 0;
            }
            SharedPreferences.Editor ed = sp.edit();
            ed.putInt("widget_dhikr_count", count);
            ed.apply();
        }
        updateWidget(context, AppWidgetManager.getInstance(context));
    }
    private void updateWidget(Context context, AppWidgetManager mgr) {
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, DhikrWidgetProvider.class));
        SharedPreferences sp = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE);
        String text = sp.getString("widget_dhikr_text", "ذکر دلخواه");
        int count = sp.getInt("widget_dhikr_count", 0);
        int target = sp.getInt("widget_dhikr_target", 100);
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_dhikr_layout);
            views.setTextViewText(R.id.dkText, text);
            views.setTextViewText(R.id.dkCount, toFa(count) + " / " + toFa(target));
            int progress = target > 0 ? (int)(100 * count / target) : 0;
            // progress bar via setProgress
            views.setInt(R.id.dkProgress, "setProgress", progress);
            // intent for buttons
            Intent plus = new Intent(context, DhikrWidgetProvider.class);
            plus.setAction("com.balochistan.DHIKR_PLUS");
            views.setOnClickPendingIntent(R.id.dkCount, PendingIntent.getBroadcast(context, 0, plus, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            mgr.updateAppWidget(id, views);
        }
    }
    private static String toFa(int n) {
        String s = String.valueOf(n);
        char[] fa = {'۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'};
        char[] ascii = {'0','1','2','3','4','5','6','7','8','9'};
        for (int i = 0; i < ascii.length; i++) s = s.replace(ascii[i], fa[i]);
        return s;
    }
    public static void pushUpdate(android.content.Context context, android.appwidget.AppWidgetManager mgr) {
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, DhikrWidgetProvider.class));
        for (int id : ids) {
            android.content.SharedPreferences sp = context.getSharedPreferences("WidgetPrefs", android.content.Context.MODE_PRIVATE);
            android.widget.RemoteViews views = new android.widget.RemoteViews(context.getPackageName(), R.layout.widget_dhikr_layout);
            views.setTextViewText(R.id.dkText, sp.getString("widget_dhikr_text","ذکر دلخواه"));
            int count = sp.getInt("widget_dhikr_count",0);
            int target = sp.getInt("widget_dhikr_target",100);
            views.setTextViewText(R.id.dkCount, toFa(count) + " / " + toFa(target));
            views.setInt(R.id.dkProgress, "setProgress", target>0 ? (int)(100*count/target) : 0);
            mgr.updateAppWidget(id, views);
        }
    }

}

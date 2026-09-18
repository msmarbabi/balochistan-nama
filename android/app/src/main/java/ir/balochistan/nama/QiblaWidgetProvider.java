package ir.balochistan.nama;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class QiblaWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        updateWidget(context, mgr);
    }
    private void updateWidget(Context context, AppWidgetManager mgr) {
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, QiblaWidgetProvider.class));
        SharedPreferences sp = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE);
        String degree = sp.getString("widget_qibla_degree", "—");
        String desc = sp.getString("widget_qibla_desc", "");
        for (int id : ids) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_qibla_layout);
            views.setTextViewText(R.id.qlDegree, degree);
            views.setTextViewText(R.id.qlDesc, desc);
            mgr.updateAppWidget(id, views);
        }
    }
    public static void pushUpdate(android.content.Context context, android.appwidget.AppWidgetManager mgr) {
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, QiblaWidgetProvider.class));
        for (int id : ids) {
            android.content.SharedPreferences sp = context.getSharedPreferences("WidgetPrefs", android.content.Context.MODE_PRIVATE);
            android.widget.RemoteViews views = new android.widget.RemoteViews(context.getPackageName(), R.layout.widget_qibla_layout);
            views.setTextViewText(R.id.qlDegree, sp.getString("widget_qibla_degree","—"));
            views.setTextViewText(R.id.qlDesc, sp.getString("widget_qibla_desc",""));
            mgr.updateAppWidget(id, views);
        }
    }

}

package ir.balochistan.nama;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class EventWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        updateWidget(context, mgr);
    }
    private void updateWidget(Context context, AppWidgetManager mgr) {
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, EventWidgetProvider.class));
        for (int id : ids) {
            SharedPreferences sp = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_event_layout);
            views.setTextViewText(R.id.evTitle, sp.getString("widget_event_title", "مناسبت امروز"));
            views.setTextViewText(R.id.evIcon, sp.getString("widget_event_icon", "🎉"));
            views.setTextViewText(R.id.evName, sp.getString("widget_event_name", "—"));
            views.setTextViewText(R.id.evDetail, sp.getString("widget_event_detail", ""));
            mgr.updateAppWidget(id, views);
        }
    }
    public static void pushUpdate(Context context, AppWidgetManager mgr) {
        int[] ids = mgr.getAppWidgetIds(new android.content.ComponentName(context, EventWidgetProvider.class));
        for (int id : ids) {
            SharedPreferences sp = context.getSharedPreferences("WidgetPrefs", Context.MODE_PRIVATE);
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_event_layout);
            views.setTextViewText(R.id.evTitle, sp.getString("widget_event_title", "مناسبت امروز"));
            views.setTextViewText(R.id.evIcon, sp.getString("widget_event_icon", "🎉"));
            views.setTextViewText(R.id.evName, sp.getString("widget_event_name", "—"));
            views.setTextViewText(R.id.evDetail, sp.getString("widget_event_detail", ""));
            mgr.updateAppWidget(id, views);
        }
    }
}

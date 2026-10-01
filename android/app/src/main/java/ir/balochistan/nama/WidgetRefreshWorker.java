package ir.balochistan.nama;

import android.content.Context;
import android.util.Log;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class WidgetRefreshWorker extends Worker {
  public WidgetRefreshWorker(Context appCtx, WorkerParameters params) {
    super(appCtx, params);
  }

  @Override
  public Result doWork() {
    Context app = getApplicationContext();
    try {
      // Native compute + write widget_data.json (merging existing keys)
      boolean ok = PrayerCalc.ensureWidgetData(app);
      Log.i("WidgetRefresh", "ensureWidgetData -> " + ok);
    } catch (Exception e) {
      Log.w("WidgetRefresh", "refresh failed: " + e.getMessage());
    }
    // Push updates to all widget instances
    PrayerWidgetProvider.pushAllUpdates(app);
    return Result.success();
  }
}

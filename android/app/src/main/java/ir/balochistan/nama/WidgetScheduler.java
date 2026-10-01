package ir.balochistan.nama;

import android.content.Context;
import androidx.work.*;
import java.util.concurrent.TimeUnit;

/**
 * WidgetScheduler — v2 M6
 * به‌روزرسانی خودکار widget_data.json هر ۳۰ دقیقه (WorkManager، بدون شبکه)
 */
public class WidgetScheduler {
  public static void schedule(Context ctx) {
    Context app = ctx.getApplicationContext();
    WorkManager wm = WorkManager.getInstance(app);

    // 1) اجرای فوری (هنگام اولین اجرای اپ)
    OneTimeWorkRequest oneTime =
        new OneTimeWorkRequest.Builder(WidgetRefreshWorker.class).build();
    wm.enqueueUniqueWork("widget_refresh_now", ExistingWorkPolicy.REPLACE, oneTime);

    // 2) تکراری هر ۳۰ دقیقه
    PeriodicWorkRequest periodic =
        new PeriodicWorkRequest.Builder(WidgetRefreshWorker.class, 30, TimeUnit.MINUTES)
            .build();
    wm.enqueueUniquePeriodicWork("widget_refresh_30min", ExistingPeriodicWorkPolicy.UPDATE, periodic);
  }
}

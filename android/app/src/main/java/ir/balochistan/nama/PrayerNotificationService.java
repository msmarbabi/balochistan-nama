package ir.balochistan.nama;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import org.json.JSONObject;

/**
 * PrayerNotificationService — persistent (foreground) notification.
 * Shows next prayer time + date + city on the status bar, updating every minute.
 * Reads widget_data.json written by the web app (via Capacitor Filesystem).
 */
public class PrayerNotificationService extends Service {

    private static final String CHANNEL_ID = "prayer_persistent";
    private static final int NOTIF_ID = 1001;
    private static boolean running = false;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable updater = new Runnable() {
        @Override
        public void run() {
            updateNotification();
            handler.postDelayed(this, 30000); // every 30s
        }
    };

    public static boolean isRunning() { return running; }

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        createChannel();
        startForeground(NOTIF_ID, buildNotification());
        handler.post(updater);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacks(updater);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "اوقات شرعی همیشگی", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("اعلان همیشگی اوقات شرعی و نماز بعدی");
            ch.setShowBadge(false);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private Notification buildNotification() {
        // Read widget_data.json (written by web app)
        String fajr = "--:--", dhuhr = "--:--", asr = "--:--", maghrib = "--:--", isha = "--:--";
        String next = "نماز بعدی", nextTime = "--:--", city = "بلوچستان";
        String eventToday = "", eventTomorrow = "";
        try {
            File f = new File(getFilesDir(), "widget_data.json");
            if (f.exists()) {
                FileInputStream fis = new FileInputStream(f);
                BufferedReader reader = new BufferedReader(new InputStreamReader(fis));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) sb.append(line);
                reader.close(); fis.close();
                JSONObject j = new JSONObject(sb.toString());
                JSONObject times = j.optJSONObject("times");
                if (times != null) {
                    fajr = times.optString("fajr", fajr);
                    dhuhr = times.optString("dhuhr", dhuhr);
                    asr = times.optString("asr", asr);
                    maghrib = times.optString("maghrib", maghrib);
                    isha = times.optString("isha", isha);
                }
                next = j.optString("next", next);
                nextTime = j.optString("nextTime", nextTime);
                city = j.optString("city", city);
                eventToday = j.optString("eventToday", eventToday);
                eventTomorrow = j.optString("eventTomorrow", eventTomorrow);
            }
        } catch (Exception e) { /* fallback */ }

        String timeStr = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date());
        String content = "🕐 " + timeStr + " — نماز بعدی: " + next + " " + nextTime + " • " + city;
        StringBuilder big = new StringBuilder();
        big.append("نماز بعدی: ").append(next).append(" ").append(nextTime).append("\n");
        big.append("فجر ").append(fajr).append(" • ظهر ").append(dhuhr).append(" • عصر ").append(asr).append("\n");
        big.append("مغرب ").append(maghrib).append(" • عشا ").append(isha);
        if (eventToday != null && !eventToday.isEmpty()) {
            big.append("\n\n📅 امروز: ").append(eventToday);
        }
        if (eventTomorrow != null && !eventTomorrow.isEmpty()) {
            big.append("\n📅 فردا: ").append(eventTomorrow);
        }
        big.append("\n📍 ").append(city);
        String bigText = big.toString();

        // Tap opens the app
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(this, 0, launch,
            PendingIntent.FLAG_IMMUTABLE);

        // Build notification (style differs by SDK for BigText)
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        builder.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("🕌 بلوچستان نما — اوقات شرعی")
            .setContentText(content)
            .setStyle(new Notification.BigTextStyle().bigText(bigText))
            .setOngoing(true)                       // persistent, not dismissible
            .setShowWhen(true)
            .setContentIntent(pi)
            .setPriority(Notification.PRIORITY_LOW);

        return builder.build();
    }

    private void updateNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID, buildNotification());
    }
}

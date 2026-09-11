package ir.balochistan.nama;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import org.json.JSONObject;

/**
 * PrayerNotificationService — foreground service.
 * 1) Persistent notification: next prayer + times + city (every 30s)
 * 2) v1.11: Athan playback even when app is closed — MediaPlayer with speaker,
 *    scheduled per prayer time from widget_data.json
 * 3) v1.11: Pre-athan warning (X minutes before, optional vibration)
 */
public class PrayerNotificationService extends Service {

    private static final String CHANNEL_ID = "prayer_persistent";
    private static final String CHANNEL_ATHAN = "athan_playback";
    private static final int NOTIF_ID = 1001;
    private static final int ATHAN_NOTIF_ID = 1002;
    private static final int PRE_ATHAN_NOTIF_ID = 1003;
    private static boolean running = false;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player = null;
    private String playingPrayer = null;

    // ---- data from widget_data.json ----
    private Map<String, Long> prayerMillis = new HashMap<>();   // name -> epoch ms
    private Map<String, String> prayerLabels = new HashMap<>(); // name -> HH:MM
    private boolean athanEnabled = false;
    private boolean preAthanEnabled = false;
    private int preAthanMinutes = 10;
    private boolean athanVibrate = false;
    private String athanFile = null;   // absolute path or asset URL
    private String nextName = "", nextTime = "--:--", city = "بلوچستان";

    private final Runnable updater = new Runnable() {
        @Override
        public void run() {
            try {
                reloadData();
                checkAndPlayAthan();
                checkPreAthanWarning();
                updateNotification();
            } catch (Exception e) { /* keep service alive */ }
            handler.postDelayed(this, 15000); // every 15s
        }
    };

    public static boolean isRunning() { return running; }

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        createChannels();
        startForeground(NOTIF_ID, buildNotification());
        handler.post(updater);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            stopAthan();
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intent != null && "STOP_ATHAN".equals(intent.getAction())) {
            stopAthan();
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        stopAthan();
        handler.removeCallbacks(updater);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    // ================= Channels =================
    private void createChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "اوقات شرعی همیشگی", NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("اعلان همیشگی اوقات شرعی و نماز بعدی");
                ch.setShowBadge(false);
                nm.createNotificationChannel(ch);

                NotificationChannel ath = new NotificationChannel(
                    CHANNEL_ATHAN, "پخش اذان", NotificationManager.IMPORTANCE_HIGH);
                ath.setDescription("پخش اذان در وقت نماز");
                ath.setShowBadge(false);
                nm.createNotificationChannel(ath);
            }
        }
    }

    // ================= Data =================
    private void reloadData() {
        try {
            File f = new File(getFilesDir(), "widget_data.json");
            if (!f.exists()) return;
            FileInputStream fis = new FileInputStream(f);
            BufferedReader reader = new BufferedReader(new InputStreamReader(fis));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
            reader.close(); fis.close();
            JSONObject j = new JSONObject(sb.toString());

            JSONObject times = j.optJSONObject("times");
            JSONObject labels = j.optJSONObject("timeLabels");
            if (times != null) {
                prayerMillis.clear();
                String[] names = {"fajr", "dhuhr", "asr", "maghrib", "isha"};
                for (String n : names) {
                    if (times.has(n) && !times.isNull(n)) {
                        long ms = times.optLong(n, 0);
                        if (ms > 0) {
                            prayerMillis.put(n, ms);
                            String lbl = (labels != null) ? labels.optString(n, "") : "";
                            prayerLabels.put(n, lbl.isEmpty() ? fmtTime(ms) : lbl);
                        }
                    }
                }
            }
            JSONObject athan = j.optJSONObject("athan");
            if (athan != null) {
                athanEnabled = athan.optBoolean("enabled", false);
                preAthanEnabled = athan.optBoolean("preEnabled", false);
                preAthanMinutes = athan.optInt("preMinutes", 10);
                athanVibrate = athan.optBoolean("vibrate", false);
                String file = athan.optString("file", "");
                athanFile = (file != null && !file.isEmpty()) ? file : null;
            }
            nextName = j.optString("next", nextName);
            nextTime = j.optString("nextTime", nextTime);
            city = j.optString("city", city);
        } catch (Exception e) { /* keep defaults */ }
    }

    private String fmtTime(long ms) {
        return new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(ms));
    }

    // ================= Athan playback (app closed OK) =================
    private void checkAndPlayAthan() {
        if (!athanEnabled || athanFile == null) return;
        long now = System.currentTimeMillis();
        for (Map.Entry<String, Long> e : prayerMillis.entrySet()) {
            long t = e.getValue();
            // در بازه [t, t+90s) و پخش نشده برای این نماز
            if (now >= t && now < t + 90000) {
                String key = e.getKey();
                String stamp = key + "_" + new SimpleDateFormat("yyyyMMdd", Locale.US).format(new Date(t));
                String playedStamp = readPlayedStamp();
                if (!stamp.equals(playedStamp)) {
                    playAthan(key, stamp);
                }
            }
        }
    }

    private String stampPrefKey() { return "athan_played_stamp"; }
    private String readPlayedStamp() {
        return getSharedPreferences("athan_prefs", Context.MODE_PRIVATE)
            .getString(stampPrefKey(), "");
    }
    private void writePlayedStamp(String s) {
        getSharedPreferences("athan_prefs", Context.MODE_PRIVATE)
            .edit().putString(stampPrefKey(), s).apply();
    }

    private void playAthan(String prayerKey, String stamp) {
        if (player != null) return; // قبلا در حال پخش
        try {
            writePlayedStamp(stamp);
            showAthanNotification(prayerKey);
            if (athanVibrate) vibratePattern();

            player = new MediaPlayer();
            if (athanFile.startsWith("http")) {
                player.setDataSource(athanFile);
            } else {
                File f = new File(athanFile);
                if (!f.exists()) { player = null; return; }
                FileInputStream fis = new FileInputStream(f);
                player.setDataSource(fis.getFD());
                fis.close();
            }
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());
            player.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                @Override public void onCompletion(MediaPlayer mp) {
                    releasePlayer();
                    cancelAthanNotification();
                }
            });
            player.setOnErrorListener(new MediaPlayer.OnErrorListener() {
                @Override public boolean onError(MediaPlayer mp, int what, int extra) {
                    releasePlayer();
                    cancelAthanNotification();
                    return true;
                }
            });
            player.prepare();
            player.start();
            playingPrayer = prayerKey;
        } catch (Exception ex) {
            releasePlayer();
        }
    }

    private void releasePlayer() {
        if (player != null) {
            try { player.stop(); } catch (Exception ignore) {}
            try { player.release(); } catch (Exception ignore) {}
            player = null;
        }
        playingPrayer = null;
    }

    private void stopAthan() {
        releasePlayer();
        cancelAthanNotification();
    }

    private void vibratePattern() {
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v == null) return;
            long[] pattern = {0, 400, 200, 400};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                v.vibrate(pattern, -1);
            }
        } catch (Exception ignore) {}
    }

    // ================= Pre-athan warning =================
    private void checkPreAthanWarning() {
        if (!preAthanEnabled) return;
        long now = System.currentTimeMillis();
        long lead = preAthanMinutes * 60000L;
        for (Map.Entry<String, Long> e : prayerMillis.entrySet()) {
            long t = e.getValue();
            // در بازه [t-lead, t-lead+90s)
            long warnAt = t - lead;
            if (now >= warnAt && now < warnAt + 90000) {
                String key = e.getKey();
                String stamp = "pre_" + key + "_" + new SimpleDateFormat("yyyyMMdd", Locale.US).format(new Date(t));
                if (!stamp.equals(readPreStamp())) {
                    writePreStamp(stamp);
                    if (athanVibrate) vibratePattern();
                    showPreAthanNotification(key, prayerLabels.get(key));
                }
            }
        }
    }

    private String readPreStamp() {
        return getSharedPreferences("athan_prefs", Context.MODE_PRIVATE).getString("pre_athan_stamp", "");
    }
    private void writePreStamp(String s) {
        getSharedPreferences("athan_prefs", Context.MODE_PRIVATE).edit().putString("pre_athan_stamp", s).apply();
    }

    // ================= Notifications =================
    private void showAthanNotification(String prayerKey) {
        String label = prayerLabels.containsKey(prayerKey) ? prayerLabels.get(prayerKey) : "";
        String title = "🕌 وقت اذان" + (label.isEmpty() ? "" : " — " + label);
        postNotif(ATHAN_NOTIF_ID, title, "اذان پخش می‌شود…", CHANNEL_ATHAN, true);
    }
    private void cancelAthanNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(ATHAN_NOTIF_ID);
    }
    private void showPreAthanNotification(String prayerKey, String timeLabel) {
        String name = faPrayerName(prayerKey);
        postNotif(PRE_ATHAN_NOTIF_ID, "⏳ " + name + " نزدیک است",
            (timeLabel != null ? timeLabel : "") + " — " + preAthanMinutes + " دقیقه دیگر", CHANNEL_ATHAN, false);
    }
    private String faPrayerName(String key) {
        switch (key) {
            case "fajr": return "اذان صبح";
            case "dhuhr": return "اذان ظهر";
            case "asr": return "اذان عصر";
            case "maghrib": return "اذان مغرب";
            case "isha": return "اذان عشا";
        }
        return "اذان";
    }

    private void postNotif(int id, String title, String text, String channel, boolean ongoing) {
        try {
            Notification.Builder b = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                ? new Notification.Builder(this, channel)
                : new Notification.Builder(this);
            Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
            PendingIntent pi = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE);
            b.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(pi)
                .setOngoing(ongoing)
                .setAutoCancel(!ongoing)
                .setPriority(Notification.PRIORITY_HIGH);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.notify(id, b.build());
        } catch (Exception ignore) {}
    }

    // ================= Persistent notification =================
    private Notification buildNotification() {
        String fajr = "--:--", dhuhr = "--:--", asr = "--:--", maghrib = "--:--", isha = "--:--";
        String next = nextName.isEmpty() ? "نماز بعدی" : nextName;
        String nextT = nextTime;
        String eventToday = "", eventTomorrow = "";
        if (prayerLabels.containsKey("fajr")) fajr = prayerLabels.get("fajr");
        if (prayerLabels.containsKey("dhuhr")) dhuhr = prayerLabels.get("dhuhr");
        if (prayerLabels.containsKey("asr")) asr = prayerLabels.get("asr");
        if (prayerLabels.containsKey("maghrib")) maghrib = prayerLabels.get("maghrib");
        if (prayerLabels.containsKey("isha")) isha = prayerLabels.get("isha");

        String timeStr = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date());
        String content = "🕐 " + timeStr + " — نماز بعدی: " + next + " " + nextT + " • " + city;
        StringBuilder big = new StringBuilder();
        big.append("نماز بعدی: ").append(next).append(" ").append(nextT).append("\n");
        big.append("فجر ").append(fajr).append(" • ظهر ").append(dhuhr).append(" • عصر ").append(asr).append("\n");
        big.append("مغرب ").append(maghrib).append(" • عشا ").append(isha);
        if (eventToday != null && !eventToday.isEmpty()) big.append("\n\n📅 امروز: ").append(eventToday);
        if (eventTomorrow != null && !eventTomorrow.isEmpty()) big.append("\n📅 فردا: ").append(eventTomorrow);
        big.append("\n📍 ").append(city);

        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(this, 0, launch, PendingIntent.FLAG_IMMUTABLE);

        Notification.Builder builder = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            ? new Notification.Builder(this, CHANNEL_ID)
            : new Notification.Builder(this);
        builder.setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("🕌 بلوچستان نما — اوقات شرعی")
            .setContentText(content)
            .setStyle(new Notification.BigTextStyle().bigText(big.toString()))
            .setOngoing(true)
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

package ir.balochistan.nama;

import android.os.Bundle;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.net.Uri;
import android.provider.CalendarContract;
import java.util.TimeZone;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int REQ_NOTIFICATION = 2001;

    private void requestNotificationPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{ Manifest.permission.POST_NOTIFICATIONS }, REQ_NOTIFICATION);
                }
            }
        } catch (Exception e) { /* ignore */ }
    }
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // NotesBridge: ارسال یادداشت به برنامه یادداشت رسمی اندروید
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void createNote(String title, String body) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_CREATE_NOTE);
                        intent.putExtra(Intent.EXTRA_TITLE, title != null ? title : "");
                        intent.putExtra(Intent.EXTRA_TEXT, body != null ? body : "");
                        startActivity(intent);
                    } catch (Exception e) {
                        // برنامه یادداشت پشتیبانی نمی‌کند - نادیده گرفته می‌شود
                    }
                }

                @JavascriptInterface
                public void shareText(String text, String subject) {
                    try {
                        Intent send = new Intent(Intent.ACTION_SEND);
                        send.setType("text/plain");
                        send.putExtra(Intent.EXTRA_TEXT, text != null ? text : "");
                        if (subject != null && !subject.isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, subject);
                        send = Intent.createChooser(send, "اشتراک‌گذاری");
                        send.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(send);
                    } catch (Exception e) { }
                }

                @JavascriptInterface
                public void vibrate(long ms) {
                    try {
                        android.os.Vibrator v = (android.os.Vibrator) getSystemService(VIBRATOR_SERVICE);
                        if (v == null) return;
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            v.vibrate(android.os.VibrationEffect.createOneShot(ms > 0 ? ms : 600,
                                android.os.VibrationEffect.DEFAULT_AMPLITUDE));
                        } else {
                            v.vibrate(ms > 0 ? ms : 600);
                        }
                    } catch (Exception e) { }
                }

                @JavascriptInterface
                public void syncWidgets() {
                    try {
                        android.appwidget.AppWidgetManager mgr = android.appwidget.AppWidgetManager.getInstance(MainActivity.this);
                        java.io.File f = new java.io.File(MainActivity.this.getFilesDir(), "widget_data.json");
                        org.json.JSONObject data = new org.json.JSONObject();
                        try {
                            data = new org.json.JSONObject(
                                new String(java.nio.file.Files.readAllBytes(f.toPath()), "UTF-8"));
                        } catch (Exception e) { }
                        PrayerWidgetProvider.pushUpdate(MainActivity.this, mgr, data);
                        WeatherWidgetProvider.pushUpdate(MainActivity.this, mgr, data);
                    } catch (Exception e) { }
                }

                @JavascriptInterface
                public void openUrl(String url) {
                    try {
                        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(i);
                    } catch (Exception e) { /* ignore */ }
                }

                @JavascriptInterface
                public void addCalendarEvent(String title, String description, long startMillis, long endMillis) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_INSERT)
                                .setData(CalendarContract.Events.CONTENT_URI)
                                .putExtra(CalendarContract.Events.TITLE, title != null ? title : "")
                                .putExtra(CalendarContract.Events.DESCRIPTION, description != null ? description : "")
                                .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, startMillis)
                                .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, endMillis);
                        startActivity(intent);
                    } catch (Exception e) {
                        // تقویم پشتیبانی نمی‌کند - نادیده گرفته می‌شود
                    }
                }

                @JavascriptInterface
                public void startPersistentNotification() {
                    try {
                        requestNotificationPermission();
                        Intent svc = new Intent(MainActivity.this, PrayerNotificationService.class);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            startForegroundService(svc);
                        } else {
                            startService(svc);
                        }
                    } catch (Exception e) { /* ignore */ }
                }

                @JavascriptInterface
                public void stopPersistentNotification() {
                    try {
                        Intent svc = new Intent(MainActivity.this, PrayerNotificationService.class);
                        svc.setAction("STOP");
                        startService(svc);
                        stopService(svc);
                    } catch (Exception e) { /* ignore */ }
                }

                @JavascriptInterface
                public boolean isPersistentNotificationRunning() {
                    return PrayerNotificationService.isRunning();
                }
            }, "NotesBridge");
            // Also expose as 'NativeApp' (the name used by the JS code)
            if (getBridge().getWebView() != null) {
                getBridge().getWebView().addJavascriptInterface(new Object() {
                    @JavascriptInterface
                    public void setStatusBar(String color) {}
                    @JavascriptInterface
                    public void httpGet(String url, String reqId) {
                        // Weather fetch uses NativeApp.httpGet — fallback via fetch() works
                    }
                    @JavascriptInterface
                    public void createNote(String title, String body) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_CREATE_NOTE);
                            intent.putExtra(Intent.EXTRA_TITLE, title != null ? title : "");
                            intent.putExtra(Intent.EXTRA_TEXT, body != null ? body : "");
                            startActivity(intent);
                        } catch (Exception e) {}
                    }
                    @JavascriptInterface
                    public void addCalendarEvent(String title, String description, long startMillis, long endMillis) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_INSERT)
                                    .setData(CalendarContract.Events.CONTENT_URI)
                                    .putExtra(CalendarContract.Events.TITLE, title != null ? title : "")
                                    .putExtra(CalendarContract.Events.DESCRIPTION, description != null ? description : "")
                                    .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, startMillis)
                                    .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, endMillis);
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        } catch (Exception e) {}
                    }
                    @JavascriptInterface
                    public void startPersistentNotification() {
                        try {
                            if (Build.VERSION.SDK_INT >= 33) {
                                if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                                    requestPermissions(new String[]{ android.Manifest.permission.POST_NOTIFICATIONS }, 1001);
                                }
                            }
                            Intent svc = new Intent(MainActivity.this, PrayerNotificationService.class);
                            if (Build.VERSION.SDK_INT >= 26) startForegroundService(svc);
                            else startService(svc);
                        } catch (Exception e) {}
                    }
                    @JavascriptInterface
                    public void stopPersistentNotification() {
                        try {
                            Intent svc = new Intent(MainActivity.this, PrayerNotificationService.class);
                            svc.setAction("STOP");
                            startService(svc); stopService(svc);
                        } catch (Exception e) {}
                    }
                    @JavascriptInterface
                    public boolean isPersistentNotificationRunning() {
                        return PrayerNotificationService.isRunning();
                    }
                    @JavascriptInterface
                    public void calibrate() {}
                    @JavascriptInterface
                    public void rescheduleAlarms() {}
                }, "NativeApp");
            }
        }
    }
}

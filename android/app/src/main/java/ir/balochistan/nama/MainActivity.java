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
    private static final int REQ_VOICE = 2002;

    // ===== v1.16: تسبیح صوتی (راه A — SpeechRecognizer سیستمی) =====
    private android.speech.SpeechRecognizer tasbihSr = null;
    private volatile boolean tasbihVoiceActive = false;
    private int tasbihErrStreak = 0;
    private final android.os.Handler tasbihHandler = new android.os.Handler(android.os.Looper.getMainLooper());

    private void tasbihJs(final String script) {
        try {
            runOnUiThread(new Runnable() { public void run() {
                try { getBridge().getWebView().evaluateJavascript(script, null); } catch (Exception ig) {}
            }});
        } catch (Exception ig) {}
    }

    private void tasbihCreateAndListen() {
        try {
            if (tasbihSr != null) { try { tasbihSr.destroy(); } catch (Exception ig) {} tasbihSr = null; }
            tasbihSr = android.speech.SpeechRecognizer.createSpeechRecognizer(this);
            tasbihSr.setRecognitionListener(new android.speech.RecognitionListener() {
                @Override public void onReadyForSpeech(android.os.Bundle b) { tasbihJs("window.__tasbihVoiceState&&window.__tasbihVoiceState('ready')"); }
                @Override public void onBeginningOfSpeech() { tasbihJs("window.__tasbihVoiceState&&window.__tasbihVoiceState('listening')"); }
                @Override public void onRmsChanged(float v) {}
                @Override public void onBufferReceived(byte[] b) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onError(int err) {
                    // 5=NO_MATCH 6=TIMEOUT 20=NO_SPEECH → عادی، دوباره گوش بده
                    if (err == 5 || err == 6 || err == 20) {
                        tasbihErrStreak = 0;
                        if (tasbihVoiceActive) tasbihHandler.postDelayed(new Runnable() { public void run() { if (tasbihVoiceActive) tasbihCreateAndListen(); } }, 120);
                        return;
                    }
                    // 10=NETWORK 12=NETWORK_TIMEOUT 2=NETWORK 103=NEED_MIC_PERMISSION …
                    tasbihErrStreak++;
                    if (tasbihErrStreak >= 4 || err == 103 || err == 105) {
                        tasbihVoiceActive = false;
                        tasbihJs("window.__tasbihVoiceState&&window.__tasbihVoiceState('off')");
                        tasbihJs("window.__tasbihVoiceError&&window.__tasbihVoiceError(" + err + ")");
                        return;
                    }
                    if (tasbihVoiceActive) tasbihHandler.postDelayed(new Runnable() { public void run() { if (tasbihVoiceActive) tasbihCreateAndListen(); } }, 600);
                }
                @Override public void onResults(android.os.Bundle b) {
                    tasbihErrStreak = 0;
                    java.util.ArrayList<String> al = b == null ? null : b.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                    if (al != null && !al.isEmpty()) {
                        try {
                            org.json.JSONArray ja = new org.json.JSONArray();
                            for (String s : al) ja.put(s);
                            tasbihJs("window.__tasbihHeard&&window.__tasbihHeard(" + ja.toString() + ")");
                        } catch (Exception ig) {}
                    }
                    if (tasbihVoiceActive) tasbihHandler.postDelayed(new Runnable() { public void run() { if (tasbihVoiceActive) tasbihCreateAndListen(); } }, 150);
                }
                @Override public void onPartialResults(android.os.Bundle b) {}
                @Override public void onEvent(int a, android.os.Bundle b) {}
            });
            android.content.Intent ii = new android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            ii.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            ii.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, "fa-IR");
            ii.putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 3);
            ii.putExtra(android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            ii.putExtra(android.speech.RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            if (android.os.Build.VERSION.SDK_INT >= 23) {
                ii.putExtra(android.speech.RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            }
            tasbihSr.startListening(ii);
        } catch (Exception e) {
            tasbihVoiceActive = false;
            tasbihJs("window.__tasbihVoiceState&&window.__tasbihVoiceState('off')");
            tasbihJs("window.__tasbihVoiceError&&window.__tasbihVoiceError(-1)");
        }
    }

    private void tasbihStartLoop() {
        runOnUiThread(new Runnable() { public void run() {
            if (!android.speech.SpeechRecognizer.isRecognitionAvailable(MainActivity.this)) {
                tasbihJs("window.__tasbihVoiceError&&window.__tasbihVoiceError(9001)");
                return;
            }
            tasbihVoiceActive = true;
            tasbihErrStreak = 0;
            tasbihCreateAndListen();
            tasbihJs("window.__tasbihVoiceState&&window.__tasbihVoiceState('on')");
        }});
    }

    private void tasbihVoiceGrantOrRequest() {
        try {
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{ Manifest.permission.RECORD_AUDIO }, REQ_VOICE);
                return;
            }
            tasbihStartLoop();
        } catch (Exception e) { tasbihJs("window.__tasbihVoiceError&&window.__tasbihVoiceError(9002)"); }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        try {
            if (requestCode == REQ_VOICE && grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                tasbihStartLoop();
            } else if (requestCode == REQ_VOICE) {
                tasbihJs("window.__tasbihVoiceError&&window.__tasbihVoiceError(9003)");
            }
        } catch (Exception ig) {}
    }

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
                    // ===== v1.16: تسبیح صوتی — شروع/توقف شنیدن =====
                    @JavascriptInterface
                    public void tasbihVoiceStart() {
                        tasbihVoiceGrantOrRequest();
                    }
                    @JavascriptInterface
                    public void tasbihVoiceStop() {
                        tasbihVoiceActive = false;
                        runOnUiThread(new Runnable() { public void run() {
                            try { if (tasbihSr != null) { tasbihSr.destroy(); tasbihSr = null; } } catch (Exception ig) {}
                        }});
                        tasbihJs("window.__tasbihVoiceState&&window.__tasbihVoiceState('off')");
                    }
                    @JavascriptInterface
                    public boolean tasbihVoiceActive() { return tasbihVoiceActive; }
                    // ===== v1.16: کتاب فتاوا (پروژه IslamPP — منبع: islampp.org) =====
                    @JavascriptInterface
                    public String fatwaStatus() {
                        try {
                            java.io.File f = new java.io.File(getFilesDir(), "fatwa.db");
                            org.json.JSONObject o = new org.json.JSONObject();
                            boolean ready = f.exists() && f.length() > 1000000;
                            o.put("ready", ready);
                            o.put("size", f.exists() ? f.length() : 0);
                            if (ready) {
                                android.database.sqlite.SQLiteDatabase db = android.database.sqlite.SQLiteDatabase
                                    .openDatabase(f.getAbsolutePath(), null, android.database.sqlite.SQLiteDatabase.OPEN_READONLY);
                                android.database.Cursor c = db.rawQuery("SELECT COUNT(*) FROM data", null);
                                if (c.moveToFirst()) o.put("count", c.getInt(0));
                                c.close(); db.close();
                            }
                            return o.toString();
                        } catch (Exception e) { return "{\"ready\":false}"; }
                    }
                    @JavascriptInterface
                    public void fatwaDownload(final String url) {
                        new Thread(new Runnable() {
                            @Override public void run() {
                                java.io.InputStream in = null; java.util.zip.GZIPInputStream gin = null;
                                java.io.BufferedOutputStream bos = null;
                                try {
                                    java.net.HttpURLConnection cn = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
                                    cn.setConnectTimeout(20000); cn.setReadTimeout(30000);
                                    cn.setRequestProperty("User-Agent", "BalochistanNama/1.16");
                                    long expected = 50700000L; // حجم بازِشده تقریبی (۵۰.۷MB)
                                    in = new java.io.BufferedInputStream(cn.getInputStream());
                                    gin = new java.util.zip.GZIPInputStream(in);
                                    java.io.File tmp = new java.io.File(getFilesDir(), "fatwa.db.dl");
                                    bos = new java.io.BufferedOutputStream(new java.io.FileOutputStream(tmp));
                                    byte[] buf = new byte[16384]; long done = 0; int r; int lastPct = -1;
                                    while ((r = gin.read(buf)) > 0) {
                                        bos.write(buf, 0, r); done += r;
                                        int pct = (int) (done * 100 / expected);
                                        if (pct > 100) pct = 100;
                                        if (pct >= lastPct + 5) {
                                            lastPct = pct;
                                            final int p = pct;
                                            runOnUiThread(new Runnable() { public void run() {
                                                try { getBridge().getWebView().evaluateJavascript("window.__fatwaProgress&&window.__fatwaProgress(" + p + ")", null); } catch (Exception e) {}
                                            }});
                                        }
                                    }
                                    bos.flush(); bos.close(); bos = null; gin.close(); gin = null; cn.disconnect();
                                    java.io.File out = new java.io.File(getFilesDir(), "fatwa.db");
                                    if (out.exists()) out.delete();
                                    if (!tmp.renameTo(out)) throw new Exception("rename-failed");
                                    runOnUiThread(new Runnable() { public void run() {
                                        try { getBridge().getWebView().evaluateJavascript("window.__fatwaDone&&window.__fatwaDone()", null); } catch (Exception e) {}
                                    }});
                                } catch (final Exception e) {
                                    try { if (bos != null) bos.close(); } catch (Exception ig) {}
                                    try { if (gin != null) gin.close(); } catch (Exception ig) {}
                                    final String msg = (e.getMessage() == null ? "خطای دانلود" : e.getMessage()).replace("\"", "'").replace("\\", "");
                                    runOnUiThread(new Runnable() { public void run() {
                                        try { getBridge().getWebView().evaluateJavascript("window.__fatwaFail&&window.__fatwaFail(\"" + msg + "\")", null); } catch (Exception ig) {}
                                    }});
                                }
                            }
                        }).start();
                    }
                    @JavascriptInterface
                    public String fatwaSearch(String query, int limit) {
                        java.io.File f = new java.io.File(getFilesDir(), "fatwa.db");
                        if (!f.exists()) return "[]";
                        android.database.sqlite.SQLiteDatabase db = null; android.database.Cursor c = null;
                        try {
                            db = android.database.sqlite.SQLiteDatabase.openDatabase(f.getAbsolutePath(), null, android.database.sqlite.SQLiteDatabase.OPEN_READONLY);
                            String q = query.trim().toLowerCase();
                            String like = "%" + q + "%";
                            int len = Math.max(1, q.length());
                            // رتبه‌بندی بومی: تعداد تکرار کلیدواژه در سؤال+جواب (REPLACE trick)
                            c = db.rawQuery(
                                "SELECT id, question, substr(answer,1,500), LENGTH(answer), " +
                                "(LENGTH(lower(question)||' '||lower(answer)) - LENGTH(REPLACE(lower(question)||' '||lower(answer), ?, ' '))) / ? AS hits " +
                                "FROM data WHERE question LIKE ? OR answer LIKE ? ORDER BY hits DESC LIMIT ?",
                                new String[]{ q, String.valueOf(len), like, like, String.valueOf(Math.max(5, Math.min(50, limit))) });
                            org.json.JSONArray arr = new org.json.JSONArray();
                            while (c.moveToNext()) {
                                org.json.JSONObject o = new org.json.JSONObject();
                                o.put("i", c.getInt(0)); o.put("q", c.getString(1));
                                o.put("a", c.getString(2)); o.put("len", c.getInt(3)); o.put("hits", c.getInt(4));
                                arr.put(o);
                            }
                            return arr.toString();
                        } catch (Exception e) { return "[]"; }
                        finally {
                            try { if (c != null) c.close(); } catch (Exception ig) {}
                            try { if (db != null) db.close(); } catch (Exception ig) {}
                        }
                    }
                    @JavascriptInterface
                    public String fatwaGet(int id) {
                        java.io.File f = new java.io.File(getFilesDir(), "fatwa.db");
                        if (!f.exists()) return "null";
                        android.database.sqlite.SQLiteDatabase db = null; android.database.Cursor c = null;
                        try {
                            db = android.database.sqlite.SQLiteDatabase.openDatabase(f.getAbsolutePath(), null, android.database.sqlite.SQLiteDatabase.OPEN_READONLY);
                            c = db.rawQuery("SELECT question, answer FROM data WHERE id=?", new String[]{ String.valueOf(id) });
                            if (c.moveToFirst()) {
                                org.json.JSONObject o = new org.json.JSONObject();
                                o.put("q", c.getString(0)); o.put("a", c.getString(1));
                                return o.toString();
                            }
                            return "null";
                        } catch (Exception e) { return "null"; }
                        finally {
                            try { if (c != null) c.close(); } catch (Exception ig) {}
                            try { if (db != null) db.close(); } catch (Exception ig) {}
                        }
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

# بلوچستان‌نما (BalochistanNama) v1.12 — سورس کامل

اپلیکیشن اندرویدی «بلوچستان نما» — تقویم شمسی/قمری/میلادی، اوقات شرعی با ۷ روش محاسبه، اذان‌های شخصی، قبله‌نما، آب‌وهوا، تسبیح‌شمار، یادداشت، فرهنگ بلوچی و ویجت‌های صفحه اصلی.
Capacitor 8 + وب‌ویو (HTML/CSS/JS خالص، بدون فریم‌ورک).

## ساختار پروژه

```
capacitor/
├── www/                  ← کل کد اپ (اینجا توسعه بده!)
│   ├── index.html        ← ساختار UI (۲۵ اسکریپت با ?v=113)
│   ├── css/              ← app.css + extras.css
│   ├── js/               ← منطق ماژولار:
│   │   ├── app.js        ← هسته: state، routing، init، UI، اذان‌ها (۸۹KB)
│   │   ├── athan.js      ← کتابخانه صداهای اذان (v1.12 بازنویسی‌شده)
│   │   ├── athan_player.js ← اذان دیجیتال (Web Audio، بدون MP3)
│   │   ├── cal.js        ← تبدیل‌های تقویم سه‌گانه
│   │   ├── prayertimes.js ← محاسبه اوقات شرعی
│   │   ├── events.js     ← مناسبت‌ها
│   │   ├── notes.js / personalevents.js / tasbeeh.js / stats.js
│   │   ├── weather.js / compass.js / moon.js / rooze.js (متن روزه)
│   │   └── ics.js / notify.js / extensions.js / tools.js / ...
│   ├── assets/audio/adan_user.mp3  ← اذان مکه (builtin)
│   └── fonts/            ← Vazirmatn + Sahel + NotoNastaliq
├── android/              ← پروژه اندروید (Capacitor)
│   └── app/src/main/java/ir/balochistan/nama/
│       ├── MainActivity.java          ← bridge جاوا (NotesBridge/NativeApp)
│       ├── PrayerNotificationService.java ← سرویس اذان با اپ بسته (390 خط)
│       ├── PrayerWidgetProvider.java / WeatherWidgetProvider.java
│       └── WeatherCodes.java
├── capacitor.config.json ← appId: ir.balochistan.nama
└── package.json          ← @capacitor 8 + filesystem + local-notifications
```

## راه‌اندازی و بیلد

```bash
npm install                # نصب پلاگین‌ها
npx cap sync android      # کپی www → اندروید
# ⚠️ نکته مهم: sync همیشه capacitor.build.gradle را VERSION_21 برمی‌گرداند
# بعد از هر sync این را اجرا کن:
sed -i 's/JavaVersion.VERSION_21/JavaVersion.VERSION_17/g' android/app/capacitor.build.gradle
cd android && ./gradlew assembleDebug
# خروجی: android/app/build/outputs/apk/debug/app-debug.apk
```

## نکات مهم توسعه (درس‌های نسخه‌های قبل)

1. **کش WebView:** هر تغییری در JS/CSS → شماره `?v=` در index.html را یکی بالا ببر (الان 113) — وگرنه کاربر نسخه کش‌شده قدیمی را می‌بیند.
2. **toggleهای اضافی** (مثل هشدار قبل اذان): listener با `capture:true` + `stopImmediatePropagation` لازم است چون init سراسری همه `.toggle`ها را bind می‌کند.
3. **سهمیه localStorage:** فایل‌های صوتی کاربر نباید داخل localStorage باشند — athan.js v1.12 آن‌ها را در `filesDir/athans/` با Filesystem plugin نگه می‌دارد و با Blob/objectURL پخش می‌کند.
4. **Bridge جاوا:** در anonymous class از `MainActivity.this` استفاده کن (نه getContext()).
5. **Migración داده:** loadLib در athan.js مهاجرت خودکار IDهای تکراری قدیمی و base64های >120KB به دیسک را انجام می‌دهد — نباید حذف شود.
6. **WebView fetch:** fetch فایل از assets در WebView اندروید کار نمی‌کند — از Filesystem plugin استفاده کن.

## تست منطق (بدون شبیه‌ساز!)

کدهای WebView را می‌توان در Node با mock مستقیم تست کرد:
```bash
node /var/minis/workspace/test_athan3.js    # ۱۲/۱۲ ✓
node /var/minis/workspace/test_migrate.js   # ۸/۸ ✓
```

## تاریخچه نسخه‌ها
- v1.12 (۱۴۰۵/۰۶/۲۳): رفع باگهای اذان — ID تکراری، ذخیره انتخاب، کرش فایل بزرگ، مهاجرت خودکار، دکمه ▶️ در لیست
- v1.11: اذان با اپ بسته (سرویس MediaPlayer)، هشدار قبل اذان، ویبره، اقامه، CRUD اذان
- v1.9: خروجی ICS، اشتراک مناسبت، نقشه قبله، ویجت آب‌وهوا، آمار شخصی
- v1.0–v1.8: هسته اپ — تقویم، اوقات، قبله، تسبیح، یادداشت، فرهنگ

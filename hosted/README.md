# hosted/times — دیتای اوقات شرعی برای دانلود از سرور (v1.16 مرحله ۲)
- فایل‌ها: `times/<jy>-<jm>.json` — فرمت: `{month, method:'karachi-hanafi', cities:{نام‌شهر:{days:{روز:{fajr,sunrise,dhuhr,asr,maghrib,isha}}}}}`
- تولید با: `node /var/minis/workspace/gen_times.js` (۱۳ ماه پیشرو، ۴۳ شهر بلوچستان، الگوریتم کراچی-حنفی)
- این پوشه در APK نمی‌رود (بیرون از www). برای انتشار: پوشش در `docs/times` گیت‌هاب + GitHub Pages → URL پیش‌فرض `msmarbabi.github.io/balochistan-nama/times/...`

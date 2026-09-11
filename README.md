# Capacitor روی سندباکس میثم — راهنمای کامل

## نصب‌شده‌ها
- Node v22.23.2 + npm 10.9.1 (apk)
- Capacitor 8.5.0 (core/cli/android) در `/var/minis/workspace/capacitor`
- Gradle 8.14.3 در `/opt/gradle-8.14.3` (از services.gradle.org)
- JDK 17 (پیش‌فرض کارا) + OpenJDK 21 نصب شده ولی **اجرا نمی‌شه** (PaX: Failed to mark memory page as executable)
- SDK رسمی از میرور تنسنت: `build-tools/35.0.0` + `platforms/android-36` کامل

## اولین APK موفق
`app-debug.apk` (۴.۱MB) — امضای V2 دیباگ ✅ → کپی در `workspace/donyaye-meysam-debug.apk`

## نکات بحرانی (اگه خراب شد اینا رو چک کن)
1. **dl.google.com بلاکه** → همهٔ `google()` باید بشه `maven.aliyun.com/repository/google`
   - init script سراسری: `/root/.gradle/init.d/mirrors.gradle`
2. **JDK 21 اجرا نمی‌شه** (PaX sandbox) → همه‌جا VERSION_21→17:
   - `node_modules/@capacitor/android/capacitor/build.gradle`
   - `android/app/capacitor.build.gradle`
   - `android/capacitor-cordova-android-plugins/build.gradle`
3. **aapt2 گوگل glibc-لینک هست** و روی musl استارت نمی‌شه → override به استاتیک:
   - `gradle.properties`: `android.aapt2FromMavenOverride=/opt/android-sdk/build-tools/35.0.2/aapt2`
4. **JAVA_HOME همیشه = java-17-openjdk** (apk openjdk21 symlink default رو عوض کرده بود)
5. AGP بدون source.properties رسمی build-tools رو نمی‌شناسه → بیلد-تولز رسمی از میرور تنسنت نصب شد.

## گردش کار
```sh
cd /var/minis/workspace/capacitor
sh patch-capacitor.sh        # بعد از هر npm install / cap add
npx cap sync                 # بعد از تغییر www/
sh build-cap.sh              # بیلد + کپی APK به workspace
```

## پروژه تستی فعلی
- نام اپ: دنیای میثم | package: `ir.hormi.world` | web-dir: `www/`

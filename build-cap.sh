#!/bin/sh
# دنیای میثم — بیلد APK پروژه Capacitor
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk   # JDK21 روی سندباکس اجرا نمی‌شه (PaX)
cd /var/minis/workspace/capacitor/android
/opt/gradle-8.14.3/bin/gradle assembleDebug --no-daemon -Dorg.gradle.jvmargs="-Xmx2048m" "$@"
cp app/build/outputs/apk/debug/app-debug.apk /var/minis/workspace/donyaye-meysam-debug.apk 2>/dev/null \
  && echo "[+] APK -> /var/minis/workspace/donyaye-meysam-debug.apk"

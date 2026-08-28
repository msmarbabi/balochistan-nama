#!/bin/sh
# دنیای میثم — پچ خودکار Capacitor برای سندباکس Alpine/musl
# بعد از هر npm install یا cap add plugin اینو اجرا کن!
CAP=/var/minis/workspace/capacitor

# ۱) جاوا ۲۱ → ۱۷ (سندباکس فقط JDK 17 اجرا می‌کنه)
find $CAP/node_modules/@capacitor $CAP/android -name "*.gradle" -type f 2>/dev/null | while read f; do
  sed -i 's|VERSION_21|VERSION_17|g' "$f"
done

# ۲) مخزن گوگل بلاکه → میرور علی‌بابا
find $CAP/node_modules/@capacitor $CAP/android -name "*.gradle" -type f 2>/dev/null | while read f; do
  sed -i "s|google()|maven { url 'https://maven.aliyun.com/repository/google' }|g" "$f"
done

echo "[+] patch done"

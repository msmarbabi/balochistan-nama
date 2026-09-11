package ir.balochistan.nama;

/** ترجمه فارسی کدهای WMO آب‌وهوا */
public final class WeatherCodes {
    public static String fa(int code) {
        switch (code) {
            case 0: return "آفتابی ☀️";
            case 1: return "عمدتاً آفتابی 🌤️";
            case 2: return "نیمه‌ابری ⛅";
            case 3: return "ابری ☁️";
            case 45: case 48: return "مه 🌫️";
            case 51: case 53: case 55: return "نم‌نم باران 🌦️";
            case 56: case 57: return "باران یخ‌زده 🌧️";
            case 61: case 63: case 65: return "بارانی 🌧️";
            case 66: case 67: return "باران سرد 🌧️";
            case 71: case 73: case 75: return "برفی ❄️";
            case 77: return "دانه برف 🌨️";
            case 80: case 81: case 82: return "رگبار باران 🌧️";
            case 85: case 86: return "رگبار برف 🌨️";
            case 95: return "رعد و برق ⛈️";
            case 96: case 99: return "تگرگ ⛈️";
            default: return "نامشخص";
        }
    }
    private WeatherCodes() {}
}

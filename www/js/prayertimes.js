/* ============================================================
   Balochistan Nama - Prayer times engine (prayertimes.js)
   Port of PrayTimes.org algorithm. Default method: Karachi-Hanafi.
   ============================================================ */

(function (global) {
  'use strict';

  function dtr(d) { return d * Math.PI / 180; }
  function rtd(r) { return r * 180 / Math.PI; }
  function sin(d) { return Math.sin(dtr(d)); }
  function cos(d) { return Math.cos(dtr(d)); }
  function tan(d) { return Math.tan(dtr(d)); }
  function arcsin(x) { return rtd(Math.asin(x)); }
  function arccos(x) { return rtd(Math.acos(x)); }
  function arctan2(y, x) { return rtd(Math.atan2(y, x)); }
  function arccot(x) { return rtd(Math.atan2(1, x)); }
  function fixAngle(a) { return fix(a, 360); }
  function fixHour(a) { return fix(a, 24); }
  function fix(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }

  /* Julian Day from Gregorian Y/M/D (integer or fractional day accepted). */
  function julian(year, month, day) {
    if (month <= 2) { year -= 1; month += 12; }
    var A = Math.floor(year / 100);
    var B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
  }

  /* Compute sun position (declination, equation of time in hours)
     at Julian Day jd. */
  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = arctan2(cos(e) * sin(L), cos(L)) / 15;
    RA = fixHour(RA);
    var eqt = q / 15 - fixHour(RA);
    var decl = arcsin(sin(e) * sin(L));
    return { declination: decl, equation: eqt };
  }

  /* Compute the time (in hours UT) at which the sun reaches a given
     altitude angle above the horizon (positive = above, negative = below).
     jd: Julian Day at 0h UT of the target date
     lat, lng: observer coordinates
     direction: +1 = setting (after solar noon), -1 = rising (before noon)
   */
  function sunAltitudeTime(altitude, lat, lng, jd, direction) {
    var pos = sunPosition(jd - lng / 360 + 0.5);
    var decl = pos.declination;
    var noon = 12 - pos.equation - lng / 15;
    var T = (1 / 15) * arccos(
      (sin(altitude) - sin(lat) * sin(decl)) /
      (cos(lat) * cos(decl))
    );
    if (isNaN(T)) return NaN;
    return noon + direction * T;
  }

  function asrTime(factor, lat, lng, jd) {
    var pos = sunPosition(jd - lng / 360 + 0.5);
    var decl = pos.declination;
    // Asr sun altitude above horizon (positive) = arccot(factor + tan(|lat-decl|))
    var altitudeAngle = arccot(factor + tan(Math.abs(lat - decl)));
    return sunAltitudeTime(altitudeAngle, lat, lng, jd, +1);
  }

  var METHODS = {
    karachi:       { name: 'دانشگاه علوم اسلامی کراچی', fajr: 18,   isha: 18,   asr: 'Hanafi' },
    karachiShafii: { name: 'کراچی - شافعی',              fajr: 18,   isha: 18,   asr: 'Shafii' },
    mwL:           { name: 'اتحادیه جهان اسلام',         fajr: 18,   isha: 17,   asr: 'Shafii' },
    egypt:         { name: 'مصر',                         fajr: 19.5, isha: 17.5, asr: 'Shafii' },
    makkah:        { name: 'ام‌القوری مکه',              fajr: 18.5, isha: 18.5, asr: 'Shafii', ishaInterval: 90 },
    turkey:        { name: 'ترکیه - دیانت',              fajr: 18,   isha: 17,   asr: 'Shafii' },
    tehran:        { name: 'تهران (شیعه)',                fajr: 17.7, isha: 14,   asr: 'Hanafi' },
    gulf:          { name: 'خلیج فارس',                   fajr: 19.5, isha: 17.5, asr: 'Shafii' },
    northAmerica:  { name: 'آمریکای شمالی (ISNA)',        fajr: 15,   isha: 15,   asr: 'Shafii' }
  };

  /* Compute prayer times in UT hours for a Gregorian date at lat/lng. */
  function compute(date, lat, lng, method) {
    method = method || METHODS.karachi;
    var jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate());

    function rise(altitude) { return sunAltitudeTime(altitude, lat, lng, jd, -1); }
    function set(altitude)  { return sunAltitudeTime(altitude, lat, lng, jd, +1); }

    var pos = sunPosition(jd - lng / 360 + 0.5);
    var noon = 12 - pos.equation - lng / 15;

    var times = {};
    times.imsak   = rise(-(method.fajr + 0.5));
    times.fajr    = rise(-method.fajr);
    times.sunrise = rise(-0.833);
    times.dhuhr   = noon + 1/60;
    var __asrMode = (typeof window !== 'undefined' && window.__asrMode && window.__asrMode !== 'method') ? window.__asrMode : method.asr;
    times.asr     = asrTime(__asrMode === 'Hanafi' ? 2 : 1, lat, lng, jd);
    times.sunset  = set(-0.833);
    times.maghrib = times.sunset + 1/60;
    if (method.ishaInterval) {
      times.isha = times.sunset + method.ishaInterval / 60;
    } else {
      times.isha = set(-method.isha);
    }
    times.midnight = (times.sunset + times.fajr + 24) / 2;
    if (times.midnight >= 24) times.midnight -= 24;
    if (times.midnight < 0) times.midnight += 24;
    return times;
  }

  /* Convert UT hours -> local civil time using tz offset (hours east of UTC). */
  function toLocal(utHours, tz) {
    if (isNaN(utHours)) return NaN;
    return fixHour(utHours + tz);
  }

  function computeLocal(date, lat, lng, method, tzOffset) {
    var t = compute(date, lat, lng, method);
    var out = {};
    for (var k in t) {
      if (!t.hasOwnProperty(k)) continue;
      out[k] = toLocal(t[k], tzOffset);
    }
    return out;
  }

  function formatTime(hours, format) {
    if (isNaN(hours)) return '--:--';
    var h = Math.floor(fixHour(hours));
    var m = Math.round((fixHour(hours) - h) * 60);
    if (m === 60) { h = (h + 1) % 24; m = 0; }
    if (format === 'fa') {
      var FA = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
      function toFa(n) { return String(n).replace(/[0-9]/g, function(d){return FA[+d];}); }
      var hh = h < 10 ? '۰' + toFa(h) : toFa(h);
      var mm = m < 10 ? '۰' + toFa(m) : toFa(m);
      return hh + ':' + mm;
    }
    var hh = h < 10 ? '0' + h : '' + h;
    var mm = m < 10 ? '0' + m : '' + m;
    return hh + ':' + mm;
  }

  function qiblaBearing(lat, lng) {
    var kLat = 21.4225, kLng = 39.8262;
    var dLng = kLng - lng;
    var y = sin(dLng) * cos(kLat);
    var x = cos(lat) * sin(kLat) - sin(lat) * cos(kLat) * cos(dLng);
    return fixAngle(arctan2(y, x));
  }
  function qiblaDistance(lat, lng) {
    var R = 6371;
    var kLat = 21.4225, kLng = 39.8262;
    var dLat = dtr(kLat - lat);
    var dLng = dtr(kLng - lng);
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(dtr(lat)) * Math.cos(dtr(kLat)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }
  function moonPhase(date) {
    var synodic = 29.53058867;
    var ref = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    var days = (date - ref) / 86400000;
    var phase = (days % synodic) / synodic;
    if (phase < 0) phase += 1;
    return phase;
  }
  var PHASE_NAMES = [
    'ماه تازه (هلال نو)', 'هلال تازه', 'ربع اول', 'نیمه‌ی نخست',
    'اوج‌نمو (بزرگ‌شونده)', 'بدر کامل (شب نور)', 'کوچک‌شونده',
    'ربع آخر', 'هلال آخر', 'ماه تاریک'
  ];
  function moonPhaseName(p) {
    if (p < 0.06) return PHASE_NAMES[0];
    if (p < 0.14) return PHASE_NAMES[1];
    if (p < 0.23) return PHASE_NAMES[2];
    if (p < 0.27) return PHASE_NAMES[3];
    if (p < 0.47) return PHASE_NAMES[4];
    if (p < 0.53) return PHASE_NAMES[5];
    if (p < 0.73) return PHASE_NAMES[6];
    if (p < 0.77) return PHASE_NAMES[7];
    if (p < 0.94) return PHASE_NAMES[8];
    return PHASE_NAMES[9];
  }
  var NAMES = {
    imsak: 'امساک', fajr: 'اذان صبح', sunrise: 'طلوع آفتاب',
    dhuhr: 'اذان ظهر', asr: 'اذان عصر', sunset: 'غروب آفتاب',
    maghrib: 'اذان مغرب', isha: 'اذان عشا', midnight: 'نیمه‌شب'
  };

  // v1.16: تنظیمات دستی متمرکز (ادیت همه/تک/سفارشی) — همه مصرف‌کننده‌ها صدا بزنند
  function applyAdj(times, st) {
    if (!times || !st) return times;
    var out = {};
    for (var k in times) {
      if (!times.hasOwnProperty(k)) continue;
      var t = times[k];
      if (!isFinite(t)) { out[k] = t; continue; }
      t += (st.prayerAdjAll || 0) / 60;
      if (st.prayerAdjSingle && st.prayerAdjSingle.prayer === k) t += (st.prayerAdjSingle.adj || 0) / 60;
      if (st.prayerAdjCustom) {
        var nameMap = { 'فجر': 'fajr', 'صبح': 'fajr', 'طلوع': 'sunrise', 'ظهر': 'dhuhr', 'عصر': 'asr', 'مغرب': 'maghrib', 'عشا': 'isha', 'امساک': 'imsak' };
        var faNum = { '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9 };
        var parts = String(st.prayerAdjCustom).split(',');
        for (var i = 0; i < parts.length; i++) {
          var raw = String(parts[i]).replace(/[۰-۹]/g, function (c) { return faNum[c]; }).trim();
          var m = raw.match(/^([a-zA-Z\u0600-\u06FF]+)\s*([+\-]?\d+)$/);
          if (!m) continue;
          var key = nameMap[m[1]] || m[1].toLowerCase();
          if (key === k) t += (parseInt(m[2], 10) || 0) / 60;
        }
      }
      out[k] = fixHour(t);
    }
    return out;
  }

  var Prayer = {
    METHODS: METHODS,
    applyAdj: applyAdj,
    compute: compute,
    computeLocal: computeLocal,
    formatTime: formatTime,
    qiblaBearing: qiblaBearing,
    qiblaDistance: qiblaDistance,
    moonPhase: moonPhase,
    moonPhaseName: moonPhaseName,
    NAMES: NAMES,
    sunPosition: sunPosition
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Prayer;
  if (typeof window !== 'undefined') window.Prayer = Prayer;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

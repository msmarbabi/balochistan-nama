/* ============================================================
   Balochistan Nama - Calendar Conversion Engine (cal.js)
   Converts between Jalali (Persian Solar), Gregorian, and
   Hijri (Islamic Lunar, tabular/civil variant) calendars.
   Jalali <-> Gregorian uses the canonical jalaali-js algorithm
   (MIT, by Behrang Noruzi Niya).
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------- math helpers ----------
     Note: div() uses ~~ (truncation toward zero), matching the
     canonical jalaali-js. Math.floor would diverge for negative
     inputs and break conversion of dates before month 8. */
  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  /* ============================================================
     Jalali <-> Gregorian (canonical jalaali-js v1.1.0, MIT)
     ============================================================ */
  var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
                1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function jalCal(jy, withoutLeap) {
    var bl = breaks.length, gy = jy + 621, leapJ = -14, jp = breaks[0],
      jm, jump, leap, leapG, march, n, i;
    if (jy < jp || jy >= breaks[bl - 1]) throw new Error('Invalid Jalaali year ' + jy);
    for (i = 1; i < bl; i += 1) {
      jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;
    if (withoutLeap) return { gy: gy, march: march };
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap: leap, gy: gy, march: march };
  }

  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4)
        + div(153 * mod(gm + 9, 12) + 2, 5)
        + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }
  function d2g(jdn) {
    var j, i, gd, gm, gy;
    j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    i = div(mod(j, 1461), 4) * 5 + 308;
    gd = div(mod(i, 153), 5) + 1;
    gm = mod(div(i, 153), 12) + 1;
    gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }
  function j2d(jy, jm, jd) {
    var r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }
  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy, false),
      jdn1f = g2d(gy, 3, r.march), jd, jm, k;
    k = jdn - jdn1f;
    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
        return { jy: jy, jm: jm, jd: jd };
      } else {
        k -= 186;
      }
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }

  function toJalaali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
  function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }
  function isLeapJalali(jy) { return jalCal(jy).leap === 0; }

  function jalaliMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isLeapJalali(jy) ? 30 : 29;
  }

  /* ============================================================
     Gregorian <-> Julian Day Number (standard algorithm)
     ============================================================ */
  function gregToJDN(gy, gm, gd) {
    var a = div((14 - gm), 12);
    var y = gy + 4800 - a;
    var m = gm + 12 * a - 3;
    return gd + div((153 * m + 2), 5) + 365 * y + div(y, 4) - div(y, 100) + div(y, 400) - 32045;
  }
  function jdnToGreg(jdn) {
    var a = jdn + 32044;
    var b = div((4 * a + 3), 146097);
    var c = a - div((b * 146097), 4);
    var d = div((4 * c + 3), 1461);
    var e = c - div((1461 * d), 4);
    var m = div((5 * e + 2), 153);
    var day = e - div((153 * m + 2), 5) + 1;
    var month = m + 3 - 12 * div(m, 10);
    var year = b * 100 + d - 4800 + div(m, 10);
    return { gy: year, gm: month, gd: day };
  }

  /* ============================================================
     Hijri (Islamic Lunar) - tabular/civil variant
     Epoch: 1 Muharram 1 AH = JDN 1948440 (Friday, 16 Jul 622 CE)
     30-year cycle, 10631 days, leap years at positions:
     2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29  (Type IIb)
     ============================================================ */
  var HIJRI_EPOCH_JDN = 1948440;
  var HIJRI_LEAP_POS = [2, 5, 7, 10, 13, 16, 18, 21, 24, 26, 29];

  function isHijriLeapYear(hy) {
    var pos = mod(hy - 1, 30) + 1;
    return HIJRI_LEAP_POS.indexOf(pos) >= 0;
  }
  function hijriMonthLength(hy, hm) {
    if (hm === 12) return isHijriLeapYear(hy) ? 30 : 29;
    return (mod(hm, 2) === 1) ? 30 : 29;
  }
  function hijriToJDN(hy, hm, hd) {
    var jd = HIJRI_EPOCH_JDN;
    var prevCycles = div((hy - 1), 30);
    jd += prevCycles * 10631;
    var pos = mod(hy - 1, 30) + 1;
    for (var y = 1; y < pos; y++) {
      jd += (HIJRI_LEAP_POS.indexOf(y) >= 0) ? 355 : 354;
    }
    for (var mo = 1; mo < hm; mo++) {
      jd += hijriMonthLength(hy, mo);
    }
    jd += (hd - 1);
    return jd;
  }
  function jdnToHijri(jdn) {
    var days = jdn - HIJRI_EPOCH_JDN;
    var n30 = div(days, 10631);
    var rem = days - n30 * 10631;
    var year = n30 * 30 + 1;
    var dayOfYear = rem + 1;
    for (var y = 1; y <= 30; y++) {
      var yLen = (HIJRI_LEAP_POS.indexOf(y) >= 0) ? 355 : 354;
      if (dayOfYear <= yLen) { year = n30 * 30 + y; break; }
      dayOfYear -= yLen;
    }
    var month, day;
    for (var mo = 1; mo <= 12; mo++) {
      var mLen = hijriMonthLength(year, mo);
      if (dayOfYear <= mLen) { month = mo; day = dayOfYear; break; }
      dayOfYear -= mLen;
    }
    return { hy: year, hm: month, hd: day };
  }
  function gregToHijri(gy, gm, gd) { return jdnToHijri(gregToJDN(gy, gm, gd)); }
  function hijriToGreg(hy, hm, hd) { return jdnToGreg(hijriToJDN(hy, hm, hd)); }

  /* ============================================================
     Names
     ============================================================ */
  var JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
                       'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  var GREGORIAN_MONTHS_FA = ['ژانویه', 'فوریه', 'مارس', 'آوریل', 'مه', 'ژوئن',
                             'ژوئیه', 'اوت', 'سپتامبر', 'اکتبر', 'نوامبر', 'دسامبر'];
  var HIJRI_MONTHS = ['محرم', 'صفر', 'ربیع‌الاول', 'ربیع‌الثانی', 'جمادی‌الاولی', 'جمادی‌الثانی',
                      'رجب', 'شعبان', 'رمضان', 'شوال', 'ذیقعده', 'ذیحجه'];
  var WEEKDAYS_FA_SAT_FIRST = ['شنبه', 'یک‌شنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'];

  // JavaScript Date.getDay() returns 0=Sunday..6=Saturday
  // We want Saturday-first order: Sat=0, Sun=1, ..., Fri=6
  function jsDayToSatFirst(jsDay) {
    return (jsDay + 1) % 7;
  }

  /* ---------- Persian numerals ---------- */
  function toFaDigits(n) { return (window.BXUtils ? BXUtils.toFaDigits : String)(n); }
  function toLatinDigits(s) {
    return String(s).replace(/[۰-۹]/g, function (d) { return String(FA_DIGITS.indexOf(d)); });
  }

  /* ---------- Higher-level helpers ---------- */
  function dateToTriple(date) {
    var gy = date.getFullYear();
    var gm = date.getMonth() + 1;
    var gd = date.getDate();
    var j = toJalaali(gy, gm, gd);
    var h = gregToHijri(gy, gm, gd);
    return {
      greg: { gy: gy, gm: gm, gd: gd },
      jalali: { jy: j.jy, jm: j.jm, jd: j.jd },
      hijri: { hy: h.hy, hm: h.hm, hd: h.hd },
      weekdaySatFirst: jsDayToSatFirst(date.getDay())
    };
  }

  function adjustHijri(hy, hm, hd, offsetDays) {
    if (!offsetDays) return { hy: hy, hm: hm, hd: hd };
    var jd = hijriToJDN(hy, hm, hd) + offsetDays;
    return jdnToHijri(jd);
  }

  function fmtJalali(j, opts) {
    var fa = !opts || opts.fa !== false;
    var sep = (opts && opts.sep) || '/';
    return fa ? toFaDigits(j.jy) + sep + toFaDigits(j.jm) + sep + toFaDigits(j.jd)
              : (j.jy + sep + j.jm + sep + j.jd);
  }
  function fmtJalaliLong(j) {
    return toFaDigits(j.jd) + ' ' + JALALI_MONTHS[j.jm - 1] + ' ' + toFaDigits(j.jy);
  }
  function fmtGregLong(g) {
    return toFaDigits(g.gd) + ' ' + GREGORIAN_MONTHS_FA[g.gm - 1] + ' ' + toFaDigits(g.gy);
  }
  function fmtHijriLong(h, opts) {
    var fa = !opts || opts.fa !== false;
    return fa ? toFaDigits(h.hd) + ' ' + HIJRI_MONTHS[h.hm - 1] + ' ' + toFaDigits(h.hy)
              : (h.hd + ' ' + HIJRI_MONTHS[h.hm - 1] + ' ' + h.hy);
  }

  function jalaliDayOfYear(j) {
    var d = j.jd;
    for (var m = 1; m < j.jm; m++) d += jalaliMonthLength(j.jy, m);
    return d;
  }
  function jalaliSeason(jm) {
    if (jm <= 3) return 1;
    if (jm <= 6) return 2;
    if (jm <= 9) return 3;
    return 4;
  }
  var SEASONS_FA = ['بهار', 'تابستان', 'پاییز', 'زمستان'];

  function daysBetweenG(g1, g2) { return gregToJDN(g2.gy, g2.gm, g2.gd) - gregToJDN(g1.gy, g1.gm, g1.gd); }

  function buildJalaliMonthGrid(jy, jm, hijriAdjust) {    var cells = [];
    var firstG = toGregorian(jy, jm, 1);
    var firstSatFirst = jsDayToSatFirst(new Date(firstG.gy, firstG.gm - 1, firstG.gd).getDay());
    var mLen = jalaliMonthLength(jy, jm);
    var prevJy = (jm === 1) ? jy - 1 : jy;
    var prevJm = (jm === 1) ? 12 : jm - 1;
    var prevJLen = jalaliMonthLength(prevJy, prevJm);
    for (var p = 0; p < firstSatFirst; p++) {
      var pd = prevJLen - (firstSatFirst - 1 - p);
      cells.push(_mkcell(prevJy, prevJm, pd, false, hijriAdjust));
    }
    for (var d = 1; d <= mLen; d++) cells.push(_mkcell(jy, jm, d, true, hijriAdjust));
    var nextJy = (jm === 12) ? jy + 1 : jy;
    var nextJm = (jm === 12) ? 1 : jm + 1;
    var nd = 1;
    while (cells.length % 7 !== 0) cells.push(_mkcell(nextJy, nextJm, nd++, false, hijriAdjust));
    var weeks = [];
    for (var i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }
  function _mkcell(jy, jm, jd, inMonth, hijriAdjust) {
    var g = toGregorian(jy, jm, jd);
    var h = gregToHijri(g.gy, g.gm, g.gd);
    if (hijriAdjust) h = adjustHijri(h.hy, h.hm, h.hd, hijriAdjust);
    var wd = jsDayToSatFirst(new Date(g.gy, g.gm - 1, g.gd).getDay());
    return { jy: jy, jm: jm, jd: jd, greg: g, hijri: h, weekdaySatFirst: wd, inMonth: inMonth };
  }

  // Build a Gregorian month grid (weeks). Cells carry same shape as jalali grid.
  function buildGregorianMonthGrid(gy, gm, hijriAdjust) {
    var cells = [];
    var firstSatFirst = jsDayToSatFirst(new Date(gy, gm - 1, 1).getDay());
    var mLen = new Date(gy, gm, 0).getDate();
    var prevGm = (gm === 1) ? 12 : gm - 1;
    var prevGy = (gm === 1) ? gy - 1 : gy;
    var prevLen = new Date(prevGy, prevGm, 0).getDate();
    for (var p = 0; p < firstSatFirst; p++) {
      var pd = prevLen - (firstSatFirst - 1 - p);
      cells.push(_mkcellFromGreg(prevGy, prevGm, pd, false, hijriAdjust));
    }
    for (var d = 1; d <= mLen; d++) cells.push(_mkcellFromGreg(gy, gm, d, true, hijriAdjust));
    var nextGy = (gm === 12) ? gy + 1 : gy;
    var nextGm = (gm === 12) ? 1 : gm + 1;
    var nd = 1;
    while (cells.length % 7 !== 0) cells.push(_mkcellFromGreg(nextGy, nextGm, nd++, false, hijriAdjust));
    var weeks = [];
    for (var i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }
  function _mkcellFromGreg(gy, gm, gd, inMonth, hijriAdjust) {
    var j = toJalaali(gy, gm, gd);
    var h = gregToHijri(gy, gm, gd);
    if (hijriAdjust) h = adjustHijri(h.hy, h.hm, h.hd, hijriAdjust);
    var wd = jsDayToSatFirst(new Date(gy, gm - 1, gd).getDay());
    return { jy: j.jy, jm: j.jm, jd: j.jd, greg: { gy: gy, gm: gm, gd: gd }, hijri: h, weekdaySatFirst: wd, inMonth: inMonth };
  }

  // Build a Hijri month grid (weeks). Cells carry same shape.
  function buildHijriMonthGrid(hy, hm, hijriAdjust) {
    var cells = [];
    var firstG = hijriToGreg(hy, hm, 1);
    var firstSatFirst = jsDayToSatFirst(new Date(firstG.gy, firstG.gm - 1, firstG.gd).getDay());
    var mLen = hijriMonthLength(hy, hm);
    var prevHy = (hm === 1) ? hy - 1 : hy;
    var prevHm = (hm === 1) ? 12 : hm - 1;
    var prevLen = hijriMonthLength(prevHy, prevHm);
    for (var p = 0; p < firstSatFirst; p++) {
      var pd = prevLen - (firstSatFirst - 1 - p);
      cells.push(_mkcellFromHijri(prevHy, prevHm, pd, false, hijriAdjust));
    }
    for (var d = 1; d <= mLen; d++) cells.push(_mkcellFromHijri(hy, hm, d, true, hijriAdjust));
    var nextHy = (hm === 12) ? hy + 1 : hy;
    var nextHm = (hm === 12) ? 1 : hm + 1;
    var nd = 1;
    while (cells.length % 7 !== 0) cells.push(_mkcellFromHijri(nextHy, nextHm, nd++, false, hijriAdjust));
    var weeks = [];
    for (var i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }
  function _mkcellFromHijri(hy, hm, hd, inMonth, hijriAdjust) {
    var raw = { hy: hy, hm: hm, hd: hd };
    if (hijriAdjust) raw = adjustHijri(hy, hm, hd, hijriAdjust);
    var g = hijriToGreg(raw.hy, raw.hm, raw.hd);
    var j = toJalaali(g.gy, g.gm, g.gd);
    var wd = jsDayToSatFirst(new Date(g.gy, g.gm - 1, g.gd).getDay());
    return { jy: j.jy, jm: j.jm, jd: j.jd, greg: g, hijri: raw, weekdaySatFirst: wd, inMonth: inMonth };
  }

  var Cal = {
    toJalaali: toJalaali,
    toGregorian: toGregorian,
    isLeapJalali: isLeapJalali,
    jalaliMonthLength: jalaliMonthLength,
    jalCal: jalCal,
    g2d: g2d,
    d2g: d2g,
    j2d: j2d,
    d2j: d2j,
    gregToJDN: gregToJDN,
    jdnToGreg: jdnToGreg,
    hijriToJDN: hijriToJDN,
    jdnToHijri: jdnToHijri,
    gregToHijri: gregToHijri,
    hijriToGreg: hijriToGreg,
    isHijriLeapYear: isHijriLeapYear,
    hijriMonthLength: hijriMonthLength,
    adjustHijri: adjustHijri,
    dateToTriple: dateToTriple,
    buildJalaliMonthGrid: buildJalaliMonthGrid,
    buildGregorianMonthGrid: buildGregorianMonthGrid,
    buildHijriMonthGrid: buildHijriMonthGrid,
    jalaliDayOfYear: jalaliDayOfYear,
    jalaliSeason: jalaliSeason,
    daysBetweenG: daysBetweenG,
    fmtJalali: fmtJalali,
    fmtJalaliLong: fmtJalaliLong,
    fmtGregLong: fmtGregLong,
    fmtHijriLong: fmtHijriLong,
    toFaDigits: toFaDigits,
    toLatinDigits: toLatinDigits,
    JALALI_MONTHS: JALALI_MONTHS,
    GREGORIAN_MONTHS_FA: GREGORIAN_MONTHS_FA,
    HIJRI_MONTHS: HIJRI_MONTHS,
    WEEKDAYS_FA_SAT_FIRST: WEEKDAYS_FA_SAT_FIRST,
    SEASONS_FA: SEASONS_FA,
    jsDayToSatFirst: jsDayToSatFirst
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Cal;
  if (typeof window !== 'undefined') window.Cal = Cal;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

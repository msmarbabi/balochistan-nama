/* ============================================================
   Balochistan Nama — Ayat & Zekr of the Day (ayat.js) v1.16
   آیه روز + ذکر روز هفته
   منبع آیات: پروژه hedayat_media (github.com/amirhossinpython) —
   آیات کوتاه قرآن کریم با ترجمه فارسی، حقوق متعلق به قرآن کریم.
   ============================================================ */
(function (global) {
  'use strict';

  // ذکر روزهای هفته (سنتی)
  var WEEK_ZEKR = {
    6: 'یا ربّ العالمین',        // شنبه
    0: 'یا ذوالجلال و الاکرام',  // یکشنبه
    1: 'یا قاضی الحاجات',        // دوشنبه
    2: 'یا ارحم الراحمین',       // سه‌شنبه
    3: 'یا حیّ یا قیّوم',        // چهارشنبه
    4: 'یا غفّور یا رحیم',       // پنجشنبه
    5: 'یا الله یا رحمن'         // جمعه
  };
  var WEEK_LABEL = { 6: 'شنبه', 0: 'یکشنبه', 1: 'دوشنبه', 2: 'سه‌شنبه', 3: 'چهارشنبه', 4: 'پنجشنبه', 5: 'جمعه' };

  function esc(s) { return (global.BXUtils ? BXUtils.escapeHtml(String(s == null ? '' : s)) : String(s)); }
  function faNum(x) {
    return (global.BXUtils && BXUtils.toFaDigits) ? BXUtils.toFaDigits(x)
      : String(x).replace(/[0-9]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[+d]; });
  }

  function getZekrOfDay(dow) { return WEEK_ZEKR[dow] || ''; }

  function getAyatOfDay(doy) {
    var list = global.AyatDay || [];
    if (!list.length) return null;
    var idx = ((doy % list.length) + list.length) % list.length;
    return list[idx];
  }

  // رندر کارت آیه + ذکر روز — داخل عنصر داده‌شده
  function render(elOrId, doy, dow, mode) {
    var el = typeof elOrId === 'string' ? document.getElementById(elOrId) : elOrId;
    if (!el) return;
    var ayat = getAyatOfDay(doy);
    var zekr = getZekrOfDay(dow);
    var m = mode || 'both';
    var html = '';
    if ((m === 'both' || m === 'ayat') && ayat) {
      html +=
        '<div class="ayat-card">' +
          '<div class="ayat-card__badge">📖 آیه روز</div>' +
          '<div class="ayat-card__ar" dir="rtl">' + esc(ayat.t) + '</div>' +
          '<div class="ayat-card__tr">' + esc(ayat.tr) + '</div>' +
          '<div class="ayat-card__src">' + faNum(esc(ayat.s)) + '</div>' +
        '</div>';
    }
    if ((m === 'both' || m === 'zekr') && zekr) {
      html +=
        '<div class="ayat-card ayat-card--zekr">' +
          '<div class="ayat-card__badge">📿 ذکر روز ' + esc(WEEK_LABEL[dow] || '') + '</div>' +
          '<div class="ayat-card__ar ayat-card__ar--zekr">' + esc(zekr) + '</div>' +
        '</div>';
    }
    el.innerHTML = html;
  }

  var Ayat = { render: render, getAyatOfDay: getAyatOfDay, getZekrOfDay: getZekrOfDay };
  if (typeof window !== 'undefined') window.BXAyat = Ayat;
})(typeof window !== 'undefined' ? window : this);

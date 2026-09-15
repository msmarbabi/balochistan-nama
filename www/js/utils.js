/* ============================================================
   Balochistan Nama — utils.js (v1.13)
   توابع مشترک که قبلاً در ۴+ فایل کپی شده بودند — منبع واحد
   ============================================================ */
(function (global) {
  'use strict';

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  function toFaDigits(n) { return String(n).replace(/[0-9]/g, function (d) { return FA_DIGITS[+d]; }); }
  function toEnDigits(s) { return String(s || '').replace(/[۰-۹]/g, function (c) { return String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)); }); }

  // لود تنبل اسکریپت — یک بار برای هر src
  var _loaded = {};
  function loadScript(src, cb) {
    if (_loaded[src] === 'ok') { if (cb) cb(); return; }
    var prev = document.querySelector('script[data-utils-src="' + src + '"]');
    if (prev) { if (cb) prev.addEventListener('load', function () { cb(); }); return; }
    var s = document.createElement('script');
    s.src = src;
    s.setAttribute('data-utils-src', src);
    s.onload = function () { _loaded[src] = 'ok'; if (cb) cb(); };
    s.onerror = function () { _loaded[src] = 'err'; };
    document.head.appendChild(s);
  }

  // v1.16: جستجوی رتبه‌دار — کلمات کلیدی OR، امتیاز تطابق، مرتب‌سازی
  // opts: { fields: [fn(item)->text, ...], limit } — فیلد اول (سؤال) ۳ برابر وزن دارد
  function rankSearch(items, query, opts) {
    opts = opts || {};
    var words = String(query || '').trim().toLowerCase().split(/\s+/).filter(function (w) { return w.length >= 2; });
    if (!words.length) return (opts.limit ? items.slice(0, opts.limit) : items);
    var fields = opts.fields || [function (x) { return String(x); }];
    var scored = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i], s = 0;
      for (var w = 0; w < words.length; w++) {
        for (var f = 0; f < fields.length; f++) {
          var val = '';
          try { val = String(fields[f](it) || '').toLowerCase(); } catch (e) { continue; }
          if (val.indexOf(words[w]) >= 0) s += (f === 0 ? 3 : 1);
        }
      }
      if (s > 0) scored.push({ it: it, s: s });
    }
    scored.sort(function (a, b) { return b.s - a.s; });
    var out = [];
    for (var k = 0; k < scored.length; k++) out.push(scored[k].it);
    return opts.limit ? out.slice(0, opts.limit) : out;
  }

  // debounce سبک
  function debounce(fn, ms) {
    var t = null;
    return function () {
      var self = this, args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms || 200);
    };
  }

  var Utils = {
    escapeHtml: escapeHtml,
    toFaDigits: toFaDigits,
    toEnDigits: toEnDigits,
    rankSearch: rankSearch,
    loadScript: loadScript,
    debounce: debounce
  };
  global.BXUtils = Utils;
})(typeof window !== 'undefined' ? window : this);

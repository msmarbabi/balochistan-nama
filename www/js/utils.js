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
    loadScript: loadScript,
    debounce: debounce
  };
  global.BXUtils = Utils;
})(typeof window !== 'undefined' ? window : this);

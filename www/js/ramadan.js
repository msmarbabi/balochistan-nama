// Ramadan detection + banner
(function (global) {
  'use strict';
  // Reference: 1 Muharram 1446 = 2024-07-07 (approx)
  var REF = new Date(2024, 6, 7);
  function lunarMonthIndex() {
    var now = new Date();
    var days = (now.getTime() - REF.getTime()) / 86400000;
    var m = Math.floor(days / 29.53);
    return ((m % 12) + 12) % 12; // 0 = Muharram ... 8 = Ramadan
  }
  function isRamadan() {
    return lunarMonthIndex() === 8;
  }
  function ramadanDay() {
    var now = new Date();
    var days = (now.getTime() - REF.getTime()) / 86400000;
    var m = Math.floor(days / 29.53);
    var startOfMonth = m * 29.53;
    var day = Math.floor(days - startOfMonth) + 1;
    return Math.max(1, Math.min(30, day));
  }
  function maybeShowBanner(elId) {
    var el = document.getElementById(elId);
    if (!el) return;
    var settings = (typeof App !== 'undefined' && App.getSettings) ? App.getSettings() : {};
    var force = settings.ramadanMode;
    if (!isRamadan() && !force) { el.style.display = 'none'; return; }
    var day = ramadanDay();
    el.style.display = 'block';
    el.innerHTML =
      '<div class="ramadan-banner">' +
        '🌙 ماه مبارک رمضان — روز ' + day + ' ' +
        '<span class="ramadan-banner__hint">اَللّهُمَّ بَلِّغْنَا رَمَضَان</span>' +
      '</div>';
  }
  var Ramadan = { isRamadan: isRamadan, ramadanDay: ramadanDay, maybeShowBanner: maybeShowBanner, lunarMonthIndex: lunarMonthIndex };
  if (typeof window !== 'undefined') window.Ramadan = Ramadan;
})(typeof window !== 'undefined' ? window : this);

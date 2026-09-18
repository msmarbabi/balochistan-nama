// js/season_fx.js — افکت ذرات فصلی + تنظیم بازتولید
(function (global) {
  'use strict';
  var settings = { enabled: true, deviceLevel: 'high', particleCount: 20 };

  function initSeasonFx() {
    var el = document.getElementById('seasonScene');
    if (!el) return;
    var s = settings.enabled;
    if (s) {
      var count = settings.particleCount;
      var html = '';
      for (var i = 0; i < count; i++) {
        html += '<span></span>';
      }
      el.innerHTML = html;
      el.style.display = 'block';
    } else {
      el.innerHTML = '';
      el.style.display = 'none';
    }
  }

  // تنظیم بازتولید بر اساس توان دستگاه
  function setDeviceLevel(level) {
    settings.deviceLevel = level;
    var counts = { low: 5, medium: 15, high: 30 };
    settings.particleCount = counts[level] || 20;
    initSeasonFx();
  }

  global.BXSeasonFx = {
    init: initSeasonFx,
    setEnabled: function (en) { settings.enabled = en; initSeasonFx(); },
    setDeviceLevel: setDeviceLevel
  };
})(typeof window !== 'undefined' ? window : this);

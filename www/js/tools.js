/* ============================================================
   Balochistan Nama - Tools module (tools.js)
   Stopwatch, countdown timer, share-date-as-image, city list.
   ============================================================ */

(function (global) {
  'use strict';

  // City list for Sistan & Baluchestan + major Iran cities
  var CITIES = [
    { name: 'ورکات، لاشار', lat: 26.84, lng: 60.17, province: 'سیستان و بلوچستان', county: 'لاشار', section: 'پیپ', elev: 775, tz: 'UTC+3:30' },
    { name: 'چابهار', lat: 25.29, lng: 60.64, province: 'سیستان و بلوچستان', county: 'چابهار', section: 'مرکزی', elev: 7, tz: 'UTC+3:30' },
    { name: 'ایرانشهر', lat: 27.20, lng: 60.70, province: 'سیستان و بلوچستان', county: 'ایرانشهر', section: 'مرکزی', elev: 564, tz: 'UTC+3:30' },
    { name: 'سراوان', lat: 27.38, lng: 62.33, province: 'سیستان و بلوچستان', county: 'سراوان', section: 'مرکزی', elev: 1195, tz: 'UTC+3:30' },
    { name: 'خاش', lat: 28.22, lng: 61.20, province: 'سیستان و بلوچستان', county: 'خاش', section: 'مرکزی', elev: 1400, tz: 'UTC+3:30' },
    { name: 'زاهدان', lat: 29.50, lng: 60.86, province: 'سیستان و بلوچستان', county: 'زاهدان', section: 'مرکزی', elev: 1380, tz: 'UTC+3:30' },
    { name: 'زابل', lat: 31.03, lng: 61.49, province: 'سیستان و بلوچستان', county: 'زابل', section: 'مرکزی', elev: 483, tz: 'UTC+3:30' },
    { name: 'کنارک', lat: 25.40, lng: 60.37, province: 'سیستان و بلوچستان', county: 'کنارک', section: 'مرکزی', elev: 8, tz: 'UTC+3:30' },
    { name: 'نیک‌شهر', lat: 26.21, lng: 60.22, province: 'سیستان و بلوچستان', county: 'نیک‌شهر', section: 'مرکزی', elev: 475, tz: 'UTC+3:30' },
    { name: 'بمپور', lat: 27.17, lng: 60.47, province: 'سیستان و بلوچستان', county: 'بمپور', section: 'مرکزی', elev: 550, tz: 'UTC+3:30' },
    { name: 'دلگان', lat: 27.57, lng: 59.70, province: 'سیستان و بلوچستان', county: 'دلگان', section: 'مرکزی', elev: 320, tz: 'UTC+3:30' },
    { name: 'راسک', lat: 26.00, lng: 61.50, province: 'سیستان و بلوچستان', county: 'راسک', section: 'مرکزی', elev: 400, tz: 'UTC+3:30' },
    { name: 'سرباز', lat: 26.50, lng: 62.10, province: 'سیستان و بلوچستان', county: 'سرباز', section: 'مرکزی', elev: 720, tz: 'UTC+3:30' },
    { name: 'میرجاوه', lat: 28.95, lng: 61.50, province: 'سیستان و بلوچستان', county: 'میرجاوه', section: 'مرکزی', elev: 920, tz: 'UTC+3:30' },
    { name: 'تهران', lat: 35.69, lng: 51.39, province: 'تهران', county: 'تهران', section: 'مرکزی', elev: 1200, tz: 'UTC+3:30' },
    { name: 'مشهد', lat: 36.29, lng: 59.61, province: 'خراسان رضوی', county: 'مشهد', section: 'مرکزی', elev: 995, tz: 'UTC+3:30' },
    { name: 'اصفهان', lat: 32.65, lng: 51.67, province: 'اصفهان', county: 'اصفهان', section: 'مرکزی', elev: 1570, tz: 'UTC+3:30' },
    { name: 'شیراز', lat: 29.59, lng: 52.58, province: 'فارس', county: 'شیراز', section: 'مرکزی', elev: 1500, tz: 'UTC+3:30' },
    { name: 'کرمان', lat: 30.28, lng: 57.07, province: 'کرمان', county: 'کرمان', section: 'مرکزی', elev: 1760, tz: 'UTC+3:30' },
    { name: 'بندرعباس', lat: 27.18, lng: 56.28, province: 'هرمزگان', county: 'بندرعباس', section: 'مرکزی', elev: 9, tz: 'UTC+3:30' }
  ];

  // ---------- Stopwatch ----------
  var swTimer = null, swStart = 0, swElapsed = 0, swLaps = [];

  function swFormat(ms) {
    var t = Math.floor(ms / 1000);
    var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60, cs = Math.floor((ms % 1000) / 10);
    var p = function (n) { return (n < 10 ? '0' + n : '' + n); };
    return (h > 0 ? p(h) + ':' : '') + p(m) + ':' + p(s) + '.' + p(cs);
  }
  function swRender() {
    var txt = swFormat(swElapsed + (swTimer ? Date.now() - swStart : 0));
    var el = document.getElementById('swDisplay');
    if (el) el.textContent = txt;
    var elM = document.getElementById('mSwDisplay');
    if (elM) elM.textContent = txt;
    var laps = document.getElementById('swLaps');
    var lapsM = document.getElementById('mSwLaps');
    var html = '';
    for (var i = 0; i < swLaps.length; i++) {
      html += '<div class="sw-lap">دور ' + (i + 1) + ': ' + swFormat(swLaps[i]) + '</div>';
    }
    if (laps) laps.innerHTML = html;
    if (lapsM) lapsM.innerHTML = html;
  }
  function swStartFn() {
    if (swTimer) return;
    swStart = Date.now();
    swTimer = setInterval(swRender, 33);
    swRender();
  }
  function swStopFn() {
    if (!swTimer) return;
    swElapsed += Date.now() - swStart;
    clearInterval(swTimer); swTimer = null; swRender();
  }
  function swLapFn() {
    if (!swTimer) return;
    swLaps.push(swElapsed + (Date.now() - swStart));
    swRender();
  }
  function swResetFn() {
    swStopFn();
    swElapsed = 0; swLaps = []; swRender();
  }

  // ---------- Countdown timer ----------
  var cdTimer = null, cdEnd = 0, cdRemaining = 0, cdRunning = false;
  function cdSetText(txt) {
    var el = document.getElementById('cdDisplay');
    if (el) el.textContent = txt;
    var elM = document.getElementById('mCdDisplay');
    if (elM) elM.textContent = txt;
  }
  function cdRender() {
    var left = cdEnd - Date.now();
    if (left <= 0) {
      cdSetText('00:00');
      clearInterval(cdTimer); cdTimer = null; cdRunning = false; cdRemaining = 0;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      if (typeof App !== 'undefined' && App.toast) App.toast('⏰ زمان به پایان رسید');
      return;
    }
    var t = Math.floor(left / 1000);
    var m = Math.floor(t / 60), s = t % 60;
    cdSetText((m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s));
  }
  function cdStart(min) {
    if (cdTimer) { clearInterval(cdTimer); cdTimer = null; }
    cdEnd = Date.now() + min * 60000;
    cdRemaining = min * 60000;
    cdRunning = true;
    cdTimer = setInterval(cdRender, 250);
    cdRender();
  }
  function cdPause() {
    if (!cdRunning) return;
    cdRemaining = cdEnd - Date.now();
    clearInterval(cdTimer); cdTimer = null; cdRunning = false;
    var t = Math.floor(cdRemaining / 1000);
    var m = Math.floor(t / 60), s = t % 60;
    cdSetText((m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s));
  }
  function cdReset() {
    clearInterval(cdTimer); cdTimer = null; cdRunning = false; cdRemaining = 0; cdEnd = 0;
    cdSetText('00:00');
  }

  // ---------- Share date as image ----------
  function shareDateCard() {
    var st = (typeof App !== 'undefined' && App.getState) ? App.getState() : null;
    if (!st || !st.triple) { if (App && App.toast) App.toast('در حال آماده‌سازی...'); return; }
    var t = st.triple;
    var fa = (App.getSettings && App.getSettings().faDigits);
    var num = function (s) { return fa ? (typeof Cal !== 'undefined' && Cal.toFaDigits ? Cal.toFaDigits(s) : s) : s; };
    var jalali = Cal.fmtJalaliLong(t.jalali);
    var greg = Cal.fmtGregLong(t.greg);
    var hijri = Cal.fmtHijriLong(t.hijri);
    var weekday = Cal.WEEKDAYS_FA_SAT_FIRST[t.weekdaySatFirst];

    var cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1350;
    var ctx = cv.getContext('2d');
    // background gradient
    var g = ctx.createLinearGradient(0, 0, 1080, 1350);
    g.addColorStop(0, '#1b2540'); g.addColorStop(0.5, '#3a2a5a'); g.addColorStop(1, '#0b0e14');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1350);
    // accent bar
    ctx.fillStyle = '#d4a73c'; ctx.fillRect(0, 0, 1080, 14);
    ctx.textAlign = 'center';
    // app name
    ctx.fillStyle = '#d4a73c'; ctx.font = 'bold 52px sans-serif';
    ctx.fillText('بلوچستان نما', 540, 130);
    ctx.fillStyle = '#b6bdc9'; ctx.font = '34px sans-serif';
    ctx.fillText(weekday, 540, 200);
    // jalali big
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 96px sans-serif';
    ctx.fillText(num(jalali), 540, 420);
    // gregorian
    ctx.fillStyle = '#f1f3f6'; ctx.font = '44px sans-serif';
    ctx.fillText(num(greg), 540, 520);
    // hijri
    ctx.fillStyle = '#ffd9a3'; ctx.font = '40px sans-serif';
    ctx.fillText(num(hijri), 540, 600);
    // footer
    var loc = (App.getSettings && App.getSettings().locName) || 'بلوچستان';
    ctx.fillStyle = '#6a7283'; ctx.font = '32px sans-serif';
    ctx.fillText('📍 ' + loc, 540, 1240);
    ctx.fillText('🌄 دنیای میثم — هرمی خدا، میثم بندهٔ خدا', 540, 1300);

    cv.toBlob(function (blob) {
      if (!blob) { if (App && App.toast) App.toast('خطا در ساخت تصویر'); return; }
      var file = new File([blob], 'balochistan-nama-date.png', { type: 'image/png' });
      var url = URL.createObjectURL(blob);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'بلوچستان نما', text: num(jalali) }).catch(function () {});
      } else {
        var a = document.createElement('a');
        a.href = url; a.download = 'balochistan-nama-date.png';
        document.body.appendChild(a); a.click(); a.remove();
        if (App && App.toast) App.toast('تصویر ذخیره شد ✓');
      }
    }, 'image/png');
  }

  var Tools = {
    CITIES: CITIES,
    renderStopwatch: function () { swRender(); },
    stopwatchStart: swStartFn, stopwatchStop: swStopFn, stopwatchLap: swLapFn, stopwatchReset: swResetFn,
    timerStart: cdStart, timerPause: cdPause, timerReset: cdReset,
    shareDateCard: shareDateCard
  };
  if (typeof window !== 'undefined') window.Tools = Tools;
})(typeof window !== 'undefined' ? window : this);

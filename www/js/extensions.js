/* ============================================================
   Balochistan Nama - Extensions wiring (extensions.js)
   Connects new modules (Tasbeeh, Tools, Notify, I18n) to the UI.
   Loaded AFTER app.js; uses only public App API + globals.
   ============================================================ */

(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function on(id, ev, fn) { var e = $(id); if (e) e.addEventListener(ev, fn); }

  function init() {
    // ---------- Tasbeeh nav ----------
    var tbNav = document.querySelector('.nav-item[data-route="tasbeeh"]');
    if (tbNav) tbNav.addEventListener('click', function () { if (window.Tasbeeh) Tasbeeh.render(); });

    // ---------- i18n apply ----------
    if (window.I18n) I18n.apply();

    // ---------- Tools modal ----------
    var qa = document.querySelector('.quick-action[data-action="tools"]');
    if (qa) qa.addEventListener('click', openTools);
    on('toolsClose', 'click', closeTools);
    // Home card stopwatch
    on('swStart', 'click', function () { if (window.Tools) { Tools.stopwatchStart(); setSw(false); } });
    on('swStop', 'click', function () { if (window.Tools) { Tools.stopwatchStop(); setSw(true); } });
    on('swLap', 'click', function () { if (window.Tools) Tools.stopwatchLap(); });
    on('swReset', 'click', function () { if (window.Tools) { Tools.stopwatchReset(); setSw(true); } });
    // Modal stopwatch (unique ids mSw*)
    on('mSwStart', 'click', function () { if (window.Tools) Tools.stopwatchStart(); });
    on('mSwStop', 'click', function () { if (window.Tools) Tools.stopwatchStop(); });
    on('mSwLap', 'click', function () { if (window.Tools) Tools.stopwatchLap(); });
    on('mSwReset', 'click', function () { if (window.Tools) Tools.stopwatchReset(); });
    // Modal timer presets (unique ids mCd*)
    ['1', '5', '10', '15', '30', '60'].forEach(function (m) {
      var b = $('mCd' + m);
      if (b) b.addEventListener('click', function () { if (window.Tools) { Tools.timerStart(parseInt(m, 10)); if (App) App.toast('تایمر ' + m + ' دقیقه‌ای تنظیم شد'); } });
    });
    // Modal custom timer
    on('mCdCustom', 'click', function () {
      var v = parseInt($('mCdCustomMin').value, 10);
      if (v > 0 && window.Tools) { Tools.timerStart(v); if (App) App.toast('تایمر ' + v + ' دقیقه‌ای تنظیم شد'); }
    });
    on('shareDate', 'click', function () { if (window.Tools) Tools.shareDateCard(); });

    // ---------- Notes export / import ----------
    on('noteExport', 'click', exportNotes);
    on('noteImport', 'click', function () { var f = $('noteImportFile'); if (f) f.click(); });
    on('noteImportFile', 'change', importNotes);

    // ---------- City selection (settings) ----------
    var citySel = $('weatherCity');
    if (citySel && window.Tools) {
      citySel.innerHTML = '';
      for (var i = 0; i < Tools.CITIES.length; i++) {
        var c = Tools.CITIES[i];
        var o = document.createElement('option');
        o.value = i; o.textContent = c.name;
        citySel.appendChild(o);
      }
      // set current
      var setCityFromSettings = function () {
        var s = (window.App && App.getSettings) ? App.getSettings() : {};
        for (var j = 0; j < Tools.CITIES.length; j++) {
          if (Tools.CITIES[j].name === s.locName) { citySel.value = j; break; }
        }
      };
      // sync when settings opens
      var btnSettings = $('btnSettings');
      if (btnSettings) btnSettings.addEventListener('click', function () { setTimeout(setCityFromSettings, 0); });
      citySel.addEventListener('change', function () {
        var c = Tools.CITIES[parseInt(citySel.value, 10)];
        if (!c) return;
        var s = (window.App && App.getSettings) ? App.getSettings() : {};
        s.lat = c.lat; s.lng = c.lng; s.locName = c.name;
        if (window.App && App.saveSettings) App.saveSettings();
        if (window.Weather) Weather.load();
        if (window.Notify) Notify.reschedule();
        updateLocationCard();
        if (App) App.toast('موقعیت: ' + c.name);
      });
      // update location card when weather page opens
      var goWeather = function () { setTimeout(updateLocationCard, 0); };
      var btnW = document.querySelector('.nav-item[data-route="weather"]');
      if (btnW) btnW.addEventListener('click', goWeather);
    }

    // ---------- Language selection (settings) ----------
    var langSel = $('setLang');
    if (langSel && window.I18n) {
      langSel.value = I18n.getLang();
      langSel.addEventListener('change', function () {
        I18n.setLang(langSel.value);
        if (App) App.toast('زبان تغییر کرد');
      });
    }

    // ---------- GPS auto-location ----------
    var gpsBtn = $('weatherGps');
    if (gpsBtn) gpsBtn.addEventListener('click', function () {
      if (!navigator.geolocation) { if (App) App.toast('موقعیت‌یاب در دسترس نیست'); return; }
      gpsBtn.textContent = '⏳';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var s = (window.App && App.getSettings) ? App.getSettings() : {};
        s.lat = pos.coords.latitude; s.lng = pos.coords.longitude; s.locName = 'موقعیت فعلی';
        if (window.App && App.saveSettings) App.saveSettings();
        if (window.Weather) Weather.load();
        if (window.Notify) Notify.reschedule();
        var wc = $('weatherCity'); if (wc) for (var wi = 0; wi < Tools.CITIES.length; wi++) if (Tools.CITIES[wi].name === 'موقعیت فعلی') wc.value = wi;
        updateLocationCard();
        gpsBtn.textContent = '📍';
        if (App) App.toast('موقعیت فعلی تنظیم شد ✓');
      }, function () {
        gpsBtn.textContent = '📍';
        if (App) App.toast('دسترسی موقعیت رد شد');
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });

    // ---------- Calendar toolbar (converter / share / search) ----------
    var calConv = $('calConverter');
    if (calConv) calConv.addEventListener('click', function () { if (window.App && App.openConverter) App.openConverter(true); });
    var calSh = $('calShare');
    if (calSh) calSh.addEventListener('click', function () { if (window.Tools) Tools.shareDateCard(); });
    var calSrch = $('calSearch');
    if (calSrch) calSrch.addEventListener('input', function () { if (window.App && App.searchDayEvents) App.searchDayEvents(calSrch.value); });
    // Search button: find matching event anywhere in the year and jump to it
    var calSrchBtn = $('calSearchBtn');
    if (calSrchBtn) calSrchBtn.addEventListener('click', function () {
      if (window.App && App.searchAllEvents) App.searchAllEvents(calSrch ? calSrch.value : '');
    });

    // ---------- Notifications: reschedule on settings close ----------
    on('setConfirm', 'click', function () { if (window.Notify) setTimeout(function () { Notify.reschedule(); }, 50); });

    // ---------- Personal events modal ----------
    on('notePersonalBtn', 'click', function () { if (window.PersonalEvents) PersonalEvents.openModal(); });
    on('peClose', 'click', function () { if (window.PersonalEvents) PersonalEvents.closeModal(); });
    on('peAdd', 'click', function () { if (window.PersonalEvents) PersonalEvents.addNew(); });

    // ---------- Add selected calendar day to phone calendar ----------
    on('calAddToCalendar', 'click', function () {
      var st = (window.App && App.getState) ? App.getState() : null;
      if (!st || !st.calSelected) { if (App && App.toast) App.toast('ابتدا یک روز را در تقویم انتخاب کنید'); return; }
      var cell = st.calSelected;
      var jy = cell.jalali ? cell.jalali.jy : cell.jy;
      var jm = cell.jalali ? cell.jalali.jm : cell.jm;
      var jd = cell.jalali ? cell.jalali.jd : cell.jd;
      if (!window.Cal || !Cal.toGregorian) { if (App && App.toast) App.toast('خطا در تبدیل تاریخ'); return; }
      try {
        var g = Cal.toGregorian(jy, jm, jd);
        var start = new Date(g.gy, g.gm - 1, g.gd, 0, 0, 0).getTime();
        var end = start + 24 * 3600 * 1000;
        var title = (window.App && App.getSettings && App.getSettings().locName) || 'بلوچستان نما';
        var evs = [];
        if (typeof Events !== 'undefined' && Events.getDayEvents && st.triple) {
          var hh = cell.hijri || (cell.jalali ? cell.jalali.hijri : null);
          evs = Events.getDayEvents({ jm: jm, jd: jd }, g, hh, { isFriday: false });
        }
        var desc = evs.slice(0, 5).map(function (e) { return e.title; }).join('، ');
        var fullTitle = (desc ? desc : 'رویداد') + ' — ' + jy + '/' + jm + '/' + jd;
        if (typeof NativeApp !== 'undefined' && NativeApp.addCalendarEvent) {
          NativeApp.addCalendarEvent(fullTitle, 'از بلوچستان نما', start, end);
          if (App && App.toast) App.toast('تقویم گوشی باز شد — ذخیره کنید');
        } else {
          if (App && App.toast) App.toast('روی گوشی، تقویم از این دکمه باز می‌شود');
        }
      } catch (e) {
        if (App && App.toast) App.toast('خطا در افزودن به تقویم');
      }
    });
  on('calShareDay', 'click', function () {
    var d = App.state.selDate;
    if (!d) { App.toast('روزی انتخاب نشده'); return; }
    var g = Cal.toGregorian(d.jy, d.jm, d.jd);
    var h = Cal.gregToHijri(g.gy, g.gm, g.gd, App.state.hijriAdjust || 0);
    var evs = Events.getDayEvents(d, g, h, {});
    var jf = App.jalaliFormat ? App.jalaliFormat(d) : (d.jy + '/' + d.jm + '/' + d.jd);
    var txt = '📅 ' + jf + ' (' + g.gy + '/' + g.gm + '/' + g.gd + ' — قمری ' + h.hy + '/' + h.hm + '/' + h.hd + ')';
    if (evs.length) {
      txt += '\n\n';
      for (var i = 0; i < evs.length; i++) txt += '• ' + evs[i].title + '\n';
    } else {
      txt += '\nمناسبت خاصی ثبت نشده';
    }
    txt += '\n— ارسال از بلوچستان‌نما';
    if (window.NativeApp && NativeApp.shareText) NativeApp.shareText(txt, 'مناسبت بلوچستان‌نما');
    else App.toast('اشتراک در وب پشتیبانی نمی‌شود');
  });

  on('calExportICS', 'click', function () {
    var d = App.state.selDate;
    if (!d) { App.toast('روزی انتخاب نشده'); return; }
    if (window.ICS) ICS.exportDay(d.jy, d.jm, d.jd);
  });

  on('calExportYearICS', 'click', function () {
    if (window.ICS) ICS.exportYear();
  });


    // ---------- Initial schedule (after App is ready) ----------
    if (window.Notify) setTimeout(function () { Notify.reschedule(); }, 800);
    // Sync location card with saved city on load
    setTimeout(updateLocationCard, 300);
  }

  function openTools() {
    var m = $('modalTools'); if (!m) return;
    m.classList.add('show');
    if (window.Tools) Tools.renderStopwatch();
    var d = $('mCdDisplay'); if (d) d.textContent = '00:00';
  }
  function closeTools() { var m = $('modalTools'); if (m) m.classList.remove('show'); }
  function setSw(reset) {
    var s = $('swStart'), st = $('swStop');
    if (s) s.disabled = !reset;      // start enabled only when stopped
    if (st) st.disabled = reset;     // stop enabled only when running
  }

  // Update the location card (weather page) + weather loc labels from settings
  function updateLocationCard() {
    var s = (window.App && App.getSettings) ? App.getSettings() : {};
    var city = null;
    if (window.Tools && Tools.CITIES) {
      for (var i = 0; i < Tools.CITIES.length; i++) {
        if (Tools.CITIES[i].name === s.locName) { city = Tools.CITIES[i]; break; }
      }
    }
    var name = s.locName || 'موقعیت فعلی';
    var lat = s.lat, lng = s.lng;
    // Name / title
    var elName = $('locName'); if (elName) elName.textContent = name;
    var wnL = $('wnLoc'); if (wnL) wnL.textContent = name;
    var wnL2 = $('wnLoc2'); if (wnL2) wnL2.textContent = name;
    var t1 = $('wnTitle'); if (t1) t1.textContent = '🌤️ آب‌وهوای ' + name;
    var t2 = $('wnTitle2'); if (t2) t2.textContent = '🌤️ آب‌وهوای ' + name;
    // County / section
    var elCounty = $('locCounty');
    if (elCounty) {
      if (city && city.county) elCounty.textContent = (city.section ? 'بخش ' + city.section + '، ' : '') + 'شهرستان ' + city.county;
      else elCounty.textContent = (name === 'موقعیت فعلی') ? 'موقعیت فعلی' : '';
    }
    // Province
    var elProv = $('locProvince');
    if (elProv) elProv.textContent = (city && city.province) ? 'استان ' + city.province + '، ایران' : 'ایران';
    // Coordinates
    var elCoords = $('locCoords');
    if (elCoords && typeof lat === 'number' && typeof lng === 'number') {
      elCoords.textContent = 'مختصات: ' + Math.abs(lat).toFixed(2) + '° ' + (lat >= 0 ? 'شمالی' : 'جنوبی') + '، ' + Math.abs(lng).toFixed(2) + '° ' + (lng >= 0 ? 'شرقی' : 'غربی');
    } else if (elCoords) elCoords.textContent = '';
    // Elevation
    var elElev = $('locElev');
    if (elElev) elElev.textContent = (city && city.elev) ? 'ارتفاع: ~' + city.elev + ' متر از سطح دریا' : '';
    // Timezone
    var elTz = $('locTz');
    if (elTz) elTz.textContent = (city && city.tz) ? 'منطقه زمانی: ایران (' + city.tz + ')' : '';
  }
  if (typeof window !== 'undefined') window.updateLocationCard = updateLocationCard;

  function exportNotes() {
    var notes = (window.Notes) ? Notes.getAll() : [];
    var data = {
      type: 'balochistan-nama-backup', version: 1,
      exportedAt: new Date().toISOString(),
      notes: notes,
      settings: (window.App && App.getSettings) ? App.getSettings() : {}
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'balochistan-nama-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    if (App) App.toast('بکاپ ذخیره شد ✓');
  }

  function importNotes(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (data.notes && Array.isArray(data.notes)) {
          // assign fresh ids to avoid clashes
          data.notes.forEach(function (n) { n.id = Date.now() + Math.floor(Math.random() * 1000); });
          localStorage.setItem('blx_nama_notes', JSON.stringify(data.notes));
          if (window.Notes) Notes.renderList('noteListModal');
          if (App) App.toast('یادداشت‌ها بازیابی شد ✓ (' + data.notes.length + ')');
        } else {
          if (App) App.toast('فایل بکاپ نامعتبر است');
        }
      } catch (err) {
        if (App) App.toast('خطا در خواندن فایل');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

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
    on('swStart', 'click', function () { if (window.Tools) { Tools.stopwatchStart(); setSw(false); } });
    on('swStop', 'click', function () { if (window.Tools) { Tools.stopwatchStop(); setSw(true); } });
    on('swLap', 'click', function () { if (window.Tools) Tools.stopwatchLap(); });
    on('swReset', 'click', function () { if (window.Tools) { Tools.stopwatchReset(); setSw(true); } });
    ['1', '5', '10', '15', '30', '60'].forEach(function (m) {
      var b = $('cd' + m);
      if (b) b.addEventListener('click', function () { if (window.Tools) { Tools.timerStart(parseInt(m, 10)); if (App) App.toast('تایمر ' + m + ' دقیقه‌ای تنظیم شد'); } });
    });
    on('cdCustom', 'click', function () {
      var v = parseInt($('cdCustomMin').value, 10);
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
        if (App) App.toast('موقعیت: ' + c.name);
      });
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
        gpsBtn.textContent = '📍';
        if (App) App.toast('موقعیت فعلی تنظیم شد ✓');
      }, function () {
        gpsBtn.textContent = '📍';
        if (App) App.toast('دسترسی موقعیت رد شد');
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    });

    // ---------- Calendar toolbar (converter / share / search) ----------
    var calConv = $('calConverter');
    if (calConv) calConv.addEventListener('click', function () { var m = $('modalConverter'); if (m) m.classList.add('show'); });
    var calSh = $('calShare');
    if (calSh) calSh.addEventListener('click', function () { if (window.Tools) Tools.shareDateCard(); });
    var calSrch = $('calSearch');
    if (calSrch) calSrch.addEventListener('input', function () { if (window.App && App.searchDayEvents) App.searchDayEvents(calSrch.value); });

    // ---------- Notifications: reschedule on settings close ----------
    on('setConfirm', 'click', function () { if (window.Notify) setTimeout(function () { Notify.reschedule(); }, 50); });

    // ---------- Initial schedule (after App is ready) ----------
    if (window.Notify) setTimeout(function () { Notify.reschedule(); }, 800);
  }

  function openTools() {
    var m = $('modalTools'); if (!m) return;
    m.classList.add('show');
    if (window.Tools) Tools.renderStopwatch();
    var d = $('cdDisplay'); if (d) d.textContent = '00:00';
  }
  function closeTools() { var m = $('modalTools'); if (m) m.classList.remove('show'); }
  function setSw(reset) {
    var s = $('swStart'), st = $('swStop');
    if (s) s.disabled = !reset;      // start enabled only when stopped
    if (st) st.disabled = reset;     // stop enabled only when running
  }

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

/* ============================================================
   Balochistan Nama - Main app controller (app.js)
   Routing, theming (seasonal + monthly), dashboard rendering,
   calendar grid, prayer page, culture page.
   ============================================================ */

(function (global) {
  'use strict';

  // ---------- Settings ----------
  var DEFAULT_SETTINGS = {
    theme: 'auto',
    method: 'karachi',
    hijriAdjust: 0,
    notifyPrayer: true,
    notifyEvents: true,
    notifyNotes: true,
    faDigits: true,
    seasonFx: true,
    fontScale: 1,
    stickyPrayer: true,
    prayerAdj: 0,
    prayerAdjAll: 0,
    prayerAdjSingle: { prayer: 'fajr', adj: 0 },
    prayerAdjCustom: '',
    asrMode: 'method',
    dst: false,
    ramadanMode: false,
    autoNight: false,
    athanSound: true,
    showSystemRingtones: false,
    lat: 26.84,
    lng: 60.17,
    locName: 'ورکات، بخش پیپ، شهرستان لاشار'
  };
  var settings = loadSettings();
  function loadSettings() {
    try {
      var s = JSON.parse(localStorage.getItem('blx_nama_settings') || '{}');
      return Object.assign({}, DEFAULT_SETTINGS, s);
    } catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
  }
  function saveSettings() { localStorage.setItem('blx_nama_settings', JSON.stringify(settings)); }

  // ---------- State ----------
  var state = {
    today: new Date(),
    triple: null,
    calCursor: null,  // {jy, jm} - month being viewed in calendar
    route: 'home',
    prayerTimes: null
  };

  // ---------- Toast ----------
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2400);
  }

  // ---------- Theme application ----------
  function applyTheme() {
    var html = document.documentElement;
    var t = settings.theme;
    if (t === 'auto') {
      // Auto: based on current time
      var hr = state.today.getHours();
      t = (hr >= 6 && hr < 18) ? 'light' : 'dark';
    }
    html.setAttribute('data-theme', t);
    html.setAttribute('data-season', currentSeason());
    html.setAttribute('data-month', state.triple ? state.triple.jalali.jm : 6);
  }

  // Auto night mode based on sunrise/sunset (prayer times)
  function applyAutoNight() {
    if (!settings.autoNight) return;
    try {
      var tz = (new Date().getTimezoneOffset() / -60) + (settings.dst ? 1 : 0);
      var method = settings.prayerMethod || 14;
      var times = Prayer.computeLocal(state.today, settings.lat, settings.lng, method, tz);
      var now = state.today.getHours() + state.today.getMinutes() / 60;
      var fajr = ((times.fajr % 24) + 24) % 24;
      var maghrib = ((times.maghrib % 24) + 24) % 24;
      var isNight = now < fajr || now >= maghrib;
      settings.theme = isNight ? 'dark' : 'light';
      applyTheme();
    } catch (e) {}
  }

    // Update status bar color via native bridge
    if (typeof NativeApp !== 'undefined' && NativeApp.setStatusBar) {
      NativeApp.setStatusBar(t === 'dark' ? '#0b0e14' : '#fbfaf6');
    }
    // Update meta theme-color
    var mt = document.querySelector('meta[name=theme-color]');
    if (mt) mt.setAttribute('content', t === 'dark' ? '#0b0e14' : '#fbfaf6');

    // Update season scene
    renderSeasonScene();
    applyFontScale();
    applySticky();
  }

  function currentSeason() {
    var jm = state.triple ? state.triple.jalali.jm : 6;
    if (jm <= 3) return 'spring';
    if (jm <= 6) return 'summer';
    if (jm <= 9) return 'autumn';
    return 'winter';
  }

  function renderSeasonScene() {
    var el = document.getElementById('seasonScene');
    if (!el) return;
    el.innerHTML = '';
    if (!settings.seasonFx) return;
    var season = currentSeason();
    var symbols = {
      spring: ['🌸', '🌼', '🌷', '🌹'],
      summer: ['☀️', '✨', '🌞'],
      autumn: ['🍂', '🍁'],
      winter: ['❄️', '⛄']
    };
    var arr = symbols[season] || ['✨'];
    var count = season === 'winter' ? 24 : 16;
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      s.textContent = arr[Math.floor(Math.random() * arr.length)];
      s.style.left = (Math.random() * 100) + '%';
      s.style.animationDelay = (Math.random() * 6) + 's';
      s.style.animationDuration = (4 + Math.random() * 8) + 's';
      el.appendChild(s);
    }
  }

  // ---------- Routing ----------
  function go(route) {
    state.route = route;
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('active', v.dataset.route === route);
    });
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.classList.toggle('active', n.dataset.route === route);
    });
    // Lazy-load view content
    if (route === 'calendar') renderCalendar();
    if (route === 'prayer') renderPrayer();
    if (route === 'prayer') { Compass && Compass.start(); Compass && Compass.setQibla(Prayer.qiblaBearing(settings.lat, settings.lng)); }
    if (route !== 'prayer' && Compass && Compass.stop) Compass.stop();
    if (route === 'weather') { Weather.load(); if (window.Compass) Compass.start(); wireCompassCalib(); }
    if (route === 'culture') renderCulture();
    if (route === 'notes') { Notes.init(); }
    // Scroll content to top
    var content = document.getElementById('content');
    if (content) content.scrollTop = 0;
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    var t = state.triple;
    if (!t) return;

    // Hero date
    var weekdayName = Cal.WEEKDAYS_FA_SAT_FIRST[t.weekdaySatFirst];
    setText('heroWeekday', weekdayName);
    setText('heroDate', Cal.fmtJalaliLong(t.jalali));
    setText('heroGreg', Cal.fmtGregLong(t.greg));
    var hAdjusted = Prayer && Prayer.adjustHijri ? null : null;
    var h = t.hijri;
    if (settings.hijriAdjust && settings.hijriAdjust !== 0) {
      h = { hy: t.hijri.hy, hm: t.hijri.hm, hd: t.hijri.hd };
      var adj = Cal.adjustHijri(h.hy, h.hm, h.hd, settings.hijriAdjust);
      h = adj;
    }
    setText('heroHijri', 'هجری قمری: ' + Cal.fmtHijriLong(h));
    setText('clockSeason', Cal.SEASONS_FA[Cal.jalaliSeason(t.jalali.jm) - 1]);

    // Moon phase
    var moon = Prayer.moonPhase(state.today);
    var moonName = Prayer.moonPhaseName(moon);
    var visual = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'][Math.round(moon * 7)];
    setText('moonVisual', visual);
    setText('moonName', moonName);
    setText('moonIllum', Math.round((moon < 0.5 ? moon * 2 : (1 - moon) * 2) * 100) + '% روشنایی');

    // Verse of the day
    var dayOfYear = Cal.jalaliDayOfYear(t.jalali);
    var v = Baloch.verseOfDay(dayOfYear);
    setText('versePoet', v.poetFull);
    var linesHtml = '';
    for (var i = 0; i < v.lines.length; i++) {
      linesHtml += '<div>' + v.lines[i].balochi + '</div>';
    }
    setHtml('verseLines', linesHtml);
    var faHtml = '';
    for (var j = 0; j < v.lines.length; j++) {
      faHtml += '<div>' + v.lines[j].fa + '</div>';
    }
    setHtml('verseFa', faHtml);

    // Today's events
    renderDayEvents(t, 'todayEvents');

    // Compute prayer times for today (for next-prayer widget)
    computeAndRenderPrayer();
    // Load weather
    Weather.load();
  }

  function renderDayEvents(triple, elId, q) {
    var el = document.getElementById(elId);
    if (!el) return;
    var h = triple.hijri;
    if (settings.hijriAdjust && settings.hijriAdjust !== 0) {
      h = Cal.adjustHijri(h.hy, h.hm, h.hd, settings.hijriAdjust);
    }
    var events = Events.getDayEvents(triple.jalali, triple.greg, h, {
      isFriday: triple.weekdaySatFirst === 6
    });
    if (q) {
      var ql = String(q).trim().toLowerCase();
      if (ql) events = events.filter(function (e) { return (e.title || '').toLowerCase().indexOf(ql) >= 0; });
    }
    if (events.length === 0) {
      el.innerHTML = '<div class="text-muted text-small text-center" style="padding:10px;">مناسبتی برای امروز ثبت نشده</div>';
      return;
    }
    el.innerHTML = '';
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      var div = document.createElement('div');
      var cls = 'day-events__item';
      if (e.type === 'holiday') cls += ' holiday';
      if (e.tags.sunni) cls += ' sunni';
      if (e.tags.shia) cls += ' shia';
      if (e.tags.baloch) cls += ' baloch';
      div.className = cls;
      var tagsHtml = '';
      if (e.type === 'holiday') tagsHtml += '<span class="ev-tag">تعطیل</span>';
      if (e.tags.official) tagsHtml += '<span class="ev-tag">رسمی ایران</span>';
      if (e.tags.sunni) tagsHtml += '<span class="ev-tag">اهل سنت</span>';
      if (e.tags.shia) tagsHtml += '<span class="ev-tag">شیعه</span>';
      if (e.tags.baloch) tagsHtml += '<span class="ev-tag">بلوچ</span>';
      if (e.tags.international) tagsHtml += '<span class="ev-tag">جهانی</span>';
      if (e.tags.fast) tagsHtml += '<span class="ev-tag">روزه مستحب</span>';
      div.innerHTML =
        '<div class="ev-title">' + tagsHtml + escapeHtml(e.title) + '</div>' +
        (e.desc ? '<div class="ev-desc">' + escapeHtml(e.desc) + '</div>' : '');
      el.appendChild(div);
    }
  }

  // ---------- Calendar view ----------
  function renderCalendar() {
    if (!state.calCursor) state.calCursor = { jy: state.triple.jalali.jy, jm: state.triple.jalali.jm };
    var c = state.calCursor;
    var seasonIdx = Math.floor((c.jm - 1) / 3);
    var seasons = [
      { e: '🌸', n: 'بهار', c: 'linear-gradient(90deg,#7bdff2,#b8f2c8)' },
      { e: '☀️', n: 'تابستان', c: 'linear-gradient(90deg,#ffd166,#ff9f1c)' },
      { e: '🍂', n: 'پاییز', c: 'linear-gradient(90deg,#f4a261,#e76f51)' },
      { e: '❄️', n: 'زمستان', c: 'linear-gradient(90deg,#90e0ef,#caf0f8)' }
    ];
    var s = seasons[seasonIdx];
    setText('calMonth', s.e + ' ' + Cal.JALALI_MONTHS[c.jm - 1]);
    setText('calYear', Cal.toFaDigits(c.jy) + ' شمسی - ' + Cal.toFaDigits(c.jy + 621) + ' میلادی');
    var sb = document.getElementById('calSeasonBar');
    if (sb) sb.style.background = s.c;
    var grid = document.getElementById('calGrid');
    // Preserve header row
    var head = grid.querySelector('.cal-grid__head');
    grid.innerHTML = '';
    grid.appendChild(head);
    var weeks = Cal.buildJalaliMonthGrid(c.jy, c.jm, settings.hijriAdjust);
    var todayTriple = state.triple;
    for (var w = 0; w < weeks.length; w++) {
      for (var d = 0; d < weeks[w].length; d++) {
        var cell = weeks[w][d];
        var div = document.createElement('div');
        var cls = 'cal-grid__day';
        if (cell.inMonth) cls += ' in-month'; else cls += ' out-of-month';
        var isToday = cell.jy === todayTriple.jalali.jy && cell.jm === todayTriple.jalali.jm && cell.jd === todayTriple.jalali.jd;
        if (isToday) cls += ' today';
        var isFriday = cell.weekdaySatFirst === 6;
        if (isFriday) cls += ' friday holiday';

        // Check events for this cell
        var h = cell.hijri;
        var events = Events.getDayEvents(cell, cell.greg, h, { isFriday: isFriday });
        var hasHoliday = false, hasSunni = false, hasShia = false, hasBaloch = false, hasIntl = false, hasFast = false;
        for (var i = 0; i < events.length; i++) {
          var e = events[i];
          if (e.type === 'holiday' || e.tags.official) hasHoliday = true;
          if (e.tags.sunni) hasSunni = true;
          if (e.tags.shia) hasShia = true;
          if (e.tags.baloch) hasBaloch = true;
          if (e.tags.international) hasIntl = true;
          if (e.type === 'fast') hasFast = true;
        }
        // Notes for this day
        var hasNote = false;
        if (typeof Notes !== 'undefined' && Notes.getAll) {
          var _notes = Notes.getAll();
          for (var ni = 0; ni < _notes.length; ni++) {
            var nd = _notes[ni].date;
            if (nd && nd.jy === cell.jy && nd.jm === cell.jm && nd.jd === cell.jd) { hasNote = true; break; }
          }
        }
        if (hasNote) cls += ' has-note';
        var clsArr = [];
        if (hasHoliday) clsArr.push('has-holiday');
        var multi = (hasSunni ? 1 : 0) + (hasShia ? 1 : 0) + (hasBaloch ? 1 : 0) + (hasIntl ? 1 : 0);
        if (multi > 1) clsArr.push('has-multi');
        else if (hasSunni) clsArr.push('has-sunni');
        else if (hasShia) clsArr.push('has-shia');
        else if (hasBaloch) clsArr.push('has-baloch');
        else if (hasIntl) clsArr.push('has-intl');
        else if (hasHoliday || hasFast) clsArr.push('has-baloch');
        cls += ' ' + clsArr.join(' ');
        div.className = cls;
        var eventLabel = '';
        for (var k = 0; k < events.length; k++) {
          var ev = events[k];
          if (ev.type === 'holiday' || ev.tags.baloch || ev.tags.sunni || ev.tags.official) {
            eventLabel = ev.title.split(' ')[0].slice(0, 8);
            break;
          }
        }
        div.innerHTML =
          '<div class="day-num">' + Cal.toFaDigits(cell.jd) + '</div>' +
          '<div class="hijri-num">' + Cal.toFaDigits(cell.hijri.hd) + '</div>' +
          (eventLabel ? '<div class="event-dot">' + escapeHtml(eventLabel) + '</div>' : '') +
          (hasNote ? '<div class="note-dot">📝</div>' : '');
        div.addEventListener('click', function (cellData) {
          return function () { selectCalendarDay(cellData); };
        }(cell));
        grid.appendChild(div);
      }
    }
    // Also render today's events in the calendar day detail (initial: show today)
    selectCalendarDay(state.triple);
  }

  function selectCalendarDay(cell) {
    state.calSelected = cell;
    var jy = cell.jalali ? cell.jalali.jy : cell.jy;
    var jm = cell.jalali ? cell.jalali.jm : cell.jm;
    var jd = cell.jalali ? cell.jalali.jd : cell.jd;
    setText('calSelectedTitle', Cal.toFaDigits(jd) + ' ' + Cal.JALALI_MONTHS[jm - 1] + ' ' + Cal.toFaDigits(jy));
    var triple = { jalali: { jy: cell.jy, jm: cell.jm, jd: cell.jd }, greg: cell.greg, hijri: cell.hijri, weekdaySatFirst: cell.weekdaySatFirst };
    renderDayEvents(triple, 'calDayEvents', (document.getElementById('calSearch') || {}).value);
  }
  function searchDayEvents(q) {
    if (!state.calSelected) return;
    var cell = state.calSelected;
    var triple = { jalali: { jy: cell.jy, jm: cell.jm, jd: cell.jd }, greg: cell.greg, hijri: cell.hijri, weekdaySatFirst: cell.weekdaySatFirst };
    renderDayEvents(triple, 'calDayEvents', q);
  }

  function calPrev() {
    var c = state.calCursor;
    if (c.jm === 1) { c.jm = 12; c.jy--; } else c.jm--;
    renderCalendar();
  }
  function calNext() {
    var c = state.calCursor;
    if (c.jm === 12) { c.jm = 1; c.jy++; } else c.jm++;
    renderCalendar();
  }
  function calToday() {
    state.calCursor = { jy: state.triple.jalali.jy, jm: state.triple.jalali.jm };
    renderCalendar();
  }

  // ---------- Prayer view ----------
  function computeAndRenderPrayer() {
    var tz = (typeof settings.tz === 'number') ? settings.tz : (-state.today.getTimezoneOffset() / 60);
    if (settings.dst) tz += 1;
    var method = Prayer.METHODS[settings.method] || Prayer.METHODS.karachi;
    var base = Prayer.computeLocal(state.today, settings.lat, settings.lng, method, tz);
    var adjAll = (settings.prayerAdjAll || 0) / 60;
    state.prayerTimes = {};
    for (var _k in base) {
      if (base.hasOwnProperty(_k)) {
        var t = base[_k] + adjAll;
        // single adjustment (one prayer only)
        if (settings.prayerAdjSingle && settings.prayerAdjSingle.prayer === _k) {
          t += (settings.prayerAdjSingle.adj || 0) / 60;
        }
        // custom adjustments: "fajr+5,zhuhr-3,isha+10"
        if (settings.prayerAdjCustom) {
          var _parts = settings.prayerAdjCustom.split(',');
          for (var _pi = 0; _pi < _parts.length; _pi++) {
            var _m = _parts[_pi].trim().match(/^([a-z]+)\s*([+\-]?\d+)$/i);
            if (_m && _m[1].toLowerCase() === _k) {
              t += (parseInt(_m[2], 10) || 0) / 60;
            }
          }
        }
        state.prayerTimes[_k] = t;
      }
    }
    setText('prayerMethod', method.name);
    // Render prayer rows
    var rowsEl = document.getElementById('prayerRows');
    if (rowsEl) {
      rowsEl.innerHTML = '';
      var order = [
        { key: 'imsak',   icon: '🌑', name: 'امساک' },
        { key: 'fajr',    icon: '🌅', name: 'اذان صبح' },
        { key: 'sunrise', icon: '☀️', name: 'طلوع آفتاب' },
        { key: 'dhuhr',   icon: '🕛', name: 'اذان ظهر' },
        { key: 'asr',     icon: '🌇', name: 'اذان عصر' },
        { key: 'maghrib', icon: '🌆', name: 'اذان مغرب' },
        { key: 'isha',    icon: '🌙', name: 'اذان عشا' }
      ];
      for (var i = 0; i < order.length; i++) {
        var row = order[i];
        var div = document.createElement('div');
        div.className = 'prayer-row';
        div.dataset.key = row.key;
        var t = state.prayerTimes[row.key];
        div.innerHTML =
          '<span class="prayer-row__icon">' + row.icon + '</span>' +
          '<span class="prayer-row__name">' + row.name + '</span>' +
          '<span class="prayer-row__time">' + Prayer.formatTime(t) + '</span>';
        rowsEl.appendChild(div);
      }
      highlightActivePrayer();
      writeWidgetData();
    }

  // Write prayer times for Android home-screen widget
  function writeWidgetData() {
    try {
      if (!window.Capacitor || !window.Capacitor.isNativePlatform()) return;
      if (!window.Filesystem) return;
      var times = state.prayerTimes || {};
      var np = nextPrayer();
      var data = {
        app: 'BalochistanNama',
        date: new Date().toISOString().slice(0, 10),
        times: {
          fajr: Prayer.formatTime(times.fajr),
          dhuhr: Prayer.formatTime(times.dhuhr),
          asr: Prayer.formatTime(times.asr),
          maghrib: Prayer.formatTime(times.maghrib),
          isha: Prayer.formatTime(times.isha)
        },
        next: np ? np.name : '',
        nextTime: np ? Prayer.formatTime(np.time) : '',
        city: settings.locName || 'بلوچستان'
      };
      window.Filesystem.writeFile({
        path: 'widget_data.json',
        data: JSON.stringify(data),
        directory: 'DATA',
        encoding: 'utf8'
      }).catch(function () {});
    } catch (e) {}
  }
    // Render next prayer
    renderNextPrayer();
    // Qibla bearing
    var qb = Prayer.qiblaBearing(settings.lat, settings.lng);
    setText('qiblaBearing', Math.round(qb) + '°');
    setText('qiblaDeg', Math.round(qb) + '°');
    var dist = Prayer.qiblaDistance(settings.lat, settings.lng);
    setText('qiblaDistance', 'فاصله تا کعبه: ' + dist + ' کیلومتر');
  }

  function renderPrayer() {
    if (!state.triple) return;
    var t = state.triple;
    setText('phWeekday', Cal.WEEKDAYS_FA_SAT_FIRST[t.weekdaySatFirst]);
    setText('phDate', Cal.fmtJalaliLong(t.jalali));
    var h = t.hijri;
    if (settings.hijriAdjust && settings.hijriAdjust !== 0) h = Cal.adjustHijri(h.hy, h.hm, h.hd, settings.hijriAdjust);
    setText('phHijri', 'هجری قمری: ' + Cal.fmtHijriLong(h));
    computeAndRenderPrayer();
  }

  function findNextPrayer() {
    if (!state.prayerTimes) return null;
    var now = state.today;
    var nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    var keys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var t = state.prayerTimes[k];
      if (isNaN(t)) continue;
      if (t > nowH) return { key: k, time: t, name: Prayer.NAMES[k] || k };
    }
    // After Isha -> next prayer is tomorrow's Fajr
    return { key: 'fajr', tomorrow: true, time: state.prayerTimes.fajr + 24, name: 'اذان صبح' };
  }

  function highlightActivePrayer() {
    if (!state.prayerTimes) return;
    var now = state.today;
    var nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    var keys = ['imsak','fajr','sunrise','dhuhr','asr','maghrib','isha'];
    var activeIdx = -1;
    for (var i = keys.length - 1; i >= 0; i--) {
      var t = state.prayerTimes[keys[i]];
      if (!isNaN(t) && t <= nowH) { activeIdx = i; break; }
    }
    var rows = document.querySelectorAll('.prayer-row');
    rows.forEach(function (r, idx) {
      // rows are in order: imsak, fajr, sunrise, dhuhr, asr, maghrib, isha
      r.classList.toggle('active', idx === activeIdx);
    });
  }

  function renderNextPrayer() {
    var np = findNextPrayer();
    if (!np) {
      setText('npName', '--');
      setText('npTime', '--:--');
      setText('npCountdown', '--:--');
      setText('pnpName', '--');
      setText('pnpTime', '--:--');
      setText('pnpCountdown', '--:--');
      updateSticky('--', '--:--', '--:--');
      return;
    }
    setText('npName', np.name + (np.tomorrow ? ' (فردا)' : ''));
    setText('pnpName', np.name + (np.tomorrow ? ' (فردا)' : ''));
    var fmt = Prayer.formatTime(np.time);
    setText('npTime', fmt);
    setText('pnpTime', fmt);
    // Countdown
    var now = state.today;
    var nowH = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    var diff = np.time - nowH;
    if (diff < 0) diff += 24;
    var h = Math.floor(diff);
    var m = Math.floor((diff - h) * 60);
    var s = Math.floor((((diff - h) * 60) - m) * 60);
    var cd = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
    setText('npCountdown', cd);
    setText('pnpCountdown', cd);
    updateSticky(np.name + (np.tomorrow ? ' (فردا)' : ''), fmt, cd);
    // Prayer streak
    if (typeof Streak !== 'undefined' && Streak.renderStreak) Streak.renderStreak('streakBox');
  }

  // ---------- Compass calibration ----------
  var calibWired = false;
  function wireCompassCalib() {
    if (calibWired) return;
    calibWired = true;
    var btn = document.getElementById('compassCalibBtn');
    if (btn) btn.addEventListener('click', function () {
      if (typeof App !== 'undefined' && App.toast) App.toast('قطب‌نما در حال کالیبره... گوشی را ۸ شکل بچرخانید 🔄');
      if (typeof NativeApp !== 'undefined' && NativeApp.calibrate) {
        try { NativeApp.calibrate(); } catch (e) {}
      }
    });
  }

  // ---------- Culture view ----------
  var cultureTab = 'poetry';
  var quizState = null; // { category, questions, index, score, answered }

  function renderCulture() {
    var container = document.getElementById('view-culture');
    if (!container) return;
    
    // Build tabs
    var tabsHtml = 
      '<div class="culture-tabs">' +
        '<button class="culture-tab' + (cultureTab === 'poetry' ? ' active' : '') + '" data-tab="poetry">📜 شعر</button>' +
        '<button class="culture-tab' + (cultureTab === 'proverbs' ? ' active' : '') + '" data-tab="proverbs">💬 ضرب‌المثل</button>' +
        '<button class="culture-tab' + (cultureTab === 'stories' ? ' active' : '') + '" data-tab="stories">📖 داستان</button>' +
        '<button class="culture-tab' + (cultureTab === 'history' ? ' active' : '') + '" data-tab="history">🏛️ تاریخ</button>' +
        '<button class="culture-tab' + (cultureTab === 'songs' ? ' active' : '') + '" data-tab="songs">🎵 آهنگ</button>' +
        '<button class="culture-tab' + (cultureTab === 'quiz' ? ' active' : '') + '" data-tab="quiz">🧠 آزمون</button>' +
      '</div>';
    
    var contentHtml = '';
    if (cultureTab === 'poetry') {
      contentHtml = renderPoetryContent();
    } else if (cultureTab === 'proverbs') {
      contentHtml = renderProverbsContent();
    } else if (cultureTab === 'stories') {
      contentHtml = renderStoriesContent();
    } else if (cultureTab === 'history') {
      contentHtml = renderHistoryContent();
    } else if (cultureTab === 'songs') {
      contentHtml = renderSongsContent();
    } else if (cultureTab === 'quiz') {
      contentHtml = renderQuizContent();
    }
    
    container.innerHTML = tabsHtml + '<div class="culture-content">' + contentHtml + '</div>';
    
    // Wire tab clicks
    container.querySelectorAll('.culture-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        cultureTab = tab.dataset.tab;
        renderCulture();
      });
    });
    
    // Wire quiz interactions
    if (cultureTab === 'quiz') {
      wireQuizEvents();
    }
    // Wire song play buttons
    container.querySelectorAll('.song-play').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx, 10);
        if (Baloch.SONGS && Baloch.SONGS[idx]) {
          speakText(Baloch.SONGS[idx].text, 'fa-IR');
          if (App && App.toast) App.toast('در حال پخش: ' + Baloch.SONGS[idx].title);
        }
      });
    });
  }

  function renderPoetryContent() {
    var html = '';
    for (var p = 0; p < Baloch.POEMS.length; p++) {
      var poem = Baloch.POEMS[p];
      var linesHtml = '';
      for (var l = 0; l < poem.lines.length; l++) {
        linesHtml += '<div>' + escapeHtml(poem.lines[l].balochi) + '</div>';
      }
      var faHtml = '';
      for (var f = 0; f < poem.lines.length; f++) {
        faHtml += '<div>' + escapeHtml(poem.lines[f].fa) + '</div>';
      }
      html +=
        '<div class="poem">' +
          '<div class="poem__poet">' + escapeHtml(poem.poetFull) + '</div>' +
          '<div class="poem__year">' + escapeHtml(poem.yearRange) + '</div>' +
          '<div class="poem__balochi">' + linesHtml + '</div>' +
          '<div class="poem__fa">' + faHtml + '</div>' +
          (poem.bio ? '<div class="poet-bio">' + escapeHtml(poem.bio) + '</div>' : '') +
        '</div>';
    }
    return html;
  }

  function renderProverbsContent() {
    var html = '';
    for (var v = 0; v < Baloch.PROVERBS.length; v++) {
      var pr = Baloch.PROVERBS[v];
      html +=
        '<div class="proverb">' +
          '<div class="proverb__balochi">' + escapeHtml(pr.balochi) + '</div>' +
          '<div class="proverb__fa">' + escapeHtml(pr.fa) + '</div>' +
          (pr.note ? '<div class="proverb__note">' + escapeHtml(pr.note) + '</div>' : '') +
        '</div>';
    }
    return html;
  }

  function renderStoriesContent() {
    if (!Baloch.STORIES) return '<div class="text-muted">داستانی موجود نیست</div>';
    var html = '';
    for (var s = 0; s < Baloch.STORIES.length; s++) {
      var story = Baloch.STORIES[s];
      html +=
        '<div class="story-card">' +
          '<div class="story-title">' + escapeHtml(story.title) + '</div>' +
          '<div class="story-text">' + escapeHtml(story.text) + '</div>' +
          (story.moral ? '<div class="story-moral">پند: ' + escapeHtml(story.moral) + '</div>' : '') +
        '</div>';
    }
    return html;
  }

  function renderHistoryContent() {
    if (!Baloch.HISTORY) return '<div class="text-muted">اطلاعات تاریخی موجود نیست</div>';
    var html = '';
    for (var h = 0; h < Baloch.HISTORY.length; h++) {
      var fact = Baloch.HISTORY[h];
      html +=
        '<div class="history-card">' +
          '<div class="history-title">' + escapeHtml(fact.title) + '</div>' +
          '<div class="history-text">' + escapeHtml(fact.text) + '</div>' +
        '</div>';
    }
    return html;
  }

  function renderSongsContent() {
    if (!Baloch.SONGS) return '<div class="text-muted">آهنگی موجود نیست</div>';
    var html = '';
    for (var s = 0; s < Baloch.SONGS.length; s++) {
      var song = Baloch.SONGS[s];
      html +=
        '<div class="song-card">' +
          '<div class="song-title">🎵 ' + escapeHtml(song.title) + '</div>' +
          '<div class="song-artist">🎤 ' + escapeHtml(song.artist) + '</div>' +
          '<div class="song-text">' + escapeHtml(song.text).replace(/\n/g, '<br>') + '</div>' +
          (song.note ? '<div class="song-note">💡 ' + escapeHtml(song.note) + '</div>' : '') +
          '<button class="btn btn--ghost song-play" data-idx="' + s + '" style="margin-top:8px; font-size:12px;">🔊 پخش صوت (بلوچی)</button>' +
        '</div>';
    }
    return html;
  }

  function speakText(text, lang) {
    try {
      if (!('speechSynthesis' in window)) { if (App && App.toast) App.toast('پخش صوت پشتیبانی نمی‌شود'); return; }
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'fa-IR';
      u.rate = 0.9; u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch (e) { if (App && App.toast) App.toast('خطا در پخش صوت'); }
  }

  function renderQuizContent() {
    if (!Baloch.QUIZ) return '<div class="text-muted">آزمونی موجود نیست</div>';
    
    if (!quizState || quizState.category !== cultureTab) {
      var categories = Object.keys(Baloch.QUIZ);
      var html = '<div class="quiz-select">' +
        '<div class="section-title">انتخاب دسته‌بندی آزمون</div>' +
        '<div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">';
      var labels = { poetry: '📜 شعر', proverbs: '💬 ضرب‌المثل', stories: '📖 داستان', history: '🏛️ تاریخ' };
      for (var c = 0; c < categories.length; c++) {
        var cat = categories[c];
        html +=
          '<button class="btn btn--primary quiz-start-btn" data-category="' + cat + '">' +
            (labels[cat] || cat) +
          '</button>';
      }
      html += '</div></div>';
      return html;
    }
    
    // Show active quiz question
    var qs = quizState;
    if (qs.index >= qs.questions.length) {
      // Quiz finished
      var score = qs.score || 0;
      var total = qs.questions.length;
      var pct = Math.round((score / total) * 100);
      var emoji = pct >= 80 ? '🎉' : (pct >= 50 ? '👍' : '📚');
      return '<div class="quiz-result">' +
        '<div class="quiz-result__emoji">' + emoji + '</div>' +
        '<div class="quiz-result__score">' + score + ' از ' + total + '</div>' +
        '<div class="quiz-result__pct">' + pct + '%</div>' +
        '<button class="btn btn--primary" id="quizRetry">🔄 دوباره</button>' +
        '</div>';
    }
    
    var q = qs.questions[qs.index];
    var optionsHtml = '';
    for (var o = 0; o < q.options.length; o++) {
      var letter = String.fromCharCode(65 + o);
      var isSelected = qs.answered && qs.answered === o;
      var isCorrect = qs.answered !== undefined && o === q.correct;
      var cls = 'quiz-option';
      if (isSelected) cls += ' selected';
      if (qs.answered !== undefined && isCorrect) cls += ' correct';
      if (qs.answered !== undefined && isSelected && !isCorrect) cls += ' wrong';
      optionsHtml +=
        '<button class="' + cls + '" data-opt="' + o + '"' + (qs.answered !== undefined ? ' disabled' : '') + '>' +
          letter + '. ' + escapeHtml(q.options[o]) +
        '</button>';
    }
    
    var progress = ((qs.index) / qs.questions.length * 100);
    return '<div class="quiz-progress">' +
      '<div class="quiz-progress__bar" style="width:' + progress + '%;"></div>' +
      '<div class="quiz-progress__text">سؤال ' + (qs.index + 1) + ' از ' + qs.questions.length + '</div>' +
      '</div>' +
      '<div class="quiz-question">' + escapeHtml(q.question) + '</div>' +
      '<div class="quiz-options">' + optionsHtml + '</div>' +
      (qs.answered !== undefined ? 
        '<button class="btn btn--primary" id="quizNext">سؤال بعد ➜</button>' : 
        '<div class="text-muted text-small" style="margin-top:8px;">گزینه‌ای را انتخاب کنید</div>'
      );
  }

  function wireQuizEvents() {
    var container = document.getElementById('view-culture');
    if (!container) return;
    
    // Start quiz buttons
    container.querySelectorAll('.quiz-start-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var category = btn.dataset.category;
        if (!Baloch.QUIZ[category]) return;
        var questions = Baloch.QUIZ[category].slice(); // copy
        // Shuffle questions
        for (var i = questions.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var temp = questions[i];
          questions[i] = questions[j];
          questions[j] = temp;
        }
        quizState = {
          category: category,
          questions: questions,
          index: 0,
          score: 0,
          answered: undefined
        };
        renderCulture();
      });
    });
    
    // Quiz options
    container.querySelectorAll('.quiz-option:not([disabled])').forEach(function(opt) {
      opt.addEventListener('click', function() {
        if (quizState.answered !== undefined) return;
        var selected = parseInt(opt.dataset.opt, 10);
        quizState.answered = selected;
        if (selected === quizState.questions[quizState.index].correct) {
          quizState.score = (quizState.score || 0) + 1;
        }
        renderCulture();
      });
    });
    
    // Next button
    var nextBtn = document.getElementById('quizNext');
    if (nextBtn) {
      nextBtn.addEventListener('click', function() {
        if (quizState.answered === undefined) return;
        quizState.index++;
        quizState.answered = undefined;
        renderCulture();
      });
    }
    
    // Retry button
    var retryBtn = document.getElementById('quizRetry');
    if (retryBtn) {
      retryBtn.addEventListener('click', function() {
        quizState = null;
        renderCulture();
      });
    }
  }

  // ---------- Converter modal ----------
  function openConverter(prefill) {
    var m = document.getElementById('modalConverter');
    m.classList.add('show');
    if (prefill) {
      // prefill with today's triple
      var t = state.triple;
      setVal('cvJy', t.jalali.jy); setVal('cvJm', t.jalali.jm); setVal('cvJd', t.jalali.jd);
      setVal('cvGy', t.greg.gy); setVal('cvGm', t.greg.gm); setVal('cvGd', t.greg.gd);
      var h = t.hijri;
      if (settings.hijriAdjust) h = Cal.adjustHijri(h.hy, h.hm, h.hd, settings.hijriAdjust);
      setVal('cvHy', h.hy); setVal('cvHm', h.hm); setVal('cvHd', h.hd);
      updateConverter();
    }
  }
  function closeConverter() {
    document.getElementById('modalConverter').classList.remove('show');
  }
  function updateConverter() {
    // Try to detect which field changed and update others
    var jy = getVal('cvJy'), jm = getVal('cvJm'), jd = getVal('cvJd');
    var gy = getVal('cvGy'), gm = getVal('cvGm'), gd = getVal('cvGd');
    var hy = getVal('cvHy'), hm = getVal('cvHm'), hd = getVal('cvHd');
    var weekdayStr = '';
    if (jy && jm && jd) {
      try {
        var g = Cal.toGregorian(jy, jm, jd);
        setVal('cvGy', g.gy); setVal('cvGm', g.gm); setVal('cvGd', g.gd);
        var h = Cal.gregToHijri(g.gy, g.gm, g.gd);
        if (settings.hijriAdjust) h = Cal.adjustHijri(h.hy, h.hm, h.hd, settings.hijriAdjust);
        setVal('cvHy', h.hy); setVal('cvHm', h.hm); setVal('cvHd', h.hd);
        var dt = new Date(g.gy, g.gm - 1, g.gd);
        weekdayStr = Cal.WEEKDAYS_FA_SAT_FIRST[(dt.getDay() + 1) % 7];
      } catch (e) {}
    } else if (gy && gm && gd) {
      try {
        var j = Cal.toJalaali(gy, gm, gd);
        setVal('cvJy', j.jy); setVal('cvJm', j.jm); setVal('cvJd', j.jd);
        var h2 = Cal.gregToHijri(gy, gm, gd);
        if (settings.hijriAdjust) h2 = Cal.adjustHijri(h2.hy, h2.hm, h2.hd, settings.hijriAdjust);
        setVal('cvHy', h2.hy); setVal('cvHm', h2.hm); setVal('cvHd', h2.hd);
        var dt2 = new Date(gy, gm - 1, gd);
        weekdayStr = Cal.WEEKDAYS_FA_SAT_FIRST[(dt2.getDay() + 1) % 7];
      } catch (e) {}
    } else if (hy && hm && hd) {
      try {
        var g2 = Cal.hijriToGreg(hy, hm, hd);
        setVal('cvGy', g2.gy); setVal('cvGm', g2.gm); setVal('cvGd', g2.gd);
        var j2 = Cal.toJalaali(g2.gy, g2.gm, g2.gd);
        setVal('cvJy', j2.jy); setVal('cvJm', j2.jm); setVal('cvJd', j2.jd);
        var dt3 = new Date(g2.gy, g2.gm - 1, g2.gd);
        weekdayStr = Cal.WEEKDAYS_FA_SAT_FIRST[(dt3.getDay() + 1) % 7];
      } catch (e) {}
    }
    setText('cvWeekday', weekdayStr ? 'روز هفته: ' + weekdayStr : '');
  }
  function getVal(id) { var el = document.getElementById(id); return el ? (parseInt(el.value, 10) || 0) : 0; }
  function setVal(id, v) { var el = document.getElementById(id); if (el) el.value = v; }
  function setText(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
  function setHtml(id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; }
  function escapeHtml(s) {
    return String(s || '').replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---------- Settings modal ----------
  var settingsSnapshot = null;
  function cancelSettings() {
    if (settingsSnapshot) { settings = settingsSnapshot; settingsSnapshot = null; }
    closeSettings();
  }
  function openSettings() {
    settingsSnapshot = JSON.parse(JSON.stringify(settings));
    var m = document.getElementById('modalSettings');
    m.classList.add('show');
    setVal('setTheme', settings.theme);
    // populate method select
    var sel = document.getElementById('setMethod');
    if (sel) {
      sel.innerHTML = '';
      for (var k in Prayer.METHODS) {
        var opt = document.createElement('option');
        opt.value = k; opt.textContent = Prayer.METHODS[k].name;
        if (k === settings.method) opt.selected = true;
        sel.appendChild(opt);
      }
    }
    setVal('setHijriAdj', settings.hijriAdjust);
    setVal('setPrayerAdjAll', settings.prayerAdjAll || 0);
    setVal('setPrayerSingle', settings.prayerAdjSingle ? settings.prayerAdjSingle.prayer : 'fajr');
    setVal('setPrayerSingleAdj', settings.prayerAdjSingle ? (settings.prayerAdjSingle.adj || 0) : 0);
    setVal('setPrayerCustom', settings.prayerAdjCustom || '');
    setToggle('setNotifyPrayer', settings.notifyPrayer);
    setToggle('setNotifyEvents', settings.notifyEvents);
    setToggle('setNotifyNotes', settings.notifyNotes);
    setToggle('setFaDigits', settings.faDigits);
    setToggle('setSeasonFx', settings.seasonFx);
    setToggle('setDst', settings.dst);
    setToggle('setRamadan', settings.ramadanMode);
    setToggle('setAutoNight', settings.autoNight);
  }
  function closeSettings() {
    document.getElementById('modalSettings').classList.remove('show');
  }
  function setToggle(id, on) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('on', !!on);
  }
  function getToggle(id) {
    var el = document.getElementById(id);
    return el ? el.classList.contains('on') : false;
  }
  function applySettingsFromForm() {
    var themeSel = document.getElementById('setTheme');
    settings.theme = themeSel ? themeSel.value : 'auto';
    var methodSel = document.getElementById('setMethod');
    settings.method = methodSel ? methodSel.value : 'karachi';
    settings.hijriAdjust = getVal('setHijriAdj');
    settings.notifyPrayer = getToggle('setNotifyPrayer');
    settings.notifyEvents = getToggle('setNotifyEvents');
    settings.notifyNotes = getToggle('setNotifyNotes');
    settings.faDigits = getToggle('setFaDigits');
    settings.seasonFx = getToggle('setSeasonFx');
    settings.dst = getToggle('setDst');
    settings.ramadanMode = getToggle('setRamadan');
    settings.autoNight = getToggle('setAutoNight');
    if (settings.autoNight) applyAutoNight();
    var asrSel = document.getElementById('asrMethodSel');
    if (asrSel) settings.asrMode = asrSel.value;
    window.__asrMode = (settings.asrMode && settings.asrMode !== 'method') ? settings.asrMode : null;
    var athanSnd = document.getElementById('athanSoundToggle');
    if (athanSnd) settings.athanSound = athanSnd.classList.contains('on');
    var sysRng = document.getElementById('athanSystemToggle');
    if (sysRng) settings.showSystemRingtones = sysRng.classList.contains('on');
    settings.prayerAdjAll = getVal('setPrayerAdjAll') || 0;
    settings.prayerAdjSingle = {
      prayer: getVal('setPrayerSingle') || 'fajr',
      adj: getVal('setPrayerSingleAdj') || 0
    };
    settings.prayerAdjCustom = getVal('setPrayerCustom') || '';
    var fontSel = document.getElementById('setFont');
    settings.fontScale = fontSel ? (parseFloat(fontSel.value) || 1) : 1;
    settings.stickyPrayer = getToggle('setStickyPrayer');
    var pAdjIn = document.getElementById('prayerAdjInput'); if (pAdjIn) pAdjIn.value = settings.prayerAdjAll;
    var pSel = document.getElementById('prayerMethodSel'); if (pSel) pSel.value = settings.method;
    saveSettings();
    applyTheme();
    applyFontScale();
    applySticky();
    renderDashboard();
    if (state.route === 'prayer') renderPrayer();
    if (state.route === 'calendar') renderCalendar();
    if (state.route === 'culture') renderCulture();
    toast('تنظیمات ذخیره شد');
    // Re-schedule notifications
    if (typeof NativeApp !== 'undefined' && NativeApp.rescheduleAlarms) {
      NativeApp.rescheduleAlarms();
    }
  }

  // ---------- Athan / alert sound wiring ----------
  var __athanPlayed = {};
  function refreshAthanSelectors() {
    if (typeof Athan === 'undefined') return;
    var lib = Athan.getLib();
    var sel = Athan.getSel();
    var as = document.getElementById('athanSelect');
    var al = document.getElementById('alertSelect');
    [as, al].forEach(function (selEl) {
      if (!selEl) return;
      selEl.innerHTML = '';
      lib.forEach(function (it) {
        var o = document.createElement('option'); o.value = it.id; o.textContent = it.name;
        selEl.appendChild(o);
      });
    });
    if (as && sel.athan) as.value = sel.athan;
    if (al && sel.alert) al.value = sel.alert;
    if (as) as.onchange = function () { var s = Athan.getSel(); s.athan = as.value; Athan.setSel(s); };
    if (al) al.onchange = function () { var s = Athan.getSel(); s.alert = al.value; Athan.setSel(s); };
  }
  function wireAthan() {
    if (typeof Athan === 'undefined') return;
    var as = document.getElementById('athanSoundToggle');
    if (as) {
      setToggle('athanSoundToggle', settings.athanSound !== false);
      as.addEventListener('click', function () { settings.athanSound = as.classList.contains('on'); saveSettings(); });
    }
    var st = document.getElementById('athanSystemToggle');
    if (st) {
      setToggle('athanSystemToggle', !!settings.showSystemRingtones);
      st.addEventListener('click', function () { settings.showSystemRingtones = st.classList.contains('on'); saveSettings(); if (App) App.toast('تنظیم ذخیره شد'); });
    }
    refreshAthanSelectors();
    var test = document.getElementById('athanTest');
    if (test) test.addEventListener('click', function () { if (typeof Athan !== 'undefined') Athan.play('athan'); });
    var addSys = document.getElementById('athanAddSys');
    var file = document.getElementById('athanFile');
    if (addSys && file) addSys.addEventListener('click', function () { file.click(); });
    if (file) file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      var url = URL.createObjectURL(f);
      var name = f.name.replace(/\.[^.]+$/, '');
      Athan.addItem({ id: 'sys_' + Date.now(), name: name, type: 'file', data: url });
      refreshAthanSelectors();
      if (App) App.toast('صدا اضافه شد: ' + name);
      file.value = '';
    });
    var dl = document.getElementById('athanDownload');
    var panel = document.getElementById('athanDownloadPanel');
    if (dl && panel) dl.addEventListener('click', function () { panel.style.display = (panel.style.display === 'none') ? 'block' : 'none'; });
    var dlAdd = document.getElementById('athanDlAdd');
    if (dlAdd) dlAdd.addEventListener('click', function () {
      var url = document.getElementById('athanDlUrl').value.trim();
      if (!url) { if (App) App.toast('لینک را وارد کن'); return; }
      var name = document.getElementById('athanDlName').value.trim() || 'صدای دانلودی';
      Athan.addItem({ id: 'url_' + Date.now(), name: name, type: 'url', data: url });
      refreshAthanSelectors();
      document.getElementById('athanDlUrl').value = '';
      document.getElementById('athanDlName').value = '';
      if (panel) panel.style.display = 'none';
      if (App) App.toast('صدا اضافه شد ✓');
    });
  }
  function checkAthan() {
    if (!state.prayerTimes) return;
    if (!settings.athanSound && !settings.showSystemRingtones) {
      // still allow alert-only playback if athan off but alert chosen
    }
    var now = new Date();
    var dateStr = now.toDateString();
    var h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    var nowH = h + m / 60 + s / 3600;
    var keys = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var t = state.prayerTimes[k];
      if (isNaN(t)) continue;
      var diff = nowH - t;
      if (diff >= 0 && diff < 3 / 3600) {
        var pk = dateStr + ':' + k;
        if (__athanPlayed[pk]) continue;
        __athanPlayed[pk] = true;
        if (typeof Athan !== 'undefined') {
          if (settings.athanSound) Athan.play('athan');
          else Athan.play('alert');
        }
        break;
      }
    }
  }

  // ---------- Initialization ----------
  function init() {
    state.today = new Date();
    state.triple = Cal.dateToTriple(state.today);
    applyTheme();
    applyFontScale();
    applySticky();
    Clock.start();
    if (typeof Ramadan !== 'undefined' && Ramadan.maybeShowBanner) Ramadan.maybeShowBanner('ramadanBanner');
    if (settings.autoNight) {
      applyAutoNight();
      setInterval(applyAutoNight, 5 * 60 * 1000); // re-check every 5 min
    }

    // Navigation
    document.querySelectorAll('.nav-item').forEach(function (n) {
      n.addEventListener('click', function () { go(n.dataset.route); });
    });

    // Header buttons
    document.getElementById('btnConverter').addEventListener('click', function () { openConverter(true); });
    document.getElementById('btnSettings').addEventListener('click', openSettings);
    document.getElementById('btnNotes').addEventListener('click', function () {
      // Open notes modal
      Notes.renderList('noteListModal');
      document.getElementById('modalNotes').classList.add('show');
    });


    // Calendar navigation
    document.getElementById('calPrev').addEventListener('click', calPrev);
    document.getElementById('calNext').addEventListener('click', calNext);
    document.getElementById('calToday').addEventListener('click', calToday);

    // Quick actions
    document.querySelectorAll('.quick-action').forEach(function (qa) {
      qa.addEventListener('click', function () {
        var a = qa.dataset.action;
        if (a === 'qibla') go('prayer');
        if (a === 'converter') openConverter(true);
        if (a === 'poetry') go('culture');
        if (a === 'moon') { if (window.Moon) Moon.open(); else showMoonPhase(); }
        if (a === 'share') { if (window.Tools) Tools.shareDateCard(); }
      });
    });

    // Converter modal
    document.getElementById('cvClose').addEventListener('click', closeConverter);
    document.getElementById('cvToday').addEventListener('click', function () { openConverter(true); });
    document.getElementById('cvConvert').addEventListener('click', updateConverter);
    ['cvJy','cvJm','cvJd','cvGy','cvGm','cvGd','cvHy','cvHm','cvHd'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', updateConverter);
    });

    // Prayer method selector (in prayer tab) + manual adjustment
    var pmSel = document.getElementById('prayerMethodSel');
    if (pmSel) {
      for (var _pk in Prayer.METHODS) {
        var _po = document.createElement('option'); _po.value = _pk; _po.textContent = Prayer.METHODS[_pk].name;
        if (_pk === settings.method) _po.selected = true; pmSel.appendChild(_po);
      }
      pmSel.addEventListener('change', function () {
        settings.method = pmSel.value;
        saveSettings();
        if (state.route === 'prayer') renderPrayer();
        if (typeof NativeApp !== 'undefined' && NativeApp.rescheduleAlarms) NativeApp.rescheduleAlarms();
      });
      var _pAdj = document.getElementById('prayerAdjInput');
      if (_pAdj) {
        _pAdj.value = settings.prayerAdjAll || 0;
        _pAdj.addEventListener('change', function () {
          settings.prayerAdjAll = parseInt(_pAdj.value, 10) || 0;
          saveSettings();
          if (state.route === 'prayer') renderPrayer();
        });
      }
      // Asr method (Hanafi / Shafii) override
      window.__asrMode = (settings.asrMode && settings.asrMode !== 'method') ? settings.asrMode : null;
      var asrSel = document.getElementById('asrMethodSel');
      if (asrSel) {
        asrSel.value = settings.asrMode || 'method';
        asrSel.addEventListener('change', function () {
          settings.asrMode = asrSel.value;
          window.__asrMode = (asrSel.value === 'method') ? null : asrSel.value;
          saveSettings();
          if (state.route === 'prayer') renderPrayer();
          if (typeof NativeApp !== 'undefined' && NativeApp.rescheduleAlarms) NativeApp.rescheduleAlarms();
        });
      }
      // Athan / alert sound module
      wireAthan();
    }

    // Tools: stopwatch & timer
    var swStart = document.getElementById('swStart');
    var swStop = document.getElementById('swStop');
    var swLap = document.getElementById('swLap');
    var swReset = document.getElementById('swReset');
    if (swStart && window.Tools) {
      swStart.addEventListener('click', Tools.stopwatchStart);
      swStop.addEventListener('click', Tools.stopwatchStop);
      swLap.addEventListener('click', Tools.stopwatchLap);
      swReset.addEventListener('click', Tools.stopwatchReset);
      document.querySelectorAll('[data-timer]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var min = parseInt(btn.dataset.timer, 10);
          Tools.timerStart(min);
        });
      });
      document.getElementById('cdStart').addEventListener('click', function () {
        var val = parseInt(document.getElementById('cdCustom').value, 10);
        if (val > 0) Tools.timerStart(val);
        else toast('دقیقه را وارد کن');
      });
      var cdPause = document.getElementById('cdPause');
      if (cdPause) cdPause.addEventListener('click', function () { if (window.Tools) Tools.timerPause(); });
      var cdReset = document.getElementById('cdReset');
      if (cdReset) cdReset.addEventListener('click', function () { if (window.Tools) Tools.timerReset(); });
      // initial render of stopwatch display
      if (Tools.renderStopwatch) Tools.renderStopwatch();
    }

    // Moon phase: more details button
    var moonMore = document.getElementById('moonMore');
    if (moonMore && window.Moon) {
      moonMore.addEventListener('click', function () { Moon.open(); });
    }

    // Settings modal
    document.getElementById('setConfirm').addEventListener('click', function () { applySettingsFromForm(); closeSettings(); if (typeof Ramadan !== 'undefined' && Ramadan.maybeShowBanner) Ramadan.maybeShowBanner('ramadanBanner'); });
    document.getElementById('setCancel').addEventListener('click', cancelSettings);
    document.querySelectorAll('.toggle').forEach(function (t) {
      t.addEventListener('click', function () { t.classList.toggle('on'); });
    });
    document.getElementById('modalSettings').addEventListener('click', function (e) {
      if (e.target === this) { cancelSettings(); }
    });


    // Notes modal
    document.getElementById('noteClose').addEventListener('click', function () {
      document.getElementById('modalNotes').classList.remove('show');
    });
    document.getElementById('modalNotes').addEventListener('click', function (e) {
      if (e.target === this) this.classList.remove('show');
    });
    document.getElementById('noteAdd').addEventListener('click', function () {
      var title = document.getElementById('noteTitle').value.trim();
      var jy = parseInt(document.getElementById('noteJy').value, 10);
      var jm = parseInt(document.getElementById('noteJm').value, 10);
      var jd = parseInt(document.getElementById('noteJd').value, 10);
      var body = document.getElementById('noteBody').value.trim();
      var isBirthday = document.getElementById('noteIsBirthday').checked;
      if (!title) { toast('عنوان را وارد کنید'); return; }
      var note = { title: title, body: body, type: isBirthday ? 'birthday' : 'normal' };
      if (jy && jm && jd) note.date = { jy: jy, jm: jm, jd: jd };
      Notes.add(note);
      Notes.renderList('noteListModal');
      document.getElementById('noteTitle').value = '';
      document.getElementById('noteJy').value = '';
      document.getElementById('noteJm').value = '';
      document.getElementById('noteJd').value = '';
      document.getElementById('noteBody').value = '';
      document.getElementById('noteIsBirthday').checked = false;
      toast('یادداشت اضافه شد ✓');
      // Re-schedule reminders
      if (typeof NativeApp !== 'undefined' && NativeApp.rescheduleAlarms) {
        NativeApp.rescheduleAlarms();
      }
    });

    // Initial render
    renderDashboard();

    // Periodic refresh (every minute)
    setInterval(function () {
      state.today = new Date();
      // Check if date changed
      var newTriple = Cal.dateToTriple(state.today);
      if (newTriple.jalali.jy !== state.triple.jalali.jy || newTriple.jalali.jm !== state.triple.jalali.jm || newTriple.jalali.jd !== state.triple.jalali.jd) {
        state.triple = newTriple;
        applyTheme();
        renderDashboard();
        if (state.route === 'calendar') renderCalendar();
        if (state.route === 'prayer') renderPrayer();
      }
      // Update next prayer countdown
      renderNextPrayer();
      highlightActivePrayer();
      // Refresh theme at dawn/dusk (for auto theme)
      if (settings.theme === 'auto') {
        var hr = state.today.getHours();
        var should = (hr >= 6 && hr < 18) ? 'light' : 'dark';
        if (document.documentElement.getAttribute('data-theme') !== should) {
          applyTheme();
        }
      }
    }, 30000);

    // Live 1-second countdown refresh
    setInterval(function () {
      state.today = new Date();
      renderNextPrayer();
      checkAthan();
    }, 1000);

    // Show birthday confetti if today is a birthday note
    var todaysBdays = Notes.todaysNotes(state.triple.jalali).filter(function (n) { return n.type === 'birthday'; });
    if (todaysBdays.length > 0) {
      showConfetti();
      setTimeout(function () {
        toast('🎂 تولد ' + todaysBdays[0].title + ' مبارک!');
      }, 800);
    }

    // Welcome toast
    setTimeout(function () {
      toast('به بلوچستان نما خوش آمدید 🌸');
    }, 600);
  }

  function showMoonPhase() {
    var phase = Prayer.moonPhase(state.today);
    var name = Prayer.moonPhaseName(phase);
    var illum = Math.round((phase < 0.5 ? phase * 2 : (1 - phase) * 2) * 100);
    toast('🌙 فاز ماه: ' + name + ' (' + illum + '% روشن)');
  }

  function showConfetti() {
    var div = document.createElement('div');
    div.className = 'confetti';
    var syms = ['🎉', '🎂', '🎈', '🎁', '🌸', '⭐'];
    for (var i = 0; i < 30; i++) {
      var s = document.createElement('span');
      s.textContent = syms[Math.floor(Math.random() * syms.length)];
      s.style.left = (Math.random() * 100) + '%';
      s.style.animationDelay = (Math.random() * 1.5) + 's';
      s.style.animationDuration = (2.5 + Math.random() * 2) + 's';
      div.appendChild(s);
    }
    document.body.appendChild(div);
    setTimeout(function () { div.remove(); }, 5000);
  }

  function applyFontScale() {
    var s = settings.fontScale || 1;
    document.documentElement.style.fontSize = (16 * s) + 'px';
  }
  function applySticky() {
    var bar = document.getElementById('stickyPrayer');
    if (bar) bar.classList.toggle('hidden', !settings.stickyPrayer);
  }
  function updateSticky(name, time, cd) {
    setText('stickyNpName', name);
    setText('stickyNpTime', time);
    setText('stickyNpCountdown', cd);
  }

  // Public API
  var App = {
    init: init,
    go: go,
    toast: toast,
    getSettings: function () { return settings; },
    saveSettings: saveSettings,
    getState: function () { return state; },
    searchDayEvents: searchDayEvents
  };
  if (typeof window !== 'undefined') window.App = App;

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);

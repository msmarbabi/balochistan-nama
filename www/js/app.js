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
    persistentNotif: false,
    ramadanMode: false,
    autoNight: false,
    athanSound: true,
    showSystemRingtones: false,
    athanAuto: true,
    athanPre: false,
    athanPreMin: 10,
    athanVibrate: false,
    athanIqama: 15,
    athanFridayOnlyKhotba: false,
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
    calMode: 'jalali',  // 'jalali' | 'gregorian' | 'hijri'
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

    // Update status bar color via native bridge
    if (typeof NativeApp !== 'undefined' && NativeApp.setStatusBar) {
      NativeApp.setStatusBar(t === 'dark' ? '#0b0e14' : '#fbfaf6');
    }
    // Update meta theme-color
    var mt = document.querySelector('meta[name=theme-color]');
    if (mt) mt.setAttribute('content', t === 'dark' ? '#0b0e14' : '#fbfaf6');

    // Update season scene
    renderSeasonScene();
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
    if (route === 'prayer') { Compass && Compass.bindQiblaMap && Compass.bindQiblaMap(); }
    if (route !== 'prayer' && Compass && Compass.stop) Compass.stop();
    if (route === 'weather') { Weather.load(); if (window.Compass) Compass.start(); wireCompassCalib(); }
    if (route === 'culture') renderCulture();
    if (route === 'notes') { Notes.init(); Notes.renderList('noteList'); }
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
    setText('clockSeason', settings.dst ? 'تابستان ☀️' : '');

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
    // Personal events for this day
    var personalEvents = [];
    if (typeof PersonalEvents !== 'undefined' && PersonalEvents.getEventsForCell) {
      personalEvents = PersonalEvents.getEventsForCell(triple.jalali.jy, triple.jalali.jm, triple.jalali.jd);
    }
    // Notes with a matching date
    var dayNotes = [];
    if (typeof Notes !== 'undefined' && Notes.getAll) {
      var _all = Notes.getAll();
      for (var _ni = 0; _ni < _all.length; _ni++) {
        var _nd = _all[_ni].date;
        if (_nd && _nd.jy === triple.jalali.jy && _nd.jm === triple.jalali.jm && _nd.jd === triple.jalali.jd) {
          dayNotes.push(_all[_ni]);
        }
      }
    }
    if (q) {
      var ql = String(q).trim().toLowerCase();
      if (ql) events = events.filter(function (e) { return (e.title || '').toLowerCase().indexOf(ql) >= 0; });
    }
    if (events.length === 0 && personalEvents.length === 0 && dayNotes.length === 0) {
      el.innerHTML = '<div class="text-muted text-small text-center" style="padding:10px;">مناسبتی برای این روز ثبت نشده</div>';
      return;
    }
    el.innerHTML = '';
    // Render personal events first (most relevant)
    for (var pi = 0; pi < personalEvents.length; pi++) {
      var pe = personalEvents[pi];
      var pdiv = document.createElement('div');
      pdiv.className = 'day-events__item personal';
      var age = '';
      if (pe.etype === 'birthday' && pe.daysDate) {
        var ageNum = (triple.jalali.jy - pe.daysDate.jy) + ((triple.jalali.jm > pe.daysDate.jm || (triple.jalali.jm === pe.daysDate.jm && triple.jalali.jd >= pe.daysDate.jd)) ? 0 : -1);
        if (ageNum >= 0) age = ' 🎈' + (ageNum + 1) + ' سالگی';
      }
      pdiv.innerHTML =
        '<div class="ev-title"><span class="ev-tag ev-tag--personal">خانوادگی</span>' + escapeHtml(pe.title) + age + '</div>' +
        (pe.desc ? '<div class="ev-desc">' + escapeHtml(pe.desc) + '</div>' : '');
      el.appendChild(pdiv);
    }
    // Render dated notes
    for (var di = 0; di < dayNotes.length; di++) {
      var dn = dayNotes[di];
      var ddiv = document.createElement('div');
      ddiv.className = 'day-events__item note';
      ddiv.innerHTML =
        '<div class="ev-title"><span class="ev-tag">📝 یادداشت</span>' + escapeHtml(dn.title) + '</div>' +
        (dn.body ? '<div class="ev-desc">' + escapeHtml(dn.body) + '</div>' : '');
      el.appendChild(ddiv);
    }
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
      if (e.cal === 'jalali') tagsHtml += '<span class="ev-tag">شمسی</span>';
      if (e.cal === 'gregorian') tagsHtml += '<span class="ev-tag">میلادی</span>';
      if (e.cal === 'hijri') tagsHtml += '<span class="ev-tag">قمری</span>';
      if (e.cal === 'baloch') tagsHtml += '<span class="ev-tag ev-tag--baloch">بلوچ</span>';
      if (e.type === 'holiday') tagsHtml += '<span class="ev-tag ev-tag--holiday">تعطیل</span>';
      if (e.tags.official) tagsHtml += '<span class="ev-tag">رسمی ایران</span>';
      if (e.tags.sunni) tagsHtml += '<span class="ev-tag ev-tag--sunni">اهل سنت</span>';
      if (e.tags.shia) tagsHtml += '<span class="ev-tag">شیعه</span>';
      if (e.tags.baloch) tagsHtml += '<span class="ev-tag ev-tag--baloch">بلوچ</span>';
      if (e.tags.international) tagsHtml += '<span class="ev-tag">جهانی</span>';
      if (e.tags.fast) tagsHtml += '<span class="ev-tag">روزه مستحب</span>';
      div.innerHTML =
        '<div class="ev-title">' + tagsHtml + escapeHtml(e.title) + '</div>' +
        (e.desc ? '<div class="ev-desc">' + escapeHtml(e.desc) + '</div>' : '');
      el.appendChild(div);
    }
  }

  // Countdown to important lunar (Hijri) occasions for Sunni Muslims
  function renderCountdown() {
    var el = document.getElementById('calCountdown');
    if (!el) return;
    try {
      // Key Sunni events: { month, day, label, emoji }
      var targets = [
        { hm: 1,  hd: 1,  label: 'آغاز سال هجری', emoji: '🌙' },
        { hm: 1,  hd: 10, label: 'روزه عاشورا', emoji: '🤲' },
        { hm: 3,  hd: 12, label: 'میلاد پیامبر (ص)', emoji: '🕌' },
        { hm: 8,  hd: 15, label: 'نیمه شعبان', emoji: '✨' },
        { hm: 9,  hd: 1,  label: 'آغاز ماه رمضان', emoji: '🌙' },
        { hm: 9,  hd: 27, label: 'شب قدر', emoji: '🌟' },
        { hm: 10, hd: 1,  label: 'عید فطر', emoji: '🎉' },
        { hm: 12, hd: 9,  label: 'روزه عرفه', emoji: '🤲' },
        { hm: 12, hd: 10, label: 'عید قربان', emoji: '🕋' }
      ];
      var today = new Date();
      var start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      // For each target, scan up to 400 days ahead for its next occurrence
      var items = [];
      for (var ti = 0; ti < targets.length; ti++) {
        var tgt = targets[ti];
        var found = null;
        for (var d = 0; d < 400; d++) {
          var dt = new Date(start.getTime() + d * 86400000);
          var hij = Cal.gregToHijri(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
          if (settings.hijriAdjust) hij = Cal.adjustHijri(hij.hy, hij.hm, hij.hd, settings.hijriAdjust);
          if (hij.hm === tgt.hm && hij.hd === tgt.hd) { found = d; break; }
        }
        if (found !== null) items.push({ label: tgt.label, emoji: tgt.emoji, days: found });
      }
      // Sort by nearest first
      items.sort(function (a, b) { return a.days - b.days; });
      // Show nearest 4
      var html = '';
      for (var i = 0; i < Math.min(4, items.length); i++) {
        var it = items[i];
        var dayText = it.days === 0 ? 'امروز 🎉' : (it.days === 1 ? 'فردا' : it.days + ' روز دیگر');
        html +=
          '<div class="countdown-item">' +
            '<span class="countdown-item__emoji">' + it.emoji + '</span>' +
            '<span class="countdown-item__label">' + escapeHtml(it.label) + '</span>' +
            '<span class="countdown-item__days">' + dayText + '</span>' +
          '</div>';
      }
      el.innerHTML = html || '<div class="text-muted text-small">—</div>';
    } catch (e) {
      el.innerHTML = '';
    }
  }

  // ---------- Calendar view ----------
  function renderCalendar() {
    var mode = state.calMode || 'jalali';
    if (!state.calCursor) state.calCursor = { jy: state.triple.jalali.jy, jm: state.triple.jalali.jm };
    var c = state.calCursor;
    // Season bar only meaningful in jalali mode
    var seasonIdx = Math.floor((c.jm - 1) / 3);
    var seasons = [
      { e: '🌸', n: 'بهار', c: 'linear-gradient(90deg,#7bdff2,#b8f2c8)' },
      { e: '☀️', n: 'تابستان', c: 'linear-gradient(90deg,#ffd166,#ff9f1c)' },
      { e: '🍂', n: 'پاییز', c: 'linear-gradient(90deg,#f4a261,#e76f51)' },
      { e: '❄️', n: 'زمستان', c: 'linear-gradient(90deg,#90e0ef,#caf0f8)' }
    ];
    var s = seasons[seasonIdx];
    if (mode === 'jalali') {
      setText('calMonth', s.e + ' ' + Cal.JALALI_MONTHS[c.jm - 1]);
      setText('calYear', Cal.toFaDigits(c.jy) + ' شمسی - ' + Cal.toFaDigits(c.jy + 621) + ' میلادی');
    } else if (mode === 'gregorian') {
      var gmYear = c.jy + 621;
      var gmMon = Math.min(12, Math.max(1, c.jm));
      setText('calMonth', '🌍 ' + Cal.GREGORIAN_MONTHS_FA[gmMon - 1]);
      setText('calYear', Cal.toFaDigits(gmYear) + ' میلادی');
    } else {
      var hyYear = c.jy - 621 + 1380;
      var hmMon = Math.min(12, Math.max(1, c.jm));
      setText('calMonth', '🌙 ' + Cal.HIJRI_MONTHS[hmMon - 1]);
      setText('calYear', Cal.toFaDigits(hyYear) + ' قمری');
    }
    var sb = document.getElementById('calSeasonBar');
    if (sb) sb.style.background = mode === 'jalali' ? s.c : 'transparent';
    var grid = document.getElementById('calGrid');
    // Preserve header row
    var head = grid.querySelector('.cal-grid__head');
    grid.innerHTML = '';
    grid.appendChild(head);
    var weeks;
    if (mode === 'gregorian') {
      var gm = Math.min(12, Math.max(1, c.jm));
      weeks = Cal.buildGregorianMonthGrid(c.jy + 621, gm, settings.hijriAdjust);
    } else if (mode === 'hijri') {
      var hm = Math.min(12, Math.max(1, c.jm));
      weeks = Cal.buildHijriMonthGrid(c.jy - 621 + 1380, hm, settings.hijriAdjust);
    } else {
      weeks = Cal.buildJalaliMonthGrid(c.jy, c.jm, settings.hijriAdjust);
    }
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
        // Personal events (birthdays & anniversaries)
        var hasPersonal = false;
        if (typeof PersonalEvents !== 'undefined' && PersonalEvents.hasEvents) {
          hasPersonal = PersonalEvents.hasEvents(cell.jy, cell.jm, cell.jd);
        }
        if (hasPersonal) cls += ' has-personal';
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
        div.dataset.jy = cell.jy; div.dataset.jm = cell.jm; div.dataset.jd = cell.jd;
        // Moon phase emoji for this day (based on lunar age)
        var moonEmoji = '';
        try {
          var _mg = new Date(cell.greg.gy, cell.greg.gm - 1, cell.greg.gd);
          var _moon = Prayer.moonPhase(_mg);
          moonEmoji = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'][Math.round(_moon * 7)] || '';
        } catch (e) {}
        // Colored dots matching the legend
        var dotArr = [];
        if (hasHoliday) dotArr.push('<i class="dot dot-holiday"></i>');
        if (hasSunni) dotArr.push('<i class="dot dot-sunni"></i>');
        if (hasShia) dotArr.push('<i class="dot dot-shia"></i>');
        if (hasBaloch) dotArr.push('<i class="dot dot-baloch"></i>');
        if (hasIntl) dotArr.push('<i class="dot dot-intl"></i>');
        if (hasFast) dotArr.push('<i class="dot dot-fast"></i>');
        if (hasNote) dotArr.push('<i class="dot dot-note"></i>');
        if (hasPersonal) dotArr.push('<i class="dot dot-personal"></i>');
        var dots = dotArr.length ? '<div class="day-dots">' + dotArr.join('') + '</div>' : '';
        div.innerHTML =
          '<div class="day-num">' + Cal.toFaDigits(cell.jd) + '</div>' +
          '<div class="hijri-num">' + (moonEmoji ? moonEmoji + ' ' : '') + Cal.toFaDigits(cell.hijri.hd) + '</div>' +
          dots;
        if (state.calSelected && state.calSelected.jy === cell.jy && state.calSelected.jm === cell.jm && state.calSelected.jd === cell.jd) {
          div.classList.add('selected');
        }
        div.addEventListener('click', function (cellData) {
          return function () { selectCalendarDay(cellData); };
        }(cell));
        grid.appendChild(div);
      }
    }
    // Also render today's events in the calendar day detail (initial: show today)
    selectCalendarDay(state.triple);
    renderCountdown();
  }

  function selectCalendarDay(cell) {
    state.calSelected = cell;
    // Highlight selected cell
    var all = document.querySelectorAll('#calGrid .cal-grid__day');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (parseInt(el.dataset.jy, 10) === cell.jy && parseInt(el.dataset.jm, 10) === cell.jm && parseInt(el.dataset.jd, 10) === cell.jd) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    }
    // Support both flat grid cells and nested state.triple shape
    var jy = cell.jalali ? cell.jalali.jy : cell.jy;
    var jm = cell.jalali ? cell.jalali.jm : cell.jm;
    var jd = cell.jalali ? cell.jalali.jd : cell.jd;
    var triple = {
      jalali: { jy: jy, jm: jm, jd: jd },
      greg: cell.greg || (cell.jalali ? cell.jalali.greg : null),
      hijri: cell.hijri || (cell.jalali ? cell.jalali.hijri : null),
      weekdaySatFirst: (typeof cell.weekdaySatFirst === 'number') ? cell.weekdaySatFirst : 6
    };
    setText('calSelectedTitle', Cal.toFaDigits(jd) + ' ' + Cal.JALALI_MONTHS[jm - 1] + ' ' + Cal.toFaDigits(jy) +
      (cell.greg ? '  |  ' + Cal.fmtGregLong(cell.greg) : '') +
      (cell.hijri ? '  |  ' + Cal.fmtHijriLong(cell.hijri) : ''));
    renderDayPrayer(cell, jy, jm, jd);
    renderDayFriday(cell, jy, jm, jd);
    renderDayEvents(triple, 'calDayEvents', (document.getElementById('calSearch') || {}).value);
  }

  // Friday badge + hadith when selected day is Friday
  function renderDayFriday(cell, jy, jm, jd) {
    var el = document.getElementById('calDayFriday');
    if (!el) return;
    var isFri = (typeof cell.weekdaySatFirst === 'number') ? cell.weekdaySatFirst === 6 : false;
    if (!isFri) { el.innerHTML = ''; return; }
    var fridayHadiths = [
      'خَيْرُ يَوْمٍ طَلَعَتْ عَلَيْهِ الشَّمْسُ يَوْمُ الْجُمُعَةِ — بهترین روزی که خورشید بر آن طلوع می‌کند، روز جمعه است (مسلم)',
      'إِنَّ مِنْ أَفْضَلِ أَيَّامِكُمْ يَوْمَ الْجُمُعَةِ — از بهترین روزهای شما روز جمعه است (ابن ماجه)',
      'مَنْ غَسَّلَ يَوْمَ الْجُمُعَةِ وَاغْتَسَلَ ثُمَّ بَكَّرَ وَابْتَكَرَ — هر کس روز جمعه غسل کند و زود به نماز جمعه برود... (بخاری و مسلم)'
    ];
    // pick deterministic by day
    var idx = Math.abs((jy * 31 + jm * 7 + jd) % fridayHadiths.length);
    el.innerHTML =
      '<div class="friday-badge__row"><span class="friday-badge__tag">🕌 جمعه — روز مبارک</span></div>' +
      '<div class="friday-badge__hadith">' + escapeHtml(fridayHadiths[idx]) + '</div>';
  }

  // Render prayer times for the selected calendar day (not just today)
  function renderDayPrayer(cell, jy, jm, jd) {
    var el = document.getElementById('calDayPrayer');
    if (!el) return;
    try {
      var g = Cal.toGregorian(jy, jm, jd);
      var date = new Date(g.gy, g.gm - 1, g.gd);
      var tz = (typeof settings.tz === 'number') ? settings.tz : (-date.getTimezoneOffset() / 60);
      if (settings.dst) tz += 1;
      var method = Prayer.METHODS[settings.method] || Prayer.METHODS.karachi;
      var times = Prayer.computeLocal(date, settings.lat, settings.lng, method, tz);
      var names = [
        { k: 'fajr', label: 'فجر', icon: '🌅' },
        { k: 'sunrise', label: 'طلوع', icon: '☀️' },
        { k: 'dhuhr', label: 'ظهر', icon: '🕛' },
        { k: 'asr', label: 'عصر', icon: '🌇' },
        { k: 'maghrib', label: 'مغرب', icon: '🌆' },
        { k: 'isha', label: 'عشا', icon: '🌙' }
      ];
      var items = '';
      for (var i = 0; i < names.length; i++) {
        var t = times[names[i].k];
        items += '<div class="day-prayer__item"><span>' + names[i].icon + ' ' + names[i].label + '</span><b>' + Prayer.formatTime(t) + '</b></div>';
      }
      el.innerHTML = '<div class="day-prayer__title">🕌 اوقات شرعی این روز</div>' +
        '<div class="day-prayer__grid">' + items + '</div>';
    } catch (e) {
      el.innerHTML = '';
    }
  }
  function searchDayEvents(q) {
    if (!state.calSelected) return;
    var cell = state.calSelected;
    var jy = cell.jalali ? cell.jalali.jy : cell.jy;
    var jm = cell.jalali ? cell.jalali.jm : cell.jm;
    var jd = cell.jalali ? cell.jalali.jd : cell.jd;
    var triple = {
      jalali: { jy: jy, jm: jm, jd: jd },
      greg: cell.greg || (cell.jalali ? cell.jalali.greg : null),
      hijri: cell.hijri || (cell.jalali ? cell.jalali.hijri : null),
      weekdaySatFirst: (typeof cell.weekdaySatFirst === 'number') ? cell.weekdaySatFirst : 6
    };
    renderDayEvents(triple, 'calDayEvents', q);
  }

  // Global search across all events; jumps the calendar to the first match.
  function searchAllEvents(q) {
    var query = String(q || '').trim().toLowerCase();
    if (!query) { toast('عبارت جستجو را وارد کنید'); return; }
    var start = state.calCursor || { jy: state.triple.jalali.jy, jm: 1 };
    var found = null;
    // Search the whole Jalali year (12 months) for the query
    for (var m = 1; m <= 12 && !found; m++) {
      var jy = state.triple.jalali.jy;
      var weeks = Cal.buildJalaliMonthGrid(jy, m, settings.hijriAdjust);
      for (var w = 0; w < weeks.length && !found; w++) {
        for (var d = 0; d < weeks[w].length && !found; d++) {
          var cell = weeks[w][d];
          if (!cell || !cell.inMonth) continue;
          var isFriday = cell.weekdaySatFirst === 6;
          var evs = Events.getDayEvents(cell, cell.greg, cell.hijri, { isFriday: isFriday });
          for (var i = 0; i < evs.length; i++) {
            if ((evs[i].title || '').toLowerCase().indexOf(query) >= 0) { found = cell; break; }
          }
        }
      }
    }
    if (!found) { toast('مناسبتی با این عبارت یافت نشد'); return; }
    // Jump calendar to the found month/day and highlight it
    state.calCursor = { jy: found.jy, jm: found.jm };
    renderCalendar();
    selectCalendarDay(found);
    toast('یافت شد: ' + Cal.toFaDigits(found.jd) + ' ' + Cal.JALALI_MONTHS[found.jm - 1]);
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
    var t = state.triple;
    if (state.calMode === 'gregorian') {
      state.calCursor = { jy: t.greg.gy - 621, jm: t.greg.gm };
    } else if (state.calMode === 'hijri') {
      state.calCursor = { jy: t.hijri.hy + 621 - 1380, jm: t.hijri.hm };
    } else {
      state.calCursor = { jy: t.jalali.jy, jm: t.jalali.jm };
    }
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
        // custom adjustments: "فجر+5،ظهر-3،عشا+10" (Persian or English names)
        if (settings.prayerAdjCustom) {
          var _nameMap = { 'فجر': 'fajr', 'صبح': 'fajr', 'طلوع': 'sunrise', 'ظهر': 'dhuhr', 'عصر': 'asr', 'مغرب': 'maghrib', 'عشا': 'isha', 'امساک': 'imsak' };
          var _faNum = { '۰': 0, '۱': 1, '۲': 2, '۳': 3, '۴': 4, '۵': 5, '۶': 6, '۷': 7, '۸': 8, '۹': 9 };
          var _toEn = function (s) { return String(s).replace(/[۰-۹]/g, function (c) { return _faNum[c]; }); };
          var _parts = String(settings.prayerAdjCustom).split(',');
          for (var _pi = 0; _pi < _parts.length; _pi++) {
            var _raw = _toEn(_parts[_pi]).trim();
            var _m = _raw.match(/^([a-zA-Z]+)\s*([+\-]?\d+)$/i);
            if (!_m) continue;
            var _nm = _m[1].toLowerCase();
            var _key = _nameMap[_nm] || _nm;
            if (_key === _k) {
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
      // تبدیل ساعت اعشاری به epoch ms امروز
      function toMs(h) {
        if (h == null) return 0;
        var d = new Date();
        d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
        return d.getTime();
      }
      var data = {
        app: 'BalochistanNama',
        date: new Date().toISOString().slice(0, 10),
        times: {
          fajr: toMs(times.fajr),
          dhuhr: toMs(times.dhuhr),
          asr: toMs(times.asr),
          maghrib: toMs(times.maghrib),
          isha: toMs(times.isha)
        },
        timeLabels: {
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
      // تنظیمات اذان برای سرویس اندروید (v1.11) — پخش با اپ بسته
      try {
        data.athan = {
          enabled: !!(settings.athanAuto && settings.athanSound && settings.persistentNotif),
          preEnabled: !!settings.athanPre,
          preMinutes: settings.athanPreMin || 10,
          vibrate: !!settings.athanVibrate,
          file: '/data/data/ir.balochistan.nama/files/athan_selected.mp3'
        };
        // کپی فایل اذان انتخابی به filesDir برای سرویس (async، بی‌صدا)
        var selItem = (typeof Athan !== 'undefined' && Athan.getSel) ? Athan.getById(Athan.getSel().athan) : null;
        if (selItem && selItem.type === 'file' && selItem.data) {
          var src = selItem.data;
          fetch(src).then(function (r) { return r.blob(); }).then(function (blob) {
            return new Promise(function (res) {
              var fr = new FileReader();
              fr.onload = function () { res(String(fr.result).split(',')[1] || ''); };
              fr.readAsDataURL(blob);
            });
          }).then(function (b64) {
            return window.Filesystem.writeFile({
              path: 'athan_selected.mp3', data: b64,
              directory: 'DATA', encoding: 'base64', recursive: true
            });
          }).catch(function () {});
        }
      } catch (e) {}
      // آب‌وهوا برای ویجت (v1.9)
      try {
        var wc = JSON.parse(localStorage.getItem('blx_weather_cache') || 'null');
        if (wc && wc.weather) {
          var w = wc.weather;
          data.weather = {
            temp: (w.current && w.current.temperature_2m != null) ? Math.round(w.current.temperature_2m) : null,
            code: (w.current && w.current.weather_code != null) ? w.current.weather_code : null,
            wind: (w.current && w.current.wind_speed_10m != null) ? Math.round(w.current.wind_speed_10m) : null
          };
        }
      } catch (e) {}
      // تاریخ‌های سه‌گانه برای ویجت تقویم (v1.9)
      try {
        if (state.triple) {
          data.jalali = Cal.fmtJalaliLong(state.triple.jalali);
          data.hijri = Cal.fmtHijriLong(state.triple.hijri);
          data.weekday = Cal.WEEKDAYS_FA_SAT_FIRST[state.triple.weekdaySatFirst];
        }
      } catch (e) {}
      // Today's + tomorrow's events for the persistent notification
      try {
        var _todayEvs = Events.getDayEvents(state.triple.jalali, state.triple.greg, state.triple.hijri, { isFriday: state.triple.weekdaySatFirst === 6 });
        var _tom = new Date(state.today.getTime() + 86400000);
        var _tomTrip = Cal.dateToTriple(_tom);
        var _tomEvs = Events.getDayEvents(_tomTrip.jalali, _tomTrip.greg, _tomTrip.hijri, { isFriday: _tomTrip.weekdaySatFirst === 6 });
        var _todayNames = _todayEvs.map(function (e) { return e.title; }).slice(0, 3).join('، ');
        var _tomNames = _tomEvs.map(function (e) { return e.title; }).slice(0, 3).join('، ');
        data.eventToday = _todayNames;
        data.eventTomorrow = _tomNames;
      } catch (e) {}
      window.Filesystem.writeFile({
        path: 'widget_data.json',
        data: JSON.stringify(data),
        directory: 'DATA',
        encoding: 'utf8'
      }).then(function () {
        if (window.NativeApp && NativeApp.syncWidgets) { try { NativeApp.syncWidgets(); } catch (e) {} }
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

    // Daily verse + proverb card (always on top)
    var dailyHtml = '';
    try {
      var doy = state.triple ? Cal.jalaliDayOfYear(state.triple.jalali.jy, state.triple.jalali.jm, state.triple.jalali.jd) : 1;
      var vPoem = Baloch.verseOfDay(doy);
      var vProverb = Baloch.proverbOfDay(doy);
      if (vPoem) {
        dailyHtml +=
          '<div class="culture-daily">' +
            '<div class="culture-daily__badge">🌸 شعر امروز — ' + escapeHtml(vPoem.poet) + '</div>' +
            '<div class="culture-daily__balochi">' + escapeHtml(vPoem.lines[0].balochi) + '</div>' +
            '<div class="culture-daily__fa">' + escapeHtml(vPoem.lines[0].fa) + '</div>' +
          '</div>';
      }
      if (vProverb) {
        dailyHtml +=
          '<div class="culture-daily culture-daily--proverb">' +
            '<div class="culture-daily__badge">💬 ضرب‌المثل امروز</div>' +
            '<div class="culture-daily__balochi">' + escapeHtml(vProverb.balochi) + '</div>' +
            '<div class="culture-daily__fa">' + escapeHtml(vProverb.fa) + '</div>' +
          '</div>';
      }
    } catch (e) {}

    // Build tabs
    var tabsHtml = 
      '<div class="culture-tabs">' +
        '<button class="culture-tab' + (cultureTab === 'poetry' ? ' active' : '') + '" data-tab="poetry">📜 شعر</button>' +
        '<button class="culture-tab' + (cultureTab === 'proverbs' ? ' active' : '') + '" data-tab="proverbs">💬 ضرب‌المثل</button>' +
        '<button class="culture-tab' + (cultureTab === 'stories' ? ' active' : '') + '" data-tab="stories">📖 داستان</button>' +
        '<button class="culture-tab' + (cultureTab === 'history' ? ' active' : '') + '" data-tab="history">🏛️ تاریخ</button>' +
        '<button class="culture-tab' + (cultureTab === 'learn' ? ' active' : '') + '" data-tab="learn">🗣️ یادگیری</button>' +
        '<button class="culture-tab' + (cultureTab === 'rooze' ? ' active' : '') + '" data-tab="rooze">☪️ روزه</button>' +
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
    } else if (cultureTab === 'learn') {
      if (typeof Learn !== 'undefined') {
        contentHtml =
          '<div class="section-title">🗣️ واژه‌های بلوچی</div>' +
          Learn.renderVocab() +
          '<div class="section-title">💬 جمله‌های روزمره</div>' +
          Learn.renderPhrases() +
          '<div class="section-title">🧠 بلوچی را حدس بزن</div>' +
          Learn.renderQuiz();
      } else {
        contentHtml = '<div class="text-muted">ماژول یادگیری در دسترس نیست</div>';
      }
    } else if (cultureTab === 'rooze') {
      contentHtml = renderRoozeContent();
    } else if (cultureTab === 'quiz') {
      contentHtml = renderQuizContent();
    }
    
    container.innerHTML = tabsHtml + '<div class="culture-content">' + dailyHtml + contentHtml + '</div>';
    
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
    // Wire learn quiz
    if (cultureTab === 'learn' && typeof Learn !== 'undefined' && Learn.wireQuiz) {
      Learn.wireQuiz();
    }
    // Wire poem share buttons
    container.querySelectorAll('.poem-share').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx, 10);
        if (Baloch.POEMS && Baloch.POEMS[idx]) sharePoemImage(Baloch.POEMS[idx]);
      });
    });
    // Wire poem play buttons
    container.querySelectorAll('.poem-play').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(btn.dataset.idx, 10);
        if (Baloch.POEMS && Baloch.POEMS[idx]) {
          var text = Baloch.POEMS[idx].lines.map(function (l) { return l.balochi; }).join('، ');
          speakText(text, 'fa-IR');
          if (App && App.toast) App.toast('در حال پخش: ' + Baloch.POEMS[idx].poet);
        }
      });
    });
  }

  // Share a poem as an image card (canvas)
  function sharePoemImage(poem) {
    var cv = document.createElement('canvas');
    cv.width = 1080; cv.height = 1350;
    var ctx = cv.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 1080, 1350);
    g.addColorStop(0, '#1b2540'); g.addColorStop(0.5, '#3a2a5a'); g.addColorStop(1, '#0b0e14');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = '#d4a73c'; ctx.fillRect(0, 0, 1080, 14);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d4a73c'; ctx.font = 'bold 48px sans-serif';
    ctx.fillText('بلوچستان نما — شعر بلوچی', 540, 110);
    ctx.fillStyle = '#b6bdc9'; ctx.font = '32px sans-serif';
    ctx.fillText(poem.poet, 540, 170);
    ctx.fillStyle = '#6a7283'; ctx.font = '24px sans-serif';
    ctx.fillText(poem.yearRange || '', 540, 205);
    var y = 290;
    for (var i = 0; i < poem.lines.length; i++) {
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 40px sans-serif';
      ctx.fillText(poem.lines[i].balochi, 540, y);
      y += 55;
      ctx.fillStyle = '#f1f3f6'; ctx.font = '30px sans-serif';
      ctx.fillText(poem.lines[i].fa, 540, y);
      y += 75;
    }
    if (poem.bio) {
      ctx.fillStyle = '#6a7283'; ctx.font = '24px sans-serif';
      ctx.fillText(poem.bio.slice(0, 60) + '...', 540, Math.max(y + 40, 1250));
    }
    ctx.fillStyle = '#6a7283'; ctx.font = '28px sans-serif';
    ctx.fillText('🌄 دنیای میثم — هرمی خدا، میثم بندهٔ خدا', 540, 1300);
    cv.toBlob(function (blob) {
      if (!blob) { if (App && App.toast) App.toast('خطا در ساخت تصویر'); return; }
      var file = new File([blob], 'balochistan-nama-poem.png', { type: 'image/png' });
      var url = URL.createObjectURL(blob);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'شعر بلوچی', text: poem.poet }).catch(function () {});
      } else {
        var a = document.createElement('a');
        a.href = url; a.download = 'balochistan-nama-poem.png';
        document.body.appendChild(a); a.click(); a.remove();
        if (App && App.toast) App.toast('تصویر ذخیره شد ✓');
      }
    }, 'image/png');
  }

  function renderPoetryContent() {
    var html = '';
    for (var p = 0; p < Baloch.POEMS.length; p++) {
      var poem = Baloch.POEMS[p];      var linesHtml = '';
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
          '<div style="display:flex; gap:6px; margin-top:8px;">' +
            '<button class="btn btn--ghost poem-play" data-idx="' + p + '" style="font-size:12px;">🔊 پخش شعر</button>' +
            '<button class="btn btn--ghost poem-share" data-idx="' + p + '" style="font-size:12px;">🖼️ اشتراک تصویر</button>' +
          '</div>' +
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

  function renderRoozeContent() {
    // Show 606 Q&A about fasting, with search.
    if (typeof window.RoozeQA === 'undefined' || !window.RoozeQA.length) {
      return '<div class="text-muted">محتوا در دسترس نیست</div>';
    }
    var qa = window.RoozeQA;
    var html = '<div class="text-small text-muted" style="margin-bottom:8px;">📖 ' + qa.length + ' سؤال و جواب درباره روزه — از کتاب «روزه (۶۰۶ سؤال و جواب)» دکتر راشد سعد العلیمی</div>' +
      '<input class="input" id="roozeSearch" placeholder="🔍 جستجو در سؤال‌ها..." style="width:100%; margin-bottom:8px;" oninput="renderRoozeList(this.value)">' +
      '<div id="roozeList"></div>';
    // Store for filter
    window.__roozeQA = qa;
    setTimeout(function () { renderRoozeList(''); }, 0);
    return html;
  }

  function renderRoozeList(q) {
    var qa = window.__roozeQA || [];
    var el = document.getElementById('roozeList');
    if (!el) return;
    var query = String(q || '').trim().toLowerCase();
    var filtered = query ? qa.filter(function (item) { return (item.q || '').toLowerCase().indexOf(query) >= 0 || (item.a || '').toLowerCase().indexOf(query) >= 0; }) : qa;
    if (filtered.length === 0) {
      el.innerHTML = '<div class="text-muted text-center" style="padding:20px;">موردی یافت نشد</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < filtered.length; i++) {
      var item = filtered[i];
      html +=
        '<div class="rooze-item">' +
          '<div class="rooze-item__q">❓ ' + escapeHtml(item.n + '. ' + item.q) + '</div>' +
          '<div class="rooze-item__a">✅ ' + escapeHtml(item.a) + '</div>' +
        '</div>';
    }
    el.innerHTML = html;
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
  // Tracks which date group (jalali/gregorian/hijri) the user last edited.
  var converterSource = 'jalali';
  function setConverterSource(src) { converterSource = src; }

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
      converterSource = 'jalali';
      updateConverter();
    }
  }
  function closeConverter() {
    document.getElementById('modalConverter').classList.remove('show');
  }
  function updateConverter() {
    var jy = getVal('cvJy'), jm = getVal('cvJm'), jd = getVal('cvJd');
    var gy = getVal('cvGy'), gm = getVal('cvGm'), gd = getVal('cvGd');
    var hy = getVal('cvHy'), hm = getVal('cvHm'), hd = getVal('cvHd');
    var weekdayStr = '';
    var tripleInfo = null;
    // Only convert when the source group has all three fields filled.
    if (converterSource === 'jalali' && jy && jm && jd) {
      try {
        var g = Cal.toGregorian(jy, jm, jd);
        setVal('cvGy', g.gy); setVal('cvGm', g.gm); setVal('cvGd', g.gd);
        var h = Cal.gregToHijri(g.gy, g.gm, g.gd);
        if (settings.hijriAdjust) h = Cal.adjustHijri(h.hy, h.hm, h.hd, settings.hijriAdjust);
        setVal('cvHy', h.hy); setVal('cvHm', h.hm); setVal('cvHd', h.hd);
        var dt = new Date(g.gy, g.gm - 1, g.gd);
        weekdayStr = Cal.WEEKDAYS_FA_SAT_FIRST[(dt.getDay() + 1) % 7];
        tripleInfo = { jalali: { jy: jy, jm: jm, jd: jd }, greg: g, hijri: h, weekdaySatFirst: (dt.getDay() + 1) % 7 };
      } catch (e) {}
    } else if (converterSource === 'gregorian' && gy && gm && gd) {
      try {
        var j = Cal.toJalaali(gy, gm, gd);
        setVal('cvJy', j.jy); setVal('cvJm', j.jm); setVal('cvJd', j.jd);
        var h2 = Cal.gregToHijri(gy, gm, gd);
        if (settings.hijriAdjust) h2 = Cal.adjustHijri(h2.hy, h2.hm, h2.hd, settings.hijriAdjust);
        setVal('cvHy', h2.hy); setVal('cvHm', h2.hm); setVal('cvHd', h2.hd);
        var dt2 = new Date(gy, gm - 1, gd);
        weekdayStr = Cal.WEEKDAYS_FA_SAT_FIRST[(dt2.getDay() + 1) % 7];
        tripleInfo = { jalali: j, greg: { gy: gy, gm: gm, gd: gd }, hijri: h2, weekdaySatFirst: (dt2.getDay() + 1) % 7 };
      } catch (e) {}
    } else if (converterSource === 'hijri' && hy && hm && hd) {
      try {
        var g2 = Cal.hijriToGreg(hy, hm, hd);
        setVal('cvGy', g2.gy); setVal('cvGm', g2.gm); setVal('cvGd', g2.gd);
        var j2 = Cal.toJalaali(g2.gy, g2.gm, g2.gd);
        setVal('cvJy', j2.jy); setVal('cvJm', j2.jm); setVal('cvJd', j2.jd);
        var dt3 = new Date(g2.gy, g2.gm - 1, g2.gd);
        weekdayStr = Cal.WEEKDAYS_FA_SAT_FIRST[(dt3.getDay() + 1) % 7];
        tripleInfo = { jalali: j2, greg: g2, hijri: { hy: hy, hm: hm, hd: hd }, weekdaySatFirst: (dt3.getDay() + 1) % 7 };
      } catch (e) {}
    }
    // Show weekday + events for the converted date
    var info = weekdayStr ? 'روز هفته: ' + weekdayStr : '';
    if (tripleInfo && typeof Events !== 'undefined' && Events.getDayEvents) {
      var evs = Events.getDayEvents(tripleInfo.jalali, tripleInfo.greg, tripleInfo.hijri, { isFriday: tripleInfo.weekdaySatFirst === 6 });
      if (evs.length) {
        info += ' • ' + evs.slice(0, 3).map(function (ev) { return ev.title; }).join(' • ');
      }
    }
    setText('cvWeekday', info);
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
    setVal('setAsrMode', settings.asrMode || 'method');
    setToggle('setPersistentNotif', settings.persistentNotif);
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
    var asrSel = document.getElementById('setAsrMode');
    if (asrSel) settings.asrMode = asrSel.value;
    window.__asrMode = (settings.asrMode && settings.asrMode !== 'method') ? settings.asrMode : null;
    // Persistent notification (foreground service) toggle
    settings.persistentNotif = getToggle('setPersistentNotif');
    try {
      if (settings.persistentNotif) {
        writeWidgetData();
        if (typeof NativeApp !== 'undefined' && NativeApp.startPersistentNotification) NativeApp.startPersistentNotification();
      } else {
        if (typeof NativeApp !== 'undefined' && NativeApp.stopPersistentNotification) NativeApp.stopPersistentNotification();
      }
    } catch (e) {}
    var athanSnd = document.getElementById('athanSoundToggle');
    if (athanSnd) settings.athanSound = athanSnd.classList.contains('on');
    var sysRng = document.getElementById('athanSystemToggle');
    if (sysRng) settings.showSystemRingtones = sysRng.classList.contains('on');
    settings.prayerAdjAll = getVal('setPrayerAdjAll') || 0;
    var _singleSel = document.getElementById('setPrayerSingle');
    settings.prayerAdjSingle = {
      prayer: _singleSel ? _singleSel.value : 'fajr',
      adj: getVal('setPrayerSingleAdj') || 0
    };
    var _customIn = document.getElementById('setPrayerCustom');
    settings.prayerAdjCustom = _customIn ? String(_customIn.value).trim() : '';
    var fontSel = document.getElementById('setFont');
    settings.fontScale = fontSel ? (parseFloat(fontSel.value) || 1) : 1;
    settings.stickyPrayer = getToggle('setStickyPrayer');
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
      st.addEventListener('click', function () { settings.showSystemRingtones = st.classList.contains('on'); saveSettings(); toast('تنظیم ذخیره شد'); });
    }
    refreshAthanSelectors();

    // ===== دکمه‌های پخش تست (شروع/مکث/توقف) =====
    var test = document.getElementById('athanTest');
    var pauseBtn = document.getElementById('athanPause');
    var stopBtn = document.getElementById('athanStop');
    var statusEl = document.getElementById('athanStatus');
    function updStatus() {
      if (!statusEl) return;
      var stt = Athan.status();
      statusEl.textContent = 'وضعیت: ' + (stt.playing ? '▶️ در حال پخش' : (stt.paused ? '⏸️ مکث' : 'متوقف'));
    }
    if (test) test.addEventListener('click', function () {
      Athan.play(); // از انتخاب فعلی — یا ادامه از مکث
      setTimeout(updStatus, 150);
    });
    if (pauseBtn) pauseBtn.addEventListener('click', function () {
      var stt = Athan.status();
      if (stt.paused) { Athan.resume(); toast('▶️ ادامه پخش'); }
      else { Athan.pause(); toast('⏸️ پخش متوقف شد'); }
      setTimeout(updStatus, 150);
    });
    if (stopBtn) stopBtn.addEventListener('click', function () {
      Athan.stop(); toast('⏹️ پخش قطع شد');
      setTimeout(updStatus, 150);
    });
    setInterval(updStatus, 2000);

    // ===== افزودن از فایل (blob → base64) =====
    var addSys = document.getElementById('athanAddSys');
    var file = document.getElementById('athanFile');
    if (addSys && file) addSys.addEventListener('click', function () { file.click(); });
    if (file) file.addEventListener('change', function () {
      var f = file.files[0]; if (!f) return;
      var name = f.name.replace(/\.[^.]+$/, '');
      var fr = new FileReader();
      fr.onload = function () {
        var b64 = String(fr.result).split(',')[1];
        Athan.addItem(name, 'file64', b64);
        refreshAthanSelectors(); renderAthanUserList();
        toast('صدا اضافه شد: ' + name);
      };
      fr.readAsDataURL(f);
      file.value = '';
    });

    // ===== پنل دانلود =====
    var dl = document.getElementById('athanDownload');
    var panel = document.getElementById('athanDownloadPanel');
    if (dl && panel) dl.addEventListener('click', function () { panel.style.display = (panel.style.display === 'none') ? 'block' : 'none'; });
    var dlAdd = document.getElementById('athanDlAdd');
    if (dlAdd) dlAdd.addEventListener('click', function () {
      var url = document.getElementById('athanDlUrl').value.trim();
      if (!url) { toast('لینک را وارد کن'); return; }
      var name = document.getElementById('athanDlName').value.trim() || 'صدای دانلودی';
      var id = Athan.addItem(name, 'file', url);
      refreshAthanSelectors(); renderAthanUserList();
      document.getElementById('athanDlUrl').value = '';
      document.getElementById('athanDlName').value = '';
      if (panel) panel.style.display = 'none';
      toast('صدا اضافه شد ✓');
    });

    // ===== تنظیمات جدید: هشدار قبل اذان + ویبره + اقامه =====
    var preT = document.getElementById('athanPreToggle');
    if (preT) {
      setToggle('athanPreToggle', !!settings.athanPre);
      preT.addEventListener('click', function (ev) {
        ev.stopImmediatePropagation(); // جلوگیری از listener خط init (که بعدا bind می‌شود)
        preT.classList.toggle('on');
        settings.athanPre = preT.classList.contains('on');
        var row = document.getElementById('athanPreMinRow');
        if (row) row.style.display = settings.athanPre ? '' : 'none';
        saveSettings();
      }, true);
    }
    var preRow = document.getElementById('athanPreMinRow');
    if (preRow) preRow.style.display = settings.athanPre ? '' : 'none';
    var preMin = document.getElementById('athanPreMinSel');
    if (preMin) {
      preMin.value = String(settings.athanPreMin || 10);
      preMin.addEventListener('change', function () { settings.athanPreMin = parseInt(preMin.value, 10) || 10; saveSettings(); });
    }
    var vibT = document.getElementById('athanVibrateToggle');
    if (vibT) {
      setToggle('athanVibrateToggle', !!settings.athanVibrate);
      vibT.addEventListener('click', function (ev) {
        ev.stopImmediatePropagation();
        vibT.classList.toggle('on');
        settings.athanVibrate = vibT.classList.contains('on');
        saveSettings();
        if (settings.athanVibrate && typeof NativeApp !== 'undefined' && NativeApp.vibrate) { try { NativeApp.vibrate(600); } catch (e) {} }
      }, true);
    }
    var iqama = document.getElementById('athanIqamaSel');
    if (iqama) {
      iqama.value = String(settings.athanIqama != null ? settings.athanIqama : 15);
      iqama.addEventListener('change', function () { settings.athanIqama = parseInt(iqama.value, 10) || 0; saveSettings(); });
    }

    renderAthanUserList();
  }

  // ===== رندر لیست اذان‌های کاربر (ویرایش/حذف) =====
  function renderAthanUserList() {
    var box = document.getElementById('athanUserList');
    if (!box || typeof Athan === 'undefined') return;
    var lib = Athan.getLib();
    var html = '';
    var userCount = 0;
    lib.forEach(function (it) {
      if (it.builtin) return;
      userCount++;
      html += '<div class="note" style="padding:8px; display:flex; align-items:center; justify-content:space-between; gap:8px;" data-athid="' + it.id + '">' +
        '<span style="flex:1; font-size:13px;">🔊 ' + escapeHtml(it.name) + '</span>' +
        '<span style="display:flex; gap:4px;">' +
        '<button class="btn btn--ghost" data-athact="edit" style="padding:4px 10px; font-size:12px;">✏️ ویرایش</button>' +
        '<button class="btn btn--ghost" data-athact="del" style="padding:4px 10px; font-size:12px; color:#f87171;">🗑️ حذف</button>' +
        '</span></div>';
    });
    if (!userCount) html = '<div class="text-small text-muted">هنوز صدای شخصی اضافه نکرده‌ای — از دکمه‌های بالا اضافه کن.</div>';
    box.innerHTML = html;
    // رویدادها
    box.querySelectorAll('[data-athact]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.closest('[data-athid]').getAttribute('data-athid');
        var act = btn.getAttribute('data-athact');
        if (act === 'del') {
          if (confirm('این صدا حذف شود؟')) {
            Athan.removeItem(id);
            refreshAthanSelectors(); renderAthanUserList();
            toast('حذف شد');
          }
        } else if (act === 'edit') {
          var it = Athan.getById(id);
          if (!it) return;
          var newName = prompt('نام جدید این صدا:', it.name);
          if (newName && newName.trim()) {
            Athan.updateItem(id, { name: newName.trim() });
            refreshAthanSelectors(); renderAthanUserList();
            toast('نام تغییر کرد ✓');
          }
        }
      });
    });
  }

  function checkAthan() {
    if (!settings.athanAuto || !settings.athanSound) return;
    var pt = state.prayerTimes;
    if (!pt) return;
    var now = new Date();
    var nowH = now.getHours() + now.getMinutes() / 60;
    var names = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']; // طلوع اذان نیست!
    var played = {};
    try { played = JSON.parse(localStorage.getItem('blx_athan_played') || '{}'); } catch (e) {}
    for (var i = 0; i < names.length; i++) {
      var k = names[i];
      var t = pt[k];
      if (t == null) continue;
      var stamp = now.getDate() + '-' + (now.getMonth() + 1) + '-' + now.getFullYear() + '-' + k;
      if (played[stamp]) continue;
      // در ۹۰ ثانیه اول وقت
      if (nowH >= t && nowH < t + 1.5 / 60) {
        played[stamp] = 1;
        try { localStorage.setItem('blx_athan_played', JSON.stringify(played)); } catch (e) {}
        if (typeof Athan !== 'undefined') { try { Athan.play(); } catch (e) {} }
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
    // Calendar mode toggle (jalali / gregorian / hijri)
    document.querySelectorAll('.mode-btn').forEach(function (mb) {
      mb.addEventListener('click', function () {
        state.calMode = mb.dataset.mode;
        // Convert cursor to the new mode's reference frame
        var triple = state.triple;
        if (state.calMode === 'gregorian') {
          state.calCursor = { jy: triple.greg.gy - 621, jm: triple.greg.gm };
        } else if (state.calMode === 'hijri') {
          state.calCursor = { jy: triple.hijri.hy + 621 - 1380, jm: triple.hijri.hm };
        } else {
          state.calCursor = { jy: triple.jalali.jy, jm: triple.jalali.jm };
        }
        renderCalendar();
      });
    });

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
    // Jalali input → set source, then convert
    ['cvJy','cvJm','cvJd'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { converterSource = 'jalali'; updateConverter(); });
    });
    // Gregorian input → set source, then convert
    ['cvGy','cvGm','cvGd'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { converterSource = 'gregorian'; updateConverter(); });
    });
    // Hijri input → set source, then convert
    ['cvHy','cvHm','cvHd'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { converterSource = 'hijri'; updateConverter(); });
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
      // Asr method is now in Settings (setAsrMode) - applied via applySettingsFromForm
      window.__asrMode = (settings.asrMode && settings.asrMode !== 'method') ? settings.asrMode : null;
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

    // Auto-start persistent prayer notification if enabled
    setTimeout(function () {
      try {
        if (settings.persistentNotif && typeof NativeApp !== 'undefined' && NativeApp.startPersistentNotification) {
          writeWidgetData();
          NativeApp.startPersistentNotification();
        }
      } catch (e) {}
    }, 1500);
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
  // Expose rooze list renderer globally (used by inline oninput)
  if (typeof window !== 'undefined') window.renderRoozeList = renderRoozeList;

  var App = {
    init: init,
    go: go,
    toast: toast,
    getSettings: function () { return settings; },
    saveSettings: saveSettings,
    getState: function () { return state; },
    searchDayEvents: searchDayEvents,
    searchAllEvents: searchAllEvents,
    openConverter: openConverter
  };
  if (typeof window !== 'undefined') window.App = App;

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(typeof window !== 'undefined' ? window : this);

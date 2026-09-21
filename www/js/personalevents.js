/* ============================================================
   Balochistan Nama - Personal Events module (personalevents.js)
   v2: تولد/سالگرد/تسک/رویداد + ساعت + رنگ + تکرار (RRULE ساده)
   + مکان + مهمان‌ها + ICS ورودی/خروجی + رویدادهای آینده
   ============================================================ */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'blx_personal_events';

  // پالت رنگ رویداد (هماهنگ با نقطه‌های تقویم)
  var COLORS = {
    green:  '#2a9d8f',
    blue:   '#457b9d',
    red:    '#e63946',
    purple: '#9d4edd',
    orange: '#ff9f1c',
    pink:   '#d63384',
    teal:   '#7bdff2',
    amber:  '#b08d2e'
  };
  var COLOR_KEYS = Object.keys(COLORS);

  function escapeHtml(s) {
    if (global.escapeHtml) return global.escapeHtml(s);
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function colorOf(ev) {
    if (ev && COLORS[ev.color]) return COLORS[ev.color];
    if (ev && ev.color && /^#/.test(ev.color)) return ev.color;
    // رنگ خودکار بر اساس هش عنوان
    var t = (ev && ev.title) || '';
    var h = 0;
    for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) & 0xffff;
    return COLOR_KEYS[h % COLOR_KEYS.length] && COLORS[COLOR_KEYS[h % COLOR_KEYS.length]] || COLORS.green;
  }

  function getAll() {
    try {
      var arr = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }

  function save(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function add(event) {
    var evs = getAll();
    event.id = Date.now() + Math.floor(Math.random() * 1000);
    if (!COLORS[event.color]) event.color = null;
    evs.push(event);
    save(evs);
    return event.id;
  }

  function update(id, patch) {
    var evs = getAll();
    for (var i = 0; i < evs.length; i++) {
      if (evs[i].id === id) { evs[i] = Object.assign({}, evs[i], patch); break; }
    }
    save(evs);
  }

  function remove(id) {
    save(getAll().filter(function (e) { return e.id !== id; }));
  }

  function getById(id) {
    return getAll().filter(function (e) { return e.id === id; })[0] || null;
  }

  function getForDate(jy, jm, jd) {
    return getAll().filter(function (e) {
      return e.jy === jy && e.jm === jm && e.jd === jd;
    });
  }

  // ---------- روز هفته (شنبه=0 ... جمعه=6) برای یک تاریخ شمسی ----------
  function weekdaySatFirst(jy, jm, jd) {
    try {
      var C = global.Cal;
      if (C && C.toGregorian) {
        var g = C.toGregorian(jy, jm, jd);
        if (g) return (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7;
      }
    } catch (e) {}
    return null;
  }

  function dayCount(g) { return Math.round(g.getTime() / 86400000); }

  // آیا رویداد e در تاریخ (jy,jm,jd) رخ می‌دهد؟ (با تکرار)
  function matchesDate(e, jy, jm, jd) {
    if (e.jy === jy && e.jm === jm && e.jd === jd) return true;
    var rep = e.repeat || 'none';
    if (rep === 'none' || !rep) return false;
    if (jy < e.jy) return false;
    if (rep === 'yearly') {
      // همان ماه/روز در سال‌های بعد (تولدها)
      if (jm !== e.jm || jd !== e.jd) return false;
      return jy > e.jy || (jy === e.jy && jm >= e.jm);
    }
    if (rep === 'monthly') {
      if (jd !== e.jd) return false;
      if (jy < e.jy) return false;
      if (jy === e.jy && jm < e.jm) return false;
      return true;
    }
    if (rep === 'weekly') {
      var ws = weekdaySatFirst(e.jy, e.jm, e.jd);
      var wt = weekdaySatFirst(jy, jm, jd);
      if (ws === null || wt === null || ws !== wt) return false;
      if (jy < e.jy) return false;
      return true; // روزهای بعدی همان هفته؛ برای گذشته کمتر مهم است
    }
    return false;
  }

  // رویدادهای فعال در یک روز (با گسترش تکرار)
  function occurrencesOn(jy, jm, jd) {
    return getAll().filter(function (e) { return matchesDate(e, jy, jm, jd); });
  }

  // بررسی سریع برای نقطه‌های سلول ماهانه
  function hasEvents(jy, jm, jd) {
    return occurrencesOn(jy, jm, jd).length > 0;
  }

  // رویدادهای روز (برای چیپ‌ها/لیست) — با meta
  function getEventsForCell(jy, jm, jd) {
    return occurrencesOn(jy, jm, jd).map(function (e) {
      var icon = e.type === 'birthday' ? '🎂' : e.type === 'anniversary' ? '💍' : e.type === 'task' ? '✅' : '📌';
      return {
        type: 'personal',
        title: (e.task ? '✅ ' : icon + ' ') + e.title,
        desc: e.desc || '',
        tags: { personal: true },
        cal: 'personal',
        daysDate: { jy: e.jy, jm: e.jm, jd: e.jd },
        etype: e.type,
        pe: e,
        color: colorOf(e),
        time: e.time || null,
        timeEnd: e.timeEnd || null,
        repeat: e.repeat || 'none',
        task: !!e.task,
        location: e.location || '',
        guests: e.guests || ''
      };
    });
  }

  // v1.18: رویدادهای یک روز برای نماهای هفتگی/روزانه (نسخهٔ غنی‌شده با .ev)
  function eventsOn(arg) {
    var jy, jm, jd;
    if (arg instanceof Array) { jy = arg[0]; jm = arg[1]; jd = arg[2]; }
    else { jy = arg.jy; jm = arg.jm; jd = arg.jd; }
    return getEventsForCell(jy, jm, jd).map(function (item) {
      item.ev = item.pe;
      return item;
    });
  }

  // ویرایش رویداد از نماها (هفتگی/روزانه/اجنده)
  function edit(id) {
    var ev = getById(typeof id === 'string' ? parseInt(id, 10) : id);
    if (!ev) return;
    fillForm(ev);
    var m = document.getElementById('modalPersonalEvents');
    if (m) m.classList.add('show');
    var listEl = document.getElementById('personalEventList');
    if (listEl) listEl.dataset.editId = ev.id;
    var cb = document.getElementById('peCancelEdit');
    if (cb) cb.style.display = '';
    renderList('personalEventList');
  }

  // ---------- لیست رویدادهای آینده (اجنده) ----------
  function upcoming(fromJy, fromJm, fromJd, days) {
    days = days || 30;
    var C = global.Cal;
    var out = [];
    if (!C || !C.toGregorian || !C.toJalaali) return out;
    // تبدیل from به روزهای بعدی
    var baseG = C.toGregorian(fromJy, fromJm, fromJd);
    var baseDate = new Date(baseG.gy, baseG.gm - 1, baseG.gd);
    var evs = getAll();
    for (var d = 0; d < days; d++) {
      var date = new Date(baseG.gy, baseG.gm - 1, baseG.gd + d);
      var j = C.toJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
      (function (jDate, dayIdx) {
        var dayEvs = evs.filter(function (e) { return matchesDate(e, jDate.jy, jDate.jm, jDate.jd); });
        if (!dayEvs.length) return;
        out.push({
          jy: jDate.jy, jm: jDate.jm, jd: jDate.jd,
          dayIdx: dayIdx,
          events: dayEvs.map(function (e) {
            var icon = e.type === 'birthday' ? '🎂' : e.type === 'anniversary' ? '💍' : e.type === 'task' ? '✅' : '📌';
            return {
              id: e.id, icon: icon, title: e.title, color: colorOf(e),
              time: e.time || null, timeEnd: e.timeEnd || null,
              repeat: e.repeat || 'none', task: !!e.task,
              location: e.location || '', guests: e.guests || '',
              ev: e
            };
          })
        });
      })(j, d);
    }
    return out;
  }

  // ---------- ICS خروجی ----------
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function foldLine(s) {
    s = String(s).replace(/\r?\n/g, '\\n');
    var out = '';
    while (s.length > 73) { out += s.slice(0, 73) + '\r\n '; s = s.slice(73); }
    return out + s;
  }
  function icsEsc(s) {
    return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }
  function toICS(ev) {
    var C = global.Cal;
    var g = C && C.toGregorian ? C.toGregorian(ev.jy, ev.jm, ev.jd) : null;
    if (!g) return '';
    var allDay = !ev.time;
    var start = allDay
      ? g.gy + pad2(g.gm) + pad2(g.gd)
      : g.gy + pad2(g.gm) + pad2(g.gd) + 'T' + pad2(parseInt(ev.time.slice(0, 2), 10)) + pad2(parseInt(ev.time.slice(3, 5), 10)) + '00';
    var rrule = '';
    if (ev.repeat === 'yearly') rrule = 'RRULE:FREQ=YEARLY;BYMONTH=' + pad2(g.gm) + ';BYMONTHDAY=' + pad2(g.gd) + '\r\n';
    else if (ev.repeat === 'monthly') rrule = 'RRULE:FREQ=MONTHLY;BYMONTHDAY=' + pad2(g.gd) + '\r\n';
    else if (ev.repeat === 'weekly') rrule = 'RRULE:FREQ=WEEKLY\r\n';
    var loc = ev.location ? 'LOCATION:' + icsEsc(ev.location) + '\r\n' : '';
    var guest = ev.guests ? 'CATEGORIES:' + icsEsc('مهمان: ' + ev.guests) + '\r\n' : '';
    var body =
      'BEGIN:VEVENT\r\n' +
      'UID:balochistan-' + ev.id + '@balochistan-nama\r\n' +
      'DTSTART' + (allDay ? ';VALUE=DATE' : '') + ':' + start + '\r\n' +
      (allDay ? '' : 'DURATION:PT1H\r\n') +
      'SUMMARY:' + icsEsc(ev.title) + '\r\n' +
      (rrule ? rrule : '') +
      loc + guest +
      'END:VEVENT\r\n';
    return body;
  }
  function buildICS() {
    var evs = getAll();
    var now = new Date();
    var stamp = now.getUTCFullYear() + pad2(now.getUTCMonth() + 1) + pad2(now.getUTCDate()) + 'T' +
      pad2(now.getUTCHours()) + pad2(now.getUTCMinutes()) + pad2(now.getUTCSeconds()) + 'Z';
    var ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//BalochistanNama//PersonalEvents//FA\r\nCALSCALE:GREGORIAN\r\n';
    for (var i = 0; i < evs.length; i++) {
      ics += toICS(evs[i]).split('\r\n').map(foldLine).join('\r\n') + '\r\n';
    }
    return ics + 'END:VCALENDAR\r\n';
  }

  // ---------- ICS ورودی ----------
  function parseICS(text) {
    var C = global.Cal;
    if (!C || !C.toJalaali) return [];
    var lines = String(text).replace(/\r\n/g, '\n').split('\n');
    // ادامه خطوط (space-start)
    var merged = [];
    for (var i = 0; i < lines.length; i++) {
      if (/^( |\\)/.test(lines[i]) && merged.length) merged[merged.length - 1] += lines[i].replace(/^ /, '');
      else merged.push(lines[i]);
    }
    var events = [];
    var cur = null;
    for (var j = 0; j < merged.length; j++) {
      var L = merged[j];
      if (L === 'BEGIN:VEVENT') { cur = {}; continue; }
      if (L === 'END:VEVENT') {
        if (cur && cur.summary) events.push(cur);
        cur = null; continue;
      }
      if (!cur) continue;
      var m = L.match(/^([^:]+):(.*)$/);
      if (!m) continue;
      var key = m[1].split(';')[0].toUpperCase();
      var val = m[2].replace(/\\n/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';');
      if (key === 'SUMMARY') cur.summary = val;
      else if (key === 'DTSTART') cur.dtstart = val;
      else if (key === 'RRULE') cur.rrule = val;
      else if (key === 'LOCATION') cur.location = val;
      else if (key === 'CATEGORIES') cur.categories = val;
      else if (key === 'DESCRIPTION') cur.description = val;
    }
    return events.map(function (e) {
      var d = e.dtstart || '';
      var dm = d.match(/(\d{4})(\d{2})(\d{2})/);
      if (!dm) return null;
      var g = { gy: +dm[1], gm: +dm[2], gd: +dm[3] };
      var j;
      try { j = C.toJalaali(g.gy, g.gm, g.gd); } catch (err) { return null; }
      var rep = 'none';
      if (e.rrule) {
        if (/FREQ=YEARLY/i.test(e.rrule)) rep = 'yearly';
        else if (/FREQ=MONTHLY/i.test(e.rrule)) rep = 'monthly';
        else if (/FREQ=WEEKLY/i.test(e.rrule)) rep = 'weekly';
      }
      var time = null;
      var tm = d.match(/T(\d{2}):(\d{2})/);
      if (tm) time = tm[1] + ':' + tm[2];
      var ev = {
        title: e.summary || 'رویداد',
        type: 'event',
        jy: j.jy, jm: j.jm, jd: j.jd,
        repeat: rep,
        time: time,
        location: e.location || '',
        desc: e.description || ''
      };
      var gm2 = (e.categories || '').match(/مهمان: ?(.*)/);
      if (gm2) ev.guests = gm2[1];
      return ev;
    }).filter(Boolean);
  }

  function importICS(text) {
    var parsed = parseICS(text);
    var added = 0;
    parsed.forEach(function (ev) {
      if (!ev.title) return;
      add(Object.assign({ jy: 1400, jm: 1, jd: 1, task: false }, ev));
      added++;
    });
    return added;
  }

  // ---------- UI ----------
  function renderList(elId) {
    var el = document.getElementById(elId);
    if (!el) return;
    var evs = getAll();
    if (evs.length === 0) {
      el.innerHTML = '<div class="text-muted text-center" style="padding:20px;">هنوز رویدادی اضافه نکرده‌اید</div>';
      return;
    }
    evs.sort(function (a, b) { return (a.jy - b.jy) || (a.jm - b.jm) || (a.jd - b.jd); });
    var html = '';
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      var icon = e.type === 'birthday' ? '🎂' : e.type === 'anniversary' ? '💍' : e.type === 'task' ? '✅' : '📌';
      var meta = [
        (typeof Cal !== 'undefined') ? Cal.toFaDigits(e.jy) + '/' + Cal.toFaDigits(e.jm) + '/' + Cal.toFaDigits(e.jd) : (e.jy + '/' + e.jm + '/' + e.jd),
        e.repeat && e.repeat !== 'none' ? '🔁 ' + ({ yearly: 'سالانه', monthly: 'ماهانه', weekly: 'هفتگی' }[e.repeat] || e.repeat) : null,
        e.time ? '⏰ ' + e.time : null,
        e.location ? '📍 ' + e.location : null,
        e.guests ? '👥 ' + e.guests : null
      ].filter(Boolean).join(' · ');
      html +=
        '<div class="setting-row" style="flex-wrap:wrap; position:relative;">' +
          '<div style="flex:1; min-width:110px; padding-right:8px;">' +
            '<div class="setting-row__label"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + colorOf(e) + ';margin-left:5px;"></span>' + icon + ' ' + escapeHtml(e.title) + (e.task ? '' : '') + '</div>' +
            '<div class="setting-row__desc">' + meta + '</div>' +
          '</div>' +
          '<div style="display:flex; gap:4px; flex-wrap:wrap;">' +
            '<button class="btn btn--ghost edit-personal-event" data-id="' + e.id + '" style="font-size:12px;">✏️</button>' +
            '<button class="btn btn--ghost del-personal-event" data-id="' + e.id + '" style="font-size:12px; color:#e63946;">🗑️</button>' +
          '</div>' +
        '</div>';
    }
    el.innerHTML = html;
    el.querySelectorAll('.del-personal-event').forEach(function (btn) {
      btn.addEventListener('click', function () {
        remove(parseInt(btn.dataset.id, 10));
        renderList(elId);
        refreshAll();
        if (App && App.toast) App.toast('رویداد حذف شد');
      });
    });
    el.querySelectorAll('.edit-personal-event').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ev = getById(parseInt(btn.dataset.id, 10));
        if (!ev) return;
        fillForm(ev);
        var listEl = document.getElementById('personalEventList');
        if (listEl) listEl.dataset.editId = ev.id;
        var cb = document.getElementById('peCancelEdit');
        if (cb) cb.style.display = '';
        if (App && App.toast) App.toast('ویرایش: ' + ev.title + ' — پس از تغییر، «افزودن» را بزنید');
      });
    });
  }

  function fillForm(ev) {
    var set = function (id, v) { var el = document.getElementById(id); if (el && v != null) el.value = v; };
    set('peTitle', ev.title);
    set('peType', ev.type || (ev.task ? 'task' : 'birthday'));
    set('peJy', ev.jy); set('peJm', ev.jm); set('peJd', ev.jd);
    set('peTime', ev.time || '');
    set('peTimeEnd', ev.timeEnd || '');
    set('peLocation', ev.location || '');
    set('peGuests', ev.guests || '');
    set('peRepeat', ev.repeat || 'none');
    // رنگ
    document.querySelectorAll('#peColors .pe-color').forEach(function (c) {
      c.style.outline = (c.dataset.c === ev.color) ? '2px solid ' + (COLORS[c.dataset.c] || c.dataset.c) : 'none';
      c.style.outlineOffset = '1px';
    });
  }

  function buildColorPicker() {
    var box = document.getElementById('peColors');
    if (!box || box.dataset.built) return;
    box.innerHTML = '';
    COLOR_KEYS.forEach(function (k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pe-color';
      b.dataset.c = k;
      b.style.cssText = 'width:20px;height:20px;border-radius:6px;border:2px solid transparent;cursor:pointer;background:' + COLORS[k];
      b.title = k;
      b.addEventListener('click', function () {
        document.querySelectorAll('#peColors .pe-color').forEach(function (c2) { c2.style.outline = 'none'; });
        b.style.outline = '2px solid ' + COLORS[k];
        b.style.outlineOffset = '1px';
        box.dataset.picked = k;
      });
      box.appendChild(b);
    });
    box.dataset.built = '1';
    if (!box.dataset.picked) box.dataset.picked = COLOR_KEYS[0];
  }

  function addNew() {
    var title = document.getElementById('peTitle');
    var type = document.getElementById('peType');
    var jy = document.getElementById('peJy');
    var jm = document.getElementById('peJm');
    var jd = document.getElementById('peJd');
    if (!title || !title.value.trim()) {
      if (App && App.toast) App.toast('عنوان را وارد کنید');
      return;
    }
    var listEl = document.getElementById('personalEventList');
    var editTarget = listEl && listEl.dataset.editId ? parseInt(listEl.dataset.editId, 10) : null;

    var colorPicked = null;
    var colorBox = document.getElementById('peColors');
    if (colorBox && colorBox.dataset.picked && COLORS[colorBox.dataset.picked]) colorPicked = colorBox.dataset.picked;
    if (editTarget) {
      var prev = getById(editTarget);
      if (prev && prev.color && !colorPicked) colorPicked = prev.color;
    }

    var data = {
      title: title.value.trim(),
      type: type ? type.value : 'birthday',
      desc: '',
      jy: parseInt(jy.value, 10) || 1400,
      jm: parseInt(jm.value, 10) || 1,
      jd: parseInt(jd.value, 10) || 1,
      time: (document.getElementById('peTime') || {}).value || null,
      timeEnd: (document.getElementById('peTimeEnd') || {}).value || null,
      repeat: (document.getElementById('peRepeat') || {}).value || 'none',
      location: ((document.getElementById('peLocation') || {}).value || '').trim(),
      guests: ((document.getElementById('peGuests') || {}).value || '').trim(),
      task: (type ? type.value : '') === 'task'
    };
    if (colorPicked) data.color = colorPicked;

    if (editTarget) {
      update(editTarget, data);
      if (listEl) delete listEl.dataset.editId;
      if (App && App.toast) App.toast('رویداد ویرایش شد ✓');
    } else {
      add(data);
      if (App && App.toast) App.toast('رویداد شخصی اضافه شد ✓');
    }
    resetForm();
    renderList('personalEventList');
    refreshAll();
  }

  function resetForm() {
    ['peTitle', 'peJy', 'peJm', 'peJd', 'peTime', 'peTimeEnd', 'peLocation', 'peGuests'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    var t = document.getElementById('peType'); if (t) t.value = 'birthday';
    var r = document.getElementById('peRepeat'); if (r) r.value = 'none';
    document.querySelectorAll('#peColors .pe-color').forEach(function (c) { c.style.outline = 'none'; });
    var listEl = document.getElementById('personalEventList');
    if (listEl) delete listEl.dataset.editId;
    var cb = document.getElementById('peCancelEdit');
    if (cb) cb.style.display = 'none';
  }

  function refreshAll() {
    try {
      if (window.App && App.renderCalendarNow) App.renderCalendarNow();
      if (window.App && App.renderCountdownNow) App.renderCountdownNow();
    } catch (e) {}
  }

  // v1.18: تولدها از مخاطبین اندروید (NativeApp)
  function importFromContacts() {
    var status = document.getElementById('peContactsStatus');
    function setStatus(msg, ok) {
      if (status) { status.textContent = msg; status.style.color = ok ? 'var(--ok, #4caf50)' : 'var(--text-muted)'; }
    }
    var NA = (typeof window !== 'undefined' && window.NativeApp) ? window.NativeApp : null;
    if (!NA || typeof NA.getContactBirthdays !== 'function') {
      setStatus('در نسخهٔ وب در دسترس نیست — فقط روی اندروید', false);
      return;
    }
    // اول اجازه
    var need = false;
    try { if (typeof NA.requestContactsPermission === 'function') need = !NA.requestContactsPermission(); } catch (e) {}
    if (need) {
      setStatus('اجازهٔ دسترسی به مخاطبین لازم است — از پنل مجوزها بده و دوباره بزن', false);
      return;
    }
    var raw;
    try { raw = NA.getContactBirthdays(); } catch (e) { raw = '[]'; }
    if (raw === 'NO_PERMISSION') { setStatus('دسترسی مخاطبین فعال نیست', false); return; }
    var arr = [];
    try { arr = JSON.parse(raw); } catch (e) { setStatus('خروجی نامعتبر', false); return; }
    if (!arr.length) { setStatus('تولد ثبت‌شده‌ای در مخاطبین پیدا نشد', false); return; }
    var all = getAll();
    var nowJ = global.Cal.toJalaali(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());
    var added = 0;
    arr.forEach(function (c) {
      var day = String(c.birthday || '');
      var gy, gm, gd;
      var m5 = day.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      var m2 = day.match(/^(\d{2})-(\d{2})$/);
      if (m5) { gy = +m5[1]; gm = +m5[2]; gd = +m5[3]; }
      else if (m2) { gm = +m2[1]; gd = +m2[2]; gy = nowJ.jy + 621; }
      else return;
      var j = global.Cal.toJalaali(gy, gm, gd);
      if (!j) return;
      var nm = (c.name || 'مخاطب').trim();
      // avoid dup by name+date
      if (all.some(function (e) { return e.title === nm && e.jy === j.jy && e.jm === j.jm && e.jd === j.jd; })) return;
      var ev = add({ title: nm, type: 'birthday', icon: '🎂', jy: j.jy, jm: j.jm, jd: j.jd, repeat: 'yearly', color: 'green', task: false, desc: 'مخاطب' });
      if (ev) added++;
    });
    setStatus('✅ ' + added + ' تولد اضافه شد', true);
    renderList('personalEventList');
  }

  function wireIcs() {
    var exp = document.getElementById('peExportIcs');
    var imp = document.getElementById('peImportIcs');
    var file = document.getElementById('peIcsFile');
    var ctn = document.getElementById('peImportContacts');
    if (ctn) ctn.addEventListener('click', function () { importFromContacts(); });
    if (exp) exp.addEventListener('click', function () {
      var ics = buildICS();
      // روی اندروید: ذخیره/اشتراک فایل واقعی (بهتر از blob)
      if (typeof window !== 'undefined' && window.NativeApp && window.NativeApp.saveAndShareFile) {
        try {
          var b64 = btoa(unescape(encodeURIComponent(ics)));
          window.NativeApp.saveAndShareFile('balochistan-personal-events.ics', b64, 'text/calendar');
          if (App && App.toast) App.toast('ICS آماده اشتراک شد (' + getAll().length + ' رویداد)');
          return;
        } catch (e) {}
      }
      var blob = new Blob([ics], { type: 'text/calendar' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'balochistan-personal-events.ics';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); }, 500);
      if (App && App.toast) App.toast('ICS خروجی شد ✓ (' + getAll().length + ' رویداد)');
    });
    if (imp && file) {
      imp.addEventListener('click', function () { file.value = ''; file.click(); });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        var rd = new FileReader();
        rd.onload = function () {
          try {
            var n = importICS(rd.result);
            if (App && App.toast) App.toast(n + ' رویداد از ICS وارد شد' + (n ? ' ✓' : ''));
            renderList('personalEventList');
            refreshAll();
          } catch (e) {
            if (App && App.toast) App.toast('خطا در خواندن فایل ICS');
          }
        };
        rd.readAsText(f);
      });
    }
  }

  var PersonalEvents = {
    COLORS: COLORS,
    colorOf: colorOf,
    getAll: getAll,
    add: add,
    update: update,
    remove: remove,
    getById: getById,
    getForDate: getForDate,
    getEventsForCell: getEventsForCell,
    hasEvents: hasEvents,
    occurrencesOn: occurrencesOn,
    eventsOn: eventsOn,
    edit: edit,
    upcoming: upcoming,
    buildICS: buildICS,
    importICS: importICS,
    importFromContacts: importFromContacts,
    renderList: renderList,
    openModal: function () {
      buildColorPicker();
      wireIcs();
      var m = document.getElementById('modalPersonalEvents');
      if (m) m.classList.add('show');
      renderList('personalEventList');
    },
    closeModal: function () {
      var m = document.getElementById('modalPersonalEvents');
      if (m) m.classList.remove('show');
      resetForm();
    },
    addNew: addNew,
    resetForm: resetForm
  };
  if (typeof window !== 'undefined') window.PersonalEvents = PersonalEvents;
})(typeof window !== 'undefined' ? window : this);

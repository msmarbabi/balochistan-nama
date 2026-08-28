/* ============================================================
   Balochistan Nama - Notes module (notes.js)
   localStorage-backed notes list with categories, pin, time,
   birthday support, and filters. Standalone tab.
   ============================================================ */

(function (global) {
  'use strict';

  var STORE_KEY = 'blx_nama_notes';

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function save(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  }

  function getAll() { return load(); }

  function add(note) {
    var list = load();
    note.id = Date.now() + Math.floor(Math.random() * 1000);
    note.created = new Date().toISOString();
    list.unshift(note);
    save(list);
    return note;
  }

  function update(id, patch) {
    var list = load();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { Object.assign(list[i], patch); save(list); return list[i]; }
    }
    return null;
  }

  function remove(id) {
    var list = load();
    list = list.filter(function (n) { return n.id !== id; });
    save(list);
  }

  function getById(id) {
    var list = load();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // Notes whose date matches today (Jalali)
  function todaysNotes(jalaliDate) {
    return load().filter(function (n) {
      if (!n.date) return false;
      return n.date.jy === jalaliDate.jy && n.date.jm === jalaliDate.jm && n.date.jd === jalaliDate.jd;
    });
  }

  // Notes whose reminder is due in the next N days
  function upcomingReminders(jalaliToday, daysAhead) {
    daysAhead = daysAhead || 7;
    var out = [];
    var list = load();
    var now = new Date();
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      if (!n.date) continue;
      var g = Cal.toGregorian(n.date.jy, n.date.jm, n.date.jd);
      var target = new Date(g.gy, g.gm - 1, g.gd);
      if (n.type === 'birthday') {
        target = new Date(now.getFullYear(), g.gm - 1, g.gd);
        if (target < now) target = new Date(now.getFullYear() + 1, g.gm - 1, g.gd);
      }
      var days = Math.round((target - now) / 86400000);
      if (days >= 0 && days <= daysAhead) out.push({ note: n, days: days, target: target });
    }
    return out;
  }

  function categories() {
    var list = load();
    var cats = {};
    for (var i = 0; i < list.length; i++) {
      var c = list[i].category;
      if (c) cats[c] = (cats[c] || 0) + 1;
    }
    return Object.keys(cats);
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[<>&"']/g, function (c) {
      return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatDate(n) {
    if (!n.date) return '';
    return Cal.toFaDigits(n.date.jd) + ' ' + (Cal.JALALI_MONTHS[n.date.jm - 1] || '') + ' ' + Cal.toFaDigits(n.date.jy) + (n.time ? ' ⏰' + escapeHtml(n.time) : '');
  }

  // Render full list into #noteList with filters
  function renderList(containerId, opts) {
    opts = opts || {};
    var el = document.getElementById(containerId);
    if (!el) return;
    var list = load();

    // Apply filters
    if (opts.filter === 'pinned') list = list.filter(function (n) { return n.pinned; });
    else if (opts.filter === 'today') list = list.filter(function (n) {
      if (!window.App) return false;
      var t = App.getState().today;
      return n.date && n.date.jy === t.jy && n.date.jm === t.jm && n.date.jd === t.jd;
    });
    else if (opts.filter === 'upcoming') {
      var up = upcomingReminders(window.App ? App.getState().today : null, 30).map(function (x) { return x.note.id; });
      list = list.filter(function (n) { return up.indexOf(n.id) >= 0; });
    }
    else if (opts.filter === 'birthday') list = list.filter(function (n) { return n.type === 'birthday'; });

    if (opts.cat && opts.cat !== 'all') list = list.filter(function (n) { return n.category === opts.cat; });

    // Search filter
    if (opts.search) {
      var q = opts.search.toLowerCase();
      list = list.filter(function (n) {
        return (n.title && n.title.toLowerCase().indexOf(q) >= 0) ||
               (n.body && n.body.toLowerCase().indexOf(q) >= 0) ||
               (n.category && n.category.toLowerCase().indexOf(q) >= 0);
      });
    }

    // Sort: pinned first, then by date desc
    list.sort(function (a, b) {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      var da = a.date ? (a.date.jy * 10000 + a.date.jm * 100 + a.date.jd) : 0;
      var db = b.date ? (b.date.jy * 10000 + b.date.jm * 100 + b.date.jd) : 0;
      return db - da;
    });

    if (list.length === 0) {
      el.innerHTML = '<div class="text-muted text-center text-small" style="padding:24px;">یادداشتی با این فیلتر یافت نشد. با دکمه «➕ یادداشت جدید» اضافه کنید.</div>';
      return;
    }

    el.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      var n = list[i];
      var div = document.createElement('div');
      var cls = 'note' + (n.type === 'birthday' ? ' birthday' : '') + (n.pinned ? ' pinned' : '') + (n.category ? ' cat-' + sanitizeCat(n.category) : '');
      div.className = cls;
      var icon = n.type === 'birthday' ? '🎂' : (n.type === 'task' ? '✅' : '📝');
      var pin = n.pinned ? '<span class="note__pin" title="پین‌شده">📌</span>' : '';
      var catBadge = n.category ? '<span class="note__cat">' + escapeHtml(n.category) + '</span>' : '';
      div.innerHTML =
        '<div class="note__head">' +
          pin +
          '<div class="note__title">' + icon + ' ' + escapeHtml(n.title || 'بدون عنوان') + '</div>' +
        '</div>' +
        (formatDate(n) ? '<div class="note__date">' + formatDate(n) + '</div>' : '') +
        catBadge +
        (n.body ? '<div class="note__body">' + escapeHtml(n.body) + '</div>' : '') +
        '<div class="note__actions">' +
          '<button class="btn btn--ghost note-pin" data-id="' + n.id + '" style="font-size:11px; padding:4px 8px;">' + (n.pinned ? '📌 برداشتن' : '📌 پین') + '</button>' +
          '<button class="btn btn--ghost note-edit" data-id="' + n.id + '" style="font-size:11px; padding:4px 8px;">✏️ ویرایش</button>' +
          '<button class="btn btn--ghost note-del" data-id="' + n.id + '" style="font-size:11px; padding:4px 8px;">🗑 حذف</button>' +
          '<button class="btn btn--primary note-send" data-id="' + n.id + '" style="font-size:11px; padding:4px 8px;">📱 ارسال به گوشی</button>' +
        '</div>';
      el.appendChild(div);
    }

    // Wire actions
    el.querySelectorAll('.note-pin').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = parseInt(b.dataset.id, 10);
        var n = getById(id);
        if (n) { update(id, { pinned: !n.pinned }); renderList('noteList', currentFilter()); App.toast(n.pinned ? 'از پین خارج شد' : 'پین شد'); }
      });
    });
    el.querySelectorAll('.note-edit').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = parseInt(b.dataset.id, 10);
        openEditor(id);
      });
    });
    el.querySelectorAll('.note-del').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = parseInt(b.dataset.id, 10);
        if (confirm('این یادداشت حذف شود؟')) { remove(id); renderList('noteList', currentFilter()); App.toast('یادداشت حذف شد'); }
      });
    });
    el.querySelectorAll('.note-send').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = parseInt(b.dataset.id, 10);
        var n = getById(id);
        if (n) sendToDevice(n);
      });
    });
  }

  function sendToDevice(note) {
    if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
      App.toast('فقط روی دستگاه اندروید پشتیبانی می‌شود');
      return;
    }
    if (!window.NotesBridge || !window.NotesBridge.createNote) {
      App.toast('بریج یادداشت در دسترس نیست');
      return;
    }
    try {
      window.NotesBridge.createNote(note.title || 'یادداشت', note.body || '');
      App.toast('به یادداشت گوشی ارسال شد ✓');
    } catch (e) {
      App.toast('خطا: ' + (e && e.message ? e.message : e));
    }
  }

  function sanitizeCat(c) {
    return String(c).replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '');
  }

  var _filter = { filter: 'all', cat: 'all', search: '' };
  function currentFilter() { return _filter; }

  function exportNotes() {
    var list = load();
    var data = { app: 'BalochistanNama', type: 'notes', version: 1, exported: new Date().toISOString(), notes: list };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'balochistan-nama-notes-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    if (typeof App !== 'undefined' && App.toast) App.toast('خروجی گرفته شد ✓');
  }

  function importNotes(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var incoming = data.notes || data;
        if (!Array.isArray(incoming)) { App.toast('فرمت فایل نامعتبر'); return; }
        var list = load();
        // merge by id (avoid dupes)
        var seen = {};
        list.forEach(function (n) { seen[n.id] = true; });
        var added = 0;
        incoming.forEach(function (n) {
          if (!seen[n.id]) { list.push(n); added++; }
        });
        save(list);
        refreshCatFilter();
        renderList('noteList', currentFilter());
        App.toast(added + ' یادداشت وارد شد ✓');
      } catch (e) { App.toast('خطا در خواندن فایل'); }
    };
    reader.readAsText(file);
  }

  function openEditor(id) {
    var editor = document.getElementById('noteEditor');
    var titleEl = document.getElementById('noteEditorTitle');
    if (!editor) return;
    editor.classList.remove('hidden');
    var n = id ? getById(id) : null;
    document.getElementById('noteTitleInput').value = n ? (n.title || '') : '';
    document.getElementById('noteBodyInput').value = n ? (n.body || '') : '';
    document.getElementById('noteTypeInput').value = n ? (n.type || 'note') : 'note';
    document.getElementById('noteCatInput').value = n ? (n.category || '') : '';
    document.getElementById('notePinInput').checked = n ? !!n.pinned : false;
    document.getElementById('noteTimeInput').value = n ? (n.time || '') : '';
    // Date: default today
    var t = window.App ? App.getState().today : null;
    var defDate = n && n.date ? gregString(n.date) : (t ? gregString(t) : '');
    document.getElementById('noteDateInput').value = defDate;
    titleEl.textContent = n ? 'ویرایش یادداشت' : 'یادداشت جدید';
    editor.dataset.editId = n ? n.id : '';
    document.getElementById('noteTitleInput').focus();
  }

  function gregString(jalali) {
    if (!jalali) return '';
    var g = Cal.toGregorian(jalali.jy, jalali.jm, jalali.jd);
    return g.gy + '-' + pad(g.gm) + '-' + pad(g.gd);
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function saveEditor() {
    var title = document.getElementById('noteTitleInput').value.trim();
    var body = document.getElementById('noteBodyInput').value.trim();
    var type = document.getElementById('noteTypeInput').value;
    var category = document.getElementById('noteCatInput').value.trim();
    var pinned = document.getElementById('notePinInput').checked;
    var time = document.getElementById('noteTimeInput').value;
    var dateStr = document.getElementById('noteDateInput').value;
    if (!title && !body) { App.toast('عنوان یا متن را وارد کنید'); return; }
    var jalali = null;
    if (dateStr) {
      var parts = dateStr.split('-');
      if (parts.length === 3) {
        var g = Cal.toJalali(parseInt(parts[0], 10), parseInt(parts[1], 10), parseInt(parts[2], 10));
        jalali = { jy: g.jy, jm: g.jm, jd: g.jd };
      }
    }
    var editId = document.getElementById('noteEditor').dataset.editId;
    if (editId) {
      update(parseInt(editId, 10), { title: title, body: body, type: type, category: category, pinned: pinned, time: time, date: jalali });
      App.toast('ویرایش شد');
    } else {
      add({ title: title, body: body, type: type, category: category, pinned: pinned, time: time, date: jalali });
      App.toast('ذخیره شد');
    }
    document.getElementById('noteEditor').classList.add('hidden');
    document.getElementById('noteEditor').dataset.editId = '';
    refreshCatFilter();
    renderList('noteList', currentFilter());
  }

  function refreshCatFilter() {
    var sel = document.getElementById('noteCatFilter');
    if (!sel) return;
    var cats = categories();
    var cur = sel.value;
    sel.innerHTML = '<option value="all">همه دسته‌ها</option>';
    for (var i = 0; i < cats.length; i++) {
      var o = document.createElement('option');
      o.value = cats[i]; o.textContent = cats[i];
      sel.appendChild(o);
    }
    if (cur && cats.indexOf(cur) >= 0) sel.value = cur;
  }

  function init() {
    if (window.__notesInited) { refreshCatFilter(); renderList('noteList', _filter); return; }
    window.__notesInited = true;
    var addBtn = document.getElementById('noteAddBtn');
    if (addBtn) addBtn.addEventListener('click', function () { openEditor(null); });
    var saveBtn = document.getElementById('noteSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveEditor);
    var cancelBtn = document.getElementById('noteCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      document.getElementById('noteEditor').classList.add('hidden');
      document.getElementById('noteEditor').dataset.editId = '';
    });
    var filter = document.getElementById('noteFilter');
    if (filter) filter.addEventListener('change', function () {
      _filter.filter = filter.value; renderList('noteList', _filter);
    });
    var catF = document.getElementById('noteCatFilter');
    if (catF) catF.addEventListener('change', function () {
      _filter.cat = catF.value; renderList('noteList', _filter);
    });
    var searchEl = document.getElementById('noteSearch');
    if (searchEl) searchEl.addEventListener('input', function () {
      _filter.search = searchEl.value.trim(); renderList('noteList', _filter);
    });
    var expBtn = document.getElementById('noteExportBtn');
    if (expBtn) expBtn.addEventListener('click', exportNotes);
    var impBtn = document.getElementById('noteImportBtn');
    if (impBtn) impBtn.addEventListener('click', function () {
      var inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'application/json';
      inp.addEventListener('change', function () { if (inp.files[0]) importNotes(inp.files[0]); });
      inp.click();
    });
    refreshCatFilter();
    renderList('noteList', _filter);
  }

  var Notes = {
    getAll: getAll, add: add, update: update, remove: remove, getById: getById,
    todaysNotes: todaysNotes, upcomingReminders: upcomingReminders,
    categories: categories, renderList: renderList, init: init, openEditor: openEditor
  };
  if (typeof window !== 'undefined') window.Notes = Notes;
})(typeof window !== 'undefined' ? window : this);

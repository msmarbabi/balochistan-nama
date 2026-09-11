/* یادداشت‌ها — بلوچستان‌نما v1.10 (بازسازی کامل) */
(function () {
  'use strict';

  var STORE_KEY = 'blx_nama_notes';
  var DEFAULT_CATS = ['خانواده', 'کار', 'خانه', 'شخصی'];

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function uid() { return Date.now() * 1000 + Math.floor(Math.random() * 1000); }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function todayJalali() {
    var t = new Date();
    return Cal.toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(d) {
    if (!d || !d.jy) return '';
    var m = (typeof JALALI_MONTHS !== 'undefined') ? JALALI_MONTHS[d.jm - 1] : '';
    return d.jd + ' ' + (m || '') + ' ' + d.jy;
  }

  // ===== CRUD =====
  function getAll() { return load(); }
  function getById(id) {
    var l = load();
    for (var i = 0; i < l.length; i++) if (String(l[i].id) === String(id)) return l[i];
    return null;
  }
  function add(note) {
    var list = load();
    var n = {
      id: uid(),
      title: note.title || '',
      body: note.body || '',
      date: note.date || null,          // {jy,jm,jd} — تاریخ شمسی اختیاری
      time: note.time || null,          // 'HH:MM' اختیاری
      type: (note.type === 'normal' || !note.type) ? 'note' : note.type,
      category: (note.category || '').trim(),
      pinned: !!note.pinned,
      created: new Date().toISOString()
    };
    list.unshift(n);
    save(list);
    return n;
  }
  function update(id, patch) {
    var list = load();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].id) === String(id)) {
        for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) list[i][k] = patch[k];
        list[i].modified = new Date().toISOString();
        save(list);
        return list[i];
      }
    }
    return null;
  }
  function remove(id) {
    var list = load();
    var out = [];
    for (var i = 0; i < list.length; i++) if (String(list[i].id) !== String(id)) out.push(list[i]);
    save(out);
  }
  function togglePin(id) {
    var n = getById(id);
    if (n) update(id, { pinned: !n.pinned });
    return getById(id);
  }
  function todaysNotes() {
    var t = todayJalali();
    return load().filter(function (n) {
      return n.date && n.date.jy === t.jy && n.date.jm === t.jm && n.date.jd === t.jd;
    });
  }
  function upcomingReminders(jalaliToday, daysAhead) {
    daysAhead = daysAhead || 7;
    var out = [];
    var list = load();
    var now = new Date(); now.setHours(0, 0, 0, 0);
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
    var set = {};
    DEFAULT_CATS.forEach(function (c) { set[c] = 1; });
    load().forEach(function (n) { if (n.category) set[n.category] = 1; });
    return Object.keys(set);
  }

  // ===== فیلتر و رندر =====
  function currentFilter() {
    var typeSel = document.getElementById('noteFilter');
    var catSel = document.getElementById('noteCatFilter');
    var search = document.getElementById('noteSearch');
    return {
      type: (typeSel && typeSel.value) || 'all',
      cat: (catSel && catSel.value) || 'all',
      q: (search && search.value || '').trim()
    };
  }

  function applyFilter(list, f) {
    var out = list;
    var t = todayJalali();
    if (f.type && f.type !== 'all') {
      out = out.filter(function (n) {
        var nt = (!n.type || n.type === 'normal') ? 'note' : n.type;
        if (f.type === 'pinned') return !!n.pinned;
        if (f.type === 'birthday') return nt === 'birthday';
        if (f.type === 'today') {
          return !!(n.date && n.date.jy === t.jy && n.date.jm === t.jm && n.date.jd === t.jd);
        }
        if (f.type === 'upcoming') {
          if (!n.date) return false;
          var g = Cal.toGregorian(n.date.jy, n.date.jm, n.date.jd);
          var target = new Date(g.gy, g.gm - 1, g.gd);
          var now = new Date(); now.setHours(0, 0, 0, 0);
          if (nt === 'birthday') {
            target = new Date(now.getFullYear(), g.gm - 1, g.gd);
            if (target < now) target = new Date(now.getFullYear() + 1, g.gm - 1, g.gd);
          }
          return target >= now;
        }
        return nt === f.type; // note | task
      });
    }
    if (f.cat && f.cat !== 'all') out = out.filter(function (n) { return (n.category || '') === f.cat; });
    if (f.q) {
      var q = f.q.toLowerCase();
      out = out.filter(function (n) {
        return (n.title || '').toLowerCase().indexOf(q) >= 0 || (n.body || '').toLowerCase().indexOf(q) >= 0;
      });
    }
    return out;
  }

  function noteCardHtml(n) {
    var pinBtn = n.pinned ? '📌' : '📍';
    var nt = (!n.type || n.type === 'normal') ? 'note' : n.type;
    var typeBadge = nt === 'task' ? '✅ ' : (nt === 'birthday' ? '🎂 ' : '📝 ');
    var dateStr = n.date ? ' · ' + fmtDate(n.date) + (n.time ? ' ' + n.time : '') : '';
    var catBadge = n.category ? ' · 🏷️ ' + escapeHtml(n.category) : '';
    var html =
      '<div class="note' + (n.pinned ? ' pinned' : '') + '" data-id="' + n.id + '">' +
      '<div class="note__row">' +
      '<span class="note__title">' + typeBadge + escapeHtml(n.title || 'بی‌عنوان') + '</span>' +
      '<span class="note__actions">' +
      '<button class="note__act" data-act="pin" title="سنجاق">' + pinBtn + '</button>' +
      '<button class="note__act" data-act="edit" title="ویرایش">✏️</button>' +
      '<button class="note__act" data-act="del" title="حذف">🗑️</button>' +
      '</span></div>' +
      (n.body ? '<div class="note__body">' + escapeHtml(n.body) + '</div>' : '') +
      '<div class="note__meta">' + escapeHtml(typeName(n.type)) + dateStr + catBadge + '</div>' +
      '</div>';
    return html;
  }

  function typeName(t) {
    if (t === 'task') return 'کار';
    if (t === 'birthday') return 'تولد';
    if (t === 'checklist') return 'چک‌لیست';
    return 'یادداشت';
  }

  function renderList(containerId, opts) {
    opts = opts || {};
    var el = document.getElementById(containerId);
    if (!el) return;
    var f = opts.filter || currentFilter();
    var all = load();
    var visible = applyFilter(all, f);
    // سنجاق‌ها اول، بعد بقیه بر اساس تاریخ ایجاد (جدید اول)
    visible.sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return String(b.created || '').localeCompare(String(a.created || ''));
    });
    if (!visible.length) {
      var isFiltered = f.type !== 'all' || f.cat !== 'all' || f.q;
      el.innerHTML = '<div class="empty">' + (isFiltered ? '🔍 یادداشتی با این فیلتر نیست' : 'هنوز یادداشتی نداری — دکمه «➕ یادداشت جدید» را بزن') + '</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < visible.length; i++) html += noteCardHtml(visible[i]);
    el.innerHTML = html;
  }

  function refreshCatFilter() {
    var sel = document.getElementById('noteCatFilter');
    if (!sel) return;
    var cur = sel.value || 'all';
    var cats = categories();
    var html = '<option value="all">همه دسته‌ها</option>';
    cats.forEach(function (c) {
      html += '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>';
    });
    sel.innerHTML = html;
    // بازگرداندن مقدار قبلی اگر هنوز هست
    if (cats.indexOf(cur) >= 0 || cur === 'all') sel.value = cur;
  }

  // ===== ادیتور =====
  var editingId = null;

  function setVal(id, v) {
    var el = document.getElementById(id);
    if (el) el.value = v;
  }
  function getVal(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  // تاریخ شمسی امروز برای prefill — همیشه امن (بدون وابستگی به state)
  function safeToday() {
    try {
      if (typeof App !== 'undefined' && App.state && App.state.today && App.state.today.jalali) {
        var j = App.state.today.jalali;
        if (j && j.jy) return { jy: j.jy, jm: j.jm, jd: j.jd };
      }
    } catch (e) {}
    return todayJalali();
  }

  function openEditor(id) {
    var modal = document.getElementById('noteEditor');
    if (!modal) return;
    editingId = (id != null && id !== '') ? String(id) : null;
    var n = editingId ? getById(editingId) : null;

    document.getElementById('noteEditorTitle').textContent = n ? '✏️ ویرایش یادداشت' : '➕ یادداشت جدید';
    setVal('noteTitleInput', n ? (n.title || '') : '');
    setVal('noteBodyInput', n ? (n.body || '') : '');

    // تاریخ — همیشه از منبع امن
    var t = safeToday();
    var d = (n && n.date) ? n.date : t;
    setVal('noteDateJy', d.jy);
    setVal('noteDateJm', d.jm);
    setVal('noteDateJd', d.jd);
    setVal('noteTimeInput', (n && n.time) ? n.time : '');

    var typeSel = document.getElementById('noteTypeInput');
    if (typeSel) typeSel.value = n ? (n.type || 'note') : 'note';

    setVal('noteCatInput', n ? (n.category || '') : '');
    var pin = document.getElementById('notePinInput');
    if (pin) pin.checked = !!(n && n.pinned);

    // دکمه حذف فقط در حالت ویرایش
    var del = document.getElementById('noteDeleteBtn');
    if (del) del.style.display = n ? '' : 'none';

    modal.classList.remove('hidden');
    var ti = document.getElementById('noteTitleInput');
    if (ti) setTimeout(function () { try { ti.focus(); } catch (e) {} }, 80);
  }

  function closeEditor() {
    var modal = document.getElementById('noteEditor');
    if (modal) modal.classList.add('hidden');
    editingId = null;
  }

  function saveEditor() {
    var title = getVal('noteTitleInput').trim();
    var body = getVal('noteBodyInput').trim();
    if (!title && !body) {
      if (typeof App !== 'undefined' && App.toast) App.toast('عنوان یا متن یادداشت را بنویس');
      return;
    }
    if (!title) title = body.slice(0, 30);

    var jy = parseInt(getVal('noteDateJy'), 10);
    var jm = parseInt(getVal('noteDateJm'), 10);
    var jd = parseInt(getVal('noteDateJd'), 10);
    var date = null;
    if (jy > 1200 && jy < 1600 && jm >= 1 && jm <= 12 && jd >= 1 && jd <= 31) {
      date = { jy: jy, jm: jm, jd: jd };
    }
    var time = getVal('noteTimeInput').trim() || null;
    var type = getVal('noteTypeInput') || 'note';
    var category = getVal('noteCatInput').trim();
    var pinned = !!(document.getElementById('notePinInput') && document.getElementById('notePinInput').checked);

    var patch = { title: title, body: body, date: date, time: time, type: type, category: category, pinned: pinned };
    if (editingId) {
      update(editingId, patch);
      if (typeof App !== 'undefined' && App.toast) App.toast('✅ یادداشت به‌روز شد');
    } else {
      add(patch);
      if (typeof App !== 'undefined' && App.toast) App.toast('✅ یادداشت ذخیره شد');
    }
    closeEditor();
    refreshCatFilter();
    renderList('noteList');
    // آپدیت آمار اگر هست
    if (window.Stats && Stats.render) { try { Stats.render(); } catch (e) {} }
  }

  function deleteCurrent() {
    if (!editingId) return;
    if (confirm('این یادداشت حذف شود؟')) {
      remove(editingId);
      closeEditor();
      renderList('noteList');
      if (typeof App !== 'undefined' && App.toast) App.toast('🗑️ حذف شد');
      if (window.Stats && Stats.render) { try { Stats.render(); } catch (e) {} }
    }
  }

  // ===== خروجی/ورودی =====
  function exportJSON() {
    var data = JSON.stringify(load(), null, 2);
    var blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'balochistan-nama-notes.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
    if (typeof App !== 'undefined' && App.toast) App.toast('📤 فایل پشتیبان ساخته شد');
  }

  function importJSON(text) {
    try {
      var v = JSON.parse(text);
      if (!Array.isArray(v)) throw new Error('ساختار درست نیست');
      var existing = {};
      load().forEach(function (n) { existing[n.id] = 1; });
      var added = 0;
      v.forEach(function (n) {
        if (n && n.id && !existing[n.id] && (n.title || n.body)) {
          add({
            title: n.title, body: n.body, date: n.date || null, time: n.time || null,
            type: n.type || 'note', category: n.category || '', pinned: !!n.pinned
          });
          added++;
        }
      });
      refreshCatFilter();
      renderList('noteList');
      if (typeof App !== 'undefined' && App.toast) App.toast('📥 ' + added + ' یادداشت اضافه شد');
    } catch (e) {
      if (typeof App !== 'undefined' && App.toast) App.toast('❌ فایل معتبر نیست');
    }
  }

  // ===== init =====
  function init() {
    if (window.__notesInited) { refreshCatFilter(); renderList('noteList'); return; }
    window.__notesInited = true;

    function bind(id, fn, ev) {
      var el = document.getElementById(id);
      if (el) el.addEventListener(ev || 'click', fn);
    }

    bind('noteAddBtn', function () { openEditor(null); });
    bind('noteSaveBtn', function (e) { e.preventDefault(); saveEditor(); });
    bind('noteCancelBtn', function () { closeEditor(); });
    var delBtn = document.getElementById('noteDeleteBtn');
    if (delBtn) delBtn.addEventListener('click', deleteCurrent);

    var search = document.getElementById('noteSearch');
    if (search) {
      search.addEventListener('input', function () { renderList('noteList'); });
    }
    var typeSel = document.getElementById('noteFilter');
    if (typeSel) typeSel.addEventListener('change', function () { renderList('noteList'); });
    var catSel = document.getElementById('noteCatFilter');
    if (catSel) catSel.addEventListener('change', function () { renderList('noteList'); });

    // رویدادهای هر کارت (pin/edit/del) — با delegation (بدون bind مجدد)
    var list = document.getElementById('noteList');
    if (list) {
      list.addEventListener('click', function (ev) {
        var btn = ev.target.closest('[data-act]');
        if (!btn) return;
        var card = btn.closest('.note');
        if (!card) return;
        var id = card.getAttribute('data-id');
        var act = btn.getAttribute('data-act');
        if (act === 'pin') {
          togglePin(id);
          renderList('noteList');
        } else if (act === 'edit') {
          openEditor(id);
        } else if (act === 'del') {
          if (confirm('این یادداشت حذف شود؟')) { remove(id); renderList('noteList'); }
        }
      });
    }

    bind('noteExportBtn', exportJSON);

    var impBtn = document.getElementById('noteImportBtn');
    if (impBtn) {
      var fileIn = document.getElementById('noteImportFile');
      if (fileIn) {
        fileIn.addEventListener('change', function () {
          var f = this.files && this.files[0];
          if (!f) return;
          var r = new FileReader();
          r.onload = function () { importJSON(String(r.result)); };
          r.readAsText(f, 'utf-8');
          this.value = '';
        });
        impBtn.addEventListener('click', function () { fileIn.click(); });
      }
    }

    refreshCatFilter();
    renderList('noteList');
  }

  // ===== API عمومی (سازگار با تمام callerها) =====
  var Notes = {
    getAll: getAll,
    getById: getById,
    add: add,
    update: update,
    remove: remove,
    togglePin: togglePin,
    todaysNotes: todaysNotes,
    upcomingReminders: upcomingReminders,
    categories: categories,
    renderList: renderList,
    openEditor: openEditor,
    init: init
  };
  window.Notes = Notes;
})();

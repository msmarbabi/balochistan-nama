/* ============================================================
   Balochistan Nama - Personal Events module (personalevents.js)
   Stores & displays personal events (birthdays, anniversaries)
   in localStorage. Shows them on the calendar with special dots.
   ============================================================ */

(function (global) {
  'use strict';

  var STORAGE_KEY = 'blx_personal_events';

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) { return []; }
  }

  function save(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  }

  function add(event) {
    var evs = getAll();
    event.id = Date.now() + Math.floor(Math.random() * 1000);
    evs.push(event);
    save(evs);
    return event.id;
  }

  function remove(id) {
    var evs = getAll().filter(function (e) { return e.id !== id; });
    save(evs);
  }

  // Get events for a specific date (by jalali date)
  function getForDate(jy, jm, jd) {
    return getAll().filter(function (e) {
      return e.jy === jy && e.jm === jm && e.jd === jd;
    });
  }

  // Get personal events for the calendar (returns array with tags)
  function getEventsForCell(jy, jm, jd) {
    var evs = getForDate(jy, jm, jd);
    return evs.map(function (e) {
      return {
        type: 'personal',
        title: '🎂 ' + e.title,
        desc: e.desc || '',
        tags: { personal: true },
        cal: 'personal',
        daysDate: { jy: e.jy, jm: e.jm, jd: e.jd },
        etype: e.type
      };
    });
  }

  // Check if a date has personal events
  function hasEvents(jy, jm, jd) {
    return getForDate(jy, jm, jd).length > 0;
  }

  function renderList(elId) {
    var el = document.getElementById(elId);
    if (!el) return;
    var evs = getAll();
    if (evs.length === 0) {
      el.innerHTML = '<div class="text-muted text-center" style="padding:20px;">هنوز رویداد شخصی اضافه نکرده‌اید</div>';
      return;
    }
    // Sort by date
    evs.sort(function (a, b) { return (a.jy - b.jy) || (a.jm - b.jm) || (a.jd - b.jd); });
    var html = '';
    for (var i = 0; i < evs.length; i++) {
      var e = evs[i];
      html +=
        '<div class="setting-row" style="flex-wrap:wrap;">' +
          '<div style="flex:1; min-width:120px;">' +
            '<div class="setting-row__label">' + (e.type === 'birthday' ? '🎂 ' : '💍 ') + escapeHtml(e.title) + '</div>' +
            '<div class="setting-row__desc">' + Cal.toFaDigits(e.jy) + '/' + Cal.toFaDigits(e.jm) + '/' + Cal.toFaDigits(e.jd) + '</div>' +
          '</div>' +
          '<div style="display:flex; gap:4px;">' +
            '<button class="btn btn--ghost edit-personal-event" data-id="' + e.id + '" style="font-size:12px;">✏️ ویرایش</button>' +
            '<button class="btn btn--ghost del-personal-event" data-id="' + e.id + '" style="font-size:12px; color:#e63946;">🗑️ حذف</button>' +
          '</div>' +
        '</div>';
    }
    el.innerHTML = html;
    // Wire delete buttons
    el.querySelectorAll('.del-personal-event').forEach(function (btn) {
      btn.addEventListener('click', function () {
        remove(parseInt(btn.dataset.id, 10));
        renderList(elId);
        if (window.App && App.toast) App.toast('رویداد حذف شد');
      });
    });
    // Wire edit buttons
    el.querySelectorAll('.edit-personal-event').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ev = getById(parseInt(btn.dataset.id, 10));
        if (!ev) return;
        var title = document.getElementById('peTitle');
        var type = document.getElementById('peType');
        var jy = document.getElementById('peJy');
        var jm = document.getElementById('peJm');
        var jd = document.getElementById('peJd');
        if (title) title.value = ev.title;
        if (type) type.value = ev.type || 'birthday';
        if (jy) jy.value = ev.jy;
        if (jm) jm.value = ev.jm;
        if (jd) jd.value = ev.jd;
        // store edit target so addNew updates instead of adding
        if (el) el.dataset.editId = ev.id;
        if (App && App.toast) App.toast('در حال ویرایش: ' + ev.title + ' — پس از تغییر، افزودن را بزنید');
      });
    });
  }

  function getById(id) {
    return getAll().filter(function (e) { return e.id === id; })[0] || null;
  }

  function openModal() {
    var m = document.getElementById('modalPersonalEvents');
    if (!m) return;
    m.classList.add('show');
    renderList('personalEventList');
  }

  function closeModal() {
    var m = document.getElementById('modalPersonalEvents');
    if (m) m.classList.remove('show');
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
    var editTarget = null;
    var listEl = document.getElementById('personalEventList');
    if (listEl && listEl.dataset.editId) {
      editTarget = parseInt(listEl.dataset.editId, 10);
    }
    var data = {
      title: title.value.trim(),
      type: type ? type.value : 'birthday',
      desc: '',
      jy: parseInt(jy.value, 10) || 1400,
      jm: parseInt(jm.value, 10) || 1,
      jd: parseInt(jd.value, 10) || 1
    };
    if (editTarget) {
      var evs = getAll();
      for (var i = 0; i < evs.length; i++) {
        if (evs[i].id === editTarget) { evs[i] = Object.assign({}, evs[i], data); break; }
      }
      save(evs);
      if (listEl) delete listEl.dataset.editId;
      if (App && App.toast) App.toast('رویداد ویرایش شد ✓');
    } else {
      add(data);
      if (App && App.toast) App.toast('رویداد شخصی اضافه شد ✓');
    }
    title.value = '';
    if (jy) jy.value = ''; if (jm) jm.value = ''; if (jd) jd.value = '';
    renderList('personalEventList');
    // Refresh calendar if open
    if (window.App && App.getState && App.getState().route === 'calendar' && window.App.renderCalendarNow) {
      App.renderCalendarNow();
    }
  }

  var PersonalEvents = {
    getAll: getAll,
    add: add,
    remove: remove,
    getEventsForCell: getEventsForCell,
    hasEvents: hasEvents,
    renderList: renderList,
    openModal: openModal,
    closeModal: closeModal,
    addNew: addNew
  };
  if (typeof window !== 'undefined') window.PersonalEvents = PersonalEvents;
})(typeof window !== 'undefined' ? window : this);
/* ============================================================
   Balochistan Nama — m5_alarms.js (v2.0)
   M5: آلارم شخصی برای هر رویداد + UI مودال «آلارم مناسبت»
   S1: یادآوری هوشمند — ثبت رویدادهای ردشده برای ladder reminder
   ============================================================ */
(function (global) {
  'use strict';

  var LS_KEY = 'blx_event_alarms';
  var MISSED_KEY = 'blx_smart_missed';

  function readAlarms() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveAlarms(a) { localStorage.setItem(LS_KEY, JSON.stringify(a)); }

  // ثبت آلارم: eventId + min (دقیقه قبل) + sound
  function setAlarm(eventId, min, sound) {
    var a = readAlarms();
    if (min > 0) a[eventId] = { min: min, sound: sound || 'default', ts: Date.now() };
    else delete a[eventId];
    saveAlarms(a);
  }

  function getAlarms() { return readAlarms(); }

  // S1: ثبت رویداد ردشده — برای یادآوری هوشمند ladder
  function markMissed(title, isoDate) {
    var missed = [];
    try { missed = JSON.parse(localStorage.getItem(MISSED_KEY) || '[]'); } catch (e) {}
    missed.push({ title: title, ts: Date.now(), iso: isoDate });
    // فقط ۱۰ مورد اخیر
    if (missed.length > 10) missed = missed.slice(-10);
    localStorage.setItem(MISSED_KEY, JSON.stringify(missed));
  }

  function clearMissed() { localStorage.removeItem(MISSED_KEY); }

  // چک خودکار: رویدادهای شخصی که از زمانشان گذشته و آلارم فعال نداشت → missed
  function checkMissed() {
    if (typeof Events === 'undefined' || !Events.all) return;
    var a = readAlarms();
    var events = [];
    try { events = Events.all() || []; } catch (e) {}
    events.forEach(function (ev) {
      if (!ev || !ev.id) return;
      var iso = ev.dateISO || ev.iso;
      if (!iso) return;
      var d = new Date(iso);
      if (d.getTime() < Date.now()) {
        // آیا آلارم فعال بوده؟ اگر بله، یعنی کاربر دیده (یا رد کرده)
        // اگر آلارم فعال نبود → ردشده محسوب می‌شود (فقط یک‌بار ثبت می‌شود)
        if (!a[ev.id]) {
          var missed = [];
          try { missed = JSON.parse(localStorage.getItem(MISSED_KEY) || '[]'); } catch (e) {}
          var already = missed.some(function (m) { return m.iso === iso; });
          if (!already) missed.push({ title: ev.title, ts: Date.now(), iso: iso });
          if (missed.length > 10) missed = missed.slice(-10);
          localStorage.setItem(MISSED_KEY, JSON.stringify(missed));
        }
      }
    });
  }

  // UI: مودال آلارم مناسبت — در کارت مناسبت (roodadei) دکمه ⏰ آلارم
  function wireEventAlarms() {
    var container = document.getElementById('personalEventList');
    if (container) {
      var a = readAlarms();
      container.querySelectorAll('[data-ev-id]').forEach(function (row) {
        var eid = row.getAttribute('data-ev-id');
        var btn = row.querySelector('[data-alarm-btn]');
        if (!btn) {
          btn = document.createElement('button');
          btn.className = 'btn btn--ghost';
          btn.setAttribute('data-alarm-btn', '1');
          btn.style.cssText = 'padding:3px 10px; font-size:12px;';
          var ev = a[eid];
          btn.textContent = ev && ev.min ? ('⏰ ' + ev.min + 'د') : '⏰ آلارم';
          row.appendChild(btn);
        }
        btn.onclick = function (e) {
          e.stopPropagation();
          var min = prompt('آلارم چند دقیقه قبل از این مناسبت؟ (0 = خاموش)', (a[eid] ? a[eid].min : 5) || '');
          if (min == null) return;
          min = parseInt(min, 10) || 0;
          setAlarm(eid, min, 'default');
          btn.textContent = min > 0 ? ('⏰ ' + min + 'د') : '⏰ آلارم';
          if (typeof Notify !== 'undefined') Notify.reschedule();
          if (global.App && global.App.toast) global.App.toast(min > 0 ? ('⏰ آلارم ' + min + ' دقیقه قبل تنظیم شد') : 'آلارم خاموش شد');
        };
      });
    }
    // b) دکمه‌های جدیدِ کارت مناسبت در تقویم روز (data-m5alarm) — v2.0.1
    document.querySelectorAll('[data-m5alarm]').forEach(function (btn) {
      if (btn._w) return;
      btn._w = true;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var eventId = btn.getAttribute('data-m5alarm');
        var a = readAlarms();
        var cur = a[eventId];
        var min = prompt(
          cur ? '⏰ آلارم فعلی: ' + cur.min + ' دقیقه قبل — تغییر می‌دهی؟ (0 = حذف)'
              : '⏰ چند دقیقه قبل از مناسبت آلارم بزنی؟ (0 = بدون آلارم)',
          cur ? String(cur.min) : '15'
        );
        if (min == null) return;
        min = parseInt(min, 10) || 0;
        var sound = confirm('🔊 با صدای اذان آلارم بزنم؟ (خیر = صدای پیش‌فرض)') ? 'adan' : 'default';
        setAlarm(eventId, min, sound);
        btn.textContent = min > 0 ? ('⏰ ' + min + 'د') : '⏰ آلارم شخصی';
        if (typeof Notify !== 'undefined' && Notify.reschedule) Notify.reschedule();
        if (global.toast) global.toast(min > 0 ? ('⏰ آلارم ' + min + ' دقیقه قبل ثبت شد') : '⏰ آلارم حذف شد');
      });
      // نمایش وضعیت فعلی روی دکمه
      var cur2 = readAlarms()[eventId];
      if (cur2 && cur2.min) btn.textContent = '⏰ ' + cur2.min + 'د';
    });
  }

  global.BXAlarms = {
    set: setAlarm,
    get: getAlarms,
    markMissed: markMissed,
    clearMissed: clearMissed,
    checkMissed: checkMissed,
    wireUI: wireEventAlarms
  };
})(typeof window !== 'undefined' ? window : this);

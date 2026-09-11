/* ICS export — بلوچستان‌نما v1.9 */
(function () {
  'use strict';

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function dtStamp(d) {
    return d.getUTCFullYear() + pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T' +
      pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
  }

  function esc(s) {
    return String(s).replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function foldLine(s) {
    var out = '';
    while (s.length > 73) { out += s.slice(0, 73) + '\r\n '; s = ' ' + s.slice(73); }
    return out + s;
  }

  // تاریخ شمسی امروز
  function todayJalali() {
    var t = new Date();
    return Cal.toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }

  // همه رویدادهای یک سال شمسی (۱۲ ماه × ۳۱ روز)
  function collectYearEvents(jy) {
    var list = [];
    for (var jm = 1; jm <= 12; jm++) {
      var ml = Cal.jalaliMonthLength(jy, jm);
      for (var jd = 1; jd <= ml; jd++) {
        var g = Cal.toGregorian(jy, jm, jd);
        var h = Cal.gregToHijri(g.gy, g.gm, g.gd, (typeof App !== 'undefined' && App.state) ? (App.state.hijriAdjust || 0) : 0);
        var evs = Events.getDayEvents({ jy: jy, jm: jm, jd: jd }, { gy: g.gy, gm: g.gm, gd: g.gd }, { hy: h.hy, hm: h.hm, hd: h.hd }, {});
        for (var k = 0; k < evs.length; k++) {
          var e = evs[k];
          list.push({ gy: g.gy, gm: g.gm, gd: g.gd, title: e.title, desc: e.desc || '', cal: e.cal || '', calKey: e.calKey || '' });
        }
      }
    }
    return list;
  }

  // ساخت بدنه ICS از لیست رویدادها
  function buildICS(events) {
    var lines = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//BalochistanNama//v1.9//FA');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('X-WR-CALNAME:مناسبت‌های بلوچستان‌نما');
    var now = new Date();
    var uidBase = 'balochistan-nama';
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      var dt = e.gy + pad2(e.gm) + pad2(e.gd);
      var cat = e.cal || 'عمومی';
      lines.push('BEGIN:VEVENT');
      lines.push(foldLine('UID:' + uidBase + '-' + dt + '-' + i + '@balochistan-nama'));
      lines.push('DTSTAMP:' + dtStamp(now));
      lines.push('DTSTART;VALUE=DATE:' + dt);
      lines.push('DTEND;VALUE=DATE:' + nextDay(e.gy, e.gm, e.gd));
      lines.push(foldLine('SUMMARY:' + esc(e.title)));
      lines.push(foldLine('DESCRIPTION:' + esc((cat ? '[' + cat + '] ' : '') + e.desc)));
      lines.push(foldLine('CATEGORIES:' + esc(cat)));
      lines.push('TRANSP:TRANSPARENT');
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  function nextDay(gy, gm, gd) {
    var d = new Date(gy, gm - 1, gd);
    d.setDate(d.getDate() + 1);
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }

  // ذخیره فایل ICS — از bridge جاوا (ایده‌آل) یا دانلود مرورگر
  function saveICS(content, filename) {
    var blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
  }

  // API عمومی
  var ICS = {
    exportYear: function (jy) {
      try {
        if (typeof Cal === 'undefined' || typeof Events === 'undefined') {
          alert('ماژول تقویم آماده نیست');
          return;
        }
        jy = jy || todayJalali().jy;
        var evs = collectYearEvents(jy);
        if (!evs.length) { alert('مناسبتی برای سال ' + jy + ' یافت نشد'); return; }
        var content = buildICS(evs);
        saveICS(content, 'balochistan-nama-' + jy + '.ics');
        if (typeof App !== 'undefined' && App.toast) App.toast('📆 ' + evs.length + ' مناسبت در فایل تقویم ذخیره شد');
      } catch (err) {
        if (typeof App !== 'undefined' && App.toast) App.toast('خطای صادر: ' + err.message);
      }
    },
    exportDay: function (jy, jm, jd) {
      try {
        var g = Cal.toGregorian(jy, jm, jd);
        var h = Cal.gregToHijri(g.gy, g.gm, g.gd, (typeof App !== 'undefined' && App.state) ? (App.state.hijriAdjust || 0) : 0);
        var evs = Events.getDayEvents({ jy: jy, jm: jm, jd: jd }, { gy: g.gy, gm: g.gm, gd: g.gd }, { hy: h.hy, hm: h.hm, hd: h.hd }, {});
        if (!evs.length) { alert('مناسبتی در این روز نیست'); return; }
        var list = evs.map(function (e) {
          return { gy: g.gy, gm: g.gm, gd: g.gd, title: e.title, desc: e.desc || '', cal: e.cal || '' };
        });
        saveICS(buildICS(list), 'balochistan-nama-' + jy + '-' + pad2(jm) + '-' + pad2(jd) + '.ics');
        if (typeof App !== 'undefined' && App.toast) App.toast('📆 فایل ICS ساخته شد');
      } catch (err) {
        if (typeof App !== 'undefined' && App.toast) App.toast('خطای صادر: ' + err.message);
      }
    }
  };
  window.ICS = ICS;
})();

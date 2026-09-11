/* ============================================================
   Balochistan Nama - Notify module (notify.js)
   Native local notifications via Capacitor @capacitor/local-notifications.
   Schedules adhan, events and note reminders. Degrades gracefully
   (no-op) when the Capacitor bridge is unavailable (web preview).
   ============================================================ */

(function (global) {
  'use strict';

  function getLN() {
    try {
      if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.LocalNotifications) {
        return Capacitor.Plugins.LocalNotifications;
      }
      if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) {
        return window.Capacitor.Plugins.LocalNotifications;
      }
    } catch (e) {}
    return null;
  }

  function atToday(hour, minute) {
    var d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
  }

  function reschedule() {
    var LN = getLN();
    if (!LN) return; // not in native shell (web preview) -> skip silently
    var settings = (typeof App !== 'undefined' && App.getSettings) ? App.getSettings() : {};
    try {
      LN.checkPermissions().then(function (p) {
        if (!p || p.display !== 'granted') {
          return LN.requestPermissions().catch(function () {});
        }
      }).then(function () {
        LN.cancelAll().catch(function () {});
        var notes = [];
        var id = 1;

        // --- Prayer time notifications (7 days ahead) ---
        if (settings.notifyPrayer && typeof Prayer !== 'undefined' && Prayer.computeLocal) {
          var tz = -new Date().getTimezoneOffset() / 60 + (settings.dst ? 1 : 0);
          var method = Prayer.METHODS[settings.method] || Prayer.METHODS.karachi;
          var labels = { fajr: 'اذان صبح', dhuhr: 'اذان ظهر', asr: 'اذان عصر', maghrib: 'اذان مغرب', isha: 'اذان عشا' };
          var keys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
          var base = new Date(); base.setHours(0, 0, 0, 0);
          // v1.11: جمعه‌ها اذان ظهر = خطبه جمعه
          var preMin = settings.athanPreMin || 10;
          var iqamaMin = settings.athanIqama != null ? settings.athanIqama : 15;
          for (var off = 0; off < 7; off++) {
            var day = new Date(base.getTime() + off * 86400000);
            var times = Prayer.computeLocal(day, settings.lat || 26.84, settings.lng || 60.17, method, tz);
            var isFriday = day.getDay() === 5;
            for (var ki = 0; ki < keys.length; ki++) {
              var k = keys[ki];
              var hm = times[k];
              if (isNaN(hm)) continue;
              var hh = Math.floor(hm), mm = Math.round((hm - hh) * 60);
              var at = new Date(day); at.setHours(hh, mm, 0, 0);
              var isJuma = isFriday && k === 'dhuhr';
              if (at.getTime() <= Date.now()) continue;
              notes.push({
                id: id++, title: isJuma ? '🕌 خطبه جمعه' : '🕌 ' + (labels[k] || k),
                body: (isJuma ? 'وقت خطبه جمعه فرا رسید' : 'وقت ' + (labels[k] || k) + ' رسید') + ' — ' + (settings.locName || 'بلوچستان'),
                schedule: { at: at }, sound: 'adan'
              });
              // v1.11: هشدار قبل از اذان
              if (settings.athanPre) {
                var preAt = new Date(at.getTime() - preMin * 60000);
                if (preAt.getTime() > Date.now()) {
                  notes.push({
                    id: id++, title: '⏳ ' + (labels[k] || k) + ' نزدیک است',
                    body: preMin + ' دقیقه دیگر — ' + (settings.locName || 'بلوچستان'),
                    schedule: { at: preAt }, sound: 'default'
                  });
                }
              }
              // v1.11: شمارش اقامه
              if (iqamaMin > 0) {
                var iqAt = new Date(at.getTime() + iqMin * 60000);
                if (iqAt.getTime() > Date.now()) {
                  notes.push({
                    id: id++, title: '🕌 اقامه ' + (labels[k] || k),
                    body: 'نماز ' + (labels[k] || k) + ' اقامه می‌شود',
                    schedule: { at: iqAt }, sound: 'default'
                  });
                }
              }
            }
          }
        }

        // --- Event notifications (morning digest: today + tomorrow) ---
        if (settings.notifyEvents && typeof Events !== 'undefined' && Events.getDayEvents) {
          var st = (typeof App !== 'undefined' && App.getState) ? App.getState() : null;
          if (st && st.triple) {
            var evs = Events.getDayEvents(st.triple.jalali, st.triple.greg, st.triple.hijri, { isFriday: st.triple.weekdaySatFirst === 6 });
            // Tomorrow's events
            var tom = new Date(st.today.getTime() + 86400000);
            var tomTriple = (window.Cal && Cal.dateToTriple) ? Cal.dateToTriple(tom) : null;
            var tomEvs = [];
            if (tomTriple) {
              tomEvs = Events.getDayEvents(tomTriple.jalali, tomTriple.greg, tomTriple.hijri, { isFriday: tomTriple.weekdaySatFirst === 6 });
            }
            var todayNames = evs.map(function (e) { return e.title; }).slice(0, 3).join('، ');
            var tomNames = tomEvs.map(function (e) { return e.title; }).slice(0, 3).join('، ');
            var body = '';
            if (todayNames) body += 'امروز: ' + todayNames;
            if (tomNames) body += (body ? '\n' : '') + 'فردا: ' + tomNames;
            if (body) {
              notes.push({
                id: id++, title: '📅 مناسبت‌های امروز و فردا',
                body: body, schedule: { at: atToday(8, 0) }, sound: 'default'
              });
            }
          }
        }

        // --- Note reminders ---
        if (settings.notifyNotes && typeof Notes !== 'undefined' && Notes.upcomingReminders) {
          var st2 = (typeof App !== 'undefined' && App.getState) ? App.getState() : null;
          if (st2 && st2.triple) {
            var rems = Notes.upcomingReminders(st2.triple.jalali, 7);
            rems.slice(0, 5).forEach(function (r) {
              var at = new Date(r.target); at.setHours(9, 0, 0, 0);
              notes.push({
                id: id++, title: '🔔 یادآوری',
                body: (r.note.title || 'یادداشت') + (r.days === 0 ? ' (امروز)' : ' (تا ' + r.days + ' روز دیگر)'),
                schedule: { at: at }, sound: 'default'
              });
            });
          }
        }

        if (notes.length) {
          LN.schedule({ notifications: notes }).catch(function (e) {
            if (typeof App !== 'undefined' && App.toast) App.toast('نوتیفیکیشن تنظیم نشد');
          });
        }
      }).catch(function () {});
    } catch (e) {}
  }

  var Notify = { reschedule: reschedule, getPlugin: getLN };
  if (typeof window !== 'undefined') window.Notify = Notify;
})(typeof window !== 'undefined' ? window : this);

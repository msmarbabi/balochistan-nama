/* آمار شخصی — بلوچستان‌نما v1.9 */
(function () {
  'use strict';

  function readJSON(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || 'null');
      return v || fallback;
    } catch (e) { return fallback; }
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function fmtJalali(jy, jm, jd) {
    return jy + '/' + pad2(jm) + '/' + pad2(jd);
  }

  function todayParts() {
    var t = new Date();
    return Cal.toJalaali(t.getFullYear(), t.getMonth() + 1, t.getDate());
  }

  // جمع‌آوری آمار
  function collect() {
    var tp = todayParts();
    var todayKey = fmtJalali(tp.jy, tp.jm, tp.jd);

    // تسبیح امروز — {date, counts:{...}}
    var t = readJSON('blx_tasbeeh_today', {});
    var tasbeehToday = 0;
    if (t && t.date === todayKey && t.counts) {
      for (var k in t.counts) {
        if (Object.prototype.hasOwnProperty.call(t.counts, k)) tasbeehToday += t.counts[k] || 0;
      }
    }

    // روزهای پیوسته — {lastDate, streak}
    var st = readJSON('blx_tasbeeh_streak', {});
    var streakDays = st && st.streak ? st.streak : 0;

    // یادداشت‌ها
    var notes = readJSON('blx_nama_notes', []);
    var notesCount = Array.isArray(notes) ? notes.length : 0;

    // مناسبت‌های خانوادگی
    var pe = readJSON('blx_personal_events', []);
    var peCount = Array.isArray(pe) ? pe.length : 0;

    return {
      tasbeehToday: tasbeehToday,
      streakDays: streakDays,
      notesCount: notesCount,
      personalEvents: peCount,
      todayKey: todayKey
    };
  }

  function render() {
    var box = document.getElementById('statsCard');
    if (!box) return;
    var d = collect();
    box.innerHTML =
      '<div class="stats-grid">' +
      '<div class="stat-item"><div class="stat-num">' + d.tasbeehToday + '</div><div class="stat-label">تسبیح امروز</div></div>' +
      '<div class="stat-item"><div class="stat-num">' + d.streakDays + '</div><div class="stat-label">روزهای پیوسته</div></div>' +
      '<div class="stat-item"><div class="stat-num">' + d.notesCount + '</div><div class="stat-label">یادداشت‌ها</div></div>' +
      '<div class="stat-item"><div class="stat-num">' + d.personalEvents + '</div><div class="stat-label">مناسبت خانوادگی</div></div>' +
      '</div>';
  }

  // API عمومی
  var Stats = { collect: collect, render: render };
  window.Stats = Stats;
})();

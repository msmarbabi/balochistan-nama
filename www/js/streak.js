// Prayer streak tracker
(function (global) {
  'use strict';
  var KEY = 'blx_prayer_streak';
  function todayKey() {
    var d = new Date();
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || { last: null, count: 0, dates: [] }; }
    catch (e) { return { last: null, count: 0, dates: [] }; }
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function getStreak() { return load().count; }
  function markedToday() {
    var s = load();
    return s.dates.indexOf(todayKey()) !== -1;
  }
  function markToday() {
    var s = load();
    var t = todayKey();
    if (s.dates.indexOf(t) !== -1) return s.count;
    // remove old dates beyond 60 days
    s.dates = s.dates.filter(function (d) { return d > '2000-01-01'; });
    s.dates.push(t);
    // compute consecutive from today backwards
    var count = 0;
    var d = new Date();
    for (var i = 0; i < 400; i++) {
      var m = d.getMonth() + 1, day = d.getDate();
      var key = d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
      if (s.dates.indexOf(key) !== -1) { count++; d.setDate(d.getDate() - 1); }
      else break;
    }
    s.count = count;
    s.last = t;
    save(s);
    return count;
  }
  function renderStreak(elId) {
    var el = document.getElementById(elId);
    if (!el) return;
    var count = getStreak();
    var done = markedToday();
    el.innerHTML =
      '<div class="streak-box">' +
        '<div class="streak-flame">' + (count > 0 ? '🔥' : '💤') + '</div>' +
        '<div class="streak-num">' + count + '</div>' +
        '<div class="streak-label">روز پشت‌سرهم نماز خوانده‌اید</div>' +
        '<button class="btn ' + (done ? 'btn--ghost' : 'btn--primary') + '" id="streakMarkBtn" ' + (done ? 'disabled' : '') + '>' +
          (done ? '✅ امروز انجام شد' : '✅ نماز امروز رو خوندم') +
        '</button>' +
      '</div>';
    var btn = document.getElementById('streakMarkBtn');
    if (btn) btn.addEventListener('click', function () {
      markToday();
      renderStreak(elId);
      if (window.App && App.toast) App.toast('استریک شما به‌روزرسانی شد 🔥');
    });
  }
  var Streak = { getStreak: getStreak, markedToday: markedToday, markToday: markToday, renderStreak: renderStreak, load: load, save: save };
  if (typeof window !== 'undefined') window.Streak = Streak;
})(typeof window !== 'undefined' ? window : this);
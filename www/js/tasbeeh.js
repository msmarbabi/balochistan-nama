/* ============================================================
   Balochistan Nama - Tasbeeh module (tasbeeh.js)
   Digital tasbih with adhkar list, daily count, streak and
   haptic vibration on each tap. Pure vanilla, no deps.
   ============================================================ */

(function (global) {
  'use strict';

  // Adhkar: id, display name, arabic text, persian translation, default target
  var ADHKAR = [
    { id: 'subhan', name: 'تسبیحات', arabic: 'سُبْحَانَ اللّٰهِ', fa: 'منزّه است خدا', target: 33 },
    { id: 'hamd',   name: 'تحمید',   arabic: 'الْحَمْدُ لِلّٰهِ', fa: 'ستایش فقط برای خداست', target: 33 },
    { id: 'takbir', name: 'تکبیر',   arabic: 'اللّٰهُ أَکْبَرُ', fa: 'خدا بزرگ‌تر است', target: 34 },
    { id: 'tahlil', name: 'تهلیل',   arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ', fa: 'معبودی جز خدا نیست', target: 100 },
    { id: 'salawat',name: 'صلوات',   arabic: 'اللّٰهُمَّ صَلِّ عَلَیٰ مُحَمَّد', fa: 'خداوند بر محمد درود فرست', target: 100 },
    { id: 'istigh', name: 'استغفار', arabic: 'أَسْتَغْفِرُ اللّٰهَ', fa: 'از خدا آمرزش می‌خواهم', target: 100 },
    { id: 'hawq',   name: 'حوقله',   arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللّٰهِ', fa: 'توان و نیرویی نیست جز با خدا', target: 100 }
  ];

  var TODAY_KEY = 'blx_tasbeeh_today';
  var STREAK_KEY = 'blx_tasbeeh_streak';

  var current = 0; // index into ADHKAR

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function loadToday() {
    try {
      var o = JSON.parse(localStorage.getItem(TODAY_KEY) || '{}');
      if (o.date !== todayStr()) o = { date: todayStr(), counts: {} };
      if (!o.counts) o.counts = {};
      return o;
    } catch (e) { return { date: todayStr(), counts: {} }; }
  }
  function saveToday(o) { localStorage.setItem(TODAY_KEY, JSON.stringify(o)); }

  function loadStreak() {
    try { return JSON.parse(localStorage.getItem(STREAK_KEY) || '{"lastDate":"","streak":0}'); }
    catch (e) { return { lastDate: '', streak: 0 }; }
  }
  function saveStreak(o) { localStorage.setItem(STREAK_KEY, JSON.stringify(o)); }

  function totalToday(o) {
    var t = 0;
    for (var k in o.counts) if (o.counts.hasOwnProperty(k)) t += o.counts[k];
    return t;
  }

  // Update streak based on yesterday's activity
  function refreshStreak() {
    var o = loadToday();
    var total = totalToday(o);
    if (total <= 0) return; // nothing done today yet
    var s = loadStreak();
    var y = new Date();
    y.setDate(y.getDate() - 1);
    var yStr = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    if (s.lastDate === todayStr()) return; // already counted today
    if (s.lastDate === yStr) s.streak += 1;
    else s.streak = 1;
    s.lastDate = todayStr();
    saveStreak(s);
  }

  function getCount() {
    var o = loadToday();
    return o.counts[ADHKAR[current].id] || 0;
  }

  function render() {
    var view = document.getElementById('view-tasbeeh');
    if (!view) return;
    var dh = ADHKAR[current];
    var count = getCount();
    var o = loadToday();
    var total = totalToday(o);
    var s = loadStreak();

    var chips = '';
    for (var i = 0; i < ADHKAR.length; i++) {
      chips += '<button class="tb-chip' + (i === current ? ' active' : '') + '" data-i="' + i + '">' +
        escapeHtml(ADHKAR[i].name) + '</button>';
    }

    var pct = dh.target ? Math.min(100, Math.round((count / dh.target) * 100)) : 0;

    view.innerHTML =
      '<div class="hero" id="tbHero">' +
        '<div class="hero__weekday">تسبیح دیجیتال</div>' +
        '<div class="hero__date">ذکر را انتخاب کن و بزن</div>' +
      '</div>' +
      '<div class="tb-chips">' + chips + '</div>' +
      '<div class="tb-stage">' +
        '<div class="tb-ring" id="tbRing" style="--p:' + pct + '">' +
          '<div class="tb-ring__inner">' +
            '<div class="tb-arabic" id="tbArabic">' + dh.arabic + '</div>' +
            '<div class="tb-fa" id="tbFa">' + dh.fa + '</div>' +
            '<div class="tb-count" id="tbCount">' + count + '</div>' +
            '<div class="tb-target">از ' + (dh.target || '∞') + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="tb-tap" id="tbTap">بزن</button>' +
      '</div>' +
      '<div class="tb-stats">' +
        '<div class="tb-stat"><div class="tb-stat__v" id="tbTotal">' + total + '</div><div class="tb-stat__l">ذکر امروز</div></div>' +
        '<div class="tb-stat"><div class="tb-stat__v" id="tbStreak">' + s.streak + '</div><div class="tb-stat__l">روز متوالی</div></div>' +
      '</div>' +
      '<div class="card" style="margin-top:12px;" id="statsCard"></div>' +
      '<div style="display:flex; gap:8px; margin-top:10px;">' +
        '<button class="btn btn--ghost" id="tbReset" style="flex:1;">ریست این ذکر</button>' +
        '<button class="btn btn--primary" id="tbVib" style="flex:1;">لرزش: روشن</button>' +
      '</div>';

    // آمار شخصی
    if (window.Stats) try { Stats.render(); } catch (e) {}

    // wire
    var chipsEls = view.querySelectorAll('.tb-chip');
    chipsEls.forEach(function (c) {
      c.addEventListener('click', function () {
        current = parseInt(c.dataset.i, 10);
        render();
      });
    });
    var tap = document.getElementById('tbTap');
    if (tap) tap.addEventListener('click', onTap);
    var reset = document.getElementById('tbReset');
    if (reset) reset.addEventListener('click', function () {
      var o2 = loadToday(); o2.counts[ADHKAR[current].id] = 0; saveToday(o2); render();
    });
    var vib = document.getElementById('tbVib');
    if (vib) vib.addEventListener('click', function () {
      var on = vib.dataset.on !== '0';
      vib.dataset.on = on ? '0' : '1';
      vib.textContent = on ? 'لرزش: خاموش' : 'لرزش: روشن';
    });
  }

  function onTap() {
    var o = loadToday();
    var id = ADHKAR[current].id;
    o.counts[id] = (o.counts[id] || 0) + 1;
    saveToday(o);
    refreshStreak();
    var count = o.counts[id];
    var cEl = document.getElementById('tbCount');
    if (cEl) cEl.textContent = count;
    var dh = ADHKAR[current];
    var pct = dh.target ? Math.min(100, Math.round((count / dh.target) * 100)) : 0;
    var ring = document.getElementById('tbRing');
    if (ring) ring.style.setProperty('--p', pct);
    var totalEl = document.getElementById('tbTotal');
    if (totalEl) totalEl.textContent = totalToday(o);
    var streakEl = document.getElementById('tbStreak');
    var s = loadStreak();
    if (streakEl) streakEl.textContent = s.streak;
    // haptic
    var vib = document.getElementById('tbVib');
    if (vib && vib.dataset.on !== '0' && navigator.vibrate) navigator.vibrate(25);
    // pop animation
    if (cEl) { cEl.classList.remove('pop'); void cEl.offsetWidth; cEl.classList.add('pop'); }
    // target reached
    if (dh.target && count >= dh.target) {
      if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
      if (typeof App !== 'undefined' && App.toast) App.toast('✅ ' + dh.name + ' تکمیل شد');
    }
  }

  function escapeHtml(s) { return (window.BXUtils ? BXUtils.escapeHtml : function (x) { return String(x == null ? '' : x); })(s); }

  var Tasbeeh = { render: render, onTap: onTap };
  if (typeof window !== 'undefined') window.Tasbeeh = Tasbeeh;
})(typeof window !== 'undefined' ? window : this);

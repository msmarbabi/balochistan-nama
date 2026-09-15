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


  // ===== v1.16: شمارش صوتی ذکر (راه A — SpeechRecognizer سیستمی) =====
  var voiceOn = false;

  // الگوهای نرمال‌شده (بدون فاصله) برای هر ذکر
  var VOICE_PATTERNS = {
    hawq:     ['لا ح حول و لا قوه الا بالله', 'لاحولولا قوه الاالله'],
    tahlil:   ['لا اله الا الله'],
    salawat:  ['اللهم صل علی', 'اللهم صلی علی'],
    subhan:   ['سبحان الله'],
    istigh:   ['استغفر الله'],
    takbir:   ['الله اکبر'],
    hamd:     ['الحمد لله']
  };

  function normVoice(t) {
    return String(t || '')
      .replace(/[\u064B-\u065F\u0670\u0640]/g, '')       // اعراب و کشیده
      .replace(/[\u200c\u200d\u061F\u060C\u061B\u0648]/g, function (c) { return c === '\u0648' ? 'و' : ''; })
      .replace(/[\u0622\u0623\u0625\u0671]/g, 'ا')        // آ أ إ ٱ ← ا
      .replace(/\u0643/g, 'ک')                                // ک عربی←فارسی
      .replace(/\u064A/g, 'ی')                                // ي عربی←فارسی
      .replace(/\u0629/g, 'ه')                                // ة←ه
      .replace(/\u0649/g, 'ی')                                // ى←ی
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }
  function normKey(t) { return normVoice(t).replace(/ /g, ''); }

  // فاصله لِوِنشتاین با سقف زودهنگام
  function lev(a, b, maxD) {
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > maxD) return maxD + 1;
    var prev = new Array(lb + 1), cur = new Array(lb + 1), i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i; var rowMin = cur[0];
      var ca = a.charCodeAt(i - 1);
      for (j = 1; j <= lb; j++) {
        var cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > maxD) return maxD + 1;
      var tmp = prev; prev = cur; cur = tmp;
    }
    return prev[lb];
  }

  // شمارش تطبیق‌های غیرهمپوشان یک الگو در متن — with used mask
  function scanPattern(text, pat, maxD, used) {
    var n = 0, i = 0;
    var L = pat.length;
    while (i + L - 2 <= text.length) {
      var hit = false;
      for (var wlen = L - 1; wlen <= L + 1 && i + wlen <= text.length; wlen++) {
        var skip = false;
        for (var k = i; k < i + wlen && k < text.length; k++) { if (used[k]) { skip = true; break; } }
        if (skip) continue;
        if (lev(text.substr(i, wlen), pat, maxD) <= maxD) { hit = true; for (var m = i; m < i + wlen; m++) used[m] = true; break; }
      }
      if (hit) { n++; i += L - 1; }
      else i += 1;
    }
    return n;
  }

  // ورودی: آرایه متن‌های شنیده‌شده → خروجی: [{id,n,...}]
  function matchCounts(texts) {
    var text = normKey(Array.isArray(texts) ? texts.join(' ') : (texts || ''));
    var used = new Array(text.length + 1);
    for (var u = 0; u < used.length; u++) used[u] = false;
    var hits = [];
    var ids = Object.keys(VOICE_PATTERNS);
    // طولانی‌ها اول تا Shortها دابل‌شمارش نکنند
    ids.sort(function (a, b) { return VOICE_PATTERNS[b][0].length - VOICE_PATTERNS[a][0].length; });
    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii], pats = VOICE_PATTERNS[id], n = 0;
      for (var p = 0; p < pats.length; p++) {
        var pat = normKey(pats[p]);
        if (!pat) continue;
        var maxD = pat.length >= 9 ? 2 : 1;
        n += scanPattern(text, pat, maxD, used);
      }
      if (n > 0) hits.push({ id: id, n: n });
    }
    return hits;
  }

  function voiceVib(pattern) {
    var vib = document.getElementById('tbVib');
    if (vib && vib.dataset.on === '0') return;
    if (navigator.vibrate) { try { navigator.vibrate(pattern || 25); } catch (e) {} }
    else if (typeof NativeApp !== 'undefined' && NativeApp.vibrate) { try { NativeApp.vibrate(60); } catch (e) {} }
  }

  function syncTbDisplay(o) {
    var dh = ADHKAR[current];
    var count = o.counts[dh.id] || 0;
    var cEl = document.getElementById('tbCount');
    if (cEl) { cEl.textContent = count; cEl.classList.remove('pop'); void cEl.offsetWidth; cEl.classList.add('pop'); }
    var pct = dh.target ? Math.min(100, Math.round((count / dh.target) * 100)) : 0;
    var ring = document.getElementById('tbRing');
    if (ring) ring.style.setProperty('--p', pct);
    var totalEl = document.getElementById('tbTotal');
    if (totalEl) totalEl.textContent = totalToday(o);
    var streakEl = document.getElementById('tbStreak');
    if (streakEl) streakEl.textContent = loadStreak().streak;
  }

  // هدف: تکمیل ذکر — برای ذکر فعال بررسی کن
  function voiceTargets(hits) {
    for (var i = 0; i < hits.length; i++) {
      for (var a = 0; a < ADHKAR.length; a++) {
        if (ADHKAR[a].id === hits[i].id && ADHKAR[a].target) {
          var o = loadToday(), c = o.counts[ADHKAR[a].id] || 0;
          if (c >= ADHKAR[a].target && c - hits[i].n < ADHKAR[a].target) {
            if (typeof App !== 'undefined' && App.toast) App.toast('\u2705 ' + ADHKAR[a].name + ' تکمیل شد');
          }
        }
      }
    }
  }

  window.__tasbihHeard = function (texts) {
    var raw = Array.isArray(texts) ? texts[0] : String(texts || '');
    var hits = matchCounts(texts);
    var logEl = document.getElementById('tbVoiceLog');
    var nameOf = {}; ADHKAR.forEach(function (d) { nameOf[d.id] = d.name; });
    if (!hits.length) {
      if (logEl) logEl.innerHTML = '<span style="opacity:.55">🔇 «' + escapeHtml(raw) + '» — ذکر شناسایی نشد</span>';
      return;
    }
    var o = loadToday(), total = 0, parts = [];
    for (var i = 0; i < hits.length; i++) {
      o.counts[hits[i].id] = (o.counts[hits[i].id] || 0) + hits[i].n;
      total += hits[i].n;
      parts.push(nameOf[hits[i].id] + ' ×' + hits[i].n);
    }
    saveToday(o); refreshStreak(); syncTbDisplay(o); voiceTargets(hits);
    voiceVib(total === 1 ? [30] : [30, 40, 30]);
    if (logEl) logEl.innerHTML = '🎤 «' + escapeHtml(raw) + '» ← <b style="color:var(--accent)">' + escapeHtml(parts.join('، ')) + '</b>';
  };

  window.__tasbihVoiceState = function (st) {
    var btn = document.getElementById('tbVoice');
    if (!btn) return;
    if (st === 'on' || st === 'ready' || st === 'listening') {
      voiceOn = true;
      btn.classList.add('tb-voice-live');
      btn.textContent = st === 'listening' ? '🔴 در حال شنیدن…' : '🎙️ فعال — گوش میده';
    } else {
      voiceOn = false;
      btn.classList.remove('tb-voice-live');
      btn.textContent = '\ud83c\udfa4 شمارش صوتی';
    }
  };

  window.__tasbihVoiceError = function (code) {
    var msg = 'خطای شنیدن';
    if (code === 9001) msg = 'سرویس تشخیص گفتار روی این گوشی فعال نیست (بروزرسانی گوگل اپ)';
    else if (code === 9003) msg = 'مجوز میکروفن رد شد — از تنظیمات اندروید فعالش کن';
    else if (code === 103) msg = 'مجوز میکروفن لازم است';
    else if (code === 7 || code === 12 || code === 2) msg = 'تشخیص گفتار به اینترنت/سرویس نیاز دارد — اتصال را چک کن';
    voiceOn = false;
    window.__tasbihVoiceState('off');
    var logEl = document.getElementById('tbVoiceLog');
    if (logEl) logEl.textContent = '⚠️ ' + msg;
    if (typeof App !== 'undefined' && App.toast) App.toast('⚠️ ' + msg);
  };

  function toggleVoice() {
    if (typeof NativeApp === 'undefined' || !NativeApp.tasbihVoiceStart) {
      if (typeof App !== 'undefined' && App.toast) App.toast('🎤 شمارش صوتی فقط در نسخه اندروید فعال است');
      return;
    }
    try {
      if (voiceOn || NativeApp.tasbihVoiceActive()) { NativeApp.tasbihVoiceStop(); window.__tasbihVoiceState('off'); }
      else { NativeApp.tasbihVoiceStart(); window.__tasbihVoiceState('on'); var lg = document.getElementById('tbVoiceLog'); if (lg) lg.textContent = '⏳ راه‌اندازی میکروفن…'; }
    } catch (e) { if (typeof App !== 'undefined' && App.toast) App.toast('خطا در راه‌اندازی میکروفن'); }
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
      '</div>' +
      '<div style="display:flex; gap:8px; margin-top:8px; align-items:center;">' +
        '<button class="btn btn--ghost' + (voiceOn ? ' tb-voice-live' : '') + '" id="tbVoice" style="flex:1;">' + (voiceOn ? '🎙️ فعال — گوش میده' : '🎤 شمارش صوتی') + '</button>' +
      '</div>' +
      '<div id="tbVoiceLog" class="text-small text-muted" style="margin-top:6px; text-align:center; line-height:1.8;"></div>';

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
    var tbv = document.getElementById('tbVoice');
    if (tbv) tbv.addEventListener('click', toggleVoice);
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

  var Tasbeeh = { render: render, onTap: onTap, matchCounts: matchCounts, normKey: normKey };
  if (typeof window !== 'undefined') window.Tasbeeh = Tasbeeh;
})(typeof window !== 'undefined' ? window : this);

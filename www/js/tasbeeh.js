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
  var CUSTOM_KEY = 'blx_tasbeeh_custom'; // v1.16: ذکرهای دلخواه

  function loadCustom() {
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]') || []; }
    catch (e) { return []; }
  }
  function saveCustom(list) { localStorage.setItem(CUSTOM_KEY, JSON.stringify(list || [])); }

  // v1.16: لیست یکپارچه ذکرها (۷ ثابت + دلخواه‌ها)
  function allDhikr() {
    return ADHKAR.concat(loadCustom().map(function (c) {
      return { id: c.id, name: c.name, arabic: c.text || c.name, fa: 'ذکر شخصی', target: c.target || 0, custom: true };
    }));
  }

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
    return o.counts[allDhikr()[current].id] || 0;
  }


  // ===== v1.16: شمارش صوتی ذکر (راه A — SpeechRecognizer سیستمی) =====
  var voiceOn = false;
  var volOn = false;

  function loadVolPref() { try { return localStorage.getItem('blx_tasbeeh_volmode') === '1'; } catch (e) { return false; } }
  function saveVolPref(on) { try { localStorage.setItem('blx_tasbeeh_volmode', on ? '1' : '0'); } catch (e) {} }

  function toggleVol() {
    if (typeof NativeApp === 'undefined' || !NativeApp.setVolumeCountMode) {
      if (typeof App !== 'undefined' && App.toast) App.toast('🔊 شمارش با ولوم فقط در نسخه اندروید فعال است');
      return;
    }
    volOn = !volOn;
    try { NativeApp.setVolumeCountMode(volOn); } catch (e) {}
    saveVolPref(volOn);
    var b = document.getElementById('tbVol');
    if (b) {
      b.classList.toggle('tb-voice-live', volOn);
      b.textContent = volOn ? '🔊 ولوم: فعال' : '🔊 شمارش با ولوم';
    }
    if (typeof App !== 'undefined' && App.toast) App.toast(volOn ? '🔊 دکمههای ولوم میشمارند — بالا = اضافه، پایین = کم' : 'شمارش با ولوم خاموش شد');
  }

  window.__volumeKey = function (dir) {
    var view = document.getElementById('view-tasbeeh');
    if (!view || !view.classList.contains('active')) return; // فقط وقتی تب تسبیح بازه
    var o = loadToday();
    var id = allDhikr()[current].id;
    var n = (o.counts[id] || 0) + (dir === 'up' ? 1 : -1);
    if (n < 0) n = 0;
    o.counts[id] = n;
    saveToday(o); refreshStreak(); syncTbDisplay(o);
    voiceVib(20);
  };

  // ===== مودال ذکر دلخواه =====
  function buildCustomModal() {
    return '<div class="tb-cmodal" id="tbCustomModal">' +
      '<div class="tb-cmodal__card">' +
        '<div style="font-weight:700; margin-bottom:10px;">ذکر دلخواه</div>' +
        '<input class="input" id="tbZName" placeholder="نام ذکر (مثلاً: یا زهرا)" style="width:100%; margin-bottom:8px;">' +
        '<input class="input" id="tbZText" placeholder="متن ذکر برای شمارش صوتی (کوتاه بنویس)" style="width:100%; margin-bottom:8px;">' +
        '<input class="input" id="tbZTarget" type="number" min="0" placeholder="هدف (مثلاً ۱۰۰ — خالی = بی‌نهایت)" style="width:100%; margin-bottom:10px;">' +
        '<div style="display:flex; gap:8px;">' +
          '<button class="btn btn--primary" id="tbZSave" style="flex:1;">ذخیره</button>' +
          '<button class="btn btn--ghost" id="tbZCancel" style="flex:1;">بستن</button>' +
        '</div>' +
        '<div id="tbZList" style="margin-top:10px;"></div>' +
        '<div class="text-small text-muted" style="margin-top:8px; line-height:1.7;">اگه متن ذکر را بنویسی، شمارش صوتی هم همان را میشناسد 🎤</div>' +
      '</div>' +
    '</div>';
  }

  function renderCustomList() {
    var box = document.getElementById('tbZList');
    if (!box) return;
    var list = loadCustom();
    if (!list.length) { box.innerHTML = '<div class="text-small text-muted" style="text-align:center; padding:6px;">هنوز ذکر شخصی نداری</div>'; return; }
    var h = '';
    list.forEach(function (c) {
      h += '<div style="display:flex; align-items:center; gap:8px; padding:6px 0; border-bottom:1px solid var(--border);">' +
        '<span style="flex:1; font-size:13px;">' + escapeHtml(c.name) + (c.target ? ' <span class="text-muted text-small">(هدف ' + c.target + ')</span>' : '') + '</span>' +
        '<button class="btn btn--ghost" data-zedit="' + c.id + '" style="padding:2px 8px; font-size:11px;">✏️</button>' +
        '<button class="btn btn--ghost" data-zdel="' + c.id + '" style="padding:2px 8px; font-size:11px; color:#f87171;">🗑️</button>' +
      '</div>';
    });
    box.innerHTML = h;
    box.querySelectorAll('[data-zdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-zdel');
        if (!confirm('این ذکر حذف شود؟')) return;
        saveCustom(loadCustom().filter(function (c) { return c.id !== id; }));
        if (allDhikr()[current] && allDhikr()[current].id === id) current = 0;
        renderCustomList(); render();
      });
    });
    box.querySelectorAll('[data-zedit]').forEach(function (b) {
      b.addEventListener('click', function () {
        var c = loadCustom().find(function (x) { return x.id === b.getAttribute('data-zedit'); });
        if (!c) return;
        document.getElementById('tbZName').value = c.name;
        document.getElementById('tbZText').value = c.text || '';
        document.getElementById('tbZTarget').value = c.target || '';
        document.getElementById('tbZSave').dataset.editing = c.id;
      });
    });
  }

  function openCustomModal() {
    var m = document.getElementById('tbCustomModal');
    if (!m) return;
    document.getElementById('tbZName').value = '';
    document.getElementById('tbZText').value = '';
    document.getElementById('tbZTarget').value = '';
    var sv = document.getElementById('tbZSave');
    if (sv) delete sv.dataset.editing;
    renderCustomList();
    m.classList.add('show');
  }

  function wireCustomModal() {
    var add = document.getElementById('tbAddZekr');
    if (add) add.addEventListener('click', openCustomModal);
    var m = document.getElementById('tbCustomModal');
    if (!m) return;
    m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('show'); });
    var cancel = document.getElementById('tbZCancel');
    if (cancel) cancel.addEventListener('click', function () { m.classList.remove('show'); });
    var save = document.getElementById('tbZSave');
    if (save) save.addEventListener('click', function () {
      var name = document.getElementById('tbZName').value.trim();
      var text = document.getElementById('tbZText').value.trim();
      var target = parseInt(document.getElementById('tbZTarget').value, 10) || 0;
      if (!name) { if (typeof App !== 'undefined' && App.toast) App.toast('نام ذکر را بنویس'); return; }
      var list = loadCustom();
      var editing = save.dataset.editing;
      if (editing) {
        list = list.map(function (c) { return c.id === editing ? { id: c.id, name: name, text: text, target: target } : c; });
      } else {
        list.push({ id: 'c_' + Date.now().toString(36) + Math.floor(Math.random() * 999), name: name, text: text, target: target });
      }
      saveCustom(list);
      m.classList.remove('show');
      current = allDhikr().length - 1; // برو روی ذکر تازه
      render();
      if (typeof App !== 'undefined' && App.toast) App.toast('✅ ذکر «' + name + '» ذخیره شد');
    });
  }

  // ===== سوایپ چپ/راست روی صفحه شمارش =====
  function wireSwipe() {
    var stage = document.querySelector('.tb-stage');
    if (!stage || stage.__sw) return;
    stage.__sw = true;
    var sx = 0, sy = 0, done = false;
    stage.addEventListener('touchstart', function (e) {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; done = false;
    }, { passive: true });
    stage.addEventListener('touchmove', function (e) {
      if (done) return;
      var dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        window.__volumeKey(dx < 0 ? 'up' : 'down'); // چپ = اضافه، راست = کم
        done = true;
      }
    }, { passive: true });
  }

  // ===== تور آموزش اولین اجرا =====
  var TOUR_FLAG = 'blx_tasbeeh_tour_v1';
  function startTour() {
    try { if (localStorage.getItem(TOUR_FLAG) === '1') return; } catch (e) { return; }
    var steps = [
      { id: 'tbTap',     text: 'دکمه شمارش — هر بار بزنی یکی اضافه میشه ✋' },
      { id: 'tbVoice',   text: '🎤 شمارش صوتی — ذکرت رو بلند بگو، خودش میشماره و ویبره میده' },
      { id: 'tbVol',     text: '🔊 دکمههای ولوم گوشی هم میشمارن — حتی با گوشی توی جیب!' },
      { id: 'tbAddZekr', text: '＋ ذکر دلخواه — هر ذکری که دوست داری بساز' },
      { id: 'tbRing',    text: 'روی صفحه شمارش انگشتت رو بکش: چپ = اضافه، راست = کم' }
    ];
    var ov = document.createElement('div');
    ov.className = 'tour-overlay';
    document.body.appendChild(ov);
    var idx = 0;
    function cleanup() {
      try { ov.remove(); } catch (e) {}
      document.querySelectorAll('.tour-hl').forEach(function (x) {
        x.classList.remove('tour-hl'); x.style.zIndex = '';
      });
      try { localStorage.setItem(TOUR_FLAG, '1'); } catch (e) {}
    }
    function show() {
      if (idx >= steps.length) { cleanup(); return; }
      var oldCard = ov.querySelector('.tour-card');
      if (oldCard) oldCard.remove();
      var st = steps[idx];
      var el = document.getElementById(st.id);
      if (!el) { idx++; show(); return; }
      document.querySelectorAll('.tour-hl').forEach(function (x) { x.classList.remove('tour-hl'); x.style.zIndex = ''; });
      el.classList.add('tour-hl'); el.style.zIndex = '320';
      var r = el.getBoundingClientRect();
      var card = document.createElement('div');
      card.className = 'tour-card';
      card.innerHTML = '<div>' + st.text + '</div><div class="text-small text-muted" style="margin-top:8px; opacity:.7;">برای ادامه لمس کن (' + (idx + 1) + '/' + steps.length + ')</div>';
      ov.appendChild(card);
      var cw = Math.min(280, window.innerWidth - 32);
      card.style.width = cw + 'px';
      var top = r.bottom + 12;
      if (top + 110 > window.innerHeight) top = Math.max(12, r.top - 118);
      var left = Math.max(16, Math.min(r.left, window.innerWidth - cw - 16));
      card.style.top = top + 'px';
      card.style.left = left + 'px';
      idx++;
    }
    ov.addEventListener('click', show);
    setTimeout(show, 350);
  }

  // رفتن از تب تسبیح — خاموشی حالتهای ویژه
  function onRouteLeave() {
    if (chain.on) chainStop();
    if (volOn && typeof NativeApp !== 'undefined' && NativeApp.setVolumeCountMode) {
      try { NativeApp.setVolumeCountMode(false); } catch (e) {}
      volOn = false;
    }
    if (voiceOn && typeof NativeApp !== 'undefined' && NativeApp.tasbihVoiceStop) {
      try { NativeApp.tasbihVoiceStop(); } catch (e) {}
      voiceOn = false;
    }
  }

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
  function activePatterns() {
    var p = {};
    for (var k in VOICE_PATTERNS) p[k] = VOICE_PATTERNS[k].slice();
    loadCustom().forEach(function (c) {
      if (c.text && String(c.text).trim()) p[c.id] = [String(c.text).trim().slice(0, 30)];
    });
    return p;
  }
  function matchCounts(texts) {
    var text = normKey(Array.isArray(texts) ? texts.join(' ') : (texts || ''));
    var used = new Array(text.length + 1);
    for (var u = 0; u < used.length; u++) used[u] = false;
    var hits = [];
    var PATS = activePatterns();
    var ids = Object.keys(PATS);
    // طولانی‌ها اول تا Shortها دابل‌شمارش نکنند
    ids.sort(function (a, b) { return VOICE_PATTERNS[b][0].length - VOICE_PATTERNS[a][0].length; });
    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii], pats = PATS[id], n = 0;
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
    var dh = allDhikr()[current];
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
    var list = allDhikr();
    for (var i = 0; i < hits.length; i++) {
      for (var a = 0; a < list.length; a++) {
        if (list[a].id === hits[i].id && list[a].target) {
          var o = loadToday(), c = o.counts[list[a].id] || 0;
          if (c >= list[a].target && c - hits[i].n < list[a].target) {
            if (typeof App !== 'undefined' && App.toast) App.toast('\u2705 ' + list[a].name + ' تکمیل شد');
          }
        }
      }
    }
  }

  window.__tasbihHeard = function (texts) {
    var raw = Array.isArray(texts) ? texts[0] : String(texts || '');
    var hits = matchCounts(texts);
    var logEl = document.getElementById('tbVoiceLog');
    var nameOf = {}; allDhikr().forEach(function (d) { nameOf[d.id] = d.name; });
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

  // ===== v1.16: پخش زنجیره‌ای اذکار (بلندخوانی ترتیبی + اسکرول خودکار) =====
  var chain = { on: false, i: 0, timer: null, utter: null };
  function chainStop() {
    chain.on = false;
    if (chain.timer) { clearTimeout(chain.timer); chain.timer = null; }
    try { window.speechSynthesis.cancel(); } catch (e) {}
    var b = document.getElementById('tbChain');
    if (b) { b.textContent = '🔁 پخش زنجیره‌ای اذکار'; b.classList.remove('tb-voice-live'); }
  }
  function chainStep() {
    if (!chain.on) return;
    var list = allDhikr();
    if (!list.length) { chainStop(); return; }
    var wrap = list.length;
    if (chain.i >= wrap) { chainStop(); if (typeof App !== 'undefined' && App.toast) App.toast('✨ زنجیره کامل شد'); return; }
    current = chain.i;
    render();
    var dh = list[chain.i];
    var arabicEl = document.getElementById('tbArabic');
    if (arabicEl) { arabicEl.style.outline = '2px solid var(--accent)'; arabicEl.style.outlineOffset = '6px'; arabicEl.style.borderRadius = '8px'; setTimeout(function () { if (arabicEl) { arabicEl.style.outline = 'none'; } }, 900); }
    try {
      var act = document.querySelector('.tb-chip.active');
      if (act && act.scrollIntoView) act.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } catch (e) {}
    // بلندخوانی عربی + فارسی
    var go = function () {
      if (!chain.on) return;
      try {
        var u = new SpeechSynthesisUtterance(dh.arabic + '. ' + (dh.fa || ''));
        u.lang = 'fa-IR'; u.rate = 0.85; u.pitch = 1;
        u.onend = function () { chain.timer = setTimeout(function () { chain.i++; chainStep(); }, 1100); };
        u.onerror = function () { chain.timer = setTimeout(function () { chain.i++; chainStep(); }, 1100); };
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      } catch (e) { chain.timer = setTimeout(function () { chain.i++; chainStep(); }, 1500); }
    };
    if (dh.target && dh.target > 3) {
      // تکرار کوتاه هدفمند (حداکثر ۳ بار برای طولانی‌شدن ناخواسته)
      var reps = Math.min(3, dh.target), k = 0;
      var once = function () {
        if (!chain.on) return;
        if (k++ >= reps) { go(); return; }
        try {
          var u2 = new SpeechSynthesisUtterance(dh.arabic);
          u2.lang = 'fa-IR'; u2.rate = 1;
          u2.onend = function () { setTimeout(once, 350); };
          u2.onerror = function () { setTimeout(once, 350); };
          window.speechSynthesis.cancel(); window.speechSynthesis.speak(u2);
          var c = loadToday();
          c.counts[dh.id] = (c.counts[dh.id] || 0) + 1;
          saveToday(c);
          var ce = document.getElementById('tbCount');
          if (ce) ce.textContent = (c.counts[dh.id] || 0);
        } catch (e) { go(); }
      };
      once();
    } else {
      go();
    }
  }
  function chainStart() {
    if ('speechSynthesis' in window) {
      chain.on = true; chain.i = current || 0;
      var b = document.getElementById('tbChain');
      if (b) { b.textContent = '⏹ توقف پخش زنجیره'; b.classList.add('tb-voice-live'); }
      chainStep();
    } else if (typeof App !== 'undefined' && App.toast) {
      App.toast('این دستگاه پخش صوت پشتیبانی نمی‌کند');
    }
  }

  function render() {
    var view = document.getElementById('view-tasbeeh');
    if (!view) return;
    var dh = allDhikr()[current];
    var count = getCount();
    var o = loadToday();
    var total = totalToday(o);
    var s = loadStreak();

    var LIST = allDhikr();
    var chips = '';
    for (var i = 0; i < LIST.length; i++) {
      chips += '<button class="tb-chip' + (i === current ? ' active' : '') + '" data-i="' + i + '">' +
        escapeHtml(LIST[i].name) + '</button>';
    }
    chips += '<button class="tb-chip tb-chip--add" id="tbAddZekr" title="افزودن ذکر دلخواه">＋ ذکر</button>';

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
        '<button class="btn btn--ghost' + (volOn ? ' tb-voice-live' : '') + '" id="tbVol" style="flex:1;">' + (volOn ? '🔊 ولوم: فعال' : '🔊 شمارش با ولوم') + '</button>' +
      '</div>' +
      '<div style="display:flex; gap:8px; margin-top:8px;">' +
        '<button class="btn btn--ghost' + (chain.on ? ' tb-voice-live' : '') + '" id="tbChain" style="flex:1;">' + (chain.on ? '⏹ توقف پخش زنجیره' : '🔁 پخش زنجیره‌ای اذکار') + '</button>' +
      '</div>' +
      '<div id="tbVoiceLog" class="text-small text-muted" style="margin-top:6px; text-align:center; line-height:1.8;"></div>' +
      '<div class="tour-hint text-small text-muted" style="text-align:center; margin-top:4px; opacity:.7;">💡 روی صفحه شمارش، چپ = اضافه، راست = کم</div>' +
      buildCustomModal();

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
    var chainBtn = document.getElementById('tbChain');
    if (chainBtn) chainBtn.addEventListener('click', function () { if (chain.on) chainStop(); else chainStart(); });
    var reset = document.getElementById('tbReset');
    if (reset) reset.addEventListener('click', function () {
      var o2 = loadToday(); o2.counts[allDhikr()[current].id] = 0; saveToday(o2); render();
    });
    var vib = document.getElementById('tbVib');
    if (vib) vib.addEventListener('click', function () {
      var on = vib.dataset.on !== '0';
      vib.dataset.on = on ? '0' : '1';
      vib.textContent = on ? 'لرزش: خاموش' : 'لرزش: روشن';
    });
    var tbv = document.getElementById('tbVoice');
    if (tbv) tbv.addEventListener('click', toggleVoice);
    var tbvol = document.getElementById('tbVol');
    if (tbvol) tbvol.addEventListener('click', toggleVol);
    wireCustomModal();
    wireSwipe();
    if (loadVolPref() && typeof NativeApp !== 'undefined' && NativeApp.setVolumeCountMode) {
      volOn = true;
      try { NativeApp.setVolumeCountMode(true); } catch (e) {}
      var vb = document.getElementById('tbVol');
      if (vb) { vb.classList.add('tb-voice-live'); vb.textContent = '🔊 ولوم: فعال'; }
    }
    startTour();
  }

  function onTap() {
    var o = loadToday();
    var id = allDhikr()[current].id;
    o.counts[id] = (o.counts[id] || 0) + 1;
    saveToday(o);
    refreshStreak();
    var count = o.counts[id];
    var cEl = document.getElementById('tbCount');
    if (cEl) cEl.textContent = count;
    var dh = allDhikr()[current];
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

  function currentInfo() {
    var d = allDhikr()[current];
    return d ? { name: d.name, target: d.target || 0 } : null;
  }
  var Tasbeeh = { render: render, onTap: onTap, matchCounts: matchCounts, normKey: normKey, onRouteLeave: onRouteLeave, currentInfo: currentInfo };
  if (typeof window !== 'undefined') window.Tasbeeh = Tasbeeh;
})(typeof window !== 'undefined' ? window : this);

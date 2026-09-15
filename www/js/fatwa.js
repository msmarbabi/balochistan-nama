/* ============================================================
   Balochistan Nama — Fatwa module (fatwa.js) v1.16
   کتاب فتاوا: هسته ۱٬۴۰۰ منتخب آفلاین + دانلود پک کامل ۹٬۰۸۶
   منبع محتوا: مجموعه فتاوای اهل سنت — IslamPP (islampp.org)
   حقوق محتوای علمی متعلق به نویسندگان اصلی است.
   ============================================================ */
(function (global) {
  'use strict';

  var PACK_URL = 'https://raw.githubusercontent.com/msmarbabi/balochistan-nama/main/data/fatwa.db.gz';
  var state = { lastQuery: '', results: [], mode: 'core', status: null, loadingCore: false };

  function esc(s) { return (global.BXUtils ? BXUtils.escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s)); }

  function nativeAvailable() {
    return typeof NativeApp !== 'undefined' && NativeApp.fatwaStatus && NativeApp.fatwaSearch;
  }

  function getStatus() {
    if (!nativeAvailable()) return { ready: false, core: (global.FatwaCore || []).length };
    try { return JSON.parse(NativeApp.fatwaStatus()); } catch (e) { return { ready: false }; }
  }

  // — جستجو با رتبه‌بندی —
  function searchCore(query, limit) {
    var data = global.FatwaCore || [];
    var words = String(query).trim().toLowerCase().split(/\s+/).filter(function (w) { return w.length >= 2; });
    if (!words.length) return [];
    var scored = [];
    for (var i = 0; i < data.length; i++) {
      var it = data[i];
      var qs = it.q.toLowerCase(), as = it.a.toLowerCase(), s = 0;
      for (var w = 0; w < words.length; w++) {
        if (qs.indexOf(words[w]) >= 0) s += 3;   // تطابق در سؤال وزن بیشتری دارد
        if (as.indexOf(words[w]) >= 0) s += 1;
      }
      if (s > 0) scored.push({ it: it, s: s, short: it.a.length });
    }
    scored.sort(function (a, b) { return b.s - a.s || a.short - b.short; });
    return scored.slice(0, limit || 25).map(function (x) { return x.it; });
  }

  function search(query, limit, cb) {
    var st = getStatus();
    if (st.ready && nativeAvailable()) {
      try {
        var res = JSON.parse(NativeApp.fatwaSearch(query, limit || 25));
        cb(res.map(function (r) { return { i: r.i, q: r.q, a: r.a, len: r.len, hits: r.hits }; }), 'full');
        return;
      } catch (e) {}
    }
    cb(searchCore(query, limit || 25), 'core');
  }

  // — دانلود پک کامل —
  window.__fatwaProgress = function (p) {
    var bar = document.getElementById('fatwaDlBar');
    var txt = document.getElementById('fatwaDlText');
    if (bar) bar.style.width = Math.min(100, p) + '%';
    if (txt) txt.textContent = 'دریافت… ' + p + '٪';
  };
  window.__fatwaDone = function () {
    if (global.App && App.toast) App.toast('✅ کتاب کامل ۹٬۰۸۶ فتوا آماده شد');
    state.status = null;
    if (document.getElementById('fatwaTab')) render(document.getElementById('fatwaTab'));
  };
  window.__fatwaFail = function (m) {
    if (global.App && App.toast) App.toast('❌ دریافت ناموفق — اینترنت/فیلترشکن را بررسی کن');
    var txt = document.getElementById('fatwaDlText');
    if (txt) txt.textContent = 'خطا: ' + m;
  };

  function download() {
    if (nativeAvailable() && NativeApp.fatwaDownload) {
      NativeApp.fatwaDownload(PACK_URL);
      var txt = document.getElementById('fatwaDlText');
      if (txt) txt.textContent = 'دریافت… ۰٪';
      if (global.App && App.toast) App.toast('⏳ دانلود کتاب کامل آغاز شد (۱۲ مگابایت)');
    } else {
      if (global.App && App.toast) App.toast('دانلود کامل فقط در نسخه اندروید فعال است');
    }
  }

  // — رندر UI —
  function render(containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el) return;
    if (!global.FatwaCore && !state.loadingCore) {
      state.loadingCore = true;
      el.innerHTML = '<div class="text-muted text-center" style="padding:20px;">⏳ در حال بارگذاری کتاب فتاوا…</div>';
      BXUtils.loadScript('js/fatwa_core.js?v=121', function () {
        state.loadingCore = false;
        render(el);
      });
      return;
    }
    var st = getStatus();
    state.status = st;
    var coreN = (global.FatwaCore || []).length;
    var html =
      '<div class="fatwa-src">' +
        '📚 مجموعه فتاوای اهل سنت (مذهب حنفی) — منبع: <b>IslamPP</b> (islampp.org)؛ ' +
        'حقوق محتوای علمی متعلق به نویسندگان اصلی است و این برنامه باز منتشرکننده آموزشی آن است.' +
      '</div>' +
      '<div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; flex-wrap:wrap;">' +
        '<span class="text-small text-muted">' + (st.ready
          ? ('✅ کتاب کامل: ' + (st.count || 9086).toLocaleString('fa-IR') + ' فتوا — آفلاین')
          : ('🔹 ' + coreN.toLocaleString('fa-IR') + ' فتوای منتخب هسته آفلاین')) + '</span>' +
        (!st.ready ? '<button class="btn btn--primary" id="fatwaDlBtn" style="padding:5px 12px; font-size:12px;">📥 دریافت کامل ۹٬۰۸۶ فتوا (۱۲MB)</button>' : '') +
      '</div>' +
      (!st.ready ? '<div id="fatwaDlBarWrap" style="height:5px; background:var(--bg-elev2); border-radius:3px; margin-bottom:8px; overflow:hidden;"><div id="fatwaDlBar" style="height:100%; width:0; background:var(--accent); transition: width .3s;"></div></div><div id="fatwaDlText" class="text-small text-muted" style="text-align:center; margin-bottom:8px;"></div>' : '') +
      '<input class="input" id="fatwaSearch" placeholder="🔍 جستجو در فتاوا — مثلاً: نماز مسافر، روزه، زکات فطره…" style="width:100%; margin-bottom:8px;">' +
      '<div id="fatwaResults"><div class="text-muted text-small" style="padding:10px; text-align:center;">یک کلیدواژه وارد کنید…</div></div>';
    el.innerHTML = html;

    var dlBtn = document.getElementById('fatwaDlBtn');
    if (dlBtn) dlBtn.addEventListener('click', download);

    var input = document.getElementById('fatwaSearch');
    var doSearch = BXUtils.debounce(function () {
      var q = input.value.trim();
      var box = document.getElementById('fatwaResults');
      if (!box) return;
      if (q.length < 2) { box.innerHTML = '<div class="text-muted text-small" style="padding:10px; text-align:center;">دست‌کم ۲ حرف بنویسید…</div>'; return; }
      search(q, 25, function (res, mode) {
        state.results = res;
        if (!res.length) { box.innerHTML = '<div class="text-muted" style="padding:12px; text-align:center;">موردی یافت نشد 🤷</div>'; return; }
        var out = '<div class="text-small text-muted" style="margin-bottom:6px;">' + res.length + ' نتیجه (مرتب‌شده بر اساس اهمیت تطابق' + (mode === 'full' ? ' — کتاب کامل' : '') + ')</div>';
        for (var i = 0; i < res.length; i++) {
          var it = res[i];
          var snippet = it.a.length > 320 ? it.a.slice(0, 320) + '…' : it.a;
          out +=
            '<div class="acc" id="fatwa-item-' + i + '">' +
              '<button class="acc__head" type="button" onclick="BXFatwa.toggle(' + i + ')">' +
                '<span class="acc__title">' + esc(it.q) + '</span>' +
                '<span class="acc__chev">▾</span>' +
              '</button>' +
              '<div class="acc__body"><div id="fatwa-body-' + i + '" style="white-space:pre-wrap;">' + esc(snippet) + (it.len && it.len > 320 ? '' : '') + '</div>' +
              (it.len && it.len > 320 ? '<button class="btn btn--ghost" style="margin-top:8px; padding:4px 10px; font-size:12px;" onclick="event.stopPropagation(); BXFatwa.full(' + it.i + ',' + i + ')">📖 متن کامل فتوا</button>' : '') +
              '</div>' +
            '</div>';
        }
        box.innerHTML = out;
      });
    }, 250);
    if (input) { input.addEventListener('input', doSearch); setTimeout(function(){ input.focus(); }, 50); }
  }

  function toggle(idx) {
    var item = document.getElementById('fatwa-item-' + idx);
    if (!item) return;
    var wasOpen = item.classList.contains('open');
    document.querySelectorAll('#fatwaResults .acc.open').forEach(function (o) { o.classList.remove('open'); });
    if (!wasOpen) item.classList.add('open');
  }

  function full(id, idx) {
    var body = document.getElementById('fatwa-body-' + idx);
    if (!body) return;
    if (nativeAvailable() && NativeApp.fatwaGet) {
      try {
        var o = JSON.parse(NativeApp.fatwaGet(id));
        if (o && o.a) { body.textContent = o.a; body.style.whiteSpace = 'pre-wrap'; return; }
      } catch (e) {}
    }
    // حالت هسته: خود داده کامل است (اسنیپت فقط برای نمایش لیست کوتاه شده)
    var it = state.results[idx];
    if (it && it.a) {
      // در حالت هسته، a از اول کامل است مگر کوتاه‌شده؛ اگر کامل نیست از FatwaCore پیدا کن
      var orig = (global.FatwaCore || []).find(function (x) { return x.i === it.i; });
      body.textContent = (orig && orig.a.length > it.a.length) ? orig.a : it.a;
      body.style.whiteSpace = 'pre-wrap';
    }
  }

  global.BXFatwa = { render: render, search: search, toggle: toggle, full: full, download: download, getStatus: getStatus };
})(typeof window !== 'undefined' ? window : this);

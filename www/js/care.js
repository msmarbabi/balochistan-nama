/* ============================================================
   Balochistan Nama — care.js (v2.0 M1)
   مراقبت و هوش مصنوعی — ۶ سرویس هوشمند آفلاین (rule-based)
   + چک‌اپ کامل (M2) + تاریخچه (M3) + قفل سریع (M4)
   ============================================================ */
(function (global) {
  'use strict';

  // toast یکنواخت — از App.toast استفاده می‌کند، fallback alert
  function t(msg) {
    if (global.App && global.App.toast) { global.App.toast(msg); return; }
    if (global.toast) { global.toast(msg); return; }
    try { alert(msg); } catch (e) {}
  }

  var STORE = {
    mood: 'blx_care_mood',
    goal: 'blx_care_goal',
    tipDay: 'blx_care_tip_day',
    checkup: 'blx_care_checkups'
  };

  function readJSON(k, fb) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? (fb || null) : v; } catch (e) { return fb || null; } }
  function writeJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  // ---------- ۶ سرویس ----------
  function water() {
    var now = new Date();
    var h = now.getHours();
    var tip = h < 10 ? 'صبح است — یک لیوان آب ولرم با سبزیکو بعد از بیداری، هضم را راحت می‌کند.'
      : h < 14 ? 'بعد از ناهار، ده دقیقه راه بروید؛ هم خواب‌آلودگی کم می‌شود، هم گوارش بهتر می‌شود.'
      : h < 18 ? 'دستگاه می‌فرستد: الان وقت استراحت چشاست — ۲۰ ثانیه به دور از صفحه نگاه کنید.'
      : 'شب است — از الان تا خواب کمتر آب بخورید تا بیدار نشوید؛ یک چای ملایم کافی است.';
    return {
      title: '💧 آب و حرکت',
      body: 'نوشیدن امروز: ' + (readJSON('blx_care_water', { c: 0 }).c) + ' از ۸ لیوان. ' + tip +
        '<br><button class="btn btn--ghost" id="careWaterAdd" style="margin-top:8px;font-size:12px;">➕ یک لیوان نوشیدم</button>'
    };
  }

  function mood() {
    var m = readJSON(STORE.mood, null);
    var opts = ['😄 عالی', '🙂 خوب', '😐 معمولی', '😔 خسته', '😣 سخت'];
    var html = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;">';
    opts.forEach(function (o, i) {
      html += '<button class="btn btn--ghost" data-mood="' + i + '" style="font-size:14px;">' + o + '</button>';
    });
    html += '</div>';
    if (m) html += '<div class="text-small text-muted">آخرین ثبت: ' + opts[m.v] + ' — ' + m.t + '</div>';
    return { title: '🧘 حال و آرامش', body: 'امروز چه حسی داری؟ (با یک لمس ثبت می‌شود)' + html };
  }

  function routine() {
    var t = readJSON('blx_care_routine', []);
    if (!t.length) return {
      title: '📋 روتین روزانه',
      body: 'هنوز روتینی تعریف نکردی — مثلاً «۷:۳۰ صبح اذان فجر، ۱۲:۳۰ استراحت کوتاه، ۲۱:۰۰ مطالعه».' +
        '<br><button class="btn btn--ghost" id="careRoutineAdd" style="margin-top:8px;font-size:12px;">➕ افزودن روتین</button>'
    };
    var now = new Date().getHours() * 60 + new Date().getMinutes();
    var rows = t.map(function (r) {
      var rm = parseInt(r.m, 10) || 0;
      var done = rm <= now;
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--line);">' +
        '<span style="font-size:14px;">' + (done ? '✅' : '⏰') + '</span>' +
        '<span class="text-small" style="flex:1;">' + r.h + ': ' + r.t + '</span></div>';
    }).join('');
    return { title: '📋 روتین روزانه (' + t.length + ' مورد)', body: rows };
  }

  function goal() {
    var g = readJSON(STORE.goal, null);
    if (!g) return {
      title: '🎯 هدف و پیشرفت',
      body: 'هدفی تعریف کن — مثلاً «۳۰ روز تسبیح روزانه».' +
        '<br><div style="display:flex;gap:6px;margin-top:8px;">' +
        '<input class="input" id="careGoalName" placeholder="نام هدف" style="flex:1;font-size:13px;">' +
        '<input class="input" id="careGoalTarget" type="number" min="1" placeholder="هدف" style="width:70px;font-size:13px;">' +
        '<button class="btn btn--primary" id="careGoalSet" style="font-size:12px;">تنظیم</button></div>'
    };
    var pct = Math.min(100, Math.round((g.cur / g.target) * 100));
    return {
      title: '🎯 ' + g.name + ' — ' + g.cur + ' از ' + g.target,
      body: '<div style="background:var(--bg-elev2);border-radius:8px;height:12px;overflow:hidden;margin:8px 0;">' +
        '<div style="width:' + pct + '%;height:100%;background:linear-gradient(90deg,#3a7bd5,#2ecc71);"></div></div>' +
        '<div class="text-small text-muted">' + pct + '٪ انجام شده' +
        (pct >= 100 ? ' — آفرین! 🎉' : ' — ' + (g.target - g.cur) + ' مورد مانده است.') +
        '<div style="display:flex;gap:6px;margin-top:8px;">' +
        '<button class="btn btn--ghost" id="careGoalInc" style="font-size:12px;">➕ یک قدم برداشتم</button>' +
        '<button class="btn btn--ghost" id="careGoalReset" style="font-size:12px;">🔄 از نو</button></div>'
    };
  }

  function tip() {
    var season = global.App && global.App.currentSeason ? global.App.currentSeason() : 'summer';
    var tips = {
      spring: ['بهاری است — گرد و غبار و آلرژی این فصل است؛ ماسک از خانه بیرون کمک می‌کند.', 'بهاری: پیاده‌روی در طبیعت زرد و سبز، استرس را ۴۰٪ کم می‌کند.'],
      summer: ['تابستانی است — آب را از نصف به ۲ لیوان اضافه کن؛ گرمای بلوچستان این تابستان است.', 'تابستانی: از ظهر تا غروب آفتاب مستقیم کم است؛ کار سنگین صبح زود انجام بده.'],
      autumn: ['پاییزی است — نوسان دما این فصل است؛ یک کاپشن سبک همیشه همراهت باشد.', 'پاییزی: حتماً قبل از خواب پنجره را ببند؛ سرما شب‌ها می‌آید.'],
      winter: ['زمستانی است — ویتامین D از خورشید کم است؛ سبزیجات تازه و آجیل خوب است.', 'زمستانی: ۱۵ دقیقه خورشید ظهر برای جلوگیری از کمبود ویتامین D کافی است.']
    };
    var arr = tips[season] || tips.summer;
    return { title: '💡 نکته هوشمند فصلی', body: arr[Date.now() % 1000 % arr.length] };
  }

  function sleep() {
    var pt = global.App && global.App.getState ? (global.App.getState().prayerTimes || null) : null;
    var now = new Date();
    var nowH = now.getHours() + now.getMinutes() / 60;
    var fajr = pt ? pt.fajr : 5.5;
    var maghrib = pt ? pt.maghrib : 18;
    var text;
    if (nowH >= 21) text = 'کاملا بیدار است — الان وقت آماده‌سازی برای خواب است؛ صفحه‌نمایش را کم‌نورتر کن.';
    else if (nowH >= 17) text = 'اگر الان بخوابی تا ' + maghrib + ' ساعت استراحت می‌شود — کافی است اما زود است.';
    else if (nowH < 11) text = 'اگر تا طلوع خواب باشی، حدود ' + (nowH < fajr ? fajr - nowH : fajr + 24 - nowH).toFixed(0) + ' ساعت می‌خوابی — از حد مطلوب بیشتر است.';
    else text = 'اکنون بیدار است — خوابیدن الان باعث کندی صبح می‌شود؛ یک استراحت کوتاه ۲۰ دقیقه کافی است.';
    return { title: '😴 کیفیت خواب تخمینی', body: text };
  }

  var SERVICES = {
    water: water, mood: mood, routine: routine, goal: goal, tip: tip, sleep: sleep
  };
  var TITLES = { water: '💧 آب و حرکت', mood: '🧘 حال و آرامش', routine: '📋 روتین روزانه', goal: '🎯 هدف و پیشرفت', tip: '💡 نکته فصلی', sleep: '😴 خواب' };

  // ---------- چک‌اپ کامل (M2) ----------
  function runCheckup() {
    var res = [];
    var st = global.App.getState();
    var pt = st.prayerTimes;
    res.push({ ok: !!pt, label: pt ? '✅ اوقات شرعی محاسبه شده' : '❌ اوقات شرعی در دسترس نیست' });
    res.push({ ok: true, label: '📅 تقویم: ' + st.triple.jalali.jy + '/' + st.triple.jalali.jm + '/' + st.triple.jalali.jd });
    res.push({ ok: st.settings.athanAuto, label: st.settings.athanAuto ? '✅ اعلان اذان فعال' : '⚠️ اعلان اذان غیرفعال' });
    var notes = readJSON('blx_nama_notes', []);
    res.push({ ok: true, label: '📝 یادداشت‌ها: ' + notes.length + ' مورد' });
    var events = readJSON('blx_personal_events', []);
    res.push({ ok: true, label: '🎂 مناسبت‌های شخصی: ' + events.length + ' مورد' });
    var goal = readJSON(STORE.goal, null);
    res.push({ ok: !!goal, label: goal ? '🎯 هدف فعال: ' + goal.name + ' (' + Math.round((goal.cur / goal.target) * 100) + '٪)' : '⚠️ هدفی تعریف نشده' });
    var mood = readJSON(STORE.mood, null);
    res.push({ ok: !!mood, label: mood ? '🧘 آخرین حال: ثبت شده' : '⚠️ هنوز هالی ثبت نشده' });
    var ver = '۲ (code ۲۰۰)';
    res.push({ ok: true, label: 'ℹ️ نسخه: ' + ver });
    return { at: new Date().toISOString(), results: res };
  }

  function saveCheckup(c) {
    var list = readJSON(STORE.checkup, []);
    list.push(c);
    if (list.length > 30) list = list.slice(-30);
    writeJSON(STORE.checkup, list);
  }

  // ---------- UI ----------
  function render() {
    var v = document.getElementById('toolPanel-care') || document.getElementById('view-care');
    if (!v) return;
    // آیکون‌ها را رندر کن
    var svcEls = v.querySelectorAll('.care-svc');
    if (!svcEls.length) return;
    var stats = {
      water: '💧 ' + (readJSON('blx_care_water', { c: 0 }).c) + '/۸ لیوان',
      mood: '🧘 ' + (readJSON(STORE.mood, null) ? 'ثبت شده' : 'ثبت نشده'),
      routine: '📋 ' + (readJSON('blx_care_routine', []).length || '۰') + ' مورد',
      goal: (function () { var g = readJSON(STORE.goal, null); return g ? '🎯 ' + Math.round((g.cur / g.target) * 100) + '٪' : '🎯 —'; })(),
      tip: '💡 آماده',
      sleep: '😴 فعال'
    };
    svcEls.forEach(function (el) {
      var key = el.getAttribute('data-svc');
      var statEl = el.querySelector('.care-svc__stat');
      if (statEl) statEl.textContent = stats[key] || '';
      el.onclick = function () {
        var svc = SERVICES[key]();
        openModal(key, svc);
      };
    });
    // دکمه چک‌اپ
    var chkBtn = document.getElementById('careCheckupBtn');
    if (chkBtn && !chkBtn._w) {
      chkBtn._w = true;
      chkBtn.onclick = function () {
        var c = runCheckup();
        saveCheckup(c);
        var resEl = document.getElementById('careCheckupResult');
        if (resEl) resEl.innerHTML = '<div style="margin-bottom:8px;">' + c.results.map(function (r) { return '<div class="text-small" style="padding:3px 0;">' + r.label + '</div>'; }).join('') + '</div><div class="text-small text-muted">ثبت شد: ' + new Date().toLocaleString('fa-IR') + '</div>';
      };
    }
    // دکمه تاریخچه
    var hisBtn = document.getElementById('careHistoryBtn');
    if (hisBtn && !hisBtn._w) {
      hisBtn._w = true;
      hisBtn.onclick = function () {
        var list = readJSON(STORE.checkup, []);
        var el = document.getElementById('careHistoryList');
        if (!el) return;
        el.style.display = 'block';
        if (!list.length) { el.innerHTML = '<div class="text-small text-muted">هنوز چک‌اپی ثبت نشده.</div>'; return; }
        el.innerHTML = list.slice().reverse().slice(0, 10).map(function (c) {
          return '<div class="text-small" style="padding:6px 0;border-bottom:1px solid var(--line);">' +
            '🕐 ' + new Date(c.at).toLocaleString('fa-IR') + ' — ' +
            c.results.filter(function (r) { return !r.ok; }).length + ' مورد نیاز به بررسی' +
            '</div>';
        }).join('');
      };
    }
    // دکمه قفل سریع (M4)
    var lockBtn = document.getElementById('careLockBtn');
    if (lockBtn && !lockBtn._w) {
      lockBtn._w = true;
      lockBtn.onclick = function () {
        if (typeof NativeApp !== 'undefined' && NativeApp.lockDevice) {
          NativeApp.lockDevice();
        } else {
          t('🔒 قفل — روی نسخه اندروید واقعی کار می‌کند');
        }
      };
    }
    // آب — دکمه افزودن داخل مودال
    var wAdd = document.getElementById('careWaterAdd');
    if (wAdd) wAdd.onclick = function () {
      var w = readJSON('blx_care_water', { c: 0 });
      w.c = (w.c || 0) + 1;
      writeJSON('blx_care_water', w);
      t('💧 ' + w.c + ' لیوان — آفرین!');
      setTimeout(function () { render(); openModal('water'); }, 200);
    };
    // هدف — دکمه تنظیم و افزایش
    var gSet = document.getElementById('careGoalSet');
    if (gSet) gSet.onclick = function () {
      var name = document.getElementById('careGoalName').value.trim();
      var target = parseInt(document.getElementById('careGoalTarget').value, 10) || 30;
      if (!name) return;
      writeJSON(STORE.goal, { name: name, target: target, cur: 0 });
      t('🎯 هدف «' + name + '» تنظیم شد');
      setTimeout(render, 200);
    };
    var gInc = document.getElementById('careGoalInc');
    if (gInc) gInc.onclick = function () {
      var g = readJSON(STORE.goal, null);
      if (!g) return;
      g.cur = Math.min(g.target, (g.cur || 0) + 1);
      writeJSON(STORE.goal, g);
      t('🎯 ' + g.cur + ' از ' + g.target + ' — ' + (g.cur >= g.target ? 'تبریک! 🎉' : 'ادامه بده'));
      setTimeout(render, 200);
    };
    var gReset = document.getElementById('careGoalReset');
    if (gReset) gReset.onclick = function () {
      var g = readJSON(STORE.goal, null);
      if (!g) return;
      g.cur = 0;
      writeJSON(STORE.goal, g);
      t('🔄 از نو شروع شد');
      setTimeout(render, 200);
    };
    // مود — دکمه انتخاب حال
    document.querySelectorAll('#careSrvBody [data-mood]').forEach(function (btn) {
      btn.onclick = function () {
        var v = parseInt(btn.getAttribute('data-mood'), 10);
        writeJSON(STORE.mood, { v: v, t: new Date().toLocaleString('fa-IR') });
        t('🧘 ثبت شد — ' + ['عالی', 'خوب', 'معمولی', 'خسته', 'سخت'][v]);
        setTimeout(function () { render(); openModal('mood'); }, 200);
      };
    });
    // روتین — افزودن
    var rAdd = document.getElementById('careRoutineAdd');
    if (rAdd) rAdd.onclick = function () {
      var txt = prompt('ساعت و متن روتین (مثلاً 7:30 اذان فجر):');
      if (!txt) return;
      var parts = txt.split(':');
      var list = readJSON('blx_care_routine', []);
      list.push({ h: parts.length > 1 ? parts[0] + ':' + parts[1] : '', m: parts.length > 1 ? parseInt(parts[0]) * 60 + parseInt(parts[1]) : 0, t: parts.length > 1 ? parts.slice(2).join(':') : txt });
      writeJSON('blx_care_routine', list);
      t('📋 روتین اضافه شد');
      setTimeout(function () { render(); openModal('routine'); }, 200);
    };
  }

  function openModal(key, svc) {
    var m = document.getElementById('modalCareSrv');
    if (!m) return;
    document.getElementById('careSrvTitle').textContent = svc.title;
    document.getElementById('careSrvBody').innerHTML = svc.body;
    m.classList.add('show');
    // بستن
    var closeBtn = document.getElementById('careSrvClose');
    if (closeBtn) closeBtn.onclick = function () { m.classList.remove('show'); };
    m.onclick = function (e) { if (e.target === m) m.classList.remove('show'); };
  }

  global.BXCare = { render: render, openModal: openModal, runCheckup: runCheckup, saveCheckup: saveCheckup };
  global.addEventListener && global.addEventListener('DOMContentLoaded', function () { render(); });
})(typeof window !== 'undefined' ? window : this);

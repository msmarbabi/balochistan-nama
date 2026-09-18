/* ============================================================
   Balochistan Nama - Moon module (moon.js)
   Detailed moon phase modal (visual, illumination, next phases).
   ============================================================ */

(function (global) {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function setText(id, t) { var e = $(id); if (e) e.textContent = t; }

  var VISUALS = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];

  function computeMoon(date) {
    var p = (window.Prayer && Prayer.moonPhase) ? Prayer.moonPhase(date) : null;
    var phase = p ? p.phase : 0;
    var illum = p ? Math.round(p.illum * 100) : 0;
    var name = (window.Prayer && Prayer.moonPhaseName) ? Prayer.moonPhaseName(phase) : 'نامشخص';
    var idx = Math.min(VISUALS.length - 1, Math.max(0, Math.round(phase * (VISUALS.length - 1))));
    return { phase: phase, illum: illum, name: name, visual: VISUALS[idx] };
  }

  function nextPhaseDate(from, targetPhase) {
    var d = new Date(from.getTime());
    for (var i = 0; i < 40; i++) {
      d.setDate(d.getDate() + 1);
      var ph = (window.Prayer && Prayer.moonPhase) ? Prayer.moonPhase(d).phase : 0;
      if (Math.abs(ph - targetPhase) < 0.02) return new Date(d);
    }
    return null;
  }

  function setTextAll(ids, t) {
    for (var i = 0; i < ids.length; i++) setText(ids[i], t);
  }

  function open() {
    var m = $('modalMoon');
    if (!m) return;
    m.classList.add('show');
    var today = new Date();
    var moon = computeMoon(today);
    setTextAll(['moonVisual', 'mMoonVisual'], moon.visual);
    setTextAll(['moonName', 'mMoonName'], moon.name);
    setTextAll(['moonIllum', 'mMoonIllum'], 'روشنایی: ' + moon.illum + '٪');
    var newM = nextPhaseDate(today, 0);
    var fullM = nextPhaseDate(today, 0.5);
    var fmt = function (dt) { return (window.Cal && Cal.fmtGregLong) ? Cal.fmtGregLong({ y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }) : dt.toLocaleDateString('fa-IR'); };
    var info = 'ماه قمریِ امروز: ' + (window.Cal && Cal.toFaDigits ? Cal.toFaDigits(String(Math.round((today.getDate() + 29.53 * 0.0))) ) : '') + '\n';
    info += newM ? '🌑 ماه نو بعدی: ' + fmt(newM) + '\n' : '';
    info += fullM ? '🌕 ماه کامل بعدی: ' + fmt(fullM) : '';
    // نمایش هلال ماه — اگر روشنایی < ۲۰٪، هلال است
    if (moon.illum < 20 && moon.illum > 0) {
      info += '\n🌙 ' + (moon.phase < 0.5 ? 'هلال ماه رو به پُرشدن (هلال امسی) — رؤیت در غروب' : 'هلال ماه رو به خالی شدن (هلال صبحگاهی) — رؤیت در آسمان صبح');
    } else if (moon.illum === 0) {
      info += '\n🌑 ماه نو — زمان رؤیت هلال جدید';
    }
    // تنظیم تطبیق رؤیت
    try {
      var adj = parseInt(localStorage.getItem('blx_moon_adj') || '0', 10);
      if (adj !== 0) info += '\n⚙️ تطبیق رؤیت: ' + (adj > 0 ? '+' : '') + adj + ' روز (تنظیم در بخش قمری)';
    } catch(e){}
    setText('moonInfo', info);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      var c = $('moonClose'); if (c) c.addEventListener('click', function () { var m = $('modalMoon'); if (m) m.classList.remove('show'); });
    });
  } else {
    var c = $('moonClose'); if (c) c.addEventListener('click', function () { var m = $('modalMoon'); if (m) m.classList.remove('show'); });
  }

  var Moon = { open: open };
  if (typeof window !== 'undefined') window.Moon = Moon;
})(typeof window !== 'undefined' ? window : this);

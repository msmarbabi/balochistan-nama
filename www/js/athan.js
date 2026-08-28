/* ============================================================
   Balochistan Nama - Athan / Alert sound library (athan.js)
   Manages a library of sounds (built-in tones, custom files from
   system, remote URLs), plays them, and remembers which sound is
   used for adhan vs alert. Pure vanilla, Web Audio + <audio>.
   ============================================================ */

(function (global) {
  'use strict';

  var KEY_LIB = 'blx_athan_lib';
  var KEY_SEL = 'blx_athan_sel';

  var DEFAULT_LIB = [
    { id: 'builtin_adan', name: 'اذان بومی (داخل برنامه)', type: 'file', data: 'assets/audio/adan.wav', builtin: true },
    { id: 'tone1', name: 'تون پیش‌فرض ۱ (اذان)', type: 'tone', tone: [330, 392, 523, 392, 330], builtin: true },
    { id: 'tone2', name: 'تون ملایم ۲ (هشدار)', type: 'tone', tone: [440, 392, 330], builtin: true },
    { id: 'tone3', name: 'تون کوتاه ۳', type: 'tone', tone: [523, 659], builtin: true }
  ];

  function loadLib() {
    try { var l = JSON.parse(localStorage.getItem(KEY_LIB) || 'null'); if (l && l.length) return l; } catch (e) {}
    localStorage.setItem(KEY_LIB, JSON.stringify(DEFAULT_LIB));
    return DEFAULT_LIB.slice();
  }
  function saveLib(lib) { localStorage.setItem(KEY_LIB, JSON.stringify(lib)); }
  function getLib() { return loadLib(); }
  function getSel() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY_SEL) || 'null');
      if (s && s.athan) return s;
    } catch (e) {}
    var d = { athan: 'builtin_adan', alert: 'tone2' };
    localStorage.setItem(KEY_SEL, JSON.stringify(d));
    return d;
  }
  function setSel(o) { localStorage.setItem(KEY_SEL, JSON.stringify(o)); }

  var actx = null;
  function ctx() {
    if (actx) return actx;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    return actx;
  }
  function playTone(freqs) {
    var ac = ctx(); if (!ac) return;
    if (ac.state === 'suspended') { try { ac.resume(); } catch (e) {} }
    var t = ac.currentTime;
    var gap = 0.34;
    for (var i = 0; i < freqs.length; i++) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = freqs[i];
      o.connect(g); g.connect(ac.destination);
      var st = t + i * gap;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.5, st + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, st + gap * 0.92);
      o.start(st); o.stop(st + gap);
    }
  }
  function playItem(item) {
    if (!item) return;
    if (item.type === 'tone') { playTone(item.tone || [330, 392, 523]); return; }
    if (item.type === 'file' || item.type === 'url') {
      try {
        var a = new Audio(item.data);
        a.play().catch(function () { if (window.App) App.toast('پخش صدا ممکن نشد'); });
      } catch (e) { if (window.App) App.toast('خطا در پخش صدا'); }
    }
  }
  function play(which) {
    var sel = getSel();
    var id = sel[which] || (which === 'alert' ? 'tone2' : 'tone1');
    var lib = getLib();
    var item = null;
    for (var i = 0; i < lib.length; i++) if (lib[i].id === id) item = lib[i];
    if (!item) item = lib[0];
    playItem(item);
  }
  function addItem(item) { var lib = getLib(); lib.push(item); saveLib(lib); }
  function removeItem(id) { saveLib(getLib().filter(function (x) { return x.id !== id; })); }

  var Athan = {
    getLib: getLib, getSel: getSel, setSel: setSel,
    play: play, playItem: playItem, addItem: addItem, removeItem: removeItem,
    playTone: playTone, DEFAULT_LIB: DEFAULT_LIB
  };
  if (typeof window !== 'undefined') window.Athan = Athan;
})(typeof window !== 'undefined' ? window : this);

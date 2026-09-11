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
    { id: 'user_adan', name: 'اذان مکه مکرمه ( علی الملا )', type: 'file', data: 'assets/audio/adan_user.mp3', builtin: true }
  ];

  function loadLib() {
    try { var l = JSON.parse(localStorage.getItem(KEY_LIB) || 'null'); if (l && l.length) {
      // Remove any non-default items that are no longer in DEFAULT_LIB
      // (user asked to remove all previous adhans/tones, keep only current default)
      var defaults = {};
      for (var d = 0; d < DEFAULT_LIB.length; d++) defaults[DEFAULT_LIB[d].id] = true;
      var kept = [];
      var changed = false;
      for (var i = 0; i < l.length; i++) {
        if (defaults[l[i].id]) { kept.push(l[i]); }
        else if (!l[i].builtin) { kept.push(l[i]); } // keep user-added custom files
        else { changed = true; } // drop old builtin adhans/tones
      }
      // Ensure current defaults present
      for (var d2 = 0; d2 < DEFAULT_LIB.length; d2++) {
        var found = false;
        for (var k = 0; k < kept.length; k++) if (kept[k].id === DEFAULT_LIB[d2].id) { found = true; break; }
        if (!found) { kept.push(DEFAULT_LIB[d2]); changed = true; }
      }
      if (changed) localStorage.setItem(KEY_LIB, JSON.stringify(kept));
      return kept;
    } } catch (e) {}
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
    var d = { athan: 'user_adan', alert: 'user_adan' };
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
    if (item.type === 'custom' && item.handler === 'AthanPlayer' && typeof window.AthanPlayer !== 'undefined') {
      if (item.style && window.AthanPlayer.playStyle) window.AthanPlayer.playStyle(item.style);
      else window.AthanPlayer.play();
      return;
    }
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

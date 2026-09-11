/* اذان — بلوچستان‌نما v1.11 (مدیریت کامل پخش + CRUD کتابخانه) */
(function () {
  'use strict';

  var LIB_KEY = 'blx_athan_lib';
  var SEL_KEY = 'blx_athan_sel';

  var DEFAULT_LIB = [
    { id: 'user_adan', name: 'اذان مکه مکرمه (علی الملا)', type: 'file', data: 'assets/audio/adan_user.mp3', builtin: true },
    { id: 'digital_athan', name: 'اذان دیجیتال (استاندارد)', type: 'digital', data: 'standard', builtin: true },
    { id: 'digital_athan_slow', name: 'اذان دیجیتال (آرام)', type: 'digital', data: 'slow', builtin: true },
    { id: 'digital_athan_warm', name: 'اذان دیجیتال (مليح)', type: 'digital', data: 'warm', builtin: true },
    { id: 'silent', name: 'بدون صدا (فقط اعلان)', type: 'silent', data: '', builtin: true }
  ];

  function readJSON(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || 'null');
      return v || fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // ===== کتابخانه =====
  function loadLib() {
    var lib = readJSON(LIB_KEY, null);
    if (!lib || !lib.length) lib = DEFAULT_LIB.slice();
    // ادغام آیتم‌های builtin جدید (اگر نسخه جدیدتری اضافه شد)
    var have = {};
    lib.forEach(function (it) { have[it.id] = 1; });
    DEFAULT_LIB.forEach(function (d) {
      if (!have[d.id]) {
        // جایگزینی آیتم قدیمی اگر id یکسان ولی ساختار فرق دارد
        lib.push(d);
      }
    });
    return lib;
  }
  function saveLib(lib) { writeJSON(LIB_KEY, lib); }

  function getLib() { return loadLib(); }

  function getById(id) {
    var lib = loadLib();
    for (var i = 0; i < lib.length; i++) if (lib[i].id === id) return lib[i];
    return null;
  }

  // افزودن صدا (فایل base64 یا URL)
  function addItem(name, type, data) {
    var lib = loadLib();
    var id = 'usr_' + Date.now();
    lib.push({ id: id, name: name, type: type, data: data, builtin: false });
    saveLib(lib);
    return id;
  }

  // ویرایش (فقط نام — نوع/داده هم قابل تغییر)
  function updateItem(id, patch) {
    var lib = loadLib();
    for (var i = 0; i < lib.length; i++) {
      if (lib[i].id === id) {
        if (lib[i].builtin) return null; // builtin قابل ویرایش نیست
        for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) lib[i][k] = patch[k];
        saveLib(lib);
        return lib[i];
      }
    }
    return null;
  }

  // حذف (builtin حذف نمی‌شود)
  function removeItem(id) {
    var lib = loadLib();
    var out = [];
    var removed = false;
    for (var i = 0; i < lib.length; i++) {
      if (lib[i].id === id && !lib[i].builtin) { removed = true; continue; }
      out.push(lib[i]);
    }
    if (removed) {
      saveLib(out);
      // اگر انتخاب فعلی حذف شد → به builtin اول برگرد
      var sel = readJSON(SEL_KEY, {});
      if (sel.athan === id) { sel.athan = DEFAULT_LIB[0].id; writeJSON(SEL_KEY, sel); }
      if (sel.alert === id) { sel.alert = DEFAULT_LIB[0].id; writeJSON(SEL_KEY, sel); }
    }
    return removed;
  }

  // ===== انتخاب =====
  function getSel() {
    var sel = readJSON(SEL_KEY, { athan: 'user_adan', alert: 'user_adan' });
    // اصلاح خودکار مقادیر نامعتبر (v1.11)
    var lib = loadLib();
    var ids = {};
    lib.forEach(function (it) { ids[it.id] = 1; });
    if (!ids[sel.athan]) sel.athan = (lib[0] && lib[0].id) || '';
    if (!ids[sel.alert]) sel.alert = sel.athan;
    return sel;
  }
  function setSel(kind, id) {
    var sel = getSel();
    sel[kind] = id;
    writeJSON(SEL_KEY, sel);
  }

  // ===== پخش (شروع/مکث/ادامه/توقف) =====
  var audioEl = null;   // برای type=file
  var playingId = null;  // چه آیتمی در حال پخش است
  var digitalStop = null; // توقف اذان دیجیتال
  var filePlaying = false;  // درخواست پخش فایل داده شده (async)

  function status() {
    if (digitalStop) {
      if (window.AthanPlayer && AthanPlayer.isPlaying) return { playing: true, paused: false, id: playingId, mode: 'digital' };
      digitalStop = null; playingId = null;
    }
    if (audioEl && !audioEl.paused) return { playing: true, paused: false, id: playingId, mode: 'file' };
    if (audioEl && audioEl.paused && (audioEl.currentTime > 0 || filePlaying)) return { playing: false, paused: true, id: playingId, mode: 'file' };
    return { playing: false, paused: false, id: null, mode: null };
  }

  // شروع پخش (play اگر جدید، resume اگر مکث)
  function play(id) {
    var st = status();
    if (st.paused && st.id === (id || playingId)) { resume(); return true; }
    if (st.playing) stop(); // قطع قبلی
    var sel = getSel();
    id = id || sel.athan;
    var item = getById(id);
    if (!item) item = loadLib()[0];
    if (!item) return false;
    playingId = item.id;
    if (item.type === 'silent') { playingId = null; return true; }
    if (item.type === 'digital') {
      if (window.AthanPlayer) {
        try { AthanPlayer.stop(); } catch (e) {}
        AthanPlayer.playStyle(item.data || 'standard');
        digitalStop = true; // نشانه در حال پخش دیجیتال — توقف با AthanPlayer.stop()
      }
      return true;
    }
    // file — URL یا base64
    stopFile();
    audioEl = new Audio(item.data);
    filePlaying = true;
    audioEl.onended = function () { stopFile(); playingId = null; };
    audioEl.onerror = function () { stopFile(); playingId = null; };
    try { audioEl.play().catch(function () { filePlaying = false; }); } catch (e) { filePlaying = false; }
    return true;
  }

  function playItem(id) { return play(id); }

  // مکث (فقط فایل — دیجیتال ساپورت نمی‌کند)
  // مکث (فایل قابل مکث؛ دیجیتال → توقف کامل — قابل ادامه با play مجدد)
  function pause() {
    if (digitalStop) { stop(); return true; }
    if (audioEl && !audioEl.paused) { audioEl.pause(); return true; }
    return false;
  }

  // ادامه از مکث
  function resume() {
    if (audioEl && audioEl.paused && audioEl.currentTime > 0) {
      try { audioEl.play().catch(function () {}); } catch (e) {}
      return true;
    }
    return false;
  }

  function stopFile() {
    if (audioEl) { try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) {} }
    audioEl = null; filePlaying = false;
  }

  // توقف کامل
  function stop() {
    if (digitalStop) {
      if (window.AthanPlayer) { try { AthanPlayer.stop(); } catch (e) {} }
      digitalStop = null;
    }
    stopFile();
    playingId = null;
    return true;
  }

  // پخش صدای هشدار (کوتاه)
  function playTone(kind) {
    kind = kind || 'alert';
    var id = getSel()[kind] || getSel().athan;
    var item = getById(id);
    if (!item) return;
    if (item.type === 'silent') return;
    if (item.type === 'digital') {
      if (window.AthanPlayer) { try { AthanPlayer.stop(); } catch (e) {} AthanPlayer.playStyle(item.data || 'standard'); }
      return;
    }
    var a = new Audio(item.data);
    try { a.play().catch(function () {}); } catch (e) {}
  }

  var Athan = {
    getLib: getLib,
    getById: getById,
    addItem: addItem,
    updateItem: updateItem,
    removeItem: removeItem,
    getSel: getSel,
    setSel: setSel,
    play: play,
    playItem: playItem,
    pause: pause,
    resume: resume,
    stop: stop,
    status: status,
    playTone: playTone,
    DEFAULT_LIB: DEFAULT_LIB
  };
  window.Athan = Athan;
})();

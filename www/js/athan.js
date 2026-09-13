/* اذان — بلوچستان‌نما v1.12 (رفع: ID تکراری، کرش فایلهای بزرگ، پخش اذان درست) */
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

  // محدودیتها: فایل خام حداکثر ~۲۰ مگابایت؛ در حالت بدون Filesystem حداکثر ~۱.۵ مگ ب64 در localStorage
  var MAX_B64 = 26 * 1024 * 1024;
  var MAX_LS_B64 = 2 * 1024 * 1024;

  function readJSON(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || 'null');
      return v || fallback;
    } catch (e) { return fallback; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; }
  }

  function hasFS() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Filesystem && window.Filesystem.writeFile);
  }

  // ===== کتابخانه (با کش حافظه — دیگر JSON.parse تکراری روی رشته‌های بزرگ انجام نمی‌شود) =====
  var _lib = null; // کش

  function loadLib() {
    if (_lib) return _lib;
    var lib = readJSON(LIB_KEY, null);
    if (!lib || !lib.length) lib = DEFAULT_LIB.slice();
    var have = {};
    lib.forEach(function (it) { if (it) have[it.id] = 1; });
    DEFAULT_LIB.forEach(function (d) { if (!have[d.id]) lib.push(d); });
    _lib = lib;
    migrateLegacy(lib); // انتقال فایلهای بزرگ قدیمی از localStorage به دیسک
    return lib;
  }
  function saveLib(lib) {
    _lib = lib;
    return writeJSON(LIB_KEY, lib);
  }

  function getLib() { return loadLib(); }

  function getById(id) {
    var lib = loadLib();
    for (var i = 0; i < lib.length; i++) if (lib[i] && lib[i].id === id) return lib[i];
    return null;
  }

  // آیدی یکتا — حتی در فراخوانیهای سریع پشت‌سرهم (باگ v1.11: همه یک ID می‌گرفتند!)
  var idSeq = 0;
  function uniqueId(lib) {
    var ids = {};
    lib.forEach(function (it) { if (it) ids[it.id] = 1; });
    var id;
    do {
      id = 'usr_' + Date.now().toString(36) + '_' + (++idSeq) + '_' + Math.floor(Math.random() * 1e6).toString(36);
    } while (ids[id]);
    return id;
  }

  // انتقال آیتمهای قدیمی (base64 داخل localStorage) به فایل روی دیسک — رفع کرش/سهمیه
  // v1.11 باگ: آیتمهای قدیمی ممکن است ID یکسان داشته باشند → قبل از نوشتن روی دیسک، ID جدید می‌گیرند
  function migrateLegacy(lib) {
    if (!hasFS()) return;
    // ۱) اصلاح IDهای تکراری
    var seen = {};
    var renamed = false;
    lib.forEach(function (it) {
      if (!it) return;
      if (seen[it.id]) { it.id = uniqueId(lib); renamed = true; }
      else seen[it.id] = 1;
      if (it.builtin && seen[it.id]) { /* builtinها از پیش یکتا هستند */ }
    });
    // ۲) انتقال base64های بزرگ به دیسک
    var pending = 0, done = 0;
    lib.forEach(function (it) {
      if (it && it.type === 'file64' && it.data && it.data.length > 120000 && !it.path) pending++;
    });
    if (!pending) { if (renamed) saveLib(lib); return; }
    var finish = function () {
      done++;
      if (done >= pending) saveLib(lib); // ذخیره نسخه کوچک‌شده (بدون base64)
    };
    lib.forEach(function (it) {
      if (it && it.type === 'file64' && it.data && it.data.length > 120000 && !it.path) {
        var path = 'athans/' + it.id + '.mp3';
        try {
          window.Filesystem.writeFile({ path: path, data: it.data, directory: 'DATA', encoding: 'base64', recursive: true })
            .then(function () { it.path = path; delete it.data; finish(); })
            .catch(finish);
        } catch (e) { finish(); }
      }
    });
  }

  // افزودن آیتم سبک (URL یا دیجیتال) — همگام
  function addItem(name, type, data) {
    var lib = loadLib();
    var id = uniqueId(lib);
    lib.push({ id: id, name: name, type: type, data: data, builtin: false });
    if (!saveLib(lib)) { lib.pop(); saveLib(lib); return null; }
    return id;
  }

  // افزودن فایل صوتی (base64) — روی دیسک ذخیره می‌شود نه localStorage (رفع کرش)
  function addItemFile(name, b64) {
    return new Promise(function (resolve, reject) {
      if (!b64 || !b64.length) { reject('EMPTY'); return; }
      if (b64.length > MAX_B64) { reject('BIG'); return; }
      var lib = loadLib();
      var id = uniqueId(lib);
      if (hasFS()) {
        var path = 'athans/' + id + '.mp3';
        window.Filesystem.writeFile({ path: path, data: b64, directory: 'DATA', encoding: 'base64', recursive: true })
          .then(function () {
            lib.push({ id: id, name: name, type: 'file64', path: path, builtin: false });
            if (!saveLib(lib)) { lib.pop(); saveLib(lib); reject('QUOTA'); return; }
            resolve(id);
          })
          .catch(function () { reject('IO'); });
      } else {
        // وب خالص (بدون پلاگین) — فقط فایلهای کوچک در localStorage
        if (b64.length > MAX_LS_B64) { reject('NOFS_BIG'); return; }
        lib.push({ id: id, name: name, type: 'file64', data: b64, builtin: false });
        if (!saveLib(lib)) { lib.pop(); saveLib(lib); reject('QUOTA'); return; }
        resolve(id);
      }
    });
  }

  // ویرایش نام
  function updateItem(id, patch) {
    var lib = loadLib();
    for (var i = 0; i < lib.length; i++) {
      if (lib[i] && lib[i].id === id) {
        if (lib[i].builtin) return null;
        for (var k in patch) if (Object.prototype.hasOwnProperty.call(patch, k)) lib[i][k] = patch[k];
        saveLib(lib);
        return lib[i];
      }
    }
    return null;
  }

  // حذف (builtin حذف نمی‌شود) — فایل روی دیسک هم پاک می‌شود
  function removeItem(id) {
    var lib = loadLib();
    var out = [];
    var removedItem = null;
    for (var i = 0; i < lib.length; i++) {
      if (lib[i] && lib[i].id === id && !lib[i].builtin) { removedItem = lib[i]; continue; }
      out.push(lib[i]);
    }
    if (!removedItem) return false;
    saveLib(out);
    // پاک کردن فایل از دیسک
    if (removedItem.path && hasFS()) {
      try { window.Filesystem.deleteFile({ path: removedItem.path, directory: 'DATA' }).catch(function () {}); } catch (e) {}
    }
    var sel = readJSON(SEL_KEY, {});
    if (sel.athan === id) { sel.athan = DEFAULT_LIB[0].id; writeJSON(SEL_KEY, sel); }
    if (sel.alert === id) { sel.alert = DEFAULT_LIB[0].id; writeJSON(SEL_KEY, sel); }
    return true;
  }

  // ===== انتخاب =====
  function getSel() {
    var sel = readJSON(SEL_KEY, { athan: 'user_adan', alert: 'user_adan' });
    var lib = loadLib();
    var ids = {};
    lib.forEach(function (it) { if (it) ids[it.id] = 1; });
    if (!ids[sel.athan]) sel.athan = (lib[0] && lib[0].id) || '';
    if (!ids[sel.alert]) sel.alert = sel.athan;
    return sel;
  }
  function setSel(kind, id) {
    var sel = getSel();
    // هر دو امضا: setSel('athan', id) و setSel({athan:..., alert:...})
    if (kind && typeof kind === 'object') {
      if (kind.athan !== undefined) sel.athan = kind.athan;
      if (kind.alert !== undefined) sel.alert = kind.alert;
    } else {
      sel[kind] = id;
    }
    writeJSON(SEL_KEY, sel);
  }

  // ===== منبع پخش =====
  function b64ToBlobUrl(b64, mime) {
    try {
      var bin = atob(b64);
      var n = bin.length;
      var buf = new Uint8Array(n);
      for (var i = 0; i < n; i++) buf[i] = bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([buf], { type: mime || 'audio/mpeg' }));
    } catch (e) { return null; }
  }

  // تبدیل آیتم به URL قابل پخش — فایلهای بزرگ از دیسک خوانده شده و Blob می‌شوند (نه data: URI غول‌پیکر)
  function itemSrcFor(item) {
    return new Promise(function (resolve) {
      if (!item) { resolve(null); return; }
      var d = item.data || '';
      if (item.type === 'file' && /^https?:\/\//i.test(d)) { resolve({ url: d, revoke: false }); return; }
      if (item.type === 'file' && d) { resolve({ url: d, revoke: false }); return; } // مسیر asset داخل اپ
      if (item.type === 'file64' && item.path && hasFS()) {
        try {
          window.Filesystem.readFile({ path: item.path, directory: 'DATA', encoding: 'base64' })
            .then(function (r) {
              var u = b64ToBlobUrl(r && r.data ? r.data : '', 'audio/mpeg');
              resolve(u ? { url: u, revoke: true } : null);
            })
            .catch(function () { resolve(null); });
        } catch (e) { resolve(null); }
        return;
      }
      if (item.type === 'file64' && d) {
        var u2 = b64ToBlobUrl(d, 'audio/mpeg');
        resolve(u2 ? { url: u2, revoke: true } : null);
        return;
      }
      resolve(null);
    });
  }

  // ===== پخش =====
  var audioEl = null;
  var playingId = null;
  var digitalStop = null;
  var filePlaying = false;
  var loadingId = null;   // در حال آماده‌سازی منبع (async)
  var playToken = 0;      // ابطال پخشهای در صف

  function status() {
    if (digitalStop) {
      if (window.AthanPlayer && AthanPlayer.isPlaying) return { playing: true, paused: false, id: playingId, mode: 'digital' };
      digitalStop = null; playingId = null;
    }
    if (loadingId) return { playing: false, paused: false, id: loadingId, mode: 'file', loading: true };
    if (audioEl && !audioEl.paused) return { playing: true, paused: false, id: playingId, mode: 'file' };
    if (audioEl && audioEl.paused && (audioEl.currentTime > 0 || filePlaying)) return { playing: false, paused: true, id: playingId, mode: 'file' };
    return { playing: false, paused: false, id: null, mode: null };
  }

  function play(id) {
    var st = status();
    var sel = getSel();
    var wantId = id || sel.athan || playingId;
    // ادامه از مکث فقط اگر همان آیتمِ انتخاب‌شده فعلی در مکث است
    if (st.paused && st.id === wantId) { resume(); return true; }
    if (st.playing || st.paused || loadingId) stop();
    var item = getById(wantId);
    if (!item) item = loadLib()[0];
    if (!item) return false;
    playingId = item.id;
    if (item.type === 'silent') { playingId = null; return true; }
    if (item.type === 'digital') {
      if (window.AthanPlayer) {
        try { AthanPlayer.stop(); } catch (e) {}
        AthanPlayer.playStyle(item.data || 'standard');
        digitalStop = true;
      }
      return true;
    }
    // file / file64 — آماده‌سازی async (Blob از دیسک یا base64)
    var token = ++playToken;
    loadingId = item.id;
    itemSrcFor(item).then(function (src) {
      if (token !== playToken) { // در این فاصله پخش دیگری شروع/توقف شد
        if (src && src.revoke) { try { URL.revokeObjectURL(src.url); } catch (e) {} }
        return;
      }
      loadingId = null;
      if (!src) { playingId = null; return; }
      stopFile();
      audioEl = new Audio(src.url);
      if (src.revoke) audioEl.__revoke = src.url;
      filePlaying = true;
      audioEl.onended = function () { stopFile(); playingId = null; };
      audioEl.onerror = function () { stopFile(); playingId = null; };
      try { audioEl.play().catch(function () { filePlaying = false; }); } catch (e) { filePlaying = false; }
    });
    return true;
  }

  function playItem(id) { return play(id); }

  function pause() {
    if (loadingId) { stop(); return true; } // هنوز آماده نشده — توقف
    if (digitalStop) { stop(); return true; }
    if (audioEl && !audioEl.paused) { audioEl.pause(); return true; }
    return false;
  }

  function resume() {
    if (audioEl && audioEl.paused && audioEl.currentTime > 0) {
      try { audioEl.play().catch(function () {}); } catch (e) {}
      return true;
    }
    return false;
  }

  function stopFile() {
    if (audioEl) {
      try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) {}
      if (audioEl.__revoke) { try { URL.revokeObjectURL(audioEl.__revoke); } catch (e) {} }
    }
    audioEl = null; filePlaying = false;
  }

  function stop() {
    playToken++;        // ابطال آماده‌سازیهای در صف
    loadingId = null;
    if (digitalStop) {
      if (window.AthanPlayer) { try { AthanPlayer.stop(); } catch (e) {} }
      digitalStop = null;
    }
    stopFile();
    playingId = null;
    return true;
  }

  // پخش صدای هشدار
  function playTone(kind) {
    kind = kind || 'alert';
    var sel = getSel();
    var id = sel[kind] || sel.athan;
    var item = getById(id);
    if (!item) return;
    if (item.type === 'silent') return;
    if (item.type === 'digital') {
      if (window.AthanPlayer) { try { AthanPlayer.stop(); } catch (e) {} AthanPlayer.playStyle(item.data || 'standard'); }
      return;
    }
    itemSrcFor(item).then(function (src) {
      if (!src) return;
      var a = new Audio(src.url);
      if (src.revoke) a.__revoke = src.url;
      a.onended = function () { if (a.__revoke) { try { URL.revokeObjectURL(a.__revoke); } catch (e) {} } };
      try { a.play().catch(function () {}); } catch (e) {}
    });
  }

  var Athan = {
    getLib: getLib,
    getById: getById,
    addItem: addItem,
    addItemFile: addItemFile,
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

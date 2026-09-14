/* ============================================================
   Balochistan Nama — backup.js (v1.13)
   پشتیبان‌گیری کامل داده‌های کاربر + بازیابی
   - localStorage (تنظیمات، یادداشت‌ها، مناسبت‌ها، تسبیح، اذان‌ها)
   - فایل‌های صوتی اذان‌های شخصی از دیسک (athans/) — base64
   خروجی: یک فایل JSON قابل اشتراک/ذخیره
   ============================================================ */
(function (global) {
  'use strict';

  var VER = 1;

  // کلیدهای localStorage که باید پشتیبان شوند (blx_ همه داده کاربرند)
  var LS_KEYS = [
    'blx_nama_settings', 'blx_nama_notes', 'blx_personal_events',
    'blx_athan_lib', 'blx_athan_sel', 'blx_tasbeeh_today', 'blx_tasbeeh_streak'
  ];

  function nowStamp() {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  }

  // ===== ساخت فایل پشتیبان =====
  function buildBackup() {
    var out = { app: 'BalochistanNama', backup: true, ver: VER, at: new Date().toISOString(), data: {}, files: {} };
    var had = false;
    LS_KEYS.forEach(function (k) {
      try {
        var v = localStorage.getItem(k);
        if (v != null) { out.data[k] = v; had = true; }
      } catch (e) {}
    });
    return new Promise(function (resolve) {
      var need = [];
      try {
        var lib = JSON.parse(out.data['blx_athan_lib'] || '[]');
        lib.forEach(function (it) { if (it && it.path) need.push({ id: it.id, path: it.path }); });
      } catch (e) {}
      if (!need.length || !window.Filesystem || !window.Capacitor || !window.Capacitor.isNativePlatform()) {
        out.fileCount = 0;
        resolve(out);
        return;
      }
      var done = 0;
      need.forEach(function (f) {
        window.Filesystem.readFile({ path: f.path, directory: 'DATA', encoding: 'base64' }).then(function (r) {
          out.files[f.path] = { b64: r.data };
          done++;
          if (done >= need.length) { out.fileCount = Object.keys(out.files).length; resolve(out); }
        }).catch(function () {
          done++;
          if (done >= need.length) { out.fileCount = Object.keys(out.files).length; resolve(out); }
        });
      });
    });
  }

  // ===== ذخیره فایل + اشتراک‌گذاری =====
  function exportBackup() {
    return buildBackup().then(function (out) {
      var name = 'balochistan-nama-backup-' + nowStamp() + '.json';
      var body = JSON.stringify(out);
      if (window.Capacitor && window.Capacitor.isNativePlatform() && window.Filesystem) {
        // روی دیسک اپ بنویس
        return window.Filesystem.writeFile({ path: name, data: body, directory: 'DOCUMENTS', encoding: 'utf8' })
          .then(function (r) {
            var res = r && r.uri ? r.uri : name;
            // اگر Web Share با فایل ممکن است → منوی اشتراک اندروید
            return fetch(res).then(function (x) { return x.blob(); }).then(function (blob) {
              var file = new File([blob], name, { type: 'application/json' });
              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                return navigator.share({ files: [file], title: 'پشتیبان بلوچستان‌نما' }).then(function () { return 'shared'; });
              }
              return 'saved:' + res;
            }).catch(function () { return 'saved:' + res; });
          })
          .catch(function () { return exportViaDownload(name, body); });
      }
      return exportViaDownload(name, body);
    });
  }

  function exportViaDownload(name, body) {
    // مرورگر/وب‌ویو بدون share: لینک دانلود
    try {
      var blob = new Blob([body], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 3000);
      return Promise.resolve('download');
    } catch (e) { return Promise.resolve('err'); }
  }

  // ===== بازیابی =====
  function importBackup(jsonText) {
    return new Promise(function (resolve, reject) {
      var out;
      try { out = JSON.parse(jsonText); } catch (e) { reject('BADJSON'); return; }
      if (!out || out.app !== 'BalochistanNama' || !out.backup || !out.data) { reject('BADFORMAT'); return; }
      // ۱) بازیابی فایل‌های صوتی به دیسک
      var fileJobs = [];
      if (out.files && window.Filesystem) {
        Object.keys(out.files).forEach(function (p) {
          var f = out.files[p];
          if (f && f.b64) {
            fileJobs.push(window.Filesystem.writeFile({ path: p, data: f.b64, directory: 'DATA', encoding: 'base64', recursive: true }).catch(function () {}));
          }
        });
      }
      // ۲) بازیابی localStorage (تنها کلیدهای شناخته‌شده — امنیت)
      var restored = 0;
      LS_KEYS.forEach(function (k) {
        if (out.data[k] != null) {
          try { localStorage.setItem(k, out.data[k]); restored++; } catch (e) {}
        }
      });
      Promise.all(fileJobs).then(function () {
        resolve({ keys: restored, files: fileJobs.length });
      }).catch(function () { resolve({ keys: restored, files: 0 }); });
    });
  }

  global.BXBackup = {
    export: exportBackup,
    import: importBackup,
    build: buildBackup
  };
})(typeof window !== 'undefined' ? window : this);

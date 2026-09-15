/* BXPTServer — دانلود و کش اوقات شرعی از سرور (v1.16، مرحله ۲پ)
 * دو منبع پشتیبانی:
 *  ۱) JSON ما: { months: { "1404-06": { cityKey: { days: {"1": {fajr,sunrise,dhuhr,asr,maghrib,isha}} } } } }
 *  ۲) صفحه namoodev.ir/athan-times/<شهر> (HTML جدول ۳۱ روزه)
 * کش: localStorage blx_pt_server
 */
(function (global) {
  'use strict';

  var KEY = 'blx_pt_server';
  function defaultUrl() {
    var mk = pmonth(new Date());
    return 'https://msmarbabi.github.io/balochistan-nama/times/' + (mk || 'index') + '.json';
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{"months":{}}'); }
    catch (e) { return { months: {} }; }
  }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { } }

  function jalaliOf(date) {
    if (typeof Cal !== 'undefined' && Cal.dateToTriple) {
      var t = Cal.dateToTriple(date);
      if (t && t.jalali) return t.jalali;
    }
    return null;
  }
  function pmonth(date) {
    var j = jalaliOf(date);
    return j ? (j.jy + '-' + (j.jm < 10 ? '0' : '') + j.jm) : null;
  }
  function dayOfMonth(date) {
    var j = jalaliOf(date);
    return j ? String(j.jd) : String(date.getDate());
  }

  // دریافت با پل Native (callback سراسری) و fallback به fetch
  var _reqSeq = 0;
  global.__httpResult = global.__httpResult || function (reqId, ok, data) {
    var cb = (global.__httpCbs || {})[reqId];
    if (cb) { delete global.__httpCbs[reqId]; if (ok === '1' || ok === 1) cb.res(data); else cb.rej(new Error(String(data).slice(0, 120))); }
  };
  function httpGet(url) {
    return new Promise(function (res, rej) {
      if (global.NativeApp && NativeApp.httpGet) {
        try {
          var id = 'pt' + (++_reqSeq) + '_' + Date.now();
          global.__httpCbs = global.__httpCbs || {};
          global.__httpCbs[id] = { res: res, rej: rej };
          NativeApp.httpGet(url, id);
          setTimeout(function () { if (global.__httpCbs[id]) { delete global.__httpCbs[id]; rej(new Error('timeout')); } }, 45000);
          return;
        } catch (e) { /* fallback fetch */ }
      }
      fetch(url, { mode: 'cors' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }).then(res).catch(rej);
    });
  }

  // ---- پارس جدول HTML صفحه namoodev (جدول اول = ماه جاری صفحه) ----
  function parseNamoo(html, cityKey) {
    var tables = html.match(/<table[\s\S]*?<\/table>/) ;
    if (!tables) return null;
    var mkey = pmonth(new Date()); // صفحه همان ماه جاری را در جدول اول نشان می‌دهد
    if (!mkey) return null;
    var rows = tables[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || [];
    var days = {};
    for (var i = 0; i < rows.length; i++) {
      var cells = (rows[i].match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/g) || []).map(function (c) {
        return c.replace(/<[^>]+>/g, '').trim();
      });
      if (cells.length < 7) continue;
      var day = parseInt(cells[0], 10);
      if (!day || day > 31) continue;
      var t = cells.slice(1, 7);
      if (!/^\d{1,2}:\d{2}$/.test(t[0])) continue;
      days[String(day)] = { fajr: t[0], sunrise: t[1], dhuhr: t[2], asr: t[3], maghrib: t[4], isha: t[5] };
    }
    if (!Object.keys(days).length) return null;
    return { mkey: mkey, cityKey: cityKey, days: days };
  }

  function storeEntry(mkey, cityKey, days) {
    if (!cityKey) return;
    var c = load();
    if (!c.months[mkey]) c.months[mkey] = {};
    c.months[mkey][cityKey] = { days: days, at: Date.now() };
    save(c);
  }

  var BXPTServer = {
    get DEFAULT_URL() { return defaultUrl(); },

    // دانلود: URL خالی = فرمت JSON خودی؛ اگر html/athan-times باشد پارس namoo
    download: function (url, cityName, onProgress) {
      url = (url || '').trim() || FALLBACK_URL;
      var self = this;
      if (onProgress) onProgress('در حال دریافت…');
      return httpGet(url).then(function (text) {
        if (url.indexOf('.json') > 0 || text.charAt(0) === '{') {
          var j = JSON.parse(text);
          var cnt = 0;
          if (j.month && j.cities) { // فرمت ماهانه سرور بلوچستان‌نما
            var c0 = load();
            if (!c0.months[j.month]) c0.months[j.month] = {};
            for (var ck0 in j.cities) { c0.months[j.month][ck0] = j.cities[ck0]; cnt++; }
            save(c0);
          } else if (j.months) {
            var c = load();
            for (var mk in j.months) {
              if (!c.months[mk]) c.months[mk] = {};
              for (var ck in j.months[mk]) { c.months[mk][ck] = j.months[mk][ck]; cnt++; }
            }
            save(c);
          } else if (j.days && j.city) {
            storeEntry(Object.keys(j.days).length && j.month || pmonth(new Date()), j.city, j.days);
            cnt = 1;
          }
          if (onProgress) onProgress('✓ ' + cnt + ' شهر/ماه دریافت شد');
          return cnt;
        }
        // HTML (namoodev): برای یک شهر
        var cityKey = (cityName || url.split('/').pop()).trim();
        var parsed = parseNamoo(text, cityKey);
        if (!parsed) throw new Error('جدول اذان در صفحه پیدا نشد');
        storeEntry(parsed.mkey, parsed.cityKey, parsed.days);
        if (onProgress) onProgress('✓ ' + parsed.cityKey + ' — ماه ' + parsed.mkey + ' (' + Object.keys(parsed.days).length + ' روز)');
        return 1;
      });
    },

    // زمان سروری برای امروز؛ null = از محاسبه استفاده کن
    timesFor: function (cityKey, date) {
      var c = load();
      var mk = pmonth(date || new Date());
      if (!mk || !c.months[mk]) return null;
      var entry = c.months[mk][cityKey];
      if (!entry && cityKey) {
        // تطبیق نام کوتاه (مثلاً «ورکات، بخش پیپ...» با کلید «ورکات، لاشار»)
        for (var k in c.months[mk]) {
          if (k.indexOf(cityKey) === 0 || cityKey.indexOf(k) === 0) { entry = c.months[mk][k]; break; }
        }
      }
      if (!entry) return null;
      return entry.days[dayOfMonth(date || new Date())] || null;
    },

    cachedList: function () {
      var c = load(), out = [];
      for (var mk in c.months) for (var ck in c.months[mk]) out.push(mk + ' · ' + ck);
      return out;
    },

    clear: function () { try { localStorage.removeItem(KEY); } catch (e) { } }
  };

  BXPTServer._parseNamoo = parseNamoo;
  BXPTServer._pmonth = pmonth;
  global.BXPTServer = BXPTServer;
})(typeof window !== 'undefined' ? window : this);

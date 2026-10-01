/* FieldTools — v1.0 — ابزارهای میدانی جدید تب «ابزار» (بلوچستان‌نما)
   ۴ ابزار برگرفته از fieldcalc.app:
     1) coordconv — تبدیل مختصات: درجه اعشاری / DMS / UTM / MGRS
     2) sun       — طلوع و غروب + طول روز + ظهر خورشیدی + ساعت طلایی (NOAA)
     3) azimuth   — آزیموت و فاصله بین دو نقطه (haversine)
     4) addr      — آدرسیاب: مختصات → آدرس (reverse geocode: Nominatim + BigDataCloud)
   وابستگی: js/vendor/mgrs.js (کتابخانه رسمی MGRS/UTM)
   راه‌اندازی: window.BXField.open('coordconv'|'sun'|'azimuth'|'addr') — از pro360.js */
(function (global) {
  'use strict';
  var D = document;
  var R = Math.PI / 180;

  /* ---------- helpers ---------- */
  function $(id) { return D.getElementById(id); }
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(n) { return String(n).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function toLatinDigits(s) {
    return String(s).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 1776); })
      .replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 1632); })
      .replace(/٫/g, '.').replace(/،/g, ',');
  }
  function toast(m) {
    if (global.P && P.toast) P.toast(m);
    else if (global.App && App.toast) App.toast(m);
    else alert(m);
  }
  function copy(t) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t)['catch'](function () { legacyCopy(t); });
      } else legacyCopy(t);
      toast('کپی شد ✓');
    } catch (e) { toast('کپی نشد'); }
  }
  function legacyCopy(t) {
    var ta = D.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    D.body.appendChild(ta); ta.select();
    try { D.execCommand('copy'); } catch (e) {}
    D.body.removeChild(ta);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- sheet (bottom-sheet مثل پوسته‌های pro360) ---------- */
  var cur = null;
  function close() {
    if (cur && cur.parentNode) cur.parentNode.removeChild(cur);
    cur = null;
  }
  function sheet(title, html) {
    close();
    var ov = D.createElement('div');
    ov.className = 'p360-ov'; ov.id = 'bxftov';
    ov.innerHTML = '<div class="p360-sheet"><div class="p360-grab"></div>' +
      '<div class="p360-title" style="text-align:center;margin-bottom:10px">' + title + '</div>' + html + '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    D.body.appendChild(ov);
    cur = ov;
    return ov;
  }

  /* ---------- موقعیت فعلی (GPS یک‌باره) ---------- */
  function gps(cb) {
    if (!navigator.geolocation) { toast('GPS در دسترس نیست'); return; }
    toast('دریافت موقعیت...');
    navigator.geolocation.getCurrentPosition(function (p) {
      cb(p.coords.latitude, p.coords.longitude);
    }, function () { toast('موقعیت دریافت نشد — دسترسی مکان را چک کنید'); },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 30000 });
  }
  function lastLoc() {
    if (global.P && P.st && P.st.loc) return { lat: P.st.loc.lat, lon: P.st.loc.lng };
    if (global.App && App.settings && App.settings.lat != null) return { lat: App.settings.lat, lon: App.settings.lng };
    return { lat: 25.29, lon: 60.64 }; // چابهار (پیش‌فرض)
  }

  /* ================================================================
     1) تبدیل مختصات — DD / DMS / UTM / MGRS
     ================================================================ */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDMS(lat, lon) {
    function one(v, pos, neg) {
      var h = v >= 0 ? pos : neg; v = Math.abs(v);
      var d = Math.floor(v), mf = (v - d) * 60;
      var m = Math.floor(mf), s = (mf - m) * 60;
      return d + '°' + pad2(m) + "'" + (s < 10 ? '0' : '') + s.toFixed(2) + '"' + h;
    }
    return one(lat, 'N', 'S') + ' ' + one(lon, 'E', 'W');
  }
  function fmtDD(lat, lon) { return lat.toFixed(6) + ', ' + lon.toFixed(6); }
  function fmtUTM(lat, lon) {
    var m = mgrs.LLtoUTM({ lat: lat, lon: lon });
    if (!m) return '--';
    return m.zoneNumber + m.zoneLetter + ' ' + Math.round(m.easting) + ' ' + Math.round(m.northing);
  }
  function fmtMGRS(lat, lon) { return mgrs.forward([lon, lat], 5); }

  function parseDD(s) {
    s = toLatinDigits(s).trim();
    var m = s.match(/-?\d+(?:\.\d+)?/g);
    if (!m || m.length < 2) return null;
    var a = parseFloat(m[0]), b = parseFloat(m[1]);
    if (/[EW]/i.test(s)) { var t = a; a = b; b = t; } // «60E 25N» یا «60.6 25.3» با حرف
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lon: b };
    if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return { lat: b, lon: a };
    return null;
  }
  function dmsVal(nums) {
    if (!nums || !nums.length) return null;
    return parseFloat(nums[0]) + (parseFloat(nums[1] || 0) / 60) + (parseFloat(nums[2] || 0) / 3600);
  }
  function numsIn(s) { return s.match(/\d+(?:\.\d+)?/g) || []; }
  function isPrefix(s, pos) { // حرف در pos پیشوند عدد است؟ (مثل N25° به‌جای 25°N)
    var c = s.charAt(pos + 1);
    return c !== '' && /[0-9]/.test(c);
  }
  /* DMS با پشتیبانی از همهٔ فرمت‌ها:
     «25°17'25"N 60°38'40"E» · «N25°17'25" E60°38'40"» · «25 17.418 N, 60 38.676 E»
     · «31°2'0"S 61°29'0"W» · ترتیب معکوس (طول اول) · بدون حرف (اعشاری/DMS) */
  function parseDMS(s) {
    s = toLatinDigits(s).trim();
    if (!s) return null;
    var posLat = s.search(/[NS]/i), posLon = s.search(/[EW]/i);
    if (posLat < 0 && posLon < 0) {
      if (s.indexOf('°') >= 0 || s.indexOf("'") >= 0) { // DMS بدون حرف
        var un = numsIn(s);
        if (un.length >= 6) return { lat: dmsVal(un.slice(0, 3)), lon: dmsVal(un.slice(3, 6)) };
        if (un.length === 4) return { lat: dmsVal(un.slice(0, 2)), lon: dmsVal(un.slice(2, 4)) };
        return null;
      }
      return parseDD(s);
    }
    var latNums, lonNums, latHem = null, lonHem = null;
    if (posLat >= 0 && posLon >= 0) {
      latHem = s.charAt(posLat).toUpperCase(); lonHem = s.charAt(posLon).toUpperCase();
      if (posLat < posLon) { // عرض اول
        if (isPrefix(s, posLat)) {
          latNums = numsIn(s.slice(posLat, posLon));
          if (isPrefix(s, posLon)) lonNums = numsIn(s.slice(posLon));
          else lonNums = numsIn(s.slice(posLat + 1, posLon + 1)).slice(latNums.length);
        } else {
          latNums = numsIn(s.slice(0, posLat + 1));
          lonNums = isPrefix(s, posLon) ? numsIn(s.slice(posLon)) : numsIn(s.slice(posLat + 1, posLon + 1));
        }
      } else { // طول اول
        if (isPrefix(s, posLon)) {
          lonNums = numsIn(s.slice(posLon, posLat));
          if (isPrefix(s, posLat)) latNums = numsIn(s.slice(posLat));
          else latNums = numsIn(s.slice(posLon + 1, posLat + 1)).slice(lonNums.length);
        } else {
          lonNums = numsIn(s.slice(0, posLon + 1));
          latNums = isPrefix(s, posLat) ? numsIn(s.slice(posLat)) : numsIn(s.slice(posLon + 1, posLat + 1));
        }
      }
    } else if (posLat >= 0) { // فقط N/S — طول جداشده با کاما/فاصله
      latHem = s.charAt(posLat).toUpperCase();
      if (isPrefix(s, posLat)) {
        var pL = s.slice(posLat).split(/[,؛;]/);
        latNums = numsIn(pL[0] || ''); lonNums = numsIn(pL.slice(1).join(' '));
      } else { latNums = numsIn(s.slice(0, posLat + 1)); lonNums = numsIn(s.slice(posLat + 1)); }
    } else { // فقط E/W — عرض جداشده با کاما/فاصله
      lonHem = s.charAt(posLon).toUpperCase();
      if (isPrefix(s, posLon)) {
        var pO = s.slice(posLon).split(/[,؛;]/);
        lonNums = numsIn(pO[0] || ''); latNums = numsIn(pO.slice(1).join(' '));
      } else { lonNums = numsIn(s.slice(0, posLon + 1)); latNums = numsIn(s.slice(posLon + 1)); }
    }
    var lat = dmsVal(latNums), lon = dmsVal(lonNums);
    if (lat == null || lon == null) return null;
    if (latHem === 'S') lat = -lat;
    if (lonHem === 'W') lon = -lon;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return { lat: lat, lon: lon };
  }
  function parseUTM(s) {
    s = toLatinDigits(s).trim().toUpperCase();
    s = s.replace(/(\d)\s*[EN](?=\s*\d)/g, '$1 '); // «262836E 2799176N» ← «262836 2799176»
    s = s.replace(/^(\d{1,2})\s*([A-Z])/, '$1$2 '); // «41R262836» ← «41R 262836»
    var m = s.match(/(\d{1,2})\s*([C-HJ-NP-X])?[\s,]+(\d{4,7})[\s,]+(\d{4,7})/);
    if (!m) return null;
    var zone = parseInt(m[1], 10);
    var band = (m[2] || 'N').toUpperCase();
    var E = parseInt(m[3], 10), N = parseInt(m[4], 10);
    if (zone < 1 || zone > 60) return null;
    var r = mgrs.UTMtoLL({ northing: N, easting: E, zoneNumber: zone, zoneLetter: band });
    if (!r || r.lat == null) return null;
    return { lat: r.lat, lon: r.lon };
  }
  function parseMGRS(s) {
    s = toLatinDigits(s).replace(/\s+/g, '').toUpperCase();
    if (s.length < 5) return null;
    try {
      var p = mgrs.toPoint(s);
      if (!p || p[0] == null || p[1] == null) return null;
      if (Math.abs(p[1]) > 90 || Math.abs(p[0]) > 180) return null;
      return { lat: p[1], lon: p[0] };
    } catch (e) { return null; }
  }

  var CFMT = {
    dd: { lb: 'درجه اعشاری (DD)', ph: '25.290300, 60.644600', parse: parseDD },
    dms: { lb: 'درجه-دقیقه-ثانیه (DMS)', ph: '25°17\'25.16"N 60°38\'40.56"E', parse: parseDMS },
    utm: { lb: 'UTM', ph: '41R 262836 2799176', parse: parseUTM },
    mgrs: { lb: 'MGRS', ph: '41RKH6283699176', parse: parseMGRS }
  };
  var cfMode = 'dd';

  function convShow(res) {
    var out = $('ftConvOut');
    if (!out) return;
    if (!res) {
      out.innerHTML = '<div class="ft-err">مختصات قابل خواندن نیست — نمونهٔ زیر را ببینید</div>';
      return;
    }
    var rows = [
      ['درجه اعشاری', fmtDD(res.lat, res.lon)],
      ['درجه-دقیقه-ثانیه', fmtDMS(res.lat, res.lon)],
      ['UTM', fmtUTM(res.lat, res.lon)],
      ['MGRS', fmtMGRS(res.lat, res.lon)]
    ];
    out.innerHTML = rows.map(function (r) {
      return '<div class="ft-res"><span class="k">' + r[0] + '</span>' +
        '<span class="v">' + esc(r[1]) + '</span>' +
        '<button class="ft-copy" data-c="' + esc(r[1]) + '">کپی</button></div>';
    }).join('') +
      '<div class="ft-hint">عرض و طول جغرافیایی در فرمت DD: <span dir="ltr">عرض، طول</span> (WGS84)</div>';
    Array.prototype.forEach.call(out.querySelectorAll('.ft-copy'), function (b) {
      b.onclick = function () { copy(b.getAttribute('data-c')); };
    });
  }

  function openCoordConv() {
    var chips = Object.keys(CFMT).map(function (k) {
      return '<button class="p360-chip cf-m' + (k === cfMode ? ' on' : '') + '" data-m="' + k + '">' + CFMT[k].lb + '</button>';
    }).join('');
    sheet('🗺️ تبدیل مختصات',
      '<div class="ft-seg">' + chips + '</div>' +
      '<input class="ft-inp" id="ftConvIn" style="margin-top:10px" placeholder="' + esc(CFMT[cfMode].ph) + '" autocomplete="off">' +
      '<div class="ft-row" style="margin-top:10px">' +
      '<button class="p360-btn" id="ftConvGo" style="margin-top:0">تبدیل</button>' +
      '<button class="p360-btn sec" id="ftConvGps" style="margin-top:0;flex:0 0 auto;width:auto;padding:12px 14px">📍 موقعیت فعلی</button>' +
      '</div>' +
      '<div id="ftConvOut"><div class="ft-hint">مختصات را در یکی از چهار فرمت بالا وارد کنید؛ هر چهار خروجی محاسبه می‌شود.</div></div>');

    Array.prototype.forEach.call(document.querySelectorAll('.cf-m'), function (b) {
      b.onclick = function () {
        cfMode = b.getAttribute('data-m');
        Array.prototype.forEach.call(document.querySelectorAll('.cf-m'), function (x) {
          x.classList.toggle('on', x.getAttribute('data-m') === cfMode);
        });
        var inp = $('ftConvIn');
        inp.placeholder = CFMT[cfMode].ph;
        inp.value = ''; convShow(null);
        $('ftConvOut').innerHTML = '<div class="ft-hint">مثلاً: <span dir="ltr">' + esc(CFMT[cfMode].ph) + '</span></div>';
        inp.focus();
      };
    });
    function run() {
      var v = $('ftConvIn').value;
      if (!v) { toast('مقداری وارد کنید'); return; }
      convShow(CFMT[cfMode].parse(v));
    }
    $('ftConvGo').onclick = run;
    $('ftConvIn').onkeydown = function (e) { if (e.key === 'Enter') run(); };
    $('ftConvGps').onclick = function () {
      gps(function (la, lo) {
        $('ftConvIn').value = fmtDD(la, lo);
        cfMode = 'dd';
        Array.prototype.forEach.call(document.querySelectorAll('.cf-m'), function (x) {
          x.classList.toggle('on', x.getAttribute('data-m') === 'dd');
        });
        $('ftConvIn').placeholder = CFMT.dd.ph;
        convShow({ lat: la, lon: lo });
      });
    };
    $('ftConvIn').focus();
  }

  /* ================================================================
     2) طلوع و غروب (الگوریتم NOAA — دقیقه‌محور)
     ================================================================ */
  function jdn(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; // 0h UT
  }
  function sunParams(jd) {
    var T = (jd - 2451545.0) / 36525;
    var L0 = (280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360;
    var M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * R;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M) +
      (0.019993 - 0.000101 * T) * Math.sin(2 * M) + 0.000289 * Math.sin(3 * M);
    var trueLon = L0 + C;
    var om = (125.04 - 1934.136 * T) * R;
    var appLon = trueLon - 0.00569 - 0.00478 * Math.sin(om);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = eps0 + 0.00256 * Math.cos(om);
    var dec = Math.asin(Math.sin(eps * R) * Math.sin(appLon * R)) / R;
    var y2 = Math.tan(eps * R / 2); y2 *= y2;
    var e = 0.016708634 - T * (0.000042037 + T * 0.0000001267);
    var L0r = L0 * R;
    var eot = 4 * (y2 * Math.sin(2 * L0r) - 2 * e * Math.sin(M) + 4 * e * y2 * Math.sin(M) * Math.cos(2 * L0r)
      - 0.5 * y2 * y2 * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * M)) / R;
    return { dec: dec, eot: eot };
  }
  function hourAngle(lat, dec, elev) {
    var c = (Math.sin(elev * R) - Math.sin(lat * R) * Math.sin(dec * R)) / (Math.cos(lat * R) * Math.cos(dec * R));
    if (c > 1 || c < -1) return null;
    return Math.acos(c) / R;
  }
  /* tzMin: اختلاف ساعت محلی از UTC به دقیقه (مثبت = شرق) */
  function sunTimes(y, m, d, lat, lon, tzMin) {
    var JD = jdn(y, m, d);
    var H0 = hourAngle(lat, sunParams(JD + 0.5).dec, -0.833);
    if (H0 == null) return { polar: true };
    var noon = 720 - 4 * lon - sunParams(JD + 0.5).eot;
    var rise = noon - 4 * H0, set = noon + 4 * H0;
    for (var i = 0; i < 3; i++) {
      var p1 = sunParams(JD + rise / 1440);
      var h1 = hourAngle(lat, p1.dec, -0.833);
      if (h1 != null) rise = (720 - 4 * lon - p1.eot) - 4 * h1;
      var p2 = sunParams(JD + set / 1440);
      var h2 = hourAngle(lat, p2.dec, -0.833);
      if (h2 != null) set = (720 - 4 * lon - p2.eot) + 4 * h2;
    }
    var pn = sunParams(JD + 0.5);
    var noonL = noon + tzMin, riseL = rise + tzMin, setL = set + tzMin;
    var H6 = hourAngle(lat, pn.dec, 6);
    return {
      rise: riseL, set: setL, noon: noonL,
      daylight: setL - riseL,
      goldAm: H6 == null ? null : (noonL - 4 * H6),
      goldPm: H6 == null ? null : (noonL + 4 * H6),
      dec: pn.dec
    };
  }
  function hm(min) {
    if (min == null || isNaN(min)) return '--:--';
    min = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(min / 60), mm = Math.floor(min % 60);
    return fa(pad2(h) + ':' + pad2(mm));
  }
  function dur(min) {
    if (min == null || isNaN(min)) return '--';
    return fa(Math.floor(min / 60)) + ' ساعت و ' + fa(Math.floor(min % 60)) + ' دقیقه';
  }

  /* شهرها: [نام، عرض، طول، UTC به ساعت] */
  var SUN_CITIES = [
    ['موقعیت فعلی (GPS)', null, null, null],
    ['ورکات، لاشار', 26.84, 60.17, 3.5],
    ['چابهار', 25.29, 60.64, 3.5],
    ['ایرانشهر', 27.20, 60.70, 3.5],
    ['سراوان', 27.38, 62.33, 3.5],
    ['خاش', 28.22, 61.20, 3.5],
    ['زاهدان', 29.50, 60.86, 3.5],
    ['زابل', 31.03, 61.49, 3.5],
    ['کنارک', 25.40, 60.37, 3.5],
    ['نیک‌شهر', 26.21, 60.22, 3.5],
    ['بمپور', 27.17, 60.47, 3.5],
    ['دلگان', 27.57, 59.70, 3.5],
    ['راسک', 26.00, 61.50, 3.5],
    ['سرباز', 26.50, 62.10, 3.5],
    ['میرجاوه', 28.95, 61.50, 3.5],
    ['تهران', 35.69, 51.39, 3.5],
    ['مشهد', 36.29, 59.61, 3.5],
    ['اصفهان', 32.65, 51.67, 3.5],
    ['شیراز', 29.59, 52.58, 3.5],
    ['کرمان', 30.28, 57.07, 3.5],
    ['بندرعباس', 27.18, 56.28, 3.5],
    ['مکهٔ مکرمه', 21.42, 39.83, 3],
    ['استانبول', 41.01, 28.98, 3]
  ];

  function sunRender() {
    var out = $('ftSunOut'); if (!out) return;
    var ci = parseInt($('ftSunCity').value, 10);
    var city = SUN_CITIES[ci];
    var lat, lon, tz;
    if (ci === 0) {
      var L = lastLoc(); lat = L.lat; lon = L.lon;
      tz = -new Date().getTimezoneOffset() / 60;
    } else { lat = city[1]; lon = city[2]; tz = city[3]; }
    var dv = $('ftSunDate').value || '';
    var parts = dv.split('-');
    var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
    if (!y) { var t = new Date(); y = t.getFullYear(); m = t.getMonth() + 1; d = t.getDate(); }
    var r = sunTimes(y, m, d, lat, lon, tz * 60);
    var tzStr = (tz >= 0 ? '+' : '') + fa(tz);
    if (r.polar) {
      out.innerHTML = '<div class="ft-err">در این مکان و تاریخ، خورشید طلوع/غروب نمی‌کند</div>';
      return;
    }
    out.innerHTML =
      '<div class="p360-stats">' +
      '<div><b>' + hm(r.rise) + '</b><span>طلوع</span></div>' +
      '<div><b>' + hm(r.set) + '</b><span>غروب</span></div>' +
      '<div><b>' + fa(Math.floor(r.daylight / 60) + ':' + pad2(Math.floor(r.daylight % 60))) + '</b><span>طول روز</span></div>' +
      '</div>' +
      '<div class="ft-res"><span class="k">ساعت طلایی صبح</span><span class="v">' + hm(r.rise) + ' — ' + hm(r.goldAm) + '</span></div>' +
      '<div class="ft-res"><span class="k">ساعت طلایی عصر</span><span class="v">' + hm(r.goldPm) + ' — ' + hm(r.set) + '</span></div>' +
      '<div class="ft-res"><span class="k">ظهر خورشیدی</span><span class="v">' + hm(r.noon) + '</span></div>' +
      '<div class="ft-res"><span class="k">طول روز</span><span class="v">' + dur(r.daylight) + '</span></div>' +
      '<div class="ft-hint">منطقه زمانی اعمال‌شده: UTC' + tzStr +
      ' — مختصات: <span dir="ltr">' + fa(lat.toFixed(4) + ', ' + lon.toFixed(4)) + '</span></div>';
  }

  function openSun() {
    var now = new Date();
    var today = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
    var opts = SUN_CITIES.map(function (c, i) {
      return '<option value="' + i + '">' + esc(c[0]) + '</option>';
    }).join('');
    sheet('🌅 طلوع و غروب',
      '<div class="ft-row"><div style="flex:1">' +
      '<span class="ft-lb">تاریخ</span>' +
      '<input type="date" class="ft-inp" id="ftSunDate" value="' + today + '">' +
      '</div><div style="flex:1.3">' +
      '<span class="ft-lb">مکان</span>' +
      '<select class="ft-sel" id="ftSunCity">' + opts + '</select>' +
      '</div></div>' +
      '<div id="ftSunOut" style="margin-top:10px"></div>');

    $('ftSunDate').onchange = sunRender;
    $('ftSunCity').onchange = function () {
      if (this.value === '0') { // موقعیت فعلی → دریافت تازه
        gps(function (la, lo) {
          var st = (global.P && P.st); if (st && st.loc) { st.loc.lat = la; st.loc.lng = lo; }
          sunRender();
        });
      } else sunRender();
    };
    sunRender();
  }

  /* ================================================================
     3) آزیموت و فاصله بین دو نقطه
     ================================================================ */
  function bearing(a, b) {
    var p1 = a.lat * R, p2 = b.lat * R, dl = (b.lon - a.lon) * R;
    var y = Math.sin(dl) * Math.cos(p2);
    var x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (Math.atan2(y, x) / R + 360) % 360;
  }
  function distM(a, b) {
    var R2 = 6371008.8;
    var dLat = (b.lat - a.lat) * R, dLon = (b.lon - a.lon) * R;
    var s = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R2 * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function cardName(deg) {
    if (global.P && P.card) return P.card(deg);
    return ['شمال', 'شمال شرقی', 'شرق', 'جنوب شرقی', 'جنوب', 'جنوب غربی', 'غرب', 'شمال غربی'][Math.round(deg / 45) % 8];
  }
  function fmtDist(m) {
    return m < 1000 ? fa(Math.round(m)) + ' متر' : fa((m / 1000).toFixed(2)) + ' کیلومتر';
  }
  function azRender() {
    var out = $('ftAzOut'); if (!out) return;
    var a = parseDD($('ftAzAlat').value + ',' + $('ftAzAlon').value);
    var b = parseDD($('ftAzBlat').value + ',' + $('ftAzBlon').value);
    if (!a || !b) { out.innerHTML = '<div class="ft-err">هر چهار خانه را با عدد پر کنید</div>'; return; }
    var brg = bearing(a, b), back = bearing(b, a), dm = distM(a, brg == null ? b : b);
    out.innerHTML =
      '<div class="p360-big" style="font-size:40px">' + fa(Math.round(brg)) + '°</div>' +
      '<div class="p360-unit">' + cardName(brg) + ' — از A به سمت B</div>' +
      '<div class="p360-stats">' +
      '<div><b>' + fa(Math.round(brg)) + '°</b><span>آزیموت رفت</span></div>' +
      '<div><b>' + fa(Math.round(back)) + '°</b><span>آزیموت برگشت</span></div>' +
      '<div><b>' + fmtDist(dm).replace(' ', ' ') + '</b><span>فاصله</span></div>' +
      '</div>' +
      '<div class="ft-res"><span class="k">جهت رفت</span><span class="v">' + fa(Math.round(brg)) + '° ' + cardName(brg) + '</span>' +
      '<button class="ft-copy" data-c="' + fa(Math.round(brg)) + '">کپی</button></div>' +
      '<div class="ft-res"><span class="k">مسیر (مختصات)</span><span class="v" dir="ltr">' +
      esc(fmtDD(a.lat, a.lon) + ' → ' + fmtDD(b.lat, b.lon)) + '</span>' +
      '<button class="ft-copy" data-c="' + esc(fmtDD(a.lat, a.lon) + ' → ' + fmtDD(b.lat, b.lon)) + '">کپی</button></div>' +
      '<div class="ft-hint">آزیموت اولیهٔ مسیر (True North)؛ برای جبران انحراف مغناطیسی از چیپ MAG قطب‌نما استفاده کنید.</div>';
    Array.prototype.forEach.call(out.querySelectorAll('.ft-copy'), function (bt) {
      bt.onclick = function () { copy(bt.getAttribute('data-c')); };
    });
  }
  function openAzimuth() {
    var L = lastLoc();
    sheet('🎯 جهت‌یاب (آزیموت)',
      '<span class="ft-lb">نقطهٔ A — مبدأ</span>' +
      '<div class="ft-row"><input class="ft-inp" id="ftAzAlat" placeholder="عرض (25.2903)" value="' + fa(L.lat.toFixed(4)) + '">' +
      '<input class="ft-inp" id="ftAzAlon" placeholder="طول (60.6446)" value="' + fa(L.lon.toFixed(4)) + '"></div>' +
      '<button class="p360-chip" id="ftAzGps" style="margin-top:8px">📍 پر کردن A با موقعیت فعلی</button>' +
      '<span class="ft-lb">نقطهٔ B — مقصد</span>' +
      '<div class="ft-row"><input class="ft-inp" id="ftAzBlat" placeholder="عرض">' +
      '<input class="ft-inp" id="ftAzBlon" placeholder="طول"></div>' +
      '<button class="p360-btn" id="ftAzGo">محاسبه جهت و فاصله</button>' +
      '<div id="ftAzOut" style="margin-top:6px"></div>');

    $('ftAzGps').onclick = function () {
      gps(function (la, lo) {
        $('ftAzAlat').value = fa(la.toFixed(6)); $('ftAzAlon').value = fa(lo.toFixed(6));
        azRender();
      });
    };
    $('ftAzGo').onclick = azRender;
    Array.prototype.forEach.call(document.querySelectorAll('#bxftov .ft-inp'), function (i) {
      i.onkeydown = function (e) { if (e.key === 'Enter') azRender(); };
    });
    azRender();
  }

  /* ================================================================
     4) آدرسیاب — مختصات → آدرس (reverse geocode)
     ================================================================ */
  function geoRev(lat, lon, cb) {
    var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=fa&lat=' +
      lat + '&lon=' + lon;
    var done = false;
    function ok(o) { if (!done) { done = true; cb(null, o); } }
    function fail() {
      if (done) return;
      fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat +
        '&longitude=' + lon + '&localityLanguage=fa')
        .then(function (r) { return r.json(); })
        .then(function (o) {
          if (o && (o.locality || o.city || o.principalSubdivision || o.countryName)) {
            ok({ big: o });
          } else if (!done) { done = true; cb(new Error('آدرسی یافت نشد'), null); }
        })
        ['catch'](function () { if (!done) { done = true; cb(new Error('اتصال اینترنت برقرار نیست'), null); } });
    }
    fetch(url)
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (o) {
        if (o && (o.display_name || o.address)) ok(o); else fail();
      })
      ['catch'](fail);
  }

  function addrRender(lat, lon) {
    var out = $('ftAddrOut'); if (!out) return;
    out.innerHTML = '<div class="ft-err">در حال دریافت آدرس...</div>';
    geoRev(lat, lon, function (err, o) {
      if (err) { out.innerHTML = '<div class="ft-err">' + esc(err.message) + '</div>'; return; }
      var main = '', chips = '';
      if (o.big) {
        var b = o.big;
        var lines = [];
        if (b.locality) lines.push(b.locality);
        if (b.city && b.city !== b.locality) lines.push(b.city);
        if (b.principalSubdivision) lines.push(b.principalSubdivision);
        if (b.countryName) lines.push(b.countryName);
        main = lines.join('، ');
        if (b.neighbourhood) main = b.neighbourhood + '، ' + main;
        if (b.localityInfo && b.localityInfo.administrative) {
          chips = b.localityInfo.administrative.slice(0, 3).map(function (x) { return x.name; })
            .filter(function (n, i, s) { return n && s.indexOf(n) === i; }).join(' · ');
        }
      } else {
        main = o.display_name || '';
        var ad = o.address || {};
        var seg = [ad.suburb || ad.neighbourhood || ad.road, ad.city || ad.town || ad.village || ad.county,
          ad.state, ad.country].filter(Boolean);
        if (seg.length) chips = seg.join(' · ');
      }
      if (!main) { out.innerHTML = '<div class="ft-err">آدرسی برای این مختصات یافت نشد</div>'; return; }
      out.innerHTML =
        '<div class="ft-addr">' + esc(main) + '</div>' +
        (chips && chips !== main ? '<div class="ft-chips">' + esc(chips) + '</div>' : '') +
        '<div class="ft-row" style="margin-top:10px">' +
        '<button class="p360-btn" id="ftAddrCopy" style="margin-top:0">📋 کپی آدرس</button>' +
        '<button class="p360-btn sec" id="ftAddrAgain" style="margin-top:0">تازه‌سازی</button></div>' +
        '<div class="ft-hint">منبع: OpenStreetMap (Nominatim) با پشتیبان BigDataCloud</div>';
      $('ftAddrCopy').onclick = function () { copy(main); };
      $('ftAddrAgain').onclick = function () { addrRender(lat, lon); };
    });
  }

  function openAddr() {
    var L = lastLoc();
    sheet('🏷️ آدرسیاب (مختصات → آدرس)',
      '<div class="ft-row"><input class="ft-inp" id="ftAddrLat" placeholder="عرض" value="' + fa(L.lat.toFixed(6)) + '">' +
      '<input class="ft-inp" id="ftAddrLon" placeholder="طول" value="' + fa(L.lon.toFixed(6)) + '"></div>' +
      '<div class="ft-row" style="margin-top:10px">' +
      '<button class="p360-btn" id="ftAddrGo" style="margin-top:0">🔍 دریافت آدرس</button>' +
      '<button class="p360-btn sec" id="ftAddrGps" style="margin-top:0;flex:0 0 auto;width:auto;padding:12px 14px">📍 موقعیت فعلی</button>' +
      '</div><div id="ftAddrOut" style="margin-top:10px">' +
      '<div class="ft-hint">مختصات را وارد کنید یا «موقعیت فعلی» را بزنید؛ آدرس شهر/خیابان نمایش داده می‌شود.</div></div>');

    function go() {
      var a = parseDD($('ftAddrLat').value + ',' + $('ftAddrLon').value);
      if (!a) { toast('مختصات قابل خواندن نیست'); return; }
      addrRender(a.lat, a.lon);
    }
    $('ftAddrGo').onclick = go;
    $('ftAddrGps').onclick = function () {
      gps(function (la, lo) {
        $('ftAddrLat').value = fa(la.toFixed(6)); $('ftAddrLon').value = fa(lo.toFixed(6));
        go();
      });
    };
    Array.prototype.forEach.call(document.querySelectorAll('#bxftov .ft-inp'), function (i) {
      i.onkeydown = function (e) { if (e.key === 'Enter') go(); };
    });
  }

  /* ---------- dispatch ---------- */
  function open(name) {
    if (typeof mgrs === 'undefined') { toast('کتابخانهٔ مختصات بارگذاری نشده'); return; }
    if (name === 'coordconv') openCoordConv();
    else if (name === 'sun') openSun();
    else if (name === 'azimuth') openAzimuth();
    else if (name === 'addr') openAddr();
  }

  global.BXField = { open: open, close: close };
})(window);

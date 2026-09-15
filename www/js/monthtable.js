/* BXMonthTable — جدول ماهانه اوقات شرعی آفلاین (v1.16 مرحله ۳)
 * منبع: کش BXPTServer (دانلود‌شده = آفلاینِ همیشگی) و در نبودش محاسبه آنی حنفی
 */
(function (global) {
  'use strict';

  var KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  var HEAD = ['صبح', 'طلوع', 'ظهر', 'عصر', 'مغرب', 'عشا'];
  var WD = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

  var state = { jy: 0, jm: 0, cityIdx: -1 };

  function U() { return global.BXUtils; }
  function esc(x) { return U() && U().escapeHtml ? U().escapeHtml(String(x)) : String(x); }
  function fa(x) { return U() && U().toFaDigits ? U().toFaDigits(String(x)) : String(x); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function monthLen(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return global.Cal && Cal.isLeapJalali ? (Cal.isLeapJalali(jy) ? 30 : 29) : 29;
  }

  function cityList() {
    return global.Tools && Tools.CITIES ? Tools.CITIES : [];
  }
  function currentCity() {
    var list = cityList();
    if (state.cityIdx >= 0 && list[state.cityIdx]) return list[state.cityIdx];
    var s = (global.__blxSettings || {});
    return { name: s.locName || 'جاری', lat: s.lat || 25.29, lng: s.lng || 60.64 };
  }

  function serverRow(cityName, mkey, day) {
    try {
      var c = JSON.parse(localStorage.getItem('blx_pt_server') || '{"months":{}}');
      var mo = c.months[mkey];
      if (!mo) return null;
      var e = mo[cityName];
      if (!e && cityName) {
        for (var k in mo) { if (k.indexOf(cityName) === 0 || cityName.indexOf(k) === 0) { e = mo[k]; break; } }
      }
      return e && e.days ? e.days[String(day)] : null;
    } catch (err) { return null; }
  }

  function rowFor(dateObj, city, mkey, dayNum) {
    var sv = serverRow(city.name, mkey, dayNum);
    if (sv) return { r: sv, fromServer: true };
    var s = (global.__blxSettings || {});
    var tz = (typeof s.tz === 'number') ? s.tz : (-dateObj.getTimezoneOffset() / 60);
    if (s.dst) tz += 1;
    var method = global.Prayer && Prayer.METHODS ? (Prayer.METHODS[s.method] || Prayer.METHODS.karachi) : null;
    if (!method) return null;
    var t = Prayer.computeLocal(dateObj, city.lat, city.lng, method, tz);
    t = Prayer.applyAdj ? Prayer.applyAdj(t, s) : t;
    var r = {};
    for (var i = 0; i < KEYS.length; i++) {
      var v = t[KEYS[i]];
      if (isFinite(v)) {
        var h = Math.floor((v + 0.004) % 24), mi = Math.round(((v + 0.004) % 1) * 60);
        if (mi === 60) { h = (h + 1) % 24; mi = 0; }
        r[KEYS[i]] = pad(h) + ':' + pad(mi);
      } else r[KEYS[i]] = '--:--';
    }
    return { r: r, fromServer: false };
  }

  function monthName(jy, jm) {
    var names = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    return (names[jm - 1] || '') + ' ' + fa(jy);
  }

  function render() {
    var box = document.getElementById('mtBody');
    var head = document.getElementById('mtTitle');
    if (!box || !head) return;
    var city = currentCity();
    var mkey = state.jy + '-' + pad(state.jm);
    var n = monthLen(state.jy, state.jm);
    var today = new Date();
    var tt = Cal.dateToTriple(today);
    var isCurMonth = tt.jalali.jy === state.jy && tt.jalali.jm === state.jm;

    head.textContent = monthName(state.jy, state.jm);
    var hasServer = !!serverRow(city.name, mkey, 1);
    document.getElementById('mtSrc').textContent = hasServer ? '✓ داده سرور (آفلاین)' : 'محاسبه حنفی (آفلاین)';

    var html = '<table class="mt-table"><thead><tr><th>روز</th><th>هجری</th>';
    for (var i = 0; i < HEAD.length; i++) html += '<th>' + HEAD[i] + '</th>';
    html += '</tr></thead><tbody>';

    for (var d = 1; d <= n; d++) {
      var g = Cal.toGregorian(state.jy, state.jm, d);
      var dateObj = new Date(g.gy, g.gm - 1, g.gd, 12);
      var one = rowFor(dateObj, city, mkey, d);
      if (!one) continue;
      var wd = WD[Cal.dateToTriple(dateObj).weekdaySatFirst];
      var isFri = wd === 'ج';
      var isToday = isCurMonth && tt.jalali.jd === d;
      var h = Cal.gregToHijri ? '' : '';
      var trip = Cal.dateToTriple(dateObj);
      var hd = trip.hijri ? fa(trip.hijri.hd) + '/' + fa(trip.hijri.hm) : '';
      html += '<tr class="' + (isToday ? 'mt-today' : '') + (isFri ? ' mt-friday' : '') + '">' +
        '<td>' + fa(d) + ' <span class="mt-wd">' + wd + '</span></td>' +
        '<td class="mt-hijri">' + hd + '</td>';
      for (var k = 0; k < KEYS.length; k++) {
        html += '<td' + (KEYS[k] === 'fajr' || KEYS[k] === 'maghrib' ? ' class="mt-key"' : '') + '>' + esc(one.r[KEYS[k]]) + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    box.innerHTML = html;
  }

  var BXMonthTable = {
    open: function () {
      var t = Cal.dateToTriple(new Date()).jalali;
      state.jy = t.jy; state.jm = t.jm;
      // پیش‌فرض: ایندکس شهر فعلی تنظیمات
      var list = cityList(), s = global.__blxSettings || {};
      state.cityIdx = -1;
      for (var i = 0; i < list.length; i++) { if (list[i].name === s.locName) { state.cityIdx = i; break; } }
      var sel = document.getElementById('mtCity');
      if (sel) {
        sel.innerHTML = '';
        for (var j = 0; j < list.length; j++) {
          var o = document.createElement('option');
          o.value = j; o.textContent = list[j].name;
          sel.appendChild(o);
        }
        sel.value = state.cityIdx >= 0 ? String(state.cityIdx) : '0';
        if (state.cityIdx < 0) state.cityIdx = 0;
      }
      render();
      var m = document.getElementById('modalMonthTable');
      if (m) m.classList.add('show');
    },
    close: function () {
      var m = document.getElementById('modalMonthTable');
      if (m) m.classList.remove('show');
    },
    shift: function (delta) {
      state.jm += delta;
      if (state.jm > 12) { state.jm = 1; state.jy++; }
      if (state.jm < 1) { state.jm = 12; state.jy--; }
      render();
    },
    setCity: function (idx) { state.cityIdx = idx; render(); },
    render: render
  };

  // هندلرها یک‌بار
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
      var on = function (id, fn) { var e = document.getElementById(id); if (e) e.addEventListener('click', fn); };
      on('calMonthTable', function () { BXMonthTable.open(); });
      on('mtPrev', function () { BXMonthTable.shift(-1); });
      on('mtNext', function () { BXMonthTable.shift(1); });
      on('mtToday', function () { var t = Cal.dateToTriple(new Date()).jalali; state.jy = t.jy; state.jm = t.jm; render(); });
      on('mtClose', function () { BXMonthTable.close(); });
      var bd = document.getElementById('modalMonthTable');
      if (bd) bd.addEventListener('click', function (ev) { if (ev.target === bd) BXMonthTable.close(); });
      var sel = document.getElementById('mtCity');
      if (sel) sel.addEventListener('change', function () { BXMonthTable.setCity(parseInt(sel.value, 10)); });
    });
  }
  global.BXMonthTable = BXMonthTable;
})(typeof window !== 'undefined' ? window : this);

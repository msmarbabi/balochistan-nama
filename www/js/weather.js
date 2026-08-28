/* ============================================================
   Balochistan Nama - Weather module (weather.js)
   Fetches from Open-Meteo (free, no API key) for Varakat
   coordinates (26.84 N, 60.17 E). Uses native bridge
   NativeApp.httpGet() to bypass CORS, falls back to fetch().
   ============================================================ */

(function (global) {
  'use strict';

  // Default location: Varakat village, Lashar county, Sistan & Baluchestan
  var DEFAULT_LAT = 26.84;
  var DEFAULT_LNG = 60.17;
  var DEFAULT_NAME = 'ورکات، لاشار';

  var WEATHER_CODES = {
    0:  { icon: '☀️',  desc: 'آفتابی' },
    1:  { icon: '🌤️', desc: 'بیش‌تر آفتابی' },
    2:  { icon: '⛅', desc: 'نیمه‌ابری' },
    3:  { icon: '☁️', desc: 'ابری' },
    45: { icon: '🌫️', desc: 'مه' },
    48: { icon: '🌫️', desc: 'مه یخ‌زده' },
    51: { icon: '🌦️', desc: 'نور سبک' },
    53: { icon: '🌦️', desc: 'نور متوسط' },
    55: { icon: '🌧️', desc: 'نور شدید' },
    61: { icon: '🌧️', desc: 'باران سبک' },
    63: { icon: '🌧️', desc: 'باران متوسط' },
    65: { icon: '🌧️', desc: 'باران شدید' },
    66: { icon: '🌧️', desc: 'باران یخ‌زده' },
    67: { icon: '🌧️', desc: 'باران یخ‌زده شدید' },
    71: { icon: '🌨️', desc: 'برف سبک' },
    73: { icon: '🌨️', desc: 'برف متوسط' },
    75: { icon: '❄️', desc: 'برف شدید' },
    77: { icon: '🌨️', desc: 'دانه‌های برف' },
    80: { icon: '🌧️', desc: 'رگبار باران' },
    81: { icon: '🌧️', desc: 'رگبار متوسط' },
    82: { icon: '🌧️', desc: 'رگبار شدید' },
    85: { icon: '🌨️', desc: 'رگبار برف سبک' },
    86: { icon: '🌨️', desc: 'رگبار برف شدید' },
    95: { icon: '⛈️', desc: 'رعدوبرق' },
    96: { icon: '⛈️', desc: 'رعدوبرق با تگرگ' },
    99: { icon: '⛈️', desc: 'رعدوبرق شدید با تگرگ' }
  };

  function codeToInfo(code) { return WEATHER_CODES[code] || { icon: '🌡️', desc: 'نامشخص' }; }

  function buildApiUrl(lat, lng) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,uv_index' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max' +
      '&timezone=Asia%2FTehran&forecast_days=7';
  }

  function fetchJson(url, cb) {
    // Try native bridge first (Android WebView with NativeApp.httpGet)
    if (typeof NativeApp !== 'undefined' && NativeApp.httpGet) {
      var reqId = 'w_' + Date.now() + '_' + Math.random();
      window.__pendingFetch = window.__pendingFetch || {};
      window.__pendingFetch[reqId] = cb;
      NativeApp.httpGet(url, reqId);
      return;
    }
    // Fallback: native fetch (works if CORS allows; open-meteo allows CORS)
    try {
      fetch(url).then(function (r) { return r.json(); }).then(function (j) { cb(null, j); }).catch(function (e) { cb(e); });
    } catch (e) { cb(e); }
  }

  // Called by native bridge after httpGet completes
  global.__bridgeHttpCallback = function (reqId, err, body) {
    var cb = (window.__pendingFetch || {})[reqId];
    if (!cb) return;
    delete window.__pendingFetch[reqId];
    if (err) { cb(err); return; }
    try { cb(null, JSON.parse(body)); } catch (e) { cb(e); }
  };

  function load(cb) {
    var settings = (window.App && App.getSettings && App.getSettings()) || {};
    var lat = settings.lat || DEFAULT_LAT;
    var lng = settings.lng || DEFAULT_LNG;
    var url = buildApiUrl(lat, lng);
    fetchJson(url, function (err, data) {
      if (err) { if (cb) cb(err); return; }
      render(data);
      if (cb) cb(null, data);
    });
  }

  function render(data) {
    if (!data || !data.current) return;
    var cur = data.current;
    var info = codeToInfo(cur.weather_code);
    var temp = Math.round(cur.temperature_2m);

    setText('wnIcon', info.icon);
    setText('wnIcon2', info.icon);
    setText('wnTemp', temp + '°');
    setText('wnTemp2', temp + '°');
    setText('wnDesc', info.desc);
    setText('wnDesc2', info.desc);
    var locName = (window.App && App.getSettings && App.getSettings().locName) || DEFAULT_NAME;
    setText('wnLoc', locName);
    setText('wnTitle', 'آب‌وهوای ' + locName);
    setText('wnTitle2', 'آب‌وهوای ' + locName);
    setText('wnHumidity', cur.relative_humidity_2m + '%');
    setText('wnWind', Math.round(cur.wind_speed_10m) + ' km/h');
    setText('wnUv', cur.uv_index != null ? cur.uv_index.toFixed(1) : '--');

    // 4-day mini forecast (on dashboard)
    renderForecast(data.daily, 'forecast', 4);
    // 7-day full forecast (on weather page)
    renderForecast(data.daily, 'forecastFull', 7);
  }

  function renderForecast(daily, elId, count) {
    var el = document.getElementById(elId);
    if (!el || !daily) return;
    el.innerHTML = '';
    var now = new Date();
    for (var i = 0; i < count && i < (daily.time || []).length; i++) {
      var dt = new Date(daily.time[i] + 'T12:00:00');
      var triple = (window.Cal && Cal.dateToTriple(dt)) || null;
      var dayName = triple ? Cal.JALALI_MONTHS[triple.jalali.jm - 1].slice(0, 3) : '---';
      var info = codeToInfo(daily.weather_code[i]);
      var tmax = Math.round(daily.temperature_2m_max[i]);
      var tmin = Math.round(daily.temperature_2m_min[i]);
      var div = document.createElement('div');
      div.className = 'day';
      div.innerHTML =
        '<div class="day__name">' + dayName + '</div>' +
        '<div class="day__icon">' + info.icon + '</div>' +
        '<div class="day__temp">' + tmax + '° / ' + tmin + '°</div>';
      el.appendChild(div);
    }
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  var Weather = {
    load: load,
    render: render,
    DEFAULT_LAT: DEFAULT_LAT,
    DEFAULT_LNG: DEFAULT_LNG,
    DEFAULT_NAME: DEFAULT_NAME
  };
  if (typeof window !== 'undefined') window.Weather = Weather;
})(typeof window !== 'undefined' ? window : this);

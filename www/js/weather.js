/* ============================================================
   Balochistan Nama - Weather module (weather.js)
   Open-Meteo forecast + air quality (dust, PM2.5, PM10, wind).
   Uses native bridge NativeApp.httpGet() to bypass CORS,
   falls back to fetch(). Also caches last result for offline.
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
    30: { icon: '🌫️', desc: 'گرد و خاک خفیف' },
    31: { icon: '🌫️', desc: 'گرد و خاک' },
    32: { icon: '🌪️', desc: 'طوفان گرد و خاک' },
    33: { icon: '🌪️', desc: 'طوفان شدید گرد و خاک' },
    34: { icon: '🌪️', desc: 'طوفان خیلی شدید گرد و خاک' },
    35: { icon: '🌪️', desc: 'طوفان سهمگین گرد و خاک' },
    36: { icon: '🌫️', desc: 'گرد و خاک گسترده' },
    37: { icon: '🌫️', desc: 'گرد و خاک پراکنده' },
    38: { icon: '🌫️', desc: 'گرد و خاک پراکنده شدید' },
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

  var AQI_LEVELS = [
    { min: 0,    max: 50,   label: 'خوب',     color: '#2a9d8f', emoji: '😊' },
    { min: 51,   max: 100,  label: 'متوسط',   color: '#e9c46a', emoji: '🙂' },
    { min: 101,  max: 150,  label: 'ناسالم برای گروه‌های حساس', color: '#f4a261', emoji: '😷' },
    { min: 151,  max: 200,  label: 'ناسالم',  color: '#e76f51', emoji: '🤧' },
    { min: 201,  max: 300,  label: 'بسیار ناسالم', color: '#c1121f', emoji: '⚠️' },
    { min: 301,  max: 9999, label: 'خطرناک',  color: '#7b2cbf', emoji: '☠️' }
  ];

  function codeToInfo(code) { return WEATHER_CODES[code] || { icon: '🌡️', desc: 'نامشخص' }; }

  function aqiInfo(v) {
    if (v == null) return null;
    for (var i = 0; i < AQI_LEVELS.length; i++) {
      if (v >= AQI_LEVELS[i].min && v <= AQI_LEVELS[i].max) return AQI_LEVELS[i];
    }
    return AQI_LEVELS[AQI_LEVELS.length - 1];
  }

  function buildApiUrl(lat, lng) {
    return 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng +
      '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_gusts_10m,uv_index' +
      '&hourly=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,precipitation_probability' +
      '&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max,precipitation_probability_max' +
      '&timezone=Asia%2FTehran&forecast_days=7';
  }

  function buildAirUrl(lat, lng) {
    return 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + lat + '&longitude=' + lng +
      '&current=pm2_5,pm10,dust,us_aqi' +
      '&timezone=Asia%2FTehran';
  }

  function fetchJson(url, cb) {
    // Use native fetch directly (Open-Meteo allows CORS). The native
    // bridge httpGet stub is a no-op, so we must NOT wait on it.
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
    var airUrl = buildAirUrl(lat, lng);
    var done = 0, weatherData = null, airData = null;
    function finish() {
      if (done < 2) return;
      if (weatherData) {
        render(weatherData, airData);
      } else {
        // Offline fallback: show cached weather if network failed
        var usedCache = loadCached();
        if (cb) cb(new Error('offline'), usedCache);
        return;
      }
      if (cb) cb(null, weatherData);
    }
    fetchJson(url, function (err, data) {
      weatherData = err ? null : data;
      done++; finish();
    });
    fetchJson(airUrl, function (err, data) {
      airData = err ? null : data;
      done++; finish();
    });
  }

  function render(data, airData) {
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
    setText('wnLoc2', locName);
    setText('wnTitle', 'آب‌وهوای ' + locName);
    setText('wnTitle2', 'آب‌وهوای ' + locName);
    // Keep location card in sync
    if (typeof window.updateLocationCard === 'function') window.updateLocationCard();

    // Basic metrics
    setText('wnHumidity', cur.relative_humidity_2m + '%');
    setText('wnWind', Math.round(cur.wind_speed_10m) + ' km/h');
    setText('wnUv', cur.uv_index != null ? cur.uv_index.toFixed(1) : '--');

    // Wind gust (new)
    var gustEl = document.getElementById('wnGust');
    if (gustEl) gustEl.textContent = (cur.wind_gusts_10m != null ? Math.round(cur.wind_gusts_10m) : '--') + ' km/h';

    // Air quality (new)
    var aq = (airData && airData.current) ? airData.current : null;
    if (aq) {
      var pm25 = aq.pm2_5, pm10 = aq.pm10, dust = aq.dust;
      var aqi = aq.us_aqi;
      var setV = function (id, v) { var el = document.getElementById(id); if (el) el.textContent = (v != null ? Math.round(v) : '--'); };
      setV('aqPm25', pm25); setV('aqPm10', pm10); setV('aqDust', dust);
      var aqiLvl = aqiInfo(aqi != null ? aqi : (pm25 != null ? pm25 * 2 : null));
      var elBadge = document.getElementById('aqBadge');
      if (elBadge && aqiLvl) {
        elBadge.textContent = aqiLvl.emoji + ' ' + aqiLvl.label;
        elBadge.style.background = aqiLvl.color;
        elBadge.style.color = '#fff';
      }
      var dustBadge = document.getElementById('dustAlert');
      if (dustBadge) {
        var isDusty = (dust != null && dust > 60) || (pm10 != null && pm10 > 150) || (cur.weather_code >= 30 && cur.weather_code <= 38);
        if (isDusty) {
          dustBadge.style.display = 'block';
        } else {
          dustBadge.style.display = 'none';
        }
      }
    }

    // 4-day mini forecast (on dashboard)
    renderForecast(data.daily, 'forecast', 4);
    // 7-day full forecast (on weather page)
    renderForecast(data.daily, 'forecastFull', 7);
    // Hourly forecast (weather page)
    renderHourly(data.hourly);

    // Cache for offline mode
    try {
      var cache = { data: data, air: airData, ts: Date.now() };
      localStorage.setItem('blx_weather_cache', JSON.stringify(cache));
    } catch (e) {}
  }

  // Load cached weather (offline fallback)
  function loadCached() {
    try {
      var raw = localStorage.getItem('blx_weather_cache');
      if (!raw) return false;
      var cache = JSON.parse(raw);
      if (cache && cache.data && cache.data.current) {
        render(cache.data, cache.air || null);
        return true;
      }
    } catch (e) {}
    return false;
  }

  function renderForecast(daily, elId, count) {
    var el = document.getElementById(elId);
    if (!el || !daily) return;
    el.innerHTML = '';
    var now = new Date();
    for (var i = 0; i < count && i < (daily.time || []).length; i++) {
      var dt = new Date(daily.time[i] + 'T12:00:00');
      var triple = (window.Cal && Cal.dateToTriple) ? Cal.dateToTriple(dt) : null;
      // Show weekday name (شنبه ... جمعه)
      var dayName = triple && Cal.WEEKDAYS_FA_SAT_FIRST ? Cal.WEEKDAYS_FA_SAT_FIRST[triple.weekdaySatFirst] : '---';
      var info = codeToInfo(daily.weather_code[i]);
      var tmax = Math.round(daily.temperature_2m_max[i]);
      var tmin = Math.round(daily.temperature_2m_min[i]);
      var gust = (daily.wind_gusts_10m_max && daily.wind_gusts_10m_max[i] != null) ? Math.round(daily.wind_gusts_10m_max[i]) : null;
      var div = document.createElement('div');
      div.className = 'day';
      div.innerHTML =
        '<div class="day__name">' + dayName + '</div>' +
        '<div class="day__icon">' + info.icon + '</div>' +
        '<div class="day__temp">' + tmax + '° / ' + tmin + '°</div>' +
        (gust != null ? '<div class="day__gust">🌬️ ' + gust + '</div>' : '');
      el.appendChild(div);
    }
  }

  function renderHourly(hourly) {
    var el = document.getElementById('hourlyForecast');
    if (!el || !hourly || !hourly.time) return;
    el.innerHTML = '';
    var now = Date.now();
    var shown = 0;
    for (var i = 0; i < (hourly.time || []).length && shown < 12; i++) {
      var t = new Date(hourly.time[i] + ':00').getTime();
      if (t < now - 3600000) continue;
      var hh = new Date(t).getHours();
      var info = codeToInfo(hourly.weather_code[i]);
      var temp = Math.round(hourly.temperature_2m[i]);
      var div = document.createElement('div');
      div.className = 'hour';
      div.innerHTML =
        '<div class="hour__time">' + (hh < 10 ? '0' + hh : hh) + '</div>' +
        '<div class="hour__icon">' + info.icon + '</div>' +
        '<div class="hour__temp">' + temp + '°</div>';
      el.appendChild(div);
      shown++;
    }
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  var Weather = {
    load: load,
    loadCached: loadCached,
    render: render,
    DEFAULT_LAT: DEFAULT_LAT,
    DEFAULT_LNG: DEFAULT_LNG,
    DEFAULT_NAME: DEFAULT_NAME
  };
  if (typeof window !== 'undefined') window.Weather = Weather;
})(typeof window !== 'undefined' ? window : this);

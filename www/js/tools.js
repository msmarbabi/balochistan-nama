/* tools.js — v2.0 — تب «ابزار» (Compass 360 Pro style)
   قطب‌نمای 3D + خلبان‌نما + قبله + سرعت + ارتفاع + فاصله + مساحت + تراز + چراغ + ساعت + تایمر */
(function (global) {
  'use strict';
  var el = function (id) { return document.getElementById(id); };
  var norm360 = function (a) { a = a % 360; if (a < 0) a += 360; return a; };

  // City list for Sistan & Baluchestan + major Iran cities
  var CITIES = [
    { name: 'ورکات، لاشار', lat: 26.84, lng: 60.17 },
    { name: 'چابهار', lat: 25.29, lng: 60.64 },
    { name: 'ایرانشهر', lat: 27.20, lng: 60.70 },
    { name: 'سراوان', lat: 27.38, lng: 62.33 },
    { name: 'خاش', lat: 28.22, lng: 61.20 },
    { name: 'زاهدان', lat: 29.50, lng: 60.86 },
    { name: 'زابل', lat: 31.03, lng: 61.49 },
    { name: 'کنارک', lat: 25.40, lng: 60.37 },
    { name: 'نیک‌شهر', lat: 26.21, lng: 60.22 },
    { name: 'بمپور', lat: 27.17, lng: 60.47 },
    { name: 'دلگان', lat: 27.57, lng: 59.70 },
    { name: 'راسک', lat: 26.00, lng: 61.50 },
    { name: 'سرباز', lat: 26.50, lng: 62.10 },
    { name: 'میرجاوه', lat: 28.95, lng: 61.50 },
    { name: 'تهران', lat: 35.69, lng: 51.39 },
    { name: 'مشهد', lat: 36.29, lng: 59.61 },
    { name: 'اصفهان', lat: 32.65, lng: 51.67 },
    { name: 'شیراز', lat: 29.59, lng: 52.58 },
    { name: 'کرمان', lat: 30.28, lng: 57.07 },
    { name: 'بندرعباس', lat: 27.18, lng: 56.28 }
  ];

  /* ===== سواپ زیر-تب‌ها ===== */
  function switchTool(name) {
    var tabs = document.querySelectorAll('.tools-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tool') === name);
    }
    var panels = document.querySelectorAll('.tool-panel');
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.toggle('active', panels[j].id === 'toolPanel-' + name);
    }
    // فقط ابزارِ فعال، سنسور/GPS دارد
    if (name === 'compass' || name === 'hud' || name === 'level') {
      startSensors();
    } else {
      stopSensors();
    }
    if (name === 'speed') startGps(); else stopGps();
    if (name === 'alt' || name === 'dist' || name === 'area' || name === 'gpsdeep') startGps(); else if (name !== 'speed') stopGps();
    // care sub-tab — render the smart-care services
    if (name === 'care' && global.BXCare && BXCare.render) BXCare.render();
  }

  /* ===== قطب‌نمای 3D (Compass 360 Pro style) ===== */
  var heading = 0, pitch = 0, roll = 0;
  var qiblaDeg = 0;
  var compassCanvas = null, cmp3dCtx = null;

  function initCompass3d() {
    compassCanvas = el('cmp3dCanvas');
    if (!compassCanvas) return;
    cmp3dCtx = compassCanvas.getContext('2d');
    window.addEventListener('resize', drawCompass3d);
    drawCompass3d();
  }

  function drawCompass3d() {
    if (!cmp3dCtx || !compassCanvas) return;
    var c = cmp3dCtx, W = compassCanvas.width, H = compassCanvas.height;
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 20;

    // Background
    c.clearRect(0, 0, W, H);
    var bg = c.createRadialGradient(cx, cy, 0, cx, cy, R + 10);
    bg.addColorStop(0, '#1a2a3a');
    bg.addColorStop(1, '#0a1520');
    c.fillStyle = bg;
    c.beginPath(); c.arc(cx, cy, R + 10, 0, Math.PI * 2); c.fill();

    // Outer ring
    c.strokeStyle = 'rgba(255,255,255,0.15)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();

    // Degree ticks (every 10°, cardinal labels)
    c.save();
    c.translate(cx, cy);
    c.rotate(-heading * Math.PI / 180);
    for (var d = 0; d < 360; d += 10) {
      var a = d * Math.PI / 180;
      var isCard = d % 90 === 0;
      var tickLen = isCard ? 16 : 8;
      c.beginPath();
      c.moveTo(Math.sin(a) * (R - tickLen), -Math.cos(a) * (R - tickLen));
      c.lineTo(Math.sin(a) * R, -Math.cos(a) * R);
      c.strokeStyle = isCard ? '#4fd8ff' : 'rgba(255,255,255,0.3)';
      c.lineWidth = isCard ? 2 : 1;
      c.stroke();
      if (isCard) {
        c.fillStyle = '#fff';
        c.font = 'bold 16px sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        var labels = ['N', 'E', 'S', 'W'];
        c.save();
        c.translate(0, -(R - 32));
        c.rotate(-heading * Math.PI / 180);
        c.fillText(labels[d / 90], 0, 0);
        c.restore();
      }
    }
    c.restore();

    // Qibla marker
    var qAngle = (qiblaDeg - heading) * Math.PI / 180;
    c.save();
    c.translate(cx, cy);
    c.rotate(qAngle);
    c.fillStyle = '#f87171';
    c.beginPath();
    c.moveTo(0, -(R - 40));
    c.lineTo(-8, -(R - 24));
    c.lineTo(8, -(R - 24));
    c.closePath(); c.fill();
    c.font = '12px sans-serif';
    c.textAlign = 'center';
    c.fillText('🕋', 0, -(R - 12));
    c.restore();

    // Needle
    c.save();
    c.translate(cx, cy);
    c.rotate(-pitch * Math.PI / 180 * 0.3); // slight tilt effect
    c.fillStyle = '#4fd8ff';
    c.beginPath();
    c.moveTo(0, -(R - 50));
    c.lineTo(-5, -(R - 30));
    c.lineTo(5, -(R - 30));
    c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath();
    c.moveTo(0, R - 50);
    c.lineTo(-5, R - 30);
    c.lineTo(5, R - 30);
    c.closePath(); c.fill();
    c.restore();

    // Center readout
    el('cmp3dHeading').textContent = Math.round(heading) + '°';
    el('cmp3dTilt').textContent = 'شیب: ' + Math.round(pitch) + '° / ' + Math.round(roll) + '°';

    // True north + magnetic deviation
    var magDev = (qiblaDeg - 0) % 360; // simplified: qibla from north
    el('cmp3dTrue').textContent = 'شمال واقعی: ' + Math.round(norm360(heading)) + '°';
    el('cmp3dMag').textContent = 'انحراف مغناطیسی: ' + Math.abs(Math.round(magDev - 90)) + '°';
  }

  /* ===== خلبان‌نما (HUD) ===== */
  function updateHud() {
    var hudEl = el('compassHud');
    if (!hudEl) return;
    el('hudHeading').textContent = Math.round(heading) + '°';
    el('hudBank').textContent = 'بانک: ' + Math.round(roll) + '°';
    el('hudPitch').textContent = 'پچ: ' + Math.round(pitch) + '°';
    el('hudPitchMark').textContent = Math.round(pitch) + '°';
    if (el('hudQibla')) el('hudQibla').textContent = '🕋 ' + Math.round(qiblaDeg) + '°';
    if (el('hudAlt')) { var altEl = el('altValue'); el('hudAlt').textContent = 'ارتفاع: ' + (altEl && altEl.textContent !== '--' ? altEl.textContent : '--'); }
  }

  /* ===== قبله GPS ===== */
  function updateQiblaInfo(lat, lng) {
    // Simplified qibla bearing (accurate enough for display)
    var mecca = { lat: 21.4225, lng: 39.8262 };
    var rad = Math.PI / 180;
    var dLat = (mecca.lat - lat) * rad;
    var dLng = (mecca.lng - lng) * rad;
    var y = Math.sin(dLng) * Math.cos(mecca.lat * rad);
    var x = Math.cos(lat * rad) * Math.sin(mecca.lat * rad) -
            Math.sin(lat * rad) * Math.cos(mecca.lat * rad) * Math.cos(dLng);
    qiblaDeg = norm360(Math.atan2(y, x) / rad);
    var dist = Math.round(6371 * Math.acos(
      Math.sin(lat * rad) * Math.sin(mecca.lat * rad) +
      Math.cos(lat * rad) * Math.cos(mecca.lat * rad) * Math.cos(dLng)
    ));
    el('qiblaInfo').innerHTML =
      '<div style="font-size:36px; font-weight:800; margin:8px 0;">' + Math.round(qiblaDeg) + '°</div>' +
      '<div class="text-small">سمت قبله از شمال</div>' +
      '<div style="margin-top:8px; font-weight:600;">فاصله تا کعبه: ' + dist.toLocaleString('fa') + ' کیلومتر</div>';
  }

  /* ===== سرعت‌سنج GPS ===== */
  var gpsWatch = null, gpsActive = false;
  var speedLimit = 0;
  var tripStart = null, tripDistance = 0, lastGpsPos = null;

  function startGps() {
    if (gpsActive) return;
    gpsActive = true;
    if (navigator.geolocation) {
      gpsWatch = navigator.geolocation.watchPosition(onGps, onGpsError, {
        enableHighAccuracy: true, maximumAge: 1000, timeout: 5000
      });
    }
  }
  function stopGps() {
    gpsActive = false;
    if (gpsWatch) { navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; }
  }
  function onGps(pos) {
    var lat = pos.coords.latitude, lng = pos.coords.longitude;
    var alt = Math.round(pos.coords.altitude || 0);
    var speed = Math.round((pos.coords.speed || 0) * 3.6 * 10) / 10; // m/s → km/h
    var speedMph = Math.round((pos.coords.speed || 0) * 2.237 * 10) / 10;

    // ارتفاع‌سنج
    var altVal = el('altValue'); if (altVal) altVal.textContent = alt;
    var altInfo = el('altInfo'); if (altInfo) altInfo.textContent = 'دقت: ±' + Math.round(pos.coords.accuracy || 0) + ' متر';

    // سرعت‌سنج
    var spVal = el('speedValue'); if (spVal) spVal.textContent = speed;
    var spMps = el('speedMps'); if (spMps) spMps.textContent = Math.round(speedMph) + ' mph';

    // Trip distance
    if (tripStart && lastGpsPos) {
      var d = haversine(lastGpsPos, { lat: lat, lng: lng });
      tripDistance += d;
      var tripInfo = el('speedTripInfo');
      if (tripInfo) tripInfo.textContent = '📍 مسافت سفر: ' + (tripDistance / 1000).toFixed(1) + ' کیلومتر';
    }
    lastGpsPos = { lat: lat, lng: lng };

    // Qibla
    updateQiblaInfo(lat, lng);

    // v2 B12: GPS عمیق — ۷ زیر-نویس
    var gpsdSig = el('gpsdSignal'); if (gpsdSig) gpsdSig.textContent = Math.round(100 - (pos.coords.accuracy || 0)) + '٪ قوی';
    var gpsdAcc = el('gpsdAccuracy'); if (gpsdAcc) gpsdAcc.textContent = '±' + Math.round(pos.coords.accuracy || 0) + ' متر';
    var gpsdBrng = el('gpsdBearing'); if (gpsdBrng) gpsdBrng.textContent = (pos.coords.heading != null ? Math.round(pos.coords.heading) : '—') + '°';
    var gpsdAlt = el('gpsdAltitude'); if (gpsdAlt) gpsdAlt.textContent = (pos.coords.altitude || 0).toFixed(1) + ' متر';
    var gpsdSpd = el('gpsdSpeed'); if (gpsdSpd) gpsdSpd.textContent = speed + ' km/h';
    var gpsdHd = el('gpsdHdop'); if (gpsdHd) gpsdHd.textContent = 'دقت خوب: ' + (pos.coords.accuracy <= 10 ? 'عالی ✅' : pos.coords.accuracy <= 30 ? 'خوب 👍' : 'متوسط ⚠️');
    var gpsdLast = el('gpsdLast'); if (gpsdLast) gpsdLast.textContent = new Date().toLocaleTimeString('fa-IR');
  }
  function onGpsError(err) {
    var altInfo = el('altInfo'); if (altInfo) altInfo.textContent = 'خطای GPS: ' + err.message;
    var spVal = el('speedValue'); if (spVal) spVal.textContent = '0';
  }
  function haversine(a, b) {
    var rad = Math.PI / 180, R = 6371000;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* ===== فاصله تا نقاط ذخیره‌شده ===== */
  function initDist() {
    var pts = JSON.parse(localStorage.getItem('blx_geopoints') || '[]');
    var box = el('distPoints');
    if (!box) return;
    if (!pts.length) { box.innerHTML = '<div class="text-small text-muted" style="text-align:center;">هنوز نقطه‌ای ذخیره نشده</div>'; return; }
    box.innerHTML = pts.map(function (p, i) {
      return '<div class="dist-point"><span>📌 ' + (p.name || 'نقطه ' + (i + 1)) + '</span>' +
             '<button data-del="' + i + '">✕</button></div>';
    }).join('');
    box.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        pts.splice(parseInt(b.dataset.del), 1);
        localStorage.setItem('blx_geopoints', JSON.stringify(pts));
        initDist();
      });
    });
  }
  function saveGeoPoint() {
    if (!lastGpsPos) { if (App && App.toast) App.toast('📍 ابتدا GPS را فعال کنید'); return; }
    var pts = JSON.parse(localStorage.getItem('blx_geopoints') || '[]');
    pts.push({ name: 'نقطه ' + (pts.length + 1), lat: lastGpsPos.lat, lng: lastGpsPos.lng, ts: Date.now() });
    localStorage.setItem('blx_geopoints', JSON.stringify(pts));
    initDist();
    if (App && App.toast) App.toast('💾 نقطه ذخیره شد');
  }

  /* ===== مساحت GPS ===== */
  var areaPts = JSON.parse(localStorage.getItem('blx_areapts') || '[]');
  function initArea() {
    var box = el('areaPoints');
    if (!box) return;
    if (!areaPts.length) { box.innerHTML = ''; el('areaResult').textContent = 'حداقل ۳ نقطه نیاز است'; return; }
    box.innerHTML = areaPts.map(function (p, i) {
      return '<div class="area-point"><span>' + (i + 1) + '. (' + p.lat.toFixed(4) + ', ' + p.lng.toFixed(4) + ')</span>' +
             '<button data-adel="' + i + '">✕</button></div>';
    }).join('');
    box.querySelectorAll('[data-adel]').forEach(function (b) {
      b.addEventListener('click', function () {
        areaPts.splice(parseInt(b.dataset.adel), 1);
        localStorage.setItem('blx_areapts', JSON.stringify(areaPts));
        initArea();
      });
    });
    if (areaPts.length >= 3) calcArea();
  }
  function calcArea() {
    if (areaPts.length < 3) return;
    var poly = areaPts.map(function (p) { return [p.lng, p.lat]; });
    var areaM2 = shoelace(poly);
    var result = el('areaResult');
    if (!result) return;
    var hect = (areaM2 / 10000).toFixed(2);
    var acre = (areaM2 / 4046.86).toFixed(2);
    var km2 = (areaM2 / 1e6).toFixed(4);
    result.innerHTML = 'مساحت: <b>' + hect + ' هکتار</b> | ' + acre + ' آکر | ' + km2 + ' km²';
    // GPX export
    var gpx = '<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Balojestan Nama">\n  <wpt lat="' +
      areaPts[0].lat + '" lon="' + areaPts[0].lng + '"></wpt>\n</gpx>';
    var blob = new Blob([gpx], { type: 'application/xml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'balochistan_area.gpx'; a.click();
    URL.revokeObjectURL(url);
  }
  function shoelace(pts) {
    var n = pts.length, sum = 0;
    for (var i = 0; i < n; i++) {
      var j = (i + 1) % n;
      sum += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
    }
    return Math.abs(sum / 2);
  }

  /* ===== تراز حبابی ===== */
  function updateLevel() {
    var bubble = el('levelBubble');
    if (!bubble) return;
    var pitchPct = Math.min(50, Math.abs(pitch) * 2);
    var rollPct = Math.min(50, Math.abs(roll) * 2);
    bubble.style.top = (50 + pitchPct * (pitch > 0 ? 1 : -1)) + '%';
    bubble.style.left = (50 + rollPct * (roll > 0 ? 1 : -1)) + '%';
    el('levelPitch').textContent = 'Pitch: ' + pitch.toFixed(1) + '°';
    el('levelRoll').textContent = 'Roll: ' + roll.toFixed(1) + '°';
  }

  /* ===== چراغ‌قوه ===== */
  var flashOn = false, flashInterval = null;
  function toggleFlash() {
    flashOn = !flashOn;
    var btn = el('flashToggle');
    var status = el('flashStatus');
    if (flashOn) {
      btn.textContent = '🔦 خاموش';
      status.textContent = 'روشن';
      // Try to use torch (Android native)
      if (NativeApp && NativeApp.toggleTorch) {
        try { NativeApp.toggleTorch(true); } catch (e) {}
      }
    } else {
      btn.textContent = '🔦 روشن';
      status.textContent = 'خاموش';
      if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
      if (NativeApp && NativeApp.toggleTorch) {
        try { NativeApp.toggleTorch(false); } catch (e) {}
      }
    }
  }
  function flashSOS() {
    if (flashInterval) return;
    var codes = { S: 'short short short', O: 'long long long' };
    var seq = 'short short short long long long short short short';
    var i = 0;
    var dur = 150;
    flashInterval = setInterval(function () {
      var on = seq[i] === 's';
      if (NativeApp && NativeApp.toggleTorch) {
        try { NativeApp.toggleTorch(on); } catch (e) {}
      }
      i = (i + 1) % seq.length;
      if (i === 0) {
        // SOS pattern: 3 short, 3 long, 3 short = 9 steps
        if (seq.indexOf('l', 0) === -1) { /* noop */ }
      }
    }, dur);
  }
  function flashStrobe() {
    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; return; }
    flashInterval = setInterval(function () {
      flashOn = !flashOn;
      if (NativeApp && NativeApp.toggleTorch) {
        try { NativeApp.toggleTorch(flashOn); } catch (e) {}
      }
      el('flashStatus').textContent = flashOn ? 'Strobe' : 'خاموش';
    }, 500);
  }

  /* ===== ساعت جهانی ===== */
  var worldClocks = JSON.parse(localStorage.getItem('blx_worldclocks') || '[{"tz":"Asia/Tehran","name":"تهران"},{"tz":"Asia/Dubai","name":"دبی"},{"tz":"Europe/London","name":"لندن"},{"tz":"UTC","name":"UTC"}]');
  var clockInterval = null;
  function initWorldClocks() {
    var box = el('worldClocks');
    if (!box) return;
    function render() {
      var now = new Date();
      box.innerHTML = worldClocks.map(function (c) {
        var opts = { timeZone: c.tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
        var time;
        try { time = now.toLocaleTimeString('en', opts); } catch (e) { time = '--:--'; }
        return '<div class="world-clock-item"><span>' + c.name + ' (' + c.tz + ')</span><span class="time">' + time + '</span></div>';
      }).join('');
    }
    render();
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(render, 1000);
  }

  /* ===== تایمر ===== */
  var timerSecs = 0, timerInterval = null, timerRunning = false;
  function updateTimerDisplay() {
    var disp = el('timerDisplay');
    if (!disp) return;
    var m = Math.floor(timerSecs / 60), s = timerSecs % 60;
    disp.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function startTimer() {
    if (timerRunning) { stopTimer(); return; }
    timerRunning = true;
    el('timerStart').textContent = '⏸️ توقف';
    timerInterval = setInterval(function () {
      timerSecs++;
      updateTimerDisplay();
      if (timerSecs > 0 && timerSecs % 60 === 0) {
        if (Notification) { /* optional: notify */ }
      }
    }, 1000);
  }
  function stopTimer() {
    timerRunning = false;
    el('timerStart').textContent = '▶️ شروع';
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  /* ===== سنسورها ===== */
  var sensorsRunning = false;
  function startSensors() {
    if (sensorsRunning) return;
    sensorsRunning = true;
    if (NativeApp && NativeApp.startSensors) {
      try { NativeApp.startSensors(); } catch (e) {}
    }
    sensorLoop();
  }
  function stopSensors() {
    sensorsRunning = false;
    if (NativeApp && NativeApp.stopSensors) {
      try { NativeApp.stopSensors(); } catch (e) {}
    }
  }
  var sensorRaf = null;
  function sensorLoop() {
    sensorRaf = requestAnimationFrame(sensorLoop);
    drawCompass3d();
    updateHud();
    updateLevel();
  }
  // Native callback
  global.__onSensorUpdate = function (az, p, rl) {
    heading = az || 0;
    pitch = p || 0;
    roll = rl || 0;
  };
  // Fallback: deviceorientation
  global.addEventListener('deviceorientation', function (e) {
    if (e.alpha === null) return;
    heading = norm360(360 - e.alpha);
    pitch = e.beta || 0;
    roll = e.gamma || 0;
  }, true);
  global.addEventListener('deviceorientationabsolute', function (e) {
    if (e.alpha === null) return;
    heading = norm360(360 - e.alpha);
    pitch = e.beta || 0;
    roll = e.gamma || 0;
  }, true);

  /* ===== init ===== */
  function init() {
    initCompass3d();
    initDist();
    initArea();
    initWorldClocks();
    updateTimerDisplay();

    // Tool tabs
    document.querySelectorAll('.tools-tab').forEach(function (t) {
      t.addEventListener('click', function () { switchTool(t.getAttribute('data-tool')); });
    });

    // Compass calibrate
    var calib = el('cmpCalibBtn');
    if (calib) calib.addEventListener('click', function () {
      if (Compass && Compass.resetOffset) Compass.resetOffset();
      if (App && App.toast) App.toast('🔄 کالیبره شد — گوشی را ۸ شکل بچرخانید');
    });

    // v2 B12: GPS عمیق — دکمه‌های start/stop
    var gpsdStart = el('gpsdStart');
    if (gpsdStart) gpsdStart.addEventListener('click', function () {
      startGps();
      el('gpsdStatus').textContent = '🟢 فعال — در انتظار داده…';
    });
    var gpsdStop = el('gpsdStop');
    if (gpsdStop) gpsdStop.addEventListener('click', function () {
      stopGps();
      el('gpsdStatus').textContent = '⏹️ متوقف شد';
    });

    // Speed limit
    var limitBtn = el('speedLimitBtn');
    if (limitBtn) limitBtn.addEventListener('click', function () {
      speedLimit = speedLimit === 0 ? 60 : speedLimit === 60 ? 0 : 60;
      limitBtn.textContent = speedLimit ? '🚫 محدودیت: ' + speedLimit + ' km/h' : '🚫 محدودیت: غیرفعال';
    });

    // Trip
    var tripBtn = el('speedTripBtn');
    if (tripBtn) tripBtn.addEventListener('click', function () {
      if (tripStart) { tripStart = null; tripDistance = 0; tripBtn.textContent = '📍 شروع سفر'; }
      else { tripStart = Date.now(); tripDistance = 0; tripBtn.textContent = '⏹️ پایان سفر'; }
    });

    // Save point
    var saveBtn = el('distSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveGeoPoint);

    // Area
    var areaAdd = el('areaAddBtn');
    if (areaAdd) areaAdd.addEventListener('click', function () {
      if (!lastGpsPos) { if (App && App.toast) App.toast('📍 GPS غیرفعال است'); return; }
      areaPts.push({ lat: lastGpsPos.lat, lng: lastGpsPos.lng });
      localStorage.setItem('blx_areapts', JSON.stringify(areaPts));
      initArea();
    });
    var areaCalc = el('areaCalcBtn');
    if (areaCalc) areaCalc.addEventListener('click', calcArea);

    // Flash
    var flashBtn = el('flashToggle');
    if (flashBtn) flashBtn.addEventListener('click', toggleFlash);
    var sosBtn = el('flashSOS');
    if (sosBtn) sosBtn.addEventListener('click', function () {
      flashSOS();
      setTimeout(function () { if (flashInterval) { clearInterval(flashInterval); flashInterval = null; } }, 6000);
      if (App && App.toast) App.toast('🆘 SOS فعال شد (۶ ثانیه)');
    });
    var strobeBtn = el('flashStrobe');
    if (strobeBtn) strobeBtn.addEventListener('click', function () {
      flashStrobe();
      if (App && App.toast) App.toast('⚡ Strobe ' + (flashInterval ? 'خاموش شد' : 'فعال شد'));
    });

    // Clock
    var clockAdd = el('clockAddBtn');
    if (clockAdd) clockAdd.addEventListener('click', function () {
      var tz = prompt('🌍 منطقه زمانی (IANA):', 'Asia/Tehran');
      if (tz && tz.trim()) {
        worldClocks.push({ tz: tz.trim(), name: tz.trim().split('/').pop() || tz });
        localStorage.setItem('blx_worldclocks', JSON.stringify(worldClocks));
        initWorldClocks();
      }
    });

    // Timer
    var tStart = el('timerStart');
    if (tStart) tStart.addEventListener('click', startTimer);
    var tReset = el('timerReset');
    if (tReset) tReset.addEventListener('click', function () {
      stopTimer(); timerSecs = 0; updateTimerDisplay();
    });
    document.querySelectorAll('#toolPanel-timer [data-min]').forEach(function (b) {
      b.addEventListener('click', function () {
        timerSecs = parseInt(b.dataset.min) * 60;
        updateTimerDisplay();
        startTimer();
      });
    });

    // Cleanup on route leave
    global.addEventListener('routechange', function (e) {
      if (e.newRoute !== 'tools') {
        stopSensors(); stopGps();
        if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
        stopTimer();
      }
    });
  }

  /* ===== route enter/leave ===== */
  function onRouteEnter(route) {
    if (route === 'tools') {
      startSensors(); startGps();
      initWorldClocks();
      // Set qibla
      var settings = global.__blx_settings || {};
      if (settings.lat && settings.lng) updateQiblaInfo(settings.lat, settings.lng);
    }
  }

  global.Tools = {
    init: init,
    switchTool: switchTool,
    onRouteEnter: onRouteEnter,
    heading: function () { return heading; },
    setQibla: function (deg) { qiblaDeg = norm360(deg); },
    CITIES: CITIES
  };
  global.addEventListener('DOMContentLoaded', function () { if (document.getElementById('view-tools')) init(); });

})(window);

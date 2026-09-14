/* ============================================================
   Balochistan Nama - Compass module (compass.js)
   Reads device orientation (via DeviceOrientationEvent or native
   sensor bridge NativeApp.getRotation()) and animates a 3D compass
   with cyberpunk variant, plus a pilot HUD with bank/pitch.
   ============================================================ */

(function (global) {
  'use strict';

  var state = {
    azimuth: 0,         // degrees from north
    pitch: 0,           // degrees (positive = phone tilted up)
    roll: 0,            // degrees (positive = tilt right)
    qiblaBearing: 0,    // degrees from north to Kaaba
    lastAzUpdate: 0,
    active: false
  };

  function start() {
    state.active = true;
    buildPitchLadder();
    buildHeadingTape();
    // v1.14: قبله همیشه از مختصات فعلی تنظیمات — با هر تغییر شهر خودکار به‌روز می‌شود
    try {
      var st = JSON.parse(localStorage.getItem('blx_nama_settings') || '{}');
      if (st.lat && st.lng && typeof Prayer !== 'undefined' && Prayer.qiblaBearing) {
        setQibla(Prayer.qiblaBearing(st.lat, st.lng));
      }
    } catch (e) {}
    updateHud();
    // Try native sensor bridge first (Android sensors)
    if (typeof NativeApp !== 'undefined' && NativeApp.startSensors) {
      NativeApp.startSensors();
      return;
    }
    // Fallback: web DeviceOrientationEvent (iOS/Android Chrome with permission)
    if (typeof DeviceOrientationEvent !== 'undefined') {
      // iOS 13+ requires permission
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().then(function (state) {
          if (state === 'granted') {
            window.addEventListener('deviceorientation', onDeviceOrientation, true);
            window.addEventListener('compassneedscalibration', function () {
              if (window.App) App.toast('کالیبره کردن قطب‌نما لازم است');
            });
          }
        }).catch(function () {});
      } else {
        // Android Chrome - directly listen (note: alpha = compass heading when provided)
        window.addEventListener('deviceorientationabsolute', onDeviceOrientationAbsolute, true);
        window.addEventListener('deviceorientation', onDeviceOrientation, true);
      }
    }
    // Fallback auto-rotate (so compass always visually animates)
    if (!state.nativeSensors) autoRotateDemo();
  }

  function stop() {
    state.active = false;
    if (typeof NativeApp !== 'undefined' && NativeApp.stopSensors) NativeApp.stopSensors();
    window.removeEventListener('deviceorientation', onDeviceOrientation, true);
    window.removeEventListener('deviceorientationabsolute', onDeviceOrientationAbsolute, true);
  }

  function onDeviceOrientation(ev) {
    // alpha = compass heading (rotation around Z axis)
    // 0 = device pointing north
    if (ev.alpha != null) {
      var az = 360 - ev.alpha;
      // On iOS, webkitCompassHeading is already correct
      if (typeof ev.webkitCompassHeading === 'number') {
        az = ev.webkitCompassHeading;
      }
      setAzimuth(az);
    }
    if (ev.beta != null) state.pitch = ev.beta;
    if (ev.gamma != null) state.roll = ev.gamma;
    updateHud();
  }
  function onDeviceOrientationAbsolute(ev) {
    if (ev.alpha != null) {
      var az = 360 - ev.alpha;
      setAzimuth(az);
    }
    if (ev.beta != null) state.pitch = ev.beta;
    if (ev.gamma != null) state.roll = ev.gamma;
    updateHud();
  }

  // Called from native sensor bridge (Android, throttled ~10Hz)
  global.__onSensorUpdate = function (azimuth, pitch, roll) {
    state.nativeSensors = true;
    setAzimuth(azimuth);
    state.pitch = pitch || 0;
    state.roll = roll || 0;
    updateHud();
  };

  function setAzimuth(az) {
    if (typeof az !== 'number' || isNaN(az)) return;
    state.azimuth = az;
    // throttle DOM updates to ~60fps
    var now = Date.now();
    if (now - state.lastAzUpdate < 50) return;
    state.lastAzUpdate = now;
    updateCompassRing();
  }

  // v1.14: آفست دستی قطب‌نما — بادقلو و دکمه‌های میکرو (±۱°) برای جبران انحراف سنسور
  function resetOffset() {
    state.manualOffset = 0;
    updateCompassRing();
    return state.manualOffset;
  }
  function adjustOffset(deg) {
    state.manualOffset = ((state.manualOffset || 0) + deg + 360) % 360;
    updateCompassRing();
    return state.manualOffset;
  }
  function getOffset() { return state.manualOffset || 0; }

  function updateCompassRing() {
    // The compass ring should rotate so that the actual North points "up" when the phone is aligned.
    // If the phone is rotated by `az` degrees clockwise (from north), we want the N label to appear
    // at angle `az` clockwise from top. So we rotate the ring by -az (counter-clockwise) which puts
    // the physical North at the top.
    var az = (state.azimuth + (state.manualOffset || 0)) % 360; // v1.14: اعمال آفست دستی
    var ring = document.getElementById('compassRing');
    var needle = document.getElementById('compassNeedle');
    if (ring) {
      ring.style.setProperty('--ring-rot', (-az) + 'deg');
    }
    // The qibla indicator should rotate (within the ring) to point to qibla direction relative to north
    var qibla = document.getElementById('compassQibla');
    if (qibla) {
      // qibla-rot is relative to ring orientation; since ring rotates by -az, we add az
      qibla.style.setProperty('--qibla-rot', (state.qiblaBearing + az) + 'deg');
    }
    var degEl = document.getElementById('compassDeg');
    if (degEl) degEl.textContent = Math.round(state.azimuth) + '°';
    var info = document.getElementById('compassQiblaInfo');
    if (info && window.Prayer) {
      var dist = Prayer.qiblaDistance(App.getSettings().lat || 26.84, App.getSettings().lng || 60.17);
      info.textContent = 'سمت قبله: ' + Math.round(state.qiblaBearing) + '° • فاصله: ' + dist + ' کیلومتر';
    }
  }

  // Build pitch ladder rows once (every 10°, from -40 to +40)
  var pitchLadderBuilt = false;
  function buildPitchLadder() {
    var el = document.getElementById('hudPitchLadder');
    if (!el || pitchLadderBuilt) return;
    pitchLadderBuilt = true;
    el.innerHTML = '';
    var pxPerDeg = 4; // 4px per degree of pitch
    for (var deg = -40; deg <= 40; deg += 10) {
      if (deg === 0) continue;
      var row = document.createElement('div');
      row.className = 'hud-pitch-ladder__row' + (deg < 0 ? ' hud-pitch-ladder__row--neg' : '');
      var isBig = (deg % 20 === 0);
      var barW = isBig ? '90px' : '40px';
      row.innerHTML = '<span class="hud-pitch-ladder__num">' + Math.abs(deg) + '</span>' +
        '<span class="hud-pitch-ladder__bar" style="width:' + barW + ';"></span>' +
        '<span class="hud-pitch-ladder__num">' + Math.abs(deg) + '</span>';
      row.style.transform = 'translateY(' + (deg * pxPerDeg) + 'px)';
      row.dataset.deg = deg;
      el.appendChild(row);
    }
  }

  // Build heading tape ticks (every 5°, labeled every 15°)
  var headingTapeBuilt = false;
  function buildHeadingTape() {
    var el = document.getElementById('hudHeadingTape');
    if (!el || headingTapeBuilt) return;
    headingTapeBuilt = true;
    el.innerHTML = '';
    for (var d = 0; d < 360; d += 5) {
      var tick = document.createElement('span');
      tick.className = 'hud-heading-tape__tick' + (d % 15 === 0 ? ' hud-heading-tape__tick--big' : '');
      tick.dataset.deg = d;
      tick.style.left = (d * (el.clientWidth / 360)) + 'px';
      tick.textContent = (d % 15 === 0) ? String(d).padStart(3, '0') : '';
      el.appendChild(tick);
    }
  }

  function updateHud() {
    var horizon = document.getElementById('hudHorizon');
    var heading = document.getElementById('hudHeading');
    var bank = document.getElementById('hudBank');
    var pitchEl = document.getElementById('hudPitch');
    var pitchMark = document.getElementById('hudPitchMark');
    var bankInd = document.getElementById('hudBankIndicator');
    if (horizon) {
      // pitch moves the horizon (px per degree), roll rotates it
      horizon.style.setProperty('--pitch', (state.pitch * 4) + 'px');
      horizon.style.setProperty('--roll', (-state.roll) + 'deg');
      // pitch ladder rows move opposite to horizon
      var rows = horizon.querySelectorAll('.hud-pitch-ladder__row');
      for (var i = 0; i < rows.length; i++) {
        var deg = parseInt(rows[i].dataset.deg, 10);
        rows[i].style.transform = 'translateY(' + ((deg - state.pitch) * 4) + 'px)';
      }
    }
    if (heading) heading.textContent = Math.round(state.azimuth) + '°';
    if (bank) bank.textContent = 'بانک: ' + Math.round(state.roll) + '°';
    if (pitchEl) pitchEl.textContent = 'شیب: ' + Math.round(state.pitch) + '°';
    if (pitchMark) pitchMark.textContent = Math.round(state.pitch) + '°';
    // Bank indicator moves with roll (clamped to ±45°)
    if (bankInd) {
      var r = Math.max(-45, Math.min(45, state.roll));
      bankInd.style.transform = 'translateX(-50%) translateX(' + (r * 1.3) + 'px)';
    }
    // Heading tape scrolls (center = current heading)
    var tape = document.getElementById('hudHeadingTape');
    if (tape) {
      buildHeadingTape();
      var half = tape.clientWidth / 2;
      var ticks = tape.querySelectorAll('.hud-heading-tape__tick');
      for (var j = 0; j < ticks.length; j++) {
        var dd = parseInt(ticks[j].dataset.deg, 10);
        var delta = ((dd - state.azimuth + 540) % 360) - 180; // -180..180
        ticks[j].style.left = (half + delta * (tape.clientWidth / 360)) + 'px';
        ticks[j].style.opacity = (Math.abs(delta) > 90) ? '0' : '1';
      }
    }
    // v1.13: سرعت/ارتفاع «شبیه‌سازی‌شده» حذف شد — اعداد الکی نباشند.
    // جایگزین: قبله روی HUD — فلش سبز جهت کعبه نسبت به سمت فعلی گوشی
    var qiblaEl = document.getElementById('hudQibla');
    var qiblaTapeEl = document.getElementById('hudQiblaTape');
    if (qiblaEl) {
      if (state.qiblaBearing != null) {
        var dQ = ((state.qiblaBearing - state.azimuth + 540) % 360) - 180; // -180..180
        var clamped = Math.max(-90, Math.min(90, dQ));
        qiblaEl.style.transform = 'translateX(-50%) translateX(' + (clamped * 1.05) + 'px)';
        qiblaEl.style.opacity = (Math.abs(dQ) > 100) ? '0' : '1';
        qiblaEl.title = 'قبله ' + Math.round(state.qiblaBearing) + '°';
      } else { qiblaEl.style.opacity = '0'; }
    }
    if (qiblaTapeEl) {
      qiblaTapeEl.textContent = (state.qiblaBearing != null) ? ('قبله: ' + Math.round(state.qiblaBearing) + '°') : '';
    }
  }

  function setQibla(bearing) {
    state.qiblaBearing = bearing;
    updateCompassRing();
    if (state.active) updateHud(); // v1.13: نشانگر قبله HUD بلافاصله آپدیت شود
  }

  var demoTimer = null;
  function autoRotateDemo() {
    var angle = 0;
    demoTimer = setInterval(function () {
      if (!state.active) { clearInterval(demoTimer); return; }
      if (state.nativeSensors) { clearInterval(demoTimer); return; }
      angle = (angle + 1.5) % 360;
      setAzimuth(angle);
    }, 60);
  }

  // ===== نقشه قبله (v1.9) =====
  var KAABA = { lat: 21.4225, lng: 39.8262 };
  var qiblaMapUrl = null;

  function fmtKm(km) {
    if (km >= 1000) return (km / 1000).toFixed(1) + ' هزار کیلومتر';
    return Math.round(km) + ' کیلومتر';
  }

  function showQiblaMap() {
    var modal = document.getElementById('modalQiblaMap');
    var frame = document.getElementById('qiblaMapFrame');
    var info = document.getElementById('qiblaMapInfo');
    if (!modal || !frame || !info) return;
    modal.classList.add('show');
    var st = (typeof App !== 'undefined' && App.state) ? App.state : null;
    var lat = (st && st.lat != null) ? st.lat : (st && st.settings && st.settings.lat);
    var lng = (st && st.lng != null) ? st.lng : (st && st.settings && st.settings.lng);
    if (lat == null || lng == null || (lat === 0 && lng === 0)) {
      frame.style.display = 'none';
      info.textContent = 'ابتدا موقعیت (GPS) را روشن کنید تا نقشه مسیر قبله نمایش داده شود.';
      return;
    }
    frame.style.display = 'block';
    qiblaMapUrl = 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=' +
      lat + '%2C' + lng + ';' + KAABA.lat + '%2C' + KAABA.lng;
    frame.src = 'about:blank';
    setTimeout(function () { frame.src = qiblaMapUrl; }, 60);
    // محاسبات
    var R = 6371;
    var dLat = (KAABA.lat - lat) * Math.PI / 180;
    var dLng = (KAABA.lng - lng) * Math.PI / 180;
    var a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(KAABA.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    var dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var brg = state.qiblaBearing;
    info.innerHTML = 'فاصله شما تا کعبه: <b>' + fmtKm(dist) + '</b><br>' +
      'سمت قبله: <b>' + (brg != null ? Math.round(brg) + '°' : '--') + '</b> از شمال<br>' +
      '<span style="opacity:.7">نقشه از OpenStreetMap بارگذاری می‌شود (نیاز اینترنت).</span>';
  }

  function hideQiblaMap() {
    var modal = document.getElementById('modalQiblaMap');
    if (modal) modal.classList.remove('show');
    var frame = document.getElementById('qiblaMapFrame');
    if (frame) frame.src = 'about:blank';
  }

  function bindQiblaMap() {
    var btn = document.getElementById('qiblaMapBtn');
    if (btn && !btn._bound) { btn.addEventListener('click', showQiblaMap); btn._bound = true; }
    var close = document.getElementById('qiblaMapClose');
    if (close && !close._bound) { close.addEventListener('click', hideQiblaMap); close._bound = true; }
    var ext = document.getElementById('qiblaMapOpenExternal');
    if (ext && !ext._bound) {
      ext.addEventListener('click', function () {
        if (!qiblaMapUrl) return;
        if (typeof NativeApp !== 'undefined' && NativeApp.openUrl) { try { NativeApp.openUrl(qiblaMapUrl); return; } catch (e) {} }
        window.open(qiblaMapUrl, '_blank');
      });
      ext._bound = true;
    }
    var backdrop = document.getElementById('modalQiblaMap');
    if (backdrop && !backdrop._bound) {
      backdrop.addEventListener('click', function (ev) { if (ev.target === backdrop) hideQiblaMap(); });
      backdrop._bound = true;
    }
  }

  var Compass = {
    start: start, stop: stop, setQibla: setQibla, state: state,
    resetOffset: resetOffset, adjustOffset: adjustOffset, getOffset: getOffset,
    showQiblaMap: showQiblaMap, hideQiblaMap: hideQiblaMap, bindQiblaMap: bindQiblaMap
  };
  if (typeof window !== 'undefined') window.Compass = Compass;
})(typeof window !== 'undefined' ? window : this);

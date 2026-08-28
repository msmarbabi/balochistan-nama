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

  function updateCompassRing() {
    // The compass ring should rotate so that the actual North points "up" when the phone is aligned.
    // If the phone is rotated by `az` degrees clockwise (from north), we want the N label to appear
    // at angle `az` clockwise from top. So we rotate the ring by -az (counter-clockwise) which puts
    // the physical North at the top.
    var ring = document.getElementById('compassRing');
    var needle = document.getElementById('compassNeedle');
    if (ring) {
      ring.style.setProperty('--ring-rot', (-state.azimuth) + 'deg');
    }
    // The qibla indicator should rotate (within the ring) to point to qibla direction relative to north
    var qibla = document.getElementById('compassQibla');
    if (qibla) {
      // qibla-rot is relative to ring orientation; since ring rotates by -az, we add az
      qibla.style.setProperty('--qibla-rot', (state.qiblaBearing + state.azimuth) + 'deg');
    }
    var degEl = document.getElementById('compassDeg');
    if (degEl) degEl.textContent = Math.round(state.azimuth) + '°';
    var info = document.getElementById('compassQiblaInfo');
    if (info && window.Prayer) {
      var dist = Prayer.qiblaDistance(App.getSettings().lat || 26.84, App.getSettings().lng || 60.17);
      info.textContent = 'سمت قبله: ' + Math.round(state.qiblaBearing) + '° • فاصله: ' + dist + ' کیلومتر';
    }
  }

  function updateHud() {
    var horizon = document.getElementById('hudHorizon');
    var heading = document.getElementById('hudHeading');
    var bank = document.getElementById('hudBank');
    var pitchEl = document.getElementById('hudPitch');
    var pitchMark = document.getElementById('hudPitchMark');
    if (horizon) {
      horizon.style.setProperty('--pitch', (state.pitch * 0.7) + 'px');
      horizon.style.setProperty('--roll', (-state.roll) + 'deg');
    }
    if (heading) heading.textContent = Math.round(state.azimuth) + '°';
    if (bank) bank.textContent = 'بانک: ' + Math.round(state.roll) + '°';
    if (pitchEl) pitchEl.textContent = 'شیب: ' + Math.round(state.pitch) + '°';
    if (pitchMark) pitchMark.textContent = Math.round(state.pitch) + '°';
  }

  function setQibla(bearing) {
    state.qiblaBearing = bearing;
    updateCompassRing();
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

  var Compass = {
    start: start, stop: stop, setQibla: setQibla, state: state
  };
  if (typeof window !== 'undefined') window.Compass = Compass;
})(typeof window !== 'undefined' ? window : this);

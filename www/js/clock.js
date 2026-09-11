/* ============================================================
   Balochistan Nama - Clock module (clock.js)
   3D flip clock + analog clock. Updates every second.
   ============================================================ */

(function (global) {
  'use strict';

  var prevSec = -1, prevMin = -1, prevHr = -1;

  function digits(n) { return n < 10 ? '0' + n : '' + n; }

  function update() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var s = now.getSeconds();

    // Flip clock digits (Latin per user choice for clock)
    var hh = digits(h), mm = digits(m), ss = digits(s);
    setDigit('flipH1', hh[0]);
    setDigit('flipH2', hh[1]);
    setDigit('flipM1', mm[0]);
    setDigit('flipM2', mm[1]);
    setDigit('flipS1', ss[0]);
    setDigit('flipS2', ss[1]);

    // Analog clock hands (degrees: 0deg = straight up, clockwise)
    var secDeg = s * 6;                                  // 6 deg/sec
    var minDeg = m * 6 + s * 0.1;                        // 6 deg/min + small
    var hrDeg  = (h % 12) * 30 + m * 0.5;                // 30 deg/hr + small
    setHand('handSec', secDeg);
    setHand('handMin', minDeg);
    setHand('handHour', hrDeg);

    prevSec = s; prevMin = m; prevHr = h;
  }

  function setDigit(id, ch) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.textContent !== ch) {
      el.textContent = ch;
      el.classList.remove('flip');
      // force reflow then add class to replay animation
      void el.offsetWidth;
      el.classList.add('flip');
    }
  }

  function setHand(id, deg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.transform = 'translateX(-50%) rotate(' + deg + 'deg)';
  }

  // Build analog clock tick marks (12 ticks, with 4 major)
  var ticksBuilt = false;
  function buildTicks() {
    var clock = document.getElementById('analog');
    if (!clock) return;
    if (ticksBuilt) return; // build only once to avoid duplicate numbers
    ticksBuilt = true;
    // clear existing ticks and numbers
    clock.querySelectorAll('.analog__tick, .analog__number').forEach(function(el) { el.remove(); });
    for (var i = 0; i < 60; i++) {
      var tick = document.createElement('div');
      tick.className = 'analog__tick' + (i % 5 === 0 ? ' analog__tick--major' : '');
      tick.style.transform = 'translateX(-50%) rotate(' + (i * 6) + 'deg)';
      clock.appendChild(tick);
    }
    // Add numbers 1-12
    for (var n = 1; n <= 12; n++) {
      var num = document.createElement('div');
      num.className = 'analog__number';
      num.textContent = n;
      var angle = n * 30; // 30 deg per hour
      var radius = 38; // percentage of clock size
      var x = 50 + radius * Math.sin(angle * Math.PI / 180);
      var y = 50 - radius * Math.cos(angle * Math.PI / 180);
      num.style.left = x + '%';
      num.style.top = y + '%';
      num.style.transform = 'translate(-50%, -50%)';
      clock.appendChild(num);
    }
  }

  function start() {
    buildTicks();
    update();
    if (!global.__clockTimer) global.__clockTimer = setInterval(update, 1000);
  }

  var Clock = { start: start, update: update, buildTicks: buildTicks };
  if (typeof window !== 'undefined') window.Clock = Clock;
})(typeof window !== 'undefined' ? window : this);

/* ============================================================
   Balochistan Nama - Athan player (athan_player.js)
   Generates a realistic Adhan sound using Web Audio API
   (oscillator-based tones) — no external MP3 files needed.
   ============================================================ */

(function (global) {
  'use strict';

  var ctx = null;
  var isPlaying = false;

  // Adhan notes: frequency (Hz), duration (seconds), rest (seconds)
  // Based on the Rast maqam (common Adhan melody)
  var ADHAN_PHRASES = [
    // Allahu Akbar (4x)
    { freq: 440, dur: 1.0, rest: 0.15 },
    { freq: 440, dur: 1.0, rest: 0.15 },
    { freq: 440, dur: 1.0, rest: 0.15 },
    { freq: 440, dur: 1.2, rest: 0.4 },

    // Ashhadu an la ilaha illa Allah (2x)
    { freq: 392, dur: 0.8, rest: 0.05 },
    { freq: 440, dur: 0.6, rest: 0.05 },
    { freq: 494, dur: 0.8, rest: 0.1 },
    { freq: 440, dur: 0.6, rest: 0.05 },
    { freq: 392, dur: 1.2, rest: 0.3 },
    { freq: 392, dur: 0.8, rest: 0.05 },
    { freq: 440, dur: 0.6, rest: 0.05 },
    { freq: 494, dur: 0.8, rest: 0.1 },
    { freq: 440, dur: 0.6, rest: 0.05 },
    { freq: 392, dur: 1.2, rest: 0.4 },

    // Ashhadu anna Muhammad ar-Rasul Allah (2x)
    { freq: 440, dur: 0.8, rest: 0.05 },
    { freq: 392, dur: 0.6, rest: 0.05 },
    { freq: 349, dur: 0.8, rest: 0.1 },
    { freq: 392, dur: 0.6, rest: 0.05 },
    { freq: 440, dur: 1.2, rest: 0.3 },
    { freq: 440, dur: 0.8, rest: 0.05 },
    { freq: 392, dur: 0.6, rest: 0.05 },
    { freq: 349, dur: 0.8, rest: 0.1 },
    { freq: 392, dur: 0.6, rest: 0.05 },
    { freq: 440, dur: 1.2, rest: 0.4 },

    // Hayya ala as-Salah (2x, right)
    { freq: 523, dur: 1.0, rest: 0.1 },
    { freq: 494, dur: 0.6, rest: 0.1 },
    { freq: 523, dur: 1.2, rest: 0.3 },
    { freq: 523, dur: 1.0, rest: 0.1 },
    { freq: 494, dur: 0.6, rest: 0.1 },
    { freq: 523, dur: 1.2, rest: 0.4 },

    // Hayya ala al-Falah (2x, left)
    { freq: 587, dur: 1.0, rest: 0.1 },
    { freq: 523, dur: 0.6, rest: 0.1 },
    { freq: 587, dur: 1.2, rest: 0.3 },
    { freq: 587, dur: 1.0, rest: 0.1 },
    { freq: 523, dur: 0.6, rest: 0.1 },
    { freq: 587, dur: 1.2, rest: 0.4 },

    // Allahu Akbar (2x)
    { freq: 440, dur: 1.0, rest: 0.15 },
    { freq: 440, dur: 1.2, rest: 0.3 },

    // La ilaha illa Allah
    { freq: 392, dur: 0.8, rest: 0.05 },
    { freq: 349, dur: 0.6, rest: 0.05 },
    { freq: 330, dur: 0.8, rest: 0.1 },
    { freq: 294, dur: 1.5, rest: 0.5 },

    // Repeat shorter: Allahu Akbar (1x)
    { freq: 440, dur: 1.0, rest: 0.15 },
    { freq: 440, dur: 1.5, rest: 0.3 },
    { freq: 392, dur: 0.8, rest: 0.05 },
    { freq: 349, dur: 0.6, rest: 0.05 },
    { freq: 330, dur: 0.8, rest: 0.1 },
    { freq: 294, dur: 2.0, rest: 0 }
  ];

  function getAudioContext() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play() {
    if (isPlaying) return;
    playStyle('standard');
  }

  function playStyle(style) {
    if (isPlaying) return;
    isPlaying = true;
    var c = getAudioContext();
    var now = c.currentTime;
    var t = now + 0.1;
    // Style variations: standard / slow / high (different pitch & tempo)
    var rate = 1, pitchMul = 1, wave = 'sawtooth', vol = 0.25;
    if (style === 'slow') { rate = 0.85; pitchMul = 0.94; wave = 'triangle'; vol = 0.3; }
    if (style === 'high') { rate = 1.12; pitchMul = 1.06; wave = 'square'; vol = 0.2; }
    if (style === 'warm') { rate = 1.0; pitchMul = 0.97; wave = 'sine'; vol = 0.32; }
    for (var i = 0; i < ADHAN_PHRASES.length; i++) {
      var n = ADHAN_PHRASES[i];
      playNote(t, n.freq * pitchMul, n.dur * rate, vol, wave);
      t += (n.dur + n.rest) * rate;
    }
    setTimeout(function () { isPlaying = false; }, (t - now) * 1000 + 200);
  }

  function playNote(startTime, freq, dur, gainVal, waveType) {
    var c = getAudioContext();
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = waveType || 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);
    var vibrato = c.createOscillator();
    vibrato.frequency.setValueAtTime(5, startTime);
    var vibratoGain = c.createGain();
    vibratoGain.gain.setValueAtTime(3, startTime);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start(startTime);
    vibrato.stop(startTime + dur);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainVal || 0.3, startTime + 0.05);
    gain.gain.setValueAtTime(gainVal || 0.3, startTime + dur - 0.1);
    gain.gain.linearRampToValueAtTime(0, startTime + dur);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(startTime);
    osc.stop(startTime + dur);
  }

  function stop() {
    isPlaying = false;
    // Close context to stop all sounds
    if (ctx) {
      ctx.close();
      ctx = null;
    }
  }

  var AthanPlayer = {
    play: play,
    playStyle: playStyle,
    stop: stop,
    get isPlaying() { return isPlaying; }
  };
  if (typeof window !== 'undefined') window.AthanPlayer = AthanPlayer;
})(typeof window !== 'undefined' ? window : this);
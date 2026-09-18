// js/quran_audio.js — پخش صوتی قرآن و اذکار با قاری‌های آنلاین (mp3quran.net)
(function (global) {
  'use strict';

  var RECIORS = [
    { id: 'afs', name: 'میشیل رفیدع' },
    { id: 'bu_khtr', name: 'بوی خَطر' },
    { id: 'brmi', name: 'ابن بازاری' },
    { id: 'ayyub', name: 'ایوب' },
    { id: 'buajan', name: 'بو جان' },
    { id: 'dlami', name: 'دلاوی' },
    { id: 'fawaz', name: 'فواز' },
    { id: 'frs_a', name: 'فرس ای' },
    { id: 'gulan', name: 'گلان' },
    { id: 'hani', name: 'حانی' },
    { id: 'jbrl', name: 'جبریل' },
    { id: 'lhdan', name: 'لهدان' },
    { id: 'm_qari', name: 'ماوردی' },
    { id: 'mtrod', name: 'متروید' },
    { id: 'mustafa', name: 'مصطفی' },
    { id: 'namh', name: 'نَمو' },
    { id: 'qasm', name: 'قاسم' },
    { id: 'ra3ad', name: 'رعد' },
    { id: 'sahood', name: 'سعود' },
    { id: 'saber', name: 'صبر' }
  ];

  var player = new Audio();
  var currentReciter = RECIORS[0].id;
  var currentJuz = 1;
  var playing = false;

  function getReciterURL(reciter, juz) {
    return 'https://server8.mp3quran.net/' + reciter + '/' + String(juz).padStart(3, '0') + '.mp3';
  }

  function play() {
    playing = true;
    player.src = getReciterURL(currentReciter, currentJuz);
    player.play().catch(function (e) {
      console.warn('Audio play failed:', e);
      playing = false;
    });
  }

  function pause() {
    playing = false;
    player.pause();
  }

  function stop() {
    playing = false;
    player.pause();
    player.currentTime = 0;
  }

  function nextJuz() {
    if (currentJuz < 30) {
      currentJuz++;
      play();
    }
  }

  function prevJuz() {
    if (currentJuz > 1) {
      currentJuz--;
      play();
    }
  }

  function setReciter(reciterId) {
    var r = RECIORS.find(function (x) { return x.id === reciterId; });
    if (r) {
      currentReciter = reciterId;
      play();
    }
  }

  function setJuz(juzNum) {
    if (juzNum >= 1 && juzNum <= 30) {
      currentJuz = juzNum;
      play();
    }
  }

  // UI rendering
  function render() {
    var root = document.getElementById('quranAudioRoot');
    if (!root) return;

    var html = '<div class="quran-audio"><div class="quran-audio__reciters"><div class="text-small text-muted" style="margin-bottom:4px;">🎙️ قاری</div><select id="quranAudioReciter" style="width:100%;padding:6px;border-radius:6px;background:var(--bg-elev);color:var(--fg);border:1px solid var(--line);">';
    for (var i = 0; i < RECIORS.length; i++) {
      html += '<option value="' + RECIORS[i].id + '"' + (RECIORS[i].id === currentReciter ? ' selected' : '') + '>' + RECIORS[i].name + '</option>';
    }
    html += '</select></div>';
    html += '<div class="quran-audio__juz" style="margin-top:8px;"><div class="text-small text-muted" style="margin-bottom:4px;">📖 جُز</div><div class="quran-audio__juzlist">';
    for (var j = 1; j <= 30; j++) {
      var sel = j === currentJuz ? ' class="quran-audio__juzsel"' : '';
      html += '<button data-juz="' + j + '" ' + sel + '>' + j + '</button>';
    }
    html += '</div></div>';
    html += '<div class="quran-audio__controls" style="margin-top:10px;display:flex;gap:6px;"><button id="quranAudioPrev">◀</button><button id="quranAudioPlay">' + (playing ? '⏸' : '▶') + '</button><button id="quranAudioNext">▶</button></div>';
    html += '<div class="text-small text-muted" style="margin-top:6px;font-size:10px;">' + RECIORS.find(function (x) { return x.id === currentReciter; }).name + ' • جُز ' + currentJuz + '</div>';
    html += '</div>';
    root.innerHTML = html;

    // Bindings
    document.getElementById('quranAudioReciter').addEventListener('change', function (e) {
      setReciter(e.target.value);
      render();
    });
    document.getElementById('quranAudioPlay').addEventListener('click', function () {
      if (playing) { pause(); } else { play(); }
      render();
    });
    document.getElementById('quranAudioNext').addEventListener('click', nextJuz);
    document.getElementById('quranAudioPrev').addEventListener('click', prevJuz);
    document.querySelectorAll('.quran-audio__juzlist button').forEach(function (b) {
      b.addEventListener('click', function () {
        setJuz(parseInt(b.dataset.juz, 10));
        render();
      });
    });
  }

  global.BXQuranAudio = {
    play: play,
    pause: pause,
    stop: stop,
    next: nextJuz,
    prev: prevJuz,
    setReciter: setReciter,
    setJuz: setJuz,
    render: render,
    isPlaying: function () { return playing; },
    reciterList: RECIORS,
    currentReciter: function () { return currentReciter; },
    currentJuz: function () { return currentJuz; }
  };
})(typeof window !== 'undefined' ? window : this);

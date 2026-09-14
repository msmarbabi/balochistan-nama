/* ============================================================
   Balochistan Nama - Balochi Learning module (learn.js)
   Vocabulary flashcards, daily phrases, and mini quizzes.
   ============================================================ */

(function (global) {
  'use strict';

  // escapeHtml helper (local, since app.js's escapeHtml is not in this scope)
  function escapeHtml(s) { return (window.BXUtils ? BXUtils.escapeHtml : function (x) { return String(x == null ? '' : x); })(s); }

  var VOCAB = [
    { balochi: 'سپاس', fa: 'سپاس / تشکر', note: 'رایج‌ترین واژه تشکر' },
    { balochi: 'شما', fa: 'شما (محترمانه)', note: 'برای خطاب محترمانه' },
    { balochi: 'ته', fa: 'تو (خودمانی)', note: 'برای دوستان و نزدیکان' },
    { balochi: 'من', fa: 'من', note: '' },
    { balochi: 'آپ', fa: 'آب', note: '' },
    { balochi: 'نان', fa: 'نان', note: 'غذای اصلی' },
    { balochi: 'دوست', fa: 'دوست', note: 'هم‌معنی با فارسی' },
    { balochi: 'دل', fa: 'قلب / دل', note: '' },
    { balochi: 'گپ', fa: 'حرف / گفتگو', note: 'گپ زدن = صحبت کردن' },
    { balochi: 'بیت', fa: 'شدن', note: 'مصدر' },
    { balochi: 'بوتگ', fa: 'گفته', note: 'گفته شده' },
    { balochi: 'آس', fa: 'آرامش', note: '' },
    { balochi: 'باهوش', fa: 'باهوش / زیرک', note: '' },
    { balochi: 'بزرگ', fa: 'بزرگ', note: 'هم‌معنی با فارسی' },
    { balochi: 'چی‌ز', fa: 'چیز', note: 'هم‌معنی با فارسی' },
    { balochi: 'درد', fa: 'درد', note: 'هم‌معنی با فارسی' },
    { balochi: 'گل', fa: 'گل', note: 'هم‌معنی با فارسی' },
    { balochi: 'زندگی', fa: 'زندگی', note: 'هم‌معنی با فارسی' },
    { balochi: 'مرد', fa: 'مرد', note: '' },
    { balochi: 'زن', fa: 'زن', note: '' },
    { balochi: 'بچه', fa: 'بچه', note: 'هم‌معنی با فارسی' },
    { balochi: 'راه', fa: 'راه / جاده', note: '' },
    { balochi: 'شپ', fa: 'شب', note: '' },
    { balochi: 'روچ', fa: 'روز', note: '' },
    { balochi: 'گپین', fa: 'بزرگ', note: '' },
    { balochi: 'وچک', fa: 'کوچک', note: '' },
    { balochi: 'نازوک', fa: 'نازک / ظریف', note: '' },
    { balochi: 'شیرین', fa: 'شیرین', note: 'هم‌معنی با فارسی' },
    { balochi: 'برات', fa: 'برادر', note: 'بلوچی' },
    { balochi: 'گوهار', fa: 'خواهر', note: 'بلوچی' },
    { balochi: 'پس', fa: 'پسر', note: '' },
    { balochi: 'دتر', fa: 'دختر', note: '' },
    { balochi: 'پی', fa: 'پدر', note: '' },
    { balochi: 'مات', fa: 'مادر', note: '' },
    { balochi: 'هوتگ', fa: 'گفتن', note: 'مصدر' },
    { balochi: 'ونگ', fa: 'صدا', note: '' },
    { balochi: 'شهر', fa: 'شهر', note: 'هم‌معنی با فارسی' },
    { balochi: 'دشت', fa: 'دشت / صحرا', note: '' },
    { balochi: 'کوه', fa: 'کوه', note: 'هم‌معنی با فارسی' },
    { balochi: 'دریا', fa: 'دریا', note: 'هم‌معنی با فارسی' }
  ].concat((window.CultureExtra && CultureExtra.words) ? CultureExtra.words.map(function (w) { return { balochi: w.b, fa: w.fa, note: w.ex || "" }; }) : [])
   .concat((window.CultureExtra && CultureExtra.words2) ? CultureExtra.words2.map(function (w) { return { balochi: w.b, fa: w.fa, note: w.ex || "", tag: w.tag || '' }; }) : []);

  var PHRASES = [
    { balochi: 'ته چوکی حال انت؟', fa: 'حالت چطوره؟' },
    { balochi: 'من خوش انت', fa: 'من خوبم' },
    { balochi: 'شما سپاس', fa: 'متشکرم (شما)' },
    { balochi: 'ته نام چیت انت؟', fa: 'اسم تو چیه؟' },
    { balochi: 'منی نام ... انت', fa: 'اسم من ... است' },
    { balochi: 'بله، بله', fa: 'بله' },
    { balochi: 'نه، نه', fa: 'نه' },
    { balochi: 'بشین', fa: 'بشین / بنشین' },
    { balochi: 'برو', fa: 'برو' },
    { balochi: 'بازیت', fa: 'بیا' },
    { balochi: 'پَدا', fa: 'با هم / جمعاً' },
    { balochi: 'کیا؟', fa: 'کی؟' },
    { balochi: 'کجا؟', fa: 'کجا؟' },
    { balochi: 'چی؟', fa: 'چی؟' },
    { balochi: 'چون؟', fa: 'چرا؟' },
    { balochi: 'منی یار', fa: 'دوست من' },
    { balochi: 'بلوچستان زنده باد', fa: 'بلوچستان زنده باد' }
  ];

  function pick(arr, seed) {
    if (typeof seed === 'number') {
      var idx = Math.floor(Math.abs(Math.sin(seed) * 1000000)) % arr.length;
      return arr[idx];
    }
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function renderVocab(category) {
    var items = VOCAB;
    var html = '';
    var count = 0;
    for (var i = 0; i < items.length; i++) {
      var w = items[i];
      html +=
        '<div class="vocab-card">' +
          (w.tag ? '<div class="vocab-card__tag">' + escapeHtml(w.tag) + '</div>' : '') +
          '<div class="vocab-card__balochi">' + escapeHtml(w.balochi) + '</div>' +
          '<div class="vocab-card__fa">' + escapeHtml(w.fa) + '</div>' +
          (w.note ? '<div class="vocab-card__note">' + escapeHtml(w.note) + '</div>' : '') +
        '</div>';
      count++;
    }
    html = '<div class="text-small text-muted" style="margin-bottom:8px;">📚 ' + count + ' واژه — برای یادگیری تدریجی هر روز چند واژه مرور کنید.</div>' + html;
    return html;
  }

  function renderPhrases() {
    var html = '';
    for (var i = 0; i < PHRASES.length; i++) {
      var p = PHRASES[i];
      html +=
        '<div class="phrase-card">' +
          '<div class="phrase-card__balochi">🗣️ ' + escapeHtml(p.balochi) + '</div>' +
          '<div class="phrase-card__fa">' + escapeHtml(p.fa) + '</div>' +
        '</div>';
    }
    return html;
  }

  function renderQuiz() {
    var html = '<div class="text-small text-muted" style="margin-bottom:8px;">🧠 بلوچی را حدس بزنید — روی گزینه کلیک کنید.</div>';
    var w = pick(VOCAB, Date.now());
    var wrongOptions = [];
    var pool = VOCAB.filter(function (x) { return x !== w; });
    for (var i = 0; i < 3; i++) {
      var r = pick(pool, Date.now() + i * 1000);
      wrongOptions.push(r.fa);
      pool = pool.filter(function (x) { return x.fa !== r.fa; });
    }
    var allOptions = [w.fa].concat(wrongOptions);
    // Shuffle
    for (var i = allOptions.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = allOptions[i]; allOptions[i] = allOptions[j]; allOptions[j] = tmp;
    }
    html +=
      '<div class="quiz-question">معنی «' + escapeHtml(w.balochi) + '» چیست؟</div>';
    for (var o = 0; o < allOptions.length; o++) {
      html += '<button class="quiz-option learn-option" data-correct="' + (allOptions[o] === w.fa ? '1' : '0') + '">' + escapeHtml(allOptions[o]) + '</button>';
    }
    html += '<div id="learnResult" style="margin-top:8px; text-align:center; font-size:14px; font-weight:600;"></div>';
    return html;
  }

  function wireQuiz() {
    document.querySelectorAll('.quiz-option.learn-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var isCorrect = btn.dataset.correct === '1';
        document.querySelectorAll('.quiz-option.learn-option').forEach(function (b) {
          b.disabled = true;
          if (b.dataset.correct === '1') b.classList.add('correct');
          else if (b === btn && !isCorrect) b.classList.add('wrong');
        });
        var result = document.getElementById('learnResult');
        if (result) result.textContent = isCorrect ? '✅ آفرین! درست است!' : '❌ نه، معنی آن: ' + btn.dataset.correct;
      });
    });
  }

  var Learn = {
    VOCAB: VOCAB,
    PHRASES: PHRASES,
    renderVocab: renderVocab,
    renderPhrases: renderPhrases,
    renderQuiz: renderQuiz,
    wireQuiz: wireQuiz
  };
  if (typeof window !== 'undefined') window.Learn = Learn;
})(typeof window !== 'undefined' ? window : this);
/* ============================================================
   Balochistan Nama - i18n module (i18n.js)
   Lightweight Persian / Balochi switch for static UI labels.
   Stores choice in localStorage; applies to [data-i18n] nodes.
   ============================================================ */

(function (global) {
  'use strict';

  var KEY = 'blx_lang';

  // Only the most visible static labels are translated (lightweight).
  var DICT = {
    fa: {
      'nav.home': 'خانه', 'nav.calendar': 'تقویم', 'nav.prayer': 'نماز',
      'nav.compass': 'قبله', 'nav.weather': 'هوا', 'nav.culture': 'فرهنگ', 'nav.tasbeeh': 'تسبیح',
      'sec.todayEvents': 'مناسبت‌های امروز', 'sec.tools': 'ابزارها',
      'quick.qibla': 'قبله', 'quick.converter': 'تبدیل تاریخ', 'quick.poetry': 'شعر روز', 'quick.moon': 'فاز ماه', 'quick.tools': 'ابزار',
      'tb.title': 'تسبیح دیجیتال', 'tb.tap': 'بزن',
      'lang.label': 'زبان رابط'
    },
    bal: {
      'nav.home': 'گیش', 'nav.calendar': 'تقویم', 'nav.prayer': 'نماز',
      'nav.compass': 'قبله', 'nav.weather': 'هوا', 'nav.culture': 'فرهنگ', 'nav.tasbeeh': 'تسبیح',
      'sec.todayEvents': 'مراسمِ امروز', 'sec.tools': 'افزار',
      'quick.qibla': 'قبله', 'quick.converter': 'تبدیل تاریخ', 'quick.poetry': 'شعرِ روز', 'quick.moon': 'فاز ماه', 'quick.tools': 'افزار',
      'tb.title': 'تسبیح دیجیتال', 'tb.tap': 'بزن',
      'lang.label': 'زبانِ برنامه'
    }
  };

  function getLang() { try { return localStorage.getItem(KEY) || 'fa'; } catch (e) { return 'fa'; } }
  function setLang(l) { try { localStorage.setItem(KEY, l); } catch (e) {} apply(); }

  function apply() {
    var lang = getLang();
    var dict = DICT[lang] || DICT.fa;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var k = el.getAttribute('data-i18n');
      if (dict[k]) el.textContent = dict[k];
    });
    document.documentElement.setAttribute('data-lang', lang);
  }

  var I18n = { getLang: getLang, setLang: setLang, apply: apply, DICT: DICT };
  if (typeof window !== 'undefined') window.I18n = I18n;
})(typeof window !== 'undefined' ? window : this);

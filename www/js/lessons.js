/* lessons.js — v1.16 مرحله ۱۱: آموزش گام‌به‌گام نماز و وضو (حنفی، مرد/زن)
   متون: متون رایج حنفی (شناخته‌شده عام) — خلاصه‌نویسی آزاد از منابع عمومی */
(function (global) {
  'use strict';

  /* ===== SVG تصویری گام‌ها (آدمک ساده، تفاوت مرد/زن با رنگ ردا) ===== */
  function figure(kind, female) {
    var skin = '#e8c39e', cloth = female ? '#8e6bbf' : '#3a5f8a', line = female ? '#6f4fa3' : '#2c4a6e';
    var S = '<svg viewBox="0 0 200 240" style="width:110px;height:132px;">' +
      '<rect x="10" y="10" width="180" height="220" rx="14" fill="rgba(127,127,127,.08)"/>';
    function head(cx, cy) {
      var hair = female ? '<path d="M' + (cx - 13) + ',' + (cy - 6) + ' q0,-14 13,-14 q13,0 13,14 q0,6 -3,8 l0,14 l-5,0 l0,-12 q-5,3 -10,3 q-5,0 -10,-3 l0,12 l-5,0 l0,-14 q-3,-2 -3,-8z" fill="' + cloth + '"/>' : '';
      return '<circle cx="' + cx + '" cy="' + cy + '" r="12" fill="' + skin + '"/>' + hair;
    }
    function mat() { return '<ellipse cx="100" cy="222" rx="52" ry="7" fill="rgba(127,127,127,.25)"/>'; }
    switch (kind) {
      case 'qiyam': // ایستاده دست‌ها روی سینه
        S += head(100, 48) + mat() +
          '<rect x="88" y="60" width="24" height="90" rx="10" fill="' + cloth + '"/>' +
          '<path d="M88,150 l24,0 l-4,40 l-16,0 z" fill="' + cloth + '"/>' +
          '<path d="M84,72 q-4,22 10,30 l14,-18 q-4,-12 -10,-14" fill="none" stroke="' + cloth + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M116,72 q4,22 -10,30 l-14,-18 q4,-12 10,-14" fill="none" stroke="' + cloth + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M70,86 q-6,26 14,32" fill="none" stroke="' + cloth + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M130,86 q6,26 -14,32" fill="none" stroke="' + cloth + '" stroke-width="9" stroke-linecap="round"/>' +
          (female ? '<path d="M74,60 q26,-8 52,0 l0,86 q-26,8 -52,0 z" fill="' + cloth + '" opacity=".45"/>' : '');
        break;
      case 'takbir': // دست‌ها کنار گوش
        S += head(100, 52) + mat() +
          '<rect x="88" y="64" width="24" height="86" rx="10" fill="' + cloth + '"/>' +
          '<path d="M88,150 l24,0 l-4,40 l-16,0 z" fill="' + cloth + '"/>' +
          '<path d="M84,74 q-10,-16 2,-24" fill="none" stroke="' + cloth + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M116,74 q10,-16 -2,-24" fill="none" stroke="' + cloth + '" stroke-width="9" stroke-linecap="round"/>' +
          '<circle cx="86" cy="46" r="5" fill="' + skin + '"/><circle cx="114" cy="46" r="5" fill="' + skin + '"/>';
        break;
      case 'ruku': // رکوع
        S += mat() +
          '<path d="M56,214 l60,-4 l52,-38 q6,-6 12,0 q4,6 -2,12 l-56,40 q-34,14 -66,10z" fill="' + cloth + '"/>' +
          '<circle cx="66" cy="212" r="12" fill="' + skin + '"/>' +
          '<path d="M60,218 l34,-2 l-2,14 l-32,2z" fill="' + cloth + '"/>' +
          '<rect x="118" y="164" width="52" height="20" rx="10" fill="' + cloth + '" transform="rotate(-36 144 174)"/>' +
          '<circle cx="172" cy="186" r="6" fill="' + skin + '"/>' +
          '<path d="M64,224 l10,-6 l12,6z" fill="' + cloth + '"/>' +
          '<path d="M84,224 l10,-6 l12,6z" fill="' + cloth + '"/>';
        break;
      case 'sajdah': // سجده
        S += mat() +
          '<ellipse cx="128" cy="196" rx="34" ry="12" fill="' + skin + '"/>' +
          '<path d="M92,196 q0,-34 30,-34 q34,0 34,34 z" fill="' + cloth + '"/>' +
          '<path d="M92,196 l64,0 l0,14 l-64,0 z" fill="' + cloth + '"/>' +
          '<path d="M40,214 q22,-10 52,-6" fill="none" stroke="' + cloth + '" stroke-width="12" stroke-linecap="round"/>' +
          '<path d="M96,160 q4,-14 14,-16" fill="none" stroke="' + cloth + '" stroke-width="10" stroke-linecap="round"/>' +
          '<ellipse cx="100" cy="222" rx="30" ry="6" fill="' + cloth + '" opacity=".5"/>';
        break;
      case 'tashahhud': // نشسته تشهد
        S += head(100, 92) + mat() +
          '<path d="M70,120 q30,-14 60,0 l6,44 q-36,14 -72,0 z" fill="' + cloth + '"/>' +
          '<path d="M62,164 q38,-12 76,0 l-6,26 q-32,8 -64,0 z" fill="' + cloth + '"/>' +
          '<path d="M84,166 l-2,50" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M118,166 l4,50" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M84,72 q-4,16 8,22" fill="none" stroke="' + cloth + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M116,72 q4,16 -8,22" fill="none" stroke="' + cloth + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M76,122 q-10,-12 -16,-4" fill="none" stroke="' + skin + '" stroke-width="7" stroke-linecap="round"/>';
        break;
      case 'salam': // سلام — سر به راست و چپ
        S += head(96, 96) + mat() +
          '<path d="M68,122 q30,-14 58,0 l6,42 q-34,14 -70,0 z" fill="' + cloth + '"/>' +
          '<path d="M60,164 q38,-12 76,0 l-8,26 q-30,8 -62,0 z" fill="' + cloth + '"/>' +
          '<path d="M82,166 l-4,50" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M116,166 l4,50" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M96,90 q22,-8 26,10" fill="none" stroke="' + skin + '" stroke-width="7" stroke-linecap="round"/>';
        break;
      /* ===== وضو ===== */
      case 'w_niyyat':
        S += head(100, 52) +
          '<rect x="88" y="64" width="24" height="80" rx="10" fill="' + cloth + '"/>' +
          '<path d="M92,146 l16,0 l-2,46 l-12,0 z" fill="' + cloth + '"/>' +
          '<path d="M100,120 q-14,16 4,26" fill="none" stroke="' + skin + '" stroke-width="8" stroke-linecap="round"/>' +
          '<path d="M60,44 q6,-16 22,-16" fill="none" stroke="' + cloth + '" stroke-width="6" stroke-linecap="round" stroke-dasharray="4 4"/>';
        break;
      case 'w_hands':
        S += head(100, 48) +
          '<rect x="88" y="60" width="24" height="82" rx="10" fill="' + cloth + '"/>' +
          '<path d="M92,144 l16,0 l-2,48 l-12,0 z" fill="' + cloth + '"/>' +
          '<path d="M70,84 q-20,26 8,40" fill="none" stroke="' + skin + '" stroke-width="10" stroke-linecap="round"/>' +
          '<path d="M130,84 q20,26 -8,40" fill="none" stroke="' + skin + '" stroke-width="10" stroke-linecap="round"/>' +
          '<ellipse cx="62" cy="132" rx="9" ry="7" fill="' + skin + '"/><ellipse cx="138" cy="132" rx="9" ry="7" fill="' + skin + '"/>' +
          '<path d="M54,150 q46,14 92,0" fill="none" stroke="rgba(90,160,220,.6)" stroke-width="3" stroke-dasharray="3 5"/>';
        break;
      case 'w_mouth':
        S += head(100, 54) +
          '<rect x="88" y="66" width="24" height="78" rx="10" fill="' + cloth + '"/>' +
          '<path d="M92,146 l16,0 l-2,46 l-12,0 z" fill="' + cloth + '"/>' +
          '<circle cx="100" cy="58" r="8" fill="rgba(90,160,220,.55)"/>' +
          '<path d="M92,60 q-10,20 4,22" fill="none" stroke="' + skin + '" stroke-width="8" stroke-linecap="round"/>' +
          '<path d="M108,60 q10,20 -4,22" fill="none" stroke="' + skin + '" stroke-width="8" stroke-linecap="round"/>';
        break;
      case 'w_nose':
        S += head(100, 54) +
          '<rect x="88" y="66" width="24" height="78" rx="10" fill="' + cloth + '"/>' +
          '<path d="M92,146 l16,0 l-2,46 l-12,0 z" fill="' + cloth + '"/>' +
          '<circle cx="100" cy="52" r="6" fill="rgba(90,160,220,.55)"/>' +
          '<path d="M90,56 q-8,18 4,20" fill="none" stroke="' + skin + '" stroke-width="8" stroke-linecap="round"/>';
        break;
      case 'w_face':
        S += head(100, 52) +
          '<rect x="88" y="64" width="24" height="80" rx="10" fill="' + cloth + '"/>' +
          '<path d="M92,146 l16,0 l-2,46 l-12,0 z" fill="' + cloth + '"/>' +
          '<path d="M76,50 q24,-14 48,0" fill="none" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M76,62 q24,14 48,0" fill="none" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M100,40 q0,36 0,36" fill="none" stroke="rgba(90,160,220,.55)" stroke-width="3" stroke-dasharray="3 5"/>';
        break;
      case 'w_arms':
        S += head(100, 48) +
          '<rect x="88" y="60" width="24" height="82" rx="10" fill="' + cloth + '"/>' +
          '<path d="M92,144 l16,0 l-2,48 l-12,0 z" fill="' + cloth + '"/>' +
          '<path d="M72,74 q-26,30 4,52" fill="none" stroke="' + skin + '" stroke-width="11" stroke-linecap="round"/>' +
          '<path d="M128,74 q26,30 -4,52" fill="none" stroke="' + skin + '" stroke-width="11" stroke-linecap="round"/>' +
          '<ellipse cx="72" cy="80" rx="12" ry="6" fill="rgba(90,160,220,.5)"/><ellipse cx="128" cy="80" rx="12" ry="6" fill="rgba(90,160,220,.5)"/>';
        break;
      case 'w_head':
        S += head(100, 50) +
          '<rect x="88" y="62" width="24" height="80" rx="10" fill="' + cloth + '"/>' +
          '<path d="M92,144 l16,0 l-2,48 l-12,0 z" fill="' + cloth + '"/>' +
          '<path d="M74,60 q-12,18 6,22" fill="none" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M126,60 q12,18 -6,22" fill="none" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M92,42 q8,-6 16,0" fill="none" stroke="rgba(90,160,220,.6)" stroke-width="4"/>';
        break;
      case 'w_ears':
        S += head(100, 50) +
          '<rect x="88" y="62" width="24" height="80" rx="10" fill="' + cloth + '"/>' +
          '<path d="M92,144 l16,0 l-2,48 l-12,0 z" fill="' + cloth + '"/>' +
          '<path d="M72,58 q-10,14 4,16" fill="none" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M128,58 q10,14 -4,16" fill="none" stroke="' + skin + '" stroke-width="9" stroke-linecap="round"/>' +
          '<path d="M88,44 q-4,10 0,14" fill="none" stroke="rgba(90,160,220,.6)" stroke-width="4"/>' +
          '<path d="M112,44 q4,10 0,14" fill="none" stroke="rgba(90,160,220,.6)" stroke-width="4"/>';
        break;
      case 'w_feet':
        S += head(100, 42) +
          '<rect x="88" y="54" width="24" height="80" rx="10" fill="' + cloth + '"/>' +
          '<path d="M92,136 l16,0 l-2,50 l-12,0 z" fill="' + cloth + '"/>' +
          '<ellipse cx="88" cy="210" rx="14" ry="8" fill="' + skin + '"/><ellipse cx="112" cy="210" rx="14" ry="8" fill="' + skin + '"/>' +
          '<path d="M70,196 q-14,16 6,20" fill="none" stroke="' + skin + '" stroke-width="10" stroke-linecap="round"/>' +
          '<path d="M130,196 q14,16 -6,20" fill="none" stroke="' + skin + '" stroke-width="10" stroke-linecap="round"/>' +
          '<path d="M74,222 q26,10 52,0" fill="none" stroke="rgba(90,160,220,.6)" stroke-width="3" stroke-dasharray="3 5"/>';
        break;
      default:
        S += head(100, 60) + '<rect x="88" y="72" width="24" height="80" rx="10" fill="' + cloth + '"/>';
    }
    return S + '</svg>';
  }

  /* ===== محتوای درس‌ها ===== */
  var WUDU_STEPS = [
    { t: 'نیت و بسم‌الله', ar: 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِیم', fa: 'نیت می‌کنم وضو می‌گیرم برای طهارت از نجاست، به‌قصد امر خداوند. (نیت در دل است، گفتنش شرط نیست)', svg: 'w_niyyat' },
    { t: 'شستن دست‌ها — ۳ بار', ar: '', fa: 'دست‌ها تا مچ، ۳ بار می‌شوییم. (نخست دست راست سپس چپ — بین انگشت‌ها با انگشتان همدیگر خلاص می‌شود)', svg: 'w_hands' },
    { t: 'شستن دهان — ۳ بار', ar: '', fa: 'دهان با آب پر می‌شود و ۳ بار شسته می‌شود (مسواک مستحب است)', svg: 'w_mouth' },
    { t: 'شستن بینی — ۳ بار', ar: '', fa: 'بینی با آب پر و با دستِ چپ پاک می‌شود، ۳ بار', svg: 'w_nose' },
    { t: 'شستن صورت — ۳ بار', ar: '', fa: 'صورت از پیشانی (جایی که موها می‌رویند) تا زیر چانه، و از گوش راست تا گوش چپ — ۳ بار', svg: 'w_face' },
    { t: 'شستن دست‌ها تا آرنج — ۳ بار', ar: '', fa: 'دست راست تا آرنج ۳ بار، بعد دست چپ تا آرنج ۳ بار (انگشتان خلاص می‌شود)', svg: 'w_arms' },
    { t: 'مسح سر — ۱ بار', ar: '', fa: 'دست‌ها خیس می‌شوند؛ ۱/۴ سر جلو مسح می‌شود (از پیشانی تا فرق سر و برگشت)', svg: 'w_head' },
    { t: 'مسح گوش‌ها — ۱ بار', ar: '', fa: 'با همان آبِ سر، داخل و پشت هر دو گوش با انگشت اشاره و شست مسح می‌شود', svg: 'w_ears' },
    { t: 'شستن پاها تا مچ — ۳ بار', ar: '', fa: 'پاها تا استخوان مچ (قوزک) ۳ بار می‌شوییم؛ بین انگشت‌ها با انگشت کوچک خلاص می‌شود — نخست راست سپس چپ', svg: 'w_feet' },
    { t: 'ذکر بعد وضو', ar: 'أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِیکَ لَهُ وَ أَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَ رَسُولُهُ', fa: 'گفتن شهادتین بعد از وضو سنت است. اللَّهُمَّ اجْعَلْنِی مِنَ التَّوَّابِینَ وَ اجْعَلْنِی مِنَ الْمُتَطَهِّرِینَ', svg: 'w_niyyat' }
  ];

  var SALAT_STEPS = [
    { t: 'شرایط نماز', ar: '', fa: 'طهارت (وضو)، پوشش شرعی، رو به قبله، وقت نماز. در هر رکعت ۳ واجب است: تکبیر تحریمه + حمد + قیام. نقص یکی، نماز را باطل می‌کند.', svg: 'w_niyyat' },
    { t: 'گام ۱ — نیت و تکبیر تحریمه', ar: 'اللهُ أَکْبَرُ', fa: 'نیت می‌کنم ۲ رکعت نماز (فجر/ظهر…) برای خدا، رو به قبله. دست‌ها تا گوش بالا می‌روند و گفته می‌شود: الله اکبر. دست‌ها روی سینه بسته می‌شوند (دست راست روی چپ). زن‌ها دست‌ها روی سینه.', svg: 'takbir' },
    { t: 'گام ۲ — دعای سنه', ar: 'سُبْحَانَکَ اللهُمَّ وَ بِحَمْدِکَ، وَ تَبَارَکَ اسْمُکَ، وَ تَعَالٰی جَدُّکَ، وَ لَا إِلٰهَ غَیْرُکَ', fa: '(فقط رکعت اول) سپس تعوذ: أعوذُ باللهِ من الشیطانِ الرجیم', svg: 'qiyam' },
    { t: 'گام ۳ — سوره حمد', ar: 'الْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِینَ، الرَّحْمٰنِ الرَّحِیمِ، مٰلِکِ یَوْمِ الدِّین، إِیَّاکَ نَعْبُدُ وَ إِیَّاکَ نَسْتَعِینُ، اِهْدِنَا الصِّرٰطَ الْمُسْتَقِیمَ، صِرٰطَ الَّذِینَ أَنْعَمْتَ عَلَیْهِمْ غَیْرِ الْمَغْضُوبِ عَلَیْهِمْ وَ لَا الضَّالِّینَ — آمین', fa: 'بعد از حمد، یک سوره کوتاه (مثلاً اخلاص: قُلْ هُوَ اللهُ أَحَدٌ …) خوانده می‌شود', svg: 'qiyam' },
    { t: 'گام ۴ — رکوع', ar: 'سُبْحَانَ رَبِّیَ الْعَظِیم (۳ بار)', fa: 'دست‌ها با تکبیر بالا می‌رود و به رکوع می‌رویم (کمر ۹۰ درجه، دست‌ها به زانو). زن‌ها خم کمتر و دست‌ها روی زانو بدون بازکردن کامل.', svg: 'ruku' },
    { t: 'گام ۵ — سجده', ar: 'سُبْحَانَ رَبِّیَ الأَعْلٰی (۳ بار)', fa: 'با تکبیر به سجده می‌رویم: پیشانی و بینی، دو دست، دو زانو و انگشتان پا روی زمین. زن‌ها بدن نزدیک‌تر به زمین و جمع‌تر.', svg: 'sajdah' },
    { t: 'گام ۶ — نشستن بین دو سجده', ar: 'اللهُ أَکْبَر', fa: 'نشسته و بعد سجده دوم انجام می‌شود. بعد از سجده دوم: الله اکبر و بلندشدن به رکعت دوم.', svg: 'tashahhud' },
    { t: 'گام ۷ — رکعت دوم', ar: '', fa: 'مثل رکعت اول ولی فقط حمد + سوره (سنه و تعوذ خوانده نمی‌شود)', svg: 'qiyam' },
    { t: 'گام ۸ — تشهد اول', ar: 'التَّحِیَّاتُ لِلّٰهِ وَ الصَّلَوَاتُ وَ الطَّیِّبَاتُ، السَّلٰمُ عَلَیْکَ أَیُّهَا النَّبِیُّ وَ رَحْمَةُ اللهِ وَ بَرَکَاتُهُ، السَّلٰمُ عَلَیْنَا وَ عَلٰی عِبَادِ اللهِ الصَّٰلِحِین، أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ وَ أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ الله', fa: 'در رکعت ۲ (یا ۳ نماز ۳/۴ رکعتی) بعد از سجده دوم نشسته و تشهد خوانده می‌شود — انگشت اشاره هنگام لا إِلٰه بالا می‌آید و با إِلَّا الله پایین می‌آید.', svg: 'tashahhud' },
    { t: 'گام ۹ — سلام نماز', ar: 'السَّلٰمُ عَلَیْکُمْ وَ رَحْمَةُ الله', fa: 'سر نخست به راست، سپس به چپ. (در نمازهای ۳ رکعتی: تشهد + صلوات + سلام؛ در ۴ رکعتی بعد از تشهد دوم: صلوات + سلام) — صلوات: اللهُمَّ صَلِّ عَلٰی مُحَمَّدٍ وَ عَلٰی آلِ مُحَمَّدٍ کَمَا صَلَّیْتَ عَلٰی إِبْرٰهِیمَ وَ عَلٰی آلِ إِبْرٰهِیمَ إِنَّکَ حَمِیدٌ مَجِیدٌ', svg: 'salam' },
    { t: 'ذکر بعد نماز', ar: 'أَسْتَغْفِرُ الله (۳)، اللّٰهُمَّ أَنْتَ السَّلٰمُ وَ مِنْکَ السَّلٰمُ', fa: 'سُبْحَانَ الله ۳۳، الْحَمْدُ لِلّٰه ۳۳، اللهُ أَکْبَر ۳۴ — سپس آیةالکرسی و دعای سحرگاه/عصرگاه', svg: 'tashahhud' }
  ];

  var RAKAT_GUIDE = [
    { t: 'فجر — ۲ رکعت سنت (واجب)', fa: '۲ رکعت: سنه+حمد+سوره، رکوع، ۲ سجده، تشهد، سلام — مستحب مؤکد؛ بعد از آن نماز صبح (صبح) با جماعت' },
    { t: 'ظهر — ۴ رکعت سنت + ۴ فرض + ۲ سنت', fa: '۴ رکعت سنت اول، ۴ رکعت فرض (توسط امام بلند خوانده نمی‌شود)، ۲ رکعت سنت آخر' },
    { t: 'عصر — ۴ رکعت سنت + ۴ فرض', fa: '۴ رکعت سنت و ۴ رکعت فرض — قبل از غروب' },
    { t: 'مغرب — ۳ فرض + ۲ سنت', fa: '۳ رکعت فرض (بعد از تشهد اول برای رکعت ۳ برمی‌گردیم) + ۲ سنت' },
    { t: 'عشا — ۴ فرض + ۲ سنت + وتر ۳', fa: '۴ فرض + ۲ سنت + ۳ رکعت وتر (واجب) — قنوت وتر در رکعت سوم قبل از رکوع: اللّٰهُمَّ إِنَّا نَسْتَعِینُکَ…' },
    { t: 'جمعه — ۲ خطبه + ۲ فرض', fa: 'جماعت واجب؛ به‌جای ظهر — خطبه‌ها ۲ با نشست بین‌شان، بعد ۲ رکعت فرض بلند' }
  ];

  var PRAISE = { ar: 'الْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِین، الرَّحْمٰنِ الرَّحِیمِ، مٰلِکِ یَوْمِ الدِّین' };

  global.BXLessons = {
    figure: figure,
    wudu: WUDU_STEPS,
    salat: SALAT_STEPS,
    rakat: RAKAT_GUIDE
  };
})(typeof window !== 'undefined' ? window : this);

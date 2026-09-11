/* ============================================================
   Balochistan Nama - Events database (events.js)
   Holidays + named days for all 3 calendars (Jalali, Gregorian,
   Hijri/Sunni) plus a special Baloch culture section.
   ============================================================ */

(function (global) {
  'use strict';

  /* ============================================================
     Each event has:
       cal: 'jalali' | 'gregorian' | 'hijri'  (which calendar it recurs on)
       date: 'M/D' (month/day, recurring) - day-of-month for fixed-date events
              or 'julianDay' for one-off events (we use only recurring here)
       title: short title (Persian)
       desc: longer description (Persian)
       tags: array of { official, sunni, shia, baloch, national, international, religious }
       type: 'holiday' (تعطیل) | 'observance' (مناسبت) | 'fast' (روزه مستحب)
   ============================================================ */

  // ----- Official Iranian holidays + national days (Jalali fixed) -----
  const JALALI_EVENTS = [
    { d: '1/1',  title: 'جشن نوروز و آغاز سال نو',                  type: 'holiday',  tags: { official: true, national: true } },
    { d: '1/2',  title: 'عید نوروز',                                type: 'holiday',  tags: { official: true } },
    { d: '1/3',  title: 'عید نوروز',                                type: 'holiday',  tags: { official: true } },
    { d: '1/4',  title: 'عید نوروز',                                type: 'holiday',  tags: { official: true } },
    { d: '1/6',  title: 'روز امید، روز شادباش‌نویسی؛ زادروز زرتشت', type: 'observance', tags: { national: true } },
    { d: '1/12', title: 'روز جمهوری اسلامی',                        type: 'holiday',  tags: { official: true, national: true } },
    { d: '1/13', title: 'جشن سیزده‌بدر، روز طبیعت',                 type: 'holiday',  tags: { official: true, national: true } },
    { d: '1/18', title: 'روز سلامت',                                type: 'observance', tags: {} },
    { d: '1/25', title: 'روز بزرگداشت عطار نیشابوری و منابع انسانی', type: 'observance', tags: { national: true } },
    { d: '1/29', title: 'روز ارتش جمهوری اسلامی ایران',             type: 'observance', tags: { national: true } },
    { d: '2/1',  title: 'روز بزرگداشت سعدی',                        type: 'observance', tags: { national: true } },
    { d: '2/2',  title: 'روز زمین پاک',                             type: 'observance', tags: { international: true } },
    { d: '2/3',  title: 'روز بزرگداشت شیخ بهایی، روز کارآفرینی و روز معمار', type: 'observance', tags: { national: true } },
    { d: '2/10', title: 'روز ملی خلیج فارس',                        type: 'observance', tags: { national: true } },
    { d: '2/12', title: 'کشته‌شدن مرتضی مطهری، روز معلم',           type: 'observance', tags: { national: true } },
    { d: '2/15', title: 'جشن میانه بهار، روز شیراز',                type: 'observance', tags: { national: true } },
    { d: '2/25', title: 'روز بزرگداشت فردوسی',                      type: 'observance', tags: { national: true } },
    { d: '2/28', title: 'روز بزرگداشت حکیم عمر خیام',                type: 'observance', tags: { national: true } },
    { d: '3/3',  title: 'فتح خرمشهر، روز مقاومت و ایثار',           type: 'observance', tags: { national: true } },
    { d: '3/14', title: 'درگذشت سید روح‌الله خمینی',                type: 'holiday',  tags: { official: true, national: true } },
    { d: '3/15', title: 'قیام ۱۵ خرداد',                            type: 'holiday',  tags: { official: true, national: true } },
    { d: '3/27', title: 'روز جهاد کشاورزی',                         type: 'observance', tags: { national: true } },
    { d: '4/1',  title: 'جشن آب‌پاشونک، آغاز تابستان، روز اصناف',   type: 'observance', tags: { national: true } },
    { d: '4/13', title: 'تیرروز، جشن تیرگان',                       type: 'observance', tags: { national: true } },
    { d: '4/14', title: 'روز قلم',                                  type: 'observance', tags: { national: true } },
    { d: '5/14', title: 'صدور فرمان مشروطیت',                       type: 'observance', tags: { national: true } },
    { d: '5/17', title: 'روز خبرنگار',                              type: 'observance', tags: { national: true } },
    { d: '5/28', title: 'سالروز کودتای ۲۸ مرداد و فاجعه سینما رکس آبادان', type: 'observance', tags: { national: true } },
    { d: '6/1',  title: 'روز بزرگداشت ابوعلی سینا، روز پزشک',       type: 'observance', tags: { national: true } },
    { d: '6/13', title: 'روز بزرگداشت ابوریحان بیرونی',             type: 'observance', tags: { national: true } },
    { d: '6/17', title: 'واقعه ۱۷ شهریور',                          type: 'observance', tags: { national: true } },
    { d: '6/19', title: 'درگذشت سید محمود طالقانی',                 type: 'observance', tags: { national: true } },
    { d: '6/21', title: 'روز سینما',                                type: 'observance', tags: { national: true } },
    { d: '6/27', title: 'روز شعر و ادب پارسی، بزرگداشت شهریار',     type: 'observance', tags: { national: true } },
    { d: '6/30', title: 'روز گفتگوی تمدن‌ها و روز جهانی صلح',       type: 'observance', tags: { international: true } },
    { d: '7/8',  title: 'روز بزرگداشت مولوی',                       type: 'observance', tags: { national: true } },
    { d: '7/13', title: 'روز نیروی انتظامی',                        type: 'observance', tags: { national: true } },
    { d: '7/16', title: 'مهرروز، جشن مهرگان، روز ملی کودک',         type: 'observance', tags: { national: true } },
    { d: '7/20', title: 'روز بزرگداشت حافظ',                        type: 'observance', tags: { national: true } },
    { d: '7/26', title: 'روز تربیت بدنی و ورزش',                    type: 'observance', tags: { national: true } },
    { d: '8/10', title: 'آبان‌روز، جشن آبانگان',                    type: 'observance', tags: { national: true } },
    { d: '8/13', title: 'روز دانش‌آموز',                            type: 'observance', tags: { national: true } },
    { d: '8/24', title: 'روز کتاب و کتاب‌خوانی',                     type: 'observance', tags: { national: true } },
    { d: '9/1',  title: 'روز اصفهان، آذر جشن',                      type: 'observance', tags: { national: true } },
    { d: '9/5',  title: 'روز بسیج مستضعفان',                        type: 'observance', tags: { national: true } },
    { d: '9/9',  title: 'جشن آذرگان',                               type: 'observance', tags: { national: true } },
    { d: '9/16', title: 'روز دانشجو',                               type: 'observance', tags: { national: true } },
    { d: '9/30', title: 'شب یلدا، جشن چله',                         type: 'observance', tags: { national: true } },
    { d: '10/1', title: 'میلاد خورشید، نخستین جشن دیگان (خرم‌روز)', type: 'observance', tags: { national: true } },
    { d: '10/11',title: 'روز مادر و روز زن',                        type: 'observance', tags: { national: true } },
    { d: '10/15',title: 'جشن میانه زمستان',                         type: 'observance', tags: { national: true } },
    { d: '10/22',title: 'پیروزی انقلاب اسلامی ۱۳۵۷',                type: 'holiday',  tags: { official: true, national: true } },
    { d: '11/2', title: 'بهمن‌روز، جشن بهمنگان',                    type: 'observance', tags: { national: true } },
    { d: '11/5', title: 'روز پدر و مرد',                            type: 'observance', tags: { national: true } },
    { d: '12/2', title: 'روز جهانی زبان مادری',                     type: 'observance', tags: { international: true, baloch: true } },
    { d: '12/5', title: 'روز بزرگداشت زمین و بانوان و روز مهندس',   type: 'observance', tags: { national: true } },
    { d: '12/15',title: 'روز درختکاری',                            type: 'observance', tags: { national: true } },
    { d: '12/18',title: 'روز جهانی زنان',                          type: 'observance', tags: { international: true } },
    { d: '12/29',title: 'ملی‌شدن صنعت نفت',                         type: 'holiday',  tags: { official: true, national: true } },
    { d: '12/30',title: 'جشن پایان سال (آخرین روز اسفند)',          type: 'observance', tags: { national: true } }
  ];

  // ----- Gregorian / International days -----
  const GREGORIAN_EVENTS = [
    { d: '1/1',  title: 'روز نخست سال نو میلادی',           type: 'observance', tags: { international: true } },
    { d: '1/27', title: 'روز جهانی یادبود قربانیان هولوکاست', type: 'observance', tags: { international: true } },
    { d: '2/4',  title: 'روز جهانی سرطان',                  type: 'observance', tags: { international: true } },
    { d: '2/11', title: 'روز جهانی زنان و دختران در علم',  type: 'observance', tags: { international: true } },
    { d: '2/14', title: 'روز ولنتاین (عشق)',               type: 'observance', tags: { international: true } },
    { d: '2/21', title: 'روز جهانی زبان مادری',             type: 'observance', tags: { international: true, baloch: true } },
    { d: '3/2',  title: 'روز جهانی فرهنگ بلوچ',             type: 'observance', tags: { baloch: true, international: true }, desc: 'بلوچ‌های سراسر جهان هر سال ۲ مارس روز بزرگداشت فرهنگ بلوچ را با موسیقی، رقص سنتی، خواندن اشعار بلوچی و گردهمایی خانواده‌ها جشن می‌گیرند.' },
    { d: '3/8',  title: 'روز جهانی زنان',                  type: 'observance', tags: { international: true } },
    { d: '3/21', title: 'نوروز (شروع بهار)',               type: 'observance', tags: { international: true } },
    { d: '3/22', title: 'روز جهانی آب',                    type: 'observance', tags: { international: true } },
    { d: '4/7',  title: 'روز جهانی بهداشت',                type: 'observance', tags: { international: true } },
    { d: '4/22', title: 'روز زمین',                       type: 'observance', tags: { international: true } },
    { d: '5/1',  title: 'روز جهانی کارگر',                 type: 'observance', tags: { international: true } },
    { d: '5/5',  title: 'روز جهانی ماما',                  type: 'observance', tags: { international: true } },
    { d: '5/8',  title: 'روز جهانی صلیب سرخ و هلال احمر',  type: 'observance', tags: { international: true } },
    { d: '5/15', title: 'روز جهانی خانواده',               type: 'observance', tags: { international: true } },
    { d: '5/17', title: 'روز جهانی مخابرات و جامعه اطلاعاتی', type: 'observance', tags: { international: true } },
    { d: '5/31', title: 'روز جهانی بدون دخانیات',          type: 'observance', tags: { international: true } },
    { d: '6/5',  title: 'روز جهانی محیط‌زیست',             type: 'observance', tags: { international: true } },
    { d: '6/12', title: 'روز جهانی کودکان کار',            type: 'observance', tags: { international: true } },
    { d: '6/14', title: 'روز جهانی اهدای خون',             type: 'observance', tags: { international: true } },
    { d: '6/21', title: 'روز جهانی موسیقی',                type: 'observance', tags: { international: true } },
    { d: '6/26', title: 'روز جهانی مبارزه با مواد مخدر',   type: 'observance', tags: { international: true } },
    { d: '7/11', title: 'روز جهانی جمعیت',                 type: 'observance', tags: { international: true } },
    { d: '8/19', title: 'روز جهانی عکاسی',                 type: 'observance', tags: { international: true } },
    { d: '8/21', title: 'روز جهانی بزرگداشت شهید',         type: 'observance', tags: { international: true } },
    { d: '9/8',  title: 'روز جهانی سوادآموزی',             type: 'observance', tags: { international: true } },
    { d: '9/21', title: 'روز جهانی صلح',                   type: 'observance', tags: { international: true } },
    { d: '9/27', title: 'روز جهانی جهانگردی',              type: 'observance', tags: { international: true } },
    { d: '10/5', title: 'روز جهانی معلم',                  type: 'observance', tags: { international: true } },
    { d: '10/10',title: 'روز جهانی بهداشت روان',           type: 'observance', tags: { international: true } },
    { d: '10/16',title: 'روز جهانی غذا',                   type: 'observance', tags: { international: true } },
    { d: '10/24',title: 'روز جهانی استاندارد',             type: 'observance', tags: { international: true } },
    { d: '11/20',title: 'روز جهانی کودک',                 type: 'observance', tags: { international: true } },
    { d: '12/1', title: 'روز جهانی ایدز',                  type: 'observance', tags: { international: true } },
    { d: '12/3', title: 'روز جهانی معلولان',               type: 'observance', tags: { international: true } },
    { d: '12/10',title: 'روز جهانی حقوق بشر',             type: 'observance', tags: { international: true } },
    { d: '12/25',title: 'کریسمس',                         type: 'observance', tags: { international: true } }
  ];

  /* ============================================================
     Hijri / Islamic events - separated into:
     (a) official Iranian (Shia) holidays - the user is Sunni but
         these are official days off in Iran, so we keep them with
         a clear "شیعه/تعطیل رسمی ایران" label for the user's info.
     (b) Sunni observances (Eid al-Fitr, Eid al-Adha, Mawlid, etc.)
     (c) Sunni recommended fasts (Arafah, Ashura, Muharram 9-10, etc.)
     ============================================================ */
  const HIJRI_EVENTS = [
    // (b) + (c) Sunni observances first - the user's primary tradition
    { d: '1/1',  title: 'آغاز سال هجری قمری، آغاز ماه محرم',          type: 'observance', tags: { sunni: true, religious: true }, desc: 'آغاز سال نو هجری قمری - ایامی برای تفکر و پندآموزی.' },
    { d: '1/9',  title: 'روزه تاسوعا (سنت)',                          type: 'fast',        tags: { sunni: true, religious: true }, desc: 'روزه‌ی مستحب نهم محرم، همراه با روزه‌ی عاشورا.' },
    { d: '1/10', title: 'روزه عاشورا (سنت)',                          type: 'fast',        tags: { sunni: true, religious: true }, desc: 'پیامبر اکرم (ص) این روز را روزه می‌گرفت به یاد نجات موسی (ع) از فرعون.' },
    { d: '3/12', title: 'میلاد پیامبر اکرم (ص) - عید سعید مولود',    type: 'observance',   tags: { sunni: true, religious: true, official: true }, desc: 'زادروز پیامبر اسلام حضرت محمد مصطفی (ص) - در ایران تعطیل رسمی است و اهل سنت آن را با جشن، مدحه‌سرایی و اجتماعات بزرگ جشن می‌گیرند.' },
    { d: '3/8',  title: 'روز بزرگداشت امام حسن عسکری (شیعه)',        type: 'holiday',      tags: { shia: true, religious: true, official: true } },
    { d: '5/15', title: 'زادروز امام مهدی (شیعه - ۱۵ شعبان)',          type: 'observance',   tags: { shia: true, religious: true } },
    { d: '6/3',  title: 'شهادت حضرت فاطمه زهرا (س) (شیعه - تعطیل رسمی)', type: 'holiday',  tags: { shia: true, religious: true, official: true } },
    { d: '7/13', title: 'زادروز امام علی (ع) (شیعه)',                 type: 'observance',   tags: { shia: true, religious: true } },
    { d: '7/27', title: 'لیله الاسرا والمعراج - شب معراج پیامبر (ص)', type: 'observance',   tags: { sunni: true, religious: true }, desc: 'شب اسراء و معراج - معراج پیامبر اکرم (ص) به آسمان‌ها.' },
    { d: '7/27', title: 'مبعث پیامبر (ص) (تعطیل رسمی ایران)',         type: 'holiday',      tags: { official: true, shia: true, religious: true } },
    { d: '8/15', title: 'ليلة البراءة (نیمه شعبان)',                 type: 'observance',   tags: { sunni: true, religious: true } },
    { d: '9/1',  title: 'آغاز ماه مبارک رمضان - آغاز روزه‌داری',    type: 'observance',   tags: { sunni: true, religious: true }, desc: 'آغاز ماه مبارک رمضان، ماه روزه و قرآن.' },
    { d: '9/17', title: 'نزول قرآن - فتح بدر (سنت)',                 type: 'observance',   tags: { sunni: true, religious: true } },
    { d: '9/19', title: 'لیله القدر (شب ۱۹)',                        type: 'observance',   tags: { sunni: true, religious: true } },
    { d: '9/21', title: 'لیله القدر (شب ۲۱)',                        type: 'observance',   tags: { sunni: true, religious: true } },
    { d: '9/21', title: 'شهادت امام علی (ع) (شیعه - تعطیل رسمی)',     type: 'holiday',      tags: { shia: true, religious: true, official: true } },
    { d: '9/23', title: 'لیله القدر (شب ۲۳)',                        type: 'observance',   tags: { sunni: true, religious: true } },
    { d: '9/25', title: 'لیله القدر (شب ۲۵)',                        type: 'observance',   tags: { sunni: true, religious: true } },
    { d: '9/27', title: 'لیله القدر (شب ۲۷) - شب قدر',              type: 'observance',   tags: { sunni: true, religious: true }, desc: 'شب قدر - شب‌ای بهتر از هزار ماه، نزول قرآن.' },
    { d: '9/29', title: 'لیله القدر (شب ۲۹)',                        type: 'observance',   tags: { sunni: true, religious: true } },
    { d: '10/1', title: 'عید سعید فطر - پایان ماه رمضان',           type: 'holiday',      tags: { sunni: true, religious: true, official: true }, desc: 'عید سعید فطر - جشن بزرگ پایان روزه ماه مبارک رمضان. اهل سنت با نماز عید، صدقه فطر، پوشیدن لباس نو و دیدو بازدید خانوادگی جشن می‌گیرند.' },
    { d: '10/2', title: 'عید سعید فطر (روز دوم)',                    type: 'holiday',      tags: { official: true, religious: true } },
    { d: '10/25',title: 'درگذشت امام جعفر صادق (ع) (شیعه)',         type: 'observance',   tags: { shia: true, religious: true } },
    { d: '12/9', title: 'روزه روز عرفه (سنت - مستحب)',               type: 'fast',         tags: { sunni: true, religious: true }, desc: 'روزه‌ی روز عرفه (۹ ذیحجه) - کفاره‌ی گناهان سال پیش و آینده.' },
    { d: '12/10',title: 'عید سعید اضحی (قربان)',                    type: 'holiday',      tags: { sunni: true, religious: true, official: true }, desc: 'عید سعید قربان - یادبخش اخلاص حضرت ابراهیم (ع) و فرزندش اسماعیل (ع). اهل سنت با نماز عید، قربانی، توزیع گوشت میان نیازمندان و دیدو بازدید جشن می‌گیرند.' },
    { d: '12/18',title: 'عید غدیر خم (شیعه - تعطیل رسمی)',           type: 'holiday',      tags: { shia: true, religious: true, official: true } },
    { d: '12/11-13',title: 'ایام تشریق (سنت)',                       type: 'observance',   tags: { sunni: true, religious: true }, desc: 'روزهای ۱۱ تا ۱۳ ذیحجه - ایام تشریق، ادامه عید قربان.' }
  ];

  // Monthly Friday events (last Friday of Ramadan = Quds, etc.)
  const RECURRING_EVENTS = [
    { d: 'friday/last_ramadan', title: 'روز جهانی قدس', type: 'observance', tags: { international: true, religious: true }, desc: 'آخرین جمعه ماه رمضان - روز قدس.' }
  ];

  /* ============================================================
     Baloch culture section - dedicated, marked with baloch: true
     The user is Baloch Sunni from Lashar county, Sistan & Baluchestan.
     Includes: language day, culture day, Nowruz Balochi, Sibi Mela,
     poet commemorations (Gul Khan Nasir, Atta Shad, Zahoor Shah Hashmi).
     ============================================================ */
  const BALOCH_EVENTS = [
    { d: 'greg/2/21',  title: 'روز جهانی زبان مادری بلوچی',           type: 'observance', tags: { baloch: true }, desc: 'بلوچی یکی از زبان‌های ایرانی غربی است که بیش از ۱۰ میلیون بلوچ بدان سخن می‌گوید. این روز فرصتی برای پاسداشت زبان مادری بلوچی است.' },
    { d: 'greg/3/2',   title: 'روز جهانی فرهنگ بلوچ',                 type: 'observance', tags: { baloch: true }, desc: 'هر ساله ۲ مارس - روز پاسداشت فرهنگ بلوچ با موسیقی سنتی، رقص، شعر بلوچی، پوشش سنتی و صنایع‌دستی برگزار می‌شود.' },
    { d: 'jalali/1/1', title: 'جشن نوروز بلوچی - جشن بهارگاه',        type: 'observance', tags: { baloch: true }, desc: 'بلوچ‌ها نوروز را با آیین‌های خاص خود - موسیقی محلی، رقص سنتی (چاپ و دف)، گردهمایی خانواده‌ها در دشت‌ها، شیرینی‌های بلوچی (لانگک، کلوچه) و پوشیدن لباس سنتی بلوچی جشن می‌گیرند.' },
    { d: 'greg/2/19-22',title:'جشنواره فرهنگی سبی (Sibi Mela)',       type: 'observance', tags: { baloch: true, international: true }, desc: 'بزرگ‌ترین جشنواره فرهنگی بلوچ‌ها در شهر سبی بلوچستان پاکستان برگزار می‌شود.' },
    // جشن‌های سنتی بلوچی
    { d: 'jalali/1/1',  title: 'جشن سیت (Seyt) - آغاز سال نو بلوچی',   type: 'observance', tags: { baloch: true }, desc: 'جشن سنتی بلوچی همزمان با نوروز، مراسم خانه‌تکانی، پخت شیرینی‌های محلی (لانگک، بولانی) و دید و بازدید.' },
    { d: 'jalali/4/1',  title: 'جشن سوج (Sūj) - جشن برداشت محصول',    type: 'observance', tags: { baloch: true }, desc: 'جشن سنتی برداشت محصول در بلوچستان. مردم بلوچ با پخت غذاهای محلی و رقص‌های سنتی (چاپ) این روز را جشن می‌گیرند.' },
    { d: 'jalali/7/1',  title: 'جشن لوک مهمونی (Lok Mehmani)',        type: 'observance', tags: { baloch: true }, desc: 'جشن گردهمایی بزرگ بلوچ‌ها با موسیقی محلی، شعرخوانی، صنایع‌دستی و غذاهای سنتی بلوچی.' },
    { d: 'jalali/7/16', title: 'مهرگان بلوچی - جشن پاییزی بلوچ',       type: 'observance', tags: { baloch: true }, desc: 'بلوچ‌ها مهرگان را با موسیقی، رقص، گردهمایی و شکرگزاری برای نعمت‌های پاییز جشن می‌گیرند. نماد آن گل‌های وحشی بلوچستان است.' },
    { d: 'jalali/1/13', title: 'سیزده‌بدر بلوچی',                     type: 'observance', tags: { baloch: true }, desc: 'روز طبیعت در فرهنگ بلوچی - گردهمایی خانواده‌ها در طبیعت و دشت‌ها.' },
    { d: 'jalali/9/30', title: 'شب یلدا در فرهنگ بلوچی',              type: 'observance', tags: { baloch: true }, desc: 'بلوچ‌ها یلدا (شب چله) را با خوردن انار و هندوانه، خواندن داستان‌های بلوچی و آوازهای محلی پاس می‌دارند.' },
    // چهره‌های بلوچ
    { d: 'jalali/2/14', title: 'زادروز میر گل خان نصیر',              type: 'observance', tags: { baloch: true }, desc: 'میر گل خان نصیر (۱۴ مه ۱۹۱۴ - ۶ دسامبر ۱۹۸۳)، شاعر، مورخ، سیاست‌مدار و روزنامه‌نگار بلوچ از نوشکی. لقب «ملک‌الشعرای بلوچستان» داشت.' },
    { d: 'jalali/9/15', title: 'درگذشت میر گل خان نصیر',             type: 'observance', tags: { baloch: true }, desc: 'سالروز درگذشت (۶ دسامبر ۱۹۸۳) ملک‌الشعرای بلوچستان در کراچی.' },
    { d: 'jalali/9/10', title: 'زادروز عطا شاد - شاعر بلوچ',          type: 'observance', tags: { baloch: true }, desc: 'عطا شاد (۱ نوامبر ۱۹۳۹ - ۱۳ فوریه ۱۹۹۷)، شاعر بلوچ از مکران.' },
    { d: 'jalali/11/24',title: 'درگذشت عطا شاد',                     type: 'observance', tags: { baloch: true }, desc: 'سالروز درگذشت (۱۳ فوریه ۱۹۹۷) استاد عطا شاد.' },
    { d: 'jalali/2/1', title: 'زادروز سید ظهور شاه هاشمی',            type: 'observance', tags: { baloch: true }, desc: 'سید ظهور شاه هاشمی (۲۱ آوریل ۱۹۲۶ گوادر - ۴ مارس ۱۹۷۸ کراچی)، ادیب، لغت‌شناس و شاعر بزرگ بلوچ.' },
    { d: 'jalali/12/14',title: 'درگذشت سید ظهور شاه هاشمی',          type: 'observance', tags: { baloch: true } },
    { d: 'jalali/3/15', title: 'جشن میانه بهار بلوچی',                type: 'observance', tags: { baloch: true } },
    // چهره‌های جدید
    { d: 'jalali/6/5',  title: 'زادروز هانی بلوچ - شاعر و نویسنده بلوچ', type: 'observance', tags: { baloch: true }, desc: 'هانی بلوچ (هانی فهیم)، شاعر و نویسنده معاصر بلوچ که اشعارش به زبان‌های بلوچی، اردو و انگلیسی سروده شده است. آثارش بازتاب فرهنگ و هویت بلوچی است.' },
    { d: 'jalali/8/20', title: 'زادروز شهداد کمال - شاعر بلوچ',       type: 'observance', tags: { baloch: true }, desc: 'شهداد کمال (Kamal Khan Shahdad) شاعر نامدار بلوچ از پاکستان، با اشعار عاشقانه و میهنی بلوچی شناخته شده است.' },
    { d: 'jalali/4/10', title: 'زادروز دهاندار - قهرمان ملی بلوچ',    type: 'observance', tags: { baloch: true }, desc: 'دهاندار (Dahandar) از قهرمانان اسطوره‌ای و دلیران تاریخ بلوچستان که در دفاع از خاک و ناموس بلوچ جانفشانی کرد.' },
    { d: 'jalali/5/20', title: 'روز فرهنگ براهوئی',                  type: 'observance', tags: { baloch: true }, desc: 'روز پاسداشت فرهنگ و زبان براهوئی (Brahui) - یکی از اقوام کهن بلوچستان با زبان دراویدی.' },
    // رویدادهای تاریخی
    { d: 'greg/8/11',  title: 'یوم‌البلوچ - روز بزرگداشت بلوچ',         type: 'observance', tags: { baloch: true }, desc: 'این روز توسط کنفدراسیون جهانی بلوچ به عنوان روز بزرگداشت هویت و یکپارچگی بلوچ‌ها نام‌گذاری شده است.' },
    { d: 'jalali/3/1',  title: 'روز مکران - روز تاریخ بلوچستان',      type: 'observance', tags: { baloch: true }, desc: 'مکران (بلوچستان جنوبی) یکی از کهن‌ترین تمدن‌های جهان با قدمت ۴۰۰۰ سال پیش از میلاد.' },
    { d: 'jalali/12/2', title: 'روز جهانی زبان مادری بلوچی',          type: 'observance', tags: { baloch: true, international: true }, desc: 'زبان بلوچی از شاخه زبان‌های ایرانی شمال غربی، با بیش از ۱۰ میلیون گویشور در ایران، پاکستان، افغانستان و کشورهای حاشیه خلیج فارس.' }
  ];

  /* ============================================================
     Hijri adjustment: user can shift tabular dates by ±2 days
     to match actual moon-sighting (very important for Sunni users).
     The events list above uses 'd' = "M/D" strings; the engine
     applies the user's chosen adjustment when querying hijri events.
     ============================================================ */

  // Local Sistan & Baluchestan events (greg/M/D or jalali/M/D)
  const SISTAN_BALUCHISTAN_EVENTS = [
    { d: 'greg/1/22', title: 'سالروز تأسیس استان سیستان و بلوچستان', type: 'observance', tags: { local: true } },
    { d: 'jalali/10/1', title: 'جشنواره صنایع‌دستی و سوغات بلوچستان', type: 'observance', tags: { local: true, baloch: true } },
    { d: 'jalali/9/1', title: 'شب چله (یلدا) در بلوچستان', type: 'observance', tags: { local: true, baloch: true } },
    { d: 'jalali/1/1', title: 'آیین‌های نوروز در سیستان و بلوچستان', type: 'observance', tags: { local: true, baloch: true } },
    { d: 'greg/3/2', title: 'روز جهانی فرهنگ بلوچ - همایش‌های استانی', type: 'observance', tags: { local: true, baloch: true } }
  ];

  /* ---------- Query API ----------
     getEvents(jalaliDate, gregDate, hijriDate, hijriAdjust, options)
       -> returns array of events for the given day across all 3 calendars + Baloch
       jalaliDate, gregDate, hijriDate are {y, m, d} objects (already adjusted for hijri)
     Event record shape:
       { cal, d (original date key), title, desc, type, tags, displayDate }
  */
  function matchEvents(eventsArr, m, d, cal, userOpts) {
    const out = [];
    for (const e of eventsArr) {
      const [em, ed] = e.d.split('/');
      if (parseInt(em, 10) === m && parseInt(ed, 10) === d) {
        out.push(Object.assign({ cal: cal }, e));
      }
    }
    return out;
  }

  // Match a date range like "8-13" (used for ایام تشریق)
  function matchRangeEvents(eventsArr, m, d, cal) {
    const out = [];
    for (const e of eventsArr) {
      const parts = e.d.split('/');
      if (parts.length !== 2) continue;
      const em = parseInt(parts[0], 10);
      if (em !== m) continue;
      const dPart = parts[1];
      const dashIdx = dPart.indexOf('-');
      if (dashIdx >= 0) {
        const dStart = parseInt(dPart.slice(0, dashIdx), 10);
        const dEnd = parseInt(dPart.slice(dashIdx + 1), 10);
        if (d >= dStart && d <= dEnd) out.push(Object.assign({ cal: cal }, e));
      } else if (dPart === String(d)) {
        out.push(Object.assign({ cal: cal }, e));
      }
    }
    return out;
  }

  function getDayEvents(j, g, h, opts) {
    opts = opts || {};
    const out = [];
    // Jalali
    const je = matchRangeEvents(JALALI_EVENTS, j.jm, j.jd, 'jalali');
    for (const e of je) out.push(e);
    // Gregorian
    const ge = matchRangeEvents(GREGORIAN_EVENTS, g.gm, g.gd, 'gregorian');
    for (const e of ge) out.push(e);
    // Hijri
    const he = matchRangeEvents(HIJRI_EVENTS, h.hm, h.hd, 'hijri');
    for (const e of he) out.push(e);
    // Baloch events use prefix 'greg/', 'jalali/' (supports day ranges like 19-22)
    for (const e of BALOCH_EVENTS) {
      const slash = e.d.indexOf('/');
      const calKey = e.d.slice(0, slash);          // 'greg' or 'jalali'
      const rest = e.d.slice(slash + 1);
      const [bm, bd] = rest.split('/');
      const bmNum = parseInt(bm, 10);
      let match = false;
      const checkDay = function (day) {
        if (String(bd).indexOf('-') >= 0) {
          const dash = String(bd).indexOf('-');
          const dStart = parseInt(String(bd).slice(0, dash), 10);
          const dEnd = parseInt(String(bd).slice(dash + 1), 10);
          return day >= dStart && day <= dEnd;
        }
        return parseInt(bd, 10) === day;
      };
      if (calKey === 'greg' && bmNum === g.gm && checkDay(g.gd)) match = true;
      if (calKey === 'jalali' && bmNum === j.jm && checkDay(j.jd)) match = true;
      if (match) out.push(Object.assign({ cal: 'baloch' }, e));
    }
    // Local Sistan & Baluchestan (supports day ranges)
    for (const e of SISTAN_BALUCHISTAN_EVENTS) {
      const slash = e.d.indexOf('/');
      const calKey = e.d.slice(0, slash);
      const rest = e.d.slice(slash + 1);
      const [bm, bd] = rest.split('/');
      const bmNum = parseInt(bm, 10);
      let localMatch = false;
      const checkLocalDay = function (day) {
        if (String(bd).indexOf('-') >= 0) {
          const dash = String(bd).indexOf('-');
          const dStart = parseInt(String(bd).slice(0, dash), 10);
          const dEnd = parseInt(String(bd).slice(dash + 1), 10);
          return day >= dStart && day <= dEnd;
        }
        return parseInt(bd, 10) === day;
      };
      if ((calKey === 'greg' && bmNum === g.gm && checkLocalDay(g.gd)) ||
          (calKey === 'jalali' && bmNum === j.jm && checkLocalDay(j.jd))) {
        out.push(Object.assign({ cal: 'baloch' }, e));
      }
    }
    // Friday of Ramadan (Quds)
    if (opts.isFriday && opts.inRamadan) {
      out.push({ cal: 'recurring', d: 'friday/last_ramadan', title: 'روز جهانی قدس', type: 'observance', tags: { international: true, religious: true } });
    }
    return out;
  }

  // Friday = j.jsDay==5 (Sat=6) in JS getDay terms
  function isFriday(date) { return date.getDay() === 5; }

  // Filter by tag for "Baloch culture" tab listing
  function getAllBalochEvents() { return BALOCH_EVENTS.slice(); }

  // Get all events sorted for a given calendar year (for browsing)
  function listJalaliEvents() { return JALALI_EVENTS.slice(); }
  function listGregorianEvents() { return GREGORIAN_EVENTS.slice(); }
  function listHijriEvents() { return HIJRI_EVENTS.slice(); }

  const Events = {
    JALALI_EVENTS: JALALI_EVENTS,
    GREGORIAN_EVENTS: GREGORIAN_EVENTS,
    HIJRI_EVENTS: HIJRI_EVENTS,
    BALOCH_EVENTS: BALOCH_EVENTS,
    SISTAN_BALUCHISTAN_EVENTS: SISTAN_BALUCHISTAN_EVENTS,
    getDayEvents: getDayEvents,
    isFriday: isFriday,
    getAllBalochEvents: getAllBalochEvents,
    listJalaliEvents: listJalaliEvents,
    listGregorianEvents: listGregorianEvents,
    listHijriEvents: listHijriEvents
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Events;
  if (typeof window !== 'undefined') window.Events = Events;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

/* ============================================================
   کاتالوگ پس‌زمینهٔ صفحهٔ اذان — بلوچستان‌نما v1.20
   الگو: SalatTimes-Backgrounds — تصاویر لحظه‌ای از کاتالوگ لود می‌شن
   ⇒ حجم اپ ثابت می‌مونه و افزودن تصویر جدید بدون آپدیت اپ ممکنه
   (فایل کاتالوگ جایگزین بشه / از URL دورافتاده fetch بشه)
   همه تصاویر Wikimedia Commons با مجوز CC BY-SA — نسبت‌دهی در هر آیتم.
   ============================================================ */
(function () {
  'use strict';
  var FP = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
  function src(file) { return FP + encodeURIComponent(file) + '?width=960'; }

  window.ATHAN_BG_CATALOG = [
    {
      id: 'tiss',
      name: 'مسجد جامع تیس — چابهار',
      url: src('Chabahar Tiss Great Mosque.jpg'),
      credit: 'Nikat · Wikimedia Commons · CC BY-SA 3.0',
      page: 'https://commons.wikimedia.org/wiki/File:Chabahar_Tiss_Great_Mosque.jpg'
    },
    {
      id: 'gholam1',
      name: 'مسجد سید غلام رسول — چابهار',
      url: src('Seyyed Gholam Rasoul Mosque 1.JPG'),
      credit: 'Mehdi6767 · Wikimedia Commons · CC BY-SA 4.0',
      page: 'https://commons.wikimedia.org/wiki/File:Seyyed_Gholam_Rasoul_Mosque_1.JPG'
    },
    {
      id: 'gholam2',
      name: 'مسجد سید غلام رسول (۲) — چابهار',
      url: src('Seyyed Gholam Rasoul Mosque 2.JPG'),
      credit: 'Mehdi6767 · Wikimedia Commons · CC BY-SA 4.0',
      page: 'https://commons.wikimedia.org/wiki/File:Seyyed_Gholam_Rasoul_Mosque_2.JPG'
    },
    {
      id: 'nabi',
      name: 'مسجد نبی اکرم — چابهار',
      url: src('مسجد نبی اکرم دانشگاه دریانوردی و علوم دریایی چابهار.jpg'),
      credit: 'علی حقیقیان · Wikimedia Commons · CC BY-SA 4.0',
      page: 'https://commons.wikimedia.org/wiki/File:%D9%85%D8%B3%D8%AC%D8%AF_%D9%86%D8%A8%DB%8C_%D8%A7%DA%A9%D8%B1%D9%85_%D8%AF%D8%A7%D9%86%D8%B4%DA%AF%D8%A7%D9%87_%D8%AF%D8%B1%DB%8C%D8%A7%D9%86%D9%88%D8%B1%D8%AF%DB%8C_%D9%88_%D8%B9%D9%84%D9%88%D9%85_%D8%AF%D8%B1%DB%8C%D8%A7%DB%8C%DB%8C_%D9%86%D8%A8%DB%8C_%D8%A7%DA%A9%D8%B1%D9%85.jpg'
    },
    {
      id: 'lateef',
      name: 'مسجد لطیف — بلوچستان',
      url: src('Area of Mosque of Lateef. Balochistan.jpg'),
      credit: 'LahootiHyderi · Wikimedia Commons · CC BY-SA 4.0',
      page: 'https://commons.wikimedia.org/wiki/File:Area_of_Mosque_of_Lateef._Balochistan.jpg'
    },
    {
      id: 'nasir',
      name: 'مسجد نصیرالملک — شیراز',
      url: src('Mezquita de Nasirolmolk, Shiraz, Irán, 2016-09-24, DD 57-59 HDR.jpg'),
      credit: 'Diego Delso · Wikimedia Commons · CC BY-SA 4.0',
      page: 'https://commons.wikimedia.org/wiki/File:Mezquita_de_Nasirolmolk,_Shiraz,_Ir%C3%A1n,_2016-09-24,_DD_57-59_HDR.jpg'
    },
    {
      id: 'shah',
      name: 'مسجد شاه — اصفهان',
      url: src('Mezquita Shah, Isfahán, Irán, 2016-09-20, DD 65-67 HDR.jpg'),
      credit: 'Diego Delso · Wikimedia Commons · CC BY-SA 4.0',
      page: 'https://commons.wikimedia.org/wiki/File:Mezquita_Shah,_Isfah%C3%A1n,_Ir%C3%A1n,_2016-09-20,_DD_65-67_HDR.jpg'
    },
    {
      id: 'aghazorg',
      name: 'مسجد آقا بزرگ — کاشان',
      url: src('Agha Bozorg mosque, Kashan.jpg'),
      credit: 'Bernard Gagnon · Wikimedia Commons · CC BY-SA 4.0',
      page: 'https://commons.wikimedia.org/wiki/File:Agha_Bozorg_mosque,_Kashan.jpg'
    }
  ];
})();

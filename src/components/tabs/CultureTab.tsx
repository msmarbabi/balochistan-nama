'use client';

import { useState } from 'react';
import {
  BookOpen, UtensilsCrossed, Scissors, Gamepad2, Sprout, Map, Music, ChevronLeft, ChevronRight, Info,
} from 'lucide-react';
import { toPersianDigits } from '@/lib/calendar-utils';
import { poems, getDailyPoem } from '@/lib/poetry-data';

// ============================================
// Types
// ============================================

interface CultureTabProps {
  isDark: boolean;
  themeColor: string;
  themeGradient: string;
}

type SubTab = 'poetry' | 'recipes' | 'embroidery' | 'games' | 'agriculture' | 'map' | 'sounds';

// ============================================
// Data
// ============================================

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'poetry', label: 'اشعار', icon: <BookOpen size={16} /> },
  { id: 'recipes', label: 'غذاها', icon: <UtensilsCrossed size={16} /> },
  { id: 'embroidery', label: 'گلدوزی', icon: <Scissors size={16} /> },
  { id: 'games', label: 'بازی‌ها', icon: <Gamepad2 size={16} /> },
  { id: 'agriculture', label: 'کشاورزی', icon: <Sprout size={16} /> },
  { id: 'map', label: 'نقشه', icon: <Map size={16} /> },
  { id: 'sounds', label: 'صداها', icon: <Music size={16} /> },
];

// Baluchi Recipes
const RECIPES = [
  {
    name: 'سجبُکی',
    baluchiName: 'سجبیکی',
    description: 'نوعی نان سنتی بلوچی که روی سنگ داغ پخته می‌شود. این نان از آرد گندم، آب و نمک تهیه شده و طعم خاصی دارد که در رویدادها و مهمانی‌های بلوچی سرو می‌شود.',
    ingredients: ['آرد گندم', 'آب', 'نمک', 'روغن حیوانی'],
    season: 'همه فصل‌ها',
  },
  {
    name: 'کابلی پلو',
    baluchiName: 'کابلی پیلاؤ',
    description: 'برنجی که با رشته، کشمش، زعفران و خرما پخته می‌شود. این غذا یکی از معروف‌ترین غذاهای بلوچی است که در عروسی‌ها و اعیاد سرو می‌شود.',
    ingredients: ['برنج', 'رشته', 'کشمش', 'زعفران', 'خرما', 'گوشت', 'پیاز', 'ادویه'],
    season: 'همه فصل‌ها',
  },
  {
    name: 'لَتُک',
    baluchiName: 'لتّک',
    description: 'خورش سنتی بلوچی با گوجه‌فرنگی، پیاز و ادویه‌های خاص بلوچی. این خورش معمولاً با نان محلی سرو می‌شود و طعم تندی دارد.',
    ingredients: ['گوشت', 'گوجه‌فرنگی', 'پیاز', 'فلفل قرمز', 'زردچوبه', 'دارچین'],
    season: 'زمستان',
  },
  {
    name: 'خشکینا',
    baluchiName: 'خشکینا',
    description: 'شیرینی سنتی بلوچی که از آرد برنج، شیره خرما و روغن تهیه می‌شود. این شیرینی در ماه رمضان و اعیاد بسیار پرطرفدار است.',
    ingredients: ['آرد برنج', 'شیره خرما', 'روغن', 'هل', 'زعفران'],
    season: 'رمضان و اعیاد',
  },
  {
    name: 'دُم‌پُخت',
    baluchiName: 'دم پُخت',
    description: 'غذایی شبیه به دیزی که در دیگ مسی با گوشت، حبوبات و سبزیجات پخته می‌شود. این غذای مقوی در فصل زمستان زیاد تهیه می‌شود.',
    ingredients: ['گوشت گوسفند', 'نخود', 'لوبیا', 'سیب‌زمینی', 'گوجه‌فرنگی', 'سبزی معطر'],
    season: 'زمستان',
  },
  {
    name: 'بُلتَچ',
    baluchiName: 'بُلتَچ',
    description: 'نان پرزدار بلوچی که با خمیر تر و آب بیشتر تهیه می‌شود و روی تابه چدنی پخته می‌شود. برای صبحانه با چای سرو می‌شود.',
    ingredients: ['آرد گندم', 'آب', 'تخم‌مرغ', 'شیر', 'نمک'],
    season: 'صبحانه',
  },
];

// Embroidery data
const EMBROIDERY_TYPES = [
  {
    name: 'مَیسُن دوزی',
    description: 'میسُن دوزی یا گلدوزی بلوچی یکی از زیباترین هنرهای دستی بلوچستان است. در این هنر از نخ‌های رنگارنگ ابریشمی و پنبه‌ای استفاده می‌شود و نقش‌هایی مانند گل، پرنده، بز و طرح‌های هندسی بر روی پارچه دوخته می‌شود.',
    colors: ['قرمز', 'نارنجی', 'زرد', 'سبز', 'آبی', 'سیاه'],
    usage: 'لباس‌های سنتی، رومیزی، کیف، کوسن',
  },
  {
    name: 'سُلَیب دوزی',
    description: 'سُلَیب نوعی گلدوزی ظریف بلوچی است که بیشتر برای تزئین لبه‌های لباس و اسکارف استفاده می‌شود. در این روش از دوخت‌های متقاطع و مورب استفاده می‌شود.',
    colors: ['طلایی', 'نقره‌ای', 'قرمز تیره'],
    usage: 'لبه لباس، اسکارف، روسری',
  },
  {
    name: 'مُشَک دوزی',
    description: 'مشک دوزی روشی است که در آن طرح‌های آینه‌ای و متقارن دوخته می‌شوند. نام این روش از کلمه "مشک" به معنای آینه در بلوچی گرفته شده است.',
    colors: ['قرمز', 'سفید', 'سبز', 'آبی'],
    usage: 'قاب آینه، دیوارکوب، تزئینات',
  },
];

// Cultural games
const GAMES = [
  {
    name: 'چُوگَن',
    description: 'چوگن نوعی هاکی بلوچی است که با چوب بلند و توپ چرمی بازی می‌شود. این بازی سنتی معمولاً در مراسم‌های خاص و عروسی‌ها برگزار می‌شود و تیم‌ها از روستاهای مختلف به رقابت می‌پردازند.',
    players: 'تیمی (۱۰-۱۵ نفر هر تیم)',
  },
  {
    name: 'جُنگ‌جُنگ',
    description: 'بازی کودکان بلوچی که با سنگ‌های کوچک انجام می‌شود. هر بازیکن باید سنگ‌ها را به ترتیب خاصی پرتاب و جمع کند. این بازی مهارت‌های دست و چشم را تقویت می‌کند.',
    players: '۲ تا ۶ نفر',
  },
  {
    name: 'زَهلو دَراز',
    description: 'بازی استقامت و دویدن بلوچی که جوانان در فضای باز انجام می‌دهند. بازیکنان باید مسافت مشخصی را بدوند و در沿途 موانع را پشت سر بگذارند.',
    players: 'فردی یا تیمی',
  },
  {
    name: 'تُپ‌بازی',
    description: 'نوعی فوتبال سنتی بلوچی که با توپ چرمی دست‌ساز بازی می‌شود. قوانین ساده‌ای دارد و در زمین‌های باز روستاها برگزار می‌شود.',
    players: 'تیمی (۵-۷ نفر)',
  },
];

// Agricultural calendar
const AGRICULTURE = [
  { month: 'خرداد - تیر', activity: 'کاشت دانه‌های صیفی', detail: 'در این ماه‌ها انواع خربزه، هندوانه، خیار و گوجه‌فرنگی کاشته می‌شود. بادهای موسمی (مونسون) از جنوب شرق می‌وزد و رطوبت لازم را فراهم می‌کند.', icon: '🌱' },
  { month: 'مرداد - شهریور', activity: 'برداشت محصولات صیفی', detail: 'خربزه و هندوانه لاشار معروف هستند. همچنین زراعت جو و گندم زمستانه آغاز می‌گردد.', icon: '🍉' },
  { month: 'مهر - آبان', activity: 'کاشت پاییزه', detail: 'کشت جو، گندم و نخود. بادهای سرد از شمال غرب شروع به وزیدن می‌کنند. آماده‌سازی زمین برای کشت زمستانه.', icon: '🌾' },
  { month: 'آذر - دی', activity: 'مراقبت از محصولات زمستانه', detail: 'آبیاری مزرعه‌ها، وجین علف‌های هرز و آماده‌سازی بذر برای فصل جدید.', icon: '❄️' },
  { month: 'بهمن - اسفند', activity: 'برداشت جو و چای داخلی', detail: 'در مناطق گرم‌تر سیستان و بلوچستان، جو زودرس برداشت می‌شود. تهیه بذر و کود برای فصل بهار.', icon: '🌿' },
  { month: 'فروردین - اردیبهشت', activity: 'شروع فصل کشاورزی', detail: 'کاشت سبزیجات، پیاز، سیر و حبوبات بهاری. آماده‌سازی زمین و شخم زدن.', icon: '🌻' },
];

// Baluchistan map points of interest
const MAP_POINTS = [
  { name: 'ورکات', desc: 'روستای شما', lat: 26.2, lng: 61.8, type: 'home' },
  { name: 'چابهار', desc: 'بندر تجاری و گردشگری', lat: 25.29, lng: 61.63, type: 'city' },
  { name: 'زاهدان', desc: 'مرکز استان', lat: 29.49, lng: 60.85, type: 'city' },
  { name: 'ایران‌شهر', desc: 'شهر تاریخی', lat: 27.20, lng: 60.68, type: 'city' },
  { name: 'سراوان', desc: 'شهر مرزی', lat: 26.56, lng: 62.33, type: 'city' },
  { name: 'کنارک', desc: 'بندر صیادی', lat: 25.36, lng: 63.32, type: 'port' },
  { name: 'نیک‌شهر', desc: 'شهر نخلستان', lat: 26.23, lng: 62.05, type: 'city' },
  { name: 'تفتان', desc: 'آتشفشان فعال', lat: 28.41, lng: 61.13, type: 'mountain' },
];

// Traditional sounds
const SOUNDS = [
  { name: 'نوکه', desc: 'آهنگ سنتی بلوچی با نی و دف', type: 'موسیقی سنتی' },
  { name: 'لیکو', desc: 'آواز حماسی بلوچی', type: 'موسیقی فولکلور' },
  { name: 'زار', desc: 'مراسم درمانی سنتی با موسیقی و رقص', type: 'مراسم سنتی' },
  { name: 'جان‌نوبی', desc: 'نوعی موسیقی عاشقانه بلوچی', type: 'موسیقی عاشقانه' },
  { name: 'أذان بلوچی', desc: 'اذان به زبان بلوچی', type: 'مذهبی' },
  { name: 'تلاوت قرآن', desc: 'تلاوت قرآن کریم با لحن بلوچی', type: 'مذهبی' },
];

// Quiz questions
const QUIZ_QUESTIONS = [
  { q: 'پایتخت بلوچستان ایران کدام شهر است؟', options: ['چابهار', 'زاهدان', 'ایران‌شهر', 'سراوان'], answer: 1 },
  { q: 'بزرگ‌ترین آتشفشان بلوچستان کدام است؟', options: ['سبندان', 'تفتان', 'بزمان', 'کوه‌نو'], answer: 1 },
  { q: 'نام دریای جنوب بلوچستان چیست؟', options: ['خلیج فارس', 'دریای عمان', 'دریای سرخ', 'دریای مکران'], answer: 1 },
  { q: 'نام گلدوزی سنتی بلوچی چیست؟', options: ['سوزن‌دوزی', 'میسُن دوزی', 'ترمه‌دوزی', 'حاشیه‌دوزی'], answer: 1 },
  { q: 'مهم‌ترین محصول کشاورزی لاشار چیست؟', options: ['گندم', 'خربزه', 'نخل خرما', 'پسته'], answer: 1 },
  { q: 'نوعی هاکی سنتی بلوچی چه نام دارد؟', options: ['چوگن', 'پولو', 'کریکت', 'بازی توپ'], answer: 0 },
];

// ============================================
// Component
// ============================================

export default function CultureTab({ isDark, themeColor, themeGradient }: CultureTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('poetry');
  const [poemIndex, setPoemIndex] = useState(0);
  const [recipeIndex, setRecipeIndex] = useState(0);
  const [embIndex, setEmbIndex] = useState(0);
  const [gameIndex, setGameIndex] = useState(0);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [showQuizResult, setShowQuizResult] = useState(false);

  const dailyPoem = getDailyPoem(Math.floor(Date.now() / 86400000));
  const currentPoem = poemIndex === -1 ? dailyPoem : poems[poemIndex % poems.length];

  const cardBg = isDark ? 'bg-[#1e293b]' : 'bg-white';
  const textColor = isDark ? 'text-[#f1f5f9]' : 'text-[#1e293b]';
  const mutedColor = isDark ? 'text-[#94a3b8]' : 'text-[#64748b]';

  // ---- Poetry ----
  const renderPoetry = () => (
    <div className="flex flex-col gap-3">
      <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
        <div className="p-5" style={{
          background: isDark
            ? 'linear-gradient(135deg, #312e81, #1e1b4b)'
            : 'linear-gradient(135deg, #c7d2fe, #e0e7ff)',
        }}>
          <div className="text-white/60 text-xs mb-1">شاعر: {currentPoem.poet}</div>
          <div className="text-white/40 text-[10px]">{currentPoem.type === 'classic' ? 'سنتی' : currentPoem.type === 'contemporary' ? 'معاصر' : 'فولکلور'}</div>
        </div>
        <div className={`p-6 ${isDark ? 'bg-[#1a1640]' : 'bg-[#faf5ff]'} min-h-[200px]`}
          style={{
            backgroundImage: isDark ? 'none' : 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M30 5 L35 25 L55 25 L39 37 L44 57 L30 45 L16 57 L21 37 L5 25 L25 25 Z" fill="%23e9d5ff" opacity="0.15"/%3E%3C/svg%3E")',
            backgroundSize: '60px 60px',
          }}
        >
          <div className={`poetry-text text-base leading-[2.5] ${isDark ? 'text-[#e2e8f0]' : 'text-[#3b0764]'}`}>
            {currentPoem.verses.map((verse, i) => (
              <div key={i} className="my-1">{verse}</div>
            ))}
          </div>
        </div>
        <div className="p-4 flex items-center justify-between ${isDark ? 'bg-[#1a1640]' : 'bg-[#faf5ff]'}">
          <button
            onClick={() => setPoemIndex((prev) => (prev - 1 + poems.length) % poems.length)}
            className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-purple-100'}`}
          >
            <ChevronRight size={18} style={{ color: isDark ? '#a5b4fc' : '#7c3aed' }} />
          </button>
          <div className={`text-xs ${mutedColor}`}>{toPersianDigits(poemIndex === -1 ? 1 : poemIndex + 1)} / {toPersianDigits(poems.length)}</div>
          <button
            onClick={() => setPoemIndex((prev) => (prev + 1) % poems.length)}
            className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-purple-100'}`}
          >
            <ChevronLeft size={18} style={{ color: isDark ? '#a5b4fc' : '#7c3aed' }} />
          </button>
        </div>
      </div>
    </div>
  );

  // ---- Recipes ----
  const renderRecipes = () => {
    const recipe = RECIPES[recipeIndex];
    return (
      <div className="flex flex-col gap-3">
        <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #c2410c, #9a3412)' }}>
            <div className="text-white text-lg font-bold">{recipe.name}</div>
            <div className="text-white/70 text-xs mt-1">{recipe.baluchiName}</div>
          </div>
          <div className="p-5">
            <p className={`text-sm leading-7 ${textColor} mb-4`}>{recipe.description}</p>
            <div className={`text-xs font-bold ${mutedColor} mb-2`}>مواد لازم:</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.ingredients.map((ing, i) => (
                <span key={i} className={`px-2.5 py-1 rounded-full text-xs ${isDark ? 'bg-white/10 text-white' : 'bg-orange-50 text-orange-800'}`}>
                  {ing}
                </span>
              ))}
            </div>
            <div className={`text-xs ${mutedColor}`}>
              فصل مناسب: <span className={`font-medium ${textColor}`}>{recipe.season}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setRecipeIndex((prev) => (prev - 1 + RECIPES.length) % RECIPES.length)}
            className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
            <ChevronRight size={18} />
          </button>
          <span className={`text-xs ${mutedColor}`}>{toPersianDigits(recipeIndex + 1)} / {toPersianDigits(RECIPES.length)}</span>
          <button onClick={() => setRecipeIndex((prev) => (prev + 1) % RECIPES.length)}
            className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>
    );
  };

  // ---- Embroidery ----
  const renderEmbroidery = () => {
    const emb = EMBROIDERY_TYPES[embIndex];
    return (
      <div className="flex flex-col gap-3">
        <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
          <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #be185d, #9d174d)' }}>
            <div className="text-white text-lg font-bold">{emb.name}</div>
          </div>
          <div className="p-5">
            <p className={`text-sm leading-7 ${textColor} mb-4`}>{emb.description}</p>
            <div className={`text-xs font-bold ${mutedColor} mb-2`}>رنگ‌های اصلی:</div>
            <div className="flex flex-wrap gap-2 mb-4">
              {emb.colors.map((color, i) => {
                const colorMap: Record<string, string> = {
                  'قرمز': '#ef4444', 'نارنجی': '#f97316', 'زرد': '#eab308', 'سبز': '#22c55e',
                  'آبی': '#3b82f6', 'سیاه': '#1e293b', 'طلایی': '#d97706', 'نقره‌ای': '#9ca3af',
                  'قرمز تیره': '#991b1b', 'سفید': '#ffffff',
                };
                return (
                  <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                    style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', color: textColor }}>
                    <span className="w-3 h-3 rounded-full" style={{ background: colorMap[color] || '#888', border: color === 'سفید' ? '1px solid #ccc' : 'none' }} />
                    {color}
                  </span>
                );
              })}
            </div>
            <div className={`text-xs ${mutedColor}`}>
              کاربرد: <span className={`font-medium ${textColor}`}>{emb.usage}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setEmbIndex((prev) => (prev - 1 + EMBROIDERY_TYPES.length) % EMBROIDERY_TYPES.length)}
            className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-black/5'}`}><ChevronRight size={18} /></button>
          <span className={`text-xs ${mutedColor}`}>{toPersianDigits(embIndex + 1)} / {toPersianDigits(EMBROIDERY_TYPES.length)}</span>
          <button onClick={() => setEmbIndex((prev) => (prev + 1) % EMBROIDERY_TYPES.length)}
            className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-black/5'}`}><ChevronLeft size={18} /></button>
        </div>
      </div>
    );
  };

  // ---- Games ----
  const renderGames = () => (
    <div className="flex flex-col gap-4">
      {/* Games info */}
      <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
          <div className="text-white text-lg font-bold">بازی‌های سنتی بلوچی</div>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {GAMES.map((game, i) => (
            <div key={i} className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'} cursor-pointer transition-all hover:scale-[1.02]`}
              onClick={() => setGameIndex(i)}>
              <div className={`font-bold ${textColor}`}>{game.name}</div>
              <p className={`text-xs mt-1 leading-5 ${mutedColor}`}>{game.description}</p>
              <div className={`text-[10px] mt-2 ${mutedColor}`}>بازیکنان: {game.players}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quiz */}
      <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
        <div className="px-5 py-4" style={{ background: themeGradient }}>
          <div className="text-white font-bold">آزمون فرهنگ بلوچ</div>
          <div className="text-white/60 text-xs">سوال {toPersianDigits(quizIndex + 1)} از {toPersianDigits(QUIZ_QUESTIONS.length)}</div>
        </div>
        <div className="p-5">
          {showQuizResult ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">{quizScore >= 4 ? '🏆' : quizScore >= 2 ? '👍' : '📚'}</div>
              <div className={`text-lg font-bold ${textColor}`}>نمره شما: {toPersianDigits(quizScore)} از {toPersianDigits(QUIZ_QUESTIONS.length)}</div>
              <div className={`text-sm mt-2 ${mutedColor}`}>{quizScore >= 4 ? 'عالی! شما بلوچشناس هستید!' : quizScore >= 2 ? 'خوب بود! ادامه بدهید.' : 'بیشتر یاد بگیرید!'}</div>
              <button
                onClick={() => { setQuizIndex(0); setQuizAnswer(null); setQuizScore(0); setShowQuizResult(false); }}
                className="mt-4 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: themeGradient }}
              >
                شروع مجدد
              </button>
            </div>
          ) : (
            <>
              <div className={`text-sm font-bold mb-4 leading-6 ${textColor}`}>{QUIZ_QUESTIONS[quizIndex].q}</div>
              <div className="flex flex-col gap-2">
                {QUIZ_QUESTIONS[quizIndex].options.map((opt, i) => {
                  const isCorrect = i === QUIZ_QUESTIONS[quizIndex].answer;
                  const isSelected = i === quizAnswer;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (quizAnswer !== null) return;
                        setQuizAnswer(i);
                        if (isCorrect) setQuizScore(prev => prev + 1);
                        setTimeout(() => {
                          if (quizIndex < QUIZ_QUESTIONS.length - 1) {
                            setQuizIndex(prev => prev + 1);
                            setQuizAnswer(null);
                          } else {
                            setShowQuizResult(true);
                          }
                        }, 1000);
                      }}
                      className={`p-3 rounded-xl text-sm text-right transition-all ${
                        quizAnswer !== null
                          ? isCorrect
                            ? 'bg-green-500/20 text-green-600 border border-green-500'
                            : isSelected
                              ? 'bg-red-500/20 text-red-600 border border-red-500'
                              : `${isDark ? 'bg-white/5' : 'bg-black/[0.03]'} ${mutedColor}`
                          : `${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-black/[0.03] hover:bg-black/[0.06]'} ${textColor}`
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ---- Agriculture ----
  const renderAgriculture = () => (
    <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #65a30d, #4d7c0f)' }}>
        <div className="text-white text-lg font-bold">تقویم کشاورزی بلوچستان</div>
        <div className="text-white/60 text-xs">بر اساس فصل‌های شمسی</div>
      </div>
      <div className="p-5 flex flex-col gap-3">
        {AGRICULTURE.map((item, i) => (
          <div key={i} className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1">
                <div className={`font-bold text-sm ${textColor}`}>{item.activity}</div>
                <div className={`text-[10px] ${mutedColor} mb-1`}>{item.month}</div>
                <p className={`text-xs leading-5 ${mutedColor}`}>{item.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- Map ----
  const renderMap = () => (
    <div className="flex flex-col gap-3">
      <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
        <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)' }}>
          <div className="text-white text-lg font-bold">نقشه بلوچستان</div>
          <div className="text-white/60 text-xs">مکان‌های مهم</div>
        </div>
        <div className="p-5">
          {/* Simple SVG Map of Baluchistan */}
          <div className="relative w-full" style={{ aspectRatio: '16/12' }}>
            <svg viewBox="24.5 24.5 7 7" className="w-full h-full rounded-lg" style={{
              background: isDark ? '#0f172a' : '#e0f2fe',
            }}>
              {/* Province outline (simplified) */}
              <path
                d="M25,25 L31,25 L31.5,26.5 L31,28 L31.5,29.5 L31,31 L25,31 Z"
                fill={isDark ? 'rgba(5,150,105,0.1)' : 'rgba(5,150,105,0.15)'}
                stroke={themeColor}
                strokeWidth="0.08"
                strokeDasharray="0.2 0.1"
              />
              {/* Points */}
              {MAP_POINTS.map((point, i) => {
                const x = point.lng - 24.5;
                const y = 32 - point.lat;
                const isHome = point.type === 'home';
                const colors: Record<string, string> = {
                  home: '#ef4444', city: themeColor, port: '#f97316', mountain: '#8b5cf6',
                };
                return (
                  <g key={i}>
                    <circle
                      cx={x} cy={y} r={isHome ? 0.15 : 0.1}
                      fill={colors[point.type] || themeColor}
                      opacity={0.9}
                      style={isHome ? { filter: 'drop-shadow(0 0 3px #ef4444)' } : {}}
                    />
                    <text
                      x={x + 0.15} y={y - 0.08}
                      fill={isDark ? '#e2e8f0' : '#1e293b'}
                      fontSize="0.25"
                      fontWeight={isHome ? '700' : '500'}
                    >
                      {point.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Points list */}
      <div className={`${cardBg} rounded-xl p-5 shadow-lg`}>
        <div className={`text-sm font-bold mb-3 ${textColor}`}>مکان‌ها</div>
        <div className="flex flex-col gap-2">
          {MAP_POINTS.map((point, i) => (
            <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
              <div className="w-3 h-3 rounded-full" style={{
                background: point.type === 'home' ? '#ef4444' :
                  point.type === 'mountain' ? '#8b5cf6' :
                  point.type === 'port' ? '#f97316' : themeColor,
              }} />
              <div>
                <div className={`text-xs font-bold ${textColor}`}>{point.name}</div>
                <div className={`text-[10px] ${mutedColor}`}>{point.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- Sounds ----
  const renderSounds = () => (
    <div className={`${cardBg} rounded-xl shadow-lg overflow-hidden`}>
      <div className="px-5 py-4" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
        <div className="text-white text-lg font-bold">صداها و موسیقی بلوچی</div>
        <div className="text-white/60 text-xs">میراث صوتی بلوچستان</div>
      </div>
      <div className="p-5 flex flex-col gap-2">
        {SOUNDS.map((sound, i) => (
          <div key={i} className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/[0.03]'}`}>
            <div className="flex-1">
              <div className={`text-sm font-bold ${textColor}`}>{sound.name}</div>
              <div className={`text-xs ${mutedColor}`}>{sound.desc}</div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${isDark ? 'bg-white/10 text-white' : 'bg-purple-50 text-purple-700'}`}>
              {sound.type}
            </span>
          </div>
        ))}
        <div className={`text-center text-xs mt-3 ${mutedColor}`}>
          در نسخه‌های بعدی فایل‌های صوتی اضافه خواهد شد
        </div>
      </div>
    </div>
  );

  // ---- Render sub-tab content ----
  const renderContent = () => {
    switch (subTab) {
      case 'poetry': return renderPoetry();
      case 'recipes': return renderRecipes();
      case 'embroidery': return renderEmbroidery();
      case 'games': return renderGames();
      case 'agriculture': return renderAgriculture();
      case 'map': return renderMap();
      case 'sounds': return renderSounds();
    }
  };

  return (
    <div className="flex flex-col gap-3 px-4 pb-6" dir="rtl">
      {/* Sub-tab navigation */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
              subTab === tab.id ? 'text-white shadow-lg' : ''
            } ${subTab !== tab.id ? (isDark ? 'bg-white/5 text-[#94a3b8]' : 'bg-black/5 text-[#64748b]') : ''}`}
            style={subTab === tab.id ? { background: themeGradient } : {}}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
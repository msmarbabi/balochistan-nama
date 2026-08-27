'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { getDailyPoem, getRandomPoem, poems, type Poem } from '@/lib/poetry-data';
import { toPersianDigits, getCurrentTripleDate } from '@/lib/calendar-utils';
import { getMonthTheme } from '@/lib/themes';
import { ChevronLeft, ChevronRight, Shuffle, BookOpen, Feather } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ============================================
// Props
// ============================================

interface PoetryTabProps {
  isDark: boolean;
  themeColor: string;
  themeGradient: string;
}

// ============================================
// Helpers
// ============================================

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function getPoemTypeLabel(type: Poem['type']): string {
  switch (type) {
    case 'classic':
      return 'کلاسیک';
    case 'contemporary':
      return 'معاصر';
    case 'folk':
      return 'فولکلور';
  }
}

function getPoemTypeBadgeClass(type: Poem['type']): string {
  switch (type) {
    case 'classic':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'contemporary':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'folk':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  }
}

// ============================================
// Component
// ============================================

export default function PoetryTab({ isDark, themeColor, themeGradient }: PoetryTabProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const dayOfYear = getDayOfYear();
    return (dayOfYear - 1) % poems.length;
  });
  const [isAnimating, setIsAnimating] = useState(false);
  const [animDirection, setAnimDirection] = useState<'left' | 'right'>('left');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentPoem = poems[currentIndex];
  const monthTheme = useMemo(() => {
    const { shamsi } = getCurrentTripleDate();
    return getMonthTheme(shamsi.month, isDark);
  }, [isDark]);

  const navigate = useCallback(
    (direction: 'prev' | 'next') => {
      if (isAnimating) return;
      setIsAnimating(true);
      setAnimDirection(direction === 'next' ? 'left' : 'right');

      setTimeout(() => {
        setCurrentIndex((prev) => {
          if (direction === 'next') {
            return (prev + 1) % poems.length;
          }
          return (prev - 1 + poems.length) % poems.length;
        });
        setIsAnimating(false);
      }, 250);
    },
    [isAnimating]
  );

  const handleRandom = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setAnimDirection('left');
    setTimeout(() => {
      const random = getRandomPoem();
      const idx = poems.findIndex((p) => p.id === random.id);
      setCurrentIndex(idx >= 0 ? idx : 0);
      setIsAnimating(false);
    }, 250);
  }, [isAnimating]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigate('next');
      if (e.key === 'ArrowRight') navigate('prev');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="space-y-4 px-1" dir="rtl">
      {/* ── Header Card ── */}
      <div
        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
        style={{ background: themeGradient }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-6 -left-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/10" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Feather className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">اشعار بلوچی</h2>
            <p className="mt-0.5 text-sm text-white/80">
              {toPersianDigits(poems.length)} شعر از شاعران بلوچ
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Poetry Card ── */}
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-2xl transition-all duration-300',
          // Parchment / elegant dark
          isDark
            ? 'border border-white/10 bg-gradient-to-b from-slate-800/90 to-slate-900/95 shadow-2xl'
            : 'border border-amber-200/60 bg-gradient-to-b from-amber-50/80 via-orange-50/60 to-yellow-50/80 shadow-xl'
        )}
      >
        {/* Decorative border pattern - top */}
        <div
          className="h-1.5 w-full"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              ${themeColor} 0px,
              ${themeColor} 8px,
              transparent 8px,
              transparent 16px,
              ${monthTheme.accent} 16px,
              ${monthTheme.accent} 24px,
              transparent 24px,
              transparent 32px
            )`,
          }}
        />

        {/* Inner decorative corners */}
        <div className="absolute top-3 right-3 h-6 w-6 border-t-2 border-r-2 opacity-30" style={{ borderColor: themeColor }} />
        <div className="absolute top-3 left-3 h-6 w-6 border-t-2 border-l-2 opacity-30" style={{ borderColor: themeColor }} />
        <div className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 opacity-30" style={{ borderColor: themeColor }} />
        <div className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 opacity-30" style={{ borderColor: themeColor }} />

        <div className="p-5 pt-6 pb-6">
          {/* Poet & Type badges */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <Badge
              className={cn(
                'px-3 py-1 text-sm font-semibold border',
                getPoemTypeBadgeClass(currentPoem.type)
              )}
              variant="outline"
            >
              {getPoemTypeLabel(currentPoem.type)}
            </Badge>
            <Badge
              className={cn(
                'px-3 py-1 text-sm font-semibold',
                isDark
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-white/60 text-amber-900 border-amber-200'
              )}
              variant="outline"
            >
              <BookOpen className="ml-1.5 h-3.5 w-3.5" />
              {currentPoem.poet}
            </Badge>
          </div>

          {/* Poem title */}
          {currentPoem.title && (
            <h3
              className={cn(
                'mb-4 text-lg font-bold',
                isDark ? 'text-white/90' : 'text-amber-900'
              )}
            >
              {currentPoem.title}
            </h3>
          )}

          {/* Verses with transition */}
          <div
            className={cn(
              'transition-all duration-250 ease-in-out',
              isAnimating && animDirection === 'left' && 'opacity-0 -translate-x-4',
              isAnimating && animDirection === 'right' && 'opacity-0 translate-x-4',
              !isAnimating && 'opacity-100 translate-x-0'
            )}
          >
            <div className="space-y-3">
              {currentPoem.verses.map((verse, idx) => (
                <p
                  key={`${currentPoem.id}-${idx}`}
                  className={cn(
                    'poetry-text text-lg leading-relaxed',
                    isDark ? 'text-slate-200' : 'text-amber-950'
                  )}
                >
                  {verse}
                </p>
              ))}
            </div>
          </div>

          {/* Poem counter */}
          <div
            className={cn(
              'mt-6 text-center text-sm',
              isDark ? 'text-slate-500' : 'text-amber-400'
            )}
          >
            {toPersianDigits(currentIndex + 1)} / {toPersianDigits(poems.length)}
          </div>
        </div>

        {/* Decorative border pattern - bottom */}
        <div
          className="h-1.5 w-full"
          style={{
            background: `repeating-linear-gradient(
              90deg,
              ${monthTheme.accent} 0px,
              ${monthTheme.accent} 8px,
              transparent 8px,
              transparent 16px,
              ${themeColor} 16px,
              ${themeColor} 24px,
              transparent 24px,
              transparent 32px
            )`,
          }}
        />
      </div>

      {/* ── Navigation Buttons ── */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl border-2"
          style={{ borderColor: themeColor, color: themeColor }}
          onClick={() => navigate('prev')}
          disabled={isAnimating}
        >
          <ChevronRight className="ml-1 h-4 w-4" />
          قبلی
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-xl border-2"
          style={{ borderColor: themeColor, color: themeColor }}
          onClick={() => navigate('next')}
          disabled={isAnimating}
        >
          بعدی
          <ChevronLeft className="mr-1 h-4 w-4" />
        </Button>

        <Button
          size="sm"
          className="rounded-xl text-white shadow-md"
          style={{ background: themeGradient }}
          onClick={handleRandom}
          disabled={isAnimating}
        >
          <Shuffle className="ml-1.5 h-4 w-4" />
          <span className="hidden sm:inline">شعر تصادفی</span>
          <span className="sm:hidden">تصادفی</span>
        </Button>
      </div>

      {/* ── About Baluch Poets ── */}
      <div
        className={cn(
          'rounded-2xl border p-5 backdrop-blur-sm',
          isDark
            ? 'border-white/10 bg-white/5'
            : 'border-amber-200/50 bg-white/70'
        )}
      >
        <h3
          className={cn(
            'mb-3 text-base font-bold flex items-center gap-2',
            isDark ? 'text-white' : 'text-amber-900'
          )}
        >
          <BookOpen className="h-5 w-5" style={{ color: themeColor }} />
          درباره شاعران بلوچ
        </h3>
        <p
          className={cn(
            'text-sm leading-7',
            isDark ? 'text-slate-400' : 'text-amber-800/80'
          )}
        >
          شعر بلوچی سینه‌به‌سینه از نسل به نسل منتقل شده و بخش مهمی از هویت
          فرهنگی بلوچستان را تشکیل می‌دهد. از شاعران کلاسیک چون مولانا اولاد و
          مولانا نواب گرفته تا شاعران معاصر، این هنر آمیخته با موسیقی و
          داستان‌گویی بلوچی زنده نگه داشته شده است.
        </p>
        <p
          className={cn(
            'mt-2 text-sm leading-7',
            isDark ? 'text-slate-500' : 'text-amber-700/60'
          )}
        >
          ترانه‌های فولکلور بلوچی مانند لالایی‌ها و کارنامه‌ها بازتابی از
          زندگی کوچ‌نشینی، دریانوردی و ارتباط عمیق بلوچ‌ها با طبیعت این
          سرزمین است.
        </p>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { PRAYER_METHODS, type PrayerMethodKey } from './prayer-times';

// ============================================
// شهرها و مختصات (سیستان و بلوچستان)
// ============================================

export interface City {
  name: string;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  { name: 'ورکات، لاشار', lat: 26.2, lng: 61.8 },
  { name: 'لاشار', lat: 26.35, lng: 61.92 },
  { name: 'چابهار', lat: 25.29, lng: 60.64 },
  { name: 'کنارک', lat: 25.39, lng: 60.37 },
  { name: 'ایرانشهر', lat: 27.21, lng: 60.69 },
  { name: 'سراوان', lat: 27.36, lng: 62.33 },
  { name: 'خاش', lat: 28.22, lng: 61.11 },
  { name: 'زاهدان', lat: 29.5, lng: 60.86 },
  { name: 'میرجاوه', lat: 28.99, lng: 61.49 },
  { name: 'نیک‌شهر', lat: 26.21, lng: 60.22 },
];

// ============================================
// تنظیمات برنامه
// ============================================

export type LangKey = 'fa' | 'bal';

export interface AppSettings {
  lat: number;
  lng: number;
  locationName: string;
  method: PrayerMethodKey;
  lang: LangKey;
}

const DEFAULTS: AppSettings = {
  lat: 26.2,
  lng: 61.8,
  locationName: 'ورکات، لاشار',
  method: 'KARACHI', // پیش‌فرض: اهل سنت (حنفی) منطقه لاشار
  lang: 'fa',
};

const STORAGE_KEY = 'baluchistan-nama-settings';

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULTS;
}

// ---- ماژولار store ----
let current: AppSettings = loadSettings();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
}
function emit() {
  listeners.forEach((l) => l());
}

export function getSettings(): AppSettings {
  return current;
}
export function setSettings(s: AppSettings) {
  current = { ...current, ...s };
  persist();
  emit();
}
export function updateSettings(p: Partial<AppSettings>) {
  setSettings({ ...current, ...p });
}

export function useSettings(): AppSettings {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return current;
}

export { PRAYER_METHODS };

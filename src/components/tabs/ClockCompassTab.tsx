'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Compass, Clock, Navigation, RotateCcw, Settings, Moon, Sun, Sunrise, Sunset } from 'lucide-react';
import { getCurrentTripleDate, toPersianDigits, getShamsiMonthName, getPersianDayName } from '@/lib/calendar-utils';
import { calcQibla, DEFAULT_LOCATION } from '@/lib/qibla';
import { useSettings } from '@/lib/settings';

interface Props { isDark: boolean; themeColor: string; themeGradient: string; }

const PERSIAN_NUMBERS = ['۱۲','۱','۲','۳','۴','۵','۶','۷','۸','۹','۱۰','۱۱'];

function getMoonPhase(date: Date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const c = Math.floor(365.25 * (y - 2000));
  const e = Math.floor(30.6 * (m + 1));
  const jd = c + e + d - 1158.6;
  const phase = ((jd % 29.530588853) + 29.530588853) % 29.530588853;
  const frac = phase / 29.530588853;
  const illum = Math.round(((1 - Math.cos(2 * Math.PI * frac)) / 2) * 100);
  let name: string, icon: string;
  if (phase < 1.85) { name = '\u0645\u0627\u0647 \u062c\u062f\u06cc\u062f'; icon = '\ud83c\udf11'; }
  else if (phase < 5.53) { name = '\u0647\u0644\u0627\u0644 \u0645\u062a\u0635\u0627\u0639\u062f'; icon = '\ud83c\udf12'; }
  else if (phase < 9.22) { name = '\u0631\u0628\u0639 \u0627\u0648\u0644'; icon = '\ud83c\udf13'; }
  else if (phase < 12.91) { name = '\u0628\u062f\u0631 \u0645\u062a\u0635\u0627\u0639\u062f'; icon = '\ud83c\udf14'; }
  else if (phase < 16.61) { name = '\u0645\u0627\u0647 \u06a9\u0627\u0645\u0644'; icon = '\ud83c\udf15'; }
  else if (phase < 20.30) { name = '\u0628\u062f\u0631 \u062a\u0646\u0627\u0642\u0635\u06cc'; icon = '\ud83c\udf16'; }
  else if (phase < 23.99) { name = '\u0631\u0628\u0639 \u0622\u062e\u0631'; icon = '\ud83c\udf17'; }
  else if (phase < 27.68) { name = '\u0647\u0644\u0627\u0644 \u062a\u0646\u0627\u0642\u0635\u06cc'; icon = '\ud83c\udf18'; }
  else { name = '\u0645\u0627\u0647 \u062c\u062f\u06cc\u062f'; icon = '\ud83c\udf11'; }
  return { phase: Math.round(phase * 10) / 10, name, icon, illumination: illum };
}

export default function ClockCompassTab({ isDark, themeColor, themeGradient }: Props) {
  const [time, setTime] = useState(new Date());
  const [heading, setHeading] = useState(0);
  const [hasOrientation, setHasOrientation] = useState(false);
  const [beta, setBeta] = useState(0);
  const [gamma, setGamma] = useState(0);
  const [demoAngle, setDemoAngle] = useState(0);
  const [demoBeta, setDemoBeta] = useState(0);
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lng: number } | null>(null);
  const { lat: sLat, lng: sLng } = useSettings();
  const [calibrationOffset, setCalibrationOffset] = useState(0);
  const [calibrating, setCalibrating] = useState(false);
  const [calibrationSamples, setCalibrationSamples] = useState<number[]>([]);
  const [showCalibration, setShowCalibration] = useState(false);
  const calTimer = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // تایم‌گیر (Stopwatch)
  // ============================================
  const [swMs, setSwMs] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const [swLaps, setSwLaps] = useState<number[]>([]);
  const swRef = useRef<number>(0);
  const swStart = useRef<number>(0);

  useEffect(() => {
    if (!swRunning) return;
    swStart.current = Date.now() - swRef.current;
    const id = setInterval(() => setSwMs(Date.now() - swStart.current), 50);
    return () => clearInterval(id);
  }, [swRunning]);

  const swToggle = useCallback(() => {
    if (swRunning) { swRef.current = swMs; setSwRunning(false); }
    else setSwRunning(true);
  }, [swRunning, swMs]);

  const swReset = useCallback(() => {
    setSwRunning(false); swRef.current = 0; setSwMs(0); setSwLaps([]);
  }, []);

  const swLap = useCallback(() => setSwLaps((l) => [...l, swMs]), [swMs]);

  // ============================================
  // شمارشگر معکوس (Countdown)
  // ============================================
  const [cdSec, setCdSec] = useState(300);
  const [cdRunning, setCdRunning] = useState(false);
  const [cdSet, setCdSet] = useState(300);
  const cdEnd = useRef<number>(0);
  const cdBeeped = useRef(false);

  const beep = useCallback(() => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; o.type = 'sine';
      g.gain.setValueAtTime(0.4, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      o.start(); o.stop(ctx.currentTime + 0.6);
      o.onended = () => ctx.close();
    } catch {}
  }, []);

  useEffect(() => {
    if (!cdRunning) return;
    const id = setInterval(() => {
      const rem = Math.max(0, Math.round((cdEnd.current - Date.now()) / 1000));
      setCdSec(rem);
      if (rem <= 0) {
        setCdRunning(false);
        if (!cdBeeped.current) { beep(); cdBeeped.current = true; }
      }
    }, 250);
    return () => clearInterval(id);
  }, [cdRunning, beep]);

  const cdStart = useCallback(() => {
    cdBeeped.current = false;
    if (cdSec <= 0) { setCdSec(cdSet); cdEnd.current = Date.now() + cdSet * 1000; }
    else cdEnd.current = Date.now() + cdSec * 1000;
    setCdRunning(true);
  }, [cdSec, cdSet]);

  const cdPause = useCallback(() => setCdRunning(false), []);
  const cdReset = useCallback(() => { setCdRunning(false); setCdSec(cdSet); }, [cdSet]);

  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);

  const handleOrientation = useCallback((ev: DeviceOrientationEvent) => {
    const h = (ev as any).webkitCompassHeading ?? (ev.alpha != null ? (360 - ev.alpha) % 360 : 0);
    setHeading(h); setBeta(ev.beta ?? 0); setGamma(ev.gamma ?? 0); setHasOrientation(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === 'function') {
      DOE.requestPermission().then((r: string) => { if (r === 'granted') window.addEventListener('deviceorientation', handleOrientation); }).catch(() => {});
    } else { window.addEventListener('deviceorientation', handleOrientation); }
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [handleOrientation]);

  useEffect(() => { if (hasOrientation) return; const t = setInterval(() => setDemoAngle(p => (p + 0.3) % 360), 30); return () => clearInterval(t); }, [hasOrientation]);
  useEffect(() => { if (hasOrientation) return; const t = setInterval(() => setDemoBeta(5 * Math.sin(Date.now() / 2000)), 30); return () => clearInterval(t); }, [hasOrientation]);

  const startCalibration = useCallback(() => {
    setCalibrating(true); setCalibrationSamples([]); setCalibrationOffset(0);
    let count = 0; const samps: number[] = [];
    calTimer.current = setInterval(() => {
      if (count >= 16) { if (calTimer.current) clearInterval(calTimer.current); if (samps.length) setCalibrationOffset(samps.reduce((a,b) => a+b, 0) / samps.length); setCalibrating(false); return; }
      samps.push(hasOrientation ? heading : demoAngle); setCalibrationSamples([...samps]); count++;
    }, 500);
  }, [hasOrientation, heading, demoAngle]);

  const resetCalibration = useCallback(() => { setCalibrationOffset(0); setCalibrationSamples([]); setCalibrating(false); if (calTimer.current) clearInterval(calTimer.current); }, []);

  useEffect(() => { return () => { if (calTimer.current) clearInterval(calTimer.current); }; }, []);
  useEffect(() => { try { const s = localStorage.getItem('baluchistan-nama-compass-offset'); if (s) setCalibrationOffset(parseFloat(s)); } catch {} }, []);

  // دریافت مختصات دستگاه برای محاسبه پویای زاویه قبله
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setDeviceCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // در صورت رد/خطا از مقدار پیش‌فرض استفاده می‌شود
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  }, []);

  const hours = time.getHours(), minutes = time.getMinutes(), seconds = time.getSeconds();
  const ampm = hours >= 12 ? '\u0628.\u0638' : '\u0642.\u0638';
  const hours12 = hours % 12 || 12;
  const timeStr = toPersianDigits(String(hours12).padStart(2,'0')) + ':' + toPersianDigits(String(minutes).padStart(2,'0')) + ':' + toPersianDigits(String(seconds).padStart(2,'0'));
  const triple = getCurrentTripleDate();
  const dayName = getPersianDayName(triple.miladi.year, triple.miladi.month, triple.miladi.day);
  const monthName = getShamsiMonthName(triple.shamsi.month);
  const dateStr = dayName + ' ' + toPersianDigits(triple.shamsi.day) + ' ' + monthName + ' ' + toPersianDigits(triple.shamsi.year);
  const secondDeg = seconds * 6, minuteDeg = minutes * 6 + seconds * 0.1, hourDeg = (hours % 12) * 30 + minutes * 0.5;
  const rawHeading = hasOrientation ? heading : demoAngle;
  const currentHeading = (rawHeading - calibrationOffset + 360) % 360;
  const currentBeta = hasOrientation ? beta : demoBeta;
  const currentGamma = hasOrientation ? gamma : 0;
  const effLat = deviceCoords ? deviceCoords.lat : sLat;
  const effLng = deviceCoords ? deviceCoords.lng : sLng;
  const QIBLA = calcQibla(effLat, effLng);
  const moonData = getMoonPhase(time);
  const dayOfYear = Math.floor((time.getTime() - new Date(time.getFullYear(), 0, 0).getTime()) / 86400000);
  const sunDecl = 23.45 * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));

  const cardBg = isDark ? 'bg-[#1e293b]' : 'bg-white';
  const tc = isDark ? 'text-[#f1f5f9]' : 'text-[#1e293b]';
  const mc = isDark ? 'text-[#94a3b8]' : 'text-[#64748b]';

  const fmtMs = (ms: number) => {
    const t = ms / 1000;
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = Math.floor(t % 60), cs = Math.floor((ms % 1000) / 10);
    const p = (n: number) => String(n).padStart(2, '0');
    const base = (h > 0 ? `${p(h)}:` : '') + `${p(m)}:${p(s)}`;
    return toPersianDigits(base) + '.' + toPersianDigits(p(cs));
  };
  const fmtSec = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    const p = (n: number) => String(n).padStart(2, '0');
    return toPersianDigits(`${p(m)}:${p(sec)}`);
  };

  return (
    <div className="flex flex-col gap-4 px-4 pb-6" dir="rtl">
      {/* Digital Clock */}
      <div className={`${cardBg} rounded-xl p-6 shadow-lg`}>
        <div className="flex items-center gap-2 mb-4"><Clock size={18} style={{color:themeColor}}/><h2 className={`text-sm font-bold ${tc}`}>\u0633\u0627\u0639\u062a \u062f\u06cc\u062c\u06cc\u062a\u0627\u0644</h2></div>
        <div className="text-center">
          <div className={`text-5xl font-mono font-bold tracking-wider ${tc}`} style={{textShadow:`0 0 20px ${themeColor}60, 0 0 40px ${themeColor}30`}}>{timeStr}</div>
          <div className="text-lg font-bold mt-1" style={{color:themeColor}}>{ampm}</div>
          <div className={`text-sm mt-2 ${mc}`}>{dateStr}</div>
        </div>
      </div>

      {/* Analog Clock */}
      <div className={`${cardBg} rounded-xl p-6 shadow-lg`}>
        <div className="flex items-center gap-2 mb-2"><Clock size={18} style={{color:themeColor}}/><h2 className={`text-sm font-bold ${tc}`}>\u0633\u0627\u0639\u062a \u0622\u0646\u0627\u0644\u0648\u06af \u0633\u0647\u200c\u0628\u0639\u062f\u06cc</h2></div>
        <div className="flex justify-center items-center py-4">
          <div className="animate-float" style={{perspective:'800px'}}>
            <div className="relative rounded-full clock-glow" style={{width:220,height:220,background:isDark?'radial-gradient(circle,#1e293b,#0f172a)':'radial-gradient(circle,#fff,#f1f5f9)',border:`3px solid ${themeColor}`,transform:'rotateX(10deg)',transformStyle:'preserve-3d'}}>
              {PERSIAN_NUMBERS.map((num,i)=>{const a=(i*30)*(Math.PI/180),r=85,x=110+r*Math.sin(a)-12,y=110-r*Math.cos(a)-8;return <span key={i} className="absolute text-xs font-bold" style={{left:x,top:y,color:i===0?themeColor:(isDark?'#94a3b8':'#475569'),fontSize:i===0?'13px':'11px'}}>{num}</span>;})}
              {Array.from({length:60}).map((_,i)=>{const a=i*6,maj=i%5===0,or=105,ir=maj?95:99,rad=(a*Math.PI)/180;return <line key={`t${i}`} x1={110+or*Math.sin(rad)} y1={110-or*Math.cos(rad)} x2={110+ir*Math.sin(rad)} y2={110-ir*Math.cos(rad)} stroke={maj?themeColor:(isDark?'#475569':'#cbd5e1')} strokeWidth={maj?2:0.8} strokeLinecap="round"/>;})}
              <div className="clock-hand absolute" style={{left:'50%',top:'20%',width:4,height:'30%',marginLeft:-2,background:isDark?'#e2e8f0':'#1e293b',borderRadius:2,transformOrigin:'50% 100%',transform:`rotate(${hourDeg}deg)`,zIndex:10}}/>
              <div className="clock-hand absolute" style={{left:'50%',top:'14%',width:3,height:'38%',marginLeft:-1.5,background:isDark?'#cbd5e1':'#334155',borderRadius:2,transformOrigin:'50% 100%',transform:`rotate(${minuteDeg}deg)`,zIndex:11}}/>
              <div className="absolute" style={{left:'50%',top:'12%',width:1.5,height:'40%',marginLeft:-0.75,background:'#ef4444',borderRadius:1,transformOrigin:'50% 100%',transform:`rotate(${secondDeg}deg)`,transition:'transform 0.3s cubic-bezier(0.4,2.08,0.55,0.44)',zIndex:12}}/>
              <div className="absolute rounded-full" style={{width:10,height:10,left:'50%',top:'50%',marginLeft:-5,marginTop:-5,background:themeColor,boxShadow:`0 0 6px ${themeColor}`,zIndex:13}}/>
            </div>
          </div>
        </div>
      </div>

      {/* تایم‌گیر (Stopwatch) */}
      <div className={`${cardBg} rounded-xl p-5 shadow-lg`}>
        <div className="flex items-center gap-2 mb-3"><Clock size={18} style={{color:themeColor}}/><h2 className={`text-sm font-bold ${tc}`}>تایم‌گیر</h2></div>
        <div className="text-center">
          <div className={`text-5xl font-mono font-bold tracking-wider ${tc}`} style={{textShadow:`0 0 20px ${themeColor}60, 0 0 40px ${themeColor}30`}}>{fmtMs(swMs)}</div>
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={swToggle} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-105 active:scale-95" style={{background: swRunning ? 'linear-gradient(135deg,#dc2626,#ef4444)' : themeGradient}}>{swRunning ? 'توقف' : 'شروع'}</button>
            <button onClick={swLap} disabled={!swRunning} className="px-4 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-40" style={{background:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)',color:themeColor}}>دور</button>
            <button onClick={swReset} className="px-4 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95" style={{background:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)',color:mc}}>بازنشانی</button>
          </div>
          {swLaps.length > 0 && (
            <div className={`mt-3 grid grid-cols-3 gap-1.5 ${mc} text-xs max-h-28 overflow-y-auto`}>
              {swLaps.map((l, i) => <div key={i} className={`py-1 rounded ${isDark?'bg-white/5':'bg-black/[0.03]'}`}>{toPersianDigits(i + 1)}. {fmtMs(l)}</div>)}
            </div>
          )}
        </div>
      </div>

      {/* شمارشگر معکوس (Countdown) */}
      <div className={`${cardBg} rounded-xl p-5 shadow-lg`}>
        <div className="flex items-center gap-2 mb-3"><RotateCcw size={18} style={{color:themeColor}}/><h2 className={`text-sm font-bold ${tc}`}>شمارشگر معکوس</h2></div>
        <div className="text-center">
          <div className={`text-6xl font-mono font-bold tracking-wider ${tc}`} style={{textShadow:`0 0 20px ${themeColor}60, 0 0 40px ${themeColor}30`}}>{fmtSec(cdSec)}</div>
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {[1,5,10,15,30,60].map((m) => (
              <button key={m} onClick={() => { setCdSet(m*60); if(!cdRunning) setCdSec(m*60); }} className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95" style={{background: cdSet===m*60 ? themeGradient : (isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)'), color: cdSet===m*60 ? '#fff' : (isDark?'#e2e8f0':'#334155')}}>{toPersianDigits(m)}د</button>
            ))}
          </div>
          <div className="flex justify-center gap-2 mt-4">
            {!cdRunning ? (
              <button onClick={cdStart} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-105 active:scale-95" style={{background:themeGradient}}>شروع</button>
            ) : (
              <button onClick={cdPause} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-105 active:scale-95" style={{background:'linear-gradient(135deg,#dc2626,#ef4444)'}}>توقف</button>
            )}
            <button onClick={cdReset} className="px-4 py-2.5 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95" style={{background:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)',color:mc}}>بازنشانی</button>
          </div>
        </div>
      </div>

      {/* 3D Compass */}
      <div className={`${cardBg} rounded-xl p-5 shadow-lg`}>
        <div className="flex items-center gap-2 mb-2"><Compass size={18} style={{color:themeColor}}/><h2 className={`text-sm font-bold ${tc}`}>\u0642\u0637\u0628\u200c\u0646\u0645\u0627 \u0633\u0647\u200c\u0628\u0639\u062f\u06cc</h2></div>
        <div className="flex flex-col items-center py-2">
          <div className="relative" style={{width:280,height:280,perspective:'600px'}}>
            <div className="absolute inset-0 rounded-full" style={{background:isDark?'conic-gradient(from 0deg,#1a1a2e,#16213e,#0f3460,#16213e,#1a1a2e)':'conic-gradient(from 0deg,#e8e8e8,#d0d0d0,#b8b8b8,#d0d0d0,#e8e8e8)',padding:4,transform:'rotateX(5deg)',transformStyle:'preserve-3d',boxShadow:isDark?`0 0 30px rgba(0,0,0,0.5),inset 0 0 20px rgba(0,0,0,0.3),0 0 60px ${themeColor}20`:`0 4px 20px rgba(0,0,0,0.15),inset 0 1px 0 rgba(255,255,255,0.5),0 0 40px ${themeColor}15`}}>
              <div className="w-full h-full rounded-full relative overflow-hidden" style={{background:isDark?'radial-gradient(circle at 40% 35%,#1e293b,#0f172a 60%,#020617)':'radial-gradient(circle at 40% 35%,#fff,#f1f5f9 60%,#e2e8f0)'}}>
                <svg className="absolute inset-0 w-full h-full" style={{transform:`rotate(${-currentHeading}deg)`,transition:calibrating?'none':'transform 0.15s ease-out'}} viewBox="0 0 280 280">
                  <defs>
                    <linearGradient id="nn" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={themeColor} stopOpacity="1"/><stop offset="100%" stopColor={themeColor} stopOpacity="0.6"/></linearGradient>
                    <linearGradient id="ns" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={isDark?'#64748b':'#94a3b8'} stopOpacity="0.6"/><stop offset="100%" stopColor={isDark?'#475569':'#cbd5e1'} stopOpacity="1"/></linearGradient>
                    <filter id="ng"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                  </defs>
                  {Array.from({length:72}).map((_,i)=>{const a=i*5,r=(a*Math.PI)/180,maj=a%30===0,mid=a%15===0,or=132,ir=maj?114:mid?120:125;return <line key={`d${i}`} x1={140+or*Math.sin(r)} y1={140-or*Math.cos(r)} x2={140+ir*Math.sin(r)} y2={140-ir*Math.cos(r)} stroke={maj?themeColor:mid?(isDark?'#64748b':'#94a3b8'):(isDark?'#334155':'#cbd5e1')} strokeWidth={maj?2.5:mid?1.2:0.6} strokeLinecap="round"/>;})}
                  {Array.from({length:12}).map((_,i)=>{const a=i*30,r=(a*Math.PI)/180,nr=110,x=140+nr*Math.sin(r),y=140-nr*Math.cos(r);return <text key={`dn${i}`} x={x} y={y+4} textAnchor="middle" fill={isDark?'#475569':'#94a3b8'} fontSize="9" fontWeight="500">{toPersianDigits(i*30)}</text>;})}
                  <circle cx="140" cy="140" r="102" fill="none" stroke={isDark?'#1e293b':'#e2e8f0'} strokeWidth="0.5"/>
                  <text x="140" y="80" textAnchor="middle" fill={themeColor} fontSize="22" fontWeight="900">ش</text>
                  <text x="140" y="210" textAnchor="middle" fill={isDark?'#94a3b8':'#475569'} fontSize="18" fontWeight="700">ج</text>
                  <text x="210" y="144" textAnchor="middle" fill={isDark?'#94a3b8':'#475569'} fontSize="18" fontWeight="700">م</text>
                  <text x="70" y="144" textAnchor="middle" fill={isDark?'#94a3b8':'#475569'} fontSize="18" fontWeight="700">غ</text>
                  <polygon points="140,60 133,140 147,140" fill="url(#nn)"/>
                  <polygon points="140,220 133,140 147,140" fill="url(#ns)"/>
                  <circle cx="140" cy="140" r="12" fill={isDark?'#0f172a':'#fff'} stroke={themeColor} strokeWidth="2"/>
                  <circle cx="140" cy="140" r="5" fill={themeColor} filter="url(#ng)"/>
                </svg>
                <div className="absolute" style={{width:10,height:10,borderRadius:'50%',background:'#eab308',border:'2px solid #fef08a',boxShadow:'0 0 10px rgba(234,179,8,0.8)',left:'50%',top:'50%',transform:`rotate(${QIBLA}deg) translateY(-118px) translate(-50%,-50%)`,zIndex:20}}/>
                <div className="absolute" style={{fontSize:9,color:'#eab308',fontWeight:'bold',left:'50%',top:'50%',transform:`rotate(${QIBLA}deg) translateY(-105px) translate(-50%,-50%) rotate(-${QIBLA}deg)`,zIndex:20,whiteSpace:'nowrap',textShadow:'0 0 6px rgba(234,179,8,0.5)'}}>\u06a9\u0639\u0628\u0647</div>
                <div className="absolute" style={{top:-4,left:'50%',marginLeft:-8,width:0,height:0,borderLeft:'8px solid transparent',borderRight:'8px solid transparent',borderTop:`14px solid ${themeColor}`,zIndex:30,filter:`drop-shadow(0 0 4px ${themeColor})`}}/>
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-2 mt-2 ${mc}`}><Navigation size={14}/><span className="text-base font-mono font-bold" style={{color:themeColor}}>{toPersianDigits(Math.round(currentHeading))}\u00b0</span><span className="text-xs">{hasOrientation?'':'(\u0622\u0632\u0645\u0627\u06cc\u0634\u06cc)'}</span>{calibrationOffset!==0&&<span className="text-[10px] text-green-500">\u062a\u0635\u062d\u06cc\u062d\u200c\u0634\u062f\u0647</span>}</div>
          <div className="flex gap-2 mt-3">
            <button onClick={()=>setShowCalibration(!showCalibration)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105 active:scale-95" style={{background:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)',color:isDark?'#e2e8f0':'#334155'}}><Settings size={13}/>\u06a9\u0627\u0644\u06cc\u0628\u0631\u0627\u0633\u06cc\u0648\u0646</button>
          </div>
          {showCalibration && (
            <div className={`mt-3 rounded-xl p-4 w-full max-w-xs ${isDark?'bg-white/5':'bg-black/[0.03]'}`}>
              <div className={`text-sm font-bold mb-2 ${tc}`}>\u06a9\u0627\u0644\u06cc\u0628\u0631\u0627\u0633\u06cc\u0648\u0646 \u0642\u0637\u0628\u200c\u0646\u0645\u0627</div>
              <p className={`text-xs mb-3 ${mc}`}>\u06af\u0648\u0634\u06cc \u0631\u0627 \u0628\u0647 \u0633\u0645\u062a \u0634\u0645\u0627\u0644 \u0642\u0631\u0627\u0631 \u062f\u0647\u06cc\u062f \u0648 \u062f\u06a9\u0645\u0647 \u0634\u0631\u0648\u0639 \u0631\u0627 \u0628\u0632\u0646\u06cc\u062f. \u0628\u0647 \u0645\u062f\u062a \u06f8 \u062b\u0627\u0646\u06cc\u0647 \u062f\u0631 \u062c\u0627\u06cc \u062e\u0648\u062f \u0646\u06af\u0647 \u062f\u0627\u0631\u06cc\u062f.</p>
              {calibrating && (<div className="mb-3"><div className={`text-xs mb-1 ${mc}`}>\u0646\u0645\u0648\u0646\u0647\u200c\u0647\u0627: {toPersianDigits(calibrationSamples.length)} / \u06f1\u06f6</div><div className={`h-2 rounded-full overflow-hidden ${isDark?'bg-white/10':'bg-black/10'}`}><div className="h-full rounded-full transition-all duration-500" style={{width:`${(calibrationSamples.length/16)*100}%`,background:themeGradient}}/></div><div className="text-2xl text-center my-2 animate-pulse">\ud83e\uded1</div><div className={`text-center text-xs ${mc}`}>\u06af\u0648\u0634\u06cc \u0631\u0627 \u062b\u0628\u062a \u0646\u06af\u0647 \u062f\u0627\u0631\u06cc\u062f...</div></div>)}
              {!calibrating && calibrationOffset !== 0 && <div className={`text-xs mb-3 p-2 rounded-lg ${isDark?'bg-green-900/30 text-green-400':'bg-green-50 text-green-700'}`}>\u062a\u0635\u062d\u06cc\u062d: {toPersianDigits(Math.round(calibrationOffset))}\u00b0 \u0630\u062e\u06cc\u0631\u0647 \u0634\u062f</div>}
              <div className="flex gap-2">
                {!calibrating ? <button onClick={startCalibration} className="flex-1 py-2 rounded-lg text-xs font-bold text-white transition-all hover:scale-105 active:scale-95" style={{background:themeGradient}}>\u0634\u0631\u0648\u0639 \u06a9\u0627\u0644\u06cc\u0628\u0631\u0627\u0633\u06cc\u0648\u0646</button> : <button onClick={()=>{if(calTimer.current)clearInterval(calTimer.current);setCalibrating(false);}} className="flex-1 py-2 rounded-lg text-xs font-bold text-white bg-red-500 transition-all hover:scale-105 active:scale-95">\u0644\u063a\u0648</button>}
                <button onClick={resetCalibration} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all hover:scale-105" style={{background:isDark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)',color:mc}}><RotateCcw size={12}/>\u0628\u0627\u0632\u0646\u0634\u0627\u0646\u06cc</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 justify-center mt-1"><div className="w-2 h-2 rounded-full" style={{background:'#eab308',boxShadow:'0 0 4px rgba(234,179,8,0.5)'}}/><span className={`text-xs ${mc}`}>\u0642\u0628\u0644\u0647: {toPersianDigits(QIBLA)}\u00b0 \u0627\u0632 \u0634\u0645\u0627\u0644</span></div>
      </div>

      {/* Astronomy */}
      <div className={`${cardBg} rounded-xl p-5 shadow-lg`}>
        <div className="flex items-center gap-2 mb-4"><Moon size={18} style={{color:themeColor}}/><h2 className={`text-sm font-bold ${tc}`}>\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u0646\u062c\u0648\u0645\u06cc</h2></div>
        <div className="flex flex-col gap-3">
          <div className={`rounded-lg p-4 ${isDark?'bg-white/5':'bg-black/[0.03]'}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-xs ${mc} mb-1`}>\u0648\u0636\u0639\u06cc\u062a \u0645\u0627\u0647</div>
                <div className={`text-base font-bold ${tc}`}>{moonData.name}</div>
                <div className={`text-xs ${mc} mt-0.5`}>{'\u0631\u0648\u0634\u0646\u0627\u06cc\u06cc: ' + toPersianDigits(moonData.illumination) + '%'}</div>
              </div>
              <div className="text-5xl">{moonData.icon}</div>
            </div>
            <div className={`mt-3 h-2 rounded-full overflow-hidden ${isDark?'bg-white/10':'bg-black/10'}`}><div className="h-full rounded-full transition-all duration-1000" style={{width:`${moonData.illumination}%`,background:`linear-gradient(90deg,${isDark?'#1e293b':'#e2e8f0'},${themeColor})`}}/></div>
          </div>
          <div className={`rounded-lg p-4 ${isDark?'bg-white/5':'bg-black/[0.03]'}`}>
            <div className={`text-xs ${mc} mb-1`}>\u0645\u06cc\u0644 \u062e\u0648\u0631\u0634\u06cc\u062f</div>
            <div className="flex items-center gap-2"><Sun size={16} style={{color:themeColor}}/><span className={`text-base font-bold ${tc}`}>{sunDecl>=0?'+':'-'}{toPersianDigits(Math.abs(Math.round(sunDecl*10)/10))}\u00b0</span></div>
            <div className={`text-xs ${mc} mt-1`}>{sunDecl>10?'\u062e\u0648\u0631\u0634\u06cc\u062f \u0628\u0647 \u0633\u0645\u062a \u0634\u0645\u0627\u0644':sunDecl<-10?'\u062e\u0648\u0631\u0634\u06cc\u062f \u0628\u0647 \u0633\u0645\u062a \u062c\u0646\u0648\u0628':'\u0646\u0632\u062f\u06cc\u06a9 \u0627\u0633\u062a\u0648\u0627'}</div>
          </div>
          <div className={`rounded-lg p-4 ${isDark?'bg-white/5':'bg-black/[0.03]'}`}>
            <div className={`text-xs ${mc} mb-2`}>\u0637\u0648\u0644 \u0631\u0648\u0632 \u062a\u0642\u0631\u06cc\u0628\u06cc</div>
            <div className="flex items-center gap-3"><Sunrise size={16} className="text-amber-400"/><span className={`text-sm ${tc}`}>{'\u0637\u0648\u0644 \u0631\u0648\u0632 \u2248 ' + toPersianDigits(Math.round(12 + (sunDecl / 23.45) * 2.5)) + ' \u0633\u0627\u0639\u062a'}</span></div>
          </div>
        </div>
      </div>

      {/* Pilot Indicator */}
      <div className={`${cardBg} rounded-xl p-6 shadow-lg`}>
        <div className="flex items-center gap-2 mb-2"><Navigation size={18} style={{color:themeColor}}/><h2 className={`text-sm font-bold ${tc}`}>\u0646\u0634\u0627\u0646\u06af\u0631 \u0627\u0641\u0642 \u0645\u0635\u0646\u0648\u0639\u06cc</h2></div>
        <div className="flex flex-col items-center py-4">
          <div className="relative rounded-full overflow-hidden" style={{width:160,height:160,border:`2px solid ${isDark?'#334155':'#e2e8f0'}`}}>
            <div className="absolute inset-0" style={{transform:`rotate(${currentGamma*0.5}deg)`,transition:'transform 0.15s ease-out',transformOrigin:'50% 50%'}}>
              <div className="absolute" style={{top:0,left:0,right:0,height:'50%',background:isDark?'linear-gradient(to bottom,#1e3a5f,#2d5a87)':'linear-gradient(to bottom,#60a5fa,#93c5fd)',marginTop:`${-currentBeta*0.5}px`}}/>
              <div className="absolute" style={{bottom:0,left:0,right:0,height:'50%',background:isDark?'linear-gradient(to bottom,#78350f,#451a03)':'linear-gradient(to bottom,#a16207,#854d0e)',marginBottom:`${currentBeta*0.5}px`}}/>
              <div className="absolute left-0 right-0" style={{top:'50%',height:1.5,background:'#fff',opacity:0.7,marginTop:`${-currentBeta*0.5}px`}}/>
            </div>
            <div className="absolute" style={{top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:10}}>
              <div className="absolute" style={{width:60,height:2.5,background:'#fbbf24',left:'50%',top:'50%',marginLeft:-30,marginTop:-1.25,borderRadius:1,boxShadow:'0 0 4px rgba(251,191,36,0.6)'}}/>
              <div className="absolute" style={{width:2.5,height:20,background:'#fbbf24',left:'50%',top:'50%',marginLeft:-1.25,marginTop:-10,borderRadius:1,boxShadow:'0 0 4px rgba(251,191,36,0.6)'}}/>
            </div>
          </div>
          <p className={`text-xs mt-2 ${mc}`}>{'\u0634\u06cc\u0628: ' + toPersianDigits(Math.round(currentBeta)) + '\u00b0 ' + (hasOrientation ? '' : '(\u0622\u0632\u0645\u0627\u06cc\u0634\u06cc)')}</p>
        </div>
      </div>
    </div>
  );
}
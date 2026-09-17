/* بلوچستان نما — قطب‌نما v1.16: canvas استایل iOS + نشانگر قبله + خم‌شدن سه‌بعدی واقعی با سنسور */
(function(global){
'use strict';
var KEY='blx_compass_offset';
var offset=parseInt(localStorage.getItem(KEY)||'0',10)||0;
var heading=0;        // زاویه‌ی دستگاه از شمال ساعت‌شیفته (0-359)
var qibla=0;          // جهت قبله از شمال (جغرافیایی)
var pitch=0, roll=0; // خم‌شدن (درجه) برای حالت سه‌بعدی
var sensorLive=false;
var running=false;
var rafId=0;
var demoAngle=0;

function el(id){ return document.getElementById(id); }
function norm360(a){ a=a%360; if(a<0)a+=360; return a; }
function diff(a,b){ var d=((b-a)%360+360)%360; return d>180? d-360 : d; }

function draw(){
  var c=el('compassCanvas'); if(!c) return;
  var dpr=global.devicePixelRatio||1;
  var w=c.clientWidth||280, h=c.clientHeight||280;
  var W=Math.round(w*dpr), H=Math.round(h*dpr);
  if(c.width!==W||c.height!==H){ c.width=W; c.height=H; }
  var ctx=c.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  var cx=w/2, cy=h/2;
  var R=Math.min(w,h)/2-10;

  // رینگ — چرخش‌شان با «جهت» = جهت دستگاه + ۱۸۰ (همان منطق iOS/کلاسیک)
  var ringRot = -norm360(heading + 180);

  // پس‌زمینهٔ گرادیانی رینگ
  var g=ctx.createRadialGradient(cx,cy,R*0.45,cx,cy,R);
  g.addColorStop(0,'rgba(255,255,255,.02)');
  g.addColorStop(1,'rgba(255,255,255,.06)');
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.fillStyle=g; ctx.fill();

  // حلقه‌ی باریک طلایی
  ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
  ctx.strokeStyle='rgba(230,190,90,.45)'; ctx.lineWidth=1.5; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,R-14,0,Math.PI*2);
  ctx.strokeStyle='rgba(230,190,90,.18)'; ctx.lineWidth=1; ctx.stroke();

  ctx.save();
  ctx.translate(cx,cy);
  ctx.rotate(ringRot*Math.PI/180);

  // ۷۲ خط تیک (هر ۵ درجه)
  for(var a=0;a<360;a+=5){
    var major=(a%30===0);
    var ang=a*Math.PI/180;
    var r1=R-8, r2=major? R-22 : R-14;
    ctx.beginPath();
    ctx.moveTo(Math.sin(ang)*r1, -Math.cos(ang)*r1);
    ctx.lineTo(Math.sin(ang)*r2, -Math.cos(ang)*r2);
    ctx.lineWidth=major?2.5:1;
    ctx.strokeStyle= major ? '#E8C877' : 'rgba(163,177,210,.4)';
    ctx.stroke();
    // آرایهٔ درجه برای تیک‌های اصلی
    if(major && a%30!==0){
      ctx.font='10px "Vazirmatn", sans-serif';
      ctx.fillStyle='rgba(163,177,210,.7)';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(String(a), Math.sin(ang)*(R-32), -Math.cos(ang)*(R-32));
    }
  }
  // حروف N/E/S/W
  var dirs=[['N','#E8C877',0],['E','#9AB3D4',90],['S','#9AB3D4',180],['W','#9AB3D4',270]];
  for(var i=0;i<dirs.length;i++){
    var nm=dirs[i][0], col=dirs[i][1], da=dirs[i][2];
    var dang=da*Math.PI/180;
    ctx.font='bold 26px "Vazirmatn", sans-serif';
    ctx.fillStyle=col; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(nm, Math.sin(dang)*(R-48), -Math.cos(dang)*(R-48));
  }
  ctx.restore();

  // نشانگر قبله — ثابت نسبت به دستگاه (با خم‌شدن نمی‌چرخد)، فقط با qibla+heading
  var qAng = norm360(qibla - heading - 180) + 180; // جهت نمایشی قبله روی رینگ
  // در واقع: موقعیت قبله روی رینگ چرخان = qibla - ringRot
  var qPos = norm360(qibla + 180 - (heading+180)); // = norm360(qibla - heading)
  var qa=qPos*Math.PI/180;
  var qx=Math.sin(qa)*R, qy=-Math.cos(qa)*R;
  // دایرهٔ کوچک + ستاره/نشانگر بنفش با «قبله»
  ctx.save();
  ctx.translate(qx,qy);
  ctx.beginPath(); ctx.arc(0,0,13,0,Math.PI*2);
  ctx.fillStyle='rgba(124,58,237,.25)'; ctx.fill();
  ctx.strokeStyle='#7C3AED'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#A78BFA';
  ctx.font='bold 11px "Vazirmatn", sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('قبله', 0, 0);
  ctx.restore();

  // مرکز — نشانه‌گر بالا (نشانگر ثابت بالای صفحه، مثل iOS)
  ctx.save();
  ctx.translate(cx,cy);
  ctx.beginPath();
  ctx.moveTo(0,-(R-10));
  ctx.lineTo(-7,-(R-26));
  ctx.lineTo(7,-(R-26));
  ctx.closePath();
  ctx.fillStyle='#E8C877';
  ctx.shadowColor='rgba(0,0,0,.5)'; ctx.shadowBlur=4;
  ctx.fill();
  ctx.restore();

  // خوانش
  var degEl=el('compassDeg');
  if(degEl) degEl.textContent = String(Math.round(norm360(heading)) % 360).replace(/^(\d)$/,'0$1')+'°';
  // زوایای قبله
  var diffQ = norm360(qibla - heading);
  var infoEl=el('compassQiblaInfo');
  if(infoEl){
    var dist = (global.Prayer && window.Prayer.distanceFromQibla) ?
      Math.round(window.Prayer.distanceFromQibla()) : null;
    infoEl.textContent='سمت قبله: '+Math.round(norm360(qibla))+'° • فاصله تا قبله: '+(diffQ<180?'سایر':'در حال دور شدن')+' • '+ (diffQ<=90? 'بازگردید ' : 'بچرخید ') + Math.round(diffQ)+'°';
    if(dist!==null) infoEl.textContent += ' • '+dist+' کیلومتر';
  }
}

function tick(){
  if(!running) return;
  // وقتی سنسور واقعی فعال باشد، heading/pitch/roll از __onSensorUpdate می‌آیند
  // و هیچ مقداردهی خودکار/دمویی نداریم (رفع باگ چرخش خودکار ۰→۳۵۰)
  applyTilt();
  draw();
  rafId=requestAnimationFrame(tick);
}
function applyTilt(){
  var c3d=el('compass3d');
  if(c3d){
    // خم‌شدن سه‌بعدی: pitch (جلو/عقب) → rotateX ، roll (چپ/راست) → rotateZ
    c3d.style.transform='perspective(900px) rotateX('+ (20-pitch*0.6) +'deg) rotateZ('+(roll*0.25)+'deg)';
    c3d.style.transition='transform .15s ease-out';
  }
}
function setHeading(raw){
  heading=norm360(raw+offset);
  sensorLive=true;
}
// callback native (MainActivity startSensors)
global.__onSensorUpdate=function(az, p, rl){
  setHeading(az);
  pitch=p||0; roll=rl||0;
};
// fallback: deviceorientation (روی Web)
function onOrient(e){
  if(e.alpha===null) return;
  var az=360-e.alpha;
  setHeading(az);
  pitch=e.beta||0; roll=e.gamma||0;
}
global.addEventListener('deviceorientation', onOrient, true);
global.addEventListener('deviceorientationabsolute', onOrient, true);

global.Compass={
  start:function(){
    running=true;
    // پل native — سنسور واقعی (رفع باگ چرخش خودکار)
    // وقتی پل native موجود است، heading/pitch فقط از __onSensorUpdate می‌آید
    // (دیگر چرخش خودکار ۰→۳۵۰ نداریم)
    if(typeof NativeApp!=='undefined' && NativeApp.startSensors){
      try{ NativeApp.startSensors(); }catch(e){}
    }
    if(!rafId) rafId=requestAnimationFrame(tick);
  },
  stop:function(){
    running=false;
    if(rafId){ cancelAnimationFrame(rafId); rafId=0; }
    if(typeof NativeApp!=='undefined' && NativeApp.stopSensors){ try{ NativeApp.stopSensors(); }catch(e){} }
  },
  setQibla:function(deg){ qibla=norm360(deg); },
  get heading(){ return Math.round(norm360(heading))%360; },
  get qibla(){ return qibla; },
  sensorLive:function(){ return sensorLive; },
  resetOffset:function(){ offset=0; localStorage.removeItem(KEY); },
  adjustOffset:function(d){ offset=norm360(offset+d); localStorage.setItem(KEY,String(offset)); },
  _getOffset:function(){ return offset; },
  _applyTilt: applyTilt,
  _tick: tick
};
})(window);

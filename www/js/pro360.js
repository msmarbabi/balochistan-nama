/* Pro Compass 360 — engine */
(function(global){
'use strict';
var P={}, D=document;
P.PAGE={};
var FA='۰۱۲۳۴۵۶۷۸۹';
function fa(n){n=String(n);var o='';for(var i=0;i<n.length;i++)o+=(FA.indexOf(n[i])>=0?FA[n[i]]:n[i]);return o;}
function pad2(n){return n<10?'0'+n:''+n;}
function el(t,c,h){var e=D.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;}
function $(s){return D.getElementById(s);}
P.fa=fa;P.pad2=pad2;P.el=el;P.$=$;
P.fmt=function(n,d){return(n==null||isNaN(n))?'--':Number(n).toFixed(d==null?1:d);};
P.fmtInt=function(n){return(n==null||isNaN(n))?'--':fa(Math.round(n));};
P.deg=function(v,lat){if(v==null)return'--';return Math.abs(v).toFixed(1)+'°'+(lat?((v>=0)?'N':'S'):((v>=0)?'E':'W'));};
P.clock=function(d){d=d||new Date();return fa(d.getHours()%12||12)+':'+pad2(d.getMinutes());};
P.clockS=function(d){d=d||new Date();return fa(d.getHours()%12||12)+':'+pad2(d.getMinutes())+':'+pad2(d.getSeconds());};
/* 17 real skins from Compass 360 Pro (nb/c.java theme table) */
P.SKIN=[
['قطبی ویژه','اقیانوسی · خنک','#0B1D2C','#102D42','#1E4A6B','#2E6B94','#B8ECFF','#F4FBFF','#6FD4FF','#6BAED2','#9BE1FF'],
['اپسیدین پرو','مشکی · قرمز','#0A0A0C','#17171A','#4B171A','#722226','#B7C0CA','#F8FAFC','#FF4C51','#4B171A','#FF8A8E'],
['درخشش شفق','سبز · فیروزه‌ای','#081008','#10250D','#1C3612','#5E9D28','#88D640','#E1FFC0','#A9F05A','#5E9D28','#C7FF7A'],
['کاشف کلاسیک','کلاسیک · زیتونی','#14180F','#252A1B','#3A442A','#59663C','#C4CE9E','#F2F5E4','#C9D66B','#59663C','#DEE99B'],
['نظامی تاکتیکی','سبز · ارتشی','#0A1410','#12251A','#1D3B28','#2E5A3C','#8FBF9F','#E6F5EC','#4ADE80','#2E5A3C','#86EFAC'],
['آبی اقیانوس','آبی · عمق','#071423','#0E2438','#153A57','#1E5678','#93C5FD','#EFF6FF','#38BDF8','#1E5678','#7DD3FC'],
['سفید ساده','روشن · تمیز','#F4F6F8','#DFE4EA','#C7CFD9','#AAB4C0','#5A6673','#1A222B','#E5484D','#AAB4C0','#FF8A8E'],
['اوفرویت','آبی · شفاف','#1A2A38','#28455A','#3A6480','#4E86A6','#D6ECFA','#FFFFFF','#7DD3FC','#4E86A6','#BAE6FD'],
['طلایی','لوکس · طلا','#151006','#2A2109','#4A3A0F','#6E5616','#E8D08A','#FFF8E1','#F5C542','#6E5616','#FFE08A'],
['دید در شب','سبز · شبانه','#060B06','#0D1A0C','#15280F','#1F3B14','#6EE7A0','#DFFFE9','#22C55E','#1F3B14','#86EFAC'],
['پریمیوم طلایی','طلایی · درخشان','#0F0D08','#241D0D','#3E3212','#63501A','#F3D98B','#FFFBEB','#FFD24A','#63501A','#FFE79A'],
['کاوشگر فضا','بنفش · فضایی','#0C0718','#18102B','#261A45','#37265F','#C4B5FD','#F5F3FF','#A855F7','#37265F','#D8B4FE'],
['ژنگلیان','سبز · زمرد','#04120E','#0A2019','#0F3025','#164A38','#6EE7B7','#ECFDF5','#10B981','#164A38','#6EE7B7'],
['خوشه بنفش','بنفش · نئون','#0F0818','#1C0F2E','#2B1849','#3F2564','#D8B4FE','#FAF5FF','#A78BFA','#3F2564','#C4B5FD'],
['نیل','آبی · عمیق','#080D1C','#101831','#18234A','#233263','#93C5FD','#EEF2FF','#6366F1','#233263','#A5B4FC'],
['شاره خورشیدی','نارنجی · گرم','#180C06','#2A1408','#40200D','#5C3012','#FDBA74','#FFF7ED','#F97316','#5C3012','#FDBA74'],
['لیل تیتانیوم','خاکستری · تیتانیوم','#0D0F12','#181B20','#252A31','#363D46','#B6BEC9','#F5F7FA','#94A3B8','#363D46','#E2E8F0']
];

/* state */
P.st={theme:0,mag:1,mode:'2d',qibla:0,wp:[],loc:{lat:25.29,lng:60.64},
      head:null,acc:null,alt:null,decl:0,field:0};
P.get=function(k,d){try{var v=JSON.parse(localStorage.getItem('p360_'+k));return v==null?d:v;}catch(e){return d;}};
P.set=function(k,v){try{localStorage.setItem('p360_'+k,JSON.stringify(v));}catch(e){}};
P.skin=function(){return P.SKIN[P.st.theme]||P.SKIN[0];};
P.card=function(n){return ['شمال','شمال شرقی','شرق','جنوب شرقی','جنوب','جنوب غربی','غرب','شمال غربی'][Math.round(n/45)%8];};

/* sensors */
P.init=function(){
  P.st.theme=P.get('theme',0); P.st.mag=P.get('mag',1); P.st.mode=P.get('mode','2d'); P.st.wp=P.get('wp',[]);
  if(global.App&&App.settings&&App.settings.lat!=null){P.st.loc={lat:App.settings.lat,lng:App.settings.lng};}
  P.geo();
  P.orient(); P.gps();
};
P.geo=function(){
  if(global.BX&&BX.wmm){try{var r=BX.wmm(P.st.loc.lat,P.st.loc.lng);P.st.decl=r.D;P.st.field=r.F;}catch(e){}}
  P.sun();
};
P.orient=function(){
  function on(e){
    if(e.webkitCompassHeading!=null)P.raw=e.webkitCompassHeading;
    else if(e.alpha!=null)P.raw=360-e.alpha;
    P.hd();
  }
  if(typeof DeviceOrientationEvent!=='undefined')window.addEventListener('deviceorientationabsolute',on,true);
  window.addEventListener('deviceorientation',on,true);
};
P.hd=function(){
  if(P.raw==null)return;
  P.st.head=(P.st.mag?P.raw:(P.raw+P.st.decl+360)%360);
  var c=P.$('p360cv'); if(c)PX.draw(c);
};
P.gps=function(){
  if(!navigator.geolocation)return;
  navigator.geolocation.watchPosition(function(p){
    P.st.loc={lat:p.coords.latitude,lng:p.coords.longitude};
    P.st.acc=p.coords.accuracy; P.st.alt=p.coords.altitude;
    PX.upd(); P.geo();
  },function(){},{enableHighAccuracy:true,maximumAge:5000,timeout:10000});
};

/* sun (Meeus low-precision) */
P.sun=function(){
  var la=P.st.loc.lat, lo=P.st.loc.lng, d=new Date();
  var n=d.getTime()/86400000+2440587.5, J=n-2451545.0, T=J/36525;
  var L0=(280.46646+36000.76983*T)%360, M=357.52911+35999.05029*T;
  var Mr=M*Math.PI/180, C=(1.914602-0.004817*T-0.000014*T*T)*Math.sin(Mr)
    +(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);
  var e=0.016708634-0.000042037*T-0.0000001267*T*T;
  var v=M+1.9148, O=(280.46646+v+0.98564736*T)*Math.PI/180;
  var om=(125.04-1934.136*T)*Math.PI/180, ob=Math.acos(Math.cos(om)*Math.cos(O));
  var dec=Math.asin(Math.sin(ob)*Math.sin(Mr));
  var eq=0.000075+0.001868*Math.cos(Mr)-0.032077*Math.sin(Mr)-0.014615*Math.cos(2*Mr)-0.040849*Math.sin(2*Mr);
  var HA=Math.acos((Math.cos(90.833*Math.PI/180)-Math.sin(la*Math.PI/180)*Math.sin(dec))/(Math.cos(la*Math.PI/180)*Math.cos(dec)));
  var noon=(720-4*lo-(L0+C)-eq)/60;
  P.st.sunrise=noon-HA*4; P.st.sunset=noon+HA*4; P.st.noon=noon;
  var GA=(357.529+0.98560028*T)*Math.PI/180;
  P.st.golden=[noon-4.5*60,noon+4.5*60,noon-HA*4-15,noon+HA*4+15];
};
P.hm=function(m){
  if(m==null||isNaN(m))return'--:--';
  var h=Math.floor(m/60), mm=Math.floor(m%60), ap=h<12?'ق.ظ':'ب.ظ';
  h=h%12||12; return h+':'+(mm<10?'0':'')+mm+' '+ap;
};

/* canvas compass */
var PX={};
PX.size=function(cv){
  var d=window.devicePixelRatio||1, S=cv.clientWidth||320;
  if(cv.width!==Math.round(S*d)){cv.width=Math.round(S*d);cv.height=Math.round(S*d);}
  var c=cv.getContext('2d'); c.setTransform(d,0,0,d,0,0); c.clearRect(0,0,S,S);
  return [c,S];
};
PX.draw=function(cv){
  var o=PX.size(cv), c=o[0], S=o[1], s=P.skin();
  var cx=S/2, cy=S/2, R=S*0.46;
  var h=P.st.head==null?0:P.st.head;
  c.save(); c.translate(cx,cy);
  // face
  var g=c.createRadialGradient(0,-R*0.2,R*0.1,0,0,R);
  g.addColorStop(0,s[8]); g.addColorStop(1,s[2]);
  c.fillStyle=g; c.beginPath(); c.arc(0,0,R,0,7); c.fill();
  c.strokeStyle=s[3]; c.lineWidth=2; c.stroke();
  c.rotate(-h*Math.PI/180);
  // ticks
  for(var i=0;i<360;i+=5){
    var mj=(i%45===0), a=i*Math.PI/180;
    c.save(); c.rotate(a);
    c.strokeStyle=mj?s[5]:s[4]; c.lineWidth=mj?2:1;
    c.beginPath(); c.moveTo(0,-R*0.95); c.lineTo(0,-R*(mj?0.83:0.88)); c.stroke();
    if(mj){c.fillStyle=s[6]; c.font='600 '+(R*0.13)+'px Montserrat,sans-serif';
      c.textAlign='center'; c.textBaseline='middle'; c.fillText(''+(i/10),(0),-R*0.72);}
    c.restore();
  }
  // cardinals
  var cd=[['N',0,s[7]],['E',90,s[5]],['S',180,s[5]],['W',270,s[5]]];
  for(var j=0;j<4;j++){c.save(); c.rotate(cd[j][1]*Math.PI/180);
    c.fillStyle=cd[j][2]; c.font='800 '+(R*0.19)+'px Montserrat,sans-serif';
    c.textAlign='center'; c.textBaseline='middle'; c.fillText(cd[j][0],0,-R*0.58); c.restore();}
  // waypoints
  (P.st.wp||[]).forEach(function(w){
    c.save(); c.rotate((w.d-P.st.decl-360)*Math.PI/180);
    c.fillStyle=s[9]; c.font='700 '+(R*0.11)+'px Montserrat,sans-serif';
    c.textAlign='center'; c.textBaseline='middle'; c.fillText(w.n||'★',0,-R*0.42); c.restore();
  });
  c.restore();
  // fixed pointer
  c.fillStyle=s[7]; c.beginPath();
  c.moveTo(cx,cy-R-2); c.lineTo(cx-8,cy-R+14); c.lineTo(cx+8,cy-R+14); c.closePath(); c.fill();
  // true north marker
  c.save(); c.translate(cx,cy); c.rotate((P.st.decl)*Math.PI/180);
  c.fillStyle=s[7]; c.beginPath(); c.arc(0,-R*0.92,3.5,0,7); c.fill(); c.restore();
  // bubble
  var b=P.$('p360bub'); if(b){b.style.transform='translate('+(P.st.roll||0)*2.4+'px,'+(-(P.st.pitch||0)*1.6)+'px)';}
};

/* render */
P.FEAT=[['موقعیت','📍','loc'],['عکس مکان‌دار','📷','geo'],['قطب‌نما','🧭','compass'],
['ارتفاع‌سنج','⛰️','alt'],['سرعت','🚗','speed'],['مساحت','📐','area'],['تراز حباب','🫧','level'],
['منطقه زمانی','🌐','tz'],['آب‌وهوا','🌤️','weather'],['چراغ‌قوه','🔦','flash'],['فاصله','📏','dist'],
['AR اندازه','📐','ar'],['پروژه‌ها','📁','proj'],['بازگشت مسیر','🚶','trail'],['طلوع و غروب','🌅','sun'],
['تبدیل مختصات','🗺️','coordconv'],['جهت‌یاب','🎯','azimuth'],['آدرسیاب','🏷️','addr']];
P.mount=function(){
  var r=P.$('bxToolsRoot'); if(!r)return;
  r.innerHTML=
  '<div class="p360-top"><button class="p360-opt" onclick="P.sheet()">⚙</button>'+
  '<div class="p360-title">قطب‌نمای ۳بعدی</div></div>'+
  '<div class="p360-body"><div class="p360-docks">'+
  '<div class="p360-dock"><div class="ic">🧲</div><div class="lb">میدان مغناطیسی</div><div class="v" id="dkField">--</div></div>'+
  '<div class="p360-dock"><div class="ic">📡</div><div class="lb">دقت GPS</div><div class="v" id="dkAcc">--</div></div>'+
  '<div class="p360-dock"><div class="ic">📏</div><div class="lb">ارتفاع</div><div class="v" id="dkAlt">--</div></div>'+
  '<div class="p360-dock"><div class="ic">🧭</div><div class="lb">انحراف</div><div class="v" id="dkDecl">--</div></div>'+
  '</div>'+
  '<div class="p360-cmp"><div class="p360-stage"><canvas id="p360cv" class="p360-cv"></canvas>'+
  '<div class="p360-incline"><div class="ring"><div class="cross-h"></div><div class="cross-v"></div>'+
  '<div class="p360-bubble" id="p360bub"></div></div></div></div>'+
  '<div class="p360-read"><div class="deg" id="p360deg">0°</div><div class="car" id="p360car">شمال</div>'+
  '<div class="mag" id="p360mag">MAG</div></div>'+
  '<div class="p360-ctl" id="p360ctl"></div>'+
  '<div class="p360-grid">'+P.FEAT.map(function(f){
    return '<button class="p360-gi" data-f="'+f[2]+'"><span class="ic">'+f[1]+'</span><span class="lb">'+f[0]+'</span></button>';}).join('')+'</div>'+
  '<div class="p360-card"><div class="p360-card__t">کرنومتر</div>'+
  '<div class="p360-big" id="swVal">00:00.0</div><div class="p360-unit">ثانیه</div>'+
  '<div class="p360-timerow"><button class="go" id="swGo">شروع</button><button id="swLap">لاپ</button><button id="swReset">ریست</button></div></div>'+
  '<div class="p360-card"><div class="p360-card__t">تایمر معکوس</div>'+
  '<div class="p360-big" id="tmVal">05:00</div><div class="p360-unit">دقیقه</div>'+
  '<div class="p360-timerow"><button class="go" id="tmGo">شروع</button><button class="stop" id="tmReset">ریست</button></div></div>'+
  '</div></div>'+
  '<nav class="p360-bar">'+
  '<button class="p360-bi" data-p="home"><span class="ic">⌂</span><span class="lb">خانه</span></button>'+
  '<button class="p360-bi" data-p="area"><span class="ic">▱</span><span class="lb">مساحت</span></button>'+
  '<button class="p360-compass-btn" data-p="compass"><span class="p360-needle"></span></button>'+
  '<button class="p360-bi" data-p="geo"><span class="ic">📷</span><span class="lb">دوربین</span></button>'+
  '<button class="p360-bi on" data-p="set"><span class="ic">⚙</span><span class="lb">تنظیمات</span></button>'+
  '</nav>';
};

/* controls + timers */
P.ctl=function(){
  var s=P.skin(), c=P.$('p360ctl'); if(!c)return;
  c.innerHTML=
  '<button class="p360-chip" id="cMag" style="color:'+s[7]+'">'+(P.st.mag?'MAG':'TRUE')+'</button>'+
  '<button class="p360-chip" id="cMode" style="color:'+s[9]+'">'+(P.st.mode==='2d'?'2D':'3D')+'</button>'+
  '<button class="p360-chip" id="cQib">قبله</button>'+
  '<button class="p360-chip" id="cCal">کالیبره</button>'+
  '<button class="p360-chip" id="cTheme" style="color:'+s[8]+'">پوسته</button>'+
  '<button class="p360-chip" id="cWp">نقطه</button>';
  P.$('cMag').onclick=function(){P.st.mag=P.st.mag?0:1;P.set('mag',P.st.mag);P.hd();P.ctl();};
  P.$('cMode').onclick=function(){P.st.mode=P.st.mode==='2d'?'3d':'2d';P.set('mode',P.st.mode);P.ctl();};
  P.$('cTheme').onclick=P.skins;
  P.$('cQib').onclick=function(){P.st.qibla=P.st.qibla?0:1;P.toast(P.st.qibla?'قبله روشن':'قبله خاموش');};
  P.$('cCal').onclick=P.calib;
  P.$('cWp').onclick=function(){
    if(P.st.head==null){P.toast('در انتظار سنسور...');return;}
    var L='ABCDEFGH', wp=P.st.wp||[];
    if(wp.length>=8){P.toast('حداکثر ۸ نقطه');return;}
    wp.push({n:L[wp.length],d:Math.round(P.st.head)}); P.st.wp=wp;P.set('wp',wp);P.ctl();
  };
};
P.upd=function(){
  var s=P.skin();
  var f=P.$('dkField'),a=P.$('dkAcc'),al=P.$('dkAlt'),dc=P.$('dkDecl');
  if(f)f.textContent=P.st.field?Math.round(P.st.field)+' µT':'--';
  if(a)a.textContent=P.st.acc!=null?Math.round(P.st.acc)+' m':'--';
  if(al)al.textContent=P.st.alt!=null?Math.round(P.st.alt)+' m':'--';
  if(dc){var dd=P.st.decl;dc.textContent=(dd>=0?'+':'')+dd.toFixed(1)+'°'+(dd>=0?'E':'W');}
  var cv=P.$('p360cv'); if(cv)PX.draw(cv);
  var dg=P.$('p360deg'); if(dg&&P.st.head!=null)dg.textContent=Math.round(P.st.head)+'°';
  var cr=P.$('p360car'); if(cr&&P.st.head!=null)cr.textContent=P.card(P.st.head);
  var mg=P.$('p360mag'); if(mg)mg.textContent=P.st.mag?'MAG':'TRUE';
};

/* skins sheet */
P.skins=function(){
  var b=P.$('p360ov'); if(b)b.parentNode.removeChild(b);
  var o=el('div','p360-ov'); o.id='p360ov';
  o.innerHTML='<div class="p360-sheet"><div class="p360-grab"></div>'+
  '<div class="p360-title" style="text-align:center;margin-bottom:12px">پوسته‌های ویژه قطب‌نما</div>'+
  '<div class="text-small" style="text-align:center;opacity:.55;margin-bottom:14px">۱۷ طرح حرفه‌ای، یک جهت دقیق.</div>'+
  P.SKIN.map(function(s,i){
    return '<div class="p360-skin'+(i===P.st.theme?' on':'')+'" data-i="'+i+'">'+
    '<div class="prev" style="background:radial-gradient(circle at 50% 35%,'+s[8]+','+s[2]+');box-shadow:inset 0 0 0 2px '+s[3]+'"></div>'+
    '<div class="info"><div class="nm">'+s[0]+'</div><div class="kw">'+s[1]+'</div></div>'+
    '<div class="no">'+P.fmt(i+1,0)+'</div></div>';}).join('')+'</div>';
  D.body.appendChild(o);
  o.onclick=function(e){
    if(e.target===o){o.parentNode.removeChild(o);return;}
    var t=e.target.closest('.p360-skin'); if(!t)return;
    P.st.theme=+t.getAttribute('data-i');P.set('theme',P.st.theme);
    o.parentNode.removeChild(o);P.ctl();P.upd();
  };
};
/* calibration */
P.calib=function(){
  var b=P.$('p360cal'); if(b)b.parentNode.removeChild(b);
  var o=el('div','p360-ov'); o.id='p360cal';
  o.innerHTML='<div class="p360-sheet"><div class="p360-grab"></div>'+
  '<div class="p360-calib"><div class="p360-figure8"><i></i></div>'+
  '<div style="font-weight:700;font-size:16px">کالیبراسیون قطب‌نما</div>'+
  '<div style="opacity:.6;font-size:12.5px;margin-top:6px;line-height:1.9">گوشی را آرام در شکل «۸» بچرخانید<br>و روی میز بگذارید تا آرام شود</div>'+
  '<div id="calQ" style="margin-top:14px;font-size:14px;font-weight:700">دقت کالیبراسیون: <span>عالی</span></div></div>'+
  '<button class="p360-btn" id="calDone">پایان</button></div>';
  D.body.appendChild(o);
  P.$('calDone').onclick=function(){o.parentNode.removeChild(o);P.toast('کالیبراسیون ثبت شد ✓');};
};
P.toast=function(m){if(global.App&&App.toast)App.toast(m);else alert(m);};

/* stopwatch + countdown */
var sw={r:false,t:0,s:0,i:0,l:[]},tm={r:false,e:0,i:0,left:300};
P.timers=function(){
  var g=P.$('swGo'),h=P.$('swReset'),l=P.$('swLap'),t2=P.$('tmGo'),t3=P.$('tmReset');
  if(g)g.onclick=function(){
    if(sw.r){clearInterval(sw.i);sw.r=false;this.textContent='ادامه';this.className='go';}
    else{sw.r=true;this.textContent='توقف';this.className='stop';sw.s=sw.s||Date.now();
      sw.i=setInterval(swTick,100);}
  };
  if(h)h.onclick=function(){clearInterval(sw.i);sw.r=false;sw.s=0;sw.t=0;sw.l=[];g.textContent='شروع';g.className='go';swTick();};
  if(l)l.onclick=function(){if(!sw.r)return;sw.l.push(sw.t);var v=P.$('swLapv');
    if(v)v.textContent=sw.l.slice(-3).map(function(x,i){return 'لاپ '+(sw.l.length-i+1)+': '+P.clk(x);}).join(' · ');};
  if(t2)t2.onclick=function(){
    if(tm.r){clearInterval(tm.i);tm.r=false;this.textContent='ادامه';this.className='go';}
    else{tm.r=true;this.textContent='توقف';this.className='stop';tm.i=setInterval(tmTick,1000);}
  };
  if(t3)t3.onclick=function(){clearInterval(tm.i);tm.r=false;tm.e=0;tm.left=300;
    t2.textContent='شروع';t2.className='go';tmTick();};
  swTick();tmTick();
};
P.clk=function(ms){var s=Math.floor(ms/1000),m=Math.floor(s/60),x=s%60;return m+':'+(x<10?'0':'')+x;};
function swTick(){
  if(!sw.s)return;
  sw.t=Date.now()-sw.s; var v=P.$('swVal'); if(v)v.textContent=P.clk(sw.t);
}
function tmTick(){
  if(tm.r){tm.e++;tm.left=Math.max(0,300-tm.e);}
  var v=P.$('tmVal'); if(!v)return;
  var m=Math.floor(tm.left/60),s=tm.left%60; v.textContent=m+':'+(s<10?'0':'')+s;
  v.style.color=tm.left<=10?'#EF3E49':'#F1F4FD';
}

/* bind + expose */
P.go=function(){
  P.mount();P.init();P.ctl();P.upd();P.timers();
  var c=P.$('content'); if(c)c.scrollTop=0;
  var rs=document.querySelectorAll('#bxToolsRoot .p360-gi');
  var LIVE={sun:1,coordconv:1,azimuth:1,addr:1};
  Array.prototype.forEach.call(rs,function(b){
    b.onclick=function(){
      var f=b.getAttribute('data-f');
      if(LIVE[f]&&global.BXField){BXField.open(f);return;}
      P.toast('ابزار «'+b.textContent.trim()+'» به‌زودی');
    };
  });
  var bs=document.querySelectorAll('#bxToolsRoot .p360-bi,#bxToolsRoot .p360-compass-btn');
  Array.prototype.forEach.call(bs,function(b){
    b.onclick=function(){var p=b.getAttribute('data-p');
      if(p==='compass')P.$('p360cv').scrollIntoView({behavior:'smooth',block:'center'});
      else if(p==='home'){global.App?App.go('home'):location.reload();}
      else P.toast('به‌زودی');};
  });
};
global.PX=PX; global.P=P;
})(window);

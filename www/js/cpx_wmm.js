/* WMM-2025 — exact port of magdec2.c (jafrado/magdec) — declination/field/inclination */
(function (BX) {
'use strict';
BX.WMM_G=[0,-29351.8,-1410.8,-2556.6,2951.1,1649.3,1361,-2404.1,1243.8,453.6,895,799.5,55.7,-281.1,12.1,-233.2,368.9,187.2,-138.7,-142,20.9,64.4,63.8,76.9,-115.7,-40.9,14.9,-60.7,79.5,-77,-8.8,59.3,15.8,2.5,-11.1,14.2,23.2,10.8,-17.5,2,-21.7,16.9,15,-16.8,0.9,4.6,7.8,3,-0.2,-2.5,-13.1,2.4,8.6,-8.7,-12.9,-1.3,-6.4,0.2,2,-1,-0.6,-0.9,1.5,0.9,-2.7,-3.9,2.9,-1.5,-2.5,2.4,-0.6,-0.1,-0.6,-0.1,1.1,-1,-0.2,2.6,-2,-0.2,0.3,1.2,-1.3,0.6,0.6,0.5,-0.1,-0.4,-0.2,-1.3,-0.7];
BX.WMM_H=[0,0,4545.4,0,-3133.6,-815.1,0,-56.6,237.5,-549.5,0,278.6,-133.9,212,-375.6,0,45.4,220.2,-122.9,43,106.1,0,-18.4,16.8,48.8,-59.8,10.9,72.7,0,-48.9,-14.4,-1,23.4,-7.4,-25.1,-2.3,0,7.1,-12.6,11.4,-9.7,12.7,0.7,-5.2,3.9,0,-24.8,12.2,8.3,-3.3,-5.2,7.2,-0.6,0.8,10,0,3.3,0,2.4,5.3,-9.1,0.4,-4.2,-3.8,0.9,-9.1,0,0,2.9,-0.6,0.2,0.5,-0.3,-1.2,-1.7,-2.9,-1.8,-2.3,0,-1.3,0.7,1,-1.4,0,0.6,-0.1,0.8,0.1,-1,0.1,0.2];
var NMAX=12, dtr=Math.PI/180, a=6371.2, e2=0.00669437999014;
function IDX(n,m){return n*(n+1)/2+m;}
function legendre(n,m,x,z){}
BX.wmm=function(latDeg,lonDeg,altKm){
  var lat=latDeg*dtr, lon=lonDeg*dtr, alt=altKm||0, r=a+alt;
  var sl=Math.sin(lat), cl=Math.cos(lat), tl=Math.tan(lat);
  var gc=Math.atan((a/(a*Math.sqrt(1-e2)))*tl);
  var sin_gc=Math.sin(gc), cos_gc=Math.cos(gc);
  var ratio=a/r, rr=[ratio*ratio];
  for(var n=1;n<=NMAX;n++)rr[n]=rr[n-1]*ratio;
  var cm=[1,Math.cos(lon)], sm=[0,Math.sin(lon)];
  for(var m=2;m<=NMAX;m++){cm[m]=cm[m-1]*cm[1]-sm[m-1]*sm[1];sm[m]=sm[m-1]*cm[1]+cm[m-1]*sm[1];}
  var N=NMAX*(NMAX+3)/2, Pc=[], dPc=[];
  for(var q=0;q<N;q++){Pc[q]=0;dPc[q]=0;}
  Pc[0]=1;dPc[0]=0;
  for(var n2=1;n2<=NMAX;n2++){
    for(var m2=0;m2<=n2;m2++){
      var ix=IDX(n2,m2);
      if(n2===m2){var i1=IDX(n2-1,m2-1);Pc[ix]=cos_gc*Pc[i1];dPc[ix]=cos_gc*dPc[i1]+sin_gc*Pc[i1];}
      else if(n2===1&&m2===0){Pc[ix]=sin_gc;dPc[ix]=-cos_gc;}
      else{var i2=IDX(n2-1,m2);
        if(m2>n2-2){Pc[ix]=sin_gc*Pc[i2];dPc[ix]=sin_gc*dPc[i2]-cos_gc*Pc[i2];}
        else{var i3=IDX(n2-2,m2),k=((n2-1)*(n2-1)-m2*m2)/((2*n2-1)*(2*n2-3));
          Pc[ix]=sin_gc*Pc[i2]-k*Pc[i3];dPc[ix]=sin_gc*dPc[i2]-k*dPc[i3]-cos_gc*Pc[i2];}
      }
    }
  }
  var Bx=0,By=0,Bz=0;
  for(var n3=1;n3<=NMAX;n3++){
    for(var m3=0;m3<=n3;m3++){
      var i4=IDX(n3,m3),gg=BX.WMM_G[i4],hh=BX.WMM_H[i4];
      var gc_=gg*cm[m3]+hh*sm[m3], gs=gg*sm[m3]-hh*cm[m3];
      Bz-=rr[n3]*(n3+1)*gc_*Pc[i4]; By+=rr[n3]*m3*gs*Pc[i4]; Bx-=rr[n3]*gc_*dPc[i4];
    }
  }
  if(Math.abs(cos_gc)>1e-10)By/=cos_gc;
  var psi=(gc/dtr-latDeg)*dtr, Bxg=-Bx*Math.cos(psi)+Bz*Math.sin(psi);
  return {D:Math.atan2(-By,Bxg)/dtr, F:Math.sqrt(Bx*Bx+By*By+Bz*Bz)/1000, I:Math.atan2(-Bz,Math.hypot(Bx,By))/dtr};
};
})(typeof window!=='undefined'?(window.BX=window.BX||{}):{});

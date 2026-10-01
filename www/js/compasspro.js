/* BXCompassPro — قطب‌نمای سه‌بعدی Compass 360 Pro + کرنومتر + تایمر */
(function (global) {
'use strict';
var BX = global.BX = global.BX || {};
BX.THEMES = [
 {n:'قطبی ویژه',sub:'اقیانوسی',bg:'#0B1D2C',ring:['#102D42','#1E4A6B','#2E6B94'],tick:'#B8ECFF',label:'#F4FBFF',needle:'#6FD4FF',rose:'#6BAED2',face:'#07131E',bubble:'#9BE1FF',accent:'#6FD4FF'},
 {n:'اپسیدین پرو',sub:'مشکی قرمز',bg:'#0A0A0C',ring:['#17171A','#4B171A','#722226'],tick:'#B7C0CA',label:'#F8FAFC',needle:'#FF4C51',rose:'#4B171A',face:'#050506',bubble:'#FF8A8E',accent:'#FF4C51'},
 {n:'درخشش شفق',sub:'سبز فیروزه',bg:'#081008',ring:['#10250D','#1C3612','#5E9D28'],tick:'#88D640',label:'#E1FFC0',needle:'#A9F05A',rose:'#5E9D28',face:'#050B04',bubble:'#C7FF7A',accent:'#A9F05A'},
 {n:'کاشف کلاسیک',sub:'زیتونی',bg:'#14180F',ring:['#252A1B','#3A442A','#59663C'],tick:'#C4CE9E',label:'#F2F5E4',needle:'#C9D66B',rose:'#59663C',face:'#0B0E08',bubble:'#DEE99B',accent:'#C9D66B'},
 {n:'نظامی تاکتیکی',sub:'سبز ارتشی',bg:'#0A1410',ring:['#12251A','#1D3B28','#2E5A3C'],tick:'#8FBF9F',label:'#E6F5EC',needle:'#4ADE80',rose:'#2E5A3C',face:'#060D09',bubble:'#86EFAC',accent:'#4ADE80'},
 {n:'آبی اقیانوس',sub:'آبی عمق',bg:'#071423',ring:['#0E2438','#153A57','#1E5678'],tick:'#93C5FD',label:'#EFF6FF',needle:'#38BDF8',rose:'#1E5678',face:'#040D18',bubble:'#7DD3FC',accent:'#38BDF8'},
 {n:'سفید ساده',sub:'روشن تمیز',bg:'#F4F6F8',ring:['#DFE4EA','#C7CFD9','#AAB4C0'],tick:'#5A6673',label:'#1A222B',needle:'#E5484D',rose:'#AAB4C0',face:'#FFFFFF',bubble:'#FF8A8E',accent:'#E5484D'},
 {n:'اوفرویت',sub:'آبی شفاف',bg:'#1A2A38',ring:['#28455A','#3A6480','#4E86A6'],tick:'#D6ECFA',label:'#FFFFFF',needle:'#7DD3FC',rose:'#4E86A6',face:'#12212C',bubble:'#BAE6FD',accent:'#7DD3FC'},
 {n:'طلایی',sub:'لوکس طلا',bg:'#151006',ring:['#2A2109','#4A3A0F','#6E5616'],tick:'#E8D08A',label:'#FFF8E1',needle:'#F5C542',rose:'#6E5616',face:'#0D0903',bubble:'#FFE08A',accent:'#F5C542'},
 {n:'دید در شب',sub:'سبز شبانه',bg:'#060B06',ring:['#0D1A0C','#15280F','#1F3B14'],tick:'#6EE7A0',label:'#DFFFE9',needle:'#22C55E',rose:'#1F3B14',face:'#030703',bubble:'#86EFAC',accent:'#22C55E'},
 {n:'پریمیوم طلایی',sub:'طلایی درخشان',bg:'#0F0D08',ring:['#241D0D','#3E3212','#63501A'],tick:'#F3D98B',label:'#FFFBEB',needle:'#FFD24A',rose:'#63501A',face:'#080703',bubble:'#FFE79A',accent:'#FFD24A'},
 {n:'کاوشگر فضا',sub:'بنفش فضایی',bg:'#0C0718',ring:['#18102B','#261A45','#37265F'],tick:'#C4B5FD',label:'#F5F3FF',needle:'#A855F7',rose:'#37265F',face:'#070412',bubble:'#D8B4FE',accent:'#A855F7'},
 {n:'ژنگلیان',sub:'سبز زمرد',bg:'#04120E',ring:['#0A2019','#0F3025','#164A38'],tick:'#6EE7B7',label:'#ECFDF5',needle:'#10B981',rose:'#164A38',face:'#020A08',bubble:'#6EE7B7',accent:'#10B981'},
 {n:'خوشه بنفش',sub:'بنفش نئون',bg:'#0F0818',ring:['#1C0F2E','#2B1849','#3F2564'],tick:'#D8B4FE',label:'#FAF5FF',needle:'#A78BFA',rose:'#3F2564',face:'#080411',bubble:'#C4B5FD',accent:'#A78BFA'},
 {n:'نیل',sub:'آبی عمیق',bg:'#080D1C',ring:['#101831','#18234A','#233263'],tick:'#93C5FD',label:'#EEF2FF',needle:'#6366F1',rose:'#233263',face:'#050814',bubble:'#A5B4FC',accent:'#818CF8'},
 {n:'شاره خورشیدی',sub:'نارنجی گرم',bg:'#180C06',ring:['#2A1408','#40200D','#5C3012'],tick:'#FDBA74',label:'#FFF7ED',needle:'#F97316',rose:'#5C3012',face:'#0E0704',bubble:'#FDBA74',accent:'#FB923C'},
 {n:'لیل تیتانیوم',sub:'تیتانیوم',bg:'#0D0F12',ring:['#181B20','#252A31','#363D46'],tick:'#B6BEC9',label:'#F5F7FA',needle:'#94A3B8',rose:'#363D46',face:'#070809',bubble:'#E2E8F0',accent:'#CBD5E1'}
];
global.BXCompassPro = BX;
})(window);

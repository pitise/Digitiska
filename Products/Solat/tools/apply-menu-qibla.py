"""Patch #6: three-bar menu (icons in a column) + live Qibla compass (static fallback).
Run: python3 -I apply-menu-qibla.py Solat.html sw.js"""
import re, sys, math
html_p, sw_p = sys.argv[1:3]
s = open(html_p, encoding='utf-8').read()
def sub1(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90]); s = s.replace(old, new)

# ---------- 1. header: one three-bar button; the icons live in a column menu ----------
m = re.search(r'    <div class="actions">\n(.*?)\n    </div>\n  </header>', s, re.S)
assert m, 'actions block not found'
inner = m.group(1)
assert 'id="btn-settings"' in inner and 'id="btn-refresh"' in inner
NEW_ACTIONS = '''    <div class="actions">
      <button id="btn-menu" class="icon-btn" type="button" aria-label="Menu" aria-haspopup="true" aria-expanded="false" aria-controls="menu">
        <svg class="ico" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <div id="menu" class="menu" hidden>
      <button id="btn-qibla" class="icon-btn" type="button" aria-label="Arah kiblat">
        <svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/></svg>
      </button>
%s
      </div>
    </div>
  </header>''' % inner
s = s[:m.start()] + NEW_ACTIONS + s[m.end():]

# ---------- 2. CSS (one block, easy to strip in the "same as v7" test) ----------
sub1('details.help p{font-size:13px;color:var(--mut);margin:6px 0}', '''details.help p{font-size:13px;color:var(--mut);margin:6px 0}
/*menu*/
.actions{position:relative}
.menu{position:absolute;top:calc(100% + 8px);right:0;z-index:20;display:flex;flex-direction:column;gap:8px;padding:8px;background:var(--card);border:1px solid var(--line);border-radius:26px;box-shadow:0 14px 28px -12px #000c}
#btn-menu[aria-expanded="true"]{border-color:var(--gold)}
.dial{display:grid;place-items:center;margin:8px 0 4px}
.dial svg{width:min(100%,280px);height:auto}
.q-ring{fill:var(--bg2);stroke:var(--line);stroke-width:2}
.q-tick{stroke:#3a4654;stroke-width:1.5}.q-tick.major{stroke:var(--mut);stroke-width:2.5}
#q-dial text{font:600 17px system-ui,sans-serif;fill:var(--mut);text-anchor:middle}
#q-dial text.n{fill:var(--gold2)}
.q-line{stroke:var(--gold);stroke-width:5;stroke-linecap:round}
.q-head{fill:var(--gold)}
.q-hub{fill:var(--card);stroke:var(--gold);stroke-width:3}
.q-kaaba{fill:#0b0d10;stroke:var(--gold);stroke-width:2}
.q-band{fill:var(--gold)}
.q-top{fill:var(--gold2)}
#qibla.aligned .q-line,#qibla.aligned .q-hub,#qibla.aligned .q-kaaba{stroke:#6fdc9f}
#qibla.aligned .q-head,#qibla.aligned .q-band{fill:#6fdc9f}
.q-deg{font:600 44px/1.1 Georgia,serif;color:var(--gold2);text-align:center}
.q-mid{text-align:center}
.q-status{text-align:center;font-size:15px;color:var(--fg);margin:8px 0 2px;min-height:2.6em}
/*/menu*/''')

# ---------- 3. Qibla dialog ----------
cx = cy = 130
def pt(deg, r): return (cx + r*math.sin(math.radians(deg)), cy - r*math.cos(math.radians(deg)))
ticks = ''
for d in range(0, 360, 15):
    major = d % 90 == 0
    x1, y1 = pt(d, 96 if major else 102); x2, y2 = pt(d, 110)
    ticks += '<line class="q-tick%s" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (' major' if major else '', x1, y1, x2, y2)
letters = ''
for t, d, cls in (('U', 0, ' class="n"'), ('T', 90, ''), ('S', 180, ''), ('B', 270, '')):
    x, y = pt(d, 80); letters += '<text%s x="%.1f" y="%.1f">%s</text>' % (cls, x, y + 6, t)
DIALOG = '''<dialog id="qibla">
  <h2>Arah Kiblat</h2>
  <p id="q-place" class="small"></p>
  <div class="dial"><svg id="q-svg" viewBox="0 0 260 260" role="img" aria-label="Kompas kiblat">
    <circle class="q-ring" cx="130" cy="130" r="120"/>
    <g id="q-dial">%s%s
      <g id="q-arrow"><line class="q-line" x1="130" y1="130" x2="130" y2="58"/><polygon class="q-head" points="130,44 123,60 137,60"/>
        <g transform="translate(130 28)"><rect class="q-kaaba" x="-11" y="-11" width="22" height="22" rx="3"/><rect class="q-band" x="-11" y="-5" width="22" height="4"/></g></g>
    </g>
    <circle class="q-hub" cx="130" cy="130" r="8"/>
    <polygon class="q-top" points="130,2 124,14 136,14"/>
  </svg></div>
  <div class="q-mid"><div id="q-deg" class="q-deg"></div><div id="q-dir" class="small"></div><div id="q-turn" class="small"></div><div id="q-head" class="small"></div></div>
  <p id="q-status" class="q-status" role="status"></p>
  <div class="q-mid"><button id="q-perm" class="btn" type="button" hidden>Benarkan sensor</button></div>
  <h3>Cara guna</h3>
  <p class="small">Letakkan telefon mendatar (rata) dan jauhkan daripada logam atau magnet. Putar sehingga anak panah emas dengan lambang Kaabah menghala ke atas; ketika itu anda menghadap kiblat.</p>
  <p class="small">Jika bacaan tidak stabil, gerakkan telefon membentuk angka 8 untuk menentukur kompas. Kunci putaran skrin kepada menegak.</p>
  <p class="small warn">Panduan sahaja. Sahkan dengan kompas yang telah ditentukur atau arah kiblat masjid berhampiran.</p>
  <button id="q-close" class="btn primary" type="button" style="margin-top:10px">Tutup</button>
</dialog>

''' % (ticks, letters)
sub1('<button id="stopbar"', DIALOG + '<button id="stopbar"')

# ---------- 4. pure helpers (extracted by the unit tests) ----------
PURE = '''/*<qibla-pure>*/
/* Qibla: great-circle bearing to the Kaaba (21.4225 N, 39.8262 E), degrees clockwise from true north */
const KAABA={lat:21.4225,lng:39.8262};
const norm360=a=>((a%360)+360)%360;
const angDiff=(a,b)=>{const d=norm360(a-b);return d>180?d-360:d};
function qiblaBearing(lat,lng){const r=Math.PI/180,k=KAABA.lat*r,g=KAABA.lng*r,p=lat*r,dl=g-lng*r;
  return norm360(Math.atan2(Math.sin(dl),Math.cos(p)*Math.tan(k)-Math.sin(p)*Math.cos(dl))*180/Math.PI)}
const DIR16=["Utara","Utara–Timur Laut","Timur Laut","Timur–Timur Laut","Timur","Timur–Tenggara","Tenggara","Selatan–Tenggara","Selatan","Selatan–Barat Daya","Barat Daya","Barat–Barat Daya","Barat","Barat–Barat Laut","Barat Laut","Utara–Barat Laut"];
const dirName=b=>DIR16[Math.round(norm360(b)/22.5)%16];
/* heading of the top edge of a phone held flat; Android gives an absolute alpha, iPhone gives webkitCompassHeading; anything else is not a compass reading */
function headingFromEvent(e){if(typeof e.webkitCompassHeading==="number")return norm360(e.webkitCompassHeading);
  if(e.absolute===true&&typeof e.alpha==="number")return norm360(360-e.alpha);return null}
const smoothHeading=(prev,next,k)=>prev==null?next:norm360(prev+angDiff(next,prev)*k);
/*</qibla-pure>*/
'''
sub1('/*</jakim-pure>*/\n', '/*</jakim-pure>*/\n' + PURE)

# ---------- 5. behaviour: menu + compass ----------
UI = '''/* Menu: one three-bar button; the icons open in a column */
const menu=$("menu"),btnMenu=$("btn-menu");
function setMenu(open){menu.hidden=!open;btnMenu.setAttribute("aria-expanded",open?"true":"false")}
btnMenu.onclick=e=>{e.stopPropagation();setMenu(menu.hidden)};
menu.onclick=()=>setMenu(false);
document.addEventListener("click",e=>{if(!menu.hidden&&!e.target.closest(".actions"))setMenu(false)});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!menu.hidden){setMenu(false);btnMenu.focus()}});

/* Qibla compass: live when the phone has a compass sensor, otherwise a fixed dial with the bearing */
const qd=$("qibla");let qBear=0,qHead=null,qRaf=0,qTimer=0,qSeen=false;
const qSet=(id,t)=>{$(id).textContent=t};
const qRot=(id,deg)=>$(id).setAttribute("transform","rotate("+deg.toFixed(1)+" 130 130)");
function qBearing(){qBear=qiblaBearing(st.loc.lat,st.loc.lng);qSet("q-deg",qBear.toFixed(1)+"°");qSet("q-dir",dirName(qBear));
  qSet("q-turn",qBear>180?(360-qBear).toFixed(1)+"° ke kiri dari Utara":qBear.toFixed(1)+"° ke kanan dari Utara");
  qSet("q-place","Dikira dari lokasi anda: "+st.loc.name);qRot("q-arrow",qBear)}
function qDraw(){qRaf=0;if(qHead==null)return;qRot("q-dial",-qHead);
  const d=angDiff(qBear,qHead),ad=Math.abs(d);qd.classList.toggle("aligned",ad<=3);
  qSet("q-head","Arah telefon: "+Math.round(qHead)+"°");
  qSet("q-status",ad<=3?"Menghadap kiblat ✓":"Putar ke "+(d>0?"kanan ":"kiri ")+Math.round(ad)+"°")}
function qOri(e){const h=headingFromEvent(e);if(h==null)return;qSeen=true;qHead=smoothHeading(qHead,h,.25);if(!qRaf)qRaf=requestAnimationFrame(qDraw)}
function qStatic(){qHead=null;qRot("q-dial",0);qd.classList.remove("aligned");qSet("q-head","");
  qSet("q-status","Sensor kompas tidak tersedia"+(window.isSecureContext?"":" (memerlukan sambungan https)")+". Buka aplikasi kompas pada telefon dan putar sehingga bacaan menunjukkan "+qBear.toFixed(1)+"°.")}
function qListen(){window.addEventListener("deviceorientationabsolute",qOri,true);window.addEventListener("deviceorientation",qOri,true);
  clearTimeout(qTimer);qTimer=setTimeout(()=>{if(!qSeen)qStatic()},2500)}
function qStop(){window.removeEventListener("deviceorientationabsolute",qOri,true);window.removeEventListener("deviceorientation",qOri,true);
  clearTimeout(qTimer);cancelAnimationFrame(qRaf);qRaf=0}
function qOpen(){qBearing();qHead=null;qSeen=false;qd.classList.remove("aligned");$("q-perm").hidden=true;qSet("q-head","");qRot("q-dial",0);
  qSet("q-status","Mencari sensor kompas…");const DOE=window.DeviceOrientationEvent;
  if(DOE&&typeof DOE.requestPermission==="function"){$("q-perm").hidden=false;qSet("q-status","Sentuh “Benarkan sensor” untuk menghidupkan kompas.")}
  else if(DOE)qListen();else qStatic();
  qd.showModal()}
$("btn-qibla").onclick=qOpen;
$("q-perm").onclick=()=>{const fail=()=>{$("q-perm").hidden=true;qStatic()};
  DeviceOrientationEvent.requestPermission().then(r=>{if(r==="granted"){$("q-perm").hidden=true;qSet("q-status","Mencari sensor kompas…");qListen()}else fail()}).catch(fail)};
$("q-close").onclick=()=>qd.close();
qd.addEventListener("close",qStop);

'''
sub1('let taps=0,tapT=0;', UI + 'let taps=0,tapT=0;')
open(html_p, 'w', encoding='utf-8').write(s)
w = open(sw_p).read(); assert "var CACHE = 'solat-v4';" in w
open(sw_p, 'w').write(w.replace("var CACHE = 'solat-v4';", "var CACHE = 'solat-v5';"))
print('patched')

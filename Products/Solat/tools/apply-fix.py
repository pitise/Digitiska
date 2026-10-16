"""One-off patch: applies the install + location fixes to the v7 export (Solat.html). Run: python3 -I apply-fix.py <Solat.html> <icons-dir>"""
import re, sys, base64
path, icons = sys.argv[1], sys.argv[2]
s = open(path, encoding='utf-8').read()
n_before = len(s)

def sub1(old, new, count=1):
    global s
    assert s.count(old) >= 1, 'not found: ' + old[:80]
    if count == 0: s = s.replace(old, new)
    else:
        assert s.count(old) == count, 'expected %d x, found %d: %s' % (count, s.count(old), old[:80])
        s = s.replace(old, new)

b64 = lambda f: base64.b64encode(open(icons + '/' + f, 'rb').read()).decode()

# ---------- 1. install: real manifest link, small embedded icons, name "Solat" ----------
s, k = re.subn(r'<link rel="manifest" href="data:[^"]*">\n<link rel="icon" type="image/png" href="data:[^"]*">\n<link rel="apple-touch-icon" href="data:[^"]*">',
    lambda m: '<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" type="image/png" href="data:image/png;base64,%s">\n<link rel="apple-touch-icon" href="data:image/png;base64,%s">' % (b64('icon-192.png'), b64('apple-touch-icon.png')), s)
assert k == 1, 'icon/manifest links not matched'
sub1('<title>Waktu Solat</title>', '<title>Solat</title>')
sub1('<meta name="apple-mobile-web-app-title" content="Waktu Solat">', '<meta name="apple-mobile-web-app-title" content="Solat">\n<meta name="application-name" content="Solat">')

# ---------- 2. location helpers ----------
sub1('let locationRequest=0;', '''/* Place names: never show a local council (e.g. "Majlis Perbandaran Kajang"); prefer the district (e.g. Hulu Langat). */
const COUNCIL=/\\bcouncil\\b|^(majlis|dewan bandaraya|perbadanan)\\b|\\b(bandaraya|perbandaran)\\b/i;
const goodName=n=>{n=String(n||"").replace(/^(daerah|mukim)\\s+/i,"").replace(/\\s+(district|daerah)$/i,"").trim();return n&&!COUNCIL.test(n)?n:""};
const pickName=a=>{for(const k of ["county","state_district","suburb","city_district","village","town","city","municipality","state"]){const v=goodName(a[k]);if(v)return v}return ""};
/* Positions sent to outside services are rounded to 2 decimals (about 1 km). */
const r2=x=>Math.round(x*100)/100;
let locationRequest=0;''')
sub1('lat=${lat.toFixed(3)}&lon=${lng.toFixed(3)}', 'lat=${r2(lat).toFixed(2)}&lon=${r2(lng).toFixed(2)}')
sub1('const nm=a.town||a.city||a.village||a.suburb||a.county||a.state_district||a.state;', 'const nm=pickName(a);')
sub1('j.city&&(j.city+(j.region?", "+j.region:""))', 'goodName(j.city)&&(goodName(j.city)+(j.region?", "+j.region:""))', count=3)
sub1('const nm=a.town||a.city||a.village||a.suburb||a.county||q;', 'const nm=goodName(a.town)||goodName(a.city)||goodName(a.village)||goodName(a.suburb)||goodName(a.county)||q;')
sub1('getJSON(API+"/zones/"+l.lat+"/"+l.lng)', 'getJSON(API+"/zones/"+r2(l.lat)+"/"+r2(l.lng))')

# ---------- 3. locate(): GPS first (low power, then high accuracy), specific messages, internet guess only on request ----------
m = re.search(r'function locate\(\)\{.*?\n\}\n(?=\$\("btn-refresh"\)\.onclick=locate;)', s, re.S)
assert m, 'locate() not found'
NEW = '''const IP_NOTE="Lokasi anggaran internet — mungkin berbeza. Pilih bandar untuk ketepatan.";
const MSG_DENIED="Lokasi tidak dibenarkan. Dalam tetapan pelayar, benarkan Lokasi untuk laman ini, kemudian tekan ↻. Atau pilih bandar anda.";
const MSG_UNAVAIL="Lokasi tidak dapat dikesan. Hidupkan Lokasi pada telefon dan tekan ↻, atau pilih bandar anda.";
const MSG_INSECURE="Pelayar tidak membenarkan lokasi untuk fail ini (perlu dibuka melalui HTTPS). Pilih bandar anda.";
function showFail(request,msg){
  if(request!==locationRequest)return;
  $("loc-name").textContent=st.loc.name;citySel.value=st.loc.city||"__gps";
  if(st.loc.source==="ip")notice(IP_NOTE,"Cari",searchTown);
  else notice(msg+" Jadual guna "+st.loc.name+".","Guna anggaran",approxLocate);
}
async function approxLocate(){
  const request=++locationRequest;$("loc-name").textContent="Mencari lokasi…";notice("");
  if(await ipLocate(request)){notice(IP_NOTE,"Cari",searchTown)}
  else if(request===locationRequest){$("loc-name").textContent=st.loc.name;citySel.value=st.loc.city||"__gps";notice("Anggaran lokasi gagal. Pilih bandar anda dalam senarai Lokasi.","Cari",searchTown)}
}
function locate(){
  const request=++locationRequest;$("loc-name").textContent="Mencari lokasi…";notice("");
  if(!navigator.geolocation||!window.isSecureContext){showFail(request,MSG_INSECURE);return}
  const ok=async p=>{
    if(request!==locationRequest)return;
    if(await setPlace(p.coords.latitude,p.coords.longitude,null,"gps",request))notice("");else showFail(request,MSG_UNAVAIL);
  };
  /* 1st try: network/Wi-Fi position (fast, low battery). 2nd try only on timeout/unavailable: GPS chip. Denied is final. */
  navigator.geolocation.getCurrentPosition(ok,e=>{
    if(request!==locationRequest)return;
    if(e&&e.code===1){showFail(request,MSG_DENIED);return}
    navigator.geolocation.getCurrentPosition(ok,e2=>showFail(request,e2&&e2.code===1?MSG_DENIED:MSG_UNAVAIL),{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  },{enableHighAccuracy:false,timeout:15000,maximumAge:300000});
}
'''
s = s[:m.start()] + NEW + s[m.end():]

# ---------- 4. privacy text ----------
sub1('Nama tempat dan carian menggunakan OpenStreetMap Nominatim. Jika GPS tidak tersedia, perkhidmatan lokasi internet menerima alamat IP untuk memberi anggaran lokasi.',
     'Nama tempat dan carian menggunakan OpenStreetMap Nominatim (kedudukan dibulatkan kira-kira 1 km). Anggaran lokasi internet hanya berjalan jika anda tekan "Guna anggaran"; ketika itu alamat IP anda dihantar kepada perkhidmatan tersebut.')

# ---------- 5. service worker (only when served over http/https; harmless otherwise) ----------
sub1('if(st.loc.source!=="manual")locate();\n})();', 'if(st.loc.source!=="manual")locate();\nif("serviceWorker" in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register("sw.js").catch(()=>{});\n})();')

# ---------- 6. live countdown in the tab title only on desktop (mouse) browsers ----------
# On phones the title stays "Solat": "Add to home screen" often takes the shortcut name from the page title,
# and v7 rewrote it every second ("Zohor 03:06:59 · Waktu Solat").
sub1('  document.title=`${ck==="syuruk"?"Zohor":P(ck).n} ${dur(ne-now)} · Waktu Solat`;',
     '  if(matchMedia("(hover:hover) and (pointer:fine)").matches)document.title=`${ck==="syuruk"?"Zohor":P(ck).n} ${dur(ne-now)} · Waktu Solat`;')

open(path, 'w', encoding='utf-8').write(s)
print('patched: %d -> %d bytes' % (n_before, len(s)))

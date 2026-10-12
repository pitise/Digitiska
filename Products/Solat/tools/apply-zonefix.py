"""Patch #4: zone matching that works for places whose address has no obvious district field (e.g. "Bangi Lama").
Run: python3 -I apply-zonefix.py Solat.html sw.js"""
import sys
html_p, sw_p = sys.argv[1:3]
s = open(html_p, encoding='utf-8').read()
def sub1(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90]); s = s.replace(old, new)

# 1. match against EVERY address value (not a fixed list of keys), keeping the likely district fields first
sub1('''function zoneFromAddress(a){a=a||{};const st=a.state?zState(a.state):"";if(a.state&&!st)return null;
  for(const c of [a.county,a.state_district,a.city_district,a.city,a.town,a.municipality,a.village,a.suburb,a.state]){const z=zoneByName(c,st);if(z)return z}
  return st&&WHOLE[st]||null}''',
'''const ZSKIP=/^(country|country_code|postcode|house_number|road|state|ISO3166-2-lvl\\d+)$/i;
function zoneFromAddress(a){a=a||{};const st=a.state?zState(a.state):"";if(a.state&&!st)return null;
  const first=[a.county,a.state_district,a.district,a.city_district,a.city,a.town,a.municipality,a.village,a.suburb];
  const rest=Object.keys(a).filter(k=>!ZSKIP.test(k)).map(k=>a[k]);
  for(const c of first.concat(rest,[a.state])){const z=zoneByName(c,st);if(z)return z}
  return st&&WHOLE[st]||null}''')

# 2. place lookups: a helper, and extra lookups at district level when the first one gives no zone
sub1('async function setPlace(lat,lng,name,source,request,zone){',
'''const dbg={};
const nomReverse=(zoom,lat,lng)=>fetchJSON(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=${zoom}&accept-language=ms&lat=${r2(lat).toFixed(2)}&lon=${r2(lng).toFixed(2)}`);
/* If the first lookup gave no JAKIM zone, ask again at district level (zoom 8, then 10), one request per 1.1 s as the service asks */
async function refineZone(place,request){
  for(const z of [8,10]){
    if(place.zone||request!==locationRequest)return;
    try{await new Promise(r=>setTimeout(r,1100));if(request!==locationRequest)return;
      const j=await nomReverse(z,place.lat,place.lng);dbg["zoom"+z]=j.address||{};
      const zn=zoneFromAddress(j.address);if(zn){place.zone=zn;dbg.zone=zn;st.loc=place;SS("loc",place);render(true);return}}catch{}}
}
async function setPlace(lat,lng,name,source,request,zone){''')
sub1('''  if(!name||(!place.zone&&inMY(place))){try{const j=await fetchJSON(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=12&accept-language=ms&lat=${r2(lat).toFixed(2)}&lon=${r2(lng).toFixed(2)}`);
    const a=j.address||{};if(!name){const nm=pickName(a);if(nm)place.name=nm+(a.state&&a.state!==nm?", "+a.state:"")}
    if(!place.zone)place.zone=zoneFromAddress(a)}catch{}}
  if(request!==locationRequest)return false;
  st.loc=place;SS("loc",place);render(true);return true;''',
'''  if(!name||(!place.zone&&inMY(place))){try{const j=await nomReverse(12,lat,lng);
    const a=j.address||{};dbg.zoom12=a;if(!name){const nm=pickName(a);if(nm)place.name=nm+(a.state&&a.state!==nm?", "+a.state:"")}
    if(!place.zone)place.zone=zoneFromAddress(a)}catch{}}
  if(request!==locationRequest)return false;
  dbg.lat=r2(lat);dbg.lng=r2(lng);dbg.zone=place.zone;
  st.loc=place;SS("loc",place);render(true);
  if(!place.zone&&inMY(place))refineZone(place,request);
  return true;''')

# 3. hidden diagnostic: tap the "© 2026 Digitiska" line 5 times to show/hide it (rounded position + what the place service answered)
sub1('#brand{margin-top:4px}', '#brand{margin-top:4px}\n#dbg{font:11px/1.4 ui-monospace,monospace;color:var(--mut);white-space:pre-wrap;word-break:break-all;margin:8px 0 0;padding:8px;border:1px solid var(--line);border-radius:8px;text-align:left}')
sub1('  <footer id="brand">© 2026 Digitiska</footer>', '  <footer id="brand">© 2026 Digitiska</footer>\n  <pre id="dbg" hidden></pre>')
sub1('/* Start */', '''let taps=0,tapT=0;$("brand").onclick=()=>{const n=Date.now();taps=n-tapT<1500?taps+1:1;tapT=n;if(taps>=5){taps=0;const d=$("dbg");d.hidden=!d.hidden;
  if(!d.hidden)d.textContent=JSON.stringify({place:{name:st.loc.name,source:st.loc.source||null,zone:st.loc.zone||null,lat:r2(st.loc.lat),lng:r2(st.loc.lng)},footer:$("src").textContent,placeService:dbg},null,1)}};

/* Start */''')
open(html_p, 'w', encoding='utf-8').write(s)
w = open(sw_p).read(); assert "var CACHE = 'solat-v2';" in w
open(sw_p, 'w').write(w.replace("var CACHE = 'solat-v2';", "var CACHE = 'solat-v3';"))
print('patched')

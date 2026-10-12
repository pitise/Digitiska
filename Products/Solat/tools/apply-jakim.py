"""Patch #2 for Solat.html: read the timetable directly from JAKIM e-Solat (no mirror).
Run: python3 -I apply-jakim.py Solat.html path/to/jakim-esolat-api/data/zone/groups.json
The zone table comes from the community guide github.com/acfatah/jakim-esolat-api (MIT licence, last updated 30.May.2020).
It is NOT an official JAKIM list; the app only trusts a zone if JAKIM's own answer for that zone code validates."""
import json, re, sys
path, groups_path = sys.argv[1], sys.argv[2]
s = open(path, encoding='utf-8').read()

def sub1(old, new):
    global s
    assert s.count(old) == 1, 'expected exactly 1 x: ' + old[:90] + ' (found %d)' % s.count(old)
    s = s.replace(old, new)

groups = json.load(open(groups_path, encoding='utf-8'))
assert len(groups) == 58
zones_js = json.dumps([[g['zone'], g['state'], g['area']] for g in groups], ensure_ascii=False, separators=(',', ':'))

# ---------- 1. pure block: zone table, name matching, JAKIM answer parser (extracted by the tests) ----------
PURE = '''/*<jakim-pure>*/
/* JAKIM zones (58). Source: community guide github.com/acfatah/jakim-esolat-api (MIT), last updated 30.May.2020. Not an official list. */
const ZONES=%s;
const ALIAS={"petaling jaya":"petaling","alor setar":"kota setar","genting highlands":"genting higlands","gerik":"grik","sungai siput":"sg siput","kampung gajah":"kg gajah","long pasia":"long pa sia","engkilili":"engkelili","kampung patarikan":"zon khas (kampung patarikan)","sandakan":"bandar sandakan","tawau":"bandar tawau","george town":"pulau pinang"};
const zNorm=n=>{n=goodName(n);if(!n)return "";n=n.toLowerCase().replace(/\\((daerah[^)]*)\\)/g," ").replace(/^(daerah|mukim|bahagian|wilayah persekutuan)\\s+/,"").replace(/[.,]/g," ").replace(/\\s+/g," ").trim();return ALIAS[n]||n};
const ZIDX={},ZBYNAME={};
for(const [code,state,areas] of ZONES)for(const a of areas){const k=zNorm(a);ZIDX[state+"|"+k]=code;(ZBYNAME[k]=ZBYNAME[k]||new Set()).add(code)}
const ZSTATES=[...new Set(ZONES.map(z=>z[1]))];
const WHOLE={};for(const st of ZSTATES){const zs=ZONES.filter(z=>z[1]===st);if(zs.length===1)WHOLE[st]=zs[0][0]}
const zState=s=>{s=String(s||"").toLowerCase();if(!s)return "";if(/kuala lumpur|putrajaya|labuan|wilayah/.test(s))return "Wilayah Persekutuan";if(/penang|pinang/.test(s))return "Pulau Pinang";if(/malacca|melaka/.test(s))return "Melaka";return ZSTATES.find(x=>x.toLowerCase()===s)||""};
const zoneByName=(name,state)=>{const k=zNorm(name);if(!k)return null;if(state)return ZIDX[state+"|"+k]||null;const set=ZBYNAME[k];return set&&set.size===1?[...set][0]:null};
function zoneFromAddress(a){a=a||{};const st=a.state?zState(a.state):"";if(a.state&&!st)return null;
  for(const c of [a.county,a.state_district,a.city_district,a.city,a.town,a.municipality,a.village,a.suburb,a.state]){const z=zoneByName(c,st);if(z)return z}
  return st&&WHOLE[st]||null}
const JK_MON={jan:1,feb:2,mac:3,mar:3,apr:4,mei:5,may:5,jun:6,jul:7,ogo:8,ogs:8,aug:8,sep:9,okt:10,oct:10,nov:11,dis:12,dec:12};
const jkMin=s=>{const m=/^(\\d{1,2}):(\\d{2})/.exec(String(s||""));if(!m)return NaN;const h=+m[1],n=+m[2];return h<24&&n<60?h*60+n:NaN};
/* JAKIM answer -> {"YYYY-MM-DD":[imsak,subuh,syuruk,zohor,asar,maghrib,isyak] in minutes after midnight}; throws if it is not what we expect */
function jkParse(j,zone){
  if(!j||!/^ok/i.test(String(j.status||""))||!Array.isArray(j.prayerTime)||String(j.zone||"").toUpperCase()!==zone)throw new Error("unexpected JAKIM answer");
  const days={};
  for(const p of j.prayerTime){const m=/^(\\d{1,2})-([A-Za-z]{3})[A-Za-z]*-(\\d{4})$/.exec(String(p&&p.date||""));if(!m)continue;const mo=JK_MON[m[2].toLowerCase()];if(!mo)continue;
    const t=[p.imsak,p.fajr,p.syuruk,p.dhuhr,p.asr,p.maghrib,p.isha].map(jkMin);
    if(t.some(x=>!(x>=0))||t.some((x,i)=>i>0&&x<=t[i-1]))continue;
    days[m[3]+"-"+("0"+mo).slice(-2)+"-"+("0"+m[1]).slice(-2)]=t}
  if(!Object.keys(days).length)throw new Error("no usable days");return days}
/*</jakim-pure>*/
''' % zones_js
sub1('const r2=x=>Math.round(x*100)/100;\n', 'const r2=x=>Math.round(x*100)/100;\n' + PURE)

# ---------- 2. replace the mirror block with a direct JAKIM client ----------
m = re.search(r'/\* ---------- Official JAKIM e-Solat timetable \(via api\.waktusolat\.app mirror\) ---------- \*/.*?function timesFor\(d\)\{return offFor\(d\)\|\|calc\(d,st\.loc\.lat,st\.loc\.lng,st\.method\)\}\n', s, re.S)
assert m, 'mirror block not found'
CLIENT = '''/* ---------- JAKIM e-Solat timetable, read directly from www.e-solat.gov.my (no third party) ---------- */
const JAKIM="https://www.e-solat.gov.my/index.php?r=esolatApi/takwimsolat&zone=";
let zone=null,jkYear=true;const jk={};
function inMY(l){return l.lat>0.8&&l.lat<7.5&&l.lng>99.5&&l.lng<119.5}
const dkey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
function jkEntry(z){if(!jk[z]){const c=LS("jk."+z)||{};jk[z]={t:c.t||0,days:c.days||{},busy:false,tried:0}}return jk[z]}
async function jkGet(z,period){const c=new AbortController(),tm=setTimeout(()=>c.abort(),12000);
  try{const r=await fetch(JAKIM+z+"&period="+period,{signal:c.signal,credentials:"omit"});if(!r.ok)throw new Error("HTTP "+r.status);return jkParse(await r.json(),z)}finally{clearTimeout(tm)}}
/* whole year first (one request); if JAKIM refuses that, the current month */
async function jkFetch(z){const e=jkEntry(z);if(e.busy||Date.now()-e.tried<10*60000)return;e.busy=true;e.tried=Date.now();
  try{let days;if(jkYear){try{days=await jkGet(z,"year")}catch{jkYear=false}}if(!days)days=await jkGet(z,"month");
    const keep=dkey(new Date(Date.now()-45*864e5)),merged={};
    for(const k of Object.keys(e.days).concat(Object.keys(days)).sort())if(k>=keep)merged[k]=days[k]||e.days[k];
    e.days=merged;e.t=Date.now();SS("jk."+z,{t:e.t,days:merged});render(true)}
  catch{}finally{e.busy=false}}
function jkEnsure(){const l=st.loc;zone=null;if(st.method!=="JAKIM"||!inMY(l)||!l.zone)return;zone=l.zone;
  const e=jkEntry(zone),n=new Date(),t=new Date(n);t.setDate(t.getDate()+1);
  if(!e.days[dkey(n)]||!e.days[dkey(t)]||Date.now()-e.t>7*864e5)jkFetch(zone)}
/* JAKIM times are Malaysia time (UTC+8); a day is used only if every time is within 20 min of our own calculation (guards against wrong or garbled data) */
function offFor(d){if(!zone)return null;const day=jkEntry(zone).days[dkey(d)];if(!day)return null;
  const at=min=>new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())+(min-480)*60000);
  const r={imsak:at(day[0]),subuh:at(day[1]),syuruk:at(day[2]),zohor:at(day[3]),asar:at(day[4]),maghrib:at(day[5]),isyak:at(day[6])};
  const c=calc(d,st.loc.lat,st.loc.lng,st.method);for(const k in r)if(!(Math.abs(r[k]-c[k])<=20*60000))return null;return r}
function timesFor(d){return offFor(d)||calc(d,st.loc.lat,st.loc.lng,st.method)}
'''
s = s[:m.start()] + CLIENT + s[m.end():]

# ---------- 3. compute(): ensure data, honest footer ----------
sub1('function compute(){const n=new Date();needZone();', 'function compute(){const n=new Date();jkEnsure();')
sub1('f.textContent=isOff?"Waktu Solat · Jadual rasmi JAKIM e-Solat · Zon "+zone:"Waktu Solat · Kiraan pada peranti (anggaran ±1 minit)";}',
     'f.textContent="Waktu Solat · "+(isOff?"Jadual JAKIM e-Solat · Zon "+zone:(st.method==="JAKIM"&&inMY(st.loc)&&!st.loc.zone?"Kiraan pada peranti (±1 minit) · pilih daerah untuk jadual JAKIM":"Kiraan pada peranti (anggaran ±1 minit)"));}')

# ---------- 4. work out the JAKIM zone wherever a place is set ----------
sub1('async function setPlace(lat,lng,name,source,request){', 'async function setPlace(lat,lng,name,source,request,zone){')
sub1('const place={name:name||`${lat.toFixed(3)}, ${lng.toFixed(3)}`,lat,lng,city:null,source};', 'const place={name:name||`${lat.toFixed(3)}, ${lng.toFixed(3)}`,lat,lng,city:null,source,zone:zone||null};')
sub1('  if(!name){try{const j=await fetchJSON(', '  if(!name||(!place.zone&&inMY(place))){try{const j=await fetchJSON(')
sub1('    const a=j.address||{};const nm=pickName(a);\n    if(nm)place.name=nm+(a.state&&a.state!==nm?", "+a.state:"")}catch{}}',
     '    const a=j.address||{};if(!name){const nm=pickName(a);if(nm)place.name=nm+(a.state&&a.state!==nm?", "+a.state:"")}\n    if(!place.zone)place.zone=zoneFromAddress(a)}catch{}}')
sub1('if(await setPlace(+j[0].lat,+j[0].lon,nm+(a.state&&a.state!==nm?", "+a.state:""),"manual",request)){notice("");return}',
     'if(await setPlace(+j[0].lat,+j[0].lon,nm+(a.state&&a.state!==nm?", "+a.state:""),"manual",request,(state&&zoneByName(q,zState(state)))||zoneFromAddress(a))){notice("");return}')
sub1('st.loc={name:c[0],lat:c[1],lng:c[2],city:c[0],source:"manual"};', 'st.loc={name:c[0],lat:c[1],lng:c[2],city:c[0],source:"manual",zone:zoneByName(c[0],"")};')
# places saved by earlier versions have no zone: derive it from the saved city or "District, State" name
sub1('/*</jakim-pure>*/\n', '/*</jakim-pure>*/\nif(st.loc&&!st.loc.zone){const p=String(st.loc.name||"").split(", ");st.loc.zone=(st.loc.city&&zoneByName(st.loc.city,""))||(p.length>1&&zoneByName(p[0],zState(p[1])))||null}\n')

# ---------- 5. privacy text ----------
sub1('Nama tempat dan carian menggunakan OpenStreetMap Nominatim (kedudukan dibulatkan kira-kira 1 km).',
     'Jadual solat diambil terus dari e-solat.gov.my (JAKIM); hanya kod zon dihantar. Nama tempat dan carian menggunakan OpenStreetMap Nominatim (kedudukan dibulatkan kira-kira 1 km).')

assert 'waktusolat' not in s.replace('api.waktusolat.app mirror', ''), 'mirror still referenced'
open(path, 'w', encoding='utf-8').write(s)
print('patched OK; waktusolat mentions left:', s.count('waktusolat'))

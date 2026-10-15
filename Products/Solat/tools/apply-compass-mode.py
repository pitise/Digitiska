"""Patch #8: the compass says clearly whether it is LIVE or FIXED (badge + different dial look). Run: python3 -I apply-compass-mode.py Solat.html"""
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
def sub1(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:80]); s = s.replace(old, new)

sub1('  <p id="q-place" class="small"></p>\n', '  <p id="q-place" class="small"></p>\n  <div id="q-mode" class="q-mode" aria-live="polite"></div>\n')
sub1('/*/menu*/', '''.q-mode{display:flex;align-items:center;gap:8px;margin:6px auto 0;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid var(--line);width:max-content;max-width:100%;color:var(--mut)}
.q-mode::before{content:"";flex:none;width:9px;height:9px;border-radius:50%;background:var(--mut)}
#qibla.mode-live .q-mode{color:#6fdc9f;border-color:#2f7a52}
#qibla.mode-live .q-mode::before{background:#6fdc9f;animation:qpulse 1.4s ease-in-out infinite}
#qibla.mode-static .q-mode{color:var(--gold2);border-color:#6b5a2a}
#qibla.mode-static .q-mode::before{background:transparent;border:2px solid var(--gold2)}
#qibla.mode-static .q-top,#qibla.mode-wait .q-top{display:none}
#qibla.mode-static .q-ring{stroke-dasharray:6 6}
@keyframes qpulse{50%{opacity:.3}}
@media (prefers-reduced-motion:reduce){#qibla.mode-live .q-mode::before{animation:none}}
/*/menu*/''')
# mode switching
sub1('const qSet=(id,t)=>{$(id).textContent=t};',
     'const qSet=(id,t)=>{$(id).textContent=t};\nfunction qMode(m,text){qd.classList.remove("mode-wait","mode-live","mode-static");qd.classList.add("mode-"+m);\n  qSet("q-mode",text||(m==="live"?"Langsung · ikut gerakan telefon":m==="static"?"Tetap · tiada sensor kompas":"Mencari sensor…"))}')
sub1('function qOri(e){const h=headingFromEvent(e);if(h==null)return;qSeen=true;',
     'function qOri(e){const h=headingFromEvent(e);if(h==null)return;if(!qSeen)qMode("live");qSeen=true;')
sub1('function qStatic(){qHead=null;', 'function qStatic(){qMode("static");qHead=null;')
sub1('qSet("q-status","Sensor kompas tidak tersedia"+(window.isSecureContext?"":" (memerlukan sambungan https)")+". Buka aplikasi kompas pada telefon dan putar sehingga bacaan menunjukkan "+qBear.toFixed(1)+"°.")}',
     'qSet("q-status","Dail ini tetap dan tidak bergerak (utara di atas). Sensor kompas tidak tersedia"+(window.isSecureContext?"":" (memerlukan sambungan https)")+". Buka aplikasi kompas pada telefon dan putar sehingga bacaan menunjukkan "+qBear.toFixed(1)+"°.")}')
sub1('qSet("q-status","Mencari sensor kompas…");const DOE=window.DeviceOrientationEvent;', 'qMode("wait");qSet("q-status","Mencari sensor kompas…");const DOE=window.DeviceOrientationEvent;')
sub1('{$("q-perm").hidden=false;qSet("q-status","Sentuh “Benarkan sensor” untuk menghidupkan kompas.")}', '{$("q-perm").hidden=false;qMode("wait","Menunggu kebenaran sensor");qSet("q-status","Sentuh “Benarkan sensor” untuk menghidupkan kompas.")}')
sub1('{$("q-perm").hidden=true;qSet("q-status","Mencari sensor kompas…");qListen()}', '{$("q-perm").hidden=true;qMode("wait");qSet("q-status","Mencari sensor kompas…");qListen()}')
open(p, 'w', encoding='utf-8').write(s); print('patched')

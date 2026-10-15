"""Patch #5: "Zon JAKIM" section in Settings (BM): current zone + expandable explanation of how JAKIM groups places into zones.
Run: python3 -I apply-zoneinfo.py Solat.html sw.js"""
import sys
html_p, sw_p = sys.argv[1:3]
s = open(html_p, encoding='utf-8').read()
def sub1(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:90]); s = s.replace(old, new)

sub1('  <h3>Privasi</h3>\n', '''  <h3>Zon JAKIM</h3>
  <p id="zone-now" class="small"></p>
  <details class="help">
    <summary>Bagaimana pengumpulan zon berfungsi?</summary>
    <p>JAKIM tidak mengeluarkan waktu solat untuk setiap lokasi. Negara dibahagikan kepada beberapa puluh zon (58 dalam senarai yang digunakan aplikasi ini), dan semua tempat dalam satu zon menggunakan waktu yang sama. Contohnya, Hulu Langat dan Shah Alam berada dalam zon SGR01.</p>
    <p>Aplikasi mengenal pasti zon anda daripada lokasi, kemudian mengambil jadual zon itu terus dari e-solat.gov.my.</p>
    <p>• Jika di bawah skrin tertulis “Jadual JAKIM e-Solat · Zon …”, waktu yang dipaparkan sama seperti jadual JAKIM untuk zon itu.</p>
    <p>• Jika tertulis “Kiraan pada peranti”, zon belum dapat dikenal pasti atau jadual JAKIM tidak dapat dimuat. Waktu dikira mengikut kedudukan tepat anda, jadi boleh berbeza kira-kira 1–2 minit daripada waktu zon. Pilih daerah anda dalam senarai Lokasi untuk mendapatkan waktu JAKIM.</p>
    <p>• Tempat dalam zon yang berlainan boleh mempunyai waktu yang berbeza.</p>
    <p>Senarai zon dalam aplikasi ini bersumber daripada panduan komuniti (2020), bukan senarai rasmi JAKIM, dan mungkin telah berubah.</p>
  </details>
  <h3>Privasi</h3>
''')
sub1('#brand{margin-top:4px}', '#brand{margin-top:4px}\ndetails.help summary{cursor:pointer;color:var(--gold2);font-size:13px;margin:6px 0}\ndetails.help p{font-size:13px;color:var(--mut);margin:6px 0}')
sub1('$("btn-settings").onclick=()=>{$("azan-toggle").checked=st.azan;$("sound").value=st.sound;soundStatus();dlg.showModal()};',
     '''function zoneNow(){const z=st.loc.zone&&ZONES.find(x=>x[0]===st.loc.zone);$("zone-now").textContent=z?"Zon dikenal pasti: "+z[0]+" — "+z[2].join(", "):"Zon dikenal pasti: belum ada. Pilih daerah anda dalam senarai Lokasi."}
$("btn-settings").onclick=()=>{$("azan-toggle").checked=st.azan;$("sound").value=st.sound;soundStatus();zoneNow();dlg.showModal()};''')
open(html_p, 'w', encoding='utf-8').write(s)
w = open(sw_p).read(); assert "var CACHE = 'solat-v3';" in w
open(sw_p, 'w').write(w.replace("var CACHE = 'solat-v3';", "var CACHE = 'solat-v4';"))
print('patched')

#!/usr/bin/env python3
"""Patch after apply-notify-zoomjs.py: "Uji notifikasi" reports what happened (no more silent failure),
stronger pinch-zoom blocking (every element + multi-finger touchstart).
Usage: apply-notify-feedback.py Solat.html   (edits in place, refuses if already applied)"""
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
if "notif-result" in s:
    sys.exit("already applied")

def sub(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:70])
    s = s.replace(old, new)

# 1. showNote returns a result instead of failing silently
a = s.index("function showNote(title,body){")
b = s.index("function notifyPrayer(p)")
s = s[:a] + '''function showNote(title,body){
  return new Promise(res=>{
    if(!("Notification" in window)){res({ok:false,why:"pelayar ini tidak menyokong notifikasi"});return}
    if(Notification.permission!=="granted"){res({ok:false,why:"kebenaran notifikasi belum diberi"});return}
    const o={body,icon:"icons/icon-192.png",tag:"solat-time",renotify:true,silent:!!st.azan};
    const fb=e=>{try{new Notification(title,o);res({ok:true})}catch(x){res({ok:false,why:(e&&(e.message||e.name))||(x&&(x.message||x.name))||"ralat tidak diketahui"})}};
    if(!("serviceWorker" in navigator)||!navigator.serviceWorker.getRegistration){fb({message:"service worker tiada"});return}
    navigator.serviceWorker.getRegistration().then(r=>{
      if(!r||!r.showNotification){fb({message:"aplikasi belum didaftarkan; tutup dan buka semula aplikasi sekali lagi"});return}
      r.showNotification(title,o).then(()=>res({ok:true}),fb)}).catch(fb)})}
''' + s[b:]

# 2. result line under the buttons + the test button reports it
sub('''    <button id="notif-test" class="btn" type="button" hidden>Uji notifikasi</button>
  </div>
''','''    <button id="notif-test" class="btn" type="button" hidden>Uji notifikasi</button>
  </div>
  <p id="notif-result" class="small"></p>
''')
sub('$("notif-test").onclick=()=>showNote("Solat Times · Ujian","Ini ialah ujian notifikasi. Jika anda melihat ini, notifikasi berfungsi.");',
'''$("notif-test").onclick=()=>{const r=$("notif-result");r.textContent="Menghantar…";
  showNote("Solat Times · Ujian","Ini ialah ujian notifikasi. Jika anda melihat ini, notifikasi berfungsi.").then(x=>{
    r.textContent=x.ok?"Permintaan diterima oleh pelayar. Jika tiada notifikasi muncul, buka Tetapan telefon, Aplikasi, pelayar anda, Notifikasi, dan pastikan ia dihidupkan.":"Notifikasi gagal: "+x.why+"."})};''')
sub('notifStatus();dlg.showModal()','notifStatus();$("notif-result").textContent="";dlg.showModal()')

# 3. pinch zoom: every element, and cancel as soon as a second finger lands
sub("html,body{touch-action:pan-x pan-y;-webkit-text-size-adjust:100%;text-size-adjust:100%}",
    "*{touch-action:pan-x pan-y}\nhtml,body{-webkit-text-size-adjust:100%;text-size-adjust:100%}")
sub('document.addEventListener("touchmove",e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});',
    '["touchstart","touchmove"].forEach(t=>document.addEventListener(t,e=>{if(e.touches.length>1)e.preventDefault()},{passive:false}));')
open(p, "w", encoding="utf-8").write(s)
print("ok")

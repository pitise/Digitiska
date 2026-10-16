#!/usr/bin/env python3
"""Patch after apply-names-compass-zoom.py: prayer-time notification via the service worker (works on phones),
Settings "Notifikasi" status/buttons, notification title "Solat Times · <solat>", extra pinch-zoom block in script.
Usage: apply-notify-zoomjs.py Solat.html   (edits in place, refuses if already applied)"""
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
if "notifyPrayer" in s:
    sys.exit("already applied")

def sub(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:70])
    s = s.replace(old, new)

# 1. notification at prayer time: phones (Android Chrome) refuse `new Notification`, they need registration.showNotification
sub('''if("Notification" in window&&Notification.permission==="granted"){try{new Notification("Waktu Solat · "+p.n,{body:`Telah masuk waktu ${p.n} bagi ${st.loc.name}`})}catch{}}''',
    '''notifyPrayer(p);''')
sub('function onPrayer(p){',
'''function showNote(title,body){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  const o={body,icon:"icons/icon-192.png",tag:"solat-time",renotify:true,silent:!!st.azan};
  const fb=()=>{try{new Notification(title,o)}catch{}};
  if("serviceWorker" in navigator&&navigator.serviceWorker.getRegistration)navigator.serviceWorker.getRegistration().then(r=>r&&r.showNotification?r.showNotification(title,o).catch(fb):fb()).catch(fb);else fb()}
function notifyPrayer(p){showNote("Solat Times · "+p.n,`Telah masuk waktu ${p.n} bagi ${st.loc.name}`)}
function onPrayer(p){''')

# 2. Settings: Notifikasi section
sub('''  <p class="small warn">Azan hanya berbunyi ketika aplikasi ini dibuka. Aplikasi web tidak boleh mengejutkan telefon yang ditutup atau dikunci.</p>
''','''  <p class="small warn">Azan hanya berbunyi ketika aplikasi ini dibuka. Aplikasi web tidak boleh mengejutkan telefon yang ditutup atau dikunci.</p>
  <h3>Notifikasi</h3>
  <p id="notif-status" class="small"></p>
  <div class="row">
    <button id="notif-allow" class="btn" type="button" hidden>Benarkan notifikasi</button>
    <button id="notif-test" class="btn" type="button" hidden>Uji notifikasi</button>
  </div>
''')
sub('$("settings-close").onclick=()=>dlg.close();',
'''$("settings-close").onclick=()=>dlg.close();
function notifStatus(){const s=$("notif-status");if(!s)return;
  if(!("Notification" in window)){s.textContent="Pelayar ini tidak menyokong notifikasi.";$("notif-allow").hidden=true;$("notif-test").hidden=true;return}
  const p=Notification.permission;
  s.textContent=p==="granted"?"Notifikasi dibenarkan. Ia muncul pada waktu solat ketika aplikasi dibuka atau masih berjalan di latar belakang.":p==="denied"?"Notifikasi disekat. Hidupkan semula dalam tetapan laman web pada pelayar anda.":"Notifikasi belum dibenarkan.";
  $("notif-allow").hidden=p!=="default";$("notif-test").hidden=p!=="granted"}
$("notif-allow").onclick=()=>{try{Promise.resolve(Notification.requestPermission()).then(notifStatus,notifStatus)}catch{notifStatus()}};
$("notif-test").onclick=()=>showNote("Solat Times · Ujian","Ini ialah ujian notifikasi. Jika anda melihat ini, notifikasi berfungsi.");''')
sub('soundStatus();zoneNow();dlg.showModal()','soundStatus();zoneNow();notifStatus();dlg.showModal()')
sub('if(st.azan&&"Notification" in window&&Notification.permission==="default")Notification.requestPermission()};',
    'if(st.azan&&"Notification" in window&&Notification.permission==="default")Promise.resolve(Notification.requestPermission()).then(notifStatus,notifStatus)};')

# 3. pinch zoom: second layer in script (some browsers ignore the viewport lock)
sub('if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol))',
'''/* no pinch zoom: sizes are preset (second layer, in case a browser ignores the viewport setting) */
document.addEventListener("touchmove",e=>{if(e.touches.length>1)e.preventDefault()},{passive:false});
["gesturestart","gesturechange","gestureend"].forEach(t=>document.addEventListener(t,e=>e.preventDefault()));
if("serviceWorker" in navigator&&/^https?:$/.test(location.protocol))''')
open(p, "w", encoding="utf-8").write(s)
print("ok")

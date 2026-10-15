#!/usr/bin/env python3
"""Patch after apply-dialog-text-gear.py: bigger header icons, visible "Benarkan sensor" button, safety note under Privasi.
Usage: apply-icons-sensor-privacy.py Solat.html   (edits in place, refuses if already applied)"""
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
if "Keselamatan:" in s:
    sys.exit("already applied")

def sub(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:60])
    s = s.replace(old, new)

# 1. header icons bigger (38 -> 48 px buttons, 18 -> 26 px drawings); menu pill follows
sub(".icon-btn{width:38px;height:38px;", ".icon-btn{width:48px;height:48px;")
sub(".icon-btn .ico{width:18px;height:18px}", ".icon-btn .ico{width:26px;height:26px}")
sub("gap:8px;padding:8px;background:var(--card);border:1px solid var(--line);border-radius:26px;", "gap:8px;padding:8px;background:var(--card);border:1px solid var(--line);border-radius:32px;")

# 2. "Benarkan sensor" was a dark button on a dark panel: make it the gold primary button
#    It also sat below the long instruction text, off screen on a phone: move it up under the Langsung/Tetap badge.
sub('  <div class="q-mid"><button id="q-perm" class="btn" type="button" hidden>Benarkan sensor</button></div>\n', '')
sub('  <div id="q-mode" class="q-mode" aria-live="polite"></div>\n',
    '  <div id="q-mode" class="q-mode" aria-live="polite"></div>\n  <div class="q-mid" style="margin-top:12px"><button id="q-perm" class="btn primary" type="button" hidden>Benarkan sensor</button></div>\n')

# 3. safety note under Privasi
sub('perkhidmatan tersebut.</p>\n  <button id="settings-close"',
    'perkhidmatan tersebut. Pelayan hos (Google Firebase Hosting) mungkin merekod lawatan seperti kebanyakan pelayan web.</p>\n'
    '  <h3>Keselamatan</h3>\n'
    '  <p class="small">Keselamatan: aplikasi ini ialah satu fail yang kodnya boleh dibaca. Ia tidak memuatkan skrip, fon, imej atau iklan daripada pihak ketiga, tiada alat analitik atau pengesan, dan tidak dipasang sebagai program pada telefon. Kod ini telah disemak untuk sambungan luar dan skrip tersembunyi; tiada spyware atau malware ditemui.</p>\n'
    '  <p class="small">Sambungan keluar hanya ke: e-solat.gov.my (jadual JAKIM), OpenStreetMap Nominatim (nama tempat), islamcan.com (bunyi azan, hanya apabila dimainkan) dan perkhidmatan anggaran lokasi internet (hanya jika anda tekan "Guna anggaran").</p>\n'
    '  <p class="small warn">Salinan yang dihantar semula oleh pihak lain mungkin telah diubah. Dapatkan aplikasi ini daripada pautan asal Digitiska sahaja.</p>\n'
    '  <button id="settings-close"')
open(p, "w", encoding="utf-8").write(s)
print("ok")

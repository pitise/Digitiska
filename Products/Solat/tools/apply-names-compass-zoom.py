#!/usr/bin/env python3
"""Patch after apply-heading-address.py: leftover "Waktu Solat" -> "Solat Times", compass permission wording, zoom lock.
Usage: apply-names-compass-zoom.py Solat.html   (edits in place, refuses if already applied)"""
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
if "Aktifkan Kompas" in s:
    sys.exit("already applied")

def sub(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:70])
    s = s.replace(old, new)

# 1. name: share-link title, footer line, laptop tab title
sub('<meta property="og:title" content="Waktu Solat">', '<meta property="og:title" content="Solat Times">')
sub('<footer id="src">Waktu Solat</footer>', '<footer id="src">Solat Times</footer>')
sub('f.textContent="Waktu Solat · "', 'f.textContent="Solat Times · "')
sub('${dur(ne-now)} · Waktu Solat`', '${dur(ne-now)} · Solat Times`')

# 2. compass permission wording: say what the user wants (turn the compass on), not what the system asks
sub('>Benarkan sensor</button>', '>Aktifkan Kompas</button>')
sub('qMode("wait","Menunggu kebenaran sensor");qSet("q-status","Sentuh “Benarkan sensor” untuk menghidupkan kompas.")',
    'qMode("wait","Kompas belum aktif");qSet("q-status","Tekan “Aktifkan Kompas”, kemudian pilih Benarkan apabila diminta.")')

# 3. no pinch zoom: sizes are preset
sub('content="width=device-width, initial-scale=1, viewport-fit=cover"',
    'content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"')
sub("/*/dlg*/", "/*/dlg*/\n/*zoom*/\nhtml,body{touch-action:pan-x pan-y;-webkit-text-size-adjust:100%;text-size-adjust:100%}\n/*/zoom*/")
open(p, "w", encoding="utf-8").write(s)
print("ok")

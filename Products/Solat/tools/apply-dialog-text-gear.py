#!/usr/bin/env python3
"""Patch after apply-compass-mode.py: dialog text +50%, gear icon for Settings.
Usage: apply-dialog-text-gear.py Solat.html   (edits in place, refuses if already applied)"""
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
if "/*dlg*/" in s:
    sys.exit("already applied")

def sub(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:60])
    s = s.replace(old, new)

# 1. dialog text +50% (15px base -> 22.5px; 13px -> 19.5px; 14px -> 21px; 12px -> 18px)
sub("max-width:420px;width:calc(100% - 32px);padding:20px}", "max-width:560px;width:calc(100% - 32px);padding:20px;font-size:22.5px}")
sub("dialog h3{margin:18px 0 8px;font-size:15px;color:var(--gold2)}",
    "dialog h3{margin:18px 0 8px;font-size:15px;color:var(--gold2)}\n"
    "/*dlg*/\n"
    "dialog h2{font-size:34px}\n"
    "dialog h3{font-size:22.5px}\n"
    "dialog .small,dialog details.help summary,dialog details.help p{font-size:19.5px}\n"
    "dialog label.f{font-size:18px}\n"
    "dialog select{font-size:21px;padding:12px 15px}\n"
    "dialog .btn{font-size:21px;padding:13px 21px}\n"
    "dialog .q-status{font-size:22.5px}\n"
    "dialog .q-mode{font-size:19.5px;padding:7px 18px;gap:12px}\n"
    ".switch{width:69px;height:39px;border-radius:20px}\n"
    ".switch::after{top:4.5px;left:4.5px;width:30px;height:30px}\n"
    ".switch-row input:checked+.switch::after{left:34.5px}\n"
    "/*/dlg*/")

# 2. gear icon (Settings now holds azan + zon JAKIM + privacy), no azan-off slash
GEAR = ('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>')
sub('aria-label="Tetapan azan">\n        <svg class="ico" viewBox="0 0 24 24"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path class="slash" d="M3 3l18 18"/></svg>',
    'aria-label="Tetapan">\n        <svg class="ico" viewBox="0 0 24 24">' + GEAR + '</svg>')
sub(".icon-btn.off .slash{display:inline}.slash{display:none}\n", "")
sub('    $("btn-settings").classList.toggle("off",!st.azan);\n  }', '  }')
sub('SS("azan",st.azan);$("btn-settings").classList.toggle("off",!st.azan);', 'SS("azan",st.azan);')

# 3. title: the page is now general Settings; Azan becomes a section
sub('<dialog id="settings">\n  <h2>Azan</h2>\n', '<dialog id="settings">\n  <h2>Tetapan</h2>\n  <h3 style="margin-top:0">Azan</h3>\n')

# 4. with the larger text a dialog is taller than the screen; showModal() focuses the first
#    focusable element (the Tutup button of the Kiblat panel), which scrolled it to the bottom
sub("zoneNow();dlg.showModal()};", "zoneNow();dlg.showModal();dlg.scrollTop=0};")
sub("  qd.showModal()}", "  qd.showModal();qd.scrollTop=0}")
open(p, "w", encoding="utf-8").write(s)
print("ok")

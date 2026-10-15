#!/usr/bin/env python3
"""Patch after apply-icons-sensor-privacy.py: heading "Solat Times", official address in the Keselamatan text.
Usage: apply-heading-address.py Solat.html   (edits in place, refuses if already applied)"""
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
if "solat.digitiska.com" in s:
    sys.exit("already applied")

def sub(old, new):
    global s
    assert s.count(old) == 1, (s.count(old), old[:60])
    s = s.replace(old, new)

sub('<p class="brand">Waktu Solat</p>', '<p class="brand">Solat Times</p>')
sub("Dapatkan aplikasi ini daripada pautan asal Digitiska sahaja.</p>",
    "Dapatkan aplikasi ini daripada pautan asal Digitiska sahaja: solat.digitiska.com</p>")
open(p, "w", encoding="utf-8").write(s)
print("ok")

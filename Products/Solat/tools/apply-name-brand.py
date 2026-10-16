"""Patch #3: home-screen name "Solat Times" and the brand footnote. Run: python3 -I apply-name-brand.py Solat.html manifest.webmanifest sw.js"""
import sys
html_p, man_p, sw_p = sys.argv[1:4]
def edit(path, pairs):
    s = open(path, encoding='utf-8').read()
    for old, new in pairs:
        assert s.count(old) == 1, (path, s.count(old), old[:80])
        s = s.replace(old, new)
    open(path, 'w', encoding='utf-8').write(s)
edit(html_p, [
  ('<title>Solat</title>', '<title>Solat Times</title>'),
  ('<meta name="apple-mobile-web-app-title" content="Solat">', '<meta name="apple-mobile-web-app-title" content="Solat Times">'),
  ('<meta name="application-name" content="Solat">', '<meta name="application-name" content="Solat Times">'),
  ('footer{text-align:center;color:var(--mut);font-size:11px;margin-top:10px}', 'footer{text-align:center;color:var(--mut);font-size:11px;margin-top:10px}\n#brand{margin-top:4px}'),
  ('  <footer id="src">Waktu Solat</footer>', '  <footer id="src">Waktu Solat</footer>\n  <footer id="brand">© 2026 Digitiska</footer>'),
])
edit(man_p, [('"name": "Solat",', '"name": "Solat Times",'), ('"short_name": "Solat",', '"short_name": "Solat Times",')])
edit(sw_p, [("var CACHE = 'solat-v1';", "var CACHE = 'solat-v2';")])
print('patched')

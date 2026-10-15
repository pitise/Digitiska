"""Patch #7: keep the dial letters (U T S B) upright while the dial turns. Run: python3 -I apply-compass-letters.py Solat.html"""
import sys
p = sys.argv[1]; s = open(p, encoding='utf-8').read()
old = 'function qDraw(){qRaf=0;if(qHead==null)return;qRot("q-dial",-qHead);'
new = 'function qDraw(){qRaf=0;if(qHead==null)return;qRot("q-dial",-qHead);\n  for(const t of $("q-dial").querySelectorAll("text"))t.setAttribute("transform","rotate("+qHead.toFixed(1)+" "+t.getAttribute("x")+" "+(t.getAttribute("y")-6)+")");'
assert s.count(old) == 1; s = s.replace(old, new)
old2 = 'function qStatic(){qHead=null;qRot("q-dial",0);'
new2 = 'function qStatic(){qHead=null;qRot("q-dial",0);for(const t of $("q-dial").querySelectorAll("text"))t.removeAttribute("transform");'
assert s.count(old2) == 1; s = s.replace(old2, new2)
old3 = 'qd.classList.remove("aligned");$("q-perm").hidden=true;qSet("q-head","");qRot("q-dial",0);'
new3 = 'qd.classList.remove("aligned");$("q-perm").hidden=true;qSet("q-head","");qRot("q-dial",0);for(const t of $("q-dial").querySelectorAll("text"))t.removeAttribute("transform");'
assert s.count(old3) == 1; s = s.replace(old3, new3)
open(p, 'w', encoding='utf-8').write(s); print('patched')

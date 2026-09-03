# -*- coding: utf-8 -*-
import json, sys, io, re
sys.path.insert(0,'.')
from gph import GPH
from prog import PROG
from cmd import CMD
from trainee import TRAINEE

DATA = {"gph":GPH, "prog":PROG, "cmd":CMD, "trainee":TRAINEE}

# ---- ולידציה של בנק התשובות ----
errs=[]
for dim,topics in DATA.items():
    ws=round(sum(t["w"] for t in topics),6)
    if ws!=1.0: errs.append(f"{dim}: סכום משקלי הנושאים {ws} ולא 1.0")
    for ti,t in enumerate(topics):
        for k in ("name","w","scored","crits"):
            if k not in t: errs.append(f"{dim}[{ti}]: חסר שדה {k}")
        if not t["crits"]: errs.append(f"{dim}/{t['name']}: אין קריטריונים")
        for ci,c in enumerate(t["crits"]):
            loc=f"{dim}/{t['name']}/[{ci}]"
            for k in ("t","c","w","note","opts"):
                if k not in c: errs.append(f"{loc}: חסר שדה {k}")
            if not c["t"].strip(): errs.append(f"{loc}: טקסט קריטריון ריק")
            opts=c.get("opts") or []
            if len(opts)<2: errs.append(f"{loc}: פחות משתי אפשרויות")
            keys=[o["k"] for o in opts]
            if len(set(keys))!=len(keys): errs.append(f"{loc}: אותיות אפשרויות כפולות {keys}")
            for o in opts:
                if not o.get("t","").strip(): errs.append(f"{loc}/{o['k']}: טקסט אפשרות ריק")
                s=o.get("s","MISSING")
                if s=="MISSING": errs.append(f"{loc}/{o['k']}: חסר ציון")
                elif s is not None and not (isinstance(s,int) and 0<=s<=100):
                    errs.append(f"{loc}/{o['k']}: ציון לא תקין {s!r}")
            if all(o["s"] is None for o in opts):
                errs.append(f"{loc}: לכל האפשרויות אין ציון")
if errs:
    print("שגיאות ולידציה:"); [print("  •",e) for e in errs]; sys.exit(1)

tot_c=sum(len(t["crits"]) for d in DATA.values() for t in d)
tot_o=sum(len(c["opts"]) for d in DATA.values() for t in d for c in t["crits"])
print(f"ולידציה עברה — {tot_c} קריטריונים, {tot_o} אפשרויות")
for dim,topics in DATA.items():
    print(f"  {dim}: {len(topics)} נושאים, {sum(len(t['crits']) for t in topics)} קריטריונים, משקל {sum(t['w'] for t in topics):.2f}")

# ---- פלט JS ----
def js(o): return json.dumps(o, ensure_ascii=False, indent=1)
out = "const DATA = " + js(DATA) + ";\n"
io.open("DATA.js","w",encoding="utf-8").write(out)
print("נכתב DATA.js —", len(out), "בתים")

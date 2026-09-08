# -*- coding: utf-8 -*-
import json, sys, io, re
sys.path.insert(0,'.')
from gph import GPH
from prog import PROG
from cmd import CMD
from trainee import TRAINEE
from footnotes import FN

DATA = {"gph":GPH, "prog":PROG, "cmd":CMD, "trainee":TRAINEE}

# ---- שיבוץ 42 הערות השוליים ----
fn_errs=[]
def find_crit(dim,topic,ci):
    for t in DATA[dim]:
        if t["name"]==topic:
            if ci<len(t["crits"]): return t["crits"][ci]
            fn_errs.append(f"{dim}/{topic}: אין קריטריון באינדקס {ci}"); return None
    fn_errs.append(f"{dim}: לא נמצא נושא {topic!r}"); return None

seen_n=set()
for f in FN:
    n=f["n"]
    if n in seen_n: fn_errs.append(f"הערה {n}: מספר כפול")
    seen_n.add(n)
    c=find_crit(f["dim"],f["topic"],f["ci"])
    if c is None: continue
    if f.get("clear_note"): c["note"]=""
    if f["opt"] is None:
        target=c; key="t"
    else:
        o=next((x for x in c["opts"] if x["k"]==f["opt"]),None)
        if o is None:
            fn_errs.append(f"הערה {n}: אין אפשרות {f['opt']!r} ב-{f['dim']}/{f['topic']}/[{f['ci']}]"); continue
        target=o; key="t"
    strip=f.get("strip")
    if strip:
        if strip not in target[key]:
            fn_errs.append(f"הערה {n}: הטקסט להסרה לא נמצא — {strip!r}\n        בתוך: {target[key]!r}")
            continue
        target[key]=target[key].replace(strip,"",1)
    # המילה שאליה נצמדת ההערה חייבת להימצא בטקסט היעד
    if f["w"] not in target[key]:
        fn_errs.append(f"הערה {n}: המילה {f['w']!r} אינה בטקסט — {target[key]!r}")
        continue
    if target[key].count(f["w"])>1:
        fn_errs.append(f"הערה {n}: המילה {f['w']!r} מופיעה יותר מפעם אחת — {target[key]!r}")
        continue
    target.setdefault("fn",[]).append({"n":n,"w":f["w"],"t":f["t"]})

if fn_errs:
    print("שגיאות בשיבוץ הערות השוליים:")
    for e in fn_errs: print("  •",e)
    sys.exit(1)
print(f"שובצו {len(FN)} הערות שוליים")

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

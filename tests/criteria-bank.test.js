/* בדיקות בנק התשובות וגזירת הציון מהאפשרות הנבחרת */
const fs=require('fs'), vm=require('vm'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const stubEl=()=>({innerHTML:'',className:'',textContent:'',classList:{add(){},remove(){},toggle(){}},
  querySelector:()=>stubEl(),querySelectorAll:()=>[],replaceWith(){},appendChild(){},style:{},firstChild:null,hidden:false});
const els={};
const ctx={console,
  localStorage:{_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}},
  document:{getElementById:(id)=>(els[id]||(els[id]=stubEl())),querySelector:()=>stubEl(),querySelectorAll:()=>[],
            createElement:()=>stubEl(),addEventListener(){},body:stubEl(),activeElement:null},
  window:{scrollTo(){},addEventListener(){},matchMedia:()=>({matches:false,addListener(){}})},
  setTimeout,clearTimeout,Math,JSON,Date,Set,Map,URL:{createObjectURL:()=>''},Blob:function(){},FileReader:function(){},
  navigator:{},alert(){},confirm:()=>true,location:{href:''}};
ctx.globalThis=ctx; ctx.self=ctx; vm.createContext(ctx);
vm.runInContext(src+"\n;globalThis.__ev=(c)=>eval(c); globalThis.__setS=(v)=>{S=v;};",ctx);
const G=new Proxy({},{
  get:(_,k)=>{ if(k==='S') return ctx.__ev('S'); try{ return ctx.__ev(String(k)); }catch(e){ return undefined; } },
  set:(_,k,v)=>{ if(k==='S'){ctx.__setS(v); return true;} return true; }
});

let pass=0,fail=0;
const ok=(n,c,x='')=>{c?(pass++,console.log('  ✓ '+n)):(fail++,console.log('  ✗ '+n+'  '+x));};
const eq=(n,a,b)=>ok(n+`  (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`, a===b);
const DIMS=['gph','prog','cmd','trainee'];

console.log('\n=== 1. שלמות בנק התשובות ===');
const D=G.DATA;
eq('ממדים בקובץ', Object.keys(D).sort().join(','), 'cmd,gph,prog,trainee');
ok('ממד env הוסר', D.env===undefined);
eq('FW_DIMS', G.FW_DIMS.join(','), 'prog,cmd,trainee');
ok('DIM_META ללא env', G.DIM_META.env===undefined);
const counts={gph:26,prog:33,cmd:22,trainee:12};
let totC=0,totO=0;
DIMS.forEach(d=>{
  const n=D[d].reduce((a,t)=>a+t.crits.length,0); totC+=n;
  D[d].forEach(t=>t.crits.forEach(c=>totO+=(c.opts||[]).length));
  eq(`${d}: מספר קריטריונים`, n, counts[d]);
  eq(`${d}: סכום משקלי הנושאים`, Math.round(D[d].reduce((a,t)=>a+t.w,0)*1e6)/1e6, 1);
});
eq('סה"כ קריטריונים (93 במסמך)', totC, 93);
ok('סה"כ אפשרויות תשובה: '+totO, totO>350);

console.log('\n=== 2. תקינות כל אפשרות ===');
let bad=[];
DIMS.forEach(d=>D[d].forEach(t=>t.crits.forEach((c,ci)=>{
  const loc=`${d}/${t.name}/[${ci}]`;
  if(!c.t||!c.t.trim()) bad.push(loc+': טקסט קריטריון ריק');
  const o=c.opts||[];
  if(o.length<2) bad.push(loc+': פחות משתי אפשרויות');
  if(new Set(o.map(x=>x.k)).size!==o.length) bad.push(loc+': אותיות כפולות');
  o.forEach(x=>{
    if(!x.t||!x.t.trim()) bad.push(loc+'/'+x.k+': טקסט אפשרות ריק');
    if(!('s' in x)) bad.push(loc+'/'+x.k+': חסר ציון');
    else if(x.s!==null && !(Number.isInteger(x.s)&&x.s>=0&&x.s<=100)) bad.push(loc+'/'+x.k+': ציון לא תקין '+x.s);
  });
  if(o.length&&o.every(x=>x.s===null)) bad.push(loc+': לכל האפשרויות אין ציון');
})));
ok('כל האפשרויות תקינות', bad.length===0, bad.slice(0,4).join(' | '));
ok('אין ציון ידני — PRESETS הוסר', typeof G.PRESETS==='undefined');
ok('scoreGph/scoreFw הוסרו', typeof G.scoreGph==='undefined' && typeof G.scoreFw==='undefined');
ok('pickGph/pickFw קיימים', typeof G.pickGph==='function' && typeof G.pickFw==='function');

console.log('\n=== 3. גזירת הציון מהאפשרות הנבחרת ===');
G.S=G.BLANK();
const gt=D.gph[0], c0=gt.crits[0];
c0.opts.forEach(o=>{
  G.pickGph('gph',0,0,o.k);
  const cell=G.gphCell(0,0);
  eq(`gph[0][0] אפשרות ${o.k} → ציון`, cell.score, o.s);
  eq(`gph[0][0] אפשרות ${o.k} → opt נשמר`, cell.opt, o.k);
});
// לחיצה חוזרת מבטלת
const k0=c0.opts[0].k;
G.pickGph('gph',0,0,k0); G.pickGph('gph',0,0,k0);
eq('לחיצה חוזרת מבטלת את הבחירה', G.gphCell(0,0).opt, null);
eq('  והציון מתאפס', G.gphCell(0,0).score, null);
// מסגרות
G.S=G.BLANK(); G.S.frameworks=[{id:'f1',label:'גדוד א',kind:'גדוד',inspectorId:''}]; G.S.ui={activeFw:'f1',dim:'prog'};
const pc=D.prog[0].crits[0];
G.pickFw('prog',0,0,pc.opts[1].k);
eq('pickFw גוזר ציון', G.fwCell('f1','prog',0,0).score, pc.opts[1].s);

console.log('\n=== 4. אפשרות "ללא ציון" / "לא מחושב בציון" ===');
// prog / תיק יסוד ומימושו / קריטריון 5 — אפשרות ה'
const t5=D.prog[0], c5i=4, c5=t5.crits[c5i];
const nullOpt=c5.opts.find(o=>o.s===null);
ok('קיימת אפשרות ללא ציון בקריטריון ההסמכות', !!nullOpt);
G.S=G.BLANK(); G.S.frameworks=[{id:'f1',label:'x',kind:'גדוד',inspectorId:''}]; G.S.ui={activeFw:'f1',dim:'prog'};
t5.crits.forEach((c,ci)=>{ const o=c.opts.find(x=>x.s===100); if(o) G.pickFw('prog',0,ci,o.k); });
eq('כל הקריטריונים ב-100 → ציון הנושא', Math.round(G.topicScore(t5,ci=>G.fwCell('f1','prog',0,ci))), 100);
G.pickFw('prog',0,c5i,nullOpt.k);
eq('אפשרות ללא ציון → התא ללא ציון', G.fwCell('f1','prog',0,c5i).score, null);
eq('  והנושא עדיין 100 (הקריטריון יצא מהמכנה ולא איפס)', Math.round(G.topicScore(t5,ci=>G.fwCell('f1','prog',0,ci))), 100);
// כל אפשרויות ה-null בקובץ
let nulls=[];
DIMS.forEach(d=>D[d].forEach(t=>t.crits.forEach((c,ci)=>c.opts.forEach(o=>{ if(o.s===null) nulls.push(`${d}/${t.name}/[${ci}]/${o.k}`); }))));
console.log('  אפשרויות ללא ציון בקובץ: '+nulls.length);
nulls.forEach(n=>console.log('    · '+n));
eq('מספר אפשרויות "ללא ציון"', nulls.length, 4);

console.log('\n=== 5. שאלת הבונוס (תוכניות 33) ===');
const bt=D.prog.find(t=>t.name==='למידה מהשטח');
const bti=D.prog.indexOf(bt);
const bc=bt.crits.find(c=>c.bonus);
ok('הקריטריון מסומן bonus', !!bc);
ok('כל אפשרויות הבונוס הן 100', bc.opts.every(o=>o.s===100));
G.S=G.BLANK(); G.S.frameworks=[{id:'f1',label:'x',kind:'גדוד',inspectorId:''}]; G.S.ui={activeFw:'f1',dim:'prog'};
const nb=bt.crits.findIndex(c=>!c.bonus), nbc=bt.crits[nb];
G.pickFw('prog',bti,nb,nbc.opts.find(o=>o.s===55).k);   // ציון 55
eq('בלי בחירת הבונוס — ציון הנושא', Math.round(G.topicScore(bt,ci=>G.fwCell('f1','prog',bti,ci))), 55);
G.pickFw('prog',bti,bt.crits.indexOf(bc),bc.opts[0].k);
const withBonus=Math.round(G.topicScore(bt,ci=>G.fwCell('f1','prog',bti,ci)));
eq('עם בחירת הבונוס — ציון הנושא', withBonus, 78);
ok('הבונוס רק מעלה, לעולם לא מוריד', withBonus>55);

console.log('\n=== 6. סעיף 6א׳ — "פיתוח הדרכה" ללא שינוי במנגנון הניקוד ===');
const pt=D.gph.find(t=>t.name==='פיתוח הדרכה');
eq('scored נשאר false', pt.scored, false);
eq('משקל הנושא נשאר 0', pt.w, 0);
ok('כל הקריטריונים w=null (אינם משוקללים)', pt.crits.every(c=>c.w===null));
ok('אך האפשרויות מה-PDF נשמרות ומוצגות', pt.crits.every(c=>(c.opts||[]).length>=2));
eq('  מספר קריטריונים כמו במסמך', pt.crits.length, 3);
G.S=G.BLANK();
const pti=D.gph.indexOf(pt);
pt.crits.forEach((c,ci)=>G.pickGph('gph',pti,ci,c.opts[0].k));
ok('בחירה נשמרת בתא', G.gphCell(pti+'_0'.slice(0,0)||pti,0)!==null);
eq('  opt נשמר', G.gphCell(pti,0).opt, pt.crits[0].opts[0].k);
eq('הנושא אינו מקבל ציון', G.topicScore(pt,ci=>G.gphCell(pti,ci)), null);
eq('ואינו משפיע על ציון הגפ"ה', G.gphScore(), null);
ok('ואינו נכנס לריכוז שיפור/שימור', !G.scanKS().some(x=>x.name==='פיתוח הדרכה'));

console.log('\n=== 7. "לא רלוונטי" ברמת קריטריון ===');
G.S=G.BLANK();
G.pickGph('gph',0,0,c0.opts[0].k);
G.naGph('gph',0,0);
const nac=G.gphCell(0,0);
eq('naMark נדלק', nac.naMark, true);
eq('  הציון התאפס', nac.score, null);
eq('  והבחירה בוטלה', nac.opt, null);

console.log('\n=== 8. רגרסיה — סף 70 והריכוז בדוח ===');
eq('KS_THRESHOLD', G.KS_THRESHOLD, 70);
[[0,'improve'],[50,'improve'],[69,'improve'],[70,'keep'],[90,'keep'],[100,'keep']]
  .forEach(([v,e])=>eq('ksAuto('+v+')', G.ksAuto(v), e));
eq('ksAuto(null)', G.ksAuto(null), null);
// בניית ביקורת מלאה דרך בנק התשובות
G.S=G.BLANK(); G.S.frameworks=[{id:'f1',label:'גדוד א',kind:'גדוד',inspectorId:''}]; G.S.ui={activeFw:'f1',dim:'prog'};
const pick=(dim,ti,target)=>D[dim][ti].crits.forEach((c,ci)=>{
  if(c.w==null) return;
  const o=c.opts.filter(x=>x.s!==null).sort((a,b)=>Math.abs(a.s-target)-Math.abs(b.s-target))[0];
  if(o){ dim==='gph'?G.pickGph('gph',ti,ci,o.k):G.pickFw(dim,ti,ci,o.k); }});
pick('gph',0,100); pick('gph',1,0);
const ks=G.scanKS();
ok('נושא בציון גבוה → שימור', ks.some(x=>x.name===D.gph[0].name&&x.cls==='keep'));
ok('נושא בציון נמוך → שיפור', ks.some(x=>x.name===D.gph[1].name&&x.cls==='improve'));
ok('ריכוז הדוח נבנה', G.ksReportHTML().includes('ks-report'));
ok('שמות הנושאים מופיעים', G.ksReportHTML().includes(G.esc(D.gph[0].name)));

console.log('\n=== 9. רגרסיה — מנוע הציונים ===');
['prog','cmd','trainee'].forEach(d=>D[d].forEach((t,ti)=>pick(d,ti,80)));
ok('fwDimScore prog', G.fwDimScore('f1','prog')!=null);
ok('fwDimScore cmd', G.fwDimScore('f1','cmd')!=null);
ok('fwDimScore trainee', G.fwDimScore('f1','trainee')!=null);
ok('fwScore', G.fwScore('f1')!=null);
ok('overallScore', G.overallScore()!=null);
ok('dimAvgAcrossFw', G.dimAvgAcrossFw('prog')!=null);
const pr=G.fwProgress('f1');
eq('fwProgress: סה"כ קריטריונים משוקללים ב-3 הממדים', pr.tot, 33+22+12);
eq('  כולם הוזנו', pr.pct, 100);
const gp=G.dimProgress((a,b)=>G.gphCell(a,b),D.gph);
eq('dimProgress גפ"ה: קריטריונים משוקללים (26 פחות 3 איכותיים)', gp.tot, 23);
ok('genDirectives רץ', Array.isArray(G.genDirectives()));
ok('genSummary רץ', typeof G.genSummary()==='string');
ok('genTrends רץ', typeof G.genTrends()==='object');
ok('detectPatterns רץ', !!G.detectPatterns());
ok('scanFindings רץ', Array.isArray(G.scanFindings()));
ok('reportHTML רץ', G.reportHTML().includes('דו"ח סיכום ביקורת'));
ok('reportHTML ללא "סביבת הכשרה"', !G.reportHTML().includes('סביבת הכשרה'));

console.log('\n=== 10. שמירה, טעינה ותאימות לאחור ===');
G.save();
const saved=JSON.parse(ctx.localStorage.getItem('idf_insp_v1'));
ok('opt נשמר ב-localStorage', saved.fw.f1.prog['0_0'].opt!=null);
ok('score נשמר לצד opt', saved.fw.f1.prog['0_0'].score!=null);
G.load();
ok('load משחזר את הציונים', G.fwScore('f1')!=null);
// גיבוי ישן: ציונים ידניים 0-100 בלי opt, ועם ממד env
const legacy=JSON.parse(JSON.stringify(saved));
legacy.fw.f1.env={'0_0':{score:80}};
legacy.fw.f1.prog['0_1']={score:60};          // ציון ידני ישן ללא opt
legacy.ks={'gph|gph|0':'keep'}; legacy.pinned={'keep|gph|gph|0':true};
ctx.localStorage.setItem('idf_insp_v1', JSON.stringify(legacy));
let threw=null; try{ G.load(); }catch(e){ threw=e; }
ok('טעינת גיבוי ישן (env + ציון ידני + ks/pinned) לא קורסת', threw===null, String(threw));
ok('  ציון ידני ישן ללא opt עדיין נספר', G.fwCell('f1','prog',0,1).score===60);
ok('  ks/pinned נוקו', G.S.ks===undefined&&G.S.pinned===undefined);
ok('  env במצב לא משפיע על הציון', G.fwScore('f1')!=null);
G.S=G.BLANK();
ok('BLANK נקי', Object.keys(G.S.gph).length===0&&G.S.frameworks.length===0);

console.log('\n=== 11. רינדור UI ===');
G.S=G.BLANK();
const html=G.renderTopic('gph',D.gph,0,G.gphCell,'pickGph','naGph','gph');
ok('renderTopic רץ', html.length>0);
ok('מציג אפשרויות (class="opt")', html.includes('class="opt '));
ok('קורא ל-pickGph', html.includes('pickGph('));
ok('אין צ׳יפים ידניים', !html.includes('schip'));
ok('מציג את נוסח האפשרות מהמסמך', html.includes(G.esc(c0.opts[0].t)));
ok('מציג את ציון האפשרות', html.includes('class="osc"'));
ok('כפתור "לא רלוונטי" קיים', html.includes('לא רלוונטי'));
const bh=G.renderTopic('prog',D.prog,bti,(a,b)=>G.fwCell('f1','prog',a,b),'pickFw','naFw','f1');
ok('שאלת בונוס מסומנת', bh.includes('שאלת בונוס'));
const ph=G.renderTopic('gph',D.gph,pti,G.gphCell,'pickGph','naGph','gph');
ok('סעיף לתיעוד בלבד מסומן', ph.includes('אינו משוקלל בציון'));
ok('  ועדיין מציג את האפשרויות מה-PDF', ph.includes(G.esc(pt.crits[0].opts[0].t)));

console.log(`\n============================\nPASS ${pass}   FAIL ${fail}\n============================`);
process.exit(fail?1:0);

const fs=require('fs'), vm=require('vm');
const src=fs.readFileSync(require('path').join(__dirname,'app.js'),'utf8');

// ---- minimal DOM / browser stubs ----
const stubEl=()=>({innerHTML:'',className:'',textContent:'',classList:{add(){},remove(){},toggle(){}},
  querySelector:()=>null,querySelectorAll:()=>[],replaceWith(){},appendChild(){},style:{},firstChild:null});
const els={};
const ctx={console,
  localStorage:{_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}},
  document:{getElementById:(id)=>(els[id]||(els[id]=stubEl())),querySelector:()=>stubEl(),querySelectorAll:()=>[],
            createElement:()=>stubEl(),addEventListener(){},body:stubEl(),activeElement:null},
  window:{scrollTo(){},addEventListener(){},matchMedia:()=>({matches:false,addListener(){}})},
  setTimeout,clearTimeout,Math,JSON,Date,Set,Map,URL:{createObjectURL:()=>''},Blob:function(){},FileReader:function(){},
  navigator:{},alert(){},confirm:()=>true,location:{href:''}};
ctx.globalThis=ctx; ctx.self=ctx;
vm.createContext(ctx);
vm.runInContext(src+"\n;globalThis.__ev=(c)=>eval(c); globalThis.__setS=(v)=>{S=v;};",ctx);
// גישה למשתני top-level של הסקריפט (let/const אינם נתלים על ה-context)
const G=new Proxy({},{
  get:(_,k)=>{ if(k==='S') return ctx.__ev('S'); try{ return ctx.__ev(String(k)); }catch(e){ return undefined; } },
  set:(_,k,v)=>{ if(k==='S'){ctx.__setS(v); return true;} ctx.__ev(String(k)+'=0'); return true; }
});

let pass=0,fail=0;
function ok(name,cond,extra=''){ if(cond){pass++;console.log('  ✓ '+name);} else {fail++;console.log('  ✗ '+name+'  '+extra);} }
function eq(name,a,b){ ok(name+`  (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`, a===b); }

console.log('\n=== 1. ksAuto — סף 70 ===');
eq('KS_THRESHOLD', G.KS_THRESHOLD, 70);
[[0,'improve'],[1,'improve'],[50,'improve'],[65,'improve'],[69,'improve'],[69.99,'improve'],
 [70,'keep'],[70.01,'keep'],[75,'keep'],[80,'keep'],[85,'keep'],[90,'keep'],[91,'keep'],[100,'keep']]
 .forEach(([v,exp])=>eq('ציון '+v, G.ksAuto(v), exp));
eq('null', G.ksAuto(null), null);
eq('undefined', G.ksAuto(undefined), null);
eq('NaN', G.ksAuto(NaN), null);
eq('label keep', G.ksLabel('keep'), 'שימור');
eq('label improve', G.ksLabel('improve'), 'שיפור');

console.log('\n=== 2. הישן הוסר ===');
['ksOverride','setKs','ksClass','toggleKs','critKsOverride','togglePin','isPinned','pinKey','rebuildFindings','ksGph','ksFw']
 .forEach(n=>ok('אין '+n+'()', typeof G[n]==='undefined'));
ok('אין S.ks', G.S.ks===undefined);
ok('אין S.pinned', G.S.pinned===undefined);

console.log('\n=== 3. critKsClass ===');
eq('תא ריק', G.critKsClass(null), null);
eq('תא ללא ציון', G.critKsClass({score:null}), null);
eq('תא N/A (score 60 + naMark)', G.critKsClass({score:60,naMark:true}), null);
eq('תא 0', G.critKsClass({score:0}), 'improve');
eq('תא 70', G.critKsClass({score:70}), 'keep');
ok('cell.ks ישן מתעלמים ממנו', G.critKsClass({score:50,ks:'keep'})==='improve');

console.log('\n=== 4. טבלת המקרים המבוקשת (scanKS דרך גפ"ה) ===');
// בונים ביקורת סינתטית: לכל נושא בגפ"ה נותנים ציון אחיד לכל הקריטריונים המשוקללים
const gphTopics=G.DATA.gph;
const scored=gphTopics.map((t,i)=>({t,i})).filter(x=>x.t.scored);
console.log('  נושאי גפ"ה עם ציון:',scored.length,'| נושאים איכותיים:',gphTopics.length-scored.length);
const CASES=[50,69,70,80,90,91,100,null];
G.S=G.BLANK();
const applied=[];
CASES.forEach((v,k)=>{
  const x=scored[k]; if(!x) return;
  applied.push({name:x.t.name,ti:x.i,v});
  if(v===null) return;                       // נושא 8 — ללא ציון כלל
  x.t.crits.forEach((c,ci)=>{ if(c.w==null) return; G.setGph(x.i,ci,{score:v}); });
});
// שאר הנושאים נשארים ללא ציון
const res=G.scanKS();
const cls=n=>{const r=res.find(x=>x.name===n); return r?r.cls:'לא מופיע';};
const scoreOf=n=>{const r=res.find(x=>x.name===n); return r?Math.round(r.score):null;};
applied.forEach((a,k)=>{
  const exp = a.v===null?'לא מופיע' : (a.v>=70?'keep':'improve');
  const got = cls(a.name);
  eq(`נושא ${k+1} "${a.name.slice(0,32)}" ציון=${a.v===null?'ללא':a.v}`, got, exp);
  if(a.v!==null) eq(`   ציון הנושא מחושב נכון`, scoreOf(a.name), a.v);
});
ok('שם הנושא מופיע בדוח (לא רק ציון)', res.every(r=>typeof r.name==='string'&&r.name.length>0));

console.log('\n=== 5. אין טווח ציונים שאינו מסווג ===');
let unclassified=[]; for(let v=0;v<=100;v+=0.5){ if(!['keep','improve'].includes(G.ksAuto(v))) unclassified.push(v); }
ok('כל 0-100 מסווג', unclassified.length===0, JSON.stringify(unclassified.slice(0,5)));

console.log('\n=== 6. ציון 0 נכנס לשיפור ===');
G.S=G.BLANK();
const t0=scored[0]; t0.t.crits.forEach((c,ci)=>{ if(c.w!=null) G.setGph(t0.i,ci,{score:0}); });
const r0=G.scanKS().find(x=>x.name===t0.t.name);
ok('נושא בציון 0 מופיע', !!r0);
eq('סיווגו', r0&&r0.cls, 'improve');
eq('ציונו', r0&&r0.score, 0);

console.log('\n=== 7. החרגות ===');
// נושא איכותי (scored:false — "לא מחושב בציון")
const qual=gphTopics.map((t,i)=>({t,i})).find(x=>!x.t.scored);
ok('קיים נושא איכותי ב-DATA', !!qual);
if(qual){ qual.t.crits.forEach((c,ci)=>G.setGph(qual.i,ci,{score:100,keep:'טקסט'}));
  ok('נושא איכותי לא נכנס לריכוז', !G.scanKS().some(x=>x.name===qual.t.name)); }
// נושא שסומן "לא רלוונטי"
G.S.topicNA[G.ksKey('gph','gph',t0.i)]=true;
ok('נושא שסומן לא רלוונטי לא נכנס', !G.scanKS().some(x=>x.name===t0.t.name));
delete G.S.topicNA[G.ksKey('gph','gph',t0.i)];
// קריטריון בודד עם naMark
G.S=G.BLANK();
const t1=scored[1]; const wcrits=t1.t.crits.map((c,ci)=>({c,ci})).filter(x=>x.c.w!=null);
wcrits.forEach(x=>G.setGph(t1.i,x.ci,{score:null,naMark:true}));
ok('נושא שכל קריטריוניו N/A לא נכנס', !G.scanKS().some(x=>x.name===t1.t.name));

console.log('\n=== 8. ksBuckets / ksReportHTML ===');
G.S=G.BLANK();
CASES.forEach((v,k)=>{ const x=scored[k]; if(!x||v===null)return;
  x.t.crits.forEach((c,ci)=>{ if(c.w!=null) G.setGph(x.i,ci,{score:v}); }); });
const bk=G.ksBuckets();
eq('שיפור: מספר נושאים', bk.improve.length, 2);           // 50, 69
eq('שימור: מספר נושאים', bk.keep.length, 5);              // 70,80,90,91,100
ok('שיפור — כולם < 70', bk.improve.every(x=>x.score<70));
ok('שימור — כולם >= 70', bk.keep.every(x=>x.score>=70));
const html=G.ksReportHTML();
ok('HTML מכיל ks-report', html.includes('ks-report'));
ok('HTML מכיל שיפור ושימור', html.includes('שיפור')&&html.includes('שימור'));
bk.improve.concat(bk.keep).forEach(x=>ok('HTML מכיל את שם הנושא: '+x.name.slice(0,28), html.includes(G.esc(x.name))));
G.S=G.BLANK();
ok('ריכוז ריק כשאין ציונים', G.ksReportHTML().includes('טרם הוזנו ציונים'));

console.log('\n=== 9. רגרסיה — מנוע הציונים לא נפגע ===');
G.S=G.BLANK();
const T=G.DATA.gph[0];
T.crits.forEach((c,ci)=>{ if(c.w!=null) G.setGph(0,ci,{score:80}); });
eq('topicScore ממוצע משוקלל', Math.round(G.topicScore(T,ci=>G.gphCell(0,ci))), 80);
ok('gphScore מחזיר ערך', G.gphScore()!=null);
eq('overallScore ללא מסגרות', G.overallScore()!=null, true);
eq('band(70)', G.band(70).t, 'טוב');
eq('band(90)', G.band(90).t, 'מצוין');
eq('fmt(null)', G.fmt(null), '—');
// מסגרות
G.S.frameworks=[{id:'f1',label:'גדוד א',kind:'גדוד',inspectorId:''}];
G.DATA.prog[0].crits.forEach((c,ci)=>{ if(c.w!=null) G.setFw('f1','prog',0,ci,{score:90,improve:'שיפור נדרש'}); });
ok('fwDimScore', Math.round(G.fwDimScore('f1','prog'))===90);
ok('fwScore', Math.round(G.fwScore('f1'))===90);
ok('dimAvgAcrossFw', Math.round(G.dimAvgAcrossFw('prog'))===90);
ok('dimProgress', G.dimProgress((a,b)=>G.fwCell('f1','prog',a,b),G.DATA.prog).done>0);
ok('fwProgress', G.fwProgress('f1').tot>0);
const fwRes=G.scanKS().filter(x=>x.scope==='f1');
ok('נושא מסגרת נכנס לריכוז', fwRes.length===1 && fwRes[0].cls==='keep');
ok('area כולל שם מסגרת', fwRes[0].area.includes('גדוד א'));
// מחוללים
ok('genDirectives רץ', Array.isArray(G.genDirectives()));
ok('genSummary רץ', typeof G.genSummary()==='string');
ok('genTrends רץ', typeof G.genTrends()==='object');
ok('detectPatterns רץ', !!G.detectPatterns());
ok('scanFindings רץ', Array.isArray(G.scanFindings()));
ok('scanKSByCategory רץ', Array.isArray(G.scanKSByCategory()));
ok('findingsBlockHTML רץ', typeof G.findingsBlockHTML('## נושא\n• שורה')==='string');
// שמירה / טעינה
G.save();
const saved=JSON.parse(ctx.localStorage.getItem('idf_insp_v1'));
ok('save() שמר ציונים', saved.fw.f1.prog!==undefined);
ok('save() לא שומר S.ks', saved.ks===undefined);
G.load();
ok('load() משחזר', Math.round(G.fwScore('f1'))===90);
// טעינת גיבוי ישן עם ks/pinned
ctx.localStorage.setItem('idf_insp_v1', JSON.stringify(Object.assign({},saved,{ks:{'gph|gph|0':'keep'},pinned:{'keep|gph|gph|0':true}})));
G.load();
ok('load() מנקה S.ks ישן', G.S.ks===undefined);
ok('load() מנקה S.pinned ישן', G.S.pinned===undefined);
ok('load() שמר את הציונים מהגיבוי הישן', Math.round(G.fwScore('f1'))===90);
// איפוס
G.S=G.BLANK();
ok('BLANK ללא ks', G.S.ks===undefined && G.S.pinned===undefined);
ok('BLANK עם topicNA', typeof G.S.topicNA==='object');

console.log('\n=== 10. רינדור UI (ללא DOM אמיתי) ===');
G.S=G.BLANK(); G.S.frameworks=[{id:'f1',label:'גדוד א',kind:'גדוד',inspectorId:''}]; G.S.ui={activeFw:'f1',dim:'prog'};
G.DATA.gph[0].crits.forEach((c,ci)=>{ if(c.w!=null) G.setGph(0,ci,{score:65}); });
const th=G.renderTopic('gph',G.DATA.gph,0,G.gphCell,'scoreGph','naGph','gph');
ok('renderTopic רץ', th.length>0);
ok('אין כפתור "הוסף לשימור"', !th.includes('הוסף לשימור'));
ok('אין togglePin', !th.includes('togglePin'));
ok('אין toggleKs', !th.includes('toggleKs'));
ok('יש כפתור "לא רלוונטי"', th.includes('לא רלוונטי'));
ok('תגית שיפור מוצגת (ציון 65)', th.includes('ks-tag improve'));
G.DATA.gph[0].crits.forEach((c,ci)=>{ if(c.w!=null) G.setGph(0,ci,{score:70}); });
ok('תגית שימור מוצגת (ציון 70)', G.renderTopic('gph',G.DATA.gph,0,G.gphCell,'scoreGph','naGph','gph').includes('ks-tag keep'));

console.log(`\n============================\nPASS ${pass}   FAIL ${fail}\n============================`);
process.exit(fail?1:0);

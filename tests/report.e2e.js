const path=require('path');
const {chromium}=require('playwright');   // npm i playwright
const APP=require('url').pathToFileURL(path.join(__dirname,'..','ביקורות-הדרכה.html')).href;
(async()=>{
  const b=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
  const pg=await b.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(String(e))); pg.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text());});
  await pg.goto(APP);
  await pg.waitForTimeout(600);
  let pass=0,fail=0;
  const ok=(n,c,x='')=>{c?(pass++,console.log('  ✓ '+n)):(fail++,console.log('  ✗ '+n+' '+x));};

  ok('נטען ללא שגיאות JS', errs.length===0, errs.join(' | '));

  // הקמת ביקורת: מסגרת אחת
  await pg.evaluate(()=>{ S=BLANK(); S.meta.unit='יחידה לבדיקה'; S.meta.name='ביקורת בדיקה';
    S.inspectors=[{id:'i1',name:'בקר',rank:'רס"ן',role:'קב"ן'}];
    S.frameworks=[{id:'f1',label:'גדוד א',kind:'גדוד',inspectorId:'i1'}];
    S.ui={activeFw:'f1',dim:'prog'}; save(); render(); });
  await pg.waitForTimeout(300);

  // ניווט לרמת חטיבה + הזנת ציונים דרך ה-UI (לחיצה על צ'יפ)
  await pg.evaluate(()=>{ go('brigade'); });
  await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ toggleTopic('gph',0); });
  // בחירת האפשרות בעלת הציון הנמוך ביותר בקריטריון הראשון
  const lowIdx = await pg.evaluate(()=>{ const o=DATA.gph[0].crits[0].opts.filter(x=>x.s!=null);
    const min=o.reduce((a,b)=>a.s<=b.s?a:b); return DATA.gph[0].crits[0].opts.indexOf(min); });
  await pg.locator('#tp_gph_0 .crit .opt').nth(lowIdx).click();
  await pg.waitForTimeout(200);
  ok('בחירת אפשרות גוזרת ציון ושומרת', await pg.evaluate(()=>{const c=gphCell(0,0);
    const o=DATA.gph[0].crits[0].opts.find(x=>x.k===c.opt); return !!c && c.opt!=null && c.score===o.s;}));
  ok('תגית "שיפור" מופיעה אחרי ציון נמוך', await pg.locator('#tp_gph_0 .ks-tag.improve').count()>0);
  ok('אין צ׳יפי ציון ידניים', await pg.locator('.schip').count()===0);
  ok('אין כפתורי בחירה ידנית (ks-btn)', await pg.locator('.ks-btn').count()===0);
  ok('אין כפתורי בחירה ידנית לקריטריון (cks-btn)', await pg.locator('.cks-btn').count()===0);
  ok('אין כפתורי pin (tt-btn.keep/.improve)', await pg.locator('.tt-btn.keep, .tt-btn.improve').count()===0);
  ok('כפתור "לא רלוונטי" קיים', await pg.locator('#tp_gph_0 .topic-tools .tt-btn').count()===1);

  // ציונים לכל הנושאים לפי טבלת המקרים
  await pg.evaluate(()=>{
    S=BLANK(); S.meta.unit='יחידה לבדיקה';
    S.inspectors=[{id:'i1',name:'בקר',rank:'רס"ן',role:'קב"ן'}];
    S.frameworks=[{id:'f1',label:'גדוד א',kind:'גדוד',inspectorId:'i1'}];
    S.ui={activeFw:'f1',dim:'prog'};
    const sc=DATA.gph.map((t,i)=>({t,i})).filter(x=>x.t.scored);
    [50,69,70,80,90,91,100,null].forEach((v,k)=>{ const x=sc[k]; if(!x||v===null)return;
      x.t.crits.forEach((c,ci)=>{ if(c.w!=null) setGph(x.i,ci,{score:v, keep:'ראוי לשימור '+v, improve:'דורש שיפור '+v}); }); });
    save(); go('report');
  });
  await pg.waitForTimeout(600);
  ok('דוח נוצר ללא שגיאות', errs.length===0, errs.join(' | '));
  ok('בלוק ks-report מופיע בדוח', await pg.locator('#paper .ks-report').count()===1);
  const impTxt=await pg.locator('#paper .ks-col.improve').innerText();
  const keepTxt=await pg.locator('#paper .ks-col.keep').innerText();
  const names=await pg.evaluate(()=>{ const sc=DATA.gph.map((t,i)=>({t,i})).filter(x=>x.t.scored); return sc.slice(0,8).map(x=>x.t.name); });
  const exp=[[names[0],50,'improve'],[names[1],69,'improve'],[names[2],70,'keep'],[names[3],80,'keep'],
             [names[4],90,'keep'],[names[5],91,'keep'],[names[6],100,'keep'],[names[7],null,'none']];
  exp.forEach(([n,v,side])=>{
    const inImp=impTxt.includes(n), inKeep=keepTxt.includes(n);
    if(side==='improve') ok(`"${n}" (${v}) → שיפור`, inImp && !inKeep);
    else if(side==='keep') ok(`"${n}" (${v}) → שימור`, inKeep && !inImp);
    else ok(`"${n}" (ללא ציון) → לא מופיע`, !inImp && !inKeep);
  });
  ok('כותרת "שיפור"', impTxt.includes('שיפור'));
  ok('כותרת "שימור"', keepTxt.includes('שימור'));
  ok('מונה שיפור = 2', (await pg.locator('#paper .ks-col.improve .cnt').innerText()).trim()==='2');
  ok('מונה שימור = 5', (await pg.locator('#paper .ks-col.keep .cnt').innerText()).trim()==='5');
  ok('הציון מוצג ליד הנושא', impTxt.includes('50') && keepTxt.includes('100'));

  // עדכון חי: שינוי ציון 69 -> 70 מעביר לשימור
  await pg.evaluate((n)=>{ const sc=DATA.gph.map((t,i)=>({t,i})).filter(x=>x.t.scored);
    const x=sc[1]; x.t.crits.forEach((c,ci)=>{ if(c.w!=null) setGph(x.i,ci,{score:70,opt:'א'}); }); save(); render(); }, null);
  await pg.waitForTimeout(400);
  ok('שינוי 69→70 מעביר לשימור', (await pg.locator('#paper .ks-col.keep').innerText()).includes(names[1]));
  ok('ומוסר משיפור', !(await pg.locator('#paper .ks-col.improve').innerText()).includes(names[1]));

  // "לא רלוונטי" מוציא מהריכוז
  await pg.evaluate(()=>{ const sc=DATA.gph.map((t,i)=>({t,i})).filter(x=>x.t.scored);
    S.topicNA[ksKey('gph','gph',sc[0].i)]=true; save(); render(); });
  await pg.waitForTimeout(300);
  ok('נושא "לא רלוונטי" יוצא מהריכוז', !(await pg.locator('#paper .ks-report').innerText()).includes(names[0]));
  await pg.evaluate(()=>{ const sc=DATA.gph.map((t,i)=>({t,i})).filter(x=>x.t.scored);
    delete S.topicNA[ksKey('gph','gph',sc[0].i)]; save(); render(); });
  await pg.waitForTimeout(300);

  // מסכים אחרים
  for(const [k,sel] of [['home','#view'],['brigade','#tp_gph_0'],['fw','.fw-tabs'],['dash','#view'],['report','#paper']]){
    errs.length=0;
    await pg.evaluate(kk=>go(kk),k); await pg.waitForTimeout(400);
    ok('מסך '+k+' נטען', await pg.locator(sel).count()>0 && errs.length===0, errs.join(' | '));
  }
  // מחולל הדוחות מציג את הריכוז
  await pg.evaluate(()=>go('dash')); await pg.waitForTimeout(400);
  ok('מסך העיבוד מציג ריכוז אוטומטי', (await pg.locator('#view').innerText()).includes('ריכוז שיפור/שימור'));
  ok('אין כפתור "סדר לפי נושאים"', !(await pg.locator('#view').innerText()).includes('סדר לפי נושאים'));

  // מחולל טיוטות
  errs.length=0;
  await pg.evaluate(()=>{ genAll(); });
  await pg.waitForTimeout(500);
  ok('genAll רץ ללא שגיאה', errs.length===0, errs.join(' | '));

  // ממד סביבת הכשרה הוסר
  await pg.evaluate(()=>go('fw')); await pg.waitForTimeout(400);
  const dimBar=await pg.locator('.dimbar').innerText();
  ok('אין ממד "סביבת הכשרה" בסרגל הממדים', !dimBar.includes('סביבת'));
  ok('שלושה ממדים בסרגל', (await pg.locator('.dimbar button').count())===3);
  ok('בנק התשובות מוצג במסגרת', (await pg.locator('.crit .opt').count())>0);

  // ייצוא / ייבוא JSON
  errs.length=0;
  const json=await pg.evaluate(()=>JSON.stringify(S));
  ok('S ניתן לסריאליזציה', json.length>50);
  ok('S אינו מכיל ks/pinned', !JSON.parse(json).ks && !JSON.parse(json).pinned);
  // טעינה מגיבוי ישן
  await pg.evaluate(j=>{ const old=JSON.parse(j); old.ks={'gph|gph|0':'keep'}; old.pinned={'keep|gph|gph|0':true};
    localStorage.setItem('idf_insp_v1', JSON.stringify(old)); load(); render(); }, json);
  await pg.waitForTimeout(400);
  ok('טעינת גיבוי ישן עם ks/pinned עוברת', errs.length===0, errs.join(' | '));
  ok('ks/pinned נוקו לאחר טעינה', await pg.evaluate(()=>S.ks===undefined&&S.pinned===undefined));
  ok('הציונים נשמרו מהגיבוי הישן', await pg.evaluate(()=>gphScore()!=null));

  // הדפסה
  errs.length=0;
  await pg.evaluate(()=>go('report')); await pg.waitForTimeout(400);
  await pg.emulateMedia({media:'print'});
  const pdf=await pg.pdf({format:'A4'});
  ok('הדפסה ל-PDF מצליחה', pdf.length>10000);
  
  await pg.emulateMedia({media:'screen'});

  // ייצוא Word
  errs.length=0;
  const wordHtml=await pg.evaluate(()=>{ const orig=URL.createObjectURL; let cap=null;
    URL.createObjectURL=(bl)=>{cap=bl; return 'blob:x';};
    const a0=document.createElement.bind(document);
    document.createElement=(t)=>{ const e=a0(t); if(t==='a')e.click=()=>{}; return e; };
    downloadReport();
    document.createElement=a0; URL.createObjectURL=orig;
    return cap? cap.size : 0; });
  ok('ייצוא Word מייצר קובץ', wordHtml>1000);
  ok('ייצוא Word ללא שגיאות', errs.length===0, errs.join(' | '));

  // איפוס
  errs.length=0;
  await pg.evaluate(()=>{ window.confirm=()=>true; resetAll(); });
  await pg.waitForTimeout(400);
  ok('איפוס ביקורת עובד', await pg.evaluate(()=>Object.keys(S.gph).length===0&&S.frameworks.length===0) && errs.length===0, errs.join(' | '));

  
  console.log(`\n============================\nPASS ${pass}   FAIL ${fail}\n============================`);
  await b.close();
  process.exit(fail?1:0);
})();

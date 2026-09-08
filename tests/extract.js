/* מחלץ את בלוקי ה-<script> מתוך האפליקציה לקובץ app.js לצורך הבדיקות */
const fs=require('fs'), path=require('path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'ביקורות-הדרכה.html'),'utf8');
const blocks=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
fs.writeFileSync(path.join(__dirname,'app.js'), blocks.join('\n'));
console.log('extracted', blocks.length, 'script blocks ->', path.join('tests','app.js'));

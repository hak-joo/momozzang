import { loadChromium, parseArgs } from '/Users/daou-hakjoo/Desktop/project/momozzang/.harness/runs/apply-admin-ux-polish/scripts/lib/pw.mjs';
const a=parseArgs(); const U=a.viewer; const TAG=a.tag;
const chromium=await loadChromium(); const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
const hits=[];
await p.goto(U,{waitUntil:'domcontentloaded',timeout:60000});
for(let i=0;i<120;i++){
  const r=await p.evaluate(`(()=>{const els=[...document.querySelectorAll('*')];
    const purple=els.filter(e=>{const s=getComputedStyle(e).boxShadow;return s&&s.includes('176, 196, 255')});
    return {t:performance.now(),total:els.length,purpleCount:purple.length,
      purpleTags:purple.slice(0,5).map(e=>e.tagName+'.'+String(e.className).slice(0,40))};})()`).catch(()=>null);
  if(r) hits.push(r);
  await p.waitForTimeout(25);
}
await p.locator('body').click({position:{x:195,y:700}}).catch(()=>{});
for(let i=0;i<60;i++){
  const r=await p.evaluate(`(()=>{const els=[...document.querySelectorAll('*')];
    const purple=els.filter(e=>{const s=getComputedStyle(e).boxShadow;return s&&s.includes('176, 196, 255')});
    return {phase:'body',t:performance.now(),total:els.length,purpleCount:purple.length,
      purpleTags:purple.slice(0,5).map(e=>e.tagName+'.'+String(e.className).slice(0,40))};})()`).catch(()=>null);
  if(r) hits.push(r);
  await p.waitForTimeout(25);
}
const bad=hits.filter(h=>h.purpleCount>0);
console.log(TAG, JSON.stringify({samples:hits.length, maxEls:Math.max(...hits.map(h=>h.total)), purpleSamples:bad.length, first:bad.slice(0,3)},null,1));
await b.close();

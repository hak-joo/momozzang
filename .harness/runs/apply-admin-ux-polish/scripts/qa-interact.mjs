import { loadChromium, parseArgs } from '/Users/daou-hakjoo/Desktop/project/momozzang/.harness/runs/apply-admin-ux-polish/scripts/lib/pw.mjs';
const a=parseArgs(); const ADMIN=a.admin||'http://localhost:3002';
const chromium=await loadChromium(); const br=await chromium.launch();
const ctx=await br.newContext({viewport:{width:1440,height:900}});
const p=await ctx.newPage(); const errs=[]; const dialogs=[];
p.on('pageerror',e=>errs.push(String(e)));
p.on('console',m=>{if(m.type()==='error')errs.push('console:'+m.text())});
const out={};
// --- /admin: 갤러리 ✕ → confirm 수락 → 실제 삭제되는가 (저장은 하지 않는다) ---
p.on('dialog',d=>{dialogs.push({type:d.type(),message:d.message()}); d.accept().catch(()=>{})});
await p.goto(`${ADMIN}/admin`,{waitUntil:'networkidle',timeout:60000}); await p.waitForTimeout(2000);
await p.locator('input').filter({hasNot:p.locator('[type=file]')}).first().fill('demo-captain-luna');
await p.locator('button',{hasText:/^(불러오기|Load)$/}).first().click().catch(()=>{});
await p.waitForTimeout(4500);
out.itemsBefore=await p.locator('[class*="sortableItem"]').count();
out.headingBefore=await p.locator('h3',{hasText:/사진첩/}).first().textContent().catch(()=>null);
await p.locator('[class*="deleteButton"]').first().click({force:true}).catch(()=>{});
await p.waitForTimeout(1500);
out.itemsAfter=await p.locator('[class*="sortableItem"]').count();
out.headingAfter=await p.locator('h3',{hasText:/사진첩/}).first().textContent().catch(()=>null);
out.dialogs=dialogs.slice();
// 버튼 라벨 대비
out.buttonContrast=await p.evaluate(`(()=>{
 const lum=(c)=>{const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])};
 const rgb=(s)=>{const m=s.match(/[\\d.]+/g);return m?m.slice(0,3).map(Number):null};
 const ratio=(a,b)=>{const L1=lum(a),L2=lum(b);return Math.round(((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05))*100)/100};
 return [...document.querySelectorAll('[data-admin-toolbar] button, button')].slice(0,6).map(b=>{
   const cs=getComputedStyle(b); const fg=rgb(cs.color); const bg=rgb(cs.backgroundColor);
   return {text:(b.textContent||'').trim().slice(0,12), color:cs.color, bg:cs.backgroundColor,
     ratio: (fg&&bg&&!/rgba\\(0, 0, 0, 0\\)/.test(cs.backgroundColor))?ratio(fg,bg):null};
 });
})()`);
// --- /apply 단계 이동 후 값 유지 ---
await p.goto(`${ADMIN}/apply`,{waitUntil:'networkidle',timeout:60000}); await p.waitForTimeout(3000);
const firstText=p.locator('[class*="formPane"] input[type=text]').first();
await firstText.fill('평가자 신랑');
await p.locator('button',{hasText:/^다음/}).first().click().catch(()=>{}); await p.waitForTimeout(1800);
await p.locator('button',{hasText:/^이전/}).first().click().catch(()=>{}); await p.waitForTimeout(1800);
out.step1RoundTripValue=await firstText.inputValue().catch(()=>null);
out.errors=errs;
console.log(JSON.stringify(out,null,1));
await br.close();

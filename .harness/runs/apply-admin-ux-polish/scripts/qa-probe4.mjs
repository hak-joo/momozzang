// 평가자 독립 재현: 기준 4 의 /admin f5WithoutAnyCue === 1 이 구현 결함인지 측정 아티팩트인지.
// 첫 키보드 포커스를 슬러그 입력이 **아닌** 요소에 준 뒤 슬러그 입력의 before/after 를 잰다.
import { loadChromium, parseArgs } from '/Users/daou-hakjoo/Desktop/project/momozzang/.harness/runs/apply-admin-ux-polish/scripts/lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

const CS = `(el) => { const c = getComputedStyle(el); return {
  outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth, outlineOffset: c.outlineOffset,
  outlineColor: c.outlineColor, boxShadow: c.boxShadow, borderTopColor: c.borderTopColor }; }`;

// 첫 tabbable = 슬러그 입력이라는 아티팩트를 피한다: 먼저 '불러오기'/'Load' 버튼에 포커스를 준다.
const res = await page.evaluate(`(() => {
  const cs = ${CS};
  const slug = [...document.querySelectorAll('input')]
    .find((n) => !['file','hidden','checkbox','radio'].includes(n.type||''));
  const btn = [...document.querySelectorAll('button')]
    .find((b) => /^(Load|불러오기)$/.test((b.textContent||'').trim()));
  return { slugFound: !!slug, btnFound: !!btn,
           slugCls: slug ? slug.className : null, btnText: btn ? btn.textContent.trim() : null };
})()`);

// 키보드 모달리티 확립: Tab 을 눌러 첫 요소로 간 뒤, 그 요소가 슬러그면 blur 시키고 버튼에 focus.
await page.keyboard.press('Tab');
await page.waitForTimeout(150);
const firstTabbed = await page.evaluate(
  `(() => { const a=document.activeElement; return { tag:a.tagName, cls:a.className, text:(a.textContent||'').trim().slice(0,20) }; })()`,
);

// 이제 포커스를 '불러오기' 버튼으로 옮긴다(키보드 모달리티는 유지된다).
const measured = await page.evaluate(`(() => {
  const cs = ${CS};
  const slug = [...document.querySelectorAll('input')]
    .find((n) => !['file','hidden','checkbox','radio'].includes(n.type||''));
  const btn = [...document.querySelectorAll('button')]
    .find((b) => /^(Load|불러오기)$/.test((b.textContent||'').trim()));
  if (!slug) return { error: 'no slug input' };
  if (btn) btn.focus();
  const before = cs(slug);              // 슬러그가 포커스되지 않은 상태
  const beforeFV = slug.matches(':focus-visible');
  slug.focus();
  const after = cs(slug);
  const afterFV = slug.matches(':focus-visible');
  const btnFocused = btn ? (btn.focus(), cs(btn)) : null;
  return { before, beforeFV, after, afterFV, btnFocusedCS: btnFocused,
           changed: JSON.stringify(before) !== JSON.stringify(after) };
})()`);

console.log(JSON.stringify({ target: ADMIN, res, firstTabbed, measured }, null, 2));
await browser.close();

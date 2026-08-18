// 3차 개정 프로토타입 (평가자 E1) — 계약 §0.8-P1.
// 컨테이너 주입(DOM 이동으로 모사) + 어드민 스코프 사이징 오버라이드가
// 6표면의 **폭·높이 포함**과 **닫기 컨트롤 히트테스트·실제 클릭 닫힘**을 해결하는지 확인한다.
// 표면마다 페이지를 새로 로드해 격리한다(실제 클릭 닫기가 다음 표면의 조작을 막기 때문).
//
//   node s3-r3-proto-modal.mjs --out out/s3-r3-proto-css1.json          (오버라이드 ON)
//   node s3-r3-proto-modal.mjs --css=0 --out out/s3-r3-proto-css0.json  (대조군: 컨테이너만)
//
// 한계: DOM appendChild 는 Radix `container` prop 주입의 **근사**다. 언마운트 경로가 다르므로
//       기준 15(잔여 노드 0)는 이 스크립트로 증명되지 않는다 — 구현 후 s3-modal.mjs 로 확인한다.
import { loadChromium, parseArgs, emit } from './lib/pw.mjs';

const args = parseArgs();

const CSS_ON = !process.argv.includes('--css=0');

const OVERRIDE = `
[class*="screen"] [role='dialog'] {
  width: min(430px, 100%);
  max-width: 100%;
  min-width: 0;
  max-height: 100%;
}
`;

const SNAP = `(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return { x:+b.x.toFixed(2), y:+b.y.toFixed(2), w:+b.width.toFixed(2), h:+b.height.toFixed(2),
             left:+b.left.toFixed(2), top:+b.top.toFixed(2), right:+b.right.toFixed(2), bottom:+b.bottom.toFixed(2) }; };
  const screen = document.querySelector('[class*="screen"]');
  const sRect = r(screen);
  const sheets = [...document.querySelectorAll('[role="dialog"]')];
  const overlays = [...document.querySelectorAll('[class*="overlay"]')].filter((e)=>e.getBoundingClientRect().width>0);
  const contained = (a,b) => !!(a&&b&&a.left>=b.left-0.5&&a.right<=b.right+0.5&&a.top>=b.top-0.5&&a.bottom<=b.bottom+0.5);
  // 닫기 버튼 히트테스트 — 열려 있는 모든 시트에 대해
  const closeControl = (sh) => sh.querySelector('[class*="close"]')
    || [...sh.querySelectorAll('button')].at(-1) || null;
  const hits = sheets.map((sh) => {
    const btn = closeControl(sh);
    if (!btn) return { why: 'no close control' };
    const bb = btn.getBoundingClientRect();
    const cx = bb.left + bb.width/2, cy = bb.top + bb.height/2;
    const el = document.elementFromPoint(cx, cy);
    return { btnRect: r(btn), point: [+cx.toFixed(2), +cy.toFixed(2)],
      hitTag: el ? (el.tagName + '.' + String(el.className).slice(0,44)) : null,
      hitIsCloseBtn: !!el && (el === btn || btn.contains(el)),
      btnContainedInScreen: contained(r(btn), sRect) };
  });
  return {
    screenRect: sRect,
    sheets: sheets.map((e)=>({ cls:String(e.className).slice(0,36), rect:r(e),
      bodyDirect: e.parentElement===document.body, inScreen: !!(screen&&screen.contains(e)),
      contained: contained(r(e), sRect) })),
    overlays: overlays.map((e)=>({ cls:String(e.className).slice(0,36), rect:r(e),
      bodyDirect: e.parentElement===document.body, inScreen: !!(screen&&screen.contains(e)),
      withinScreen: r(e).w <= sRect.w+0.5 && r(e).h <= sRect.h+0.5 })),
    hits,
    bodyChildCount: document.body.children.length,
    bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
    formFieldRect: r(document.querySelector('[class*="formPane"] input')),
  };
})()`;

const MOVE = `(() => {
  const screen = document.querySelector('[class*="screen"]');
  if (!screen) return { moved: 0 };
  const kids = [...document.body.children].filter((e) =>
    e.getAttribute('role') === 'dialog' ||
    String(e.className).includes('overlay') ||
    e.hasAttribute('data-radix-focus-guard'));
  kids.forEach((e) => screen.appendChild(e));
  return { moved: kids.length };
})()`;

const S = '[class*="screen"]';
const chromium = await loadChromium();
const browser = await chromium.launch();

async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${args.admin || 'http://localhost:3002'}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  if (CSS_ON) await page.addStyleTag({ content: OVERRIDE });
  return { ctx, page };
}
async function clickText(page, t, scope = S) {
  const b = page.locator(`${scope} button`, { hasText: t }).first();
  await b.scrollIntoViewIfNeeded().catch(() => {});
  await b.click({ force: true, timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1300);
}
async function goMiniRoom(page) {
  const t = page.locator(`${S} button`, { hasText: '미니룸' }).first();
  await t.scrollIntoViewIfNeeded().catch(() => {});
  await t.click({ force: true, timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
}

const SURFACES = [
  { name: '1 ContactInfo(Dialog)', open: async (p) => { await clickText(p, '축하의 말 전하기'); } },
  { name: '2 AboutUs(BottomSheet)', open: async (p) => { await goMiniRoom(p); await clickText(p, 'About Us!'); } },
  { name: '3 GuestBookForm(BottomSheet)', open: async (p) => { await goMiniRoom(p); await clickText(p, '방명록 남기기'); } },
  { name: '4 TotalGuestBookList(BottomSheet)', open: async (p) => { await goMiniRoom(p); await clickText(p, '전체 보기'); } },
  { name: '5 GuestBookDeleteDialog(Dialog)', open: async (p) => {
      await goMiniRoom(p); await clickText(p, '전체 보기');
      const b = p.locator('[class*="deleteIconButton"]').first();
      await b.click({ force: true, timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(1300);
    } },
  { name: '6 MessageDialog(Dialog)', open: async (p) => {
      await goMiniRoom(p); await clickText(p, '방명록 남기기');
      const sb = p.locator('[role="dialog"] button');
      if ((await sb.count()) >= 2) { await sb.nth(1).click({ force: true, timeout: 8000 }).catch(() => {}); await p.waitForTimeout(800); }
      await p.keyboard.press('Escape').catch(() => {});
      await p.waitForTimeout(1400);
    } },
];

const rows = [];
for (const s of SURFACES) {
  const { ctx, page } = await fresh();
  await s.open(page);
  const raw = await page.evaluate(SNAP);
  const mv = await page.evaluate(MOVE);
  await page.waitForTimeout(500);
  const moved = await page.evaluate(SNAP);

  // 실제 클릭으로 최상위 시트가 닫히는가
  let clickClosed = 'noCloseBtn';
  const btn = page.locator('#g3-close-target');
  await page.evaluate(`(() => {
    const sheets=[...document.querySelectorAll('[role="dialog"]')];
    const sh=sheets[sheets.length-1]; if(!sh) return;
    const b=sh.querySelector('[class*="close"]')||[...sh.querySelectorAll('button')].at(-1);
    if(b) b.id='g3-close-target';
  })()`);
  if ((await btn.count()) > 0) {
    const n = moved.sheets.length;
    let err = null;
    await btn.click({ timeout: 6000 }).catch((e) => { err = String(e).split('\n')[0].slice(0, 90); });
    await page.waitForTimeout(1100);
    const after = await page.evaluate(SNAP);
    clickClosed = err ? { err, sheetsAfter: after.sheets.length } : after.sheets.length < n;
  }
  rows.push({
    name: s.name, movedNodes: mv.moved,
    screenRect: moved.screenRect,
    rawSheets: raw.sheets.map((x) => ({ rect: [x.rect.x, x.rect.y, x.rect.w, x.rect.h], contained: x.contained, bodyDirect: x.bodyDirect })),
    rawHits: raw.hits,
    aftSheets: moved.sheets.map((x) => ({ rect: [x.rect.x, x.rect.y, x.rect.w, x.rect.h], contained: x.contained, inScreen: x.inScreen, bodyDirect: x.bodyDirect })),
    aftOverlays: moved.overlays.map((x) => ({ rect: [x.rect.w, x.rect.h], withinScreen: x.withinScreen, bodyDirect: x.bodyDirect })),
    aftHits: moved.hits,
    overlayCoversFormField: !!moved.formFieldRect && moved.overlays.some((o) =>
      o.rect.left <= moved.formFieldRect.left && o.rect.right >= moved.formFieldRect.right &&
      o.rect.top <= moved.formFieldRect.top && o.rect.bottom >= moved.formFieldRect.bottom),
    clickClosed,
    bodyChildOpen: moved.bodyChildCount,
  });
  if (s.name.startsWith('3')) await page.screenshot({ path: `../shots/s3-r3-proto-gb-css${CSS_ON ? 1 : 0}.png` }).catch(() => {});
  await ctx.close();
}

await browser.close();
const summary = {
  cssOn: CSS_ON,
  containedAll: rows.every((r) => r.aftSheets.length > 0 && r.aftSheets.every((s) => s.contained)),
  closeHitAll: rows.every((r) => { const h = r.aftHits.at(-1); return !!h && h.hitIsCloseBtn === true && h.btnContainedInScreen === true; }),
  clickClosedAll: rows.every((r) => r.clickClosed === true),
};
await emit({ summary, rows }, args);

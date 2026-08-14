// 평가자 독립 재현: 기준 27 — 갤러리 드래그로 **순서가 실제로 교환되는가**.
// 데모 이미지가 깨져 있어 src 로 식별 불가 → DOM 노드에 data-qa 표식을 달고 드래그 후 순서를 읽는다.
// (React 가 관리하지 않는 속성이므로 재정렬 시 노드와 함께 이동한다.)
import { loadChromium, parseArgs } from '/Users/daou-hakjoo/Desktop/project/momozzang/.harness/runs/apply-admin-ux-polish/scripts/lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const SLUG = args.slug || 'demo-captain-luna';
const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('dialog', (d) => d.dismiss().catch(() => {}));
const out = { target: ADMIN };

await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
const slugInput = page.locator('input').filter({ hasNot: page.locator('[type=file]') }).first();
await slugInput.fill(SLUG).catch(() => {});
await page.locator('button', { hasText: /^(Load|불러오기)$/ }).first().click().catch(() => {});
await page.waitForTimeout(4500);

const items = page.locator('[class*="sortableItem"]');
out.itemsBefore = await items.count();

// 표식 부착 + rect 기록
out.marked = await page.evaluate(`(() => {
  const els = [...document.querySelectorAll('[class*="sortableItem"]')];
  els.forEach((e, i) => e.setAttribute('data-qa', String.fromCharCode(65 + i)));
  return els.map((e) => { const r = e.getBoundingClientRect();
    return { qa: e.getAttribute('data-qa'), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; });
})()`);
out.orderBefore = out.marked.map((m) => m.qa).join(',');

if (out.itemsBefore >= 2) {
  await items.first().scrollIntoViewIfNeeded().catch(() => {});
  const a = await items.first().boundingBox();
  const b = await items.nth(1).boundingBox();
  out.rects = { a, b };
  if (a && b) {
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    // 축을 가정하지 않는다: 먼저 활성화 임계치를 넘기고, 그다음 목표 아이템 중심으로 이동.
    await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 6 });
    await page.waitForTimeout(250);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 });
    await page.waitForTimeout(400);
    out.duringDrag = await page.evaluate(`(() => {
      const els = [...document.querySelectorAll('[class*="sortableItem"]')];
      return { count: els.length,
        transforms: els.map((e) => ({ qa: e.getAttribute('data-qa'), t: e.style.transform || '' })) };
    })()`);
    await page.mouse.up();
    await page.waitForTimeout(1200);
  }
}
out.itemsAfter = await items.count();
out.orderAfter = await page.evaluate(
  `[...document.querySelectorAll('[class*="sortableItem"]')].map((e) => e.getAttribute('data-qa') || '?').join(',')`,
);
out.swapped = out.orderBefore !== out.orderAfter && out.orderAfter.split(',').sort().join(',') === out.orderBefore.split(',').sort().join(',');

// 주축 성분 부호가 반대인지 (축 일반화 판정)
const tf = out.duringDrag?.transforms || [];
const parse = (s) => { const m = String(s).match(/translate3d\(\s*(-?[\d.]+)px,\s*(-?[\d.]+)px/); return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null; };
const vs = tf.map((t) => ({ qa: t.qa, v: parse(t.t) })).filter((o) => o.v);
out.vectors = vs;
const axis = vs.length >= 2 ? (Math.abs(vs[0].v.x) >= Math.abs(vs[0].v.y) ? 'x' : 'y') : null;
out.dragAxis = axis;
out.oppositeSignsOnAxis = axis ? vs.some((o) => o.v[axis] > 0) && vs.some((o) => o.v[axis] < 0) : false;

console.log(JSON.stringify(out, null, 2));
await browser.close();

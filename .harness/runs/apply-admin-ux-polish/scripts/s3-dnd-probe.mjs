// QA_FINDINGS_2 §10-1 이 요구한 일반화된 DnD 합격식의 시제품 검증.
// 축을 가정하지 않고 `data-qa-order` 표식 기반 **드롭 후 순서 문자열**만 본다.
import { loadChromium, parseArgs } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const SLUG = args.slug || 'demo-captain-luna';
const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('dialog', (d) => d.dismiss().catch(() => {}));
const out = {};

await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
await page.locator('input').filter({ hasNot: page.locator('[type=file]') }).first().fill(SLUG);
await page.locator('button', { hasText: /^불러오기$/ }).first().click();
await page.waitForTimeout(4500);

const items = page.locator('[class*="sortableItem"]');
out.itemsBefore = await items.count();
await items.first().scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(400);

out.marked = await page.evaluate(`(() => {
  const els = [...document.querySelectorAll('[class*="sortableItem"]')];
  els.forEach((e, i) => e.setAttribute('data-qa-order', String.fromCharCode(65 + i)));
  return els.length;
})()`);
const readOrder = () =>
  page.evaluate(
    `[...document.querySelectorAll('[class*="sortableItem"]')].map((e) => e.getAttribute('data-qa-order') || '?').join(',')`,
  );
out.orderBefore = await readOrder();

const a = await items.first().boundingBox();
const b = await items.nth(1).boundingBox();
out.rects = { a, b };
if (a && b) {
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 6 });
  await page.waitForTimeout(250);
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 });
  await page.waitForTimeout(400);
  out.countDuringDrag = await items.count();
  await page.mouse.up();
  await page.waitForTimeout(1200);
}
out.itemsAfter = await items.count();
out.orderAfter = await readOrder();
const sorted = (s) => s.split(',').sort().join(',');
out.pass =
  out.itemsBefore >= 2 &&
  out.orderAfter !== out.orderBefore &&
  sorted(out.orderAfter) === sorted(out.orderBefore) &&
  !out.orderAfter.includes('?') &&
  out.itemsAfter === out.itemsBefore;

console.log(JSON.stringify(out, null, 2));
await browser.close();

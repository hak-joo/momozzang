// 계약 §12-1 이월 항목: `:root` 그림자 기본값이 뷰어 첫 페인트에 PURPLE inset 그림자를
// 순간 노출시키는가. 로드 직후를 고빈도로 샘플링 + 연속 캡처한다.
import { loadChromium, parseArgs } from '/Users/daou-hakjoo/Desktop/project/momozzang/.harness/runs/apply-admin-ux-polish/scripts/lib/pw.mjs';
const args = parseArgs();
const VIEWER = args.viewer || 'http://localhost:5176';
const DIR = args.dir || '.';
const TAG = args.tag || 'after';
const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const samples = [];
await page.goto(`${VIEWER}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
for (let i = 0; i < 60; i++) {
  const s = await page.evaluate(`(() => {
    const b = getComputedStyle(document.body);
    const boxes = [...document.querySelectorAll('[class*="board"]')].slice(0, 3)
      .map((e) => getComputedStyle(e).boxShadow);
    return { t: performance.now(),
      bodyShadowMain: b.getPropertyValue('--box-shadow-main').trim(),
      rootShadowMain: getComputedStyle(document.documentElement).getPropertyValue('--box-shadow-main').trim(),
      bodyMain300: b.getPropertyValue('--color-main-300').trim(),
      boxCount: document.querySelectorAll('[class*="board"]').length,
      boxes };
  })()`).catch(() => null);
  if (s) samples.push(s);
  if (i < 12) await page.screenshot({ path: `${DIR}/flash-${TAG}-${String(i).padStart(2, '0')}.png` }).catch(() => {});
  await page.waitForTimeout(60);
}
// 인트로 통과 후 본문
await page.locator('body').click({ position: { x: 195, y: 700 } }).catch(() => {});
for (let i = 0; i < 25; i++) {
  const s = await page.evaluate(`(() => {
    const b = getComputedStyle(document.body);
    const boxes = [...document.querySelectorAll('[class*="board"]')].slice(0, 3)
      .map((e) => getComputedStyle(e).boxShadow);
    return { phase: 'body', t: performance.now(),
      bodyShadowMain: b.getPropertyValue('--box-shadow-main').trim(),
      boxCount: document.querySelectorAll('[class*="board"]').length, boxes };
  })()`).catch(() => null);
  if (s) samples.push(s);
  await page.waitForTimeout(60);
}
// 요약: PURPLE inset 문자열이 body 나 Box computed 에 나타난 샘플
const PURPLE = 'rgba(176, 196, 255, 0.3)';
const flagged = samples.filter(
  (s) => (s.boxes || []).some((b) => b.includes(PURPLE)) || (s.bodyShadowMain || '').includes('176, 196, 255'),
);
console.log(JSON.stringify({
  n: samples.length,
  firstBoxAppearsAt: samples.findIndex((s) => s.boxCount > 0),
  distinctBodyShadow: [...new Set(samples.map((s) => s.bodyShadowMain))],
  distinctRootShadow: [...new Set(samples.map((s) => s.rootShadowMain).filter(Boolean))],
  distinctBoxShadows: [...new Set(samples.flatMap((s) => s.boxes || []))],
  flaggedCount: flagged.length,
  flaggedSample: flagged.slice(0, 3),
}, null, 2));
await browser.close();

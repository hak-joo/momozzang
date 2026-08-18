// F6 구현 방식 사전 검증(계약 §0.7 / §4): `input[type=file]` 을 **clip 패턴으로 시각적 숨김**했을 때
//   (a) 라벨 클릭으로 파일 선택 창이 열리는가
//   (b) 버튼(ref.click()) 으로도 열리는가
//   (c) 키보드 포커스가 가능한가(= DoD 13 대상으로 남는가)
//   (d) display:none 라벨 클릭과의 차이
// 실제 DOM 을 주입해 측정한다(코드는 건드리지 않는다).
import { loadChromium, parseArgs } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

await page.evaluate(`(() => {
  const host = document.createElement('div');
  host.id = 'clip-probe';
  host.innerHTML = [
    '<div data-file-drop="clip">',
    '  <label for="clip-input">대표 이미지 선택</label>',
    '  <input id="clip-input" type="file" accept="image/*"',
    '    style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0;">',
    '  <button type="button" id="clip-btn">파일 선택</button>',
    '</div>',
    '<div data-file-drop="none">',
    '  <label for="none-input">공유 썸네일 선택</label>',
    '  <input id="none-input" type="file" accept="image/*" style="display:none">',
    '</div>',
  ].join('');
  document.body.appendChild(host);
  document.getElementById('clip-btn').addEventListener('click', () => document.getElementById('clip-input').click());
})()`);

const out = {};
out.clipComputed = await page.evaluate(`(() => {
  const el = document.getElementById('clip-input');
  const c = getComputedStyle(el);
  const b = el.getBoundingClientRect();
  return { display: c.display, opacity: c.opacity, visibility: c.visibility,
           rect: [+b.width.toFixed(2), +b.height.toFixed(2)],
           visuallyHidden: (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) === 0 || (b.width <= 1 && b.height <= 1)) };
})()`);

const tryOpen = async (sel) => {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null),
    page.locator(sel).first().click({ force: true }).catch(() => {}),
  ]);
  if (chooser) await chooser.setFiles([]).catch(() => {});
  return !!chooser;
};

out.clipLabelClickOpens = await tryOpen('label[for="clip-input"]');
out.clipButtonClickOpens = await tryOpen('#clip-btn');
out.displayNoneLabelClickOpens = await tryOpen('label[for="none-input"]');

out.clipFocusable = await page.evaluate(`(() => {
  const el = document.getElementById('clip-input');
  el.focus();
  const ok = document.activeElement === el;
  el.blur();
  return ok;
})()`);
out.displayNoneFocusable = await page.evaluate(`(() => {
  const el = document.getElementById('none-input');
  el.focus();
  const ok = document.activeElement === el;
  el.blur();
  return ok;
})()`);

console.log(JSON.stringify(out, null, 2));
await browser.close();

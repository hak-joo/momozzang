// F6 드롭 경로 시뮬레이션의 **사전 검증**(계약 §0.7): 현재 코드에 드롭존이 없으므로
// 임시 리스너를 붙여 Playwright 의 dispatchEvent(dragover/dragleave/drop) 가
// 진짜 File 을 실은 DataTransfer 를 전달하는지 확인한다.
// (React 의 onDragOver/onDrop 이 받게 될 것과 같은 네이티브 이벤트다.)
import { loadChromium, parseArgs } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

const dt = await page.evaluateHandle(async () => {
  const d = new DataTransfer();
  const blob = await (
    await fetch(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    )
  ).blob();
  d.items.add(new File([blob], 'probe.png', { type: 'image/png' }));
  return d;
});

await page.evaluate(`(() => {
  window.__cue = [];
  const host = document.querySelector('[class*="formPane"]');
  host.setAttribute('data-drag-probe', '');
  const log = (name) => (e) => {
    const f = e.dataTransfer && e.dataTransfer.files;
    window.__cue.push({
      name, isDragEvent: e instanceof DragEvent, cancelable: e.cancelable,
      types: e.dataTransfer ? [...e.dataTransfer.types] : null,
      fileCount: f ? f.length : 0,
      firstName: f && f[0] ? f[0].name : null,
      firstIsFile: !!(f && f[0] instanceof File),
    });
  };
  ['dragenter','dragover','dragleave','drop'].forEach((n) => host.addEventListener(n, log(n)));
})()`);

const zone = page.locator('[data-drag-probe]');
await zone.dispatchEvent('dragenter', { dataTransfer: dt });
await zone.dispatchEvent('dragover', { dataTransfer: dt });
await zone.dispatchEvent('dragleave', { dataTransfer: dt });
await zone.dispatchEvent('drop', { dataTransfer: dt });
await page.waitForTimeout(300);

console.log(JSON.stringify(await page.evaluate('window.__cue'), null, 2));
await browser.close();

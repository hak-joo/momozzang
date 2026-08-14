// /apply 폰 미리보기 프레임 baseline — 스프린트 계약 1 성공 기준 1~4, 13~18, 그리고 9.4-3(RingPhoto).
//
//   node preview-baseline.mjs --out out/preview-before.json
//   (구현 후) node preview-baseline.mjs --out out/preview-after.json
//   diff out/preview-before.json out/preview-after.json
//
// 출처: 세션 스크래치패드의 baseline-s1.mjs / baseline-s1b.mjs 를 통합·확장 이관(E14).
// 확장분: 콘솔 전수 수집(기준 2) · placehold.co 요청 전수(기준 4) · 테마 스코프 실측(E6)
//        · 미리보기 홈 대표 이미지(RingPhoto) 실렌더 확인(§9.4-3).
import { loadChromium, parseArgs, emit, domHelpers } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';

const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const consoleMsgs = [];
const requested = [];
const failed = [];
const pageErrors = [];
page.on('console', (m) => consoleMsgs.push(`[${m.type()}] ${m.text()}`));
page.on('request', (r) => requested.push(r.url()));
page.on('requestfailed', (r) => failed.push(r.url()));
page.on('pageerror', (e) => pageErrors.push(String(e)));

await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2500);

const out = {};

// ── 기준 1 · 3: 스텝① 폼 상태 ────────────────────────────────────────
out.step1 = await page.evaluate(`(() => {
  ${domHelpers}
  const d = document.querySelector('#apply-date') || document.querySelector('input[type=date]');
  const imgs = [...document.querySelectorAll('img')];
  return {
    dateInputId: d ? d.id : null,
    dateValue: d ? d.value : '(no date input)',
    imgTotal: imgs.length,
    imgBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src).sort(),
    fileInputs: document.querySelectorAll('input[type=file]').length,
  };
})()`);

// ── 기준 13~18: 프레임 기하 ──────────────────────────────────────────
out.frame = await page.evaluate(`(() => {
  ${domHelpers}
  const frame = byClass('frame');
  const notch = byClass('notch');
  const screen = byClass('screen');
  const h = screen ? screen.querySelector('header') : null;
  if (!screen || !h || !notch) return null;
  const hb = h.getBoundingClientRect();
  const sb = screen.getBoundingClientRect();
  const nb = notch.getBoundingClientRect();
  const btns = [...h.querySelectorAll('button')];
  const deco = [...screen.querySelectorAll('div')].find((d) => {
    const cs = getComputedStyle(d);
    return cs.backdropFilter && cs.backdropFilter.includes('blur(4px)') && parseFloat(cs.borderTopWidth) === 2;
  });
  const mw = screen.querySelector('[class*="mainWrapper"]');
  const hcs = getComputedStyle(h);
  return {
    frameRect: rect(frame),
    screenRect: rect(screen),
    notchRect: rect(notch),
    headerRect: rect(h),
    headerCS: pick(hcs, ['position', 'top', 'left', 'width', 'zIndex']),
    // 기준 13
    notchHeaderOverlapPx: +Math.max(0, Math.min(nb.bottom, hb.bottom) - Math.max(nb.top, hb.top)).toFixed(2),
    // 기준 14
    tabsBelowNotch: btns.map((b) => b.getBoundingClientRect().top >= nb.bottom),
    tabLabels: btns.map((b) => b.textContent.trim()),
    // 기준 15 · 16
    firstTabLeft: btns[0] ? +btns[0].getBoundingClientRect().left.toFixed(2) : null,
    lastTabRight: btns.at(-1) ? +btns.at(-1).getBoundingClientRect().right.toFixed(2) : null,
    screenLeft: +sb.left.toFixed(2),
    screenRight: +sb.right.toFixed(2),
    // 기준 17
    screenScrollHeight: screen.scrollHeight,
    screenClientHeight: screen.clientHeight,
    // 참고
    decoRect: rect(deco),
    decoCS: deco ? pick(getComputedStyle(deco), ['width', 'height', 'borderTopWidth', 'boxSizing']) : null,
    mainWrapperRect: rect(mw),
    mainWrapperMarginTop: mw ? getComputedStyle(mw).marginTop : null,
    // 기준 18 (E6) — 테마 스코프
    screenTransform: getComputedStyle(screen).transform,
    screenMain300: getComputedStyle(screen).getPropertyValue('--color-main-300').trim(),
    bodyMain300: getComputedStyle(document.body).getPropertyValue('--color-main-300').trim(),
    bodyShadowMain: getComputedStyle(document.body).getPropertyValue('--box-shadow-main').trim(),
  };
})()`);

// 기준 18 — 미리보기 스크롤이 문서로 새지 않는지.
// 주의: 실측 결과 미리보기의 실제 스크롤 컨테이너는 `.screen`(overflow:hidden)이 아니라
//       내부 `.mainWrapper`(overflow-y:auto, scrollHeight ≈ 5698 / clientHeight ≈ 706)다.
//       그리고 `hover()`가 scrollIntoViewIfNeeded 로 문서를 먼저 스크롤시키므로
//       문서 scrollTop 기준값은 **hover 이후**에 읽어야 한다.
{
  const screen = page.locator('[class*="screen"]').first();
  if ((await screen.count()) > 0) await screen.hover().catch(() => {});
  await page.waitForTimeout(300);
  const read = () =>
    page.evaluate(`(() => {
      const mw = document.querySelector('[class*="mainWrapper"]');
      return { doc: document.documentElement.scrollTop, mainWrapper: mw ? mw.scrollTop : null,
               mainWrapperSh: mw ? mw.scrollHeight : null, mainWrapperCh: mw ? mw.clientHeight : null,
               mainWrapperOverscroll: mw ? getComputedStyle(mw).overscrollBehavior : null };
    })()`);
  const before = await read();
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(700);
  const after = await read();
  out.frameScrollIsolation = { before, after, docDelta: after.doc - before.doc, previewDelta: after.mainWrapper - before.mainWrapper };
}

// ── §9.4-3: 미리보기 홈 대표 이미지(RingPhoto) 가 실제로 채워졌는가 ──
{
  const home = page.locator('[class*="screen"] header button', { hasText: '홈' }).first();
  if ((await home.count()) > 0) {
    await home.click().catch(() => {});
    await page.waitForTimeout(1200);
  }
  // 대표 이미지는 <img>가 아니라 인라인 SVG의 <image href>라 naturalWidth 를 직접 못 읽는다.
  // 같은 href 로 Image()를 만들어 디코드시키고, 캔버스로 그려 "실제로 뭔가 그려지는지"까지 잰다.
  out.ringPhoto = await page.evaluate(`(async () => {
    const screen = [...document.querySelectorAll('div')].find((d) =>
      [...d.classList].some((c) => c.includes('screen')));
    if (!screen) return null;
    const im = screen.querySelector('svg image');
    if (!im) return { found: false };
    const href = im.getAttribute('href') || im.getAttribute('xlink:href') || '';
    const b = im.getBoundingClientRect();
    const probe = { decoded: false, naturalWidth: 0, naturalHeight: 0, opaquePixelRatio: 0, distinctColors: 0 };
    try {
      const img = new Image();
      img.src = href;
      await img.decode();
      probe.decoded = true;
      probe.naturalWidth = img.naturalWidth;
      probe.naturalHeight = img.naturalHeight;
      const c = document.createElement('canvas');
      c.width = 32; c.height = 32;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0, 32, 32);
      const px = g.getImageData(0, 0, 32, 32).data;
      let opaque = 0; const seen = new Set();
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] > 8) opaque += 1;
        seen.add(px[i] + ',' + px[i + 1] + ',' + px[i + 2] + ',' + px[i + 3]);
      }
      probe.opaquePixelRatio = +(opaque / 1024).toFixed(3);
      probe.distinctColors = seen.size;
    } catch (e) { probe.error = String(e).slice(0, 120); }
    return {
      found: true,
      hrefPrefix: href.slice(0, 40),
      isDataUri: href.startsWith('data:'),
      isPlaceholdCo: href.includes('placehold.co'),
      rect: [+b.x.toFixed(2), +b.y.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)],
      probe,
    };
  })()`);
  // 프레임 상단 캡처 — 대표 사진 프레임이 비었는지 눈으로 확인할 증거
  const frame = page.locator('[class*="frame"]').first();
  if ((await frame.count()) > 0 && typeof args.shots === 'string') {
    await frame.screenshot({ path: `${args.shots}/preview-home.png` }).catch(() => {});
  }
}

// ── 기준 3 · 4: 스텝② 이동 후 이미지/네트워크 ────────────────────────
// 스텝① 시점까지의 placehold.co 집계를 먼저 스냅샷(기준 4의 "현재값" 표기용)
out.networkAtStep1 = {
  placeholdCoRequestCount: requested.filter((u) => u.includes('placehold.co')).length,
  placeholdCoDistinct: [...new Set(requested.filter((u) => u.includes('placehold.co')))].sort(),
  placeholdCoFailedCount: failed.filter((u) => u.includes('placehold.co')).length,
};

{
  const next = page.getByRole('button', { name: /다음|이미지|2/ }).first();
  out.step2 = { reached: false };
  if ((await next.count()) > 0) {
    await next.click().catch(() => {});
    await page.waitForTimeout(2000);
    out.step2 = await page.evaluate(`(() => {
      const imgs = [...document.querySelectorAll('img')];
      const thumbs = [...document.querySelectorAll('[data-image-thumb]')];
      return {
        reached: true,
        imgTotal: imgs.length,
        imgBroken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src).sort(),
        thumbCount: thumbs.length,
        thumbStates: thumbs.map((t) => t.dataset.state),
        fileInputs: document.querySelectorAll('input[type=file]').length,
      };
    })()`);
  }
}

// ── 콘솔 / 네트워크 집계 ─────────────────────────────────────────────
out.console = {
  all: [...new Set(consoleMsgs)],
  dateFormatWarnings: consoleMsgs.filter((m) => m.includes('does not conform to the required format')),
};
out.network = {
  placeholdCoRequested: [...new Set(requested.filter((u) => u.includes('placehold.co')))].sort(),
  placeholdCoFailed: [...new Set(failed.filter((u) => u.includes('placehold.co')))].sort(),
  placeholdCoRequestCount: requested.filter((u) => u.includes('placehold.co')).length,
  allFailed: [...new Set(failed)].sort(),
};
out.pageErrors = pageErrors;

await ctx.close();
await browser.close();
await emit(out, args);

// F2(이미지 실패·빈 상태 폴백) 검증 — 스프린트 계약 1 성공 기준 6~12.
//
//   PLAYWRIGHT_DIR=<...>/node_modules node verify-f2.mjs --out out/f2.json --shots ../shots
//
// §5.3 "F2 적용 표면 표"의 표면을 순회하며 error/empty 를 강제 주입하고
// [data-image-thumb] / [data-safe-image] / [data-safe-image-fallback] 의 수와 상태를 측정한다.
//
// 규칙: **주입 대상 수 n 이 0 이면 통과가 아니라 "측정 실패"** 로 기록한다(계약 기준 11).
//
// ── 계약과 달라진 점(실측 근거) ─────────────────────────────────────────────
// 계약 기준 11 의 1·2단계("사진첩 그리드 진입" → "확대 캐러셀 진입")는 이 앱에서 재현 불가다.
// 사진첩 섹션(Gallery.tsx)은 <SwipeStack> 하나만 렌더하며, GalleryItem / Carousel 은
// 저장소 전체에 **import 하는 곳이 0곳**인 dead code 다(아래 grep 으로 재현 가능):
//   grep -rn "GalleryItem\|from './Carousel'" --include="*.tsx" packages/ui/src apps/*/src \
//     | grep -v "Gallery/GalleryItem.tsx\|Gallery/Carousel.tsx"   # → 출력 없음
// 따라서 표면 #6·#8 은 코드 배선만 되어 있고 **런타임 측정 대상이 존재하지 않는다**.
// 이 스크립트는 그 사실을 unreachableSurfaces 로 기록하고, 실제 측정 가능한
// #7(SwipeStack)·#9(AboutUs) 만 주입 검증한다.
import { loadChromium, parseArgs, emit } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const SHOTS = typeof args.shots === 'string' ? args.shots : null;
const BAD = '/__no_such_image__.jpg';

const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
page.on('dialog', (d) => d.accept()); // GalleryManager 삭제 confirm()

const shot = async (name) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` });
};

const out = {
  unreachableSurfaces: {
    '6_gallery_grid': 'GalleryItem — import 하는 곳 0곳(dead code). 사진첩 섹션은 SwipeStack 만 렌더.',
    '8_carousel': "Carousel — import 하는 곳 0곳(dead code). 확대 캐러셀 진입 경로가 앱에 없음.",
  },
  surfaces: {},
};

// ── 공통 측정식 ────────────────────────────────────────────────────────────
const THUMB_PROBE = `(() => {
  const els = [...document.querySelectorAll('[data-image-thumb]')];
  return {
    count: els.length,
    states: els.map((e) => e.dataset.state),
    imgs: document.querySelectorAll('[data-image-thumb] img').length,
    labelVisible: els.length > 0 && els.every((el) =>
      el.textContent.includes('이미지를 불러올 수 없어요') &&
      el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden'),
  };
})()`;

const INJECT_THUMB = `(() => {
  const imgs = [...document.querySelectorAll('[data-image-thumb] img')];
  const n = imgs.length;
  imgs.forEach((i) => { i.src = location.origin + '${BAD}'; });
  return n;
})()`;

// 계약 기준 11 의 측정식 그대로: .screen 내부 img[data-safe-image]
const INJECT_SAFE = `(() => {
  const scope = document.querySelector('[class*="screen"]');
  const imgs = [...scope.querySelectorAll('img[data-safe-image]')];
  const n = imgs.length;
  imgs.forEach((i) => { i.src = location.origin + '${BAD}'; });
  return n;
})()`;

const SAFE_PROBE = `(() => {
  const scope = document.querySelector('[class*="screen"]');
  return {
    imgs: scope.querySelectorAll('img[data-safe-image]').length,
    fallbacks: scope.querySelectorAll('[data-safe-image-fallback]').length,
  };
})()`;

const gotoApply = async () => {
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
};

// ─────────────────────────────────────────────────────────────────────────────
// 기준 11 — 표면 #7 SwipeStack (사진첩 탭 + 좌→우 드래그 1회)
// ─────────────────────────────────────────────────────────────────────────────
await gotoApply();
await page.locator('[class*="screen"] header button', { hasText: '사진첩' }).first().click();
await page.waitForTimeout(1500);
{
  const card = page.locator('[class*="screen"] figure[class*="card"]').first();
  const box = await card.boundingBox().catch(() => null);
  let dragged = false;
  if (box) {
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 160, cy, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(1000);
    dragged = true;
  }
  await shot('f2-preview-swipestack-before');
  const n = await page.evaluate(INJECT_SAFE);
  await page.waitForTimeout(1200);
  const after = await page.evaluate(SAFE_PROBE);
  out.surfaces['7_swipestack'] = {
    dragged,
    injected: n,
    after,
    ok: dragged && n >= 1 && after.imgs === 0 && after.fallbacks >= n,
  };
  await shot('f2-preview-swipestack-after');
}

// ─────────────────────────────────────────────────────────────────────────────
// 기준 11 — 표면 #9 AboutUs (미니룸 탭 → "About Us!" 바텀시트)
// ─────────────────────────────────────────────────────────────────────────────
await gotoApply();
await page.locator('[class*="screen"] header button', { hasText: '미니룸' }).first().click();
await page.waitForTimeout(1500);
{
  const opened = await page
    .locator('[class*="screen"] button', { hasText: 'About Us' })
    .first()
    .click()
    .then(() => true)
    .catch(() => false);
  await page.waitForTimeout(1500);
  await shot('f2-preview-aboutus-before');
  // 측정 스코프 정정(실측): AboutUs 는 BottomSheet 라 **document.body 포털**에 렌더된다.
  // 계약 기준 11 의 `[class*="screen"] ...` 스코프로는 보이지 않으므로 document 스코프로 잰다.
  //   확인: [...document.querySelectorAll('img[data-safe-image]')]
  //         .filter(i => !document.querySelector('[class*="screen"]').contains(i)) → photoImage 2개
  const n = await page.evaluate(`(() => {
    const imgs = [...document.querySelectorAll('img[class*="photoImage"][data-safe-image]')];
    const n = imgs.length;
    imgs.forEach((i) => { i.src = location.origin + '${BAD}'; });
    return n;
  })()`);
  await page.waitForTimeout(1200);
  const after = await page.evaluate(`(() => ({
    imgs: document.querySelectorAll('img[class*="photoImage"][data-safe-image]').length,
    fallbacks: document.querySelectorAll('[data-safe-image-fallback]').length,
    inScreen: false,
  }))()`);
  out.surfaces['9_aboutus'] = {
    opened,
    injected: n,
    after,
    ok: opened && n >= 1 && after.imgs === 0 && after.fallbacks >= n,
  };
  await shot('f2-preview-aboutus-after');
}

// ─────────────────────────────────────────────────────────────────────────────
// 기준 6·7·10 — /apply 스텝② (표면 #1 단일 5슬롯, #2 갤러리 썸네일)
// ─────────────────────────────────────────────────────────────────────────────
await gotoApply();
await page.locator('button', { hasText: '다음' }).first().click();
await page.waitForTimeout(2500);

out.criterion6 = await page.evaluate(`(() => {
  const els = [...document.querySelectorAll('[data-image-thumb]')];
  return {
    count: els.length,
    states: els.map((e) => e.dataset.state),
    allLoaded: els.length > 0 && els.every((e) => e.dataset.state === 'loaded'),
  };
})()`);

out.criterion10 = await page.evaluate(`(() => {
  const el = document.querySelector('[class*="sortableItem"]');
  return el ? getComputedStyle(el).backgroundColor : null;
})()`);
await shot('f2-step2-loaded');

{
  const n = await page.evaluate(INJECT_THUMB);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(THUMB_PROBE);
  out.criterion7 = {
    injected: n,
    ...after,
    allError: after.count > 0 && after.states.every((s) => s === 'error'),
    ok:
      n >= 1 &&
      after.imgs === 0 &&
      after.count > 0 &&
      after.states.every((s) => s === 'error') &&
      after.labelVisible,
  };
  await shot('f2-step2-error');
}

// ─────────────────────────────────────────────────────────────────────────────
// 기준 9 — empty 상태 (표면 #3: 갤러리 사진 2장 전부 삭제)
// ─────────────────────────────────────────────────────────────────────────────
await gotoApply();
await page.locator('button', { hasText: '다음' }).first().click();
await page.waitForTimeout(2500);
{
  for (let i = 0; i < 5; i += 1) {
    const btns = page.locator('[class*="sortableItem"] button');
    if ((await btns.count()) === 0) break;
    await btns.first().click();
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1000);
  out.criterion9 = await page.evaluate(`(() => {
    const empties = [...document.querySelectorAll('[data-image-thumb][data-state="empty"]')];
    const galleryEmpty = empties.find((e) => e.textContent.includes('여기에 사진을 등록하세요'));
    const galleryRoot = galleryEmpty ? galleryEmpty.closest('[class*="board"]') : null;
    return {
      emptyCount: empties.length,
      hasGalleryLabel: !!galleryEmpty,
      borderStyle: galleryEmpty ? getComputedStyle(galleryEmpty).borderStyle : null,
      visible: galleryEmpty ? galleryEmpty.getClientRects().length > 0 : false,
      sortableItems: document.querySelectorAll('[class*="sortableItem"]').length,
      imgsInGalleryRoot: galleryRoot ? galleryRoot.querySelectorAll('img').length : -1,
    };
  })()`);
  await shot('f2-step2-empty');
}

// ─────────────────────────────────────────────────────────────────────────────
// 기준 8·10 — /admin (표면 #4 이미지 4슬롯, #5 갤러리 썸네일)
// ─────────────────────────────────────────────────────────────────────────────
await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);
await page.locator('button', { hasText: 'Load' }).first().click();
await page.waitForTimeout(5000);

out.adminLoaded = await page.evaluate(`(() => {
  const els = [...document.querySelectorAll('[data-image-thumb]')];
  const si = document.querySelector('[class*="sortableItem"]');
  return {
    count: els.length,
    states: els.map((e) => e.dataset.state),
    sortableBg: si ? getComputedStyle(si).backgroundColor : null,
  };
})()`);
await shot('f2-admin-loaded');

// /admin 데모 레코드는 이미지 URL 이 죽어 있어(§7 R3 의 데이터 결함) 불러온 직후 4슬롯이 곧바로
// error 상태다 → 주입 대상 img 가 0개라 "loaded -> error" 전이를 잴 수 없다.
// 따라서 파일 선택으로 유효한 이미지를 하나 넣어 loaded 를 만든 뒤 주입한다(실사용 경로).
out.adminUpload = await (async () => {
  const input = page.locator('input[type=file]').first();
  await input.setInputFiles('fixtures/sample.png').catch(() => {});
  await page.waitForTimeout(2500);
  return page.evaluate(`(() => {
    const els = [...document.querySelectorAll('[data-image-thumb]')];
    return { states: els.map((e) => e.dataset.state), imgs: document.querySelectorAll('[data-image-thumb] img').length };
  })()`);
})();
await shot('f2-admin-uploaded');

{
  const n = await page.evaluate(INJECT_THUMB);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(THUMB_PROBE);
  out.criterion8 = {
    injected: n,
    ...after,
    allError: after.count > 0 && after.states.every((s) => s === 'error'),
    ok:
      n >= 1 &&
      after.imgs === 0 &&
      after.count > 0 &&
      after.states.every((s) => s === 'error') &&
      after.labelVisible,
  };
  await shot('f2-admin-error');
}

await emit(out, args);
await browser.close();

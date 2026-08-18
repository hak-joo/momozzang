// 뷰어 무회귀 baseline — 스프린트 계약 1 성공 기준 19~25.
// 변경 전/후 커밋에서 각각 실행해 JSON을 저장하고 `diff` 로 비교한다.
//
//   node viewer-baseline.mjs --out out/viewer-before.json
//   (구현 후) node viewer-baseline.mjs --out out/viewer-after.json
//   diff out/viewer-before.json out/viewer-after.json
//
// 출처: 세션 스크래치패드의 baseline-s1.mjs / baseline-s1b.mjs 를 통합·확장 이관(E14).
// 확장분: 탭 색상(E12) · Box 카드 metrics(E13) · 테마 스코프 실측(E6) · 방명록 시트 경로(E9)
//        · img src 집합 / 네트워크 URL 집합(E5).
import { loadChromium, parseArgs, emit, domHelpers } from './lib/pw.mjs';

const args = parseArgs();
const VIEWER = args.viewer || 'http://localhost:5176/';

const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

const requested = [];
const failed = [];
const pageErrors = [];
// 리소스 요청만 모은다. dev 서버의 모듈 요청(`/@fs/...tsx`, `/@vite/...`)은 **소스 파일이
// 하나만 늘어도 집합이 바뀌므로** 무회귀 diff에 쓸 수 없다(이번 스프린트는 신규 파일을 만든다).
// 무회귀 판정에 의미 있는 것은 이미지/폰트/미디어/네트워크 호출이다.
const ASSET_TYPES = new Set(['image', 'font', 'media', 'fetch', 'xhr']);
page.on('request', (r) => {
  if (ASSET_TYPES.has(r.resourceType())) requested.push(r.url());
});
page.on('requestfailed', (r) => failed.push(r.url()));
page.on('pageerror', (e) => pageErrors.push(String(e)));

await page.goto(VIEWER, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
// 인트로 스킵 (하단 CTA 영역 클릭)
await page.mouse.click(195, 700).catch(() => {});
await page.waitForTimeout(1500);

const out = {};

out.header = await page.evaluate(`(() => {
  ${domHelpers}
  const h = document.querySelector('header');
  if (!h) return null;
  const btns = [...h.querySelectorAll('button')];
  const cs = getComputedStyle(h);
  return {
    rect: rect(h),
    cs: pick(cs, ['position', 'top', 'left', 'width', 'zIndex']),
    firstTabX: btns[0] ? +btns[0].getBoundingClientRect().x.toFixed(2) : null,
    lastTabRight: btns.at(-1) ? +btns.at(-1).getBoundingClientRect().right.toFixed(2) : null,
    labels: btns.map((b) => b.textContent.trim()),
    // E12 / SPEC DoD 26 — 활성·비활성 탭 색상
    tabStyles: btns.map((b) => {
      const c = getComputedStyle(b);
      return {
        label: b.textContent.trim(),
        rect: rect(b),
        backgroundColor: c.backgroundColor,
        color: c.color,
        borderTopColor: c.borderTopColor,
        borderRightColor: c.borderRightColor,
        borderBottomColor: c.borderBottomColor,
        borderLeftColor: c.borderLeftColor,
        borderWidth: c.borderTopWidth + ' ' + c.borderRightWidth + ' ' + c.borderBottomWidth + ' ' + c.borderLeftWidth,
        boxShadow: c.boxShadow,
      };
    }),
  };
})()`);

// E13 / SPEC DoD 27 — 뷰어 전 섹션을 순회하며 Box 카드 metrics + 데코 + 이미지 집합을 수집
const sections = ['홈', '미니룸', '사진첩', '오시는 길', 'Info'];
out.sections = {};
for (const label of sections) {
  const btn = page.locator('header button', { hasText: label }).first();
  if ((await btn.count()) > 0) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(1200);
  }
  out.sections[label] = await page.evaluate(`(() => {
    ${domHelpers}
    // Box 카드 = Box.module.css 의 .board
    const boards = [...document.querySelectorAll('[class*="board"]')];
    return {
      boxCards: boards.map((el) => {
        const c = getComputedStyle(el);
        return {
          rect: rect(el),
          width: c.width,
          padding: c.paddingTop + ' ' + c.paddingRight + ' ' + c.paddingBottom + ' ' + c.paddingLeft,
          border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor,
          borderRadius: c.borderRadius,
          boxShadow: c.boxShadow,
          background: c.backgroundColor,
        };
      }),
      imgCount: document.querySelectorAll('img').length,
      docScrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  })()`);
}

// 스프링 데코레이터 (SPEC DoD 27)
out.decorator = await page.evaluate(`(() => {
  ${domHelpers}
  const deco = [...document.querySelectorAll('div')].find((d) => {
    const cs = getComputedStyle(d);
    return cs.backdropFilter && cs.backdropFilter.includes('blur(4px)') && parseFloat(cs.borderTopWidth) === 2;
  });
  if (!deco) return null;
  const c = getComputedStyle(deco);
  return { rect: rect(deco), cs: pick(c, ['width', 'height', 'borderTopWidth', 'boxSizing', 'borderRadius']) };
})()`);

out.mainWrapperMarginTop = await page.evaluate(`(() => {
  const mw = document.querySelector('[class*="mainWrapper"]');
  return mw ? getComputedStyle(mw).marginTop : null;
})()`);

// E5 — img 집합(DOM 기준) / data: 사용 여부 / 깨진 이미지
out.images = await page.evaluate(`(() => {
  const imgs = [...document.querySelectorAll('img')];
  return {
    total: imgs.length,
    // 주의(N4): 뷰어에는 Vite가 인라인한 번들 PNG data URI가 이미 20개 있다.
    // 시드 유입 검사는 반드시 svg+xml 접두사로 해야 판별력이 있다(기준 19a).
    dataUriCount: imgs.filter((i) => i.src.startsWith('data:')).length,
    dataUriSvgCount: imgs.filter((i) => i.src.startsWith('data:image/svg+xml')).length,
    broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src).sort(),
    // data: URI 원문은 수십 KB라 diff를 못 읽게 만든다. 미디어타입 + 길이로 축약해도
    // 개수·종류·크기 변화는 그대로 잡힌다.
    srcSet: [...new Set(imgs.map((i) => i.src))]
      .map((s) => (s.startsWith('data:') ? s.slice(0, s.indexOf(',') + 1) + '<len:' + s.length + '>' : s))
      .sort(),
  };
})()`);

// E6 — 테마 스코프: 뷰어에서는 :root 기본 팔레트가 body에 그대로 계산돼야 한다
out.theme = await page.evaluate(`(() => ({
  bodyMain300: getComputedStyle(document.body).getPropertyValue('--color-main-300').trim(),
  bodyShadowMain: getComputedStyle(document.body).getPropertyValue('--box-shadow-main').trim(),
}))()`);

// E9 — 방명록: Info 탭 → "방명록 남기기" 클릭 → 열린 시트의 입력 필드 측정
{
  const info = page.locator('header button', { hasText: 'Info' }).first();
  if ((await info.count()) > 0) {
    await info.click().catch(() => {});
    await page.waitForTimeout(1200);
  }
  // 실측 확인된 경로는 2단계다(E9 정정):
  //   Info → "방명록 남기기" → [미니미 선택 시트] 미니미 1개 클릭 → "미니미로 방명록 남기기" → 입력 폼
  // 첫 시트에서 바로 input/textarea를 찾으면 0개가 나온다.
  const open = page.getByRole('button', { name: /방명록 남기기/ }).first();
  out.guestBook = { buttonFound: (await open.count()) > 0 };
  if (out.guestBook.buttonFound) {
    await open.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1800);
    const mini = page.locator('[class*="miniButton"]').first();
    out.guestBook.miniPickerFound = (await mini.count()) > 0;
    await mini.click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);
    await page
      .getByRole('button', { name: '미니미로 방명록 남기기' })
      .click({ force: true })
      .catch(() => {});
    await page.waitForTimeout(1800);
    out.guestBook.fields = await page.evaluate(`(() => {
      const els = [...document.querySelectorAll('input, textarea')];
      return els.map((el) => {
        const c = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type') || '',
          placeholder: el.getAttribute('placeholder') || '',
          backgroundColor: c.backgroundColor,
          borderRadius: c.borderRadius,
          fontSize: c.fontSize,
          border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor,
        };
      });
    })()`);
  }
}

// 타임스탬프 쿼리는 매 실행 달라지므로 정규화한다(제외가 아니라 정규화 — 요청 존재 자체는 남긴다).
const normalize = (u) => u.replace(/([?&](?:t|v|time|_)=)\d{6,}/g, '$1<ts>');
// 네이버 지도 타일/텔레메트리는 지도 뷰포트에 따라 타일 좌표가 달라져 집합 diff를 못 쓴다.
// 이번 스프린트와 무관하므로 집합에서 빼고 **호스트별 건수만** 남긴다.
const VOLATILE_HOSTS = /(naver\.net|navercorp\.com|map\.naver\.com)/;
const hostCount = (urls) => {
  const m = {};
  for (const u of urls) {
    if (!VOLATILE_HOSTS.test(u)) continue;
    try {
      const h = new URL(u).host;
      m[h] = (m[h] || 0) + 1;
    } catch {}
  }
  return m;
};

out.network = {
  // E5 — 리소스 요청 URL 집합 diff 용
  requestedSet: [...new Set(requested.map(normalize))]
    .filter((u) => !u.startsWith('data:') && !VOLATILE_HOSTS.test(u))
    .sort(),
  failedSet: [...new Set(failed.map(normalize))].filter((u) => !VOLATILE_HOSTS.test(u)).sort(),
  // 변동 호스트는 건수만 (지도 타일 수는 흔들릴 수 있으므로 참고값)
  volatileHostCounts: hostCount(requested),
  volatileHostFailedCounts: hostCount(failed),
};
out.pageErrors = pageErrors;

await ctx.close();
await browser.close();
await emit(out, args);

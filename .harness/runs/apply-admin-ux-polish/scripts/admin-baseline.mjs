// `/admin` · `/apply` 어드민 크롬 baseline — 스프린트 계약 2 (F5 · F7 · F9).
// 구현 전/후 각각 실행해 JSON 을 남기고 계약 §3 성공 기준의 기대값과 대조한다.
//
//   node admin-baseline.mjs --out out/admin-before.json
//   (구현 후) node admin-baseline.mjs --out out/admin-after.json
//   diff out/admin-before.json out/admin-after.json
//
// viewer-baseline.mjs 와 달리 이 스크립트는 **무회귀 diff 용이 아니라 기대값 대조용**이다.
// (뷰어 무회귀 관문은 viewer-baseline.mjs 가 그대로 담당한다.)
import { loadChromium, parseArgs, emit, domHelpers } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const SLUG = args.slug || 'demo-captain-luna';

// ── 브라우저에 주입되는 공통 측정 헬퍼 ────────────────────────────────
// WCAG 2.x 상대휘도 + 대비비. 배경은 조상을 거슬러 올라가 alpha>0 인 첫 배경색을 쓴다.
const measureHelpers = `
  ${domHelpers}
  const parseRGB = (s) => {
    const m = String(s).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map((v) => parseFloat(v.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const effectiveBg = (el) => {
    let node = el;
    while (node && node !== document.documentElement) {
      const c = parseRGB(getComputedStyle(node).backgroundColor);
      if (c && c.a > 0.99) return getComputedStyle(node).backgroundColor;
      node = node.parentElement;
    }
    return getComputedStyle(document.documentElement).backgroundColor;
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  // 전경색이 반투명이면 배경 위에 합성한 뒤 계산한다(WCAG 권고).
  const composite = (fg, bg) => (fg.a >= 1 ? fg : {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const contrast = (fgStr, bgStr) => {
    const bg = parseRGB(bgStr); const fgRaw = parseRGB(fgStr);
    if (!bg || !fgRaw) return null;
    const fg = composite(fgRaw, bg);
    const L1 = lum(fg), L2 = lum(bg);
    return +(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05))).toFixed(2);
  };
  // 보더 색 대비(보더가 배경과 구분되는가 — SPEC DoD 17 후반부).
  const borderContrast = (el, pageBgStr) => {
    const cs = getComputedStyle(el);
    if (cs.borderTopStyle === 'none' || parseFloat(cs.borderTopWidth) === 0) return null;
    return contrast(cs.borderTopColor, pageBgStr);
  };
  const controlCS = (el) => {
    const c = getComputedStyle(el);
    return {
      backgroundColor: c.backgroundColor,
      color: c.color,
      borderRadius: c.borderTopLeftRadius,
      fontSize: c.fontSize,
      fontFamily: c.fontFamily.split(',')[0].replace(/["']/g, ''),
      border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor,
      padding: c.paddingTop + ' ' + c.paddingRight + ' ' + c.paddingBottom + ' ' + c.paddingLeft,
      outline: c.outlineWidth + ' ' + c.outlineStyle + ' ' + c.outlineColor,
      outlineOffset: c.outlineOffset,
      boxShadow: c.boxShadow,
      display: c.display,
    };
  };
  const describe = (el) => {
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || null,
      id: el.id || null,
      name: el.getAttribute('name') || null,
      cls: [...el.classList].map((c) => c.replace(/_[A-Za-z0-9]{5,}$/, '').replace(/^_/, '')).join(' '),
      text: (el.textContent || '').trim().slice(0, 30),
      placeholder: el.getAttribute('placeholder') || null,
    };
  };
  const FORM_SEL = 'input, textarea, select';
`;

// 화면에 실제로 보이는 텍스트만 모아 영문 토큰을 뽑는다(DoD 18 / F9 측정식).
// 고유명사 화이트리스트는 계약 §3 기준 F9 에 그대로 적힌 것과 동일해야 한다.
// **폰 미리보기(`.screen`) 내부는 뷰어 콘텐츠**이므로 어드민 UI 문구가 아니다 → 제외한다.
const englishScan = `
  (() => {
    // 평가자 권고 1: 'ok' · 'no' 는 실제 영문 UI 문구(OK / No)를 통과시키므로 화이트리스트에서 뺐다.
    const WHITELIST = new Set(['momozzang','kakao','url','id','og','api','svg','png','jpg','jpeg','webp']);
    const inPreview = (el) => !!(el && el.closest && el.closest('[class*="screen"]'));
    const visible = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
      return el.getClientRects().length > 0;
    };
    const chunks = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      const t = (n.nodeValue || '').trim();
      if (!t) continue;
      if (!visible(n.parentElement)) continue;
      if (inPreview(n.parentElement)) continue;
      chunks.push(t);
    }
    // placeholder / aria-label / title / alt 도 사용자가 읽는 UI 문구다.
    for (const el of document.querySelectorAll('[placeholder],[aria-label],[title]')) {
      if (!visible(el) || inPreview(el)) continue;
      for (const a of ['placeholder', 'aria-label', 'title']) {
        const v = el.getAttribute(a);
        if (v && v.trim()) chunks.push(v.trim());
      }
    }
    const hits = [];
    for (const t of chunks) {
      const words = t.match(/[A-Za-z][A-Za-z'’]+/g) || [];
      const bad = words.filter((w) => !WHITELIST.has(w.toLowerCase()));
      if (bad.length > 0) hits.push({ text: t.slice(0, 80), words: bad });
    }
    return hits;
  })()
`;

const chromium = await loadChromium();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const dialogs = [];
page.on('dialog', (d) => {
  dialogs.push({ type: d.type(), message: d.message() });
  d.dismiss().catch(() => {});
});

const out = { meta: { admin: ADMIN, slug: SLUG, viewport: '1440x900', at: new Date().toISOString() } };

// ══════════════════════════ /admin ══════════════════════════
await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(4000); // 데모 레코드 로드 대기

out.admin = await page.evaluate(`(() => {
  ${measureHelpers}
  const body = getComputedStyle(document.body);
  const container = document.querySelector('[class*="container"]');
  const pageBg = effectiveBg(container || document.body);

  // C-1 (1) — 경계 요소가 실제로 몇 개인가
  const all = container ? [...container.querySelectorAll('*')] : [];
  const withBorder = all.filter((el) => {
    const c = getComputedStyle(el);
    return c.borderTopStyle !== 'none' && parseFloat(c.borderTopWidth) > 0;
  });
  const withShadow = all.filter((el) => getComputedStyle(el).boxShadow !== 'none');

  // C-1 (4) — 카드 폭. 구현 전에는 Box 의 .board, 구현 후에는 Panel([data-admin-panel]).
  // **합집합으로 조회한다** — 한쪽만 보면 교체 후 0개가 되어 기준이 공허하게 통과한다(계약 §6 R5).
  const boards = [...document.querySelectorAll('[class*="board"], [data-admin-panel]')];
  const cards = boards.map((el) => {
    const c = getComputedStyle(el);
    const w = el.parentElement;
    return {
      title: (el.querySelector('h1,h2,h3,h4') || {}).textContent?.trim() || null,
      rect: rect(el),
      backgroundColor: c.backgroundColor,
      border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor,
      borderRadius: c.borderTopLeftRadius,
      boxShadow: c.boxShadow,
      padding: c.paddingTop + ' ' + c.paddingRight + ' ' + c.paddingBottom + ' ' + c.paddingLeft,
      alignItems: c.alignItems,
      borderContrastVsPageBg: borderContrast(el, pageBg),
      wrapperDisplay: w ? getComputedStyle(w).display : null,
      wrapperRect: rect(w),
    };
  });

  // 섹션 제목 정렬(A8). textAlign 은 전부 'start' 라 판별력이 없다 —
  // 실제 어긋남은 Box.board{align-items:center} 때문이므로 **카드 좌측으로부터의 오프셋**을 잰다.
  const headings = [...document.querySelectorAll('h1,h2,h3,h4')].map((el) => {
    const c = getComputedStyle(el);
    const card = el.parentElement && el.parentElement.closest('[class*="board"],[class*="panel"],[class*="section"]');
    return {
      text: el.textContent.trim().slice(0, 40),
      textAlign: c.textAlign,
      rectX: rect(el)[0],
      offsetInCard: card ? +(rect(el)[0] - rect(card)[0]).toFixed(2) : null,
      fontSize: c.fontSize,
      fontFamily: c.fontFamily.split(',')[0].replace(/["']/g, ''),
    };
  });

  // 라벨 대비(A2 / DoD 17 전반부)
  const labels = [...document.querySelectorAll('label')].map((el) => {
    const c = getComputedStyle(el);
    const bg = effectiveBg(el);
    return {
      text: el.textContent.trim().slice(0, 30),
      htmlFor: el.getAttribute('for'),
      color: c.color,
      bg,
      contrast: contrast(c.color, bg),
    };
  });

  // 버튼(A7 · A9)
  const buttons = [...document.querySelectorAll('button')].map((el) => {
    const c = getComputedStyle(el);
    return {
      text: el.textContent.trim().slice(0, 24),
      rect: rect(el),
      backgroundColor: c.backgroundColor,
      // A9 검증: backgroundColor 만 보면 'transparent' 로 보이지만 실제 면은
      // backgroundImage(gradient)로 그려질 수 있다. 둘 다 기록한다.
      backgroundImage: c.backgroundImage.slice(0, 140),
      border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor,
      borderRadius: c.borderTopLeftRadius,
      boxShadow: c.boxShadow,
      color: c.color,
      hasVisibleSurface:
        c.backgroundImage !== 'none' ||
        (parseRGB(c.backgroundColor) || { a: 0 }).a > 0.05 ||
        (c.borderTopStyle !== 'none' && parseFloat(c.borderTopWidth) > 0),
    };
  });

  // 폼 컨트롤 인벤토리(A1 · A3 · A4 / DoD 12·13·22)
  const controls = [...document.querySelectorAll(FORM_SEL)].map((el) => ({
    ...describe(el),
    hasLabelFor: !!(el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')),
    ariaLabel: el.getAttribute('aria-label'),
    wrappedByLabel: !!el.closest('label'),
    cs: controlCS(el),
    rect: rect(el),
  }));

  const fileInputs = controls.filter((c) => c.type === 'file');

  return {
    tokens: {
      colorShadow100: body.getPropertyValue('--color-shadow-100').trim(),
      colorShadow200: body.getPropertyValue('--color-shadow-200').trim(),
      boxShadowMain: body.getPropertyValue('--box-shadow-main').trim(),
      boxShadowSub: body.getPropertyValue('--box-shadow-sub').trim(),
      colorMain300: body.getPropertyValue('--color-main-300').trim(),
      colorLine200: body.getPropertyValue('--color-line-200').trim(),
      colorLine500: body.getPropertyValue('--color-line-500').trim(),
      colorBg100: body.getPropertyValue('--color-bg-100').trim(),
      adminSurfaceShadow: body.getPropertyValue('--admin-surface-shadow').trim(),
      adminSurfaceBorder: body.getPropertyValue('--admin-surface-border').trim(),
      adminControlRadius: body.getPropertyValue('--admin-control-radius').trim(),
      adminControlBg: body.getPropertyValue('--admin-control-bg').trim(),
      adminControlColor: body.getPropertyValue('--admin-control-color').trim(),
    },
    pageBg,
    bodyBg: body.backgroundColor,
    containerRect: rect(container),
    headerBorderBottom: (() => {
      const h = document.querySelector('header');
      if (!h) return null;
      const c = getComputedStyle(h);
      return c.borderBottomWidth + ' ' + c.borderBottomStyle + ' ' + c.borderBottomColor;
    })(),
    boundaryCensus: { total: all.length, withBorder: withBorder.length, withShadow: withShadow.length },
    cards,
    cardWidths: cards.map((c) => (c.rect ? c.rect[2] : null)),
    cardWidthsDistinct: [...new Set(cards.map((c) => (c.rect ? c.rect[2] : null)))],
    headings,
    labels,
    labelContrastMin: labels.length ? Math.min(...labels.map((l) => l.contrast ?? 99)) : null,
    buttons,
    controls,
    controlCount: controls.length,
    controlsWithId: controls.filter((c) => c.id).length,
    controlsWithLabelFor: controls.filter((c) => c.hasLabelFor).length,
    fileInputCount: fileInputs.length,
    fileInputsVisible: fileInputs.filter((f) => f.cs.display !== 'none' && f.rect && f.rect[2] > 0).length,
    // 기준 14 — "슬러그 입력 + 불러오기 + 저장"이 한 행에 묶여 있는가.
    // 텍스트로 찾되 한국어화 전/후 양쪽 라벨을 모두 시도한다.
    // 평가자 권고 2: 슬러그 입력까지 측정에 넣는다(§1.1-B 의 약속이 "세 요소 한 행"이므로).
    // 다만 세 요소의 **높이가 다르면 rect.y 는 완벽히 정렬돼도 어긋난다**. 그래서 행 정렬은
    // rect.y 가 아니라 **세로 중심(y + height/2)**의 최대-최소로 잰다(rowDeltaY).
    primaryActions: (() => {
      const find = (names) =>
        [...document.querySelectorAll('button')].find((b) =>
          names.some((n) => b.textContent.trim().toLowerCase().includes(n)),
        ) || null;
      const load = find(['load', '불러오기']);
      const save = find(['save', '저장']);
      // 슬러그 입력 = 문서 내 첫 번째 텍스트성 input(file/hidden/checkbox/radio 제외).
      const slug =
        [...document.querySelectorAll('input')].find(
          (el) => !['file', 'hidden', 'checkbox', 'radio'].includes(el.type || ''),
        ) || null;
      if (!load || !save) return { found: false, load: !!load, save: !!save, slug: !!slug };
      const lr = rect(load), sr = rect(save), gr = rect(slug);
      const mid = (r) => (r ? r[1] + r[3] / 2 : null);
      const centers = [lr, sr, gr].filter(Boolean).map(mid);
      const tb = (el) => (el ? el.closest('[data-admin-toolbar]') : null);
      return {
        found: true,
        slugFound: !!slug,
        loadRect: lr,
        saveRect: sr,
        slugRect: gr,
        deltaY: +Math.abs(lr[1] - sr[1]).toFixed(2),
        rowDeltaY: +(Math.max(...centers) - Math.min(...centers)).toFixed(2),
        sameToolbar:
          !!tb(load) && tb(load) === tb(save) && !!slug && tb(load) === tb(slug),
      };
    })(),
    // 기준 15 — 카드 안 카드(중첩 표면)
    nestedCardCount: document.querySelectorAll(
      '[class*="board"] [class*="board"], [data-admin-panel] [data-admin-panel], [data-admin-panel] [class*="board"]',
    ).length,
  };
})()`);

out.admin.english = await page.evaluate(englishScan);
out.admin.englishHitCount = out.admin.english.length;

// 키보드 Tab 순회 — 포커스 가시성(DoD 13). 각 스텝의 activeElement 를 기록한다.
out.admin.focus = await focusProbe(page, '[class*="container"]');

// 갤러리 삭제의 네이티브 confirm(N2 / DoD 24 경계 확인 — 이번 스프린트는 "문구만" 대상)
const delBtn = page.locator('[class*="deleteButton"]').first();
if ((await delBtn.count()) > 0) {
  await delBtn.scrollIntoViewIfNeeded().catch(() => {});
  await delBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(600);
}
out.admin.nativeDialogs = dialogs.slice();

// ══════════════════════════ /apply ══════════════════════════
dialogs.length = 0;
await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);

const applyStep = async () =>
  page.evaluate(`(() => {
    ${measureHelpers}
    const body = getComputedStyle(document.body);
    const root = document.querySelector('[class*="page"]') || document.body;
    const pageBg = effectiveBg(root);

    // /apply 의 카드는 ApplyForm/ImageStep 의 .section 이다.
    const sections = [...document.querySelectorAll('[class*="section"]')].filter(
      (el) => getComputedStyle(el).borderTopStyle !== 'none',
    );
    const cards = sections.map((el) => {
      const c = getComputedStyle(el);
      return {
        title: (el.querySelector('h1,h2,h3,h4') || {}).textContent?.trim() || null,
        rect: rect(el),
        backgroundColor: c.backgroundColor,
        border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor,
        borderRadius: c.borderTopLeftRadius,
        boxShadow: c.boxShadow,
        padding: c.paddingTop + ' ' + c.paddingRight + ' ' + c.paddingBottom + ' ' + c.paddingLeft,
        borderContrastVsPageBg: borderContrast(el, pageBg),
        // 이 카드 안 컨트롤들의 시각 언어가 몇 종인가(DoD 12 의 직접 측정)
        // 제외 집합은 **기준 4의 f5Total 과 정확히 같다**(hidden/file/checkbox/radio).
        // radio 제외 근거(평가자 M1): 네이티브 라디오는 borderRadius/backgroundColor/fontSize
        // 동일성을 논할 수 있는 위젯이 아니고 DoD 12 의 열거("입력·텍스트영역·셀렉트·날짜")에도 없다.
        controls: [...el.querySelectorAll(FORM_SEL)]
          .filter((n) => !['hidden', 'file', 'checkbox', 'radio'].includes(n.type || ''))
          .map((n) => ({ ...describe(n), cs: controlCS(n) })),
      };
    });
    for (const card of cards) {
      card.distinct = {
        borderRadius: [...new Set(card.controls.map((c) => c.cs.borderRadius))],
        fontSize: [...new Set(card.controls.map((c) => c.cs.fontSize))],
        backgroundColor: [...new Set(card.controls.map((c) => c.cs.backgroundColor))],
        border: [...new Set(card.controls.map((c) => c.cs.border))],
      };
      // S3(QA_FINDINGS_2 §10-6 / N3): **측정 대상 컨트롤이 0개인 카드는 판정에서 제외**한다.
      // 0개 카드는 distinct 가 모두 빈 배열이라 항상 "단일 언어"로 통과해 공허한 합격을 만든다.
      card.measurable = card.controls.length >= 1;
      card.isSingleLanguage =
        card.measurable &&
        card.distinct.borderRadius.length <= 1 &&
        card.distinct.fontSize.length <= 1 &&
        card.distinct.backgroundColor.length <= 1;
    }

    const allControls = [...document.querySelectorAll(FORM_SEL)].map((el) => ({
      ...describe(el),
      hasLabelFor: !!(el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]')),
      ariaLabel: el.getAttribute('aria-label'),
      wrappedByLabel: !!el.closest('label'),
      cs: controlCS(el),
    }));
    const fileInputs = allControls.filter((c) => c.type === 'file');

    return {
      pageBg,
      bodyBg: body.backgroundColor,
      tokens: {
        boxShadowMain: body.getPropertyValue('--box-shadow-main').trim(),
        colorMain300: body.getPropertyValue('--color-main-300').trim(),
      },
      cards: cards.map((c) => ({ ...c, controls: c.controls.length })),
      cardsDetail: cards,
      cardsSingleLanguage: cards.filter((c) => c.isSingleLanguage).length,
      // S3(N3): 합격식의 분모. cardsSingleLanguage === cardsMeasurable 로 판정한다.
      cardsMeasurable: cards.filter((c) => c.measurable).length,
      cardsWithoutControls: cards.filter((c) => !c.measurable).map((c) => c.title),
      cardsTotal: cards.length,
      // 기준 15 — .section 안에 또 하나의 카드 표면이 있는가(GalleryManager 의 Box).
      // **반드시 formPane 스코프로 잰다** — 폰 미리보기 안의 뷰어에도 SectionContainer 와
      // Box .board 가 있어 document 스코프로 재면 미리보기가 그대로 섞여 들어온다(실측 3~4건).
      nestedCardCount: document.querySelectorAll(
        '[class*="formPane"] [class*="section"] [class*="board"], [class*="formPane"] [class*="section"] [data-admin-panel]',
      ).length,
      controlCount: allControls.length,
      controlsWithId: allControls.filter((c) => c.id).length,
      controlsWithLabelFor: allControls.filter((c) => c.hasLabelFor).length,
      controlsWithoutAccessibleName: allControls.filter(
        (c) => !c.hasLabelFor && !c.ariaLabel && !c.wrappedByLabel,
      ).length,
      fileInputCount: fileInputs.length,
      fileInputsVisible: fileInputs.filter((f) => f.cs.display !== 'none').length,
      // 컨트롤 종류별 대표 computed(두 화면 대조용)
      byKind: (() => {
        const kinds = {};
        for (const c of allControls) {
          const key = c.tag + (c.type ? ':' + c.type : '');
          if (!kinds[key]) kinds[key] = c.cs;
        }
        return kinds;
      })(),
    };
  })()`);

out.apply = { step1: await applyStep() };
out.apply.step1.english = await page.evaluate(englishScan);
out.apply.step1.focus = await focusProbe(page, '[class*="formPane"]');

// 스텝② 이동
const next = page.locator('button', { hasText: '다음' }).first();
if ((await next.count()) > 0) {
  await next.click().catch(() => {});
  await page.waitForTimeout(2500);
  out.apply.step2 = await applyStep();
  out.apply.step2.english = await page.evaluate(englishScan);
  out.apply.step2.focus = await focusProbe(page, '[class*="formPane"]');
}
out.apply.nativeDialogs = dialogs.slice();

// 기준 3 — 테마 팔레트 내성. `--color-sub-100` / `--color-main-600` 을 강제로 바꿔도
// 어드민 폼 컨트롤의 배경·글자색이 흔들리지 않아야 한다(SPEC §1.4 "테마 무관 중립").
// 스텝① 로 되돌아가 측정한다(스텝② 는 컨트롤 수가 적다).
await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(3000);
out.apply.themeImmunity = await page.evaluate(`(() => {
  ${measureHelpers}
  const pane = document.querySelector('[class*="formPane"]');
  if (!pane) return { error: 'formPane not found' };
  const F5 = (el) => !['file', 'checkbox', 'radio', 'hidden'].includes(el.type || '');
  const els = [...pane.querySelectorAll(FORM_SEL)].filter(F5).slice(0, 40);
  const snap = () => els.map((el) => getComputedStyle(el).backgroundColor + '|' + getComputedStyle(el).color);
  const before = snap();
  const root = document.documentElement;
  root.style.setProperty('--color-sub-100', '#ff0000');
  root.style.setProperty('--color-main-600', '#ff0000');
  const after = snap();
  root.style.removeProperty('--color-sub-100');
  root.style.removeProperty('--color-main-600');
  const changed = before.filter((v, i) => v !== after[i]).length;
  return { sampled: els.length, changedByThemeInjection: changed, sampleBefore: before[0], sampleAfter: after[0] };
})()`);


await browser.close();
await emit(out, args);

// ── 포커스 가시성 측정 (DoD 13) ──────────────────────────────────────
// `:focus-visible` 은 "키보드 모달리티"에서만 매칭된다. 그래서 (1) Tab 을 한 번 눌러
// 키보드 모달리티를 세운 뒤 (2) 각 컨트롤에 `.focus()` 를 걸어 computed 를 읽는다.
// 이 방식이 Chromium 에서 `matches(':focus-visible') === true` 를 재현함을 실측 확인했다
// (blind Tab 순회는 미리보기 프레임 내부 버튼에 막혀 폼 컨트롤에 도달하지 못한다).
async function focusProbe(pageRef, scopeSel) {
  await pageRef.evaluate('window.scrollTo(0,0);');
  await pageRef.keyboard.press('Tab'); // 키보드 모달리티 확립
  await pageRef.waitForTimeout(150);
  return pageRef.evaluate(`(() => {
    ${measureHelpers}
    const scope = ${JSON.stringify(scopeSel)} ? document.querySelector(${JSON.stringify(scopeSel)}) : document.body;
    if (!scope) return { error: 'scope not found', scopeSel: ${JSON.stringify(scopeSel)} };
    // 미리보기(.screen) 내부는 뷰어 콘텐츠 — F5 대상이 아니다.
    const els = [...scope.querySelectorAll(FORM_SEL)].filter(
      (el) => !el.closest('[class*="screen"]') && el.type !== 'hidden',
    );
    const snap = (el) => {
      const c = getComputedStyle(el);
      return {
        outlineStyle: c.outlineStyle,
        outlineWidth: c.outlineWidth,
        outlineColor: c.outlineColor,
        outlineOffset: c.outlineOffset,
        boxShadow: c.boxShadow,
        borderTopColor: c.borderTopColor,
        backgroundColor: c.backgroundColor,
      };
    };
    const rows = els.map((el) => {
      const before = snap(el);
      el.focus();
      const after = snap(el);
      const fv = el.matches(':focus-visible');
      el.blur();
      // 합격 규칙(계약 §3): Button 의 :focus-visible 규칙과 동일한 3px 아웃라인 + offset 2px.
      const hasButtonRule =
        after.outlineStyle === 'solid' &&
        Math.round(parseFloat(after.outlineWidth)) === 3 &&
        after.outlineOffset === '2px';
      return {
        ...describe(el),
        focusVisibleMatched: fv,
        before,
        after,
        changed: JSON.stringify(before) !== JSON.stringify(after),
        hasButtonRule,
      };
    });
    // 종류별 대표 1개만 남긴 요약(계약 본문에 옮겨 적기 위한 것)
    const byKind = {};
    for (const r of rows) {
      const key = r.tag + (r.type ? ':' + r.type : '') + '|' + (r.cls.split(' ')[0] || '');
      if (!byKind[key]) byKind[key] = { focusVisibleMatched: r.focusVisibleMatched, before: r.before, after: r.after, changed: r.changed, hasButtonRule: r.hasButtonRule, count: 0 };
      byKind[key].count += 1;
    }
    // F5 대상 집합: file/checkbox/radio 제외(각각 F6·별도 컴포넌트 소관).
    const f5 = rows.filter((r) => !['file', 'checkbox', 'radio'].includes(r.type || ''));
    return {
      total: rows.length,
      f5Total: f5.length,
      f5WithButtonRule: f5.filter((r) => r.hasButtonRule).length,
      // S3(QA_FINDINGS_2 §3.A / §10-2): 구정의 !changed 는 **첫 Tab 착지점이 측정 대상 자신**일 때
      // before 스냅샷이 이미 포커스 상태가 되어 거짓 양성을 만든다(스프린트 2 /admin 실측 1).
      // 신정의는 "포커스된 상태 자체에 단서가 없는가"만 보므로 착지점과 무관하다.
      f5WithoutAnyCue: f5.filter(
        (r) => !r.hasButtonRule && r.after.outlineStyle === 'none' && r.after.boxShadow === 'none',
      ).length,
      // 구정의도 대조용으로 남긴다(판정에는 쓰지 않는다).
      f5WithoutAnyCue_legacyDef: f5.filter((r) => !r.changed).length,
      byKind,
    };
  })()`);
}

// 스프린트 3 계약 작성용 **탐색 probe** (계약 확정 후에는 s3-baseline.mjs / s3-func.mjs 가 대체한다).
// 목적 2가지:
//   (1) F4/F6/F8/N1 의 §0 baseline 실측값 수집
//   (2) **Playwright DataTransfer 드롭 시뮬레이션이 이 환경에서 실제로 동작하는지 1회 검증**
import { loadChromium, parseArgs, emit } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const SLUG = args.slug || 'demo-captain-luna';

// ── 브라우저에 주입되는 접근 가능한 이름 계산기(HTML-AAM 부분집합) ──
const A11Y = `
  const txt = (el) => (el ? String(el.textContent || '').replace(/\\s+/g, ' ').trim() : '');
  const accName = (el) => {
    const al = (el.getAttribute('aria-label') || '').trim();
    if (al) return { name: al, from: 'aria-label' };
    const lb = (el.getAttribute('aria-labelledby') || '').trim();
    if (lb) {
      const s = lb.split(/\\s+/).map((id) => txt(document.getElementById(id))).filter(Boolean).join(' ');
      if (s) return { name: s, from: 'aria-labelledby' };
    }
    if (el.id) {
      const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (l && txt(l)) return { name: txt(l), from: 'label[for]' };
    }
    const p = el.closest('label');
    if (p && txt(p)) return { name: txt(p), from: 'label-wrap' };
    const ti = (el.getAttribute('title') || '').trim();
    if (ti) return { name: ti, from: 'title' };
    const ph = (el.getAttribute('placeholder') || '').trim();
    if (ph) return { name: ph, from: 'placeholder(약한 근거)' };
    return { name: '', from: null };
  };
  const isFormControl = (el) => {
    const t = el.tagName.toLowerCase();
    if (t === 'textarea' || t === 'select') return true;
    if (t !== 'input') return false;
    return (el.type || 'text') !== 'hidden';
  };
  const controlKind = (el) => {
    const t = el.tagName.toLowerCase();
    return t === 'input' ? 'input:' + (el.type || 'text') : t;
  };
  const rect2 = (el) => { const b = el.getBoundingClientRect();
    return [+b.x.toFixed(2), +b.y.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)]; };
  const visible = (el) => {
    const c = getComputedStyle(el);
    if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) === 0) return false;
    const b = el.getBoundingClientRect();
    return b.width > 1 && b.height > 1;
  };
`;

const chromium = await loadChromium();
const browser = await chromium.launch();
const out = { meta: { admin: ADMIN, slug: SLUG, at: new Date().toISOString() } };

// ════════════ (1) /apply 스텝① · 스텝② ════════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // ── F4: 1440 상단바 ──
  out.f4_1440 = await page.evaluate(`(() => {
    ${A11Y}
    const topbar = document.querySelector('header[class*="topbar"]');
    const stepper = document.querySelector('nav[class*="stepper"]');
    const nav = document.querySelector('[class*="stepNav"]');
    const pane = document.querySelector('[class*="previewPane"]');
    const frame = document.querySelector('[class*="frame"]');
    return {
      topbarRect: topbar ? rect2(topbar) : null,
      topbarHeight: topbar ? +topbar.getBoundingClientRect().height.toFixed(2) : null,
      stepperRect: stepper ? rect2(stepper) : null,
      stepNavRect: nav ? rect2(nav) : null,
      deltaY: stepper && nav ? +(nav.getBoundingClientRect().y - stepper.getBoundingClientRect().y).toFixed(2) : null,
      sameRow: stepper && nav
        ? Math.abs((nav.getBoundingClientRect().y + nav.getBoundingClientRect().height / 2)
                 - (stepper.getBoundingClientRect().y + stepper.getBoundingClientRect().height / 2)) <= 1
        : null,
      stepperWidth: stepper ? +stepper.getBoundingClientRect().width.toFixed(2) : null,
      previewPaneStickyTop: pane ? getComputedStyle(pane).top : null,
      frameRect: frame ? rect2(frame) : null,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  })()`);

  // ── F4: 스크롤 후 프레임이 상단바에 가리는가 ──
  await page.evaluate(`window.scrollTo(0, 800)`);
  await page.waitForTimeout(600);
  out.f4_scrolled = await page.evaluate(`(() => {
    ${A11Y}
    const topbar = document.querySelector('header[class*="topbar"]');
    const frame = document.querySelector('[class*="frame"]');
    if (!topbar || !frame) return null;
    const tb = topbar.getBoundingClientRect(), fr = frame.getBoundingClientRect();
    return {
      topbarBottom: +tb.bottom.toFixed(2), frameTop: +fr.top.toFixed(2),
      overlapPx: +Math.max(0, tb.bottom - fr.top).toFixed(2),
      scrollY: window.scrollY,
    };
  })()`);
  await page.evaluate(`window.scrollTo(0, 0)`);
  await page.waitForTimeout(400);

  // ── F8: 스텝① 컨트롤 접근 가능한 이름 ──
  out.step1_a11y = await page.evaluate(`(() => {
    ${A11Y}
    const root = document.querySelector('[class*="formPane"]') || document;
    const ctrls = [...root.querySelectorAll('input, textarea, select')].filter(isFormControl);
    const rows = ctrls.map((el) => {
      const a = accName(el);
      return { kind: controlKind(el), id: el.id || null, name: a.name, from: a.from,
               required: el.required, ariaRequired: el.getAttribute('aria-required') };
    });
    const strong = (r) => r.from && r.from !== 'placeholder(약한 근거)';
    return {
      total: rows.length,
      withStrongName: rows.filter(strong).length,
      withoutStrongName: rows.filter((r) => !strong(r)).length,
      withAnyName: rows.filter((r) => !!r.name).length,
      withoutAnyName: rows.filter((r) => !r.name).length,
      labelForCount: document.querySelectorAll('label[for]').length,
      ariaRequiredCount: rows.filter((r) => r.ariaRequired === 'true').length,
      requiredAttrCount: rows.filter((r) => r.required).length,
      missing: rows.filter((r) => !strong(r)).slice(0, 40),
      byKind: rows.reduce((m, r) => ((m[r.kind] = (m[r.kind] || 0) + 1), m), {}),
    };
  })()`);

  // ── 필수 필드 5종의 라벨 텍스트에 필수 표식이 있는가 ──
  out.step1_required = await page.evaluate(`(() => {
    ${A11Y}
    const IDS = ['apply-slug','apply-title','apply-groom-name','apply-bride-name','apply-date','apply-hour','apply-minute'];
    return IDS.map((id) => {
      const el = document.getElementById(id);
      if (!el) return { id, found: false };
      const l = document.querySelector('label[for="' + CSS.escape(id) + '"]');
      return { id, found: true, labelText: txt(l), ariaRequired: el.getAttribute('aria-required'), required: el.required };
    });
  })()`);
  // 후보 id 를 못 찾으면 전체 id 목록을 덤프한다.
  out.step1_allIds = await page.evaluate(
    `[...document.querySelectorAll('[class*="formPane"] input, [class*="formPane"] textarea, [class*="formPane"] select')].map((e)=>e.id).filter(Boolean)`,
  );

  // ── 스텝② 이동 ──
  await page.locator('button', { hasText: /^다음$/ }).first().click();
  await page.waitForTimeout(1500);

  out.step2 = await page.evaluate(`(() => {
    ${A11Y}
    const root = document.querySelector('[class*="formPane"]') || document;
    const files = [...root.querySelectorAll('input[type=file]')];
    const radios = [...root.querySelectorAll('input[type=radio]')];
    const imageField = root.querySelector('[class*="imageField"]');
    const trackItems = [...root.querySelectorAll('[class*="trackItem"]')];
    const selected = trackItems.find((t) => [...t.classList].some((c) => c.includes('trackItemSelected')));
    const cs = (el, keys) => { const c = getComputedStyle(el); return Object.fromEntries(keys.map((k)=>[k,c[k]])); };
    const ctrls = [...root.querySelectorAll('input, textarea, select')].filter(isFormControl);
    const rows = ctrls.map((el) => { const a = accName(el);
      return { kind: controlKind(el), id: el.id||null, name: a.name, from: a.from }; });
    const strong = (r) => r.from && r.from !== 'placeholder(약한 근거)';
    return {
      fileInputs: files.map((el) => ({
        testid: el.getAttribute('data-testid'), rect: rect2(el), visible: visible(el),
        ...cs(el, ['display','opacity','position','width','height','visibility','clipPath']),
      })),
      fileVisibleCount: files.filter(visible).length,
      radios: radios.map((el) => ({ rect: rect2(el), visible: visible(el),
        ...cs(el, ['display','opacity','appearance','width','height']) })),
      radioVisibleCount: radios.filter(visible).length,
      imageField: imageField ? cs(imageField, ['borderTopLeftRadius','borderTopWidth','borderTopStyle','borderTopColor','backgroundColor','padding']) : null,
      trackItemSelected: selected ? cs(selected, ['borderTopColor','backgroundColor','borderTopLeftRadius']) : null,
      trackItemCount: trackItems.length,
      dropZoneCount: root.querySelectorAll('[data-file-drop]').length,
      a11y: { total: rows.length, withoutStrongName: rows.filter((r)=>!strong(r)).length,
              missing: rows.filter((r)=>!strong(r)).slice(0,30) },
      imgThumbCount: root.querySelectorAll('[data-image-thumb]').length,
    };
  })()`);

  await ctx.close();
}

// ════════════ (2) 좁은 뷰포트 — F4 ════════════
for (const [label, w, h] of [['w360', 360, 800], ['w390', 390, 844], ['w768', 768, 1024]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  out[`f4_${label}`] = await page.evaluate(`(() => {
    ${A11Y}
    const stepper = document.querySelector('nav[class*="stepper"]');
    const labels = stepper ? [...stepper.querySelectorAll('span[class*="label"]')] : [];
    const active = stepper ? stepper.querySelector('button[aria-current="step"]') : null;
    const topbar = document.querySelector('header[class*="topbar"]');
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      hOverflowPx: document.documentElement.scrollWidth - window.innerWidth,
      topbarHeight: topbar ? +topbar.getBoundingClientRect().height.toFixed(2) : null,
      stepLabels: labels.map((l) => ({ text: txt(l), visible: visible(l), display: getComputedStyle(l).display })),
      visibleStepLabelCount: labels.filter(visible).length,
      activeStepText: txt(active),
      activeStepVisibleText: active ? [...active.querySelectorAll('span')].filter(visible).map(txt).join('|') : null,
    };
  })()`);
  await ctx.close();
}

// ════════════ (3) /admin ════════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  const slugInput = page.locator('input').first();
  await slugInput.fill(SLUG);
  await page.locator('button', { hasText: /^불러오기$/ }).first().click();
  await page.waitForTimeout(4500);

  out.admin = await page.evaluate(`(() => {
    ${A11Y}
    const files = [...document.querySelectorAll('input[type=file]')];
    const cs = (el, keys) => { const c = getComputedStyle(el); return Object.fromEntries(keys.map((k)=>[k,c[k]])); };
    const ctrls = [...document.querySelectorAll('input, textarea, select')].filter(isFormControl);
    const rows = ctrls.map((el) => { const a = accName(el);
      return { kind: controlKind(el), id: el.id||null, name: a.name, from: a.from }; });
    const strong = (r) => r.from && r.from !== 'placeholder(약한 근거)';
    return {
      fileInputs: files.map((el) => ({ rect: rect2(el), visible: visible(el), className: el.className,
        ...cs(el, ['display','opacity','position','width','height']) })),
      fileVisibleCount: files.filter(visible).length,
      fileTotal: files.length,
      dropZoneCount: document.querySelectorAll('[data-file-drop]').length,
      controls: rows,
      controlTotal: rows.length,
      withoutStrongName: rows.filter((r)=>!strong(r)).length,
      labelForCount: document.querySelectorAll('label[for]').length,
      labelTotal: document.querySelectorAll('label').length,
      sortableItemCount: document.querySelectorAll('[class*="sortableItem"]').length,
      imgThumbCount: document.querySelectorAll('[data-image-thumb]').length,
      panelCount: document.querySelectorAll('[data-admin-panel]').length,
    };
  })()`);

  // ── (핵심) DataTransfer 드롭 시뮬레이션이 동작하는지 1회 검증 ──
  // 현재 코드에 드롭존이 없으므로, **임시 리스너**를 붙여 Playwright 가 넘긴 DataTransfer 가
  // 진짜 File 을 실어 나르는지(=장차 FileDropField 의 onDrop 이 받게 될 것) 확인한다.
  const dt = await page.evaluateHandle(async () => {
    const d = new DataTransfer();
    const res = await fetch(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    );
    const blob = await res.blob();
    d.items.add(new File([blob], 's3-drop-probe.png', { type: 'image/png' }));
    return d;
  });
  await page.evaluate(`(() => {
    window.__dropProbe = null;
    const host = document.querySelector('[data-admin-panel]') || document.body;
    host.setAttribute('data-drop-probe-host', '');
    host.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files;
      window.__dropProbe = {
        gotEvent: true, fileCount: f ? f.length : 0,
        firstName: f && f[0] ? f[0].name : null,
        firstType: f && f[0] ? f[0].type : null,
        firstSize: f && f[0] ? f[0].size : null,
        isFileInstance: !!(f && f[0] instanceof File),
        typesIncludesFiles: [...(e.dataTransfer ? e.dataTransfer.types : [])].includes('Files'),
      };
    }, { once: true });
  })()`);
  await page.locator('[data-drop-probe-host]').dispatchEvent('drop', { dataTransfer: dt });
  await page.waitForTimeout(300);
  out.dropProbe = await page.evaluate(`window.__dropProbe`);

  // ── (핵심) 버튼 클릭 경로: filechooser 이벤트가 잡히는지 1회 검증 ──
  //   갤러리 `사진 추가 +` 는 이미 hidden input + ref.click() 패턴이다.
  {
    const before = await page.locator('[class*="sortableItem"]').count();
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null),
      page.locator('button', { hasText: '사진 추가' }).first().click(),
    ]);
    let added = null;
    if (chooser) {
      await chooser.setFiles({
        name: 's3-click-probe.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
      });
      await page.waitForTimeout(1200);
      added = await page.locator('[class*="sortableItem"]').count();
    }
    out.fileChooserProbe = { chooserFired: !!chooser, itemsBefore: before, itemsAfter: added };
  }

  // ── 단일 슬롯 setInputFiles 경로가 미리보기를 갱신하는가(기능 무회귀 baseline) ──
  {
    const fi = page.locator('input[type=file]').first();
    const thumbBefore = await page.evaluate(
      `(() => { const t = document.querySelector('[data-image-thumb]'); return t ? { state: t.dataset.state, src: t.querySelector('img')?.src?.slice(0,24) ?? null } : null; })()`,
    );
    await fi.setInputFiles({
      name: 's3-single-probe.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    }).catch((e) => { out.singleSlotErr = String(e).slice(0, 200); });
    await page.waitForTimeout(1200);
    const thumbAfter = await page.evaluate(
      `(() => { const t = document.querySelector('[data-image-thumb]'); return t ? { state: t.dataset.state, src: t.querySelector('img')?.src?.slice(0,24) ?? null } : null; })()`,
    );
    out.singleSlotProbe = { thumbBefore, thumbAfter, becameBlob: (thumbAfter?.src || '').startsWith('blob:') };
  }

  // ── DnD: data-* 표식 기반 "드롭 후 순서 문자열" 측정식 시제품(QA §10-1) ──
  {
    await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(4500);
    const marked = await page.evaluate(`(() => {
      const els = [...document.querySelectorAll('[class*="sortableItem"]')];
      els.forEach((el, i) => el.setAttribute('data-qa-order', String.fromCharCode(65 + i)));
      return els.length;
    })()`);
    const readOrder = () =>
      page.evaluate(
        `[...document.querySelectorAll('[data-qa-order]')].map((e)=>e.getAttribute('data-qa-order')).join(',')`,
      );
    const orderBefore = await readOrder();
    const items = page.locator('[class*="sortableItem"]');
    const a = await items.first().boundingBox();
    const b = await items.nth(1).boundingBox();
    let orderAfter = null;
    if (a && b) {
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      // 축을 가정하지 않는 경로: 먼저 살짝 움직여 센서를 깨우고, 목표 중심으로 이동한다.
      await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 5 });
      await page.waitForTimeout(200);
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
      await page.waitForTimeout(400);
      await page.mouse.up();
      await page.waitForTimeout(900);
      orderAfter = await readOrder();
    }
    out.dndOrderProbe = { marked, orderBefore, orderAfter, swapped: orderBefore !== orderAfter };
  }

  await ctx.close();
}

await browser.close();
await emit(out, args);

// `/apply`·`/admin` 파일 선택 컨트롤(F6) · 레이아웃/반응형(F4) · 접근성(F8) baseline
// — 스프린트 계약 3 §3 성공 기준의 측정 스크립트.
//
//   node s3-baseline.mjs --out out/s3-before.json
//   (구현 후) node s3-baseline.mjs --out out/s3-after.json
//
// 기능 무회귀(파일 등록 2경로 · 갤러리 CRUD · 스텝 왕복 · BGM 선택)는 s3-func.mjs 가 담당한다.
// 이 스크립트는 **computed·구조·접근성**만 잰다.
import { loadChromium, parseArgs, emit } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const SLUG = args.slug || 'demo-captain-luna';

// ── 브라우저에 주입되는 공통 헬퍼 ──────────────────────────────────
const H = `
  const txt = (el) => (el ? String(el.textContent || '').replace(/\\s+/g, ' ').trim() : '');
  const rect2 = (el) => { const b = el.getBoundingClientRect();
    return [+b.x.toFixed(2), +b.y.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)]; };
  const cs = (el, keys) => { const c = getComputedStyle(el); return Object.fromEntries(keys.map((k) => [k, c[k]])); };

  // "시각적으로 노출되지 않았다" — DoD 21 전반부의 측정 정의.
  // display:none / visibility:hidden / opacity:0 / 1×1 이하 클리핑 중 하나면 참.
  const visuallyHidden = (el) => {
    const c = getComputedStyle(el);
    if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) === 0) return true;
    const b = el.getBoundingClientRect();
    return b.width <= 1 && b.height <= 1;
  };
  const visible = (el) => !visuallyHidden(el);

  // 접근 가능한 이름(HTML-AAM 부분집합). placeholder 는 **약한 근거**로 따로 표시한다.
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
    if (ph) return { name: ph, from: 'placeholder-only' };
    return { name: '', from: 'NONE' };
  };
  const STRONG = ['aria-label', 'aria-labelledby', 'label[for]', 'label-wrap', 'title'];
  const hasStrongName = (el) => STRONG.includes(accName(el).from);
  const isFormControl = (el) => {
    const t = el.tagName.toLowerCase();
    if (t === 'textarea' || t === 'select') return true;
    return t === 'input' && (el.type || 'text') !== 'hidden';
  };
  const kind = (el) => (el.tagName.toLowerCase() === 'input' ? 'input:' + (el.type || 'text') : el.tagName.toLowerCase());

  // WCAG 2.x 대비비(불투명 색 전제).
  const parseRGB = (s) => { const m = String(s).match(/rgba?\\(([^)]+)\\)/); if (!m) return null;
    const p = m[1].split(',').map((v) => parseFloat(v.trim()));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const contrast = (a, b) => { const x = parseRGB(a), y = parseRGB(b); if (!x || !y) return null;
    const L1 = lum(x), L2 = lum(y);
    return +(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05))).toFixed(2); };

  // 파일 컨트롤 1개 = (시각적으로 숨긴 input) + (한국어 라벨/버튼을 가진 드롭존).
  const fileControlRows = (root) =>
    [...root.querySelectorAll('input[type=file]')].map((el) => {
      const zone = el.closest('[data-file-drop]');
      const a = accName(el);
      return {
        slot: el.getAttribute('data-file-slot') || (zone ? zone.getAttribute('data-file-drop') : null),
        id: el.id || null,
        rect: rect2(el),
        visuallyHidden: visuallyHidden(el),
        ...cs(el, ['display', 'opacity', 'visibility', 'position', 'width', 'height']),
        accName: a.name, accFrom: a.from,
        inDropZone: !!zone,
        zoneText: zone ? txt(zone) : null,
        zoneHasLatinOnlyText: zone ? /^[\\x00-\\x7F]*$/.test(txt(zone)) && /[A-Za-z]/.test(txt(zone)) : null,
        zoneHasButton: zone ? !!zone.querySelector('button') : null,
        zoneHasLabelFor: zone ? !!(el.id && zone.querySelector('label[for="' + CSS.escape(el.id) + '"]')) : null,
        zoneCS: zone ? cs(zone, ['borderTopLeftRadius', 'borderTopWidth', 'borderTopStyle', 'borderTopColor', 'backgroundColor']) : null,
      };
    });
`;

const chromium = await loadChromium();
const browser = await chromium.launch();
const out = { meta: { admin: ADMIN, slug: SLUG, at: new Date().toISOString() } };

// ── 기준 25 · 25-b (3차 개정 · E4) ─────────────────────────────────────────
// `clip` 으로 시각적으로 숨긴 컨트롤(파일 인풋 · BGM 라디오)은 **포커스 가능**하므로 탭 순서에 남는다.
// 눈에 보이는 단서가 없으면 DoD 13("모든 폼 컨트롤에 포커스 표현")이 그 컨트롤에서 조용히 공허해진다.
// 그래서 "숨긴 컨트롤 자신"이 아니라 **그 컨트롤을 대표하는 시각 표면**(드롭존 / 트랙 아이템)의
// computed 를 잰다. 합격 규칙은 뷰어 `Button` 의 `:focus-visible`(`Button.module.css:48-51`) SSOT 다.
//
// `:focus-visible` 은 **키보드 모달리티**가 확립돼야 매치되므로 `Tab` 을 한 번 먼저 누른다
// (admin-baseline.mjs `focusProbe` 와 같은 처리).
async function hiddenControlFocusCue(pageRef) {
  await pageRef.evaluate('window.scrollTo(0,0);');
  await pageRef.keyboard.press('Tab');
  await pageRef.waitForTimeout(150);
  return pageRef.evaluate(`(() => {
    const snap = (el) => { const c = getComputedStyle(el);
      return { outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth,
               outlineOffset: c.outlineOffset, outlineColor: c.outlineColor, boxShadow: c.boxShadow }; };
    // 계약 §3 기준 25 의 합격 규칙 — Button 의 :focus-visible 과 동일한 3px 아웃라인 + offset 2px.
    const ok = (s) => s.outlineStyle === 'solid'
      && Math.round(parseFloat(s.outlineWidth)) === 3 && s.outlineOffset === '2px';
    const probe = (surfaceSel, innerSel, label) => {
      const surfaces = [...document.querySelectorAll(surfaceSel)];
      const rows = surfaces.map((sf) => {
        const inner = sf.querySelector(innerSel);
        if (!inner) return { label, key: sf.getAttribute('data-file-drop') || null, why: 'no control' , pass: false };
        const before = snap(sf);
        inner.focus();
        const after = snap(sf);
        const focusVisible = inner.matches(':focus-visible');
        inner.blur();
        return { label, key: sf.getAttribute('data-file-drop') || null,
                 focusVisible, before, after, pass: ok(after) };
      });
      return { total: surfaces.length, rows, pass: surfaces.length > 0 && rows.every((r) => r.pass) };
    };
    return {
      dropZones: probe('[data-file-drop]', 'input[type=file]', 'dropZone'),
      trackItems: probe('[class*="trackItem"]', 'input[type=radio]', 'trackItem'),
    };
  })()`);
}

// ══════════════════ F4 — 레이아웃/반응형 ══════════════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  const top = await page.evaluate(`(() => {
    ${H}
    const topbar = document.querySelector('header[class*="topbar"]');
    const stepper = document.querySelector('nav[class*="stepper"]');
    const nav = document.querySelector('[class*="stepNav"]');
    const pane = document.querySelector('[class*="previewPane"]');
    if (!topbar || !stepper || !nav) return { error: 'topbar/stepper/stepNav not found' };
    const s = stepper.getBoundingClientRect(), n = nav.getBoundingClientRect();
    return {
      topbarHeight: +topbar.getBoundingClientRect().height.toFixed(2),
      stepperRect: rect2(stepper), stepNavRect: rect2(nav),
      stepperWidth: +s.width.toFixed(2),
      // 한 줄 판정은 **세로 중심** 기준(두 요소 높이가 40/38 로 달라 rect.y 동일 요구는 부당하다).
      centerDeltaY: +Math.abs((n.y + n.height / 2) - (s.y + s.height / 2)).toFixed(2),
      previewPaneStickyTop: pane ? getComputedStyle(pane).top : null,
    };
  })()`);

  await page.evaluate('window.scrollTo(0, 800)');
  await page.waitForTimeout(600);
  const scrolled = await page.evaluate(`(() => {
    ${H}
    const topbar = document.querySelector('header[class*="topbar"]');
    const frame = document.querySelector('[class*="frame"]');
    if (!topbar || !frame) return { error: 'topbar/frame not found' };
    const tb = topbar.getBoundingClientRect(), fr = frame.getBoundingClientRect();
    return { topbarBottom: +tb.bottom.toFixed(2), frameTop: +fr.top.toFixed(2),
             overlapPx: +Math.max(0, tb.bottom - fr.top).toFixed(2), scrollY: window.scrollY };
  })()`);

  out.f4 = { vp1440: { ...top, scrolled } };
  out.f4.vp1440.pass =
    !top.error && top.centerDeltaY <= 1 && top.topbarHeight <= 80 && scrolled.overlapPx === 0;
  await ctx.close();
}

for (const [key, w, h] of [['vp360', 360, 800], ['vp390', 390, 844], ['vp768', 768, 1024]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);

  const readOverflow = () =>
    page.evaluate(
      `({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
          hOverflowPx: document.documentElement.scrollWidth - window.innerWidth })`,
    );
  const stepText = () =>
    page.evaluate(`(() => {
      ${H}
      const stepper = document.querySelector('nav[class*="stepper"]');
      if (!stepper) return { error: 'stepper not found' };
      const active = stepper.querySelector('button[aria-current="step"]');
      const labels = [...stepper.querySelectorAll('span[class*="label"]')];
      // "현재 단계 이름이 화면에 보인다"의 측정: 활성 스텝의 **보이는** 자손 텍스트를 모아
      // 스텝 이름 3종 중 하나를 포함하는가.
      const visibleTextOfActive = active
        ? [...active.querySelectorAll('*')].filter(visible).map(txt).join(' ') || (visible(active) ? txt(active) : '')
        : '';
      const NAMES = ['정보입력', '영상·이미지 등록', '제작 완료'];
      return {
        visibleStepLabelCount: labels.filter(visible).length,
        activeVisibleText: visibleTextOfActive,
        activeNameShown: NAMES.some((n) => visibleTextOfActive.includes(n)),
        topbarHeight: (() => { const t = document.querySelector('header[class*="topbar"]');
          return t ? +t.getBoundingClientRect().height.toFixed(2) : null; })(),
      };
    })()`);

  const formTab = { ...(await readOverflow()), ...(await stepText()) };
  // ≤768px 에서는 미리보기가 탭 뒤에 숨어 있다 — **탭을 눌러 프레임을 렌더한 상태에서도** 재야 한다.
  await page.locator('button[role=tab]', { hasText: '미리보기' }).first().click().catch(() => {});
  await page.waitForTimeout(1800);
  const previewTab = await readOverflow();
  previewTab.frameRect = await page.evaluate(`(() => {
    ${H}
    const f = document.querySelector('[class*="frame"]');
    return f ? rect2(f) : null;
  })()`);

  out.f4[key] = { formTab, previewTab };
  out.f4[key].pass =
    formTab.hOverflowPx === 0 && previewTab.hOverflowPx === 0 && formTab.activeNameShown === true;
  await ctx.close();
}

// ══════════════════ F6 · F8 · N1 — /apply 스텝①·② ══════════════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // ── 스텝① 접근성 + 필수 표시 ──
  out.applyStep1 = await page.evaluate(`(() => {
    ${H}
    const root = document.querySelector('[class*="formPane"]');
    if (!root) return { error: 'formPane not found' };
    const ctrls = [...root.querySelectorAll('input,textarea,select')].filter(isFormControl);
    const hist = {}; ctrls.forEach((el) => { const f = accName(el).from; hist[f] = (hist[f] || 0) + 1; });
    // validateInvitation 이 필수로 취급하는 필드와 **1:1 대응**하는 컨트롤 id.
    const REQUIRED_IDS = ['apply-slug','apply-title','apply-groom','apply-bride','apply-date','apply-hour','apply-minute'];
    const required = REQUIRED_IDS.map((id) => {
      const el = document.getElementById(id);
      const l = el ? document.querySelector('label[for="' + CSS.escape(id) + '"]') : null;
      return { id, found: !!el,
        ariaRequired: el ? el.getAttribute('aria-required') : null,
        labelText: txt(l),
        hasMark: !!(l && l.querySelector('[data-required-mark]')),
        markAriaHidden: l && l.querySelector('[data-required-mark]')
          ? l.querySelector('[data-required-mark]').getAttribute('aria-hidden') : null };
    });
    return {
      controlTotal: ctrls.length,
      withoutStrongName: ctrls.filter((el) => !hasStrongName(el)).length,
      nameFromHist: hist,
      required,
      requiredOk: required.every((r) => r.found && r.ariaRequired === 'true' && r.hasMark && r.markAriaHidden === 'true'),
      // 과잉 표시 방지: 표식 개수가 필수 필드 수와 정확히 같아야 한다.
      markTotal: root.querySelectorAll('[data-required-mark]').length,
      ariaRequiredTotal: ctrls.filter((el) => el.getAttribute('aria-required') === 'true').length,
    };
  })()`);
  out.applyStep1.pass =
    !out.applyStep1.error &&
    out.applyStep1.withoutStrongName === 0 &&
    out.applyStep1.requiredOk === true &&
    out.applyStep1.markTotal === 7 &&
    out.applyStep1.ariaRequiredTotal === 7;

  // ── 스텝②로 이동 ──
  await page.locator('button', { hasText: /^다음$/ }).first().click();
  await page.waitForTimeout(2000);

  out.applyStep2 = await page.evaluate(`(() => {
    ${H}
    const root = document.querySelector('[class*="formPane"]');
    if (!root) return { error: 'formPane not found' };
    const ctrls = [...root.querySelectorAll('input,textarea,select')].filter(isFormControl);
    const files = fileControlRows(root);
    const radios = [...root.querySelectorAll('input[type=radio]')].map((el) => ({
      visuallyHidden: visuallyHidden(el), rect: rect2(el), accName: accName(el).name, accFrom: accName(el).from,
      ...cs(el, ['display', 'opacity', 'appearance', 'width', 'height']),
    }));
    const zones = [...root.querySelectorAll('[data-file-drop]')];
    const tracks = [...root.querySelectorAll('[class*="trackItem"]')];
    const sel = tracks.find((t) => [...t.classList].some((c) => c.includes('trackItemSelected')));
    const unsel = tracks.find((t) => t !== sel);
    const cardBg = sel ? getComputedStyle(sel.closest('[class*="section"]') || root).backgroundColor : null;
    return {
      controlTotal: ctrls.length,
      withoutStrongName: ctrls.filter((el) => !hasStrongName(el)).length,
      withoutStrongNameDetail: ctrls.filter((el) => !hasStrongName(el)).map((el) => ({ kind: kind(el), id: el.id || null })),
      fileInputTotal: files.length,
      fileInputsExposed: files.filter((f) => !f.visuallyHidden).length,
      fileInputsWithoutZone: files.filter((f) => !f.inDropZone).length,
      fileInputsWithoutName: files.filter((f) => !STRONG.includes(f.accFrom)).length,
      files,
      dropZoneCount: zones.length,
      dropZoneSlots: zones.map((z) => z.getAttribute('data-file-drop')),
      radioTotal: radios.length,
      radiosExposed: radios.filter((r) => !r.visuallyHidden).length,
      radios,
      trackItemCount: tracks.length,
      trackSelected: sel ? cs(sel, ['borderTopColor', 'backgroundColor', 'borderTopLeftRadius']) : null,
      trackUnselected: unsel ? cs(unsel, ['borderTopColor', 'backgroundColor']) : null,
      trackSelectedBorderContrastVsCard: sel && cardBg ? contrast(getComputedStyle(sel).borderTopColor, cardBg) : null,
      trackSelectionDistinguishable:
        !!sel && !!unsel && getComputedStyle(sel).borderTopColor !== getComputedStyle(unsel).borderTopColor,
    };
  })()`);

  // ── 테마 팔레트 내성(N1 의 객관 측정) ──
  out.applyStep2.themeImmunity = await page.evaluate(`(() => {
    ${H}
    const root = document.querySelector('[class*="formPane"]');
    const targets = [
      ...root.querySelectorAll('[data-file-drop]'),
      ...root.querySelectorAll('[class*="imageField"]'),
      ...root.querySelectorAll('[class*="trackItem"]'),
      ...root.querySelectorAll('input[type=file]'),
      ...root.querySelectorAll('input[type=radio]'),
    ];
    const snap = () => targets.map((el) => { const c = getComputedStyle(el);
      return [c.backgroundColor, c.color, c.borderTopColor, c.borderTopLeftRadius].join('|'); });
    const before = snap();
    const r = document.documentElement;
    r.style.setProperty('--color-main-600', '#ff0000');
    r.style.setProperty('--color-sub-100', '#ff0000');
    r.style.setProperty('--color-brand-tint-50', '#ff0000');
    const after = snap();
    ['--color-main-600','--color-sub-100','--color-brand-tint-50'].forEach((k) => r.style.removeProperty(k));
    return { sampled: targets.length, changed: before.filter((v, i) => v !== after[i]).length,
             changedSamples: before.map((v, i) => ({ before: v, after: after[i] })).filter((o) => o.before !== o.after) };
  })()`);

  // ── 기준 25 · 25-b — 숨긴 컨트롤의 포커스 단서 ──
  out.applyStep2.focusCue = await hiddenControlFocusCue(page);

  out.applyStep2.pass =
    !out.applyStep2.error &&
    out.applyStep2.focusCue.dropZones.pass === true &&
    out.applyStep2.focusCue.trackItems.pass === true &&
    out.applyStep2.fileInputTotal === 6 &&
    out.applyStep2.fileInputsExposed === 0 &&
    out.applyStep2.fileInputsWithoutZone === 0 &&
    out.applyStep2.fileInputsWithoutName === 0 &&
    out.applyStep2.dropZoneCount === 6 &&
    out.applyStep2.radiosExposed === 0 &&
    out.applyStep2.withoutStrongName === 0 &&
    out.applyStep2.themeImmunity.changed === 0 &&
    out.applyStep2.trackSelectionDistinguishable === true &&
    (out.applyStep2.trackSelectedBorderContrastVsCard ?? 0) >= 3.0 &&
    out.applyStep2.files.every((f) => f.zoneCS && f.zoneCS.borderTopLeftRadius === '8px');

  await ctx.close();
}

// ══════════════════ F6 · F8 — /admin ══════════════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.locator('input').filter({ hasNot: page.locator('[type=file]') }).first().fill(SLUG);
  await page.locator('button', { hasText: /^불러오기$/ }).first().click();
  await page.waitForTimeout(4500);

  out.admin = await page.evaluate(`(() => {
    ${H}
    const ctrls = [...document.querySelectorAll('input,textarea,select')].filter(isFormControl);
    const files = fileControlRows(document);
    const zones = [...document.querySelectorAll('[data-file-drop]')];
    const linked = ctrls.filter((el) => el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]'));
    return {
      controlTotal: ctrls.length,
      controlsWithLabelFor: linked.length,
      withoutStrongName: ctrls.filter((el) => !hasStrongName(el)).length,
      withoutStrongNameDetail: ctrls.filter((el) => !hasStrongName(el)).map((el) => ({ kind: kind(el), id: el.id || null, from: accName(el).from })),
      labelForTotal: document.querySelectorAll('label[for]').length,
      labelTotal: document.querySelectorAll('label').length,
      fileInputTotal: files.length,
      fileInputsExposed: files.filter((f) => !f.visuallyHidden).length,
      fileInputsWithoutZone: files.filter((f) => !f.inDropZone).length,
      fileInputsWithoutName: files.filter((f) => !STRONG.includes(f.accFrom)).length,
      files,
      dropZoneCount: zones.length,
      dropZoneSlots: zones.map((z) => z.getAttribute('data-file-drop')),
      panelCount: document.querySelectorAll('[data-admin-panel]').length,
      sortableItemCount: document.querySelectorAll('[class*="sortableItem"]').length,
    };
  })()`);

  out.admin.themeImmunity = await page.evaluate(`(() => {
    ${H}
    const targets = [...document.querySelectorAll('[data-file-drop]'), ...document.querySelectorAll('input[type=file]')];
    const snap = () => targets.map((el) => { const c = getComputedStyle(el);
      return [c.backgroundColor, c.color, c.borderTopColor, c.borderTopLeftRadius].join('|'); });
    const before = snap();
    const r = document.documentElement;
    r.style.setProperty('--color-main-600', '#ff0000');
    r.style.setProperty('--color-sub-100', '#ff0000');
    r.style.setProperty('--color-brand-tint-50', '#ff0000');
    const after = snap();
    ['--color-main-600','--color-sub-100','--color-brand-tint-50'].forEach((k) => r.style.removeProperty(k));
    return { sampled: targets.length, changed: before.filter((v, i) => v !== after[i]).length };
  })()`);

  // ── 기준 25 — /admin 드롭존의 포커스 단서 (트랙 아이템은 /admin 에 없다) ──
  out.admin.focusCue = await hiddenControlFocusCue(page);

  out.admin.pass =
    out.admin.focusCue.dropZones.pass === true &&
    out.admin.fileInputTotal === 5 &&
    out.admin.fileInputsExposed === 0 &&
    out.admin.fileInputsWithoutZone === 0 &&
    out.admin.fileInputsWithoutName === 0 &&
    out.admin.dropZoneCount === 5 &&
    out.admin.controlTotal === out.admin.controlsWithLabelFor &&
    out.admin.withoutStrongName === 0 &&
    out.admin.themeImmunity.changed === 0;

  await ctx.close();
}

await browser.close();
await emit(out, args);

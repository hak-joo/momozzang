// 스프린트 3 계약 §0 baseline 보강 probe (2차).
//  - 360/390 에서 **미리보기 탭**일 때의 가로 스크롤 (1차 probe 는 폼 탭만 봐서 0 이 나왔다)
//  - 접근 가능한 이름의 근거(from) 히스토그램
//  - 파일 컨트롤·BGM 트랙의 **테마 팔레트 내성**
//  - `f5WithoutAnyCue` **신정의**(QA §10-2) 의 before 값
//  - 기능 무회귀 baseline: 스텝 왕복 값 보존 / 갤러리 추가·삭제
import { loadChromium, parseArgs, emit } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const SLUG = args.slug || 'demo-captain-luna';
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const chromium = await loadChromium();
const browser = await chromium.launch();
const out = { meta: { admin: ADMIN, at: new Date().toISOString() } };

// ════════ (1) 좁은 뷰포트 × 미리보기 탭 ════════
for (const [label, w, h] of [['w360', 360, 800], ['w390', 390, 844], ['w768', 768, 1024]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const formTab = await page.evaluate(
    `({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth })`,
  );
  await page.locator('button[role=tab]', { hasText: '미리보기' }).first().click().catch(() => {});
  await page.waitForTimeout(2000);
  const previewTab = await page.evaluate(`(() => {
    const frame = document.querySelector('[class*="frame"]');
    const b = frame ? frame.getBoundingClientRect() : null;
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth,
             frameRect: b ? [+b.x.toFixed(2), +b.y.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)] : null };
  })()`);
  out[`narrow_${label}`] = {
    formTab: { ...formTab, hOverflowPx: formTab.scrollWidth - formTab.innerWidth },
    previewTab: { ...previewTab, hOverflowPx: previewTab.scrollWidth - previewTab.innerWidth },
  };
  await ctx.close();
}

// ════════ (2) /apply — 이름 근거 히스토그램 · 테마 내성 · 포커스 신정의 ════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  out.step1_nameFrom = await page.evaluate(`(() => {
    const txt = (el) => (el ? String(el.textContent || '').replace(/\\s+/g,' ').trim() : '');
    const from = (el) => {
      if ((el.getAttribute('aria-label')||'').trim()) return 'aria-label';
      if ((el.getAttribute('aria-labelledby')||'').trim()) return 'aria-labelledby';
      if (el.id && document.querySelector('label[for="'+CSS.escape(el.id)+'"]')) return 'label[for]';
      if (el.closest('label') && txt(el.closest('label'))) return 'label-wrap';
      if ((el.getAttribute('title')||'').trim()) return 'title';
      if ((el.getAttribute('placeholder')||'').trim()) return 'placeholder-only';
      return 'NONE';
    };
    const root = document.querySelector('[class*="formPane"]');
    const els = [...root.querySelectorAll('input,textarea,select')].filter((e)=>(e.type||'text')!=='hidden');
    const h = {}; els.forEach((e)=>{ const f = from(e); h[f]=(h[f]||0)+1; });
    return { total: els.length, hist: h };
  })()`);

  // 스텝 왕복 값 보존 (기능 무회귀 baseline)
  const titleInput = page.locator('#apply-title');
  await titleInput.fill('S3 무회귀 프로브');
  await page.waitForTimeout(400);
  await page.locator('button', { hasText: /^다음$/ }).first().click();
  await page.waitForTimeout(1500);
  const onStep2 = await page.locator('#apply-title').count();
  await page.locator('button', { hasText: /^이전$/ }).first().click();
  await page.waitForTimeout(1500);
  out.stepRoundTrip = {
    step2HadTitleInput: onStep2,
    titleAfterRoundTrip: await page.locator('#apply-title').inputValue().catch(() => null),
    pass: (await page.locator('#apply-title').inputValue().catch(() => null)) === 'S3 무회귀 프로브',
  };

  // 스텝② 로 이동해 테마 내성 + 갤러리 CRUD
  await page.locator('button', { hasText: /^다음$/ }).first().click();
  await page.waitForTimeout(2000);

  out.step2_themeImmunity = await page.evaluate(`(() => {
    const pane = document.querySelector('[class*="formPane"]');
    const targets = [
      ...pane.querySelectorAll('[class*="imageField"]'),
      ...pane.querySelectorAll('[class*="trackItem"]'),
      ...pane.querySelectorAll('input[type=file]'),
      ...pane.querySelectorAll('input[type=radio]'),
    ];
    const snap = () => targets.map((el) => { const c = getComputedStyle(el);
      return [c.backgroundColor, c.color, c.borderTopColor, c.borderTopLeftRadius].join('|'); });
    const before = snap();
    const r = document.documentElement;
    r.style.setProperty('--color-main-600', '#ff0000');
    r.style.setProperty('--color-sub-100', '#ff0000');
    r.style.setProperty('--color-brand-tint-50', '#ff0000');
    const after = snap();
    r.style.removeProperty('--color-main-600');
    r.style.removeProperty('--color-sub-100');
    r.style.removeProperty('--color-brand-tint-50');
    return { sampled: targets.length,
             changed: before.filter((v,i)=>v!==after[i]).length,
             changedSamples: before.map((v,i)=>({before:v, after:after[i]})).filter((o)=>o.before!==o.after) };
  })()`);

  // 갤러리 추가/삭제 (기능 무회귀 baseline) — /apply 스텝②
  {
    page.on('dialog', (d) => d.accept().catch(() => {}));
    const items = page.locator('[class*="sortableItem"]');
    const before = await items.count();
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null),
      page.locator('button', { hasText: '사진 추가' }).first().click(),
    ]);
    let afterAdd = null;
    if (chooser) {
      await chooser.setFiles({ name: 's3-a.png', mimeType: 'image/png', buffer: Buffer.from(PNG_B64, 'base64') });
      await page.waitForTimeout(1200);
      afterAdd = await items.count();
    }
    await items.first().hover().catch(() => {});
    await page.locator('[class*="deleteButton"]').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(1200);
    out.applyGalleryCrud = {
      chooserFired: !!chooser, before, afterAdd, afterDelete: await items.count(),
      headerText: await page.locator('[class*="manager"] h3').first().textContent().catch(() => null),
    };
  }

  // 스텝② 파일 등록 — 5개 슬롯 전부 setInputFiles 로 등록되고 썸네일이 blob 이 되는가
  {
    const rows = [];
    for (const slot of ['representative', 'share', 'main', 'aboutGroom', 'aboutBride']) {
      const fi = page.locator(`[data-testid="image-upload-${slot}"]`);
      const ok = (await fi.count()) > 0;
      if (ok) {
        await fi.setInputFiles({ name: `s3-${slot}.png`, mimeType: 'image/png', buffer: Buffer.from(PNG_B64, 'base64') }).catch(() => {});
        await page.waitForTimeout(500);
      }
      const state = await page.evaluate(
        `(() => { const f = document.querySelector('[data-testid="image-upload-${slot}"]');
           if (!f) return null; const fld = f.closest('[class*="imageField"]');
           const t = fld ? fld.querySelector('[data-image-thumb]') : null;
           return t ? { state: t.dataset.state, blob: (t.querySelector('img')?.src||'').startsWith('blob:') } : null; })()`,
      );
      rows.push({ slot, found: ok, ...(state || {}) });
    }
    out.applySingleSlots = rows;
  }

  await ctx.close();
}

// ════════ (3) /admin — 포커스 신정의 before 값 ════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.locator('input').filter({ hasNot: page.locator('[type=file]') }).first().fill(SLUG);
  await page.locator('button', { hasText: /^불러오기$/ }).first().click();
  await page.waitForTimeout(4500);

  await page.evaluate('window.scrollTo(0,0)');
  await page.keyboard.press('Tab');
  await page.waitForTimeout(150);
  out.adminFocusNewDef = await page.evaluate(`(() => {
    const els = [...document.querySelectorAll('input,textarea,select')]
      .filter((el) => !['hidden','file','checkbox','radio'].includes(el.type || ''));
    const snap = (el) => { const c = getComputedStyle(el);
      return { outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth, outlineOffset: c.outlineOffset, boxShadow: c.boxShadow }; };
    return els.map((el) => {
      const before = snap(el);
      el.focus();
      const after = snap(el);
      el.blur();
      const hasButtonRule = after.outlineStyle === 'solid'
        && Math.round(parseFloat(after.outlineWidth)) === 3 && after.outlineOffset === '2px';
      return {
        cls: (el.className || '').slice(0, 40),
        oldNoCue: JSON.stringify(before) === JSON.stringify(after),   // 구정의: !changed
        newNoCue: !hasButtonRule && after.outlineStyle === 'none' && after.boxShadow === 'none',
        hasButtonRule, before, after,
      };
    });
  })()`);

  // /admin 라벨 텍스트
  out.adminLabels = await page.evaluate(
    `[...document.querySelectorAll('label')].map((l)=>({ text: l.textContent.trim(), htmlFor: l.getAttribute('for') }))`,
  );

  await page.locator('[class*="sortableItem"]').first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: '../shots/s3-admin-native-file.png', fullPage: true }).catch(() => {});
  await ctx.close();
}

await browser.close();
await emit(out, args);

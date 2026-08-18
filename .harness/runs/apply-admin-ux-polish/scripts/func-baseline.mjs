// 기능 무회귀 + 격리 측정 — 스프린트 계약 2 성공 기준 **26~32**.
// (평가자 수정 요구 M2·M3 및 Q1 조건으로 신설된 기준들)
//
// admin-baseline.mjs 가 "computed 스타일·문자열"만 재는 데 반해, 이 스크립트는
// **배선이 살아 있는가**(불러오기 / 갤러리 DnD / Select onChange / Textarea 값 / 저장 경로)와
// **격리·의도된 변화**(미리보기 컨트롤 뷰어값 유지 / 뷰어 방명록 포커스 신설)를 잰다.
//
//   node func-baseline.mjs --out out/func-before.json
//   (구현 후) node func-baseline.mjs --out out/func-after.json
//
// 저장(기준 30)은 Supabase 쓰기를 유발하므로 `--save` 를 준 실행에서만 수행한다.
import { loadChromium, parseArgs, emit } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const VIEWER = args.viewer || 'http://localhost:5176';
const SLUG = args.slug || 'demo-captain-luna';
const DO_SAVE = !!args.save;

const hasLatin = (s) => /[A-Za-z]/.test(String(s || ''));
const CS = `(el) => { const c = getComputedStyle(el); return {
  backgroundColor: c.backgroundColor, borderRadius: c.borderTopLeftRadius, fontSize: c.fontSize,
  outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth, outlineOffset: c.outlineOffset,
  border: c.borderTopWidth + ' ' + c.borderTopStyle + ' ' + c.borderTopColor }; }`;

// 방명록 3필드에 도달하는 4단계 절차(평가자가 M3 에서 검증한 것 그대로).
// 미리보기(`/apply` 안 `.screen`)와 뷰어(`/`) 양쪽에서 동일하게 쓴다.
// 열리는 시트는 Radix Portal 로 `document.body` **직속**이라 `.screen` 밖·`#root` 밖이다.
async function openGuestBookForm(page, scopeSel) {
  const scope = scopeSel ? `${scopeSel} ` : '';
  const openBtn = page.locator(`${scope}button`, { hasText: '방명록 남기기' }).first();
  if ((await openBtn.count()) === 0) return { reached: false, why: 'open button not found' };
  await openBtn.scrollIntoViewIfNeeded().catch(() => {});
  await openBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1200);

  // nth(0) 은 닫기 버튼이므로 nth(1) 이상(미니미 버튼)을 고른다.
  const sheetBtns = page.locator('[class*="sheet"] button');
  const n = await sheetBtns.count();
  if (n < 2) return { reached: false, why: `sheet buttons=${n}` };
  await sheetBtns.nth(1).click({ force: true }).catch(() => {});
  await page.waitForTimeout(700);

  const submit = page.locator('[class*="sheet"] button', { hasText: '미니미로 방명록 남기기' }).first();
  if ((await submit.count()) === 0) return { reached: false, why: 'mini-submit button not found' };
  await submit.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1200);

  const fieldCount = await page.locator('[class*="sheet"] input, [class*="sheet"] textarea').count();
  return { reached: fieldCount >= 3, fieldCount };
}

const chromium = await loadChromium();
const browser = await chromium.launch();
const out = { meta: { admin: ADMIN, viewer: VIEWER, slug: SLUG, save: DO_SAVE, at: new Date().toISOString() } };

// ══════════════════ /admin — 기준 26 · 27 · 30 ══════════════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const dialogs = [];
  page.on('dialog', (d) => {
    dialogs.push({ type: d.type(), message: d.message() });
    d.dismiss().catch(() => {});
  });

  await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  // ── 기준 26. 불러오기가 실제로 동작한다 ──────────────────────────
  const slugInput = page
    .locator('input')
    .filter({ hasNot: page.locator('[type=file]') })
    .first();
  await slugInput.fill(SLUG).catch(() => {});
  const loadBtn = page.locator('button', { hasText: /^(Load|불러오기)$/ }).first();
  const loadFound = (await loadBtn.count()) > 0;
  if (loadFound) await loadBtn.click().catch(() => {});
  await page.waitForTimeout(4000);

  out.load = await page.evaluate(`(() => ({
    cardCount: document.querySelectorAll('[class*="board"], [data-admin-panel]').length,
    sortableItemCount: document.querySelectorAll('[class*="sortableItem"]').length,
    slugValue: (() => {
      const el = [...document.querySelectorAll('input')].find(
        (n) => !['file','hidden','checkbox','radio'].includes(n.type || ''));
      return el ? el.value : null;
    })(),
  }))()`);
  out.load.loadButtonFound = loadFound;
  out.load.pass =
    loadFound && out.load.cardCount >= 3 && out.load.sortableItemCount === 2 && out.load.slugValue === SLUG;

  // ── 기준 27. 갤러리 드래그 정렬 배선(dnd-kit 센서·SortableContext)이 살아 있다 ──
  // S3(QA_FINDINGS_2 §3.B / §10-1): 합격식을 **일반화**했다.
  //   구식: 드래그 중 `style.transform` 의 **y 성분** 부호가 서로 반대인가
  //         → 카드 폭이 넓어져 썸네일이 가로로 놓이면(기준 6 의 직접 결과) 실패한다. 축 가정이 낡았다.
  //   신식: DOM 노드에 `data-qa-order` 표식(A,B,…)을 달고 **드롭 후 순서 문자열이 뒤집혔는가**만 본다.
  //         레이아웃(세로/가로/그리드 줄바꿈)·아이템 수·DragOverlay 구현 세부에 전부 불변이다.
  //         `n → n+1 → n` 개수 전이는 DragOverlay 라는 구현 세부에 의존하므로 **보조 지표로 강등**한다.
  const items = page.locator('[class*="sortableItem"]');
  const readOrder = () =>
    page.evaluate(
      `[...document.querySelectorAll('[class*="sortableItem"]')].map((e) => e.getAttribute('data-qa-order') || '?').join(',')`,
    );
  const dnd = { itemsBefore: await items.count() };
  if (dnd.itemsBefore >= 2) {
    await items.first().scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);
    // 표식 부착. React 가 관리하지 않는 속성이므로 재정렬 시 노드와 함께 이동한다.
    dnd.marked = await page.evaluate(`(() => {
      const els = [...document.querySelectorAll('[class*="sortableItem"]')];
      els.forEach((e, i) => e.setAttribute('data-qa-order', String.fromCharCode(65 + i)));
      return els.length;
    })()`);
    dnd.orderBefore = await readOrder();
    const a = await items.first().boundingBox();
    const b = await items.nth(1).boundingBox();
    if (a && b) {
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
      await page.mouse.down();
      // 축을 가정하지 않는다: 먼저 활성화 임계치(8px)를 대각선으로 넘기고, 목표 아이템 중심으로 이동.
      await page.mouse.move(a.x + a.width / 2 + 12, a.y + a.height / 2 + 12, { steps: 6 });
      await page.waitForTimeout(250);
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 14 });
      await page.waitForTimeout(400);
      dnd.countDuringDrag = await items.count(); // 보조 지표(DragOverlay 클론)
      await page.mouse.up();
      await page.waitForTimeout(1200);
      dnd.itemsAfter = await items.count();
      dnd.orderAfter = await readOrder();
    }
  }
  const sorted = (s) => String(s || '').split(',').sort().join(',');
  dnd.pass =
    dnd.itemsBefore >= 2 &&
    !!dnd.orderAfter &&
    !dnd.orderAfter.includes('?') &&
    dnd.orderAfter !== dnd.orderBefore &&
    sorted(dnd.orderAfter) === sorted(dnd.orderBefore) &&
    dnd.itemsAfter === dnd.itemsBefore;
  // 한계(명시): 데모 레코드의 갤러리 이미지 2장이 전부 깨져 있어 썸네일 src 로 순서를 식별할 수 없다.
  // 따라서 이 기준은 "영속된 순서"가 아니라 **dnd-kit 센서·SortableContext 생존 + 실제 DOM 순서 교환**을 잰다.
  dnd.limitation = 'measures dnd-kit liveness + real DOM order swap, not persisted order (N1: demo images broken)';
  out.dnd = dnd;

  // ── 기준 30. 저장 경로가 살아 있다 (Supabase 쓰기 — --save 일 때만) ──
  if (DO_SAVE) {
    // 드래그 결과가 영속되지 않도록 **깨끗한 재로드 후**에 저장한다(측정이 데이터를 바꾸지 않게).
    await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(4000);
    dialogs.length = 0;
    const saveBtn = page.locator('button', { hasText: /Save|저장/ }).first();
    out.save = { buttonFound: (await saveBtn.count()) > 0 };
    if (out.save.buttonFound) {
      await saveBtn.scrollIntoViewIfNeeded().catch(() => {});
      await saveBtn.click({ force: true }).catch(() => {});
      await page.waitForTimeout(6000);
    }
    out.save.dialogs = dialogs.slice();
    const d = out.save.dialogs[0];
    out.save.pass = !!d && d.type === 'alert' && !hasLatin(d.message);
  } else {
    out.save = { skipped: true, why: 'run with --save (Supabase 쓰기 유발)' };
  }

  await ctx.close();
}

// ══════════════════ /apply — 기준 28 · 29 · 31 ══════════════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // ── 기준 28. 교체된 Select 가 상태에 반영된다 ─────────────────────
  const readMain300 = () =>
    page.evaluate(
      `(() => { const s = document.querySelector('[class*="screen"]'); return s ? getComputedStyle(s).getPropertyValue('--color-main-300').trim() : null; })()`,
    );
  const themeSelect = page.locator('[class*="formPane"] select').last();
  const sel = { found: (await themeSelect.count()) > 0, before: await readMain300() };
  if (sel.found) {
    await themeSelect.scrollIntoViewIfNeeded().catch(() => {});
    await themeSelect.selectOption('PURPLE').catch(() => {});
    await page.waitForTimeout(1200);
  }
  sel.after = await readMain300();
  sel.pass = sel.found && sel.before !== sel.after && /^#ACA4FF$/i.test(sel.after || '');
  out.selectWiring = sel;

  // ── 기준 29. 교체된 Textarea 가 값을 유지한다 ─────────────────────
  const ta = page.locator('[class*="formPane"] textarea').first();
  const PROBE = '평가자 입력 검증 12345';
  const taOut = { found: (await ta.count()) > 0 };
  if (taOut.found) {
    await ta.scrollIntoViewIfNeeded().catch(() => {});
    await ta.fill(PROBE).catch(() => {});
    await page.waitForTimeout(600);
    taOut.value = await ta.inputValue().catch(() => null);
  }
  taOut.pass = taOut.found && taOut.value === PROBE;
  out.textareaWiring = taOut;

  // ── 기준 31. 폰 미리보기 안의 뷰어 폼 컨트롤은 뷰어 값을 유지한다 ──
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  const reach = await openGuestBookForm(page, '[class*="screen"]');
  const iso = { ...reach };
  if (reach.reached) {
    iso.fields = await page.evaluate(`(() => {
      const cs = ${CS};
      return [...document.querySelectorAll('[class*="sheet"] input, [class*="sheet"] textarea')].map((el) => ({
        tag: el.tagName.toLowerCase(), placeholder: el.getAttribute('placeholder'), ...cs(el),
      }));
    })()`);
  }
  // 기준 31 (3차 개정 · E2) — 기대 배경색이 바뀐다.
  // F3-b 로 시트가 `.screen` 안으로 들어오면 `PhonePreview` 가 `.screen` 인라인 스타일로 주입한
  // 테마 스코프(`--color-sub-100: #F9F4FF`)를 **상속한다**. 지금은 시트가 `body` 직속이라
  // 루트값(`--color-sub-100: #f4faff`)을 쓴다. 즉 `rgb(244,250,255) → rgb(249,244,255)` 는
  // 결함이 아니라 F3-b 가 노리는 충실도 개선 그 자체다(계약 §4.8).
  // 기준의 원래 의도(미리보기 컨트롤이 **어드민화**되지 않을 것)는 not-admin 절이 유지한다.
  const ADMIN_BG = 'rgb(255, 255, 255)', ADMIN_RADIUS = '8px', ADMIN_FONT = '14px';
  iso.expectedBg = 'rgb(249, 244, 255)';
  iso.screenSub100 = await page.evaluate(
    `(() => { const s = document.querySelector('[class*="screen"]');
       return s ? getComputedStyle(s).getPropertyValue('--color-sub-100').trim() : null; })()`,
  );
  iso.pass =
    !!iso.fields &&
    iso.fields.length >= 3 &&
    iso.fields.every(
      (f) =>
        f.backgroundColor === iso.expectedBg &&
        f.borderRadius === '16px' &&
        f.fontSize === '12px' &&
        f.backgroundColor !== ADMIN_BG &&
        f.borderRadius !== ADMIN_RADIUS &&
        f.fontSize !== ADMIN_FONT,
    );
  // 구정의(= S2 기준 31) 병기 — 값이 바뀐 것이 "테마 스코프 상속" 때문임을 대조로 남긴다.
  iso.pass_legacyDef =
    !!iso.fields &&
    iso.fields.length >= 3 &&
    iso.fields.every(
      (f) =>
        f.backgroundColor === 'rgb(244, 250, 255)' && f.borderRadius === '16px' && f.fontSize === '12px',
    );
  out.previewControlIsolation = iso;

  await ctx.close();
}

// ══════════════════ 뷰어 — 기준 32 ══════════════════
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${VIEWER}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  // 인트로가 있으면 본문으로 진입한다.
  await page.locator('body').click({ position: { x: 195, y: 700 } }).catch(() => {});
  await page.waitForTimeout(2500);

  const reach = await openGuestBookForm(page, null);
  const gb = { ...reach };
  if (reach.reached) {
    await page.keyboard.press('Tab'); // 키보드 모달리티 확립
    await page.waitForTimeout(150);
    gb.fields = await page.evaluate(`(() => {
      const cs = ${CS};
      return [...document.querySelectorAll('[class*="sheet"] input, [class*="sheet"] textarea')].map((el) => {
        const before = cs(el);
        el.focus();
        const after = cs(el);
        const fv = el.matches(':focus-visible');
        el.blur();
        return { tag: el.tagName.toLowerCase(), placeholder: el.getAttribute('placeholder'),
                 focusVisibleMatched: fv, unfocused: before, focused: after };
      });
    })()`);
  }
  const f = gb.fields || [];
  // (a) unfocused = DoD 28. 기대값은 `viewer-baseline.mjs` 의 `guestBook.fields` 와 **같은 값**이다.
  // 주의: 이 값은 `/apply` 미리보기(기준 31)의 `rgb(244,250,255)` 와 **다르다**.
  // 뷰어는 팔레트를 `document.body` 인라인에 주입하고 방명록 시트는 body 직속 포털이라
  // PINK 테마의 `--color-sub-100`(=`rgb(249,244,255)`)을 받는다. 반면 미리보기는 팔레트를
  // `.screen` 에 스코프하고 시트는 `.screen` 밖이라 **기본 팔레트**(`rgb(244,250,255)`)를 받는다.
  gb.unfocusedPass =
    f.length >= 3 &&
    f.every(
      (x) =>
        x.unfocused.backgroundColor === 'rgb(249, 244, 255)' &&
        x.unfocused.borderRadius === '16px' &&
        x.unfocused.fontSize === '12px',
    );
  gb.focusedPass =
    f.length >= 3 &&
    f.every(
      (x) =>
        x.focused.outlineStyle === 'solid' &&
        Math.round(parseFloat(x.focused.outlineWidth)) === 3 &&
        x.focused.outlineOffset === '2px',
    );
  gb.pass = gb.unfocusedPass && gb.focusedPass;
  out.viewerGuestBookFocus = gb;

  await ctx.close();
}

await browser.close();
await emit(out, args);

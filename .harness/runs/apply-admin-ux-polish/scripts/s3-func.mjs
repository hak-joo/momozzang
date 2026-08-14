// 기능 무회귀 — 스프린트 계약 3. **파일 컨트롤 9개 교체 + 레이아웃 변경 + 마크업 변경**이
// 배선을 죽이지 않았는지 잰다(스프린트 2 에서 평가자가 치명 M2 로 지적한 축).
//
//   node s3-func.mjs --out out/s3-func-before.json
//   (구현 후) node s3-func.mjs --out out/s3-func-after.json
//
// 이 스크립트는 **구현 전/후 양쪽에서 그대로 실행된다**:
//   - 트리거는 `[data-file-drop] button|label` 이 있으면 그것을, 없으면 네이티브 input 자체를 쓴다.
//   - 드롭 경로는 `[data-file-drop]` 이 없으면 `zoneMissing` 으로 실패를 기록한다(구현 전 baseline).
// 저장(Supabase 쓰기)은 하지 않는다 — 저장 경로는 func-baseline.mjs --save 가 담당한다.
import { loadChromium, parseArgs, emit } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const SLUG = args.slug || 'demo-captain-luna';
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const PNG_DATA_URI = `data:image/png;base64,${PNG_B64}`;

// 파일 인풋 목록을 DOM 순서로 열거한다(구현 전/후 공통 식별자).
const ENUM = `(() => {
  return [...document.querySelectorAll('input[type=file]')].map((el, i) => {
    const zone = el.closest('[data-file-drop]');
    return {
      index: i,
      slot: el.getAttribute('data-file-slot') || (zone ? zone.getAttribute('data-file-drop') : null),
      id: el.id || null,
      multiple: !!el.multiple,
      hasZone: !!zone,
      hasZoneTrigger: zone ? !!zone.querySelector('button, label') : false,
    };
  });
})()`;

// index 번째 파일 인풋과 짝지어진 썸네일의 상태를 읽는다.
const THUMB = (i) => `(() => {
  const el = [...document.querySelectorAll('input[type=file]')][${i}];
  if (!el) return null;
  const host = el.closest('[data-file-drop]') || el.closest('[class*="imageField"]') || el.parentElement;
  const t = host ? host.querySelector('[data-image-thumb]') : null;
  if (!t) return { thumbFound: false };
  const img = t.querySelector('img');
  return { thumbFound: true, state: t.dataset.state, isBlob: !!(img && img.src.startsWith('blob:')) };
})()`;

/** 페이지 컨텍스트에서 PNG 1장을 담은 DataTransfer 핸들을 만든다. */
async function makeFileTransfer(page, name) {
  return page.evaluateHandle(async ({ uri, n }) => {
    const dt = new DataTransfer();
    const blob = await (await fetch(uri)).blob();
    dt.items.add(new File([blob], n, { type: 'image/png' }));
    return dt;
  }, { uri: PNG_DATA_URI, n: name });
}

/** 클릭 경로: 드롭존 트리거(없으면 네이티브 input)를 눌러 파일 선택 창이 열리는지 + 등록되는지. */
async function clickPath(page, row) {
  const sel = row.hasZone
    ? `[data-file-drop="${row.slot}"] button, [data-file-drop="${row.slot}"] label`
    : `input[type=file] >> nth=${row.index}`;
  const trigger = page.locator(sel).first();
  if ((await trigger.count()) === 0) return { ok: false, why: 'trigger not found', sel };
  await trigger.scrollIntoViewIfNeeded().catch(() => {});
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 8000 }).catch(() => null),
    trigger.click({ force: true }).catch(() => {}),
  ]);
  if (!chooser) return { ok: false, why: 'filechooser did not fire', sel };
  await chooser.setFiles({
    name: `s3-click-${row.slot ?? row.index}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_B64, 'base64'),
  });
  await page.waitForTimeout(900);
  return { ok: true, sel, usedZoneTrigger: row.hasZone };
}

/** 드롭 경로: DataTransfer 를 실은 dragover/drop 을 드롭존에 디스패치한다. */
async function dropPath(page, row) {
  if (!row.hasZone) return { ok: false, why: 'zoneMissing' };
  const zone = page.locator(`[data-file-drop="${row.slot}"]`).first();
  if ((await zone.count()) === 0) return { ok: false, why: 'zone locator empty' };
  await zone.scrollIntoViewIfNeeded().catch(() => {});
  const dt = await makeFileTransfer(page, `s3-drop-${row.slot ?? row.index}.png`);
  await zone.dispatchEvent('dragover', { dataTransfer: dt });
  await page.waitForTimeout(250);
  const dragCue = await page.evaluate(`(() => {
    const z = document.querySelector('[data-file-drop="${row.slot}"]');
    if (!z) return null;
    const c = getComputedStyle(z);
    return { dataDragover: z.getAttribute('data-dragover'),
             borderTopColor: c.borderTopColor, backgroundColor: c.backgroundColor, borderTopStyle: c.borderTopStyle };
  })()`);
  await zone.dispatchEvent('drop', { dataTransfer: dt });
  await page.waitForTimeout(900);
  const afterCue = await page.evaluate(`(() => {
    const z = document.querySelector('[data-file-drop="${row.slot}"]');
    return z ? z.getAttribute('data-dragover') : null;
  })()`);
  return { ok: true, dragCue, dragoverCleared: afterCue !== 'true' };
}

const chromium = await loadChromium();
const browser = await chromium.launch();
const out = { meta: { admin: ADMIN, slug: SLUG, at: new Date().toISOString() } };

// ══════════ /apply — 스텝 왕복 · 스텝② 파일 2경로 · 갤러리 CRUD · BGM 선택 ══════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push({ type: d.type(), message: d.message() }); d.accept().catch(() => {}); });
  out.pageErrors = [];
  page.on('pageerror', (e) => out.pageErrors.push(String(e).slice(0, 200)));
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // ── 스텝 왕복 값 보존 (①→②→③→②→①) ──
  await page.locator('#apply-title').fill('S3 무회귀 프로브');
  await page.waitForTimeout(300);
  const next = page.locator('button', { hasText: /^다음$/ }).first();
  const prev = page.locator('button', { hasText: /^이전$/ }).first();
  await next.click(); await page.waitForTimeout(1200);
  const step2Reached = (await page.locator('[class*="formPane"] input[type=file]').count()) > 0;
  await next.click(); await page.waitForTimeout(1200);
  const step3Reached = (await page.locator('[class*="formPane"]').innerText().catch(() => '')).length > 0;
  await prev.click(); await page.waitForTimeout(1000);
  await prev.click(); await page.waitForTimeout(1200);
  out.stepRoundTrip = {
    step2Reached, step3Reached,
    titleAfter: await page.locator('#apply-title').inputValue().catch(() => null),
  };
  out.stepRoundTrip.pass =
    step2Reached && step3Reached && out.stepRoundTrip.titleAfter === 'S3 무회귀 프로브';

  // ── 스텝② 파일 컨트롤: 클릭 경로 ──
  await next.click(); await page.waitForTimeout(1800);
  const applyRows = await page.evaluate(ENUM);
  out.applyFileControls = { enumerated: applyRows };
  const clickResults = [];
  for (const row of applyRows) {
    const before = row.multiple
      ? { count: await page.locator('[class*="sortableItem"]').count() }
      : await page.evaluate(THUMB(row.index));
    const r = await clickPath(page, row);
    const after = row.multiple
      ? { count: await page.locator('[class*="sortableItem"]').count() }
      : await page.evaluate(THUMB(row.index));
    const registered = row.multiple ? after.count === before.count + 1 : !!after?.isBlob;
    clickResults.push({ slot: row.slot, index: row.index, multiple: row.multiple, ...r, before, after, registered });
  }
  out.applyFileControls.click = clickResults;
  out.applyFileControls.clickPass = clickResults.length === 6 && clickResults.every((r) => r.registered);

  // ── 스텝② 파일 컨트롤: 드롭 경로 (깨끗한 상태에서 다시) ──
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.locator('button', { hasText: /^다음$/ }).first().click();
  await page.waitForTimeout(1800);
  const applyRows2 = await page.evaluate(ENUM);
  const dropResults = [];
  for (const row of applyRows2) {
    const before = row.multiple
      ? { count: await page.locator('[class*="sortableItem"]').count() }
      : await page.evaluate(THUMB(row.index));
    const r = await dropPath(page, row);
    const after = row.multiple
      ? { count: await page.locator('[class*="sortableItem"]').count() }
      : await page.evaluate(THUMB(row.index));
    const registered = row.multiple ? after.count === before.count + 1 : !!after?.isBlob;
    dropResults.push({ slot: row.slot, index: row.index, multiple: row.multiple, ...r, before, after, registered });
  }
  out.applyFileControls.drop = dropResults;
  out.applyFileControls.dropPass =
    dropResults.length === 6 &&
    dropResults.every((r) => r.registered && r.dragCue && r.dragCue.dataDragover === 'true' && r.dragoverCleared);

  // ── 갤러리 CRUD (추가 → 삭제 → 개수/제목 갱신) ──
  {
    const items = page.locator('[class*="sortableItem"]');
    const before = await items.count();
    await items.first().scrollIntoViewIfNeeded().catch(() => {});
    await items.first().hover().catch(() => {});
    dialogs.length = 0;
    await page.locator('[class*="deleteButton"]').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(1200);
    const afterDelete = await items.count();
    out.applyGallery = {
      before, afterDelete,
      deleteDialog: dialogs[0] ?? null,
      headerText: await page.locator('[class*="manager"] h3').first().textContent().catch(() => null),
    };
    out.applyGallery.pass = afterDelete === before - 1 && /사진첩 \(/.test(out.applyGallery.headerText || '');
  }

  // ── BGM 트랙 선택(네이티브 라디오 대체 후에도 선택이 전이되는가) ──
  {
    const tracks = page.locator('[class*="trackItem"]');
    const n = await tracks.count();
    const selectedIndex = async () =>
      page.evaluate(
        `[...document.querySelectorAll('[class*="trackItem"]')].findIndex((t) => [...t.classList].some((c) => c.includes('trackItemSelected')))`,
      );
    const before = await selectedIndex();
    const target = before === 0 ? 1 : 0;
    if (n >= 2) {
      await tracks.nth(target).scrollIntoViewIfNeeded().catch(() => {});
      await tracks.nth(target).click({ force: true }).catch(() => {});
      await page.waitForTimeout(800);
    }
    const after = await selectedIndex();
    const ariaChecked = await page.evaluate(
      `[...document.querySelectorAll('[class*="trackItem"]')].map((t) => {
         const r = t.querySelector('input[type=radio]');
         return { radioChecked: r ? r.checked : null, ariaChecked: t.getAttribute('aria-checked'), role: t.getAttribute('role') }; })`,
    );
    out.bgmTrack = { trackCount: n, before, target, after, ariaChecked };
    out.bgmTrack.pass = n >= 2 && after === target && after !== before;
  }

  await ctx.close();
}

// ══════════ /admin — 파일 2경로 · 갤러리 CRUD ══════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const dialogs = [];
  page.on('dialog', (d) => { dialogs.push({ type: d.type(), message: d.message() }); d.accept().catch(() => {}); });
  // 기준 31-c (3차 개정 · E6) — 어드민 화면의 런타임 예외. 파일 인풋 5곳 교체 + 라벨 연결이
  // 배선을 끊으면 여기에 잡힌다. `/apply` 는 out.pageErrors 가 이미 담당한다.
  out.adminPageErrors = [];
  page.on('pageerror', (e) => out.adminPageErrors.push(String(e).slice(0, 200)));
  const load = async () => {
    await page.goto(`${ADMIN}/admin`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.locator('input').filter({ hasNot: page.locator('[type=file]') }).first().fill(SLUG);
    await page.locator('button', { hasText: /^불러오기$/ }).first().click();
    await page.waitForTimeout(4500);
  };
  await load();

  const adminRows = await page.evaluate(ENUM);
  out.adminFileControls = { enumerated: adminRows };
  const clickResults = [];
  for (const row of adminRows) {
    const before = row.multiple
      ? { count: await page.locator('[class*="sortableItem"]').count() }
      : await page.evaluate(THUMB(row.index));
    const r = await clickPath(page, row);
    const after = row.multiple
      ? { count: await page.locator('[class*="sortableItem"]').count() }
      : await page.evaluate(THUMB(row.index));
    const registered = row.multiple ? after.count === before.count + 1 : !!after?.isBlob;
    clickResults.push({ slot: row.slot, index: row.index, multiple: row.multiple, ...r, before, after, registered });
  }
  out.adminFileControls.click = clickResults;
  out.adminFileControls.clickPass = clickResults.length === 5 && clickResults.every((r) => r.registered);

  await load();
  const adminRows2 = await page.evaluate(ENUM);
  const dropResults = [];
  for (const row of adminRows2) {
    const before = row.multiple
      ? { count: await page.locator('[class*="sortableItem"]').count() }
      : await page.evaluate(THUMB(row.index));
    const r = await dropPath(page, row);
    const after = row.multiple
      ? { count: await page.locator('[class*="sortableItem"]').count() }
      : await page.evaluate(THUMB(row.index));
    const registered = row.multiple ? after.count === before.count + 1 : !!after?.isBlob;
    dropResults.push({ slot: row.slot, index: row.index, multiple: row.multiple, ...r, before, after, registered });
  }
  out.adminFileControls.drop = dropResults;
  out.adminFileControls.dropPass =
    dropResults.length === 5 &&
    dropResults.every((r) => r.registered && r.dragCue && r.dragCue.dataDragover === 'true' && r.dragoverCleared);

  // ── 라벨 클릭이 파일 선택 창을 여는가 (DoD 22 후반부 · F6 3번째 문장) ──
  {
    const rows = [];
    for (const row of adminRows2) {
      if (!row.id) { rows.push({ slot: row.slot, id: null, ok: false, why: 'no id' }); continue; }
      const label = page.locator(`label[for="${row.id}"]`).first();
      if ((await label.count()) === 0) { rows.push({ slot: row.slot, id: row.id, ok: false, why: 'no label[for]' }); continue; }
      await label.scrollIntoViewIfNeeded().catch(() => {});
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 6000 }).catch(() => null),
        label.click({ force: true }).catch(() => {}),
      ]);
      if (chooser) await chooser.setFiles([]).catch(() => {});
      rows.push({ slot: row.slot, id: row.id, ok: !!chooser });
    }
    out.adminLabelClick = { rows, pass: rows.length === 5 && rows.every((r) => r.ok) };
  }

  await ctx.close();
}

await browser.close();
await emit(out, args);

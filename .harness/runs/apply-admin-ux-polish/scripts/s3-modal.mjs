// F3-b — 미리보기 모달/바텀시트의 **프레임 이탈** 측정.
// `/apply` 폰 미리보기 안에서 열리는 모든 Dialog/BottomSheet 표면을 열거하고,
// 시트·오버레이가 `.screen` rect 안에 갇혀 있는지 / body 직계 자식으로 새지 않는지 잰다.
// 같은 절차를 뷰어(:5176)에서도 돌려 **뷰어 무회귀**(포털이 body 직속으로 남아야 한다)를 잰다.
//
//   node s3-modal.mjs --out out/s3-modal-before.json
//   (구현 후) node s3-modal.mjs --out out/s3-modal-after.json
import { loadChromium, parseArgs, emit } from './lib/pw.mjs';

const args = parseArgs();
const ADMIN = args.admin || 'http://localhost:3002';
const VIEWER = args.viewer || 'http://localhost:5176';

const SNAP = `(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), w: +b.width.toFixed(2), h: +b.height.toFixed(2),
             left: +b.left.toFixed(2), top: +b.top.toFixed(2), right: +b.right.toFixed(2), bottom: +b.bottom.toFixed(2) }; };
  const cls = (frag) => [...document.querySelectorAll('*')].filter((e) => [...e.classList].some((c) => c.includes(frag)));
  const screen = document.querySelector('[class*="screen"]');
  const sheets = [...cls('sheet_'), ...cls('dialog_')].filter((e) => e.getAttribute('role') === 'dialog' || e.hasAttribute('data-state'));
  const overlays = [...cls('overlay')].filter((e) => e.getBoundingClientRect().width > 0);
  const bodyKids = [...document.body.children];
  const inScreenScope = (el) => !!(screen && screen.contains(el));
  const contained = (a, b) => !!(a && b && a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5);
  const screenRect = r(screen);
  const rows = (list, tag) => list.map((el) => {
    const rect = r(el);
    return { tag, cls: (el.className || '').toString().slice(0, 40),
      role: el.getAttribute('role'), state: el.getAttribute('data-state'),
      rect, isBodyDirectChild: el.parentElement === document.body,
      inScreen: inScreenScope(el), containedInScreen: contained(rect, screenRect) };
  });
  return {
    screenRect,
    sheets: rows(sheets, 'sheet'),
    overlays: rows(overlays, 'overlay'),
    bodyChildCount: bodyKids.length,
    bodyChildClasses: bodyKids.map((e) => (e.id ? '#' + e.id : (e.className || e.tagName).toString().slice(0, 30))),
    // 오버레이가 우측 폼 패널을 덮는가 — 폼의 임의 입력 필드 좌표와 겹치는지로 판정한다.
    formFieldRect: r(document.querySelector('[class*="formPane"] input')),
  };
})()`;

// ── 기준 12-c (3차 개정 · E1) ────────────────────────────────────────────────
// `.screen{overflow:hidden}` 은 잘라낸 영역을 **히트테스트에서도 제거**한다. 컨테이너만 주입하고
// 사이징을 손대지 않으면 시트가 프레임 밖으로 삐져나가 **닫기 버튼을 누를 수 없게 된다.**
// 그래서 "컨테이너 안에 들어왔는가"와 별개로 "실제로 누를 수 있는가"를 잰다.
//
// 닫기 컨트롤의 정의: 최상위(가장 마지막) `[role=dialog]` 안의 `[class*="close"]`.
//   없으면(예: `MessageDialog` 는 `useAutoClose={false}` 라 X 버튼이 없다) 그 다이얼로그의 **마지막 `button`**.
const CLOSE_TARGET = `(() => {
  document.querySelectorAll('[data-qa-close-target]').forEach((e) => e.removeAttribute('data-qa-close-target'));
  const sheets = [...document.querySelectorAll('[role="dialog"]')];
  const sh = sheets[sheets.length - 1];
  if (!sh) return { why: 'no sheet' };
  const btn = sh.querySelector('[class*="close"]') || [...sh.querySelectorAll('button')].at(-1);
  if (!btn) return { why: 'no close control' };
  btn.setAttribute('data-qa-close-target', 'true');
  const b = btn.getBoundingClientRect();
  const screen = document.querySelector('[class*="screen"]');
  const s = screen ? screen.getBoundingClientRect() : null;
  const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  const el = document.elementFromPoint(cx, cy);
  return {
    sheetsBefore: sheets.length,
    kind: sh.querySelector('[class*="close"]') ? 'closeIcon' : 'lastButton',
    btnRect: [+b.x.toFixed(2), +b.y.toFixed(2), +b.width.toFixed(2), +b.height.toFixed(2)],
    point: [+cx.toFixed(2), +cy.toFixed(2)],
    hitTag: el ? el.tagName + '.' + String(el.className).slice(0, 44) : null,
    hitIsCloseControl: !!el && (el === btn || btn.contains(el)),
    btnContainedInScreen: !!s && b.left >= s.left - 0.5 && b.right <= s.right + 0.5
      && b.top >= s.top - 0.5 && b.bottom <= s.bottom + 0.5,
  };
})()`;

/** 최상위 시트의 닫기 컨트롤을 히트테스트하고 **실제로 클릭해** 닫히는지 확인한다. */
async function closeByClick(page) {
  const info = await page.evaluate(CLOSE_TARGET);
  if (info.why) return { ...info, pass: false };
  let err = null;
  await page
    .locator('[data-qa-close-target="true"]')
    .click({ timeout: 6000 })
    .catch((e) => { err = String(e).split('\n')[0].slice(0, 90); });
  await page.waitForTimeout(1000);
  info.sheetsAfter = await page.evaluate(`document.querySelectorAll('[role="dialog"]').length`);
  info.clickError = err;
  info.clickClosed = !err && info.sheetsAfter < info.sheetsBefore;
  info.pass = info.hitIsCloseControl === true && info.btnContainedInScreen === true && info.clickClosed === true;
  return info;
}

/** 미리보기(또는 뷰어)에서 특정 탭으로 이동한다. */
async function goTab(page, scope, label) {
  const t = page.locator(`${scope} button`, { hasText: label }).first();
  if ((await t.count()) === 0) return false;
  await t.scrollIntoViewIfNeeded().catch(() => {});
  await t.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1200);
  return true;
}

/** 이름으로 버튼을 눌러 모달을 연 뒤 스냅샷을 찍고 ESC 로 닫는다. */
async function openAndMeasure(page, scope, name, triggerText, opts = {}) {
  const baseline = await page.evaluate(SNAP);
  const btn = page.locator(`${scope} button`, { hasText: triggerText }).first();
  if ((await btn.count()) === 0) return { name, triggerText, opened: false, why: 'trigger not found' };
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await btn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1300);
  const open = await page.evaluate(SNAP);
  const res = {
    name, triggerText, opened: open.sheets.length > baseline.sheets.length || open.overlays.length > baseline.overlays.length,
    bodyChildCountBefore: baseline.bodyChildCount, bodyChildCountOpen: open.bodyChildCount,
    screenRect: open.screenRect, sheets: open.sheets, overlays: open.overlays,
    formFieldRect: open.formFieldRect,
  };
  // 합격식 (F3-b)
  const sheetsNew = open.sheets;
  const overlaysNew = open.overlays;
  res.allSheetsContained = sheetsNew.length > 0 && sheetsNew.every((s) => s.containedInScreen);
  res.allOverlaysWithinScreen =
    overlaysNew.length === 0 ||
    overlaysNew.every((o) => o.rect.w <= (open.screenRect?.w ?? 0) + 0.5 && o.rect.h <= (open.screenRect?.h ?? 0) + 0.5);
  res.noBodyDirectChild = [...sheetsNew, ...overlaysNew].every((e) => !e.isBodyDirectChild);
  // 오버레이가 폼 필드를 덮는가
  const ff = open.formFieldRect;
  res.overlayCoversFormField = !!ff && overlaysNew.some(
    (o) => o.rect.left <= ff.left && o.rect.right >= ff.right && o.rect.top <= ff.top && o.rect.bottom >= ff.bottom,
  );
  if (!opts.keepOpen) {
    // 기준 12-c — 닫기 컨트롤을 실제로 눌러 닫는다. (뷰어 블록은 opts.closeProbe 를 켜지 않는다)
    if (opts.closeProbe) res.closeClick = await closeByClick(page);
    await page.keyboard.press('Escape').catch(() => {}); // 남아 있으면 정리
    await page.waitForTimeout(900);
    const closed = await page.evaluate(SNAP);
    res.afterClose = { bodyChildCount: closed.bodyChildCount, sheets: closed.sheets.length, overlays: closed.overlays.length };
    res.closedCleanly = closed.bodyChildCount === baseline.bodyChildCount && closed.sheets.length === 0;
  }
  return res;
}

/** 텍스트가 없는 트리거(아이콘 버튼 등)로 여는 **중첩 모달** 측정. */
async function openNestedAndMeasure(page, name, triggerSel) {
  const baseline = await page.evaluate(SNAP);
  const btn = page.locator(triggerSel).first();
  if ((await btn.count()) === 0) return { name, triggerText: triggerSel, opened: false, why: 'trigger not found' };
  await btn.scrollIntoViewIfNeeded().catch(() => {});
  await btn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1300);
  const open = await page.evaluate(SNAP);
  return finalize(name, triggerSel, baseline, open, true);
}

/** MessageDialog(useMessageDialog confirm) — 방명록 시트를 dirty 로 만든 뒤 닫기 시도. */
async function openMessageDialogAndMeasure(page, scope) {
  const openBtn = page.locator(`${scope} button`, { hasText: '방명록 남기기' }).first();
  if ((await openBtn.count()) === 0) return { name: 'MessageDialog(Dialog)', opened: false, why: 'guestbook trigger not found' };
  await openBtn.scrollIntoViewIfNeeded().catch(() => {});
  await openBtn.click({ force: true }).catch(() => {});
  await page.waitForTimeout(1300);
  // 미니미를 하나 골라 폼을 dirty 상태로 만든다(nth(0) 은 닫기 버튼).
  const sheetBtns = page.locator('[class*="sheet"] button');
  if ((await sheetBtns.count()) >= 2) {
    await sheetBtns.nth(1).click({ force: true }).catch(() => {});
    await page.waitForTimeout(700);
  }
  const baseline = await page.evaluate(SNAP);
  await page.keyboard.press('Escape').catch(() => {}); // dirty → confirm 이 뜬다
  await page.waitForTimeout(1300);
  const open = await page.evaluate(SNAP);
  const res = finalize('MessageDialog(Dialog)', 'ESC on dirty guestbook', baseline, open, true);
  // 기준 12-c — MessageDialog 는 X 버튼이 없다(`useAutoClose={false}`). 마지막 버튼(`취소`)이 닫기 컨트롤이다.
  res.closeClick = await closeByClick(page);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(700);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(700);
  return res;
}

function finalize(name, triggerText, baseline, open, opened) {
  const res = {
    name, triggerText,
    opened: opened && (open.sheets.length > baseline.sheets.length || open.overlays.length > baseline.overlays.length),
    bodyChildCountBefore: baseline.bodyChildCount, bodyChildCountOpen: open.bodyChildCount,
    screenRect: open.screenRect, sheets: open.sheets, overlays: open.overlays, formFieldRect: open.formFieldRect,
  };
  res.allSheetsContained = open.sheets.length > 0 && open.sheets.every((s) => s.containedInScreen);
  res.allOverlaysWithinScreen =
    open.overlays.length === 0 ||
    open.overlays.every((o) => o.rect.w <= (open.screenRect?.w ?? 0) + 0.5 && o.rect.h <= (open.screenRect?.h ?? 0) + 0.5);
  res.noBodyDirectChild = [...open.sheets, ...open.overlays].every((e) => !e.isBodyDirectChild);
  const ff = open.formFieldRect;
  res.overlayCoversFormField = !!ff && open.overlays.some(
    (o) => o.rect.left <= ff.left && o.rect.right >= ff.right && o.rect.top <= ff.top && o.rect.bottom >= ff.bottom,
  );
  return res;
}

const chromium = await loadChromium();
const browser = await chromium.launch();
const out = { meta: { admin: ADMIN, viewer: VIEWER, at: new Date().toISOString() } };

// ══════════ /apply 미리보기 ══════════
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/apply`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3500);
  const S = '[class*="screen"]';
  const rows = [];

  // 1) ContactInfo Dialog — 홈 섹션 `축하의 말 전하기`(useOverlay)
  rows.push(await openAndMeasure(page, S, 'ContactInfo(Dialog)', '축하의 말 전하기', { closeProbe: true }));

  // 2) 미니룸 탭으로 이동
  const miniRoomOk = await goTab(page, S, '미니룸');
  out.miniRoomTabFound = miniRoomOk;

  // 3) AboutUs BottomSheet — 사용자가 보고한 재현 경로
  rows.push(await openAndMeasure(page, S, 'AboutUs(BottomSheet)', 'About Us!', { closeProbe: true }));
  // 4) GuestBookForm BottomSheet
  rows.push(await openAndMeasure(page, S, 'GuestBookForm(BottomSheet)', '방명록 남기기', { closeProbe: true }));
  // 5) TotalGuestBookList BottomSheet
  rows.push(await openAndMeasure(page, S, 'TotalGuestBookList(BottomSheet)', '전체 보기', { keepOpen: true }));
  // 5-b) 그 안의 GuestBookDeleteDialog (텍스트 없는 아이콘 버튼 → 중첩 모달)
  rows.push(await openNestedAndMeasure(page, 'GuestBookDeleteDialog(Dialog)', '[class*="deleteIconButton"]'));
  // 기준 12-c — 중첩 다이얼로그를 클릭으로 닫으면 #4 만 남는다. 이어서 #4 도 클릭으로 닫는다.
  rows[4].closeClick = await closeByClick(page); // GuestBookDeleteDialog
  rows[3].closeClick = await closeByClick(page); // TotalGuestBookList
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape').catch(() => {});
  await page.waitForTimeout(800);

  // 6) MessageDialog — 방명록 시트를 dirty 로 만든 뒤 닫기 시도하면 confirm 이 뜬다.
  rows.push(await openMessageDialogAndMeasure(page, S));

  out.applyPreview = { rows };
  out.applyPreview.surfaceCount = rows.length;
  out.applyPreview.openedCount = rows.filter((r) => r.opened).length;
  // 기준 12-c — 6표면 전부에서 닫기 컨트롤이 실제로 눌리고 모달이 닫힌다.
  out.applyPreview.closeHitRows = rows.map((r) => ({
    name: r.name,
    kind: r.closeClick?.kind ?? null,
    hitIsCloseControl: r.closeClick?.hitIsCloseControl ?? null,
    btnContainedInScreen: r.closeClick?.btnContainedInScreen ?? null,
    clickClosed: r.closeClick?.clickClosed ?? null,
    hitTag: r.closeClick?.hitTag ?? null,
    pass: r.closeClick?.pass ?? false,
  }));
  out.applyPreview.closeHitPass =
    rows.length === 6 && rows.every((r) => r.closeClick && r.closeClick.pass === true);
  out.applyPreview.pass =
    rows.length === 6 &&
    out.applyPreview.closeHitPass &&
    rows.every(
      (r) =>
        r.opened &&
        r.allSheetsContained &&
        r.allOverlaysWithinScreen &&
        r.noBodyDirectChild &&
        !r.overlayCoversFormField &&
        (r.closedCleanly === undefined || r.closedCleanly === true),
    );
  await page.screenshot({ path: '../shots/s3-modal-apply.png' }).catch(() => {});
  await ctx.close();
}

// ══════════ 뷰어 무회귀 — 포털이 body 직속으로 **남아 있어야** 한다 ══════════
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(`${VIEWER}/`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.locator('body').click({ position: { x: 195, y: 700 } }).catch(() => {});
  await page.waitForTimeout(2500);
  const rows = [];
  rows.push(await openAndMeasure(page, '', 'ContactInfo(Dialog)', '축하의 말 전하기'));
  await goTab(page, '', '미니룸');
  rows.push(await openAndMeasure(page, '', 'AboutUs(BottomSheet)', 'About Us!'));
  rows.push(await openAndMeasure(page, '', 'GuestBookForm(BottomSheet)', '방명록 남기기'));
  rows.push(await openAndMeasure(page, '', 'TotalGuestBookList(BottomSheet)', '전체 보기'));
  out.viewer = { rows };
  // 뷰어의 기대는 **정반대**다: body 직계 자식으로 남고 rect 가 변경 전과 동일해야 한다.
  out.viewer.allBodyDirect = rows.every((r) => !r.opened || [...r.sheets, ...r.overlays].every((e) => e.isBodyDirectChild));
  await ctx.close();
}

await browser.close();
await emit(out, args);

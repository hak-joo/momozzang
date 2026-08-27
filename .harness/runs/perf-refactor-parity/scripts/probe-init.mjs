#!/usr/bin/env node
// probe-init.mjs — 브라우저에 주입할 계측 스니펫을 stdout 으로 출력한다.
//
// 스프린트 2 계약 §4.0(다) 가 요구하는 카운터 4종을 노출한다.
//
//   scrollListenerAdds            addEventListener('scroll', …) 중 this.id === 'main-wrapper'
//   scrollListenerRemoves         removeEventListener('scroll', …) 중 this.id === 'main-wrapper'
//   themeVarSetPropertyCalls      CSSStyleDeclaration.setProperty(name, …) 중 name 이 '--color-' 로 시작
//   themeVarRemovePropertyCalls   CSSStyleDeclaration.removeProperty(name) 중 name 이 '--color-' 로 시작
//
// 기준 B5 는 `scrollListenerAdds`, 기준 B7-b 는 `themeVarRemovePropertyCalls`/`…SetPropertyCalls`,
// 기준 D6 은 `themeVarSetPropertyCalls` 를 읽는다.
//
// ── 스프린트 3 추가분 (계약 3 §1.2 7행 · §2 G-h 3번) ─────────────────────────
//
//   hueCanvasEncodes              HTMLCanvasElement.prototype.toDataURL 호출 수
//   hueCanvasDecodes              CanvasRenderingContext2D.prototype.getImageData 호출 수
//   hueCanvasShapes()             toDataURL 호출별 `${w}x${h}:${dataUrlLen}` 다중집합
//   watchStyle() / readStyle()    뷰어 `main` 의 인라인 `style` 변화 관측기
//
// 기준 M1 은 `hueCanvasEncodes`, M2 는 `hueCanvasShapes()`, M3 은 두 카운터의 구간 증분,
// 기준 V4 는 `readStyle()` 의 `unique` 를 읽는다.
//
// **귀속이 깨끗하다** — `packages/ui`·두 앱 전체에서 이 두 캔버스 API 를 쓰는 곳은
// `useImageHueShift.ts` 한 곳뿐이다(어드민 `resizeImage.ts` 는 `toBlob` 을 쓴다 → 계수 대상 아님).
//
// **주의**: 계약 §4.0(다) 의 지문 수집 스니펫도 `getImageData` 를 호출한다.
// 지문 수집과 M1~M3 을 **같은 세션에서 섞지 말 것** — 지문 수집은 `uninstall()` 이후에,
// 또는 별도 세션에서 한다.
//
// 규약
//  - 파일을 쓰지 않는다. `--help` 는 사용법을 stdout 에 내고 exit 0.
//  - 새 의존성이 없다(Node 내장만).
//  - 카운터는 **주입 후 증분만** 센다. 로드 후 주입하면 마운트 시 변환을 놓쳐 캔버스
//    카운터가 전부 0 이 되므로, M1~M3·V4 는 `page.addInitScript()` 로 **앱 번들 평가 전에**
//    주입한다(계약 3 §0.2 D-e).
//  - 스니펫은 **멱등**이다. 두 번 주입해도 원본 메서드를 이중 래핑하지 않고
//    'already-installed' 를 반환한다.
//  - 기존 카운터 4종의 이름·의미와 `read()`/`short()`/`reset()`/`uninstall()` 의 **외부 계약은
//    불변**이다(계약 3 기준 O3). `short()` 는 여전히 `{set, rm}` 만 반환한다.
//    `read()` 에는 새 카운터 2종이 더해진다(카운터 객체를 그대로 펼치므로).
//  - `hueCanvasShapes` 배열은 **카운터 객체 `c` 밖**에 둔다. `reset()` 이
//    `Object.keys(c).forEach(k => c[k] = 0)` 이라 배열을 `c` 안에 두면 reset 이 배열을 `0`
//    으로 만들어 다음 push 가 터진다(평가자 실측 함정 (i)).
//  - `watchStyle` 은 `addInitScript` 로 **DOM 이전에** 평가되므로 `#main-wrapper` 조회를
//    지연시킨다 — 설치 시 부착을 시도하고, 실패하면 `DOMContentLoaded` 에서 다시 시도한다.
//    부착에 성공하면 `childList` 관측으로 대상이 나타나는 순간의 **초기값도 표본에 담는다**
//    (`MutationObserver` 는 부착 이후 변화만 보므로 초기값을 놓치지 않기 위한 것이다).
//
// 사용
//   node <this>              # 사람이 읽는 형태(여러 줄)로 스니펫을 출력
//   node <this> --oneline    # 한 줄로 출력 (셸 -e 나 page.evaluate 문자열에 그대로 넣을 때)
//   node <this> --help

const HELP = `probe-init.mjs — 브라우저 주입용 계측 스니펫 출력

사용법
  node <this>            스니펫을 여러 줄로 출력한다. Playwright 의
                         page.evaluate(<붙여넣기>) 또는 browser_evaluate 에 그대로 넣는다.
                         M1~M3·V4 는 page.addInitScript(<붙여넣기>) 로 주입한다.
  node <this> --oneline  같은 스니펫을 한 줄로 출력한다.
  node <this> --help

노출 카운터
  (스프린트 2)  scrollListenerAdds / scrollListenerRemoves
                themeVarSetPropertyCalls / themeVarRemovePropertyCalls
  (스프린트 3)  hueCanvasEncodes / hueCanvasDecodes  +  hueCanvasShapes() 다중집합
                watchStyle() / readStyle()  — 뷰어 main 의 인라인 style 관측기

주입 후 사용법 (브라우저 콘솔 / page.evaluate)
  window.__parityProbe.read()      // 카운터 6종
  window.__parityProbe.reset()     // 카운터를 0 으로, 형상·style 표본을 비운다 (구간 측정용)
  window.__parityProbe.short()     // {set, rm} — 계약 2 §4.B B7-b 표기와 같은 축약형 (불변)
  window.__parityProbe.hueCanvasShapes()       // ['24x24:1538', …] 호출 순서 배열
  window.__parityProbe.hueCanvasShapeCounts()  // {'24x24:1538': 4, …} 다중집합
  window.__parityProbe.watchStyle()            // 관측기 부착 (설치 시 자동 1회 시도됨)
  window.__parityProbe.readStyle()             // {attached, hasTarget, samples, unique, uniqueCount}
  window.__parityProbe.uninstall() // 원본 메서드를 되돌리고 관측기를 끊는다

판정 예
  B5: 주입 -> #main-wrapper 5회 스크롤 -> read().scrollListenerAdds
      <BASE> > 0 (인용 4) / HEAD = 0
  D6: 390x844 -> 주입 -> [role="tab"] 3회 왕복 -> read().themeVarSetPropertyCalls
      <BASE> > 0 (인용 120) / F9 커밋 = 0
  B7-b: 주입 -> 스크린 캡처 -> pushState('/login') + PopStateEvent
      -> short() 이 {set:0, rm:20}
  M1: addInitScript 주입 -> /apply 로드 -> 정착 대기 -> read().hueCanvasEncodes
      <BASE> 48 / HEAD < 48
  M2: 같은 로드에서 hueCanvasShapeCounts()
      <BASE> 15종 전부 개수 2 이상 · '24x24:<len>' 개수 4
      HEAD  '24x24:<len>' 개수 1 · 개수 2 이상인 형상 0종
  M3: reset() -> PINK->PURPLE->PINK 왕복 -> 두 번째 PINK 구간의 hueCanvasEncodes 증분
      <BASE> > 0 (인용 24) / HEAD = 0
  V4: addInitScript 주입 -> PINK->PURPLE->PINK 왕복 -> readStyle().unique
      고유 집합 2종(원본 경로 URL · PINK 변환 dataURL) · 그 밖 0건
`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(0);
}
const oneline = argv.includes('--oneline');
for (const a of argv) {
  if (a !== '--oneline') {
    process.stdout.write(`ERROR: 알 수 없는 옵션: ${a}\n`);
    process.exit(2);
  }
}

const SNIPPET = `(() => {
  if (window.__parityProbe) return 'already-installed';
  const c = {
    scrollListenerAdds: 0,
    scrollListenerRemoves: 0,
    themeVarSetPropertyCalls: 0,
    themeVarRemovePropertyCalls: 0,
    hueCanvasEncodes: 0,
    hueCanvasDecodes: 0,
  };
  /* 배열은 c 밖에 둔다 — reset() 이 c 의 값을 전부 0 으로 만들기 때문이다. */
  const shapes = [];
  const styleSamples = [];
  const origAdd = EventTarget.prototype.addEventListener;
  const origRemove = EventTarget.prototype.removeEventListener;
  const origSet = CSSStyleDeclaration.prototype.setProperty;
  const origRemoveProp = CSSStyleDeclaration.prototype.removeProperty;
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  const isMainWrapper = (t) => {
    try { return !!t && t.id === 'main-wrapper'; } catch (e) { return false; }
  };
  const isThemeVar = (n) => typeof n === 'string' && n.indexOf('--color-') === 0;
  EventTarget.prototype.addEventListener = function (type) {
    if (type === 'scroll' && isMainWrapper(this)) c.scrollListenerAdds++;
    return origAdd.apply(this, arguments);
  };
  EventTarget.prototype.removeEventListener = function (type) {
    if (type === 'scroll' && isMainWrapper(this)) c.scrollListenerRemoves++;
    return origRemove.apply(this, arguments);
  };
  CSSStyleDeclaration.prototype.setProperty = function (name) {
    if (isThemeVar(name)) c.themeVarSetPropertyCalls++;
    return origSet.apply(this, arguments);
  };
  CSSStyleDeclaration.prototype.removeProperty = function (name) {
    if (isThemeVar(name)) c.themeVarRemovePropertyCalls++;
    return origRemoveProp.apply(this, arguments);
  };
  HTMLCanvasElement.prototype.toDataURL = function () {
    const outUrl = origToDataURL.apply(this, arguments);
    c.hueCanvasEncodes++;
    try {
      shapes.push(this.width + 'x' + this.height + ':' + (typeof outUrl === 'string' ? outUrl.length : -1));
    } catch (e) { /* 계측이 판정을 막지 않는다 */ }
    return outUrl;
  };
  CanvasRenderingContext2D.prototype.getImageData = function () {
    c.hueCanvasDecodes++;
    return origGetImageData.apply(this, arguments);
  };
  /* ── 뷰어 main 의 인라인 style 관측기 (기준 V4) ───────────────────────── */
  let styleAttached = false;
  let styleObserver = null;
  const viewerMain = () => {
    try {
      const w = document.querySelector('#main-wrapper');
      return w ? w.closest('main') : null;
    } catch (e) { return null; }
  };
  const sample = (el) => {
    if (!el) return;
    let v = '';
    try { v = el.style.backgroundImage || ''; } catch (e) { return; }
    if (v === '') return;
    if (styleSamples.length > 0 && styleSamples[styleSamples.length - 1] === v) return;
    styleSamples.push(v);
  };
  const attachStyle = () => {
    if (styleAttached) return true;
    const root = document.documentElement || document.body;
    if (!root) return false;
    styleObserver = new MutationObserver((records) => {
      for (let i = 0; i < records.length; i++) {
        const t = records[i].target;
        if (records[i].type === 'attributes' && t && t.tagName === 'MAIN') sample(t);
      }
      /* childList 알림으로 대상이 나타나는 순간의 초기값도 담는다. */
      sample(viewerMain());
    });
    styleObserver.observe(root, {
      attributes: true,
      attributeFilter: ['style'],
      subtree: true,
      childList: true,
    });
    styleAttached = true;
    sample(viewerMain());
    return true;
  };
  const watchStyle = () => {
    if (styleAttached) return 'already-watching';
    if (attachStyle()) return 'watching';
    document.addEventListener('DOMContentLoaded', () => { attachStyle(); });
    return 'pending';
  };
  const uniqueStyles = () => {
    const seen = [];
    for (let i = 0; i < styleSamples.length; i++) {
      if (seen.indexOf(styleSamples[i]) < 0) seen.push(styleSamples[i]);
    }
    return seen;
  };
  window.__parityProbe = {
    counters: c,
    read: () => ({ ...c }),
    short: () => ({ set: c.themeVarSetPropertyCalls, rm: c.themeVarRemovePropertyCalls }),
    hueCanvasShapes: () => shapes.slice(),
    hueCanvasShapeCounts: () => {
      const m = {};
      for (let i = 0; i < shapes.length; i++) m[shapes[i]] = (m[shapes[i]] || 0) + 1;
      return m;
    },
    watchStyle: watchStyle,
    readStyle: () => ({
      attached: styleAttached,
      hasTarget: !!viewerMain(),
      samples: styleSamples.slice(),
      unique: uniqueStyles(),
      uniqueCount: uniqueStyles().length,
    }),
    reset: () => {
      Object.keys(c).forEach((k) => { c[k] = 0; });
      shapes.length = 0;
      styleSamples.length = 0;
      return 'reset';
    },
    uninstall: () => {
      EventTarget.prototype.addEventListener = origAdd;
      EventTarget.prototype.removeEventListener = origRemove;
      CSSStyleDeclaration.prototype.setProperty = origSet;
      CSSStyleDeclaration.prototype.removeProperty = origRemoveProp;
      HTMLCanvasElement.prototype.toDataURL = origToDataURL;
      CanvasRenderingContext2D.prototype.getImageData = origGetImageData;
      if (styleObserver) { styleObserver.disconnect(); styleObserver = null; }
      styleAttached = false;
      delete window.__parityProbe;
      return 'uninstalled';
    },
  };
  watchStyle();
  return 'installed';
})()`;

process.stdout.write(
  (oneline ? SNIPPET.replace(/\s*\n\s*/g, ' ') : SNIPPET) + '\n',
);

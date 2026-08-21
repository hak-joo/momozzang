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
// 규약
//  - 파일을 쓰지 않는다. `--help` 는 사용법을 stdout 에 내고 exit 0.
//  - 새 의존성이 없다(Node 내장만).
//  - 카운터는 **주입 후 증분만** 센다. StrictMode 의 마운트 시 호출은 주입 전이라 포함되지 않는다.
//  - 스니펫은 **멱등**이다. 두 번 주입해도 원본 메서드를 이중 래핑하지 않고
//    'already-installed' 를 반환한다.
//
// 사용
//   node <this>              # 사람이 읽는 형태(여러 줄)로 스니펫을 출력
//   node <this> --oneline    # 한 줄로 출력 (셸 -e 나 page.evaluate 문자열에 그대로 넣을 때)
//   node <this> --help

const HELP = `probe-init.mjs — 브라우저 주입용 계측 스니펫 출력

사용법
  node <this>            스니펫을 여러 줄로 출력한다. Playwright 의
                         page.evaluate(<붙여넣기>) 또는 browser_evaluate 에 그대로 넣는다.
  node <this> --oneline  같은 스니펫을 한 줄로 출력한다.
  node <this> --help

노출 카운터 (계약 §4.0(다))
  scrollListenerAdds / scrollListenerRemoves
  themeVarSetPropertyCalls / themeVarRemovePropertyCalls

주입 후 사용법 (브라우저 콘솔 / page.evaluate)
  window.__parityProbe.read()      // {scrollListenerAdds, scrollListenerRemoves,
                                   //  themeVarSetPropertyCalls, themeVarRemovePropertyCalls}
  window.__parityProbe.reset()     // 카운터를 0 으로 되돌린다 (구간 측정용)
  window.__parityProbe.short()     // {set, rm} — 계약 §4.0(라)·§4.B B7-b 표기와 같은 축약형
  window.__parityProbe.uninstall() // 원본 메서드를 되돌린다

판정 예
  B5: 주입 -> #main-wrapper 5회 스크롤 -> read().scrollListenerAdds
      <BASE> > 0 (인용 4) / HEAD = 0
  D6: 390x844 -> 주입 -> [role="tab"] 3회 왕복 -> read().themeVarSetPropertyCalls
      <BASE> > 0 (인용 120) / F9 커밋 = 0
  B7-b: 주입 -> 스크린 캡처 -> pushState('/login') + PopStateEvent
      -> short() 이 {set:0, rm:20}
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
  };
  const origAdd = EventTarget.prototype.addEventListener;
  const origRemove = EventTarget.prototype.removeEventListener;
  const origSet = CSSStyleDeclaration.prototype.setProperty;
  const origRemoveProp = CSSStyleDeclaration.prototype.removeProperty;
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
  window.__parityProbe = {
    counters: c,
    read: () => ({ ...c }),
    short: () => ({ set: c.themeVarSetPropertyCalls, rm: c.themeVarRemovePropertyCalls }),
    reset: () => { Object.keys(c).forEach((k) => { c[k] = 0; }); return 'reset'; },
    uninstall: () => {
      EventTarget.prototype.addEventListener = origAdd;
      EventTarget.prototype.removeEventListener = origRemove;
      CSSStyleDeclaration.prototype.setProperty = origSet;
      CSSStyleDeclaration.prototype.removeProperty = origRemoveProp;
      delete window.__parityProbe;
      return 'uninstalled';
    },
  };
  return 'installed';
})()`;

process.stdout.write(
  (oneline ? SNIPPET.replace(/\s*\n\s*/g, ' ') : SNIPPET) + '\n',
);

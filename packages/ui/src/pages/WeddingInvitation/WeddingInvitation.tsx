import { useRef, useEffect, useMemo, type RefObject } from 'react';
import { clsx } from 'clsx';
import { Header } from '@widgets/invitation/Header';
import { Gallery } from '@widgets/invitation/Gallery';
import type { Menu } from '@entities/WeddingInvitation/menu';
import { useCurrentMenuByScroll } from '@features/lib/hooks/useCurrentMenuByScroll';
import type { WeddingInvitation } from '@entities/WeddingInvitation/model';
import { Home } from '@widgets/invitation/Home';
import { InvitationProvider } from '@entities/WeddingInvitation/Context';
import { SectionContainer } from './SectionContainer';
import { Direction } from '@widgets/invitation/Direction';
import styles from './WeddingInvitation.module.css';
import springImage from '../../shared/assets/images/spring.png';
import { Account } from '@widgets/invitation/Account';
import { Blur } from '@shared/ui/Blur';
import MiniRoom from '@widgets/invitation/MiniRoom';
import { MessageDialogProvider } from '@shared/ui/MessageDialog';
import { getThemeVariables, getThemeHue } from '@shared/styles/utils';
import { useImageHueShift } from '@shared/hooks/useImageHueShift';
import bgBlue from '../../shared/assets/images/bg-blue.png';

interface Props {
  metadata: WeddingInvitation;
  /**
   * 테마 CSS 변수를 주입할 대상 엘리먼트. 미지정 시 `document.body`(기본 청첩장 뷰어 동작).
   * 신청 폼 미리보기처럼 전역 오염 없이 프레임 컨테이너에만 테마를 스코프할 때 사용한다.
   */
  themeScopeRef?: RefObject<HTMLElement | null>;
}
export function WeddingInvitation({ metadata, themeScopeRef }: Props) {
  const homeRef = useRef<HTMLDivElement>(null);
  const miniRoomRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const directionsRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const mainWrapperRef = useRef<HTMLDivElement>(null);

  // `useCurrentMenuByScroll` 의 effect 의존 배열이 이 객체다. 매 렌더 새 객체를 만들면
  // 스크롤 구독이 렌더마다 해제·재등록된다(B6). `useRef` 결과는 렌더 간 동일 객체이므로
  // 의존 목록은 비어 있는 것이 정확하다.
  const sectionRefs = useMemo(
    () =>
      ({
        home: homeRef,
        gallery: galleryRef,
        miniRoom: miniRoomRef,
        directions: directionsRef,
        info: infoRef,
      }) satisfies Record<Menu, RefObject<HTMLDivElement | null>>,
    [],
  );

  const { currentMenu, isAtTop } = useCurrentMenuByScroll(sectionRefs, mainWrapperRef);

  const scrollToMenu = (menu: Menu) => {
    const container = mainWrapperRef.current;
    const target = sectionRefs[menu].current;
    if (!container || !target) return;

    container.scrollTo({
      top: target.offsetTop,
      behavior: 'smooth',
    });
  };

  // 의존 배열에 복합 표현식을 넣지 않기 위해 지역 변수로 추출한다.
  const themeColor = metadata.customization?.themeColor;
  // 테마 CSS 변수 주입 effect 의 의존 배열이 이 객체다. 매 렌더 새 객체면 같은 테마인데도
  // 변수 20개를 매 렌더 지웠다 다시 넣는다(B6). `getThemeVariables` 는 순수하므로
  // 같은 `themeColor` 에 같은 결과다 — 함수 자체는 동결이고 호출부만 안정화한다.
  const themeVars = useMemo(() => getThemeVariables(themeColor), [themeColor]);
  const themeHue = getThemeHue(themeColor);
  const bgImage = useImageHueShift(bgBlue, themeHue);

  useEffect(() => {
    const target = themeScopeRef?.current ?? document.body;
    Object.entries(themeVars).forEach(([key, value]) => {
      target.style.setProperty(key, value as string);
    });

    return () => {
      Object.keys(themeVars).forEach((key) => {
        target.style.removeProperty(key);
      });
    };
  }, [themeVars, themeScopeRef]);

  const scoped = Boolean(themeScopeRef);

  return (
    <MessageDialogProvider>
      <main
        className={clsx(styles.main, scoped && styles.scoped)}
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className={styles.decorator}></div>
        <img src={springImage} alt="" className={styles.springTop} aria-hidden="true" />
        <img src={springImage} alt="" className={styles.springBottom} aria-hidden="true" />
        <Header currentMenu={currentMenu} isAtTop={isAtTop} onMenuClick={scrollToMenu} />
        <div
          id="main-wrapper"
          className={styles.mainWrapper}
          ref={mainWrapperRef}
          data-at-top={isAtTop ? 'true' : 'false'}
        >
          <Blur className={styles.blur} />

          <SectionContainer ref={homeRef}>
            <Home data={metadata} />
          </SectionContainer>

          <SectionContainer ref={miniRoomRef}>
            <MiniRoom />
          </SectionContainer>
          <SectionContainer ref={galleryRef}>
            <Gallery />
          </SectionContainer>

          <SectionContainer ref={directionsRef}>
            <Direction />
          </SectionContainer>

          <SectionContainer ref={infoRef}>
            <Account />
          </SectionContainer>
        </div>
      </main>
    </MessageDialogProvider>
  );
}

import { useRef, useEffect, type RefObject } from 'react';
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

  const sectionRefs = {
    home: homeRef,
    gallery: galleryRef,
    miniRoom: miniRoomRef,
    directions: directionsRef,
    info: infoRef,
  } satisfies Record<Menu, RefObject<HTMLDivElement | null>>;

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

  const themeVars = getThemeVariables(metadata.customization?.themeColor);
  const themeHue = getThemeHue(metadata.customization?.themeColor);
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

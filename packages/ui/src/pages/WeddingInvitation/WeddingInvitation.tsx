import { useRef, type RefObject } from 'react';
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

interface Props {
  metadata: WeddingInvitation;
}
export function WeddingInvitation({ metadata }: Props) {
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

  return (
    <MessageDialogProvider>
      <main className={styles.main}>
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

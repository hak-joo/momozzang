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

interface Props {
  metadata: WeddingInvitation;
}
export function WeddingInvitation({ metadata }: Props) {
  const homeRef = useRef<HTMLDivElement>(null);
  const miniRoomRef = useRef<HTMLDivElement>(null);
  const guestbookRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const directionsRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const mainWrapperRef = useRef<HTMLDivElement>(null);

  const sectionRefs = {
    home: homeRef,
    guestbook: guestbookRef,
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
    <InvitationProvider data={metadata}>
      <main className={styles.main}>
        <div className={styles.decorator}></div>
        <img src={springImage} alt="" className={styles.springTop} aria-hidden="true" />
        <img src={springImage} alt="" className={styles.springBottom} aria-hidden="true" />
        <Header currentMenu={currentMenu} onMenuClick={scrollToMenu} />
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
          <SectionContainer ref={guestbookRef}></SectionContainer>
          <SectionContainer ref={galleryRef}>
            <Gallery
              images={[
                {
                  src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
                  alt: '샘플1',
                },
                {
                  src: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600',
                  alt: '샘플2',
                },
                {
                  src: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600',
                  alt: '샘플3',
                },
                {
                  src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600',
                  alt: '샘플4',
                },
                {
                  src: 'https://images.unsplash.com/photo-1519985176271-adb1088fa94c?w=600',
                  alt: '샘플5',
                },
                {
                  src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600',
                  alt: '샘플6',
                },
                {
                  src: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?w=600',
                  alt: '샘플7',
                },
                {
                  src: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600',
                  alt: '샘플8',
                },
                {
                  src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
                  alt: '샘플9',
                },
                {
                  src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
                  alt: '샘플10',
                },
                {
                  src: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?w=600',
                  alt: '샘플12',
                },
                {
                  src: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600',
                  alt: '샘플13',
                },
                {
                  src: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600',
                  alt: '샘플14',
                },
                {
                  src: 'https://images.unsplash.com/photo-1519985176271-adb1088fa94c?w=600',
                  alt: '샘플15',
                },
                {
                  src: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=600',
                  alt: '샘플16',
                },
                {
                  src: 'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?w=600',
                  alt: '샘플17',
                },
                {
                  src: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=600',
                  alt: '샘플18',
                },
                {
                  src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600',
                  alt: '샘플19',
                },
              ]}
            />
          </SectionContainer>

          <SectionContainer ref={directionsRef}>
            <Direction />
          </SectionContainer>

          <SectionContainer ref={infoRef}>
            <Account />
          </SectionContainer>
        </div>
      </main>
    </InvitationProvider>
  );
}

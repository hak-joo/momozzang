import { useRef } from 'react';
import Header from './components/Header';
import { Menu } from './shared/types';
import useCurrentMenuByScroll from './hooks/useCurrentMenuByScroll';

const SECTION_STYLE: Record<Menu, React.CSSProperties> = {
  home: { height: '100vh', background: '#ffe4e1' },
  guestbook: { height: '100vh', background: '#e0f7fa' },
  gallery: { height: '100vh', background: '#e1bee7' },
  directions: { height: '100vh', background: '#fff9c4' },
};

function Invitation() {
  const homeRef = useRef<HTMLDivElement>(null);
  const guestbookRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const directionsRef = useRef<HTMLDivElement>(null);

  const sectionRefs = {
    home: homeRef,
    guestbook: guestbookRef,
    gallery: galleryRef,
    directions: directionsRef,
  };

  const currentMenu = useCurrentMenuByScroll(sectionRefs);

  // 스크롤 이동 함수
  const scrollToMenu = (menu: Menu) => {
    sectionRefs[menu].current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Header currentMenu={currentMenu} onMenuClick={scrollToMenu} />
      <div ref={homeRef} style={SECTION_STYLE.home}>
        <h2>Home</h2>
      </div>
      <div ref={guestbookRef} style={SECTION_STYLE.guestbook}>
        <h2>Guestbook</h2>
      </div>
      <div ref={galleryRef} style={SECTION_STYLE.gallery}>
        <h2>Gallery</h2>
      </div>
      <div ref={directionsRef} style={SECTION_STYLE.directions}>
        <h2>Directions</h2>
      </div>
    </>
  );
}

export default Invitation;

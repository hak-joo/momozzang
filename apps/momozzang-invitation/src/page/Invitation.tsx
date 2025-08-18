import { useRef } from 'react';
import Header from '../components/Header/index';
import { Menu } from '../shared/types';
import useCurrentMenuByScroll from '../hooks/useCurrentMenuByScroll';
import Gallery from '../components/Gallery/Gallery';

const SECTION_STYLE: Record<Menu, React.CSSProperties> = {
  home: { minHeight: '100vh', background: '#ffe4e1' },
  guestbook: { minHeight: '100vh', background: '#e0f7fa' },
  gallery: { minHeight: '100vh', background: '#e1bee7' },
  directions: { minHeight: '100vh', background: '#fff9c4' },
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

  const scrollToMenu = (menu: Menu) => {
    sectionRefs[menu].current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main>
      <Header currentMenu={currentMenu} onMenuClick={scrollToMenu} />
      <div ref={homeRef} style={SECTION_STYLE.home}>
        <h2>Home</h2>
      </div>
      <div ref={guestbookRef} style={SECTION_STYLE.guestbook}>
        <h2>Guestbook</h2>
      </div>
      <div ref={galleryRef} style={SECTION_STYLE.gallery}>
        <h2>Gallery</h2>
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
          cols={3}
        />
      </div>
      <div ref={directionsRef} style={SECTION_STYLE.directions}>
        <h2>Directions</h2>
      </div>
    </main>
  );
}

export default Invitation;

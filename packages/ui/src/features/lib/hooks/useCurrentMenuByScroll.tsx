import { useEffect, useState, type RefObject } from 'react';
import { Menu } from '@entities/WeddingInvitation/menu';

function useCurrentMenuByScroll(sectionRefs: Record<Menu, RefObject<HTMLDivElement | null>>) {
  const [currentMenu, setCurrentMenu] = useState<Menu>('home');

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY;
      const centerY = scrollY + window.innerHeight / 2;
      let found: Menu = 'home';
      (Object.entries(sectionRefs) as [Menu, RefObject<HTMLDivElement>][]).forEach(
        ([menu, ref]) => {
          if (ref.current) {
            const top = ref.current.offsetTop;
            const height = ref.current.offsetHeight;
            if (centerY >= top && centerY < top + height) found = menu;
          }
        },
      );
      setCurrentMenu(found);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [sectionRefs]);

  return currentMenu;
}

export default useCurrentMenuByScroll;

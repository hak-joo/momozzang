import { useEffect, useState, type RefObject } from 'react';
import { Menu } from '../shared/types';

function useCurrentMenuByScroll(sectionRefs: Record<Menu, RefObject<HTMLDivElement | null>>) {
  const [currentMenu, setCurrentMenu] = useState<Menu>('home');

  useEffect(() => {
    function onScroll() {
      const scrollY = window.scrollY;
      let found: Menu = 'home';
      (Object.entries(sectionRefs) as [Menu, RefObject<HTMLDivElement>][]).forEach(
        ([menu, ref]) => {
          if (ref.current) {
            const top = ref.current.offsetTop;
            if (scrollY >= top - 10) found = menu;
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

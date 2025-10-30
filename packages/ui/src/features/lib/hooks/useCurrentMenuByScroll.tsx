import { useEffect, useState, type RefObject } from 'react';
import type { Menu } from '@entities/WeddingInvitation/menu';

export function useCurrentMenuByScroll(
  sectionRefs: Record<Menu, RefObject<HTMLDivElement | null>>,
  scrollContainerRef?: RefObject<HTMLElement | null>,
) {
  const [currentMenu, setCurrentMenu] = useState<Menu>('home');

  useEffect(() => {
    const scrollTarget: Window | HTMLElement = scrollContainerRef?.current ?? window;

    function onScroll() {
      const container = scrollContainerRef?.current ?? null;
      const scrollTop = container ? container.scrollTop : window.scrollY;
      const viewportHeight = container ? container.clientHeight : window.innerHeight;
      const centerY = scrollTop + viewportHeight / 2;
      const containerRect = container?.getBoundingClientRect();

      let found: Menu = 'home';
      (Object.entries(sectionRefs) as [Menu, RefObject<HTMLDivElement>][]).forEach(
        ([menu, ref]) => {
          const element = ref.current;
          if (!element) return;

          const elementRect = element.getBoundingClientRect();
          const top =
            container && containerRect
              ? elementRect.top - containerRect.top + container.scrollTop
              : elementRect.top + window.scrollY;
          const height = elementRect.height;

          if (centerY >= top && centerY < top + height) found = menu;
        },
      );
      setCurrentMenu(found);
    }

    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => scrollTarget.removeEventListener('scroll', onScroll);
  }, [sectionRefs, scrollContainerRef]);

  return currentMenu;
}

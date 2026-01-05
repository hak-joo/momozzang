import { useCallback, useEffect, useRef } from 'react';

type ScrollTargetResolver = () => HTMLElement | null;

export function useScrollLock(resolveTarget: ScrollTargetResolver) {
  const restoreRef = useRef<{ el: HTMLElement; overflow: string | null } | null>(null);

  const lockScroll = useCallback(() => {
    // 이미 잠금 상태라면 덮어쓰지 않음 (중복 lock 호출 방지)
    if (restoreRef.current) return;

    const el = resolveTarget();
    if (!el) return;
    restoreRef.current = { el, overflow: el.style.overflow || null };
    el.style.overflow = 'hidden';
  }, [resolveTarget]);

  const unlockScroll = useCallback(() => {
    if (!restoreRef.current) return;
    const { el, overflow } = restoreRef.current;
    el.style.overflow = overflow !== null ? overflow : '';
    restoreRef.current = null;
  }, []);

  useEffect(() => unlockScroll, [unlockScroll]);

  return { lockScroll, unlockScroll };
}

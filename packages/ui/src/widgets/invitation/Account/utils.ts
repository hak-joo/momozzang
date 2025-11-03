const SCROLL_PADDING = 24;
const SCROLL_DURATION = 200;

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function smoothScrollWithin(container: HTMLElement, target: HTMLElement) {
  if (prefersReducedMotion()) {
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return;
  }

  if (typeof requestAnimationFrame !== 'function' || typeof performance === 'undefined') {
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    return;
  }

  const computeTargetOffset = () => {
    const { top: targetTop } = target.getBoundingClientRect();
    const { top: containerTop } = container.getBoundingClientRect();
    return targetTop - containerTop + container.scrollTop - SCROLL_PADDING;
  };

  const start = container.scrollTop;
  const initialOffset = computeTargetOffset();
  const startTime = performance.now();

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / SCROLL_DURATION);
    const easedProgress = easeOutCubic(progress);
    const currentOffset = computeTargetOffset();
    const baseOffset = progress < 1 ? currentOffset : initialOffset;
    const next = start + (baseOffset - start) * easedProgress;
    container.scrollTop = next;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      container.scrollTop = computeTargetOffset();
    }
  };

  requestAnimationFrame(step);
}

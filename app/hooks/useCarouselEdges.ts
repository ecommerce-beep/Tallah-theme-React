import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import { measureEdges, sameEdges, UNMEASURED } from '../lib/carouselScroll';
import type { CarouselEdges } from '../lib/carouselScroll';

/**
 * Tracks whether a scroll row overflows and which edge it is at, so its arrows can hide when
 * there is nothing to scroll and disable at the ends. `key` re-attaches the observers when the
 * row's contents change (e.g. the products arrive after the row mounts).
 */
export function useCarouselEdges(ref: RefObject<HTMLElement | null>, key: unknown): CarouselEdges {
  const [edges, setEdges] = useState<CarouselEdges>(UNMEASURED);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const next = measureEdges(el);
      setEdges((prev) => (sameEdges(prev, next) ? prev : next));
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    if (typeof ResizeObserver === 'undefined') return () => el.removeEventListener('scroll', update);
    // The row itself resizes with the viewport; its slides change `scrollWidth` without resizing it.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [ref, key]);

  return edges;
}

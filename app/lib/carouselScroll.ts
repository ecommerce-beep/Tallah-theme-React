export interface CarouselEdges {
  /** More content than the row shows, so the arrows have somewhere to go. */
  scrollable: boolean;
  atStart: boolean;
  atEnd: boolean;
}

/** Before layout (SSR, jsdom) nothing can be measured: leave both arrows live rather than guess they are useless. */
export const UNMEASURED: CarouselEdges = { scrollable: true, atStart: false, atEnd: false };

/** Which edges a scroll row is at. `scrollLeft` is negative in RTL, hence `abs`. */
export function measureEdges(el: HTMLElement): CarouselEdges {
  if (!el.scrollWidth && !el.clientWidth) return UNMEASURED;
  const max = el.scrollWidth - el.clientWidth;
  const pos = Math.abs(el.scrollLeft);
  return { scrollable: max > 1, atStart: pos <= 1, atEnd: pos >= max - 1 };
}

/** One slide plus the row's real gap (it changes by breakpoint, so it is read, not hardcoded). */
export function slideStep(el: HTMLElement, fallbackWidth = el.clientWidth * 0.8): number {
  const first = el.firstElementChild as HTMLElement | null;
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
  return (first?.offsetWidth || fallbackWidth) + gap;
}

export const sameEdges = (a: CarouselEdges, b: CarouselEdges) =>
  a.scrollable === b.scrollable && a.atStart === b.atStart && a.atEnd === b.atEnd;

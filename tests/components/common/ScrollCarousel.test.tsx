import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { ScrollCarousel } from '../../../app/components/common/ScrollCarousel';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));

afterEach(() => {
  cleanup();
  document.documentElement.dir = '';
  vi.restoreAllMocks();
});

/** Renders a carousel in `dir` and returns the `left` each arrow scrolls by. */
function arrowScroll(dir: 'ltr' | 'rtl') {
  document.documentElement.dir = dir;
  document.documentElement.style.direction = dir;
  const scrollBy = vi.fn();
  Element.prototype.scrollBy = scrollBy as unknown as typeof Element.prototype.scrollBy;
  // jsdom has no layout: give a slide a width so the step (slide + gap) is not 0.
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100);
  const { getByLabelText } = render(
    <ScrollCarousel prevLabel="Previous" nextLabel="Next">
      <div>1</div>
      <div>2</div>
    </ScrollCarousel>
  );
  fireEvent.click(getByLabelText('Previous'));
  fireEvent.click(getByLabelText('Next'));
  return scrollBy.mock.calls.map(([options]) => Math.sign((options as ScrollToOptions).left ?? 0));
}

describe('ScrollCarousel arrows', () => {
  it('scroll back then forward in LTR (towards smaller, then larger scrollLeft)', () => {
    expect(arrowScroll('ltr')).toEqual([-1, 1]);
  });

  it('scroll back then forward in RTL (towards larger, then smaller scrollLeft)', () => {
    expect(arrowScroll('rtl')).toEqual([1, -1]);
  });
});

describe('ScrollCarousel edges', () => {
  /** jsdom has no layout: report a row `scrollWidth` wide inside a `clientWidth` viewport. */
  function renderRow(scrollWidth: number, clientWidth: number) {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
    return render(
      <ScrollCarousel prevLabel="Previous" nextLabel="Next">
        <div>1</div>
        <div>2</div>
      </ScrollCarousel>
    );
  }

  it('shows no arrows when the slides fit the row', () => {
    const { queryByLabelText } = renderRow(300, 300);
    expect(queryByLabelText('Previous')).toBeNull();
    expect(queryByLabelText('Next')).toBeNull();
  });

  it('disables previous at the start and keeps next live when there is more to scroll', () => {
    const { getByLabelText } = renderRow(900, 300);
    expect((getByLabelText('Previous') as HTMLButtonElement).disabled).toBe(true);
    expect((getByLabelText('Next') as HTMLButtonElement).disabled).toBe(false);
  });
});

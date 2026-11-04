import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { ArHeroSection } from '../../../app/components/home/ArHeroSection';

const state = vi.hoisted(() => ({
  locale: 'ar',
  onAfterInit: undefined as undefined | ((event: { detail: unknown }) => void),
  sliderProps: {} as Record<string, unknown>,
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: state.locale, t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, ...rest }: { to: string; children?: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

// The real slider is a web component: keep its props (config, autoplay, the init event) visible.
vi.mock('@salla.sa/twilight-components-react/slider', () => ({
  SallaSlider: (props: Record<string, unknown>) => {
    state.sliderProps = props;
    state.onAfterInit = props.onAfterInit as typeof state.onAfterInit;
    return <div data-testid="slider">{props.children as React.ReactNode}</div>;
  },
}));

const banner = (over: Record<string, unknown> = {}) => ({
  desktop_bg: 'https://cdn.example/d.webp',
  mobile_bg: 'https://cdn.example/m.webp',
  items_alignment: [{ value: 'center' }],
  items_alignment_vertical: [{ value: 'center' }],
  block_title: 'اكتشف الفخامة',
  blocktitle_color: '#ffffff',
  subtext: 'إعادة تعريف الأناقة',
  subtext_color: '#ffffff',
  transparent_button: true,
  button_bottom: false,
  button_text: 'تسوق الآن',
  button_text_color: '#FAFAFA',
  button_bg: '#262626',
  url: 'https://store.example/c1',
  ...over,
});

const slides = (c: HTMLElement) => [...c.querySelectorAll('.ar-hero-slider__banner')] as HTMLElement[];

function fakeSwiper(running = true) {
  const handlers: Record<string, () => void> = {};
  const autoplay = {
    running,
    start: vi.fn(() => {
      autoplay.running = true;
      handlers.autoplayStart?.();
    }),
    stop: vi.fn(() => {
      autoplay.running = false;
      handlers.autoplayStop?.();
    }),
  };
  return {
    autoplay,
    params: { autoplay: { delay: 2000 } },
    on: vi.fn((event: string, fn: () => void) => {
      handlers[event] = fn;
    }),
    off: vi.fn((event: string) => {
      delete handlers[event];
    }),
  };
}

function reducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce') ? matches : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

beforeEach(() => {
  state.locale = 'ar';
  reducedMotion(false);
});

afterEach(() => {
  state.onAfterInit = undefined;
});

describe('ArHeroSection', () => {
  it('renders nothing without banners', () => {
    const { container } = render(<ArHeroSection data={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a slide per banner with its title as an h2, text and button', () => {
    const { container } = render(
      <ArHeroSection data={{ position: 2, banner: [banner(), banner({ block_title: 'عروض', button_text: 'اكتشف' })] }} />
    );
    expect(container.querySelector('section')?.className).toContain('AR-slider-hero-section-2');
    const items = slides(container);
    expect(items).toHaveLength(2);
    expect(items[0].className).toContain('swiper-slide');
    expect(items[0].querySelector('h2')?.textContent).toBe('اكتشف الفخامة');
    expect(items[0].querySelector('h2')?.getAttribute('data-swiper-parallax')).toBe('-700');
    expect(items[1].querySelector('h2')?.textContent).toBe('عروض');
    expect(items[1].querySelector('a.button')?.textContent).toBe('اكتشف');
  });

  it('configures the slider like the Twig: loop, parallax, bullets, and autoplay only for several banners', () => {
    render(<ArHeroSection data={{ position: 4, banner: [banner(), banner()] }} />);
    const config = state.sliderProps.sliderConfig as Record<string, unknown>;
    expect(state.sliderProps.autoPlay).toBe(true);
    expect(state.sliderProps.showControls).toBe(false);
    expect(config).toMatchObject({
      parallax: true,
      loop: true,
      speed: 1000,
      spaceBetween: 0,
      autoplay: { delay: 2000, disableOnInteraction: false, pauseOnMouseEnter: true },
      pagination: { el: '.AR-slider-hero-section-4 .swiper-pagination', type: 'bullets', clickable: true },
    });

    render(<ArHeroSection data={{ banner: [banner()] }} />);
    expect(state.sliderProps.autoPlay).toBe(false);
    expect((state.sliderProps.sliderConfig as Record<string, unknown>).autoplay).toBeUndefined();
  });

  it('aligns each banner from its own settings; an unknown horizontal value reads as the end', () => {
    const { container } = render(
      <ArHeroSection
        data={{
          banner: [
            banner(),
            banner({ items_alignment: 'start', items_alignment_vertical: [{ value: 'start' }] }),
            banner({ items_alignment: undefined, items_alignment_vertical: 'end' }),
          ],
        }}
      />
    );
    const wrap = (el: HTMLElement) => el.querySelector('.text-wrapper')?.className ?? '';
    const [a, b, c] = slides(container);
    expect(wrap(a)).toContain('text-center items-center');
    expect(wrap(a)).toContain('justify-center');
    expect(wrap(b)).toContain('text-start items-start');
    expect(wrap(b)).toContain('justify-start');
    expect(wrap(c)).toContain('text-end items-end');
    expect(wrap(c)).toContain('justify-end');
  });

  it('puts the button under the text, or at the bottom of the banner with button_bottom', () => {
    const { container } = render(
      <ArHeroSection data={{ banner: [banner(), banner({ button_bottom: true })] }} />
    );
    const [inline, bottom] = slides(container);
    expect(inline.querySelector('.position a.button')).toBeTruthy();
    expect(bottom.querySelector('.position a.button')).toBeNull();
    expect(bottom.querySelector(':scope > a.button')?.className).toContain('mt-auto');
  });

  it('exposes backgrounds and per-banner colors, and the mobile scrim only for default light text', () => {
    const { container } = render(
      <ArHeroSection
        data={{ banner: [banner(), banner({ blocktitle_color: '#112233', button_bg: '#b3261e', transparent_button: false })] }}
      />
    );
    const [a, b] = slides(container);
    expect(a.style.getPropertyValue('--ar-bg-desktop')).toBe('url("https://cdn.example/d.webp")');
    expect(a.style.getPropertyValue('--ar-bg-mobile')).toBe('url("https://cdn.example/m.webp")');
    expect(a.className).toContain('ar-hero-slider__banner--scrim');
    expect(b.className).not.toContain('ar-hero-slider__banner--scrim');
    expect((b.querySelector('h2') as HTMLElement).style.color).toBe('rgb(17, 34, 51)');
    expect((b.querySelector('a.button') as HTMLElement).style.getPropertyValue('--ar-btn-bg')).toBe('#b3261e');
    expect(b.querySelector('.ar-btn--transparent')).toBeNull();
  });

  it('uses the desktop image on phones for a banner with no phone image, instead of a blank slide', () => {
    const { container } = render(
      <ArHeroSection data={{ banner: [banner(), banner({ mobile_bg: '' })] }} />
    );
    const [withPhone, withoutPhone] = slides(container);
    expect(withPhone.style.getPropertyValue('--ar-bg-mobile')).toBe('url("https://cdn.example/m.webp")');
    expect(withoutPhone.style.getPropertyValue('--ar-bg-mobile')).toBe('url("https://cdn.example/d.webp")');
  });

  it('marks only the bottom button, which is the one lifted above the bottom bar', () => {
    const { container } = render(
      <ArHeroSection data={{ banner: [banner(), banner({ button_bottom: true })] }} />
    );
    const [inline, bottom] = slides(container);
    expect(inline.querySelector('.ar-hero-slider__cta--bottom')).toBeNull();
    expect(bottom.querySelector('a.button')?.className).toContain('ar-hero-slider__cta--bottom');
  });

  it('makes the whole banner the link when it has no button', () => {
    const { container } = render(<ArHeroSection data={{ banner: [banner({ button_text: '' })] }} />);
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(container.querySelector('a.button')).toBeNull();
    expect(link.getAttribute('href')).toBe('https://store.example/c1');
    expect(link.getAttribute('aria-label')).toBe('اكتشف الفخامة');
  });

  it('draws the bullets container, and reads per-language text', () => {
    state.locale = 'en';
    const { container } = render(
      <ArHeroSection data={{ banner: [banner({ block_title: { ar: 'عنوان', en: 'Title' } })] }} />
    );
    expect(container.querySelector('.swiper-pagination')).toBeTruthy();
    expect(container.querySelector('h2')?.textContent).toBe('Title');
  });
});

describe('ArHeroSection pause / play', () => {
  const two = { banner: [banner(), banner()] };

  it('has no control for a single banner', () => {
    const { container } = render(<ArHeroSection data={{ banner: [banner()] }} />);
    expect(container.querySelector('.hero-autoplay-toggle')).toBeNull();
  });

  it('keeps the control hidden until the slider is up, then offers to pause', () => {
    const { container } = render(<ArHeroSection data={two} />);
    const button = container.querySelector('.hero-autoplay-toggle') as HTMLButtonElement;
    expect(button.hidden).toBe(true);
    act(() => state.onAfterInit?.({ detail: fakeSwiper() }));
    expect(button.hidden).toBe(false);
    expect(button.getAttribute('aria-label')).toBe('Pause automatic slide show');
  });

  it('stops and restarts the slide show, and the label follows', () => {
    const swiper = fakeSwiper();
    const { container } = render(<ArHeroSection data={two} />);
    act(() => state.onAfterInit?.({ detail: swiper }));
    const button = container.querySelector('.hero-autoplay-toggle') as HTMLButtonElement;

    fireEvent.click(button);
    expect(swiper.autoplay.stop).toHaveBeenCalled();
    expect(button.getAttribute('aria-label')).toBe('Resume automatic slide show');

    fireEvent.click(button);
    expect(swiper.autoplay.start).toHaveBeenCalled();
    expect(button.getAttribute('aria-label')).toBe('Pause automatic slide show');
  });

  it('stops the slide show on load when the system asks for reduced motion', () => {
    reducedMotion(true);
    const swiper = fakeSwiper();
    render(<ArHeroSection data={two} />);
    act(() => state.onAfterInit?.({ detail: swiper }));
    expect(swiper.autoplay.stop).toHaveBeenCalled();
  });

  it('shows no control when the slider has no autoplay', () => {
    const swiper = { ...fakeSwiper(), params: {} };
    const { container } = render(<ArHeroSection data={two} />);
    act(() => state.onAfterInit?.({ detail: swiper }));
    expect((container.querySelector('.hero-autoplay-toggle') as HTMLButtonElement).hidden).toBe(true);
  });
});

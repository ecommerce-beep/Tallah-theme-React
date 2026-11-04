import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ArHero2 } from '../../../app/components/home/ArHero2';

const state = vi.hoisted(() => ({ locale: 'ar' }));

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

const section = (c: HTMLElement) => c.querySelector('section') as HTMLElement;
const banner = (c: HTMLElement) => c.querySelector('.ar-hero2__banner') as HTMLElement;

const full = {
  desktop_bg: 'https://cdn.example/desktop.webp',
  mobile_bg: 'https://cdn.example/mobile.webp',
  block_title: 'عروض حصرية لك',
  subtext: 'اكتشف المجموعة',
  button_text: 'تسوق الآن',
  url: 'https://store.example/offers',
  position: 5,
};

describe('ArHero2', () => {
  it('renders the title as an h2, the subtext, and a bottom button linking to the merchant URL', () => {
    const { container } = render(<ArHero2 data={full} />);
    expect(container.querySelector('h2')?.textContent).toBe('عروض حصرية لك');
    expect(container.querySelector('p.subtext')?.textContent).toBe('اكتشف المجموعة');
    const button = container.querySelector('a.button') as HTMLAnchorElement;
    expect(button.textContent).toBe('تسوق الآن');
    expect(button.getAttribute('href')).toBe('https://store.example/offers');
    expect(button.className).toContain('mt-auto');
    expect(section(container).className).toContain('AR-hero-section-5');
  });

  it('exposes the desktop and mobile backgrounds as CSS variables', () => {
    const { container } = render(<ArHero2 data={full} />);
    const style = section(container).style;
    expect(style.getPropertyValue('--ar-hero-desktop-bg')).toBe('url("https://cdn.example/desktop.webp")');
    expect(style.getPropertyValue('--ar-hero-mobile-bg')).toBe('url("https://cdn.example/mobile.webp")');
  });

  it('never turns an unsafe background address into CSS', () => {
    const { container } = render(
      <ArHero2 data={{ ...full, desktop_bg: 'javascript:alert(1)', mobile_bg: 'https://x/a")b.webp' }} />
    );
    const style = section(container).style;
    expect(style.getPropertyValue('--ar-hero-desktop-bg')).toBe('');
    expect(style.getPropertyValue('--ar-hero-mobile-bg')).toBe('url("https://x/a\\")b.webp")');
  });

  it('applies the merchant colors and leaves unset ones to the theme', () => {
    const { container } = render(
      <ArHero2
        data={{ ...full, blocktitle_color: '#112233', subtext_color: '', button_text_color: '#fafafa', button_bg: '#262626' }}
      />
    );
    const style = section(container).style;
    expect(style.getPropertyValue('--ar-hero-title-color')).toBe('#112233');
    expect(style.getPropertyValue('--ar-hero-subtext-color')).toBe('');
    expect(style.getPropertyValue('--ar-hero-btn-color')).toBe('#fafafa');
    expect(style.getPropertyValue('--ar-hero-btn-bg')).toBe('#262626');
  });

  it('marks the button transparent only when the setting is on', () => {
    const off = render(<ArHero2 data={full} />).container;
    expect(off.querySelector('.ar-hero2__button--transparent')).toBeNull();
    const on = render(<ArHero2 data={{ ...full, transparent_button: true }} />).container;
    expect(on.querySelector('.ar-hero2__button--transparent')).toBeTruthy();
  });

  it('aligns the text from a string or a dropdown value, defaulting to the center', () => {
    const wrapper = (c: HTMLElement) => c.querySelector('.text-wrapper') as HTMLElement;
    expect(wrapper(render(<ArHero2 data={full} />).container).className).toContain('text-center items-center');
    expect(wrapper(render(<ArHero2 data={{ ...full, items_alignment: 'start' }} />).container).className).toContain(
      'text-start items-start'
    );
    expect(
      wrapper(render(<ArHero2 data={{ ...full, items_alignment: [{ value: 'end' }] }} />).container).className
    ).toContain('text-end items-end');
  });

  it('adds the mobile scrim only while the text keeps its default light color', () => {
    expect(banner(render(<ArHero2 data={full} />).container).className).toContain('ar-hero2__banner--scrim');
    expect(
      banner(render(<ArHero2 data={{ ...full, blocktitle_color: '#FFFFFF', subtext_color: '#fff' }} />).container)
        .className
    ).toContain('ar-hero2__banner--scrim');
    expect(
      banner(render(<ArHero2 data={{ ...full, blocktitle_color: '#000000' }} />).container).className
    ).not.toContain('ar-hero2__banner--scrim');
    expect(
      banner(render(<ArHero2 data={{ ...full, subtext_color: '#FAFAFA' }} />).container).className
    ).not.toContain('ar-hero2__banner--scrim');
    expect(
      banner(render(<ArHero2 data={{ desktop_bg: full.desktop_bg }} />).container).className
    ).not.toContain('ar-hero2__banner--scrim');
  });

  it('makes the whole banner the link when there is no button text', () => {
    const { container } = render(<ArHero2 data={{ ...full, button_text: '' }} />);
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(container.querySelector('a.button')).toBeNull();
    expect(link.getAttribute('href')).toBe('https://store.example/offers');
    expect(link.getAttribute('aria-label')).toBe('عروض حصرية لك');
    expect(link.className).toContain('inset-0');
  });

  it('renders no link at all when there is neither a button nor a URL', () => {
    const { container } = render(<ArHero2 data={{ ...full, button_text: '', url: '' }} />);
    expect(container.querySelector('a')).toBeNull();
  });

  it('reads per-language text for the current locale', () => {
    state.locale = 'en';
    const { container } = render(
      <ArHero2 data={{ ...full, block_title: { ar: 'عنوان', en: 'Title' }, button_text: { ar: 'زر', en: 'Shop' } }} />
    );
    expect(container.querySelector('h2')?.textContent).toBe('Title');
    expect(container.querySelector('a.button')?.textContent).toBe('Shop');
    state.locale = 'ar';
  });

  it('omits the title and subtext elements when they are empty', () => {
    const { container } = render(<ArHero2 data={{ ...full, block_title: '  ', subtext: undefined }} />);
    expect(container.querySelector('h2')).toBeNull();
    expect(container.querySelector('p.subtext')).toBeNull();
  });
});

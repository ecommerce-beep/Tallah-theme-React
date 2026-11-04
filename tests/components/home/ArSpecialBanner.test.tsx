import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ArSpecialBanner } from '../../../app/components/home/ArSpecialBanner';

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

const banner = (over: Record<string, unknown> = {}) => ({
  desktop_bg: 'https://cdn.example/d1.webp',
  mobile_bg: 'https://cdn.example/m1.webp',
  block_title: 'تشكيلة الشتاء',
  blocktitle_color: '#ffffff',
  subtext: 'ارتدِ أناقة معطف',
  subtext_color: '#FAFAFA',
  button_text: 'تسوق الآن',
  button_text_color: '#FAFAFA',
  button_bg: '#262626',
  transparent_button: true,
  url: 'https://store.example/c1',
  ...over,
});

const banners = (c: HTMLElement) => [...c.querySelectorAll('.ar-special__banner')] as HTMLElement[];

describe('ArSpecialBanner', () => {
  it('renders one banner per item, each with its own title, text and button', () => {
    const { container } = render(
      <ArSpecialBanner
        data={{ position: 3, banner: [banner(), banner({ block_title: 'الأساسيات', button_text: 'اكتشف' })] }}
      />
    );
    expect(container.querySelector('section')?.className).toContain('Ar-special-banner-3');
    const items = banners(container);
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('h2')?.textContent).toBe('تشكيلة الشتاء');
    expect(items[1].querySelector('h2')?.textContent).toBe('الأساسيات');
    expect(items[1].querySelector('a.button')?.textContent).toBe('اكتشف');
    expect(items[0].className).toContain('md:w-1/2');
  });

  it('puts both backgrounds on each banner as variables', () => {
    const { container } = render(<ArSpecialBanner data={{ banner: [banner()] }} />);
    const style = banners(container)[0].style;
    expect(style.getPropertyValue('--ar-bg-desktop')).toBe('url("https://cdn.example/d1.webp")');
    expect(style.getPropertyValue('--ar-bg-mobile')).toBe('url("https://cdn.example/m1.webp")');
  });

  it('uses the desktop image on phones too when a banner has no mobile image', () => {
    const { container } = render(<ArSpecialBanner data={{ banner: [banner({ mobile_bg: '' })] }} />);
    expect(banners(container)[0].style.getPropertyValue('--ar-bg-mobile')).toBe(
      'url("https://cdn.example/d1.webp")'
    );
  });

  it('colors each banner from its own settings, and leaves unset colors to the theme', () => {
    const { container } = render(
      <ArSpecialBanner
        data={{
          banner: [banner({ blocktitle_color: '#112233' }), banner({ blocktitle_color: '', subtext_color: '' })],
        }}
      />
    );
    const [first, second] = banners(container);
    expect((first.querySelector('h2') as HTMLElement).style.color).toBe('rgb(17, 34, 51)');
    expect((second.querySelector('h2') as HTMLElement).style.color).toBe('');
    expect((second.querySelector('p.subtext') as HTMLElement).style.color).toBe('');
  });

  it('gives each button its own colors and the transparent modifier only when set', () => {
    const { container } = render(
      <ArSpecialBanner
        data={{
          banner: [banner(), banner({ transparent_button: false, button_text_color: '#fff', button_bg: '#b3261e' })],
        }}
      />
    );
    const [a, b] = [...container.querySelectorAll('a.button')] as HTMLElement[];
    expect(a.className).toContain('ar-btn--transparent');
    expect(a.style.getPropertyValue('--ar-btn-bg')).toBe('#262626');
    expect(b.className).not.toContain('ar-btn--transparent');
    expect(b.style.getPropertyValue('--ar-btn-bg')).toBe('#b3261e');
  });

  it('makes the whole banner the link when it has no button, labelled by its title', () => {
    const { container } = render(<ArSpecialBanner data={{ banner: [banner({ button_text: '' })] }} />);
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(container.querySelector('a.button')).toBeNull();
    expect(link.getAttribute('href')).toBe('https://store.example/c1');
    expect(link.getAttribute('aria-label')).toBe('تشكيلة الشتاء');
  });

  it('draws no link for a banner with neither a button nor an address, and never an unsafe one', () => {
    const none = render(<ArSpecialBanner data={{ banner: [banner({ button_text: '', url: '' })] }} />).container;
    expect(none.querySelector('a')).toBeNull();
    const unsafe = render(<ArSpecialBanner data={{ banner: [banner({ url: 'javascript:alert(1)' })] }} />).container;
    expect(unsafe.querySelector('a.button')?.getAttribute('href')).toBe('#');
  });

  it('reads per-language text for the current locale', () => {
    state.locale = 'en';
    const { container } = render(
      <ArSpecialBanner data={{ banner: [banner({ block_title: { ar: 'عنوان', en: 'Title' } })] }} />
    );
    expect(container.querySelector('h2')?.textContent).toBe('Title');
    state.locale = 'ar';
  });

  it('renders an empty row without banners', () => {
    const { container } = render(<ArSpecialBanner data={{}} />);
    expect(banners(container)).toHaveLength(0);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  dropdownValue,
  useTallahSettings,
} from '../../../../app/components/layout/tallah/settings';

const state = { settings: {} as Record<string, unknown>, locale: 'ar' };

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: state.settings }, store: {} }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: state.locale, t: (_k: string, fb?: string) => fb ?? _k }),
}));

const read = (settings: Record<string, unknown>, locale = 'ar') => {
  state.settings = settings;
  state.locale = locale;
  return renderHook(() => useTallahSettings()).result.current;
};

describe('dropdownValue', () => {
  it('reads a string or the first { value }', () => {
    expect(dropdownValue('large')).toBe('large');
    expect(dropdownValue([{ value: 'small' }])).toBe('small');
    expect(dropdownValue(undefined)).toBe('');
  });
});

describe('useTallahSettings', () => {
  it('uses the defaults of twilight.json when nothing is saved', () => {
    const s = read({});
    expect(s.headerBg).toBe('#ffffff');
    expect(s.headerText).toBe('#000000');
    expect(s.hover).toBe(true);
    expect(s.sticky).toBe(true);
    expect(read({ header_is_sticky: false }).sticky).toBe(false);
    expect(s.advancedMenu).toBe(false);
    expect(s.secondaryLogo).toBe('');
    expect(s.cartIcon).toBe('cart_1');
    expect(s.footerLogoSize).toBe('medium');
    expect(s.newsletter.show).toBe(true);
  });

  it('uses the saved colors and switches', () => {
    const s = read({
      'header-background-color': '#111111',
      'header-text-color': '#eeeeee',
      'header-hover': false,
      'advanced-menu': true,
      cart_icon_choose: true,
      cart_icon_type: [{ value: 'cart_3' }],
      newsletter_view: false,
    });
    expect(s.headerBg).toBe('#111111');
    expect(s.headerText).toBe('#eeeeee');
    expect(s.hover).toBe(false);
    expect(s.advancedMenu).toBe(true);
    expect(s.cartIcon).toBe('cart_3');
    expect(s.newsletter.show).toBe(false);
  });

  it('ignores the cart icon type while its switch is off', () => {
    expect(read({ cart_icon_choose: false, cart_icon_type: 'cart_4' }).cartIcon).toBe('cart_1');
  });

  it('shows the secondary logo only when it is on and has an image', () => {
    expect(read({ add_another_logo: true, another_logo_img: 'https://x/2.png' }).secondaryLogo).toBe(
      'https://x/2.png'
    );
    expect(read({ add_another_logo: false, another_logo_img: 'https://x/2.png' }).secondaryLogo).toBe('');
    expect(read({ add_another_logo: true }).secondaryLogo).toBe('');
  });

  it('reads trending keywords and popular categories, bare or prefixed, per language', () => {
    const s = read(
      {
        'trending-search-keywords': [
          { 'search-keyword': { ar: 'عطر', en: 'perfume' } },
          { 'trending-search-keywords.search-keyword': { en: 'oud' } },
          { 'search-keyword': { en: '   ' } },
        ],
        popular_categories: [
          { popular_categories_image: 'https://x/a.png', popular_categories_link: 'https://x/c1' },
          { 'popular_categories.popular_categories_image': { url: 'https://x/b.png' } },
          { popular_categories_image: '' },
        ],
      },
      'en'
    );
    expect(s.trending.map((k) => k.keyword)).toEqual(['perfume', 'oud']);
    expect(s.popular).toEqual([
      { image: 'https://x/a.png', link: 'https://x/c1' },
      { image: 'https://x/b.png', link: '' },
    ]);
  });

  it('reads the announcement bar per language, refusing unsafe links and icon classes', () => {
    const s = read({
      'header-topnav-text': { ar: 'نص', en: 'text' },
      header_topnav_link_url: 'javascript:alert(1)',
      header_topnav_icon_url: 'sicon-store" onload="x',
    });
    expect(s.topLace.text).toBe('نص');
    expect(s.topLace.href).toBe('');
    expect(s.topLace.icon).toBe('');
    expect(s.topLace.bg).toBe('var(--600, #000)');
  });
});

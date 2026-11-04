import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { TopLace } from '../../../../app/components/layout/tallah/TopLace';

const state = { settings: {} as Record<string, unknown> };

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: state.settings }, store: {} }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: 'ar', t: (_k: string, fb?: string) => fb ?? _k }),
}));

beforeEach(() => {
  state.settings = {};
});

describe('TopLace', () => {
  it('is always drawn, as the Twig strip is, with the default color when nothing is set', () => {
    const { container } = render(<TopLace />);
    const bar = container.querySelector<HTMLElement>('.tallah-top-lace')!;
    expect(bar).not.toBeNull();
    expect(bar.style.background).toContain('var(--600');
  });

  it('centers its parts in one row: countdown, text, highlighted text, icon', () => {
    state.settings = { 'header-topnav-text': 'A', 'header-topnav-special-text': 'B', 'header-topnav-count-down': '2999-01-01T00:00:00Z' };
    const row = render(<TopLace />).container.querySelector('.tallah-top-lace__row')!;
    expect([...row.children].map((c) => c.className.split(' ')[0])).toEqual([
      'tallah-top-lace__countdown',
      'tallah-top-lace__text',
      'tallah-top-lace__special',
      'tallah-top-lace__icon-box',
    ]);
  });

  it('shows the text and the highlighted text in their colors', () => {
    state.settings = {
      'header-topnav-background': '#004956',
      'header-topnav-text-color': '#ffffff',
      'header-topnav-text': { ar: 'شحن مجاني', en: 'Free shipping' },
      'header-topnav-special-text': { ar: 'خصم 20%' },
      'header-topnav-special-text-color': '#ff0000',
    };
    const { container, getByText } = render(<TopLace />);
    expect(getByText('شحن مجاني')).toBeTruthy();
    const special = getByText('خصم 20%');
    expect(special.style.color).toBe('rgb(255, 0, 0)');
    const bar = container.querySelector<HTMLElement>('.tallah-top-lace')!;
    expect(bar.style.background).toBe('rgb(0, 73, 86)');
    expect(bar.style.color).toBe('rgb(255, 255, 255)');
  });

  it('makes the whole bar a link, opening in a new tab, when a link is set', () => {
    state.settings = {
      'header-topnav-text': 'Sale',
      header_topnav_link_url: 'https://example.com/sale',
    };
    const { container } = render(<TopLace />);
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('https://example.com/sale');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('does not link to a javascript: url', () => {
    state.settings = { 'header-topnav-text': 'Sale', header_topnav_link_url: 'javascript:alert(1)' };
    const { container } = render(<TopLace />);
    expect(container.querySelector('a')).toBeNull();
  });

  it('shows the countdown for a future date and hides it for a past one', () => {
    state.settings = { 'header-topnav-text': 'Sale', 'header-topnav-count-down': '2999-01-01T00:00:00Z' };
    expect(render(<TopLace />).container.querySelector('.tallah-top-lace__countdown')).not.toBeNull();

    state.settings = { 'header-topnav-text': 'Sale', 'header-topnav-count-down': '2001-01-01T00:00:00Z' };
    expect(render(<TopLace />).container.querySelector('.tallah-top-lace__countdown')).toBeNull();
  });

  it('draws the icon with the merchant icon class and color', () => {
    state.settings = {
      header_topnav_icon_url: 'sicon-store',
      icon_color: '#ffffff',
    };
    const icon = render(<TopLace />).container.querySelector<HTMLElement>('i.sicon-store')!;
    expect(icon.style.color).toBe('rgb(255, 255, 255)');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ArPromoBanner } from '../../../app/components/home/ArPromoBanner';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: 'ar', t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, ...rest }: { to: string; children?: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const full = {
  banner_image: 'https://cdn.example/promo.webp',
  block_title: 'ستايل سهل وأنيق',
  block_title_color: '#112233',
  subtext: 'اختيارات بعناية',
  subtext_color: '#445566',
  url: 'https://store.example/offers',
  url_text: 'shop now',
  url_color: '#778899',
  position: 5,
};

describe('ArPromoBanner', () => {
  it('renders the title, the quoted line and the upper-cased link, in the merchant colors', () => {
    const { container } = render(<ArPromoBanner data={full} />);
    expect(container.querySelector('section')?.className).toContain('AR-promo-banner-5');
    const h2 = container.querySelector('h2') as HTMLElement;
    expect(h2.textContent).toBe('ستايل سهل وأنيق');
    expect(h2.style.color).toBe('rgb(17, 34, 51)');
    const p = container.querySelector('p') as HTMLElement;
    expect(p.textContent).toBe('"اختيارات بعناية"');
    expect(p.style.color).toBe('rgb(68, 85, 102)');
    const link = container.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent).toBe('SHOP NOW');
    expect(link.getAttribute('href')).toBe('https://store.example/offers');
    expect(link.style.color).toBe('rgb(119, 136, 153)');
  });

  it('shows the image as a decorative picture', () => {
    const { container } = render(<ArPromoBanner data={full} />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://cdn.example/promo.webp');
    expect(img.getAttribute('alt')).toBe('');
  });

  it('leaves out the quoted line and the link when they are empty', () => {
    const { container } = render(<ArPromoBanner data={{ ...full, subtext: '', url_text: '' }} />);
    expect(container.querySelector('p')).toBeNull();
    expect(container.querySelector('a')).toBeNull();
  });

  it('draws no picture without an image, and keeps the text column', () => {
    const { container } = render(<ArPromoBanner data={{ ...full, banner_image: '' }} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('h2')).toBeTruthy();
  });

  it('keeps the text column second in the markup but first in order, so the image leads on wide rows', () => {
    const { container } = render(<ArPromoBanner data={full} />);
    const [text, image] = [...(container.querySelector('section > div') as HTMLElement).children] as HTMLElement[];
    expect(text.className).toContain('order-2');
    expect(image.className).toContain('ar-promo__image');
  });

  it('never links to an unsafe address', () => {
    const { container } = render(<ArPromoBanner data={{ ...full, url: 'javascript:alert(1)' }} />);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#');
  });
});

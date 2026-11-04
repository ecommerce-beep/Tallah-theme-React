import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ArCustomTestimonials } from '../../../app/components/home/ArCustomTestimonials';

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

const review = (over: Record<string, unknown> = {}) => ({
  image: 'https://cdn.example/r1.webp',
  product_name: 'جاكيت',
  product_name_color: '#111111',
  review: 5,
  testimonial: 'رائع جدًا',
  testimonial_color: '#222222',
  ...over,
});

const full = {
  block_title: 'آراء العملاء',
  blocktitle_color: '#112233',
  subtext: 'قصص حقيقية',
  subtext_color: '#445566',
  url: 'https://store.example/reviews',
  url_text: 'عرض الكل',
  url_color: '#778899',
  position: 7,
  testimonials: [review(), review({ product_name: 'قميص', review: 3 })],
};

const cards = (c: HTMLElement) => [...c.querySelectorAll('.ar-testimonials__slide')] as HTMLElement[];

describe('ArCustomTestimonials', () => {
  it('renders the heading row, the text and one card per review, in the merchant colors', () => {
    const { container } = render(<ArCustomTestimonials data={full} />);
    expect(container.querySelector('section')?.className).toContain('AR-testimonials-7');
    const title = container.querySelector('.block-title') as HTMLElement;
    expect(title.textContent).toBe('آراء العملاء');
    expect(title.style.color).toBe('rgb(17, 34, 51)');
    expect((container.querySelector('.subtext') as HTMLElement).style.color).toBe('rgb(68, 85, 102)');
    const link = container.querySelector('.heading a') as HTMLAnchorElement;
    expect(link.textContent).toBe('عرض الكل');
    expect(link.getAttribute('href')).toBe('https://store.example/reviews');
    expect(link.style.color).toBe('rgb(119, 136, 153)');
    expect(cards(container)).toHaveLength(2);
  });

  it('shows each card with its image, stars, name and a quoted review', () => {
    const { container } = render(<ArCustomTestimonials data={full} />);
    const [first, second] = cards(container);
    const img = first.querySelector('img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://cdn.example/r1.webp');
    expect(img.getAttribute('alt')).toBe('جاكيت');
    expect(first.querySelector('salla-rating-stars')?.getAttribute('value')).toBe('5');
    expect(second.querySelector('salla-rating-stars')?.getAttribute('value')).toBe('3');
    const [name, quote] = [...first.querySelectorAll('p.product-name')] as HTMLElement[];
    expect(name.textContent).toBe('جاكيت');
    expect(name.style.color).toBe('rgb(17, 17, 17)');
    expect(quote.textContent).toBe('“رائع جدًا”');
    expect(quote.style.color).toBe('rgb(34, 34, 34)');
  });

  it('leaves out what a card or the heading does not have', () => {
    const { container } = render(
      <ArCustomTestimonials
        data={{
          testimonials: [review({ product_name: '', testimonial: '', review: undefined, image: '' })],
        }}
      />
    );
    const [card] = cards(container);
    expect(card.querySelector('p.product-name')).toBeNull();
    expect(card.querySelector('salla-rating-stars')).toBeNull();
    expect(card.querySelector('img')).toBeNull();
    expect(container.querySelector('.block-title')).toBeNull();
    expect(container.querySelector('.heading a')).toBeNull();
    expect(container.querySelector('.subtext')).toBeNull();
  });

  it('accepts review items keyed by the manifest ids, prefixed with the collection', () => {
    const { container } = render(
      <ArCustomTestimonials
        data={{
          testimonials: [
            {
              'testimonials.image': 'https://cdn.example/p.webp',
              'testimonials.product_name': 'حذاء',
              'testimonials.review': 4,
              'testimonials.testimonial': 'جيد',
            },
          ],
        }}
      />
    );
    const [card] = cards(container);
    expect(card.querySelector('p.product-name')?.textContent).toBe('حذاء');
    expect(card.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/p.webp');
  });

  it('renders an empty row without reviews, and reads per-language text', () => {
    expect(cards(render(<ArCustomTestimonials data={{}} />).container)).toHaveLength(0);
    state.locale = 'en';
    const { container } = render(
      <ArCustomTestimonials data={{ ...full, block_title: { ar: 'عنوان', en: 'Title' } }} />
    );
    expect(container.querySelector('.block-title')?.textContent).toBe('Title');
    state.locale = 'ar';
  });
});

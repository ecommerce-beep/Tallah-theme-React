import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import {
  InspireGallery,
  ProductTabs,
  readSellingPoints,
  SellingPoints,
  StickyBuyBar,
} from '../../../app/components/product/TallahPdpParts';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/api/client', () => ({
  getActiveCurrency: (c: string) => c,
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  CurrencySymbol: ({ currency }: { currency: string }) => <i data-testid="cur">{currency}</i>,
  Image: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

afterEach(cleanup);

describe('readSellingPoints', () => {
  it('reads per-language fields, bare or prefixed with the collection id, and drops empty rows', () => {
    const points = readSellingPoints(
      [
        {
          'selling-point-image': 'https://img.test/a.png',
          'selling-point-title': { ar: 'شحن سريع', en: 'Fast shipping' },
          'selling-point-description': { ar: 'خلال يومين', en: 'Within two days' },
          'selling-point-link': 'https://shop.test/shipping',
        },
        { 'selling-points.selling-point-title': { ar: 'إرجاع', en: 'Returns' } },
        {},
      ],
      'en',
      'Learn more'
    );
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({
      title: 'Fast shipping',
      description: 'Within two days',
      linkText: 'Learn more',
      href: 'https://shop.test/shipping',
    });
    expect(points[1].title).toBe('Returns');
  });

  it('uses the merchant link text when there is one, and the language of the page', () => {
    const [point] = readSellingPoints(
      [
        {
          'selling-point-title': { ar: 'ضمان', en: 'Warranty' },
          'selling-point-link': 'https://shop.test/w',
          'selling-point-link-content': { ar: 'التفاصيل', en: 'Details' },
        },
      ],
      'ar',
      'المزيد'
    );
    expect(point.title).toBe('ضمان');
    expect(point.linkText).toBe('التفاصيل');
  });

  it('is empty for a missing collection', () => {
    expect(readSellingPoints(undefined, 'ar', 'x')).toEqual([]);
  });

  it('never keeps a javascript: link', () => {
    const [point] = readSellingPoints(
      [{ 'selling-point-title': { en: 'x' }, 'selling-point-link': 'javascript:alert(1)' }],
      'en',
      'More'
    );
    expect(point.href).toBe('');
  });
});

describe('SellingPoints', () => {
  it('renders each point and the chosen view', () => {
    const { container } = render(
      <SellingPoints
        view="vertical"
        points={[
          { image: '', title: 'A', description: 'a', href: '', linkText: '' },
          { image: 'https://img.test/b.png', title: 'B', description: '', href: 'https://x.test', linkText: 'More' },
        ]}
      />
    );
    expect(container.querySelector('.tallah-selling-points--vertical')).toBeTruthy();
    expect(screen.getByText('A')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'More' }).getAttribute('href')).toBe('https://x.test');
  });

  it('renders nothing without points', () => {
    const { container } = render(<SellingPoints points={[]} view="horizontal" />);
    expect(container.firstChild).toBeNull();
  });
});

describe('ProductTabs', () => {
  it('shows the description first and switches to the reviews, keeping both mounted', () => {
    render(<ProductTabs description={<p>desc body</p>} reviews={<p>reviews body</p>} />);
    const [descTab, reviewsTab] = screen.getAllByRole('tab');
    expect(descTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('desc body').closest('[role=tabpanel]')?.hasAttribute('hidden')).toBe(false);
    expect(screen.getByText('reviews body', { selector: 'p' }).closest('[role=tabpanel]')?.hasAttribute('hidden')).toBe(true);

    fireEvent.click(reviewsTab);
    expect(reviewsTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('desc body').closest('[role=tabpanel]')?.hasAttribute('hidden')).toBe(true);
    expect(screen.getByText('reviews body').closest('[role=tabpanel]')?.hasAttribute('hidden')).toBe(false);
  });

  it('has no reviews tab when the store has product ratings off', () => {
    render(<ProductTabs description={<p>only</p>} reviews={null} />);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
  });
});

describe('InspireGallery', () => {
  it('renders one image per url under the title', () => {
    const { container } = render(<InspireGallery title="Inspire" images={['https://i.test/1.jpg', 'https://i.test/2.jpg']} />);
    expect(screen.getByRole('heading', { name: 'Inspire' })).toBeTruthy();
    expect(container.querySelectorAll('img')).toHaveLength(2);
  });

  it('renders nothing without images', () => {
    const { container } = render(<InspireGallery title="Inspire" images={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('StickyBuyBar', () => {
  const product = (over: Partial<Product> = {}) =>
    ({
      id: 7,
      name: 'Wide trousers',
      currency: 'SAR',
      price: 200,
      sale_price: 140,
      regular_price: 200,
      is_on_sale: false,
      is_out_of_stock: false,
      status: 'sale',
      add_to_cart_label: 'Add to cart',
      image: { url: 'https://i.test/p.jpg' },
      ...over,
    }) as unknown as Product;

  /** The form's own add button, with a controllable position and a click spy. */
  function mountMainButton(bottom: number) {
    const form = document.createElement('form');
    form.className = 'product-form';
    const button = document.createElement('salla-add-product-button');
    button.setAttribute('type', 'submit');
    button.getBoundingClientRect = () => ({ bottom }) as DOMRect;
    const click = vi.fn();
    button.addEventListener('click', click);
    form.appendChild(button);
    document.body.appendChild(form);
    return { click, form };
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('stays hidden while the form button is in view and shows once it scrolls away', async () => {
    const { form } = mountMainButton(400);
    const { container } = render(<StickyBuyBar product={product()} />);
    const bar = () => container.querySelector('.tallah-sticky-bar') as HTMLElement;
    expect(bar().classList.contains('is-visible')).toBe(false);

    const button = form.querySelector('salla-add-product-button') as HTMLElement;
    button.getBoundingClientRect = () => ({ bottom: 50 }) as DOMRect;
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    await waitFor(() => expect(bar().classList.contains('is-visible')).toBe(true));
  });

  it("presses the form's add button, so validation and the cart call stay the form's", () => {
    const { click } = mountMainButton(10);
    render(<StickyBuyBar product={product()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to cart', hidden: true }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('shows the sale price with the regular price struck through', () => {
    mountMainButton(10);
    const { container } = render(<StickyBuyBar product={product({ is_on_sale: true })} />);
    expect(container.querySelector('.tallah-sticky-bar__price')?.textContent).toContain('140');
    expect(container.querySelector('.line-through')?.textContent).toContain('200');
  });

  it('is not rendered for a sold-out product with nothing to sign up for', () => {
    const { container } = render(<StickyBuyBar product={product({ is_out_of_stock: true, status: 'out' })} />);
    expect(container.firstChild).toBeNull();
  });

  it('keeps the bar for a sold-out product people can be notified about', () => {
    const { container } = render(
      <StickyBuyBar product={product({ is_out_of_stock: true, status: 'out-and-notify' })} />
    );
    expect(container.querySelector('.tallah-sticky-bar')).toBeTruthy();
  });
});

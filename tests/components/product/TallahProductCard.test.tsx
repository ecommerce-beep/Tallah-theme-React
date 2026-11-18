import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { TallahProductCard } from '../../../app/components/product/TallahProductCard';

const state = vi.hoisted(() => ({ locale: 'ar', wishlist: [] as number[], toggle: vi.fn() }));

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

// These tests are about the card without the options: the setting off, so nothing loads until it is touched.
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: { product_card_options: false } } }),
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks/useMoney', () => ({
  useMoney: () => ({ format: (value: number) => `${value} SAR` }),
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks/useWishlist', () => ({
  useWishlist: () => ({ has: (id: number) => state.wishlist.includes(id), toggle: state.toggle }),
}));

vi.mock('@salla.sa/twilight-components-react/add-product-button', () => ({
  SallaAddProductButton: ({ productId, productStatus, productType, children }: Record<string, unknown>) => (
    <salla-add-product-button
      product-id={String(productId)}
      product-status={String(productStatus)}
      product-type={String(productType)}
    >
      {children as React.ReactNode}
    </salla-add-product-button>
  ),
}));

const make = (over: Record<string, unknown> = {}) =>
  ({
    id: 743402068,
    name: 'الجاكيت الكلاسيكي الطويل',
    url: 'https://store.example/p743402068',
    status: 'sale',
    type: 'product',
    price: 200,
    regular_price: 200,
    sale_price: null,
    is_on_sale: false,
    image: { url: 'https://cdn.example/main.webp', alt: 'جاكيت' },
    category: { name: 'جاكيتات', url: 'https://store.example/c1' },
    ...over,
  }) as never;

const getDetails = vi.fn();

beforeEach(() => {
  state.locale = 'ar';
  state.wishlist = [];
  state.toggle.mockReset();
  getDetails.mockReset();
  getDetails.mockResolvedValue({ data: { images: [{ url: 'https://cdn.example/main.webp' }, { url: 'https://cdn.example/back.webp' }] } });
  (window as unknown as { salla: unknown }).salla = { product: { getDetails } };
  window.sessionStorage.clear();
});

describe('TallahProductCard', () => {
  it('shows the image, the category, the name and the price, each linking where it should', () => {
    const { container } = render(<TallahProductCard product={make()} />);
    const card = container.querySelector('.s-product-card') as HTMLElement;
    expect(card.id).toBe('743402068');
    expect(card.className).toContain('s-product-card-vertical');
    expect(container.querySelector('img.front')?.getAttribute('src')).toBe('https://cdn.example/main.webp');
    expect(container.querySelector('.s-product-card-content-category a')?.textContent).toBe('جاكيتات');
    expect(container.querySelector('.s-product-card-content-category a')?.getAttribute('href')).toBe('https://store.example/c1');
    const title = container.querySelector('.s-product-card-content-title a') as HTMLAnchorElement;
    expect(title.textContent).toBe('الجاكيت الكلاسيكي الطويل');
    expect(title.getAttribute('href')).toBe('https://store.example/p743402068');
    expect(container.querySelector('.s-product-card-price')?.textContent).toBe('200 SAR');
  });

  it('shows a category without a URL as plain text, not as a link with no href', () => {
    const base = make();
    const { container } = render(
      <TallahProductCard product={make({ category: { ...(base.category as object), url: undefined } as never })} />
    );
    expect(container.querySelector('.s-product-card-content-category a')).toBeNull();
    expect(container.querySelector('.s-product-card-content-category h3')?.textContent).toBe('جاكيتات');
  });

  it('shows the sale price with the old price, and a starting price for a product with variants', () => {
    const sale = render(
      <TallahProductCard product={make({ is_on_sale: true, sale_price: 150, regular_price: 200 })} />
    ).container;
    expect(sale.querySelector('.s-product-card-sale-price h4')?.textContent).toBe('150 SAR');
    expect(sale.querySelector('.s-product-card-sale-price span')?.textContent).toBe('200 SAR');

    const starting = render(<TallahProductCard product={make({ starting_price: 99 })} />).container;
    expect(starting.querySelector('.s-product-card-starting-price h4')?.textContent).toBe('99 SAR');
  });

  it('shows no price element text for a product without one', () => {
    const { container } = render(<TallahProductCard product={make({ price: 0 })} />);
    expect(container.querySelector('.s-product-card-price')?.textContent).toBe('');
  });

  it('badges a promotion title with "off" in the store language, and a pre-order label as is', () => {
    expect(
      render(<TallahProductCard product={make({ promotion_title: '٣٠٪' })} />).container.querySelector(
        '.s-product-card-promotion-title'
      )?.textContent
    ).toBe('٣٠٪ خصم');
    state.locale = 'en';
    expect(
      render(<TallahProductCard product={make({ promotion_title: '30%' })} />).container.querySelector(
        '.s-product-card-promotion-title'
      )?.textContent
    ).toBe('30% off');
    expect(
      render(<TallahProductCard product={make({ preorder: { label: 'Pre-order' }, promotion_title: 'x' })} />)
        .container.querySelector('.s-product-card-promotion-title')?.textContent
    ).toBe('Pre-order');
    expect(render(<TallahProductCard product={make()} />).container.querySelector('.s-product-card-promotion-title')).toBeNull();
  });

  it('marks an out-of-stock product and says so over the image', () => {
    const { container } = render(<TallahProductCard product={make({ status: 'out' })} />);
    expect(container.querySelector('.s-product-card-out-of-stock')).toBeTruthy();
    expect(container.querySelector('.tallah-card__out')?.textContent).toBe('Out of Stock');
  });

  it('hands the product to the add-to-cart button, with a calendar icon for a booking', () => {
    const { container } = render(<TallahProductCard product={make({ type: 'booking', status: 'sale' })} />);
    const button = container.querySelector('salla-add-product-button') as HTMLElement;
    expect(button.getAttribute('product-id')).toBe('743402068');
    expect(button.getAttribute('product-status')).toBe('sale');
    expect(button.getAttribute('product-type')).toBe('booking');
    expect(button.querySelector('i')?.className).toBe('sicon-calendar-time');
  });

  it('shows the rating only when there is one', () => {
    expect(render(<TallahProductCard product={make()} />).container.querySelector('.s-product-card-rating')).toBeNull();
    const { container } = render(<TallahProductCard product={make({ rating: { stars: 4.5 } })} />);
    expect(container.querySelector('.s-product-card-rating')?.textContent).toBe('4.5');
  });

  it('toggles the wishlist from the corner button', () => {
    const { container } = render(<TallahProductCard product={make()} />);
    fireEvent.click(container.querySelector('.s-product-card-wishlist-btn') as HTMLElement);
    expect(state.toggle).toHaveBeenCalledWith(743402068);
  });

  it('marks a product already in the wishlist', () => {
    state.wishlist = [743402068];
    const { container } = render(<TallahProductCard product={make()} />);
    expect(container.querySelector('.s-product-card-wishlist-added')).toBeTruthy();
  });

  it('adds the second image for the hover flip on first touch, and asks for it only once', async () => {
    const { container } = render(<TallahProductCard product={make()} />);
    expect(container.querySelector('img.back')).toBeNull();
    const card = container.querySelector('.s-product-card') as HTMLElement;
    act(() => {
      fireEvent.pointerEnter(card);
      fireEvent.pointerEnter(card);
    });
    await waitFor(() => expect(container.querySelector('img.back')?.getAttribute('src')).toBe('https://cdn.example/back.webp'));
    expect(container.querySelector('.product-flip-inner')?.className).toContain('has-flip');
    expect(getDetails).toHaveBeenCalledTimes(1);
    expect(getDetails).toHaveBeenCalledWith(743402068, ['images', 'options']);
  });

  it('reuses a cached product instead of asking again', async () => {
    window.sessionStorage.setItem(
      'product_743402068_details',
      JSON.stringify({ images: [{ url: 'a' }, { url: 'https://cdn.example/cached.webp' }] })
    );
    const { container } = render(<TallahProductCard product={make()} />);
    act(() => {
      fireEvent.focus(container.querySelector('.s-product-card') as HTMLElement);
    });
    await waitFor(() => expect(container.querySelector('img.back')?.getAttribute('src')).toBe('https://cdn.example/cached.webp'));
    expect(getDetails).not.toHaveBeenCalled();
  });

  it('keeps a single image when the product has only one', async () => {
    getDetails.mockResolvedValue({ data: { images: [{ url: 'https://cdn.example/main.webp' }] } });
    const { container } = render(<TallahProductCard product={make()} />);
    act(() => {
      fireEvent.pointerEnter(container.querySelector('.s-product-card') as HTMLElement);
    });
    await waitFor(() => expect(getDetails).toHaveBeenCalled());
    expect(container.querySelector('img.back')).toBeNull();
    expect(container.querySelector('.product-flip-inner')?.className).not.toContain('has-flip');
  });
});

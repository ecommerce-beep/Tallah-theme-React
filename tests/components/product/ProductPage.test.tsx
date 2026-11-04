import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ProductPage } from '../../../app/components/product/ProductPage';

const state = vi.hoisted(() => ({
  settings: {} as Record<string, unknown>,
  storeSettings: { rating: { show_on_product: true } } as Record<string, unknown>,
  related: null as unknown,
}));

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: state.settings }, store: { settings: state.storeSettings } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k, locale: 'ar' }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({ HookSlot: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useProduct', () => ({
  useProduct: (product: unknown) => ({ product }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useComments', () => ({
  useComments: () => ({ commentsKey: 1 }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useWishlist', () => ({
  useWishlist: () => ({ has: (id: number) => id === 99 }),
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Breadcrumb: () => <nav data-testid="crumbs" className="breadcrumbs" />,
  RenderWhenVisible: ({ children }: { children: ReactNode }) => <>{children}</>,
  Image: ({ src }: { src: string }) => <img src={src} alt="" />,
  CurrencySymbol: () => null,
}));
vi.mock('@salla.sa/twilight-theme-engine/home', () => ({ PageBlocks: () => null }));
vi.mock('@salla.sa/twilight-components-react/quick-order', () => ({ SallaQuickOrder: () => null }));
vi.mock('@salla.sa/twilight-components-react/offer', () => ({ SallaOffer: () => null }));
vi.mock('@salla.sa/twilight-components-react/payments', () => ({
  SallaPayments: () => <div data-testid="payments" />,
}));
vi.mock('@salla.sa/twilight-components-react/social-share', () => ({ SallaSocialShare: () => null }));
vi.mock('@salla.sa/twilight-components-react/comments', () => ({
  SallaComments: () => <div data-testid="comments" />,
}));
vi.mock('../../../app/components/common', () => ({ BlockHookSlot: () => null }));
vi.mock('../../../app/components/product/ProductGallery', () => ({
  ProductGallery: () => <div data-testid="gallery" />,
}));
vi.mock('../../../app/components/product/ProductDetails', () => ({
  ProductDetails: () => <div data-testid="details" />,
  ProductDescription: () => <div data-testid="description" />,
}));
vi.mock('../../../app/components/product/AddToCartForm', () => ({
  AddToCartForm: () => <form className="product-form" data-testid="form" />,
}));
vi.mock('../../../app/components/product/ProductMetadata', () => ({
  ProductMetadata: () => <div data-testid="metadata" />,
}));
vi.mock('../../../app/components/product/TallahPdpParts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../app/components/product/TallahPdpParts')>();
  return { ...actual, StickyBuyBar: () => <div data-testid="sticky-bar" /> };
});
vi.mock('../../../app/components/home/ProductsSlider', () => ({
  ProductsSlider: ({ data, tallahCards }: { data: { products?: unknown; title?: string }; tallahCards?: boolean }) => {
    state.related = data.products;
    return <div data-testid="related" data-tallah={String(tallahCards)}>{data.title}</div>;
  },
}));

const product = { id: 99, name: 'Wide trousers', has_metadata: false } as never;
const page = { title: 'Wide trousers' } as never;

beforeEach(() => {
  state.settings = {};
  state.storeSettings = { rating: { show_on_product: true } };
  state.related = null;
});
afterEach(cleanup);

describe('ProductPage (TALLAH single.twig)', () => {
  it('lays out the gallery and the buy column, then the tabs, similar products and the sticky bar', () => {
    const { container } = render(<ProductPage product={product} page={page} />);
    const root = container.querySelector('.tallah-pdp') as HTMLElement;
    expect(root).toBeTruthy();
    const row = root.querySelector('#product-99') as HTMLElement;
    expect(row.querySelector('[data-testid=gallery]')).toBeTruthy();
    expect(row.querySelector('.main-content [data-testid=details]')).toBeTruthy();
    expect(row.querySelector('.main-content [data-testid=form]')).toBeTruthy();
    expect(row.querySelector('.main-content [data-testid=payments]')).toBeTruthy();
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Description',
      'Reviews',
    ]);
    expect(screen.getByTestId('related').dataset.tallah).toBe('true');
    expect(screen.getByTestId('sticky-bar')).toBeTruthy();
  });

  it('shows the breadcrumb twice: above the page on phones and in the buy column from lg', () => {
    const { container } = render(<ProductPage product={product} page={page} />);
    expect(container.querySelector('.tallah-pdp__crumbs--top [data-testid=crumbs]')).toBeTruthy();
    expect(container.querySelector('.main-content .tallah-pdp__crumbs [data-testid=crumbs]')).toBeTruthy();
  });

  it('drops the breadcrumb when the merchant turned it off', () => {
    state.settings = { product_show_breadcrumbs: false };
    render(<ProductPage product={product} page={page} />);
    expect(screen.queryByTestId('crumbs')).toBeNull();
  });

  it('has no reviews tab when the store has product ratings off', () => {
    state.storeSettings = { rating: { show_on_product: false } };
    render(<ProductPage product={product} page={page} />);
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.queryByTestId('comments')).toBeNull();
  });

  it('reads the similar products from the single_* settings, and hides them when switched off', () => {
    state.settings = { single_source: 'sales' };
    const { unmount } = render(<ProductPage product={product} page={page} />);
    expect(state.related).toEqual({ source: 'best_selling' });
    unmount();

    state.settings = { single_products: false };
    render(<ProductPage product={product} page={page} />);
    expect(screen.queryByTestId('related')).toBeNull();
  });

  it('shows the sticky bar by default and not when sticky_is_true is off or the design is not pro1', () => {
    const { unmount } = render(<ProductPage product={product} page={page} />);
    expect(screen.getByTestId('sticky-bar')).toBeTruthy();
    unmount();

    state.settings = { sticky_is_true: false };
    const second = render(<ProductPage product={product} page={page} />);
    expect(screen.queryByTestId('sticky-bar')).toBeNull();
    second.unmount();

    state.settings = { product_pro: [{ value: 'pro2' }] };
    render(<ProductPage product={product} page={page} />);
    expect(screen.queryByTestId('sticky-bar')).toBeNull();
  });

  it('renders the selling points and the extra image strip from their settings', () => {
    state.settings = {
      'selling-points': [{ 'selling-point-title': { ar: 'شحن مجاني', en: 'Free shipping' } }],
      img_in_single: true,
      image_collection: [{ img_single: 'https://i.test/1.jpg' }, { img_single: 'https://i.test/2.jpg' }],
    };
    const { container } = render(<ProductPage product={product} page={page} />);
    expect(screen.getByText('شحن مجاني')).toBeTruthy();
    expect(container.querySelectorAll('.tallah-inspire__item')).toHaveLength(2);
  });

  it('marks the wishlist button of a wishlisted product on phones', () => {
    const { container } = render(<ProductPage product={product} page={page} />);
    const button = container.querySelector('.tallah-pdp__wishlist') as HTMLElement;
    expect(button.classList.contains('is-added')).toBe(true);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders the specs in the buy column only for a product with metadata', () => {
    const { unmount } = render(<ProductPage product={product} page={page} />);
    expect(screen.queryByTestId('metadata')).toBeNull();
    unmount();
    render(<ProductPage product={{ ...(product as object), has_metadata: true } as never} page={page} />);
    expect(screen.getByTestId('metadata')).toBeTruthy();
  });

  it('adds the selected-products carousel under the buy column only when single_side_products is on', () => {
    const { container, unmount } = render(<ProductPage product={product} page={page} />);
    expect(container.querySelector('.tallah-pdp__side')).toBeNull();
    unmount();

    state.settings = { single_side_products: true, single_side_source: 'sales' };
    const second = render(<ProductPage product={product} page={page} />);
    const side = second.container.querySelector('.main-content .tallah-pdp__side') as HTMLElement;
    expect(side.textContent).toContain('Selected products');
    expect(state.related).toEqual({ source: 'latest' });
  });
});

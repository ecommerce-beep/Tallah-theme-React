import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Page } from '@salla.sa/twilight-theme-engine/types';
import { CartPage } from '../../../app/components/cart/CartPage';

// Theme Editor settings the page reads: features_switch_cart, cart_page_features, sticky_cart_button.
let themeSettings: Record<string, unknown> = {};

const cartData = {
  id: 5,
  items: [
    {
      id: 1,
      product_id: 2,
      product_name: 'Product',
      product_image: '',
      url: '/p2',
      quantity: 1,
      price: 10,
      product_price: 10,
      total: 10,
      is_available: true,
    },
  ],
  options: [],
};

vi.mock('@salla.sa/twilight-components-react/conditional-offer', () => ({
  SallaConditionalOffer: () => null,
}));
vi.mock('@salla.sa/twilight-components-react/offer', () => ({ SallaOffer: () => null }));
vi.mock('@salla.sa/twilight-components-react/cart-item-offers', () => ({
  SallaCartItemOffers: () => null,
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({
  HookSlot: () => null,
  usePageConfig: () => {},
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useMoney', () => ({
  useMoney: () => ({ format: (amount: unknown) => String(amount) }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'ar' }),
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Breadcrumb: () => null,
  NoContent: () => null,
  Link: ({ to, children, className }: { to: string; children?: unknown; className?: string }) => (
    <a href={to} className={className}>
      {children as never}
    </a>
  ),
  Image: () => <img alt="" />,
}));
vi.mock('@salla.sa/twilight-theme-engine/cart', () => ({
  CartSummary: () => null,
  SeoCartWidget: () => null,
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ store: { settings: {} }, theme: { settings: themeSettings } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/skeleton', () => ({
  CartSkeleton: () => <div data-testid="skeleton" />,
}));
vi.mock('@salla.sa/twilight-theme-engine/api/loyalty', () => ({
  loyalty: { queries: { points: () => ({ queryKey: ['points'], queryFn: () => null }) } },
}));
vi.mock('@salla.sa/twilight-theme-engine/api/cart', async (importOriginal) => {
  const { cart } =
    await importOriginal<typeof import('@salla.sa/twilight-theme-engine/api/cart')>();
  return {
    cart: {
      ...cart,
      queries: {
        ...cart.queries,
        detail: (id: number) => ({ queryKey: ['cart', id], queryFn: () => cartData }),
      },
    },
  };
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CartPage page={{} as Page} />
    </QueryClientProvider>
  );
}

describe('CartPage theme settings', () => {
  let originalSalla: unknown;
  beforeEach(() => {
    themeSettings = {};
    originalSalla = (window as { salla?: unknown }).salla;
    (window as { salla?: unknown }).salla = {
      onReady: () => Promise.resolve(),
      cart: { api: { getCurrentCartId: vi.fn(() => Promise.resolve(5)) } },
      event: { on: vi.fn(), off: vi.fn() },
    };
  });
  afterEach(() => {
    (window as { salla?: unknown }).salla = originalSalla;
  });

  it('pins the checkout button on phones by default (sticky_cart_button defaults on)', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector('.cart-page')).toBeTruthy());
    expect(container.querySelector('.cart-page--sticky-cta')).toBeTruthy();
  });

  it('does not pin it when sticky_cart_button is off', async () => {
    themeSettings = { sticky_cart_button: false };
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector('.cart-page')).toBeTruthy());
    expect(container.querySelector('.cart-page--sticky-cta')).toBeNull();
  });

  it('shows the merchant features under the summary, linked ones as links', async () => {
    themeSettings = {
      features_switch_cart: true,
      cart_page_features: [
        { cart_features_content: { ar: 'شحن سريع', en: 'Fast shipping' }, cart_features_link: '/p' },
        { cart_features_content: 'Secure payment' },
      ],
    };
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector('.cart-features')).toBeTruthy());
    expect(container.querySelectorAll('.cart-features__item')).toHaveLength(2);
    expect(container.querySelector('a.cart-features__text')?.textContent).toBe('شحن سريع');
  });

  it('hides the features when features_switch_cart is off', async () => {
    themeSettings = {
      features_switch_cart: false,
      cart_page_features: [{ cart_features_content: 'x' }],
    };
    const { container } = renderPage();
    await waitFor(() => expect(container.querySelector('.cart-page')).toBeTruthy());
    expect(container.querySelector('.cart-features')).toBeNull();
  });
});

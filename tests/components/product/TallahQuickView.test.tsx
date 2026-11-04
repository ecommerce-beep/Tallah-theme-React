import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TallahQuickView } from '../../../app/components/product/TallahQuickView';

const detailMock = vi.fn();

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

vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: {
    queries: {
      detail: (id: string) => ({ queryKey: ['products', 'detail', id], queryFn: () => detailMock(id) }),
    },
  },
}));

// The page's own add-to-cart form (options, quantity, button) has its tests; here it only has to be given the full product.
vi.mock('../../../app/components/product/AddToCartForm', () => ({
  AddToCartForm: ({ product }: { product: { id: number; name: string } }) => (
    <form data-testid="add-to-cart-form" data-product-id={product.id}>
      {product.name}
    </form>
  ),
}));

const full = {
  id: 743402068,
  name: 'الجاكيت الكلاسيكي',
  url: 'https://store.example/p743402068',
  image: { url: 'https://cdn.example/main.webp' },
  images: [
    { url: 'https://cdn.example/a.webp', alt: 'أ' },
    { url: 'https://cdn.example/b.webp', alt: 'ب' },
  ],
};

function renderView(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const utils = render(
    <QueryClientProvider client={client}>
      <TallahQuickView productId={743402068} name="الجاكيت" url="https://store.example/p743402068" onClose={onClose} />
    </QueryClientProvider>
  );
  return { ...utils, onClose };
}

beforeEach(() => {
  detailMock.mockReset();
  detailMock.mockResolvedValue(full);
});

describe('TallahQuickView', () => {
  it('is a modal dialog named after the product, shown at once with the list name', () => {
    renderView();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('الجاكيت');
    expect(document.querySelector('.tallah-quickview__title a')?.getAttribute('href')).toBe('https://store.example/p743402068');
  });

  it('loads the full product, and hands it to the add-to-cart form', async () => {
    renderView();
    await waitFor(() => expect(document.querySelector('[data-testid="add-to-cart-form"]')).toBeTruthy());
    const form = document.querySelector('[data-testid="add-to-cart-form"]') as HTMLElement;
    expect(detailMock).toHaveBeenCalledWith('743402068');
    expect(form.getAttribute('data-product-id')).toBe('743402068');
    expect(document.querySelector('.tallah-quickview__title a')?.textContent).toBe('الجاكيت الكلاسيكي');
  });

  it('shows the gallery with thumbnails, and switches the big image from a thumbnail', async () => {
    renderView();
    await waitFor(() => expect(document.querySelector('.tallah-quickview__image')?.getAttribute('src')).toBe('https://cdn.example/a.webp'));
    const thumbs = [...document.querySelectorAll('.tallah-quickview__thumbs button')] as HTMLElement[];
    expect(thumbs).toHaveLength(2);
    fireEvent.click(thumbs[1]);
    expect(document.querySelector('.tallah-quickview__image')?.getAttribute('src')).toBe('https://cdn.example/b.webp');
    expect(thumbs[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('links to the product page', async () => {
    renderView();
    await waitFor(() => expect(document.querySelector('.tallah-quickview__details')).toBeTruthy());
    expect(document.querySelector('.tallah-quickview__details')?.getAttribute('href')).toBe('https://store.example/p743402068');
  });

  it('closes from the close button, the backdrop and Escape', () => {
    const { onClose } = renderView();
    fireEvent.click(document.querySelector('.tallah-quickview__close') as HTMLElement);
    fireEvent.click(document.querySelector('.tallah-quickview__backdrop') as HTMLElement);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('says so when the product cannot be loaded', async () => {
    detailMock.mockRejectedValue(new Error('boom'));
    renderView();
    await waitFor(() => expect(document.querySelector('[role="alert"]')?.textContent).toBe('The product could not be loaded'));
  });
});

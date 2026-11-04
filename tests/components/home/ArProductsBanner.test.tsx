import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArProductsBanner } from '../../../app/components/home/ArProductsBanner';

const listMock = vi.fn();
const state = vi.hoisted(() => ({ locale: 'ar' }));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: state.locale, t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: {
    queries: {
      list: (params: { source: string; sourceValue?: unknown }) => ({
        queryKey: ['products', 'list', params],
        queryFn: () => listMock(params),
      }),
    },
  },
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, ...rest }: { to: string; children?: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@salla.sa/twilight-components-react', () => ({
  ProductsListSkeleton: () => <div data-testid="list-skeleton" />,
}));

vi.mock('../../../app/components/product', () => ({
  TallahProductCard: ({ product }: { product: { name?: string } }) => <div data-testid="product-card">{product.name}</div>,
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const base = {
  banner_image: 'https://cdn.example/side.webp',
  block_title: 'أستايل بلا مجهود',
  block_title_color: '#111111',
  url_text: 'تسوق الإطلالة',
  url_color: '#222222',
  url: 'https://store.example/c9',
  source_type: [{ value: 'latest' }],
  position: 4,
};

const edgeArrows = (c: HTMLElement) =>
  [...c.querySelectorAll('.top-\\[45\\%\\] .ar-products__arrow')] as HTMLElement[];

beforeEach(() => {
  listMock.mockReset();
  listMock.mockResolvedValue({ items: [{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }, { id: 3, name: 'P3' }] });
  Element.prototype.scrollBy = vi.fn();
  state.locale = 'ar';
});

describe('ArProductsBanner', () => {
  it('fetches the source the merchant chose and renders a slide per product', async () => {
    const { findAllByTestId, container } = renderWithClient(<ArProductsBanner data={base} />);
    expect(await findAllByTestId('product-card')).toHaveLength(3);
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ source: 'latest' }));
    expect(container.querySelector('section')?.className).toContain('Ar-products-banner-4');
  });

  it('lists products of the picked categories by id', async () => {
    renderWithClient(
      <ArProductsBanner data={{ ...base, source_type: [{ value: 'categories' }], categories: [{ id: 7 }, { id: 8 }] }} />
    );
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ source: 'categories', sourceValue: [7, 8] }))
    );
  });

  it('lists hand-picked products by id', async () => {
    renderWithClient(
      <ArProductsBanner data={{ ...base, source_type: 'selected', products: [{ id: 41 }, { id: 42 }] }} />
    );
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ source: 'selected', sourceValue: [41, 42] }))
    );
  });

  it('asks for nothing, and shows no slider, when the source cannot be resolved', () => {
    const { container, queryByTestId } = renderWithClient(
      <ArProductsBanner data={{ ...base, source_type: 'selected', products: [] }} />
    );
    expect(listMock).not.toHaveBeenCalled();
    expect(queryByTestId('product-card')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://cdn.example/side.webp');
  });

  it('shows the heading in the merchant colors and every link to the same address', () => {
    const { container } = renderWithClient(<ArProductsBanner data={base} />);
    const h2 = container.querySelector('h2') as HTMLElement;
    expect(h2.style.color).toBe('rgb(17, 17, 17)');
    const links = [...container.querySelectorAll('a')] as HTMLAnchorElement[];
    expect(links.length).toBeGreaterThanOrEqual(2);
    links.forEach((a) => expect(a.getAttribute('href')).toBe('https://store.example/c9'));
  });

  it('in Arabic the first edge arrow (right) advances and the second goes back, both pointing outward', async () => {
    const { container, findAllByTestId } = renderWithClient(<ArProductsBanner data={base} />);
    await findAllByTestId('product-card');
    const edge = edgeArrows(container);
    expect(edge.map((b) => b.getAttribute('aria-label'))).toEqual(['Next', 'Previous']);
    expect(edge.map((b) => b.querySelector('svg')?.getAttribute('data-dir'))).toEqual(['right', 'left']);
  });

  it('in English the first edge arrow (left) goes back and the second advances', async () => {
    state.locale = 'en';
    const { container, findAllByTestId } = renderWithClient(<ArProductsBanner data={base} />);
    await findAllByTestId('product-card');
    const edge = edgeArrows(container);
    expect(edge.map((b) => b.getAttribute('aria-label'))).toEqual(['Previous', 'Next']);
    expect(edge.map((b) => b.querySelector('svg')?.getAttribute('data-dir'))).toEqual(['left', 'right']);
  });

  it('scrolls the row by one slide when an arrow is pressed', async () => {
    const { container, findAllByTestId } = renderWithClient(<ArProductsBanner data={base} />);
    await findAllByTestId('product-card');
    fireEvent.click(edgeArrows(container)[0]);
    expect(Element.prototype.scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('centers a single product and hides the arrows', async () => {
    listMock.mockResolvedValue({ items: [{ id: 1, name: 'Only' }] });
    const { container, findAllByTestId } = renderWithClient(<ArProductsBanner data={base} />);
    await findAllByTestId('product-card');
    expect(container.querySelector('section')?.className).toContain('single-product');
    expect(container.querySelector('.ar-products__arrow')).toBeNull();
  });
});

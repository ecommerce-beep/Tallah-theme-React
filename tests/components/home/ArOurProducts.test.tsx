import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArOurProducts } from '../../../app/components/home/ArOurProducts';

const listMock = vi.fn();
const state = vi.hoisted(() => ({ locale: 'ar' }));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: state.locale, t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: {
    queries: {
      list: (params: { source: string; sourceValue?: unknown; perPage?: number }) => ({
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
  section_title: 'القطع المفضّلة',
  section_sub_title: 'تصاميم خالدة',
  link_title: 'عرض كل المنتجات',
  rh_cat_btn_url: 'https://store.example/all',
  source_type: [{ value: 'latest' }],
  position: 2,
};

beforeEach(() => {
  listMock.mockReset();
  listMock.mockResolvedValue({ items: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, name: `P${i + 1}` })) });
  state.locale = 'ar';
});

describe('ArOurProducts', () => {
  it('renders the heading row with the title, the subtitle and the link', () => {
    const { container } = renderWithClient(<ArOurProducts data={base} />);
    expect(container.querySelector('section')?.className).toContain('AR-products-2');
    expect(container.querySelector('h2')?.textContent).toBe('القطع المفضّلة');
    expect(container.querySelector('p.subtitle')?.textContent).toBe('تصاميم خالدة');
    const link = container.querySelector('a.cat-link') as HTMLAnchorElement;
    expect(link.textContent).toBe('عرض كل المنتجات');
    expect(link.getAttribute('href')).toBe('https://store.example/all');
  });

  it('asks for the chosen source, at most eight products, and shows them in a grid', async () => {
    const { container, findAllByTestId } = renderWithClient(<ArOurProducts data={base} />);
    expect(await findAllByTestId('product-card')).toHaveLength(8);
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ source: 'latest', perPage: 8 }));
    expect(container.querySelector('.ar-our-products__grid')).toBeTruthy();
  });

  it('lists the products of the picked categories, or the hand-picked products', async () => {
    renderWithClient(<ArOurProducts data={{ ...base, source_type: 'categories', categories: [{ id: 5 }] }} />);
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ source: 'categories', sourceValue: [5] }))
    );
    renderWithClient(<ArOurProducts data={{ ...base, source_type: 'selected', products: [{ id: 1 }, { id: 2 }] }} />);
    await waitFor(() =>
      expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ source: 'selected', sourceValue: [1, 2] }))
    );
  });

  it('shows the heading but asks for nothing when the source cannot be resolved', () => {
    const { container, queryByTestId } = renderWithClient(
      <ArOurProducts data={{ ...base, source_type: 'categories', categories: [] }} />
    );
    expect(listMock).not.toHaveBeenCalled();
    expect(queryByTestId('product-card')).toBeNull();
    expect(container.querySelector('h2')).toBeTruthy();
  });

  it('leaves out the heading parts the merchant left empty', () => {
    const { container } = renderWithClient(
      <ArOurProducts data={{ ...base, section_sub_title: '', link_title: '' }} />
    );
    expect(container.querySelector('p.subtitle')).toBeNull();
    expect(container.querySelector('a.cat-link')).toBeNull();
  });

  it('reads per-language text', () => {
    state.locale = 'en';
    const { container } = renderWithClient(
      <ArOurProducts data={{ ...base, section_title: { ar: 'عنوان', en: 'Title' } }} />
    );
    expect(container.querySelector('h2')?.textContent).toBe('Title');
  });
});

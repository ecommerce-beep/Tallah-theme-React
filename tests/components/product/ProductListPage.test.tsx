import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ProductListPage } from '../../../app/components/product/ProductListPage';

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: 'sort=bestSell&page=3',
  filtersSetting: true,
  testimonials: false,
  filterStatus: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({ HookSlot: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useStore', () => ({
  useStore: () => ({
    settings: {
      product: { filters: state.filtersSetting },
      category: { testimonial_enabled: state.testimonials },
    },
  }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useNavigate: () => state.navigate,
  useLocation: () => ({ pathname: '/-/c1', searchStr: state.search }),
  useTwilight: () => ({ theme: { settings: {} } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/utils', () => ({
  sortOptions: (selected: string) =>
    ['ourSuggest', 'bestSell', 'priceFromLowToTop'].map((id) => ({
      id,
      name: `name-${id}`,
      is_selected: id === selected,
    })),
  onSallaEvent: () => () => {},
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Breadcrumb: () => <nav data-testid="breadcrumb" />,
  NoContent: ({ message }: { message: string }) => <p data-testid="empty">{message}</p>,
  ProductCardSkeleton: () => null,
  Image: () => null,
  RenderWhenVisible: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@salla.sa/twilight-components-react/filters', () => ({
  SallaFilters: ({ id }: { id: string }) => <div data-testid={id} />,
}));
vi.mock('@salla.sa/twilight-components-react', () => ({
  ItemsList: ({
    items,
    itemsClassName,
    empty,
    children,
  }: {
    items: unknown[];
    itemsClassName: string;
    empty: ReactNode;
    children: (items: unknown[]) => ReactNode;
  }) =>
    items.length ? <div className={itemsClassName} data-testid="grid">{children(items)}</div> : empty,
  ReviewItemSkeleton: () => null,
}));
vi.mock('@salla.sa/twilight-theme-engine/home', () => ({
  Testimonials: () => <div data-testid="testimonials" />,
  useReorderButtons: () => {},
}));
vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: { list: vi.fn() },
  parseNextPageToken: () => ({}),
}));
vi.mock('@salla.sa/twilight-theme-engine/routes/product-listing', () => ({
  useAppliedFilters: () => ({
    filters: state.search.includes('filters') ? { price: 1 } : null,
    page: null,
    lastPage: null,
    status: state.filterStatus,
    retry: vi.fn(),
  }),
}));
vi.mock('../../../app/components/product/TallahProductCard', () => ({
  TallahProductCard: ({ product }: { product: { id: number; name: string } }) => (
    <div data-testid="card">{product.name}</div>
  ),
}));
vi.mock('../../../app/components/common', () => ({
  BlockHookSlot: () => null,
  BottomSheet: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
}));
vi.mock('../../../app/components/icons', () => ({ FilterHorizontalIcon: () => <svg /> }));

const products = [
  { id: 1, name: 'one' },
  { id: 2, name: 'two' },
];

function renderPage(overrides: Record<string, unknown> = {}) {
  const props = {
    page: { title: 'اكسسورات' },
    source: { type: 'categories', value: '1' },
    query: { sort: 'bestSell', filters: true },
    products,
    pagination: { next: null },
    filters: [],
    ...overrides,
  };
  return render(<ProductListPage {...(props as unknown as Parameters<typeof ProductListPage>[0])} />);
}

describe('ProductListPage (TALLAH category page)', () => {
  beforeEach(() => {
    state.navigate.mockClear();
    state.search = 'sort=bestSell&page=3';
    state.filtersSetting = true;
    state.testimonials = false;
    state.filterStatus = 'idle';
    window.localStorage.clear();
  });

  it('renders the category title, count, breadcrumb and one TALLAH card per product', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('اكسسورات(2)');
    expect(screen.getByTestId('breadcrumb')).toBeTruthy();
    expect(screen.getAllByTestId('card').map((c) => c.textContent)).toEqual(['one', 'two']);
  });

  it('hides the count while more pages exist (no total from the API)', () => {
    renderPage({ pagination: { next: 'cursor' } });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('اكسسورات');
  });

  it('shows the selected sort and navigates with the new sort, dropping the page', () => {
    renderPage();
    const select = screen.getByLabelText('Sort By') as HTMLSelectElement;
    expect(select.value).toBe('bestSell');
    fireEvent.change(select, { target: { value: 'priceFromLowToTop' } });
    expect(state.navigate).toHaveBeenCalledWith('/-/c1?sort=priceFromLowToTop');
  });

  it('switches the phone grid between two and one column and remembers it', () => {
    renderPage();
    expect(screen.getByTestId('grid').className).toContain('tallah-list-grid--two-columns');
    fireEvent.click(screen.getByLabelText('List view'));
    expect(screen.getByTestId('grid').className).toContain('tallah-list-grid--one-column');
    expect(window.localStorage.getItem('gridView')).toBe('one-column');
  });

  it('shows the filter sidebar and opens the mobile sheet from the trigger', () => {
    renderPage();
    expect(screen.getByTestId('filters-menu')).toBeTruthy();
    expect(screen.queryByTestId('sheet')).toBeNull();
    fireEvent.click(screen.getByLabelText('Filters'));
    expect(screen.getByTestId('filters-menu-mobile')).toBeTruthy();
  });

  it('has no filters UI when the store has filters off', () => {
    state.filtersSetting = false;
    renderPage();
    expect(screen.queryByTestId('filters-menu')).toBeNull();
    expect(screen.queryByLabelText('Filters')).toBeNull();
  });

  it('shows the empty state for a category without products', () => {
    renderPage({ products: [] });
    expect(screen.getByTestId('empty').textContent).toBe('No products found in this category');
    expect(screen.queryByRole('heading', { level: 1 })?.textContent).toBe('اكسسورات');
  });

  it('shows no stale products when the filtered request failed', () => {
    state.filterStatus = 'error';
    renderPage();
    expect(screen.queryAllByTestId('card')).toHaveLength(0);
    expect(screen.getByTestId('store-catalog-filters-retry')).toBeTruthy();
  });

  it('offers no clear button without filters in the URL', () => {
    renderPage();
    expect(screen.queryByTestId('clear-filters')).toBeNull();
  });

  it('clears the filters from the URL but keeps the sort', () => {
    state.search = 'sort=bestSell&page=2&filters[price][min]=100&filters[price][max]=400';
    const dispatch = vi.fn();
    (window as unknown as { salla: unknown }).salla = { event: { dispatch } };
    renderPage();
    fireEvent.click(screen.getAllByTestId('clear-filters')[0]);
    expect(state.navigate).toHaveBeenCalledWith('/-/c1?sort=bestSell');
    // resets the engine's applied-filters state, which only listens for this event
    expect(dispatch).toHaveBeenCalledWith('salla-filters::changed', {});
    delete (window as unknown as { salla?: unknown }).salla;
  });

  it('offers the clear button in the empty state when filters hide every product', () => {
    state.search = 'filters[variants][a]=b';
    renderPage({ products: [] });
    expect(screen.getByTestId('empty')).toBeTruthy();
    expect(screen.getAllByTestId('clear-filters').length).toBeGreaterThan(0);
  });

  it('renders store testimonials only when the setting is on', () => {
    renderPage();
    expect(screen.queryByTestId('testimonials')).toBeNull();
    state.testimonials = true;
    renderPage();
    expect(screen.getByTestId('testimonials')).toBeTruthy();
  });
});

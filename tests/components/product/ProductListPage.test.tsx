import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { product as productApi } from '@salla.sa/twilight-theme-engine/api/product';
import { clearPriceListCache } from '../../../app/hooks/useEffectivePriceList';
import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { ProductListPage } from '../../../app/components/product/ProductListPage';

const state = vi.hoisted(() => ({
  navigate: vi.fn(),
  search: 'sort=bestSell&page=3',
  filtersSetting: true,
  testimonials: false,
  filterStatus: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
  listeners: {} as Record<string, () => void>,
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
  onSallaEvent: (name: string, cb: () => void) => {
    state.listeners[name] = cb;
    return () => {};
  },
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
vi.mock('../../../app/components/icons', () => ({
  FilterHorizontalIcon: () => <svg />,
  ViewGridIcon: () => <svg />,
  ViewListIcon: () => <svg />,
}));

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

function pageProps(overrides: Record<string, unknown> = {}) {
  return { page: { title: 'اكسسورات' }, source: { type: 'categories', value: '1' }, query: { sort: 'bestSell', filters: true }, products, pagination: { next: null }, filters: [], ...overrides };
}

describe('ProductListPage (TALLAH category page)', () => {
  beforeEach(() => {
    state.navigate.mockClear();
    state.search = 'sort=bestSell&page=3';
    state.filtersSetting = true;
    state.testimonials = false;
    state.filterStatus = 'idle';
    window.localStorage.clear();
    vi.mocked(productApi.list).mockReset();
    clearPriceListCache();
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

  it('marks the selected view as pressed and keeps it in step with the grid, switching repeatedly', () => {
    renderPage();
    const grid = screen.getByLabelText('Grid view');
    const list = screen.getByLabelText('List view');
    const gridClass = () => screen.getByTestId('grid').className;
    expect(grid.getAttribute('aria-pressed')).toBe('true');
    expect(list.getAttribute('aria-pressed')).toBe('false');
    for (let i = 0; i < 3; i++) {
      fireEvent.click(list);
      expect(list.getAttribute('aria-pressed')).toBe('true');
      expect(grid.getAttribute('aria-pressed')).toBe('false');
      expect(list.className).toContain('is-active');
      expect(gridClass()).toContain('tallah-list-grid--one-column');
      fireEvent.click(grid);
      expect(grid.getAttribute('aria-pressed')).toBe('true');
      expect(grid.className).toContain('is-active');
      expect(gridClass()).toContain('tallah-list-grid--two-columns');
    }
    expect(screen.getByRole('group', { name: 'Display' })).toBeTruthy();
  });

  it('opens with the remembered view (a refresh keeps the choice) and the buttons agree with the grid', () => {
    window.localStorage.setItem('gridView', 'one-column');
    renderPage();
    expect(screen.getByTestId('grid').className).toContain('tallah-list-grid--one-column');
    expect(screen.getByLabelText('List view').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Grid view').getAttribute('aria-pressed')).toBe('false');
  });

  it('ignores a stored value that is not one of the options', () => {
    window.localStorage.setItem('gridView', 'five-columns');
    renderPage();
    expect(screen.getByTestId('grid').className).toContain('tallah-list-grid--two-columns');
  });

  it('still switches when localStorage is unavailable (private mode)', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    renderPage();
    fireEvent.click(screen.getByLabelText('List view'));
    expect(screen.getByTestId('grid').className).toContain('tallah-list-grid--one-column');
    expect(screen.getByLabelText('List view').getAttribute('aria-pressed')).toBe('true');
    getItem.mockRestore();
    setItem.mockRestore();
    fireEvent.click(screen.getByLabelText('Grid view')); // storage works again: the in-memory copy is dropped
    expect(window.localStorage.getItem('gridView')).toBe('two-columns');
  });

  it('follows a change made in another tab', () => {
    renderPage();
    act(() => {
      window.localStorage.setItem('gridView', 'one-column');
      window.dispatchEvent(new StorageEvent('storage', { key: 'gridView', newValue: 'one-column' }));
    });
    expect(screen.getByTestId('grid').className).toContain('tallah-list-grid--one-column');
  });

  it('keeps sorting working after the view was changed', () => {
    renderPage();
    fireEvent.click(screen.getByLabelText('List view'));
    fireEvent.change(screen.getByLabelText('Sort By'), { target: { value: 'priceFromLowToTop' } });
    expect(state.navigate).toHaveBeenCalledWith('/-/c1?sort=priceFromLowToTop');
    expect(screen.getByTestId('grid').className).toContain('tallah-list-grid--one-column');
  });

  it('mirrors the view on <html> for the stylesheet, on every change', () => {
    window.localStorage.setItem('gridView', 'one-column');
    renderPage();
    expect(document.documentElement.getAttribute('data-grid-view')).toBe('one-column');
    fireEvent.click(screen.getByLabelText('Grid view'));
    expect(document.documentElement.getAttribute('data-grid-view')).toBe('two-columns');
    act(() => {
      window.localStorage.setItem('gridView', 'one-column');
      window.dispatchEvent(new StorageEvent('storage', { key: 'gridView', newValue: 'one-column' }));
    });
    expect(document.documentElement.getAttribute('data-grid-view')).toBe('one-column');
    document.documentElement.removeAttribute('data-grid-view');
  });

  it('ships a parse-time script that applies the saved view before the grid, valid for the two views only', () => {
    const html = renderToString(<ProductListPage {...(pageProps() as never)} />);
    const script = html.match(/<script>([^<]*)<\/script>/)?.[1] ?? '';
    expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('tallah-list-grid'));
    const run = () => new Function(script)();
    window.localStorage.setItem('gridView', 'one-column');
    run();
    expect(document.documentElement.getAttribute('data-grid-view')).toBe('one-column');
    document.documentElement.removeAttribute('data-grid-view');
    window.localStorage.setItem('gridView', '<img onerror=x>');
    run();
    expect(document.documentElement.hasAttribute('data-grid-view')).toBe(false);
  });

  it('hydrates the server markup (always two columns) into the saved view without a mismatch', async () => {
    const element = <ProductListPage {...(pageProps() as never)} />;
    const html = renderToString(element);
    expect(html).toContain('tallah-list-grid--two-columns');
    window.localStorage.setItem('gridView', 'one-column');
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      hydrateRoot(host, element);
    });
    const hydration = errors.mock.calls.filter((c) => /hydrat|did not match|mismatch/i.test(String(c[0])));
    errors.mockRestore();
    expect(hydration).toEqual([]);
    expect(host.querySelector('.tallah-list-grid')?.className).toContain('tallah-list-grid--one-column');
    expect(host.querySelector('[aria-pressed="true"]')?.getAttribute('aria-label')).toBe('List view');
    host.remove();
  });

  it('starts the list over when the filters change: the page the address bar carried is dropped, the rest kept', () => {
    window.history.replaceState({}, '', '/-/c1?sort=bestSell&page=3&filters[price][min]=50&filters[price][max]=200');
    renderPage();
    act(() => state.listeners['salla-filters::changed']());
    const params = new URLSearchParams(window.location.search);
    expect(params.has('page')).toBe(false);
    expect(params.get('sort')).toBe('bestSell');
    expect(params.get('filters[price][min]')).toBe('50');
    expect(params.get('filters[price][max]')).toBe('200');
    window.history.replaceState({}, '', '/');
  });

  describe('price sorting', () => {
    /** A catalog as the API lists it: by regular price, so a sale (200 now 150) sits among the 200s. */
    const catalog = [
      { id: 1, name: 'A-150-sale', regular_price: 200, price: 150, sale_price: 150, is_on_sale: true },
      { id: 2, name: 'B-200', regular_price: 200, price: 200, is_on_sale: false },
      { id: 3, name: 'C-200', regular_price: 200, price: 200, is_on_sale: false },
      { id: 4, name: 'D-159', regular_price: 159, price: 159, is_on_sale: false },
    ];
    const names = () => screen.getAllByTestId('card').map((c) => c.textContent);
    const serve = (rows = catalog) => {
      const list = vi.mocked(productApi.list);
      list.mockImplementation((async (params: { sort: string }) => {
        const asc = params.sort.endsWith('LowToTop');
        const sale = params.sort.startsWith('sale');
        const items = rows
          .filter((p) => !sale || p.is_on_sale)
          .slice()
          .sort((a, b) => ((sale ? a.price - b.price : a.regular_price - b.regular_price) * (asc ? 1 : -1)) || a.id - b.id);
        return { items, next: null };
      }) as never);
      return list;
    };

    it('lists High to Low by the price the cards show, with a discounted product in its place', async () => {
      serve();
      renderPage({ query: { sort: 'priceFromTopToLow', filters: true }, products: catalog });
      // The API's own order, until the merged list is in:
      expect(names()).toEqual(['A-150-sale', 'B-200', 'C-200', 'D-159']);
      await waitFor(() => expect(names()).toEqual(['B-200', 'C-200', 'D-159', 'A-150-sale']));
    });

    it('lists Low to High the same way', async () => {
      serve();
      renderPage({ query: { sort: 'priceFromLowToTop', filters: true }, products: [...catalog].reverse() });
      await waitFor(() => expect(names()).toEqual(['A-150-sale', 'D-159', 'B-200', 'C-200']));
    });

    it('marks the list busy while the price order is being built, and not afterwards', async () => {
      serve();
      renderPage({ query: { sort: 'priceFromTopToLow', filters: true }, products: catalog });
      const busy = () => document.querySelector('[aria-busy]')?.getAttribute('aria-busy');
      expect(busy()).toBe('true');
      await waitFor(() => expect(busy()).toBe('false'));
    });

    it('leaves the API order alone when nothing is on sale', async () => {
      const plain = catalog.map((p) => ({ ...p, price: p.regular_price, is_on_sale: false }));
      const list = serve(plain);
      renderPage({ query: { sort: 'priceFromTopToLow', filters: true }, products: plain });
      await waitFor(() => expect(document.querySelector('[aria-busy]')?.getAttribute('aria-busy')).toBe('false'));
      expect(names()).toEqual(['A-150-sale', 'B-200', 'C-200', 'D-159']);
      // One look at the sale list, no second copy of the whole list.
      expect(list.mock.calls.map(([params]) => (params as { sort: string }).sort)).toEqual(['salePriceFromTopToLow']);
    });

    it('keeps the API list when the sale list cannot be read', async () => {
      vi.mocked(productApi.list).mockRejectedValue(new Error('down'));
      renderPage({ query: { sort: 'priceFromTopToLow', filters: true }, products: catalog });
      await waitFor(() => expect(document.querySelector('[aria-busy]')?.getAttribute('aria-busy')).toBe('false'));
      expect(names()).toEqual(['A-150-sale', 'B-200', 'C-200', 'D-159']);
    });

    it('asks the API for nothing extra on the other sorts', () => {
      const list = serve();
      renderPage({ query: { sort: 'bestSell', filters: true }, products: catalog });
      expect(list).not.toHaveBeenCalled();
      expect(names()).toEqual(['A-150-sale', 'B-200', 'C-200', 'D-159']);
    });

    it('says so, rather than pass a regular-price order off as the displayed one, when the order cannot be built', async () => {
      vi.mocked(productApi.list).mockRejectedValue(new Error('down'));
      renderPage({ query: { sort: 'priceFromTopToLow', filters: true }, products: catalog });
      expect((await screen.findByTestId('price-order-note')).textContent).toBe('The order may not follow sale prices exactly');
    });

    it('shows no note when the order was built exactly, or does not apply', async () => {
      serve();
      renderPage({ query: { sort: 'priceFromTopToLow', filters: true }, products: catalog });
      await waitFor(() => expect(names()).toEqual(['B-200', 'C-200', 'D-159', 'A-150-sale']));
      expect(screen.queryByTestId('price-order-note')).toBeNull();
    });

    it('reads both orders with the active filters, so the price order is of the filtered list', async () => {
      state.search = 'sort=priceFromTopToLow&filters[price][min]=100';
      const list = serve();
      renderPage({ query: { sort: 'priceFromTopToLow', filters: true }, products: catalog });
      await waitFor(() => expect(names()).toEqual(['B-200', 'C-200', 'D-159', 'A-150-sale']));
      const calls = list.mock.calls.map(([params]) => params as { sort: string; filters?: unknown; filterable?: boolean });
      expect(calls.map((c) => c.sort).sort()).toEqual(['priceFromTopToLow', 'salePriceFromTopToLow']);
      calls.forEach((c) => {
        expect(c.filters).toEqual({ price: 1 });
        expect(c.filterable).toBe(true);
      });
    });

    it('does not let an answer to a sort that was changed away from replace the new list', async () => {
      let releaseOld: (value: unknown) => void = () => {};
      const list = vi.mocked(productApi.list);
      const rows = (sort: string) =>
        sort.startsWith('sale')
          ? [catalog[0]]
          : [...catalog].sort((a, b) => (sort.endsWith('LowToTop') ? 1 : -1) * (a.regular_price - b.regular_price) || a.id - b.id);
      list.mockImplementation((async (params: { sort: string }) => {
        if (params.sort === 'salePriceFromTopToLow') {
          // The first sort's sale list is slow.
          await new Promise((resolve) => (releaseOld = resolve));
        }
        return { items: rows(params.sort), next: null };
      }) as never);
      const view = renderPage({ query: { sort: 'priceFromTopToLow', filters: true }, products: catalog });
      // Switch to Low to High before it answers: a new list is built for it.
      view.rerender(
        <ProductListPage
          {...({
            page: { title: 'x' },
            source: { type: 'categories', value: '1' },
            query: { sort: 'priceFromLowToTop', filters: true },
            products: [...catalog].reverse(),
            pagination: { next: null },
            filters: [],
          } as never)}
        />
      );
      await waitFor(() => expect(names()).toEqual(['A-150-sale', 'D-159', 'B-200', 'C-200']));
      // The old sort answers late, with its list: nothing changes.
      await act(async () => releaseOld(undefined));
      expect(names()).toEqual(['A-150-sale', 'D-159', 'B-200', 'C-200']);
    });

    it('does not trust an empty sale order when the list itself shows a product on sale', async () => {
      // A contradiction (a product on sale on the page, none in the sale order): the merge sorts it out by its shown price.
      vi.mocked(productApi.list).mockImplementation((async (params: { sort: string }) => ({
        items: params.sort.startsWith('sale')
          ? []
          : [...catalog].sort((a, b) => b.regular_price - a.regular_price || a.id - b.id),
        next: null,
      })) as never);
      renderPage({ query: { sort: 'priceFromTopToLow', filters: true }, products: catalog });
      await waitFor(() => expect(names()).toEqual(['B-200', 'C-200', 'D-159', 'A-150-sale']));
    });

    it('does not sort a list the API cannot sort (brands)', () => {
      const list = serve();
      renderPage({ source: { type: 'brands', value: '9' }, query: { sort: 'priceFromTopToLow', filters: true }, products: catalog });
      expect(list).not.toHaveBeenCalled();
    });
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

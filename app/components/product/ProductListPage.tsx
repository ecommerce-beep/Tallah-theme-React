import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { useStore } from '@salla.sa/twilight-theme-engine/hooks/useStore';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useNavigate, useLocation, useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { sortOptions, onSallaEvent } from '@salla.sa/twilight-theme-engine/utils';
import {
  Breadcrumb,
  NoContent,
  ProductCardSkeleton,
  Image,
  RenderWhenVisible,
} from '@salla.sa/twilight-theme-engine/common';
import { SallaFilters } from '@salla.sa/twilight-components-react/filters';
import {
  ItemsList,
  ReviewItemSkeleton,
  type ItemsLoaderFn,
} from '@salla.sa/twilight-components-react';
import { Testimonials, useReorderButtons } from '@salla.sa/twilight-theme-engine/home';
import { product, parseNextPageToken } from '@salla.sa/twilight-theme-engine/api/product';
import type { ProductListLoaderData } from '@salla.sa/twilight-theme-engine/routes/product-listing';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { TallahProductCard } from './TallahProductCard';
import { useAppliedFilters } from '@salla.sa/twilight-theme-engine/routes/product-listing';
import type { ProductListFilters } from '@salla.sa/twilight-theme-engine/api/product';
import { BlockHookSlot, BottomSheet } from '../common';
import { FilterHorizontalIcon } from '../icons';

/** Mobile grid density; same localStorage key and values as the Twig theme's `product/index.twig`. */
type Cols = 'two-columns' | 'one-column';

/** localStorage-backed toolbar preference, read after mount to avoid SSR mismatch. */
function usePref<T extends string>(
  key: string,
  values: readonly T[],
  initial: T
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key) as T | null;
      // This fills the hook's own state from localStorage; no parent is
      // involved: see .react-doctor/false-positives.md.
      // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent
      if (stored && values.includes(stored)) setValue(stored);
    } catch {
      /* private mode */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        window.localStorage.setItem(key, v);
      } catch {
        /* private mode */
      }
    },
    [key]
  );
  return [value, set];
}

/** `ItemsList`'s `loader` for infinite scroll - the route already loaded the
 * first page, so this fetches subsequent ones from `pagination.next`, which
 * `parseNextPageToken` reads as either a bare cursor token or (sources
 * without true cursor pagination, e.g. `offers`) a full next-page URL. */
function useCatalogLoader(
  source: ProductListLoaderData['source'],
  selectedSort: string,
  next: string | null | undefined,
  filters: ProductListFilters | null
): ItemsLoaderFn<Product> {
  const nextCursorRef = useRef<string | null>(next ?? null);
  useEffect(() => {
    nextCursorRef.current = next ?? null;
  }, [next]);

  return useCallback(async () => {
    const { cursor, page } = parseNextPageToken(nextCursorRef.current);
    const result = await product.list({
      source: source.type,
      sourceValue: source.value,
      ...(cursor && { cursor }),
      ...(page !== undefined && { page }),
      sort: selectedSort,
      ...(filters && { filterable: true, filters }),
    });
    nextCursorRef.current = result.next;
    return result;
  }, [source.type, source.value, selectedSort, filters]);
}

type BrandEntity = { name: string; banner?: string; logo?: string; description?: string };

/** Banner + logo + description above the listing, for a `/brands/{id}` page. Renders
 * nothing for any other source type. */
function BrandHeader({ source }: { source: ProductListLoaderData['source'] }) {
  if (source.type !== 'brands') return null;
  const brand = source.entity as BrandEntity | undefined;
  if (!brand) return null;

  return (
    <>
      <Image
        width={1200}
        height={300}
        className="w-full max-h-[300px] object-cover rounded bg-gray-100"
        src={brand.banner || undefined}
        alt={brand.name}
        priority
      />
      <header className="flex flex-col md:flex-row items-center md:items-start text-center rtl:md:text-right ltr:md:text-left mt-2 mb-8">
        <Image
          className="rounded w-40 h-24 object-contain shadow-md p-4 bg-white shrink-0"
          src={brand.logo || undefined}
          alt={brand.name}
          aspectRatio="5/3"
        />
        <div className="px-5 pt-3 rtl:text-right">
          <h1 className="text-2xl font-bold mb-1">{brand.name}</h1>
          {brand.description && (
            <p
              className="text-base text-gray-500 font-medium"
              dangerouslySetInnerHTML={{ __html: brand.description }}
            />
          )}
        </div>
      </header>
    </>
  );
}

/**
 * TALLAH's toolbar (`product/index.twig`): the title centred on desktop with the sort at the end;
 * on phones the filter trigger and sort on top, then the title with the one / two column switch.
 * The product count sits beside the title once the whole list is known.
 */
function CatalogToolbar({
  title,
  showFilters,
  onOpenMobileFilters,
  productsCount,
  cols,
  onColsChange,
  selectedSort,
  sortOptionsWithTrans,
  onSortChange,
}: {
  title: ReactNode;
  showFilters: boolean;
  onOpenMobileFilters: () => void;
  /** `undefined` when more pages exist: the API has no total, so no wrong number is shown. */
  productsCount: number | undefined;
  cols: Cols;
  onColsChange: (cols: Cols) => void;
  selectedSort: string;
  sortOptionsWithTrans: ReturnType<typeof sortOptions>;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  const { t } = useTranslation();
  const count =
    productsCount !== undefined ? (
      <span className="products-count mx-1 text-sm font-normal text-gray-500">
        ({productsCount})
      </span>
    ) : null;

  return (
    <>
      <div className="tallah-list-bar mb-4 flex items-center justify-between gap-3 sm:mb-6">
        <h1
          className="primary-bold w-full text-sm max-lg:sr-only md:text-xl lg:text-center"
          id="page-main-title"
        >
          {title}
          {count}
        </h1>
        {showFilters && (
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="filters-trigger lg:hidden"
            aria-label={t('pages.categories.filters', 'Filters')}
          >
            <FilterHorizontalIcon aria-hidden="true" />
          </button>
        )}
        {sortOptionsWithTrans.length > 0 && (
          <select
            id="product-filter"
            className="form-input tallah-list-sort shrink-0"
            value={selectedSort}
            onChange={onSortChange}
            aria-label={t('pages.categories.sorting', 'Sort By')}
          >
            {sortOptionsWithTrans.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-4 flex items-center justify-between lg:hidden">
        <p className="primary-bold flex-1 text-sm" aria-hidden="true">
          {title}
          {count}
        </p>
        <div className="flex flex-1 items-center justify-end gap-1.5 text-2xl">
          <button
            type="button"
            className={`two-columns${cols === 'two-columns' ? ' active' : ''}`}
            aria-pressed={cols === 'two-columns'}
            aria-label={t('blocks.catalog.view_grid', 'Grid view')}
            onClick={() => onColsChange('two-columns')}
          >
            <i className="sicon-pause" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`one-column rotate-90${cols === 'one-column' ? ' active' : ''}`}
            aria-pressed={cols === 'one-column'}
            aria-label={t('blocks.catalog.view_list', 'List view')}
            onClick={() => onColsChange('one-column')}
          >
            <i className="sicon-pause" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}

/** Shown while the URL carries filters: the instant-apply widgets have no reset of their own. */
function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="tallah-clear-filters link--primary mb-3 mt-1 text-sm"
      data-testid="clear-filters"
      onClick={onClick}
    >
      {t('blocks.catalog.clear_filters', 'Clear filters')}
    </button>
  );
}

/** The desktop filter column (lg and up, as in Twig) + the product grid itself. */
function CatalogGrid({
  toolbar,
  hasFilters,
  onClearFilters,
  filtersKey,
  showFilters,
  filters,
  listKey,
  selectedSort,
  cols,
  products,
  pagination,
  loader,
  wideGridClass,
  filterStatus,
  onRetry,
}: {
  /** Rendered at the top of the content column, beside the filter column (as in Twig). */
  toolbar: ReactNode;
  hasFilters: boolean;
  onClearFilters: () => void;
  /** Remounts the filter widgets so they drop their selection after a clear. */
  filtersKey: number;
  filterStatus: 'idle' | 'loading' | 'ready' | 'error';
  onRetry: () => void;
  showFilters: boolean;
  filters: ProductListLoaderData['filters'];
  listKey: string;
  selectedSort: string;
  cols: Cols;
  products: Product[];
  pagination: ProductListLoaderData['pagination'];
  loader: ItemsLoaderFn<Product>;
  wideGridClass: string;
}) {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <div className="flex flex-col items-start lg:flex-row">
      {showFilters && (
        <div className="hidden w-72 flex-none lg:sticky lg:top-20 lg:block">
          <div className="tallah-filters-head mb-4 flex items-center gap-2 text-primary">
            <FilterHorizontalIcon aria-hidden="true" />
            <span className="text-base font-semibold">{t('pages.categories.filters', 'Filters')}</span>
          </div>
          {hasFilters && <ClearFiltersButton onClick={onClearFilters} />}
          <SallaFilters key={filtersKey} id="filters-menu" filters={filters as never} />
        </div>
      )}

      <div className={`main-content w-full min-w-0 flex-1${showFilters ? ' lg:ms-8' : ''}`}>
        {toolbar}

        <HookSlot name="product:list.items.start" />
        {/* legacy name for the same point */}
        <HookSlot name="product:index.items.start" />

        <div
          className={`flex min-h-screen${filterStatus === 'loading' ? ' opacity-60' : ''}`}
          aria-busy={filterStatus === 'loading'}
        >
          {filterStatus === 'error' ? (
            <div className="flex min-w-0 flex-1 flex-col items-center">
              <NoContent
                icon="sicon-shopping-bag"
                message={t('common.errors.error_occurred', 'Something went wrong')}
              />
              <button
                type="button"
                data-testid="store-catalog-filters-retry"
                className="link--primary mt-4"
                onClick={onRetry}
              >
                {t('common.elements.try_again', 'Try again')}
              </button>
            </div>
          ) : (
            <ItemsList<Product>
              key={`${listKey}-${selectedSort}`}
              resetKey={`${listKey}-${selectedSort}`}
              items={products}
              loader={loader}
              mode={pagination?.next ? 'infinite' : 'static'}
              pageUrl={location.pathname + location.searchStr}
              className="s-products-list flex-1 min-w-0"
              itemsClassName={`s-products-list-wrapper s-products-list-vertical-cards tallah-list-grid tallah-list-grid--${cols}${showFilters ? ' s-products-list-with-filters s-products-list-filters-results' : ''}${wideGridClass}`}
              skeleton={<ProductCardSkeleton />}
              skeletonType="item"
              skeletonCount={12}
              empty={
                <div className="flex w-full flex-col items-center">
                  <NoContent
                    icon="sicon-shopping-bag"
                    message={t('pages.categories.no_products', 'No products found in this category')}
                  />
                  {hasFilters && <ClearFiltersButton onClick={onClearFilters} />}
                </div>
              }
              t={(key, fallback) => t(key, fallback || key)}
            >
              {(items) =>
                items.map((prod, idx) => (
                  <TallahProductCard key={prod.id} product={prod} imagePriority={idx < 4} />
                ))
              }
            </ItemsList>
          )}
        </div>

        {/* legacy name for the same point */}
        <HookSlot name="product:index.items.end" />
        <HookSlot name="product:list.items.end" />
      </div>
    </div>
  );
}

/** The store-reviews block below the listing — categories only, and only when
 * the merchant has enabled it. */
function CategoryTestimonials({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    // `estimatedHeight="0"`: `RenderWhenVisible` hard-codes `min-height` on
    // its wrapper and never clears it, so an empty `salla-reviews` (no
    // category reviews) reserves 400px. It's collapsed by CSS when empty.
    <RenderWhenVisible estimatedHeight="0px" placeholder={<ReviewItemSkeleton />}>
      <Testimonials data={{}} />
    </RenderWhenVisible>
  );
}

/**
 * Theme fork of the engine `ProductListPage`, registered as `product:list-page`
 * in `app/router.tsx` for every product listing.
 *
 * Same data flow as upstream (loader, sort, filters, cursor pagination); the
 * presentation follows TALLAH's `product/index.twig`: centred title + sort,
 * a filter column from `lg`, a one / two column switch on phones, and the
 * theme's `TallahProductCard`. Upgrade notes: `FORKS.md`.
 */

export function ProductListPage({
  page,
  source,
  query,
  products,
  pagination,
  filters,
}: ProductListLoaderData) {
  const { t } = useTranslation();
  const store = useStore();
  const { theme } = useTwilight();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedSort = query.sort;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersKey, setFiltersKey] = useState(0);
  const [cols, setCols] = usePref<Cols>('gridView', ['two-columns', 'one-column'], 'two-columns');

  const showFilters = !!(query.filters && store?.settings?.product?.filters);

  // The selection made in `<salla-filters>` — re-queries the list (the route's
  // loader output was fetched without it).
  const {
    filters: appliedFilters,
    page: filteredPage,
    lastPage,
    status: filterStatus,
    retry: retryFilters,
  } = useAppliedFilters(source, selectedSort, showFilters);
  // While a new selection loads, the previous page stays up (dimmed, `aria-busy`); if the
  // request fails nothing stale passes for the new selection. Infinite scroll is only live
  // for the loader's own page or a fully loaded filtered one.
  const shownPage = filterStatus === 'ready' ? filteredPage : lastPage;
  const shownProducts =
    filterStatus === 'error'
      ? []
      : filterStatus === 'idle'
        ? products
        : (shownPage?.items ?? products);
  const shownNext =
    filterStatus === 'idle'
      ? pagination?.next
      : filterStatus === 'ready'
        ? filteredPage?.next
        : null;
  const filteredKey =
    filterStatus === 'idle'
      ? ''
      : `${filterStatus}${filterStatus === 'ready' ? JSON.stringify(appliedFilters) : ''}`;

  const isBrand = source.type === 'brands';
  const isReorder = source.type === 'reorder';
  useReorderButtons(isReorder);

  const sortOptionsWithTrans = useMemo(() => sortOptions(selectedSort, t), [selectedSort, t]);

  useEffect(() => {
    const handleFiltersChanged = () => setFiltersOpen(false);
    return onSallaEvent('salla-filters::changed', handleFiltersChanged);
  }, []);

  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      // `location.pathname` (not `window.location.pathname`) — the router
      // already strips the store's username/locale base off it and re-adds
      // its own when navigating, so passing the raw browser path here
      // doubles it up (`/store/ar/store/ar/...`) and 404s.
      const params = new URLSearchParams(location.searchStr);
      params.set('sort', event.target.value);
      params.delete('page');
      const search = params.toString();
      navigate(location.pathname + (search ? `?${search}` : ''));
    },
    [navigate, location.pathname, location.searchStr]
  );

  // The hook's own selection (set from the URL on mount and by the widgets), not the router location.
  const hasFilters = appliedFilters !== null;
  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(location.searchStr);
    Array.from(params.keys())
      .filter((k) => k.startsWith('filters') || k === 'page')
      .forEach((k) => params.delete(k));
    const search = params.toString();
    setFiltersKey((k) => k + 1);
    // `useAppliedFilters` only learns about a new selection from this event; an empty one resets it.
    (window as unknown as { salla?: { event?: { dispatch?: (name: string, ...args: unknown[]) => void } } }).salla?.event?.dispatch?.('salla-filters::changed', {});
    navigate(location.pathname + (search ? `?${search}` : ''));
  }, [navigate, location.pathname, location.searchStr]);

  const listKey = source.value ?? source.type;
  // Merchant blocks go on category pages only, as in Twig; offers, search and brands get none.
  const blockScope = useMemo(
    () =>
      source.type === 'categories' && source.value ? { category_id: source.value } : undefined,
    [source.type, source.value]
  );
  const loader = useCatalogLoader(source, selectedSort, shownNext, appliedFilters);

  // Filter-less lists (offers, etc.) get the full row: 5 columns on desktop.
  const wideGridClass = !query.filters ? ' s-products-list-cols-5' : '';

  return (
    <div
      key={listKey}
      className="AR-index container mb-10 px-2.5"
      data-source={isReorder ? 'reorder' : undefined}
    >
      {theme?.settings?.product_index_show_breadcrumbs !== false && <Breadcrumb page={page} />}

      <BrandHeader source={source} />

      <HookSlot name="product:list.start" />

      {/* App-block hook `product.index.before_products_group_with_filter` — above the listing */}
      <BlockHookSlot
        name="product.index.before_products_group_with_filter"
        wrapper="s-before-products-list"
        className="!mt-0"
        scope={blockScope}
      />

      <div className="mt-4 md:mt-10">
        <CatalogGrid
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          filtersKey={filtersKey}
          toolbar={
          <CatalogToolbar
            title={isBrand ? t('common.titles.products') : page.title}
            showFilters={showFilters}
            onOpenMobileFilters={() => setFiltersOpen(true)}
            // `pagination.next` truthy means more pages exist beyond this one —
            // `products.length` (this page only) isn't the true total then, and
            // the API's cursor pagination has no total-count field to fall back
            // to, so show nothing rather than a number that's quietly wrong.
            productsCount={shownNext || shownProducts.length === 0 ? undefined : shownProducts.length}
            cols={cols}
            onColsChange={setCols}
            selectedSort={selectedSort}
            sortOptionsWithTrans={sortOptionsWithTrans}
            onSortChange={handleSortChange}
          />
          }
          showFilters={showFilters}
          filters={filters}
          listKey={`${listKey}${filteredKey}`}
          filterStatus={filterStatus}
          onRetry={retryFilters}
          selectedSort={selectedSort}
          cols={cols}
          products={shownProducts}
          pagination={{ next: shownNext ?? null }}
          loader={loader}
          wideGridClass={wideGridClass}
        />
      </div>

      {/* App-block hook `product.index.after_products_group_with_filter` — below the listing */}
      <BlockHookSlot
        name="product.index.after_products_group_with_filter"
        wrapper="s-after-products-list"
        scope={blockScope}
      />

      {showFilters && (
        <BottomSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t('pages.categories.filters', 'Filters')}
        >
          {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
          <SallaFilters key={filtersKey} id="filters-menu-mobile" filters={filters as never} />
        </BottomSheet>
      )}

      <CategoryTestimonials
        enabled={source.type === 'categories' && !!store?.settings?.category?.testimonial_enabled}
      />

      {/* App-block hook `product.index.after_testimonials` — after the store-reviews block */}
      <BlockHookSlot
        name="product.index.after_testimonials"
        wrapper="s-after-testimonials"
        scope={blockScope}
      />

      <HookSlot name="product:list.end" />
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { product, parseNextPageToken } from '@salla.sa/twilight-theme-engine/api/product';
import type { ProductListFilters } from '@salla.sa/twilight-theme-engine/api/product';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import {
  createEffectivePriceList,
  type EffectivePriceList,
  type PricePage,
  type PricedItem,
  type PriceSortConfig,
} from '../lib/effectivePriceList';

type ListedProduct = Product & PricedItem;

export type EffectivePriceStatus =
  /** Not a price sort. */
  | 'idle'
  /** Reading the first page. */
  | 'loading'
  /** `items` are the list, in displayed-price order. */
  | 'ready'
  /** Nothing is on sale: the API's order is already the displayed one. */
  | 'passthrough'
  /** The order could not be built (a request failed, or it would take too many): the API's order stands. */
  | 'unavailable';

interface State {
  key: string;
  status: EffectivePriceStatus;
  items: Product[];
  hasMore: boolean;
  exact: boolean;
}

const EMPTY: Product[] = [];

/** Pages already asked for, kept for a minute: switching a sort back, or two lists of one page, repeat nothing. */
const CACHE_TTL_MS = 60_000;
const CACHE_MAX = 60;
const pageCache = new Map<string, { at: number; page: Promise<PricePage<ListedProduct>> }>();

/** For tests: the cache outlives a render, so one test's pages must not answer the next one. */
export function clearPriceListCache() {
  pageCache.clear();
}

function cachedPage(cacheKey: string, load: () => Promise<PricePage<ListedProduct>>) {
  const now = Date.now();
  const hit = pageCache.get(cacheKey);
  if (hit && now - hit.at < CACHE_TTL_MS) return hit.page;
  const page = load();
  pageCache.set(cacheKey, { at: now, page });
  page.catch(() => pageCache.delete(cacheKey)); // a failure is not worth remembering
  while (pageCache.size > CACHE_MAX) pageCache.delete(pageCache.keys().next().value as string);
  return page;
}

/**
 * A price-sorted product list in the order of the prices the cards show (see `lib/effectivePriceList.ts`), read
 * page by page from the API for the same source and filters as the listing, whose own order it replaces once `status`
 * is `ready`. `approximate` is set when the order cannot be promised to match the prices shown (including when it
 * could not be built at all), and the page says so. `baseItems` is the listing's own first page: a product on sale
 * in it, while the sale order is empty, is a contradiction the merge sorts out rather than passes over.
 */
export function useEffectivePriceList(
  config: PriceSortConfig | null,
  source: { type: string; value?: string | number | null },
  filters: ProductListFilters | null,
  baseItems: readonly Product[]
) {
  const key = config ? JSON.stringify([config.sort, source.type, source.value, filters]) : '';
  const [state, setState] = useState<State>({ key: '', status: 'idle', items: EMPTY, hasMore: false, exact: true });
  const listRef = useRef<EffectivePriceList<ListedProduct> | null>(null);
  const baseRef = useRef(baseItems);
  baseRef.current = baseItems;

  useEffect(() => {
    if (!config) return;
    let alive = true;
    const list = createEffectivePriceList<ListedProduct>({
      config,
      fetchPage: (sort, token) =>
        cachedPage(JSON.stringify([sort, token, source.type, source.value, filters]), async () => {
          const { cursor, page } = parseNextPageToken(token);
          const result = await product.list({
            source: source.type as never,
            sourceValue: source.value as never,
            ...(cursor && { cursor }),
            ...(page !== undefined && { page }),
            sort,
            ...(filters && { filterable: true, filters }),
          });
          return { items: result.items as ListedProduct[], next: result.next };
        }),
    });
    listRef.current = list;

    const run = async () => {
      const contradiction = baseRef.current.some((item) => (item as ListedProduct).is_on_sale);
      if (!(await list.hasSales()) && !contradiction) {
        if (alive) setState({ key, status: 'passthrough', items: EMPTY, hasMore: false, exact: true });
        return;
      }
      const first = await list.next();
      if (alive) setState({ key, status: 'ready', items: first.items, hasMore: !first.done, exact: list.exact() });
    };
    run().catch(() => {
      if (alive) setState({ key, status: 'unavailable', items: EMPTY, hasMore: false, exact: false });
    });

    return () => {
      alive = false;
    };
    // `config`, `source` and `filters` are all inside `key`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /** `ItemsList`'s loader: the next page of the list (it rejects, and `ItemsList` shows its error, rather than guess). */
  const loadMore = useCallback(async () => {
    const list = listRef.current;
    if (!list) return { items: [], next: null };
    const page = await list.next();
    setState((prev) => (prev.status === 'ready' ? { ...prev, exact: list.exact() } : prev));
    return { items: page.items, next: page.done ? null : 'more' };
  }, []);

  const status: EffectivePriceStatus = !config ? 'idle' : state.key === key ? state.status : 'loading';
  return {
    status,
    items: status === 'ready' ? state.items : EMPTY,
    hasMore: status === 'ready' && state.hasMore,
    approximate: status === 'unavailable' || (status === 'ready' && !state.exact),
    loadMore,
  };
}

/**
 * Price sorting that follows the price the cards show.
 *
 * Salla's `priceFromLowToTop` / `priceFromTopToLow` order the catalog by each product's *regular* price, while a
 * card shows the sale price while a sale runs. A product on sale (regular 200, now 150) therefore sits among the
 * 200s: "High to low" puts a 150 above 159s and 200s. The sale price sorts (`salePriceFrom…`) list only the
 * products on sale, in order of the price they show.
 *
 * Two server orders, merged lazily, give the displayed-price order of the whole catalog:
 *   A. the regular order, from which the products on sale are left out (their price there is not the one shown);
 *   B. the sale order, which holds exactly those products.
 * A page of the result takes the better head of A and B until it is full. The server does the sorting and the
 * paging; each stream is read only as far as a page needs, so a page costs about one request per stream, not a read
 * of the catalog. Nothing is re-sorted from a partial page.
 *
 * What is not claimed. The merge is exact for products whose displayed price is their regular price or their sale
 * price, if B really lists every product on sale. Where that cannot be relied on the list says so (`exact()` is
 * `false`, and the page tells the shopper) instead of passing a regular-price order off as the displayed one:
 *   - a product shown with a "starting from" price has a displayed price neither stream orders it by;
 *   - a product flagged on sale in A that B never lists is put where its price belongs when it is found, which for
 *     an ascending list can be after the products around it were already handed out;
 *   - a page that would take more than `maxScanPages` reads of A to fill (a catalog whose top is almost all on
 *     sale) is not served: {@link PriceOrderUnavailable} is thrown and the caller keeps the API's order, flagged.
 */

export type PriceDirection = 'asc' | 'desc';

export interface PriceSortConfig {
  direction: PriceDirection;
  /** The API's sort by regular price, in this direction. */
  sort: string;
  /** The API's sort by sale price, in this direction (only products on sale). */
  saleSort: string;
}

const PRICE_SORTS: Record<string, PriceSortConfig> = {
  priceFromLowToTop: { direction: 'asc', sort: 'priceFromLowToTop', saleSort: 'salePriceFromLowToTop' },
  priceFromTopToLow: { direction: 'desc', sort: 'priceFromTopToLow', saleSort: 'salePriceFromTopToLow' },
};

/** Lists that can be sorted by price (the API only sorts categories and searches). */
const SORTABLE_SOURCES = new Set(['categories', 'search']);

/** The price sort for `sort` on this kind of list, or `null` when it is not one (or the list cannot be sorted). */
export function priceSortFor(sort: string | undefined, sourceType: string | undefined): PriceSortConfig | null {
  if (!sort || !sourceType || !SORTABLE_SOURCES.has(sourceType)) return null;
  return PRICE_SORTS[sort] ?? null;
}

export interface PricedItem {
  id: number | string;
  is_on_sale?: boolean;
  price?: unknown;
  regular_price?: unknown;
  sale_price?: unknown;
  starting_price?: unknown;
}

function amountOf(raw: unknown): number | null {
  const value = typeof raw === 'object' && raw !== null ? (raw as { amount?: unknown }).amount : raw;
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * The price a product card shows, by the card's own rules (`TallahProductCard`): the sale price while on sale,
 * otherwise the "starting from" price when it has one, otherwise the price. `null` when the card shows none.
 */
export function displayedPrice(item: PricedItem): number | null {
  const raw = item.is_on_sale ? item.sale_price : item.starting_price ? item.starting_price : item.price;
  const amount = amountOf(raw);
  return amount === null || amount === 0 ? null : amount;
}

/** Shown as "starting from": its displayed price is not what the API's price sorts order it by. */
const showsStartingPrice = (item: PricedItem) => !item.is_on_sale && Boolean(item.starting_price);

export interface PricePage<T> {
  items: T[];
  next: string | null | undefined;
}

/** One request of the listing: `token` is what the previous page's `next` held (`null` for the first page). */
export type FetchPricePage<T> = (sort: string, token: string | null) => Promise<PricePage<T>>;

/** A page of the price order could not be built within the reads allowed; the API's own order stands. */
export class PriceOrderUnavailable extends Error {
  constructor() {
    super('The displayed-price order needs more requests than allowed');
    this.name = 'PriceOrderUnavailable';
  }
}

export interface EffectivePriceOptions<T extends PricedItem> {
  fetchPage: FetchPricePage<T>;
  config: PriceSortConfig;
  /** Products per page handed back. */
  pageSize?: number;
  /** Most reads of the regular order one page may need (when the top of it is mostly products on sale). */
  maxScanPages?: number;
}

export interface EffectivePriceList<T> {
  /** The next page of the list; rejects (with {@link PriceOrderUnavailable}, or the request's error) rather than guess. */
  next(): Promise<{ items: T[]; done: boolean }>;
  /** Whether any product is on sale (reads the first page of the sale order, once). `false`: the API's order is right. */
  hasSales(): Promise<boolean>;
  /** `false` once something handed out may not be in displayed-price order (see the notes above). */
  exact(): boolean;
}

export function createEffectivePriceList<T extends PricedItem>({
  fetchPage,
  config,
  pageSize = 16,
  maxScanPages = 8,
}: EffectivePriceOptions<T>): EffectivePriceList<T> {
  const { direction, sort, saleSort } = config;

  /** Position key: a missing price goes last. */
  const key = (value: number | null) => (value === null ? (direction === 'asc' ? Infinity : -Infinity) : value);
  /** Negative when `a` comes first: lower first when ascending, higher first when descending. */
  const compare = (a: number, b: number) => (a === b ? 0 : direction === 'asc' ? (a < b ? -1 : 1) : a > b ? -1 : 1);
  const priceKey = (item: T) => key(displayedPrice(item));

  // A: the regular order, without the products on sale.
  let aBuf: T[] = [];
  let aToken: string | null = null;
  let aDone = false;
  /** The API's sort key of the last product read from A: no unseen, not-on-sale product of A is beyond it. */
  let aBound: number | null = null;
  const aSeen = new Set<T['id']>();
  const aSale = new Map<T['id'], T>();
  // B: the sale order.
  let bBuf: T[] = [];
  let bToken: string | null = null;
  let bDone = false;
  const bSeen = new Set<T['id']>();
  const orphaned = new Set<T['id']>();
  /** Where B has been read to: it is sorted, so a product it should have listed before this, and did not, is not in it. */
  let bFrontier: number | null = null;

  let lastKey: number | null = null;
  let inexact = false;
  let saleProbe: Promise<boolean> | null = null;

  /** Puts a product B does not list where its price belongs (at or after `from` in B's buffer). */
  const addOrphan = (item: T, from: number) => {
    if (orphaned.has(item.id)) return;
    orphaned.add(item.id);
    const k = priceKey(item);
    let at = bBuf.length;
    for (let i = from; i < bBuf.length; i += 1) {
      if (compare(k, priceKey(bBuf[i])) < 0) {
        at = i;
        break;
      }
    }
    if (lastKey !== null && compare(k, lastKey) < 0) inexact = true; // its place is behind what was already handed out
    bBuf.splice(at, 0, item);
  };

  /** The products flagged on sale in A that B has read past without listing: they are B's to list no more. */
  const reconcile = (from: number) => {
    if (bFrontier === null) return;
    const frontier = bFrontier;
    aSale.forEach((item, id) => {
      if (!bSeen.has(id) && (bDone || compare(priceKey(item), frontier) < 0)) addOrphan(item, from);
    });
  };

  const readB = async () => {
    const page = await fetchPage(saleSort, bToken);
    bToken = page.next ?? null;
    bDone = !page.next;
    page.items.forEach((item) => {
      if (bSeen.has(item.id)) return;
      bSeen.add(item.id);
      bBuf.push(item);
    });
    const last = page.items[page.items.length - 1];
    if (last) bFrontier = priceKey(last);
    else if (bDone) bFrontier = direction === 'asc' ? Infinity : -Infinity;
  };

  const readA = async (from: number) => {
    const page = await fetchPage(sort, aToken);
    aToken = page.next ?? null;
    aDone = !page.next;
    page.items.forEach((item) => {
      if (aSeen.has(item.id)) return;
      aSeen.add(item.id);
      const apiKey = amountOf(item.regular_price) ?? amountOf(item.price);
      if (apiKey !== null) aBound = apiKey;
      if (item.is_on_sale) {
        aSale.set(item.id, item);
        reconcile(from);
      } else {
        aBuf.push(item);
      }
    });
  };

  let queue: Promise<unknown> = Promise.resolve();
  /** One read of the lists at a time: two pages asked for together would otherwise take the same products. */
  const serial = <R>(task: () => Promise<R>): Promise<R> => {
    const result = queue.then(task, task);
    queue = result.catch(() => undefined);
    return result;
  };

  return {
    exact: () => !inexact,
    hasSales: () => {
      saleProbe ??= serial(async () => {
        if (bBuf.length === 0 && !bDone && bSeen.size === 0) await readB();
        return bBuf.length > 0 || !bDone;
      });
      return saleProbe;
    },
    next: () =>
      serial(async () => {
        const out: T[] = [];
        let a = 0;
        let b = 0;
        let scans = 0;
        while (out.length < pageSize) {
          if (b >= bBuf.length && !bDone) {
            await readB();
            reconcile(b);
            continue;
          }
          const bHead = bBuf[b];
          if (a >= aBuf.length && !aDone) {
            // B's head can go without reading A when nothing unseen in A could come before it.
            if (bHead && aBound !== null && compare(priceKey(bHead), aBound) <= 0) {
              out.push(bHead);
              b += 1;
              continue;
            }
            scans += 1;
            if (scans > maxScanPages) throw new PriceOrderUnavailable();
            await readA(b);
            continue;
          }
          const aHead = aBuf[a];
          if (!aHead && !bHead) break;
          if (aHead && (!bHead || compare(priceKey(aHead), priceKey(bHead)) <= 0)) {
            out.push(aHead);
            a += 1;
          } else {
            out.push(bHead);
            b += 1;
          }
        }
        // Handed out only now, so a read that failed above leaves the lists as they were and the page can be asked again.
        aBuf = aBuf.slice(a);
        bBuf = bBuf.slice(b);
        out.forEach((item) => {
          if (showsStartingPrice(item)) inexact = true;
          lastKey = priceKey(item);
        });
        return { items: out, done: aDone && aBuf.length === 0 && bDone && bBuf.length === 0 };
      }),
  };
}

import { describe, it, expect } from 'vitest';
import {
  createEffectivePriceList,
  displayedPrice,
  priceSortFor,
  PriceOrderUnavailable,
  type FetchPricePage,
  type PriceSortConfig,
} from '../../app/lib/effectivePriceList';

interface Item {
  id: number;
  regular_price: number;
  /** The price the API calls `price`: the sale price while on sale. */
  price: number;
  sale_price: number | null;
  starting_price?: number | null;
  is_on_sale: boolean;
}

const DESC: PriceSortConfig = { direction: 'desc', sort: 'priceFromTopToLow', saleSort: 'salePriceFromTopToLow' };
const ASC: PriceSortConfig = { direction: 'asc', sort: 'priceFromLowToTop', saleSort: 'salePriceFromLowToTop' };

/** A deterministic random source, so a failing catalog can be replayed. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

interface CatalogOptions {
  size: number;
  /** Share of products on sale. */
  saleShare: number;
  /** Deepest discount (0.5: up to half off). */
  depth?: number;
  /** Few distinct prices make many ties. */
  distinctPrices?: number;
  seed?: number;
}

function makeCatalog({ size, saleShare, depth = 0.4, distinctPrices = 40, seed = 1 }: CatalogOptions): Item[] {
  const random = rng(seed);
  return Array.from({ length: size }, (_, i) => {
    const regular = (1 + Math.floor(random() * distinctPrices)) * 10;
    const onSale = random() < saleShare;
    const sale = onSale ? Math.max(5, Math.round(regular * (1 - random() * depth))) : null;
    return { id: i + 1, regular_price: regular, price: sale ?? regular, sale_price: sale, is_on_sale: onSale };
  });
}

interface Server {
  fetchPage: FetchPricePage<Item>;
  /** Requests made, by which order they asked for. */
  count: () => { regular: number; sale: number; total: number };
}

/**
 * A server that sorts the way Salla's does: the price sorts by regular price, the sale sorts list only the products
 * on sale, by sale price. `omitFromSale` names products flagged on sale that the sale order does not list.
 */
function server(catalog: Item[], pageSize = 16, omitFromSale: number[] = []): Server {
  const made = { regular: 0, sale: 0 };
  const fetchPage: FetchPricePage<Item> = async (sort, token) => {
    const asc = sort.endsWith('LowToTop');
    const sale = sort.startsWith('sale');
    made[sale ? 'sale' : 'regular'] += 1;
    const rows = catalog
      .filter((p) => !sale || (p.is_on_sale && !omitFromSale.includes(p.id)))
      .slice()
      .sort(
        (a, b) =>
          (sale ? (a.sale_price ?? 0) - (b.sale_price ?? 0) : a.regular_price - b.regular_price) * (asc ? 1 : -1) ||
          a.id - b.id
      );
    const start = Number(token ?? 0);
    return { items: rows.slice(start, start + pageSize), next: start + pageSize < rows.length ? String(start + pageSize) : null };
  };
  return { fetchPage, count: () => ({ ...made, total: made.regular + made.sale }) };
}

async function readAll(
  catalogServer: Server,
  config: PriceSortConfig,
  options: { pageSize?: number; maxScanPages?: number } = {}
) {
  const list = createEffectivePriceList({ fetchPage: catalogServer.fetchPage, config, ...options });
  const pages: Item[][] = [];
  const perPageRequests: number[] = [];
  for (let i = 0; i < 2000; i += 1) {
    const before = catalogServer.count().total;
    const { items, done } = await list.next();
    perPageRequests.push(catalogServer.count().total - before);
    pages.push(items);
    if (done) break;
  }
  return { list, pages, items: pages.flat(), perPageRequests };
}

const ordered = (items: Item[], config: PriceSortConfig) => {
  const prices = items.map((p) => displayedPrice(p) ?? (config.direction === 'asc' ? Infinity : -Infinity));
  return prices.every((price, i) => i === 0 || (config.direction === 'asc' ? prices[i - 1] <= price : prices[i - 1] >= price));
};

describe('priceSortFor', () => {
  it('knows the two price sorts, on the lists the API can sort', () => {
    expect(priceSortFor('priceFromTopToLow', 'categories')?.direction).toBe('desc');
    expect(priceSortFor('priceFromLowToTop', 'search')?.direction).toBe('asc');
  });

  it('is nothing for other sorts and for lists the API does not sort', () => {
    expect(priceSortFor('bestSell', 'categories')).toBeNull();
    expect(priceSortFor('priceFromTopToLow', 'brands')).toBeNull();
    expect(priceSortFor(undefined, 'categories')).toBeNull();
  });
});

describe("displayedPrice (the card's rules)", () => {
  it('is the sale price while on sale, whatever stale sale price a product not on sale carries', () => {
    expect(displayedPrice({ id: 1, is_on_sale: true, sale_price: 150, price: 150, regular_price: 200 })).toBe(150);
    expect(displayedPrice({ id: 2, is_on_sale: false, sale_price: 120, price: 200, regular_price: 200 })).toBe(200);
  });

  it('is the starting price for a product shown "from", and nothing for a price of zero or none', () => {
    expect(displayedPrice({ id: 3, is_on_sale: false, starting_price: 80, price: 120 })).toBe(80);
    expect(displayedPrice({ id: 4, is_on_sale: false, price: 0 })).toBeNull();
    expect(displayedPrice({ id: 5, is_on_sale: false })).toBeNull();
    expect(displayedPrice({ id: 6, is_on_sale: false, price: { amount: 99 } })).toBe(99);
  });
});

describe('createEffectivePriceList: the reported catalog', () => {
  const catalog: Item[] = [
    { id: 1, regular_price: 200, price: 150, sale_price: 150, is_on_sale: true },
    { id: 2, regular_price: 200, price: 200, sale_price: 120, is_on_sale: false },
    { id: 3, regular_price: 159, price: 159, sale_price: null, is_on_sale: false },
    { id: 4, regular_price: 200, price: 200, sale_price: null, is_on_sale: false },
  ];

  it('puts the discounted product where its shown price belongs, high to low and low to high', async () => {
    const desc = await readAll(server(catalog), DESC, { pageSize: 2 });
    expect(desc.items.map((p) => displayedPrice(p))).toEqual([200, 200, 159, 150]);
    const asc = await readAll(server(catalog), ASC, { pageSize: 2 });
    expect(asc.items.map((p) => displayedPrice(p))).toEqual([150, 159, 200, 200]);
  });

  it('is what the API alone gets wrong, for contrast', async () => {
    const api = (await server(catalog).fetchPage('priceFromTopToLow', null)).items.map((p) => displayedPrice(p));
    expect(api).toEqual([150, 200, 200, 159]);
  });
});

describe('createEffectivePriceList: correctness over many catalogs', () => {
  const cases: CatalogOptions[] = [
    { size: 20, saleShare: 0.3 },
    { size: 100, saleShare: 0.1, distinctPrices: 8 },
    { size: 100, saleShare: 0.5, depth: 0.9 },
    { size: 500, saleShare: 0.3, distinctPrices: 5 },
    { size: 500, saleShare: 1, depth: 0.5 },
    { size: 1000, saleShare: 0.2 },
    { size: 1000, saleShare: 0, seed: 7 },
  ];

  it.each(cases.flatMap((c) => [DESC, ASC].map((config) => [c, config] as const)))(
    '%j in %j order: globally ordered, every product exactly once, whole pages',
    async (options, config) => {
      const catalog = makeCatalog(options);
      const { items, pages, list } = await readAll(server(catalog), config);
      expect(items).toHaveLength(catalog.length);
      expect(new Set(items.map((p) => p.id)).size).toBe(catalog.length);
      expect(ordered(items, config)).toBe(true);
      pages.slice(0, -1).forEach((page) => expect(page).toHaveLength(16));
      expect(list.exact()).toBe(true);
    },
    30000
  );

  it('keeps equal prices in the order each stream lists them, and gives the same list every time', async () => {
    const catalog = makeCatalog({ size: 300, saleShare: 0.3, distinctPrices: 3 });
    const first = (await readAll(server(catalog), DESC)).items.map((p) => p.id);
    const second = (await readAll(server(catalog), DESC)).items.map((p) => p.id);
    expect(second).toEqual(first);
    // Not on sale: the server lists ties by id, and the merge never reorders a stream.
    const plain = first.filter((id) => !catalog[id - 1].is_on_sale);
    const expected = [...plain].sort((a, b) => catalog[b - 1].regular_price - catalog[a - 1].regular_price || a - b);
    expect(plain).toEqual(expected);
  });

  it('serves the same list with a different page size, and with infinite scroll asking for pages together', async () => {
    const catalog = makeCatalog({ size: 200, saleShare: 0.3 });
    const small = (await readAll(server(catalog), DESC, { pageSize: 7 })).items.map((p) => p.id);
    const big = (await readAll(server(catalog), DESC, { pageSize: 50 })).items.map((p) => p.id);
    expect(small).toEqual(big);

    const list = createEffectivePriceList({ fetchPage: server(catalog).fetchPage, config: DESC });
    const together = await Promise.all([list.next(), list.next(), list.next()]);
    const ids = together.flatMap((r) => r.items.map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(small.slice(0, ids.length));
  });
});

describe('createEffectivePriceList: what it cannot promise is said, not hidden', () => {
  it('flags a product shown with a starting price, whose place the API does not know', async () => {
    const catalog = makeCatalog({ size: 20, saleShare: 0.3 });
    catalog[3] = { ...catalog[3], is_on_sale: false, sale_price: null, price: catalog[3].regular_price, starting_price: 5 };
    const { list, items } = await readAll(server(catalog), DESC);
    expect(items).toHaveLength(20);
    expect(list.exact()).toBe(false);
  });

  it('keeps a product flagged on sale that the sale order never lists, and puts it where its price belongs when it can', async () => {
    const catalog = makeCatalog({ size: 100, saleShare: 0.4 });
    const onSale = catalog.filter((p) => p.is_on_sale).map((p) => p.id);
    const { items } = await readAll(server(catalog, 16, [onSale[0]]), DESC);
    expect(items).toHaveLength(catalog.length);
    expect(new Set(items.map((p) => p.id)).size).toBe(catalog.length);
    expect(items.map((p) => p.id)).toContain(onSale[0]);
    // Descending, the missing one is found while its place is still ahead.
    expect(ordered(items, DESC)).toBe(true);
  });

  it('says so when that product turns up after its place was handed out (ascending)', async () => {
    const catalog = makeCatalog({ size: 400, saleShare: 0.5, depth: 0.9 });
    const deepest = catalog.filter((p) => p.is_on_sale).sort((a, b) => b.regular_price - a.regular_price)[0];
    const { list, items } = await readAll(server(catalog, 16, [deepest.id]), ASC);
    expect(items).toHaveLength(catalog.length);
    expect(list.exact()).toBe(false);
  });

  it('refuses a page that would take more reads than allowed, and a roomier try gets it', async () => {
    // The top of the regular order is all on sale: 160 products, ten pages of them, before the first not on sale.
    const top = Array.from(
      { length: 160 },
      (_, i): Item => ({ id: i + 1, regular_price: 1000 - i, price: 10, sale_price: 10, is_on_sale: true })
    );
    const rest = Array.from(
      { length: 30 },
      (_, i): Item => ({ id: 200 + i, regular_price: 100 + i, price: 100 + i, sale_price: null, is_on_sale: false })
    );
    const srv = server([...top, ...rest]);
    const tight = createEffectivePriceList({ fetchPage: srv.fetchPage, config: DESC, maxScanPages: 3 });
    await expect(tight.next()).rejects.toBeInstanceOf(PriceOrderUnavailable);
    const roomy = createEffectivePriceList({ fetchPage: srv.fetchPage, config: DESC, maxScanPages: 20 });
    const { items } = await roomy.next();
    expect(items).toHaveLength(16);
    expect(ordered(items, DESC)).toBe(true);
  });

  it('can be asked again after a refusal, without losing what it had read', async () => {
    const top = Array.from(
      { length: 160 },
      (_, i): Item => ({ id: i + 1, regular_price: 1000 - i, price: 10, sale_price: 10, is_on_sale: true })
    );
    const rest = Array.from(
      { length: 30 },
      (_, i): Item => ({ id: 200 + i, regular_price: 100 + i, price: 100 + i, sale_price: null, is_on_sale: false })
    );
    const srv = server([...top, ...rest]);
    let allowReads = 3;
    const limited: FetchPricePage<Item> = (sort, token) => {
      if (!sort.startsWith('sale') && allowReads-- <= 0) return Promise.reject(new Error('offline'));
      return srv.fetchPage(sort, token);
    };
    const list = createEffectivePriceList({ fetchPage: limited, config: DESC, maxScanPages: 20 });
    await expect(list.next()).rejects.toThrow('offline');
    allowReads = 100;
    const { items } = await list.next();
    expect(items).toHaveLength(16);
    expect(new Set(items.map((p) => p.id)).size).toBe(16);
    expect(ordered(items, DESC)).toBe(true);
  });

  it('lets a failed request through instead of answering from half the data', async () => {
    const catalog = makeCatalog({ size: 100, saleShare: 0.3 });
    const real = server(catalog);
    const failing: FetchPricePage<Item> = (sort, token) =>
      sort.startsWith('sale') ? Promise.reject(new Error('boom')) : real.fetchPage(sort, token);
    const list = createEffectivePriceList({ fetchPage: failing, config: DESC });
    await expect(list.next()).rejects.toThrow('boom');
  });

  it('knows nothing is on sale from one request', async () => {
    const catalog = makeCatalog({ size: 100, saleShare: 0 });
    const srv = server(catalog);
    const list = createEffectivePriceList({ fetchPage: srv.fetchPage, config: DESC });
    expect(await list.hasSales()).toBe(false);
    expect(srv.count()).toEqual({ regular: 0, sale: 1, total: 1 });
  });
});

describe('createEffectivePriceList: soundness under an inconsistent server', () => {
  // Whatever the server does, nothing is lost or doubled, and an order that is claimed exact is exact.
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1);
  it.each(seeds)('seed %i: sale order missing some products, with starting prices in the mix', async (seed) => {
    const random = rng(seed * 7919);
    const catalog = makeCatalog({
      size: 40 + Math.floor(random() * 300),
      saleShare: random(),
      depth: 0.2 + random() * 0.7,
      distinctPrices: 3 + Math.floor(random() * 40),
      seed,
    });
    const omit = catalog.filter((p) => p.is_on_sale && random() < 0.15).map((p) => p.id);
    const withStarting = random() < 0.3;
    if (withStarting) {
      const at = Math.floor(random() * catalog.length);
      if (!catalog[at].is_on_sale) catalog[at] = { ...catalog[at], starting_price: Math.max(5, catalog[at].regular_price - 30) };
    }
    for (const config of [DESC, ASC]) {
      const { items, list } = await readAll(server(catalog, 16, omit), config);
      expect(items).toHaveLength(catalog.length);
      expect(new Set(items.map((p) => p.id)).size).toBe(catalog.length);
      if (list.exact()) expect(ordered(items, config)).toBe(true);
      if (omit.length === 0 && !withStarting) expect(list.exact()).toBe(true);
    }
  });
});

describe('createEffectivePriceList: requests', () => {
  const sizes = [20, 100, 500, 1000, 5000];
  const rows: string[] = [];

  it.each(sizes)('for %i products, 0% / 10% / 30% on sale: the first page and a whole scroll', async (size) => {
    for (const saleShare of [0, 0.1, 0.3]) {
      const catalog = makeCatalog({ size, saleShare, seed: size });
      const srv = server(catalog);
      const { perPageRequests, items } = await readAll(srv, DESC);
      const pages = perPageRequests.length;
      const total = srv.count().total;
      const baseline = Math.ceil(size / 16);
      rows.push(
        `${String(size).padStart(5)} products, ${String(Math.round(saleShare * 100)).padStart(3)}% on sale: ` +
          `first page ${perPageRequests[0]} requests, ${total} to read all ${pages} pages (API alone: ${baseline})`
      );
      expect(items).toHaveLength(size);
      // Each stream is read once, front to back: never more than the two lists' pages together, plus the probe.
      const onSale = catalog.filter((p) => p.is_on_sale).length;
      expect(total).toBeLessThanOrEqual(Math.ceil(size / 16) + Math.ceil(onSale / 16) + 1);
      expect(perPageRequests[0]).toBeLessThanOrEqual(3);
    }
  }, 30000);

  it('measured: prints the request counts', () => {
    console.info(`\n${rows.join('\n')}\n`);
    expect(rows.length).toBeGreaterThan(0);
  });
});

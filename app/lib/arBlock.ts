import { safeHref } from './localizedSetting';

/** The title / subtext keep their default light color unless the merchant picked another one. */
export const isDefaultLight = (color: unknown) => {
  const value = typeof color === 'string' ? color.trim().toLowerCase() : '';
  return value === '' || value === '#fff' || value === '#ffffff';
};

/** `url("…")` for a merchant image, only for an http(s) or site-relative address. */
export const cssUrl = (image: string) => {
  const safe = safeHref(image);
  return safe ? `url("${safe.replace(/["\\\n]/g, (c) => (c === '\n' ? '' : `\\${c}`))}")` : undefined;
};

/** A color setting is only applied when filled, so the theme's own look stays the fallback. */
export const colorVar = (color: unknown) => (typeof color === 'string' && color.trim() ? color.trim() : undefined);

/** Plain text of a merchant string that may carry markup (for an `aria-label`). */
export const plainText = (value: string) => value.replace(/<[^>]*>/g, '').trim();

export interface ArProductsQuery {
  source: 'categories' | 'selected' | 'latest' | 'sales';
  sourceValue?: number[];
}

/**
 * Which products an `AR-*` block lists: the `source_type` dropdown (`latest`, `sales`, `selected`,
 * `categories`) plus the picked categories / products. `undefined` when the choice cannot be
 * resolved (an unknown source, or `selected` / `categories` with nothing picked).
 */
export function resolveArProducts(
  sourceType: string,
  categories: unknown,
  products: unknown
): ArProductsQuery | undefined {
  if (sourceType === 'latest' || sourceType === 'sales') return { source: sourceType };
  if (sourceType === 'categories' || sourceType === 'selected') {
    const ids = pickerIds(sourceType === 'categories' ? categories : products);
    return ids.length ? { source: sourceType, sourceValue: ids } : undefined;
  }
  return undefined;
}

/** The numeric id a Salla storefront address ends with: `…/c1373748323` (category) or `…/p743402068` (product). */
const idFromUrl = (url: unknown): number | undefined => {
  const match = typeof url === 'string' ? /\/[cp](\d+)(?:[/?#]|$)/.exec(url) : null;
  return match ? Number(match[1]) : undefined;
};

/**
 * Ids from a Theme Editor picker value: objects with an `id` / `value`, or bare ids. The editor hands
 * a picked category or product over with a hashed text `id` (`"oqrZBb"`), the real number only in its
 * `url`, so that is where a non-numeric id falls back to.
 */
export function pickerIds(value: unknown): number[] {
  const list = Array.isArray(value) ? value : value == null || value === '' ? [] : [value];
  return list
    .map((item) => {
      const raw =
        item && typeof item === 'object' ? ((item as { id?: unknown }).id ?? (item as { value?: unknown }).value) : item;
      const numeric = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
      if (typeof numeric === 'number' && Number.isFinite(numeric)) return numeric;
      return item && typeof item === 'object' ? idFromUrl((item as { url?: unknown }).url) : undefined;
    })
    .filter((id): id is number => typeof id === 'number');
}

/**
 * Items of a Theme Editor collection arrive keyed by the bare field id (`block_title`), or, as the
 * manifest names them, prefixed with the collection id (`banner.block_title`). A field the merchant
 * translated also comes with a per-language object (`item.ar = { 'testimonials.product_name': … }`),
 * while the bare key keeps the default language's text. Returns the items with bare keys, the
 * current `locale`'s translations laid over them.
 */
export function collectionItems<T extends Record<string, unknown>>(value: unknown, collection: string, locale?: string): T[] {
  if (!Array.isArray(value)) return [];
  const prefix = `${collection}.`;
  const strip = (key: string) => (key.startsWith(prefix) ? key.slice(prefix.length) : key);
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      const bare: Record<string, unknown> = {};
      for (const [key, v] of Object.entries(item)) {
        const name = strip(key);
        if (!(name in bare) || key === name) bare[name] = v;
      }
      const own = locale ? item[locale] : undefined;
      if (own && typeof own === 'object' && !Array.isArray(own)) {
        for (const [key, v] of Object.entries(own as Record<string, unknown>)) bare[strip(key)] = v;
      }
      return bare as T;
    });
}

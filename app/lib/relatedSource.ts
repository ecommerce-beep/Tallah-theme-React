import type { ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { dropdownSetting } from './localizedSetting';

/** Picked categories / products arrive as plain ids or { id } / { value } items. */
function idsOf(raw: unknown): number[] {
  return (Array.isArray(raw) ? raw : [])
    .map((item) =>
      typeof item === 'object' && item !== null
        ? Number((item as { id?: unknown }).id ?? (item as { value?: unknown }).value)
        : Number(item)
    )
    .filter((id) => Number.isFinite(id));
}

export interface RelatedSource {
  source?: ProductsListSource;
  source_value?: number | number[] | null;
}

/**
 * The product page's "similar products" source from `single_products` / `single_source` (`single.twig`):
 * the latest products by default, the best selling, or the merchant's categories / products.
 * `null` when the merchant switched the block off.
 */
export function relatedSource(settings: Record<string, unknown>): RelatedSource | null {
  if (settings.single_products === false) return null;
  const choice = dropdownSetting(settings.single_source) || 'latest';
  if (choice === 'categories') {
    const value = idsOf(settings.categories_single);
    return value.length ? { source: 'categories', source_value: value } : { source: 'latest' };
  }
  if (choice === 'selected') {
    const value = idsOf(settings.products_single);
    return value.length ? { source: 'selected', source_value: value } : { source: 'latest' };
  }
  return { source: choice === 'sales' ? 'best_selling' : 'latest' };
}

/**
 * The buy column's "selected products" carousel from `single_side_products` / `single_side_source`
 * (`single.twig`): latest by default, offers, or the merchant's categories / products. `null` when it is
 * not switched on (it is off unless the merchant turns it on, as in Twig).
 */
export function sideSource(settings: Record<string, unknown>): RelatedSource | null {
  if (settings.single_side_products !== true) return null;
  const choice = dropdownSetting(settings.single_side_source) || 'latest';
  if (choice === 'categories') {
    const value = idsOf(settings.categories_side_single);
    if (value.length) return { source: 'categories', source_value: value };
  }
  if (choice === 'selected') {
    const value = idsOf(settings.products_side_single);
    if (value.length) return { source: 'selected', source_value: value };
  }
  return { source: choice === 'sales' ? 'offers' : 'latest' };
}

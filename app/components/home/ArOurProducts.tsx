import { Component, memo, Suspense, type ReactNode } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { product, type ProductsListSource } from '@salla.sa/twilight-theme-engine/api/product';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { TallahProductCard } from '../product';
import { resolveArProducts } from '../../lib/arBlock';
import { dropdownSetting, linkSetting, localizedSetting } from '../../lib/localizedSetting';

export interface ArOurProductsProps {
  data: {
    section_title?: unknown;
    section_sub_title?: unknown;
    link_title?: unknown;
    rh_cat_btn_url?: unknown;
    source_type?: unknown;
    categories?: unknown;
    products?: unknown;
    /** Declared in twilight.json, but the Twig block only reads it in a slider branch that no setting turns on. */
    grid_cols_number?: number;
    position?: number;
    [key: string]: unknown;
  };
}

/** How many products the Twig block asked for. */
const LIMIT = 8;

/**
 * The products, read with a suspense query: the server waits for them and sends them in the page (the client reuses
 * that data instead of fetching again), so a block rendered on the server arrives with its cards rather than a
 * placeholder. Only a block that mounts on the client, or whose request is slow, shows the placeholder.
 */
function ProductsGrid({ source, sourceValue }: { source: ProductsListSource; sourceValue?: number[] }) {
  const { data: result } = useSuspenseQuery(product.queries.list({ source, sourceValue, perPage: LIMIT }));
  const items = result?.items?.slice(0, LIMIT) ?? [];

  return (
    <div className="ar-our-products__grid">
      {items.map((item, index) => (
        <TallahProductCard key={item.id} product={item} imagePriority={index < 4} />
      ))}
    </div>
  );
}

/** Same grid as the loaded cards, one placeholder per product, sized from the card (`tallah-products-first-screen.scss`). */
function ProductsSkeleton() {
  return (
    <div className="ar-our-products__grid" aria-hidden="true">
      {Array.from({ length: LIMIT }, (_, index) => (
        <div key={index}>
          <div className="ar-our-products__skeleton-image" />
          <div className="ar-our-products__skeleton-content">
            <span className="ar-our-products__skeleton-title" />
            <div className="ar-our-products__skeleton-sub">
              <span className="ar-our-products__skeleton-price" />
              <span className="ar-our-products__skeleton-button" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** A failed request leaves the heading with an empty grid, as it did before, instead of taking the block down. */
class GridBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * `home.AR_our_products` — a heading row (title, an underlined line, a link) over a grid of
 * TALLAH product cards. Port of `AR_our_products.twig`: its `salla-products-list` branch, which
 * is the one the manifest's settings reach (the slider branch needs fields the manifest never
 * declared). The grid is 2 columns on phones and 4 from `lg`, with a 10px gap, as in the fork's CSS
 * (`styles/04-components/tallah-home.scss`).
 */
export const ArOurProducts = memo(function ArOurProducts({ data }: ArOurProductsProps) {
  const { locale } = useTranslation();
  const title = localizedSetting(data.section_title, locale).trim();
  const subtitle = localizedSetting(data.section_sub_title, locale).trim();
  const linkTitle = localizedSetting(data.link_title, locale).trim();
  const href = linkSetting(data.rh_cat_btn_url, locale);
  const position = data.position ?? 1;
  const query = resolveArProducts(dropdownSetting(data.source_type), data.categories, data.products);

  return (
    <section
      className={`AR-products-${position} AR-products products-slider products-slider-${position}`}
      suppressHydrationWarning
    >
      <div>
        <div className="px-[10px]">
          <div className="flex items-center justify-between gap-4 pb-3 md:pb-6">
            <div className="flex flex-col gap-1">
              {title && (
                <h2 className="blocktitle text-primary text-[clamp(1rem,1.0204rem+0.9796vw,1.25rem)] font-semibold leading-6">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="subtitle text-primary max-w-[230px] text-[clamp(.75rem,1.0204rem+0.9796vw,1rem)] font-normal leading-6 underline max-md:hidden md:max-w-full">
                  {subtitle}
                </p>
              )}
            </div>
            {/* No link set by the merchant: the text stays, but not as a link to `#` (no `href`, not crawlable). */}
            {linkTitle &&
              (href ? (
                <Link
                  to={href}
                  className="cat-link text-graytext shrink-0 text-base font-normal underline md:leading-6"
                >
                  {linkTitle}
                </Link>
              ) : (
                <span className="cat-link text-graytext shrink-0 text-base font-normal md:leading-6">{linkTitle}</span>
              ))}
          </div>

          {query ? (
            <GridBoundary fallback={<div className="ar-our-products__grid" />}>
              <Suspense fallback={<ProductsSkeleton />}>
                <ProductsGrid source={query.source} sourceValue={query.sourceValue} />
              </Suspense>
            </GridBoundary>
          ) : (
            <div className="ar-our-products__grid" />
          )}
        </div>
      </div>
    </section>
  );
});

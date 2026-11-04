import { memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { product } from '@salla.sa/twilight-theme-engine/api/product';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ProductsListSkeleton } from '@salla.sa/twilight-components-react';
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

  const { data: result, isSuccess } = useQuery({
    ...product.queries.list({ source: query?.source ?? 'latest', sourceValue: query?.sourceValue, perPage: LIMIT }),
    enabled: !!query,
  });
  const items = result?.items?.slice(0, LIMIT) ?? [];

  return (
    <section
      className={`AR-products-${position} AR-products products-slider products-slider-${position}`}
      suppressHydrationWarning
    >
      <div className="py-8">
        <div className="px-[10px]">
          <div className="flex items-center justify-between gap-4 pb-3 md:pb-6">
            <div className="flex flex-col gap-1">
              {title && (
                <h2 className="blocktitle text-primary text-[clamp(1rem,1.0204rem+0.9796vw,1.25rem)] font-semibold leading-6">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="subtitle text-primary hidden max-w-[230px] text-[clamp(.75rem,1.0204rem+0.9796vw,1rem)] font-normal leading-6 underline md:block md:max-w-full">
                  {subtitle}
                </p>
              )}
            </div>
            {linkTitle && (
              <Link
                to={href || '#'}
                className="cat-link text-graytext shrink-0 text-base font-normal underline md:leading-6"
              >
                {linkTitle}
              </Link>
            )}
          </div>

          {query && !isSuccess ? (
            <ProductsListSkeleton />
          ) : (
            <div className="ar-our-products__grid">
              {items.map((item, index) => (
                <TallahProductCard key={item.id} product={item} imagePriority={index < 4} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

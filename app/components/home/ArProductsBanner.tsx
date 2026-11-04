import { memo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { product } from '@salla.sa/twilight-theme-engine/api/product';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { ProductsListSkeleton } from '@salla.sa/twilight-components-react';
import { TallahProductCard } from '../product';
import { ChevronDownIcon } from '../icons';
import { useDragScroll } from '../../hooks/useDragScroll';
import { forwardSign } from '../../lib/scrollDirection';
import { colorVar, resolveArProducts } from '../../lib/arBlock';
import { dropdownSetting, imageSetting, linkSetting, localizedSetting } from '../../lib/localizedSetting';

export interface ArProductsBannerProps {
  data: {
    banner_image?: unknown;
    block_title?: unknown;
    block_title_color?: string;
    url_text?: unknown;
    url_color?: string;
    url?: unknown;
    source_type?: unknown;
    categories?: unknown;
    products?: unknown;
    position?: number;
    [key: string]: unknown;
  };
}

const GAP = 20;

/** One slide and the gap after it. */
const stepOf = (track: HTMLElement) =>
  ((track.firstElementChild as HTMLElement | null)?.offsetWidth ?? track.clientWidth / 2) + GAP;

/** The Twig's `sicon-caret-*` glyph; the icon font this store loads may not carry it, so it is an SVG. */
function Caret({ right }: { right: boolean }) {
  return (
    <ChevronDownIcon
      aria-hidden="true"
      data-dir={right ? 'right' : 'left'}
      className={`h-3.5 w-3.5 ${right ? '-rotate-90' : 'rotate-90'}`}
    />
  );
}

/**
 * `home.AR-Products-banner` — a tall image beside a two-up product slider. Port of
 * `AR-Products-banner.twig`: a title row over the slider on `lg` (a link-first heading and
 * round arrows above it on phones), and the image's own link at its bottom corner. The Twig
 * used Salla's Swiper with `slidesPerView: 2`; this is a native scroll-snap row driven by the
 * same arrows. In Arabic the edge arrows point outward and the right one advances, as in
 * the Twig (checked against the live store).
 */
export const ArProductsBanner = memo(function ArProductsBanner({ data }: ArProductsBannerProps) {
  const { t, locale } = useTranslation();
  const track = useRef<HTMLDivElement>(null);
  const { dragging, ...drag } = useDragScroll(track);
  const rtl = locale === 'ar';

  const title = localizedSetting(data.block_title, locale).trim();
  const linkText = localizedSetting(data.url_text, locale).trim();
  const href = linkSetting(data.url, locale);
  const image = imageSetting(data.banner_image, locale);
  const position = data.position ?? 1;
  const query = resolveArProducts(dropdownSetting(data.source_type), data.categories, data.products);

  const { data: result, isSuccess } = useQuery({
    ...product.queries.list({ source: query?.source ?? 'latest', sourceValue: query?.sourceValue }),
    enabled: !!query,
  });
  const items = result?.items ?? [];
  const single = items.length === 1;

  /** `1` forward / `-1` back, whichever way the row reads. */
  const step = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * forwardSign(el) * stepOf(el), behavior: 'smooth' });
  };

  const prevLabel = t('blocks.home.reviews_prev', 'Previous');
  const nextLabel = t('blocks.home.reviews_next', 'Next');

  // Desktop edge arrows: the first one sits at the inline start. In Arabic it advances, and
  // both point outward; in English the start arrow goes back.
  const edgeArrow = (side: 'start' | 'end') => {
    const advances = rtl ? side === 'start' : side === 'end';
    const pointsRight = rtl ? side === 'start' : side === 'end';
    return (
      <button
        type="button"
        className="ar-products__arrow shadow-lg"
        aria-label={advances ? nextLabel : prevLabel}
        onClick={() => step(advances ? 1 : -1)}
      >
        <Caret right={pointsRight} />
      </button>
    );
  };

  // Phone arrows above the row: previous at the inline start, next at the inline end.
  const topArrow = (dir: 1 | -1) => (
    <button
      type="button"
      className="ar-products__arrow ar-products__arrow--top"
      aria-label={dir === 1 ? nextLabel : prevLabel}
      onClick={() => step(dir)}
    >
      <Caret right={(dir === 1) !== rtl} />
    </button>
  );

  const headingColor = { color: colorVar(data.block_title_color) };
  const linkColor = { color: colorVar(data.url_color) };

  return (
    <section
      className={`Ar-products-banner Ar-products-banner-${position}${single ? ' single-product' : ''}`}
      suppressHydrationWarning
    >
      <div className="grid grid-cols-1 py-8 lg:grid-cols-3 lg:px-4">
        <div className="order-3 mx-auto self-center lg:order-1 lg:col-span-2 lg:mx-0">
          <div className="features-products-head text text-font mb-4 hidden text-center md:mb-6 lg:block">
            {title && (
              <h2 className="pb-1 text-xl font-semibold" style={headingColor}>
                {title}
              </h2>
            )}
            {linkText && (
              <Link
                to={href || '#'}
                className="text-graytext text-[clamp(0.875rem,0.7985rem+0.3265vw,1.125rem)] font-normal underline"
                style={linkColor}
              >
                {linkText}
              </Link>
            )}
          </div>

          <div className="relative lg:mx-10 xl:mx-28">
            {!single && items.length > 0 && (
              <div className="absolute -top-4 z-2 flex h-fit max-w-fit -translate-y-full items-center justify-between gap-2 lg:hidden rtl:right-0 ltr:left-0">
                {topArrow(-1)}
                {topArrow(1)}
              </div>
            )}

            <div className="relative mx-auto w-full max-w-[90vw] sm:max-w-[480px] lg:mt-0 lg:max-w-full lg:px-[56px] xl:max-w-[97.4%]">
              {query && !isSuccess ? (
                <ProductsListSkeleton />
              ) : (
                <div
                  ref={track}
                  className={`ar-products__track hide-scroll${dragging ? ' is-dragging' : ''}`}
                  {...drag}
                >
                  {items.map((item) => (
                    <div key={item.id} className="ar-products__slide">
                      <TallahProductCard product={item} />
                    </div>
                  ))}
                </div>
              )}

              {!single && items.length > 0 && (
                <div className="absolute left-0 top-[45%] mx-auto hidden h-fit w-full items-center justify-between gap-2 lg:flex">
                  {edgeArrow('start')}
                  {edgeArrow('end')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="features-products-head text text-font order-1 mb-4 block text-center md:mb-6 lg:hidden">
          {linkText && (
            <Link to={href || '#'} className="pb-1 text-xl font-semibold underline" style={linkColor}>
              {linkText}
            </Link>
          )}
          {title && (
            <h2
              className="text-graytext text-[clamp(0.875rem,0.7985rem+0.3265vw,1.125rem)] font-normal"
              style={headingColor}
            >
              {title}
            </h2>
          )}
        </div>

        <div className="relative order-2 mx-auto h-[40.625rem] min-h-[375px] w-full max-w-[33rem] overflow-hidden lg:order-1 lg:col-span-1 lg:mx-0 lg:min-h-[650px] lg:max-w-full">
          {linkText && (
            <Link
              to={href || '#'}
              className="absolute bottom-4 hidden text-sm font-semibold underline md:block rtl:right-4 ltr:left-4"
              style={{ color: 'var(--color-background)' }}
            >
              {linkText}
            </Link>
          )}
          {image && <img src={image} className="h-full w-full object-cover" alt="" />}
        </div>
      </div>
    </section>
  );
});

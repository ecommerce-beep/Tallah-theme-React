import { memo, useRef } from 'react';
import { SallaRatingStars } from '@salla.sa/twilight-components-react/rating-stars';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useDragScroll } from '../../hooks/useDragScroll';
import { collectionItems, colorVar } from '../../lib/arBlock';
import { imageSetting, linkSetting, localizedSetting } from '../../lib/localizedSetting';

export interface ArTestimonial {
  image?: unknown;
  product_name?: unknown;
  product_name_color?: string;
  /** 1-5 stars (the manifest's `slider` field). */
  review?: number | string;
  testimonial?: unknown;
  testimonial_color?: string;
  [key: string]: unknown;
}

export interface ArCustomTestimonialsProps {
  data: {
    block_title?: unknown;
    blocktitle_color?: string;
    subtext?: unknown;
    subtext_color?: string;
    url?: unknown;
    url_text?: unknown;
    url_color?: string;
    testimonials?: ArTestimonial[];
    position?: number;
    [key: string]: unknown;
  };
}

/**
 * `home.AR-Custom-testimonials` — a heading row (title and link), a line of text, and a row of
 * image cards with a star rating, a name and a quote. Port of `AR-Custom-testimonials.twig`.
 * The Twig's `salla-slider` showed 1.5 / 2 / 3 / 4 cards (from 400 / 640 / 860px) with a 4px gap
 * and no controls; this is a native scroll-snap row with the same widths
 * (`styles/04-components/tallah-home.scss`), swipeable and draggable.
 */
export const ArCustomTestimonials = memo(function ArCustomTestimonials({ data }: ArCustomTestimonialsProps) {
  const { t, locale } = useTranslation();
  const track = useRef<HTMLDivElement>(null);
  const { dragging, ...drag } = useDragScroll(track);

  const title = localizedSetting(data.block_title, locale).trim();
  const subtext = localizedSetting(data.subtext, locale).trim();
  const linkText = localizedSetting(data.url_text, locale).trim();
  const href = linkSetting(data.url, locale);
  const cards = collectionItems<ArTestimonial>(data.testimonials, 'testimonials', locale);
  const position = data.position ?? 1;

  return (
    <section className={`AR-testimonials AR-testimonials-${position}`} suppressHydrationWarning>
      {/* 10px is the theme's container gutter (`container.padding` in tailwind.config.cjs), the same inset as `AR_our_products`. */}
      <div className="wrapper text-font px-[10px]">
        {/* The same heading row as `AR_our_products`: title (+ subtext) at the start, link centred on it at the end. */}
        <div className="heading flex items-center justify-between gap-4 pb-3 md:pb-6">
          <div className="titles flex flex-col gap-1">
            {title && (
              <p
                className="block-title text-primary text-[clamp(1rem,1.0204rem+0.9796vw,1.25rem)] font-semibold leading-6"
                style={{ color: colorVar(data.blocktitle_color) }}
              >
                {title}
              </p>
            )}
            {subtext && (
              <p className="subtext text-base font-medium" style={{ color: colorVar(data.subtext_color) }}>
                {subtext}
              </p>
            )}
          </div>
          {linkText && (
            <Link
              to={href || '#'}
              className="text-graytext block shrink-0 text-base font-normal underline md:leading-6"
              style={{ color: colorVar(data.url_color) }}
            >
              {linkText}
            </Link>
          )}
        </div>

        <div className="testimonials-wrapper relative">
          <div
            ref={track}
            className={`ar-testimonials__track hide-scroll${dragging ? ' is-dragging' : ''}`}
            aria-label={t('blocks.home.testimonials', 'Customer reviews')}
            {...drag}
          >
            {cards.map((item, index) => {
              const name = localizedSetting(item.product_name, locale).trim();
              const quote = localizedSetting(item.testimonial, locale).trim();
              const image = imageSetting(item.image, locale);
              const stars = Number(item.review);
              return (
                <div
                  // Reviews have no ids of their own; their order is their identity.
                  key={index}
                  className={`testimonials testimonials-${index + 1} ar-testimonials__slide overflow-hidden`}
                >
                  <div className="h-[25.313rem]">
                    {image && <img src={image} className="h-full w-full object-cover" alt={name} />}
                  </div>
                  <div className="testimonials-data mt-4 flex flex-col gap-1 px-2 md:gap-2 md:px-4">
                    {Number.isFinite(stars) && <SallaRatingStars name="rating" size="medium" value={stars} />}
                    {name && (
                      <p className="product-name text-base font-semibold" style={{ color: colorVar(item.product_name_color) }}>
                        {name}
                      </p>
                    )}
                    {quote && (
                      <p className="product-name text-sm font-medium" style={{ color: colorVar(item.testimonial_color) }}>
                        “{quote}”
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
});

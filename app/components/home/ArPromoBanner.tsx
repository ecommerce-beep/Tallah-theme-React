import { memo } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { imageSetting, linkSetting, localizedSetting } from '../../lib/localizedSetting';
import { colorVar } from '../../lib/arBlock';

export interface ArPromoBannerProps {
  data: {
    banner_image?: unknown;
    block_title?: unknown;
    block_title_color?: string;
    subtext?: unknown;
    subtext_color?: string;
    url?: unknown;
    url_text?: unknown;
    url_color?: string;
    position?: number;
    [key: string]: unknown;
  };
}

/**
 * `home.Ar-Promo-banner` — a text column (title, a quoted line, an upper-case link) beside
 * a tall image. Port of `Ar-Promo-banner.twig`: the text comes second in the markup but
 * `order-2`, so the image leads on `lg` rows. The Twig's `lg:max-w-1/3` is not a class its Tailwind
 * config defines, so the image is `38%` capped at `max-w-132` (33rem), and the row shrinks it.
 */
export const ArPromoBanner = memo(function ArPromoBanner({ data }: ArPromoBannerProps) {
  const { locale } = useTranslation();
  const title = localizedSetting(data.block_title, locale).trim();
  const subtext = localizedSetting(data.subtext, locale).trim();
  const linkText = localizedSetting(data.url_text, locale).trim();
  const href = linkSetting(data.url, locale);
  const image = imageSetting(data.banner_image, locale);
  const position = data.position ?? 1;

  return (
    <section className={`AR-promo-banner AR-promo-banner-${position}`} suppressHydrationWarning>
      <div className="flex flex-col items-center justify-between gap-6 py-8 lg:flex-row lg:gap-12 lg:px-10">
        <div className="text text-font order-2 mx-auto flex max-w-full flex-col gap-4 text-center sm:max-w-3/4 lg:w-2/3 lg:max-w-full ltr:lg:text-left rtl:lg:text-right">
          {title && (
            <h2
              className="text-[clamp(1.5rem,1.2704rem+0.9796vw,2.25rem)] font-semibold leading-snug"
              style={{ color: colorVar(data.block_title_color) }}
            >
              {title}
            </h2>
          )}
          {subtext && (
            <p
              className="mx-auto max-w-3/4 text-base font-medium lg:m-0"
              style={{ color: colorVar(data.subtext_color) }}
            >
              &quot;{subtext}&quot;
            </p>
          )}
          {linkText && (
            <Link
              to={href || '#'}
              className="text-sm font-semibold underline lg:mt-4"
              style={{ color: colorVar(data.url_color) }}
            >
              {linkText.toUpperCase()}
            </Link>
          )}
        </div>
        <div className="ar-promo__image relative h-[40.625rem] w-full max-w-[33rem] overflow-hidden lg:w-[38%]">
          {image && <img src={image} className="h-full w-full object-cover" alt="" />}
        </div>
      </div>
    </section>
  );
});

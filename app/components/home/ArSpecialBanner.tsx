import { memo, type CSSProperties } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { imageSetting, linkSetting, localizedSetting } from '../../lib/localizedSetting';
import { collectionItems, colorVar, cssUrl, plainText } from '../../lib/arBlock';
import { ArButton } from './ArButton';

export interface ArSpecialBannerItem {
  desktop_bg?: unknown;
  mobile_bg?: unknown;
  block_title?: unknown;
  blocktitle_color?: string;
  subtext?: unknown;
  subtext_color?: string;
  button_text?: unknown;
  button_text_color?: string;
  button_bg?: string;
  transparent_button?: boolean;
  url?: unknown;
  [key: string]: unknown;
}

export interface ArSpecialBannerProps {
  data: {
    banner?: ArSpecialBannerItem[];
    /** Declared in twilight.json, but the Twig block never reads it: the text is always at the start. */
    center_text?: boolean;
    position?: number;
    [key: string]: unknown;
  };
}

/**
 * `home.AR-special-banner` — TALLAH's row of full-bleed image banners (two side by side
 * from `md`, stacked below), each with its own title, text and button. Port of
 * `AR-special-banner.twig`; the background (the desktop one for every width when a banner
 * has no mobile image) and colors are CSS variables per banner
 * (`styles/04-components/tallah-home.scss`).
 */
export const ArSpecialBanner = memo(function ArSpecialBanner({ data }: ArSpecialBannerProps) {
  const { locale } = useTranslation();
  const banners = collectionItems<ArSpecialBannerItem>(data.banner, 'banner', locale);
  const position = data.position ?? 1;

  return (
    <section className={`Ar-special-banner Ar-special-banner-${position}`} suppressHydrationWarning>
      <div className="flex w-full flex-col md:flex-row">
        {banners.map((item, index) => {
          const title = localizedSetting(item.block_title, locale).trim();
          const subtext = localizedSetting(item.subtext, locale).trim();
          const buttonText = localizedSetting(item.button_text, locale).trim();
          const href = linkSetting(item.url, locale);
          const desktop = cssUrl(imageSetting(item.desktop_bg, locale));
          const mobile = cssUrl(imageSetting(item.mobile_bg, locale)) ?? desktop;
          const label = plainText(title || subtext);

          return (
            <div
              // The banners have no ids of their own; their order is their identity.
              key={index}
              className={`banner-height banner banner-${index + 1} ar-special__banner relative flex w-full flex-col items-start justify-end overflow-hidden px-4 py-4 md:w-1/2 md:py-6`}
              style={{ '--ar-bg-desktop': desktop, '--ar-bg-mobile': mobile } as CSSProperties}
            >
              {!buttonText && href && (
                <Link to={href} className="absolute inset-0 z-[5] h-full w-full" aria-label={label || undefined} />
              )}

              <div
                className={`content-wrapper content-wrapper-${index + 1} relative z-2 m-0 flex h-full flex-col items-start justify-end gap-2 text-start sm:gap-4`}
              >
                {title && (
                  <h2
                    className="blocktitle text-background text-xl font-semibold"
                    style={{ color: colorVar(item.blocktitle_color) }}
                  >
                    {title}
                  </h2>
                )}
                {subtext && (
                  <p
                    className="subtext text-background text-[clamp(0.875rem,0.7602rem+0.4898vw,1.25rem)] font-light md:max-w-1/2"
                    style={{ color: colorVar(item.subtext_color) }}
                  >
                    {subtext}
                  </p>
                )}
                {buttonText && (
                  <ArButton
                    text={buttonText}
                    href={href}
                    color={item.button_text_color}
                    bg={item.button_bg}
                    transparent={item.transparent_button}
                    className="block rounded-md px-8 py-1 text-[clamp(0.75rem,0.6447rem+0.4493vw,1.094rem)] transition-colors duration-300 ease-in-out sm:py-2"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});

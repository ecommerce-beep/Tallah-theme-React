import { memo, type CSSProperties } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import {
  dropdownSetting,
  imageSetting,
  linkSetting,
  localizedSetting,
} from '../../lib/localizedSetting';
import { colorVar, cssUrl, isDefaultLight, plainText } from '../../lib/arBlock';

export interface ArHero2Data {
  desktop_bg?: unknown;
  mobile_bg?: unknown;
  items_alignment?: unknown;
  block_title?: unknown;
  blocktitle_color?: string;
  subtext?: unknown;
  subtext_color?: string;
  button_text?: unknown;
  button_text_color?: string;
  button_bg?: string;
  transparent_button?: boolean;
  url?: unknown;
  /** Declared in twilight.json, but the Twig block never reads it: the button always sits at the bottom. */
  button_bottom?: boolean;
  position?: number;
  [key: string]: unknown;
}

const ALIGNMENT: Record<string, string> = {
  start: 'text-start items-start',
  end: 'text-end items-end',
};

/**
 * `home.AR-Hero-2` — TALLAH's full-height banner: a desktop and a mobile background, a
 * title and subtext, and one button at the bottom. Port of `AR-Hero-2.twig`; the colors
 * and backgrounds the Twig wrote into a per-block `<style>` are CSS variables on the
 * section here (`styles/04-components/tallah-home.scss`).
 */
export const ArHero2 = memo(function ArHero2({ data }: { data: ArHero2Data }) {
  const { locale } = useTranslation();
  const title = localizedSetting(data.block_title, locale).trim();
  const subtext = localizedSetting(data.subtext, locale).trim();
  const buttonText = localizedSetting(data.button_text, locale).trim();
  const href = linkSetting(data.url, locale);
  const alignment = ALIGNMENT[dropdownSetting(data.items_alignment)] ?? 'text-center items-center';
  const position = data.position ?? 1;

  const scrim =
    Boolean(title || subtext) &&
    (!title || isDefaultLight(data.blocktitle_color)) &&
    (!subtext || isDefaultLight(data.subtext_color));

  const style = {
    '--ar-hero-desktop-bg': cssUrl(imageSetting(data.desktop_bg, locale)),
    // no phone image: the desktop one, rather than a blank banner (as in AR-Hero-section)
    '--ar-hero-mobile-bg': cssUrl(imageSetting(data.mobile_bg, locale) || imageSetting(data.desktop_bg, locale)),
    '--ar-hero-title-color': colorVar(data.blocktitle_color),
    '--ar-hero-subtext-color': colorVar(data.subtext_color),
    '--ar-hero-btn-color': colorVar(data.button_text_color),
    '--ar-hero-btn-bg': colorVar(data.button_bg),
  } as CSSProperties;

  // Without a button the whole banner is the link.
  const bannerLabel = plainText(title || subtext);

  return (
    <section
      className={`AR-hero-section AR-hero-section-${position} ar-hero2`}
      style={style}
      suppressHydrationWarning
    >
      <div className="wrapper">
        <div
          className={`banner ar-hero2__banner${scrim ? ' ar-hero2__banner--scrim' : ''} relative flex h-[100svh] flex-col items-center justify-center overflow-hidden px-2 py-6 md:h-[90vh] md:px-4`}
        >
          {!buttonText && href && (
            <Link
              to={href}
              className="absolute inset-0 z-[5] h-full w-full"
              aria-label={bannerLabel || undefined}
            />
          )}

          <div
            className={`text-wrapper container relative z-2 mx-auto flex h-full flex-col justify-center gap-2 sm:gap-4 ${alignment}`}
          >
            <div className={`position flex flex-col justify-center ${alignment}`}>
              {title && (
                <h2 className="blocktitle text-background text-[clamp(1.5rem,1.0408rem+1.9592vw,3rem)] font-medium leading-snug transition-all duration-700 ease-in-out">
                  {title}
                </h2>
              )}
              {subtext && (
                <p className="subtext text-background text-[clamp(0.875rem,0.7602rem+0.4898vw,1.25rem)] font-light transition-all duration-700 ease-in-out">
                  {subtext}
                </p>
              )}
            </div>
          </div>

          {buttonText && (
            <Link
              to={href || '#'}
              className={`button ar-hero2__button${data.transparent_button ? ' ar-hero2__button--transparent' : ''} mt-auto block self-center rounded-md px-4 py-2 text-center text-[clamp(0.75rem,0.6447rem+0.4493vw,1.094rem)] transition-all sm:px-7`}
            >
              {buttonText}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
});

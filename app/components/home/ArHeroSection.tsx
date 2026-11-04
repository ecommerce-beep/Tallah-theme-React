import { memo, useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { SallaSlider } from '@salla.sa/twilight-components-react/slider';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { dropdownSetting, imageSetting, linkSetting, localizedSetting } from '../../lib/localizedSetting';
import { collectionItems, colorVar, cssUrl, isDefaultLight, plainText } from '../../lib/arBlock';
import { ArButton } from './ArButton';

export interface ArHeroBanner {
  desktop_bg?: unknown;
  mobile_bg?: unknown;
  items_alignment?: unknown;
  items_alignment_vertical?: unknown;
  block_title?: unknown;
  blocktitle_color?: string;
  subtext?: unknown;
  subtext_color?: string;
  transparent_button?: boolean;
  button_bottom?: boolean;
  button_text?: unknown;
  button_text_color?: string;
  button_bg?: string;
  url?: unknown;
  [key: string]: unknown;
}

export interface ArHeroSectionProps {
  data: { banner?: ArHeroBanner[]; position?: number; [key: string]: unknown };
}

/** The part of a Swiper instance the pause / play control uses. */
interface SwiperLike {
  autoplay?: { running: boolean; start: () => void; stop: () => void };
  params: { autoplay?: unknown };
  on: (event: string, handler: () => void) => void;
  off: (event: string, handler: () => void) => void;
}

const ALIGN_X = (value: string) =>
  value === 'center' ? 'text-center items-center' : value === 'start' ? 'text-start items-start' : 'text-end items-end';
const ALIGN_Y = (value: string) => (value === 'start' ? 'justify-start' : value === 'end' ? 'justify-end' : 'justify-center');

/**
 * Pause / play for the automatic slide change (WCAG 2.2.2), as the fork's `home.js` does it:
 * only a slider with autoplay gets it, the system "reduce motion" setting stops the slide
 * show on load and while it is on, and once the visitor pauses nothing restarts it.
 */
function useAutoplayControl(api: SwiperLike | null) {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  const pausedByUser = useRef(false);

  useEffect(() => {
    if (!api?.autoplay || !api.params.autoplay) return;
    const autoplay = api.autoplay;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const sync = () => setPlaying(autoplay.running);
    api.on('autoplayStart', sync);
    api.on('autoplayStop', sync);

    const applyMotionPreference = () => {
      if (reduced?.matches) autoplay.stop();
      else if (!pausedByUser.current) autoplay.start();
    };
    if (reduced?.matches) autoplay.stop();
    reduced?.addEventListener?.('change', applyMotionPreference);

    sync();
    setReady(true);
    return () => {
      api.off('autoplayStart', sync);
      api.off('autoplayStop', sync);
      reduced?.removeEventListener?.('change', applyMotionPreference);
    };
  }, [api]);

  const toggle = useCallback(() => {
    const autoplay = api?.autoplay;
    if (!autoplay) return;
    if (autoplay.running) {
      pausedByUser.current = true;
      autoplay.stop();
    } else {
      pausedByUser.current = false;
      autoplay.start();
    }
  }, [api]);

  return { ready, playing, toggle };
}

/**
 * `home.AR-Hero-section` — TALLAH's full-height banner slider: each banner is a
 * `AR-Hero-2`-style slide (backgrounds, title, text, one button), with thin progress-style
 * bullets, and the slides change on their own when there is more than one. Port of
 * `AR-Hero-section.twig` + `home.js` of the fork. The Twig's `data-swiper-parallax` text motion
 * and bullets come from the same `salla-slider` component.
 */
export const ArHeroSection = memo(function ArHeroSection({ data }: ArHeroSectionProps) {
  const { t, locale } = useTranslation();
  const banners = collectionItems<ArHeroBanner>(data.banner, 'banner', locale);
  const position = data.position ?? 1;
  const many = banners.length > 1;
  const [api, setApi] = useState<SwiperLike | null>(null);
  const { ready, playing, toggle } = useAutoplayControl(api);

  const sliderConfig = {
    parallax: true,
    pagination: { el: `.AR-slider-hero-section-${position} .swiper-pagination`, type: 'bullets', clickable: true },
    spaceBetween: 0,
    ...(many ? { autoplay: { delay: 2000, disableOnInteraction: false, pauseOnMouseEnter: true } } : {}),
    lazy: true,
    speed: 1000,
    loop: true,
  };

  if (!banners.length) return null;

  return (
    <section
      className={`AR-slider-hero-section AR-slider-hero-section-${position}${many ? ' ar-hero-slider--many' : ''}`}
      suppressHydrationWarning
    >
      <div className="wrapper">
        <div className="relative">
          <SallaSlider
            id={`sub-banner-slider-${position}`}
            className="subbanner-slider"
            autoPlay={many}
            loop
            showControls={false}
            type="carousel"
            sliderConfig={sliderConfig}
            onAfterInit={(event: { detail?: unknown }) => setApi((event.detail as SwiperLike) ?? null)}
          >
            <div slot="items">
              {banners.map((item, index) => {
                const title = localizedSetting(item.block_title, locale).trim();
                const subtext = localizedSetting(item.subtext, locale).trim();
                const buttonText = localizedSetting(item.button_text, locale).trim();
                const href = linkSetting(item.url, locale);
                const alignX = ALIGN_X(dropdownSetting(item.items_alignment));
                const alignY = ALIGN_Y(dropdownSetting(item.items_alignment_vertical));
                const desktop = cssUrl(imageSetting(item.desktop_bg, locale));
                // A banner with no phone image uses its desktop one: the Twig leaves it blank, which on a phone is white
                // light text on a white slide.
                const mobile = cssUrl(imageSetting(item.mobile_bg, locale) || imageSetting(item.desktop_bg, locale));
                const scrim =
                  Boolean(title || subtext) &&
                  (!title || isDefaultLight(item.blocktitle_color)) &&
                  (!subtext || isDefaultLight(item.subtext_color));
                const button = buttonText && (
                  <ArButton
                    text={buttonText}
                    href={href}
                    color={item.button_text_color}
                    bg={item.button_bg}
                    transparent={item.transparent_button}
                    className={`block text-center rounded-md px-4 py-2 text-[clamp(0.75rem,0.6447rem+0.4493vw,1.094rem)] transition-all sm:px-7 ${
                      item.button_bottom ? 'ar-hero-slider__cta--bottom z-2 mt-auto self-center' : 'mt-2'
                    }`}
                  />
                );

                return (
                  <div
                    // The banners have no ids of their own; their order is their identity.
                    key={index}
                    className={`swiper-slide banner banner-${index + 1} ar-hero-slider__banner${scrim ? ' ar-hero-slider__banner--scrim' : ''} relative flex h-[100svh] flex-col overflow-hidden px-2 py-16 md:h-[90vh] md:px-4`}
                    style={{ '--ar-bg-desktop': desktop, '--ar-bg-mobile': mobile } as CSSProperties}
                  >
                    {!buttonText && href && (
                      <Link
                        to={href}
                        className="absolute inset-0 z-[5] h-full w-full"
                        aria-label={plainText(title || subtext) || undefined}
                      />
                    )}
                    <div
                      className={`text-wrapper container relative z-2 mx-auto flex h-full flex-col ${alignX} ${alignY}`}
                    >
                      <div className={`position flex flex-col gap-2 sm:gap-4 ${alignX}`}>
                        {title && (
                          <h2
                            data-swiper-parallax="-700"
                            className="blocktitle text-background text-[clamp(1.5rem,1.0408rem+1.9592vw,3rem)] font-medium leading-snug transition-all duration-700 ease-in-out"
                            style={{ color: colorVar(item.blocktitle_color) }}
                          >
                            {title}
                          </h2>
                        )}
                        {subtext && (
                          <p
                            data-swiper-parallax="-500"
                            className="subtext text-background text-[clamp(0.875rem,0.7602rem+0.4898vw,1.25rem)] font-light transition-all duration-700 ease-in-out"
                            style={{ color: colorVar(item.subtext_color) }}
                          >
                            {subtext}
                          </p>
                        )}
                        {!item.button_bottom && button}
                      </div>
                    </div>
                    {item.button_bottom && button}
                  </div>
                );
              })}
            </div>
          </SallaSlider>

          <div className="swiper-pagination ar-hero-slider__bullets" />

          {many && (
            <button
              type="button"
              className="hero-autoplay-toggle"
              hidden={!ready}
              aria-label={playing ? t('hero.pause_autoplay', 'Pause automatic slide show') : t('hero.resume_autoplay', 'Resume automatic slide show')}
              onClick={toggle}
            >
              {playing ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
                  <rect x="3" y="2" width="3.5" height="12" rx="1" />
                  <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
                  <path d="M4 2.5v11a1 1 0 0 0 1.5.86l9-5.5a1 1 0 0 0 0-1.72l-9-5.5A1 1 0 0 0 4 2.5z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
});

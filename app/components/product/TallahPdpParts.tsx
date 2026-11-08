import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CurrencySymbol, Image } from '@salla.sa/twilight-theme-engine/common';
import { getActiveCurrency } from '@salla.sa/twilight-theme-engine/api/client';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { imageSetting, localizedSetting, safeHref } from '../../lib/localizedSetting';

/** The product page's `selling-points` collection (`single.twig`): an icon, a title, a line and an optional link each. */
export interface SellingPoint {
  image: string;
  title: string;
  description: string;
  href: string;
  linkText: string;
}

/** Reads the Theme Editor collection; items arrive keyed by field id, bare or prefixed with `selling-points.`. */
export function readSellingPoints(raw: unknown, locale: string, learnMore: string): SellingPoint[] {
  if (!Array.isArray(raw)) return [];
  const pick = (item: Record<string, unknown>, id: string) => item[id] ?? item[`selling-points.${id}`];
  return raw
    .map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      return {
        image: imageSetting(pick(item, 'selling-point-image'), locale),
        title: localizedSetting(pick(item, 'selling-point-title'), locale),
        description: localizedSetting(pick(item, 'selling-point-description'), locale),
        href: safeHref(localizedSetting(pick(item, 'selling-point-link'), locale)),
        linkText: localizedSetting(pick(item, 'selling-point-link-content'), locale) || learnMore,
      };
    })
    .filter((point) => point.title || point.description || point.image);
}

/** Icon + text rows under the buy box: a row per point on phones, a row of columns or a list on `lg`. */
export function SellingPoints({ points, view }: { points: SellingPoint[]; view: 'horizontal' | 'vertical' }) {
  if (points.length === 0) return null;
  return (
    <ul className={`tallah-selling-points tallah-selling-points--${view}`}>
      {points.map((point, index) => (
        <li key={`${point.title}-${index}`} className="tallah-selling-points__item">
          {point.image && (
            <img src={point.image} alt="" className="tallah-selling-points__icon" loading="lazy" />
          )}
          <div className="tallah-selling-points__text">
            {point.title && <span className="tallah-selling-points__title">{point.title}</span>}
            {(point.description || point.href) && (
              <p className="tallah-selling-points__desc">
                {point.description}
                {point.href && (
                  <>
                    {' '}
                    <a href={point.href} className="underline underline-offset-2">
                      {point.linkText}
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Wishlist + share row shown under the form on phones (the title row carries them on `lg`). */
export function MobileActions({ children }: { children: ReactNode }) {
  return <div className="tallah-pdp__mobile-actions lg:hidden">{children}</div>;
}

/**
 * Description / reviews tabs (`<salla-tabs>` in Twig). Both panels stay mounted so the reviews widget
 * keeps its state, and the inactive one is `hidden`.
 */
export function ProductTabs({
  description,
  reviews,
}: {
  description: ReactNode;
  /** `null` hides the reviews tab (the store has product ratings off). */
  reviews: ReactNode | null;
}) {
  const { t } = useTranslation();
  const [active, setActive] = useState<'description' | 'reviews'>('description');
  const tabs = [
    { id: 'description' as const, label: t('pages.single.discription', 'Description'), panel: description },
    ...(reviews ? [{ id: 'reviews' as const, label: t('common.rating', t('pages.single.reviews', 'Reviews')), panel: reviews }] : []),
  ];

  return (
    <div className="tallah-tabs">
      <div role="tablist" className="tallah-tabs__list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`pdp-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`pdp-panel-${tab.id}`}
            className={`tallah-tabs__tab${active === tab.id ? ' is-active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`pdp-panel-${tab.id}`}
          aria-labelledby={`pdp-tab-${tab.id}`}
          hidden={active !== tab.id}
          className="tallah-tabs__panel"
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}

/** Extra image strip below the page (`image_collection` + `img_in_single`): a scroll-snap row, no slider library. */
export function InspireGallery({
  images,
  title,
  backgroundColor,
}: {
  images: string[];
  title: string;
  /** `bg_color_gellary` — single.twig's inline background; the stylesheet's grey stays when unset. */
  backgroundColor?: string;
}) {
  if (images.length === 0) return null;
  return (
    <section className="tallah-inspire" style={backgroundColor ? { backgroundColor } : undefined}>
      <h2 className="tallah-inspire__title">{title}</h2>
      <div className="tallah-inspire__track">
        {images.map((url, index) => (
          <div key={`${url}-${index}`} className="tallah-inspire__item">
            <Image src={url} alt="" className="h-full w-full object-cover" aspectRatio="4/5" noWrapper />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * `partials/product/sticky_bar.twig` (design `pro1`), desktop only: a bar at the bottom with the product's
 * image, name, price and an add button, shown once the form's own add button has scrolled out of view. Its
 * button presses the form's one, so the options validation and the cart call stay the form's.
 */
export function StickyBuyBar({ product }: { product: Product }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const frame = useRef(0);
  const currency = getActiveCurrency(product.currency);

  useEffect(() => {
    const mainButton = () =>
      document.querySelector<HTMLElement>("form.product-form salla-add-product-button[type='submit']");
    const update = () => {
      frame.current = 0;
      const button = mainButton();
      setVisible(!!button && button.getBoundingClientRect().bottom < 100);
    };
    const onScroll = () => {
      if (!frame.current) frame.current = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [product.id]);

  // Sold out with nothing to sign up for: there is no purchase for the bar to offer.
  if (product.is_out_of_stock && product.status !== 'out-and-notify') return null;

  return (
    <div className={`tallah-sticky-bar${visible ? ' is-visible' : ''}`} aria-hidden={!visible}>
      <div className="tallah-sticky-bar__inner">
        <div className="tallah-sticky-bar__info">
          {product.image?.url && (
            <Image
              src={product.image.url}
              alt=""
              className="tallah-sticky-bar__thumb"
              aspectRatio="1/1"
              noWrapper
            />
          )}
          <div className="min-w-0">
            <h3 className="tallah-sticky-bar__name">{product.name}</h3>
            <div className="tallah-sticky-bar__price">
              {product.is_on_sale ? (
                <>
                  <span className="font-bold text-primary">
                    {product.sale_price} <CurrencySymbol currency={currency} />
                  </span>
                  <span className="text-sm text-gray-400 line-through">
                    {product.regular_price} <CurrencySymbol currency={currency} />
                  </span>
                </>
              ) : (
                <span className="font-bold text-primary">
                  {String(product.starting_price ?? product.price)} <CurrencySymbol currency={currency} />
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="tallah-sticky-bar__btn"
          tabIndex={visible ? 0 : -1}
          onClick={() =>
            document
              .querySelector<HTMLElement>("form.product-form salla-add-product-button[type='submit']")
              ?.click()
          }
        >
          {product.add_to_cart_label || t('pages.products.add_to_cart', 'Add to cart')}
        </button>
      </div>
    </div>
  );
}

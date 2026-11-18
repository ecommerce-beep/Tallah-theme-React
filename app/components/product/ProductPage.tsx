import { ProductPromoPopups } from './ProductPromoPopups';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { SallaQuickOrder } from '@salla.sa/twilight-components-react/quick-order';
import { SallaOffer } from '@salla.sa/twilight-components-react/offer';
import { SallaComments } from '@salla.sa/twilight-components-react/comments';
import { SallaPayments } from '@salla.sa/twilight-components-react/payments';
import { SallaSocialShare } from '@salla.sa/twilight-components-react/social-share';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useProduct } from '@salla.sa/twilight-theme-engine/hooks/useProduct';
import { useComments } from '@salla.sa/twilight-theme-engine/hooks/useComments';
import { useWishlist } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import { Breadcrumb, RenderWhenVisible } from '@salla.sa/twilight-theme-engine/common';
import { PageBlocks } from '@salla.sa/twilight-theme-engine/home';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import type { ProductPageProps } from '@salla.sa/twilight-theme-engine/routes/product';
import { ProductGallery } from './ProductGallery';
import { ProductDescription, ProductDetails } from './ProductDetails';
import { ProductMetadata } from './ProductMetadata';
import {
  InspireGallery,
  MobileActions,
  ProductTabs,
  readSellingPoints,
  SellingPoints,
  StickyBuyBar,
} from './TallahPdpParts';
import { dropdownSetting, imageSetting } from '../../lib/localizedSetting';
import { AddToCartForm } from './AddToCartForm';
import { SingleOptionButtons } from './SingleOptionButtons';
import { BlockHookSlot } from '../common';
import { ProductsSlider } from '../home/ProductsSlider';
import { relatedSource, sideSource, type RelatedSource } from '../../lib/relatedSource';

/**
 * "Similar products" slider. A separate component (not inline in
 * `ProductPage`) so `relatedCount` lives *inside* the product's keyed
 * `<Fragment>` and resets for free on every product → product navigation,
 * instead of needing a `useEffect` to reset it by hand.
 */
function RelatedProducts({ source, title }: { source: RelatedSource; title: string }) {
  // `null` until the related-products list resolves; `0` once we know there are
  // none — then the lazy `<section>` / `.container` wrapper is dropped entirely
  // rather than left empty in the DOM.
  const [relatedCount, setRelatedCount] = useState<number | null>(null);

  return (
    <>
      <HookSlot name="product:related.start" />
      {/* Dropped once we know there are no related products, so no empty
          `<section>` / `.container` is left behind. `estimatedHeight="0"`: until
          then, don't reserve 400px for a block that may render nothing. */}
      {relatedCount !== 0 && (
        <RenderWhenVisible estimatedHeight="0px">
          <div className="tallah-pdp__related">
            <ProductsSlider
              tallahCards
              data={{ products: source, title, display_all_url: '' }}
              onResolve={setRelatedCount}
            />
          </div>
        </RenderWhenVisible>
      )}
      <HookSlot name="product:related.end" />
    </>
  );
}

/**
 * The buy column's "selected products" carousel (`single_side_products`): four products under the selling
 * points. The heading goes with the products when the list comes back empty.
 */
function SideProducts({ source, title }: { source: RelatedSource; title: string }) {
  const [count, setCount] = useState<number | null>(null);
  if (count === 0) return null;
  return (
    <div className="tallah-pdp__side side_products">
      <h2 className="tallah-pdp__side-title">{title}</h2>
      <ProductsSlider
        tallahCards
        data={{ products: source, limit: 4, display_all_url: '' }}
        onResolve={setCount}
      />
    </div>
  );
}

/**
 * Theme fork of the engine `ProductPage` (wired in from
 * `app/routes/$slug.p$id.tsx`).
 *
 * Same structure as upstream, but renders the theme's flat-markup
 * {@link ProductDetails} / {@link AddToCartForm} and the theme's scroll-carousel
 * {@link ProductsSlider} for the "similar products" block (matching the homepage
 * product cards). The engine's bottom store-wide testimonials block is dropped —
 * `<SallaComments>` already covers product reviews on this page.
 *
 * Upgrade notes: `FORKS.md`.
 */
export function ProductPage({ product: initialProduct, page }: ProductPageProps) {
  const { theme } = useTwilight();
  const { t, locale } = useTranslation();
  const { product } = useProduct(initialProduct);
  const { commentsKey } = useComments();
  const wishlist = useWishlist();
  const blockScope = useMemo(() => ({ product_id: product.id }), [product.id]);
  const settings = (theme?.settings ?? {}) as Record<string, unknown>;

  // The Twig storefront bootstraps `salla.config` with `user.can_comment`; the
  // React SDK init doesn't, so it's `null` and `<salla-comment-form>` (and the
  // `<salla-comments>` container gate) render empty even for eligible buyers.
  // The engine *does* expose the same flag as `store.settings.product
  // .user_can_comment` — copy it across before the lazy comments block mounts.
  useEffect(() => {
    const salla = window.salla;
    if (!salla?.config?.set) return;
    if (salla.config.get('user.can_comment') != null) return;
    const canComment = salla.config.get('store.settings.product.user_can_comment');
    if (typeof canComment !== 'boolean') return;
    salla.config.set('user', { ...(salla.config.get('user') || {}), can_comment: canComment });
  }, []);

  // The engine breadcrumb replaces the product's category crumb with the page
  // you came from (a stored "referrer"). Drop it — synchronously, before
  // `<Breadcrumb>` mounts and reads it — so the real Home › Category › Product
  // trail shows. Guarded: `window` doesn't exist during SSR.
  useState(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage?.removeItem('breadcrumb-referrer');
    } catch {
      /* sessionStorage unavailable (private mode) */
    }
  });

  const showBreadcrumbs = settings.product_show_breadcrumbs !== false;
  const sellingPoints = useMemo(
    () => readSellingPoints(settings['selling-points'], locale, t('blocks.home.learn_more', 'Learn more')),
    [settings, locale, t]
  );
  const sellingView = dropdownSetting(settings['selling-points-view']) === 'vertical' ? 'vertical' : 'horizontal';
  const related = relatedSource(settings);
  const side = sideSource(settings);
  const inspireImages = useMemo(() => {
    // default on (twilight.json): only an explicit off hides the strip
    if (settings.img_in_single === false) return [];
    const items = Array.isArray(settings.image_collection) ? settings.image_collection : [];
    return items
      .map((item) => {
        const record = (item ?? {}) as Record<string, unknown>;
        return imageSetting(record.img_single ?? record['image_collection.img_single'], locale);
      })
      .filter(Boolean);
  }, [settings, locale]);
  // `bg_gellary` switches the extra gallery's own colour on; `bg_color_gellary` is that colour.
  const inspireBackground =
    settings.bg_gellary === false || typeof settings.bg_color_gellary !== 'string'
      ? undefined
      : settings.bg_color_gellary || undefined;
  // `sticky_is_true` (default on) + design `pro1` (the only one ported; `pro2` was a floating card).
  const stickyBar =
    settings.sticky_is_true !== false &&
    (dropdownSetting(settings.product_pro) || 'pro1') === 'pro1';
  const inWishlist = wishlist.has(Number(product.id));

  return (
    // Keyed Fragment (not a wrapper <div>): remounts the whole subtree on a
    // product → product navigation so gallery / form state resets, without
    // adding a node between `#main-content` and the page's sections.
    <Fragment key={product.id}>
      {showBreadcrumbs && (
        <div className="tallah-pdp__crumbs tallah-pdp__crumbs--top lg:hidden">
          <Breadcrumb page={page} />
        </div>
      )}

      {/* App-block hook `product.single.before_product_info` — above the gallery / info grid */}
      <BlockHookSlot
        name="product.single.before_product_info"
        wrapper="s-before-product-info"
        className="!mt-0"
        scope={blockScope}
      />

      <HookSlot name="product:start" />

      <div className="single tallah-pdp bg-background lg:pt-7">
        <div
          className="flex flex-col items-center gap-4 overflow-x-hidden lg:flex-row lg:items-start lg:gap-8 lg:overflow-x-visible lg:px-14"
          id={`product-${product.id}`}
        >
          <ProductGallery product={product} />

          <div className="main-content w-full px-4 lg:sticky lg:top-8 lg:w-[34%] lg:px-0 lg:pb-16">
            <HookSlot name="product:details.start" />
            {showBreadcrumbs && (
              <div className="tallah-pdp__crumbs hidden lg:block">
                <Breadcrumb page={page} />
              </div>
            )}
            {/* Loader product: like Twig, the header price stays the unit price; only the SKU and barcode are live */}
            <ProductDetails
              product={initialProduct}
              sku={product.sku}
              barcode={product.barcode}
              showTags={theme.settings.show_tags}
            />
            <HookSlot name="product:details.end" />

            <HookSlot name="product:single.form.start" />
            <AddToCartForm product={product} stickyAddToCart={theme.settings.sticky_add_to_cart} />
            <HookSlot name="product:single.form.end" />
            {/* single.twig turns the size select into buttons (`initSizeOptionSingle`) */}
            <SingleOptionButtons rootId={`product-${product.id}`} options={product.options} />

            <MobileActions>
              <SallaSocialShare className="inline-flex" aria-label="social share" />
              <button
                type="button"
                className={`tallah-pdp__wishlist btn--wishlist s-product-card-wishlist-btn ${inWishlist ? 'is-added' : 'not-added'}`}
                data-id={product.id}
                aria-pressed={inWishlist}
                onClick={() => window.salla?.wishlist?.toggle?.(product.id)}
              >
                <i className="sicon-heart" aria-hidden="true" />
                <span>{t('pages.single.wishlist', 'Add to wishlist')}</span>
              </button>
            </MobileActions>

            {/* Twig renders this hook and its merchant blocks after the form */}
            <HookSlot name="product:single.description.end" context={{ product }} />
            <PageBlocks hook="product:single.description.end" scope={blockScope} />
            <SallaQuickOrder className="mt-5 block lg:-mb-2" />
            <div className="mt-5">
              <SallaPayments />
            </div>

            <SellingPoints points={sellingPoints} view={sellingView} />

            {side && <SideProducts source={side} title={t('pages.single.selected', 'Selected products')} />}

            {product.has_metadata && (
              <div className="feature pt-3 lg:pt-8">
                <ProductMetadata className="w-full" />
              </div>
            )}
          </div>
        </div>

        <div className="px-4 md:px-14">
          <ProductTabs
            description={
              <div className="product__description mb-3 leading-7 text-font">
                <p className="text-base font-semibold leading-6 lg:text-xl lg:leading-9">
                  {t('pages.single.discription', 'Description')}
                </p>
                <ProductDescription product={product} />
              </div>
            }
            reviews={
              // single.twig always renders the reviews tab (its `show_on_product` condition is commented out).
              <>
                {/* App-block hook `product.single.before_customer_reviews` — between the info and the reviews */}
                <BlockHookSlot
                  name="product.single.before_customer_reviews"
                  wrapper="s-before-reviews"
                  scope={blockScope}
                />
                {/* `estimatedHeight="0"`: `RenderWhenVisible` hard-codes `min-height` on its
                    wrapper section and never clears it, so the default 400px leaves an empty
                    gap when the product has no reviews. Comments size themselves once present. */}
                <RenderWhenVisible estimatedHeight="0px" className="s-block--full-bg">
                  <SallaComments key={commentsKey} itemId={product.id} type={'product' as never} />
                </RenderWhenVisible>
              </>
            }
          />
        </div>

        <SallaOffer />

        {related && (
          <>
            {/* App-block hook `product.single.before_product_recommendations` — between the reviews and related */}
            <BlockHookSlot
              name="product.single.before_product_recommendations"
              wrapper="s-before-related"
              scope={blockScope}
            />
            <RelatedProducts source={related} title={t('pages.single.similar', 'You may also like')} />
          </>
        )}

        {/* App-block hook `product.single.after_product_recommendations` — end of the product page */}
        <BlockHookSlot
          name="product.single.after_product_recommendations"
          wrapper="s-after-related"
          scope={blockScope}
        />

        <InspireGallery
          images={inspireImages}
          title={t('pages.single.inspire', 'Style inspiration')}
          backgroundColor={inspireBackground}
        />

        {stickyBar && <StickyBuyBar product={product} />}

        <ProductPromoPopups product={product} settings={settings} />
      </div>

      <HookSlot name="product:end" />
    </Fragment>
  );
}

import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { Product, ProductOption } from '@salla.sa/twilight-theme-engine/types';
import { SallaAddProductButton } from '@salla.sa/twilight-components-react/add-product-button';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';
import { useWishlist } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { WishlistHeartButton } from './WishlistHeartButton';
import { CardOptions, useCardOptions } from './TallahCardOptions';

const TallahQuickView = lazy(() => import('./TallahQuickView').then((m) => ({ default: m.TallahQuickView })));

export interface TallahProductCardProps {
  product: Product;
  /** The image is above the fold: load it eagerly. */
  imagePriority?: boolean;
}

interface CardDetails {
  images: { url?: string }[];
  options: ProductOption[];
}

interface SallaSdk {
  product?: { getDetails?: (id: number, withs: string[]) => Promise<{ data?: Partial<CardDetails> }> };
  cart?: { addItem?: (payload: unknown) => Promise<{ success?: boolean; error?: string }> };
  notify?: { error?: (message: string) => void };
}

const sdk = () => (typeof window === 'undefined' ? undefined : (window.salla as unknown as SallaSdk | undefined));

/**
 * The product's gallery and options (the list response has neither), fetched once and kept for the
 * session under the Twig card's own cache key. `eager` loads them on mount (the card shows options);
 * otherwise they wait for the first hover / focus, which is all the second image needs.
 */
function useCardDetails(productId: number | string, eager: boolean) {
  const [details, setDetails] = useState<CardDetails | null>(null);
  const requested = useRef(false);

  const load = useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    const key = `product_${productId}_details`;

    try {
      const cached = window.sessionStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached) as Partial<CardDetails>;
        setDetails({ images: parsed.images ?? [], options: parsed.options ?? [] });
        return;
      }
    } catch {
      // storage can be blocked: fall through to the request
    }

    sdk()
      ?.product?.getDetails?.(Number(productId), ['images', 'options'])
      .then((response) => {
        const next = { images: response?.data?.images ?? [], options: response?.data?.options ?? [] };
        setDetails(next);
        try {
          window.sessionStorage.setItem(key, JSON.stringify({ ...next, timestamp: Date.now() }));
        } catch {
          // a full or blocked storage only costs the cache
        }
      })
      .catch(() => {
        requested.current = false;
      });
  }, [productId]);

  // Eager cards start their request as soon as they are on the page (never on the server).
  useEffect(() => {
    if (eager) load();
  }, [eager, load]);

  return { details, load };
}

/** The badge text: a pre-order label, or the merchant's promotion title with "off". */
function badgeText(product: Product, locale: string) {
  const preorder = (product as { preorder?: { label?: string } }).preorder?.label;
  if (preorder) return preorder;
  if (product.promotion_title) return `${product.promotion_title} ${locale === 'ar' ? 'خصم' : 'off'}`;
  return '';
}

interface AddButtonProps {
  product: Product;
  selection: Record<string, number | string>;
  missing: ProductOption | undefined;
  /** The wide button of the panel over the image, with a label; otherwise the round one. */
  wide?: boolean;
}

/**
 * The card's own add-to-cart: it checks that every required option has a value (naming the first that
 * does not), then adds one unit with the chosen options through the SDK cart.
 */
function CardAddButton({ product, selection, missing, wide }: AddButtonProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const notify = (message: string) => sdk()?.notify?.error?.(message);

  const onClick = async () => {
    if (loading) return;
    if (missing) {
      notify(t('blocks.product_card.select_option', 'Please select :name').replace(':name', missing.name));
      return;
    }
    setLoading(true);
    try {
      const result = await sdk()?.cart?.addItem?.({ id: product.id, quantity: 1, options: selection });
      if (result && result.success === false) throw new Error(result.error || 'Add to cart failed');
    } catch {
      notify(t('blocks.product_card.add_failed', 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  const label = product.add_to_cart_label || t('pages.cart.add_to_cart', 'Add to cart');
  const icon = product.type === 'booking' ? 'sicon-calendar-time' : 'sicon-shopping-bag';

  return (
    <button
      type="button"
      className={`salla-add-product-button tallah-card__add${wide ? ' tallah-card__add--wide' : ''}${missing ? '' : ' btn-ready'}${loading ? ' loading' : ''}`}
      aria-label={wide ? undefined : label}
      aria-busy={loading}
      disabled={loading}
      onClick={onClick}
    >
      {wide && <span className="add-icon-label">{label}</span>}
      <i className={`add-icon ${icon}${loading ? ' hidden' : ''}`} aria-hidden="true" />
      {loading && <i className="loader sicon-loading animate-spin" aria-hidden="true" />}
    </button>
  );
}

/**
 * TALLAH's vertical product card — port of the Twig theme's `product-card.js` (vertical layout):
 * a square-ish image that flips to the product's second image on hover, a corner badge, a wishlist
 * and a quick-view button that slide in from the top on hover, then the category, the name, the
 * price beside a round add-to-cart button, and (setting `product_card_options`) the product's color
 * and size choices: over the image on hover, or, with `product_card_options_image` off, above the
 * name. Styling: `04-components/tallah-product-card.scss`.
 */
export const TallahProductCard = memo(function TallahProductCard({ product, imagePriority }: TallahProductCardProps) {
  const { t, locale } = useTranslation();
  const { theme } = useTwilight();
  const { format } = useMoney();
  const wishlist = useWishlist();
  const settings = (theme?.settings ?? {}) as { product_card_options?: boolean; product_card_options_image?: boolean };
  const optionsOn = settings.product_card_options !== false;
  const optionsOverImage = optionsOn && settings.product_card_options_image !== false;

  const { details, load } = useCardDetails(product.id, optionsOn);
  const { selection, select, missing } = useCardOptions(details?.options);
  const [quickView, setQuickView] = useState(false);

  const productId = Number(product.id);
  const badge = badgeText(product, locale);
  const onSale = product.status === 'sale';
  const outOfStock = product.status === 'out';
  const inWishlist = wishlist.has(productId);
  const image = product.image?.url;
  const second = details && details.images.length > 1 ? (details.images[1]?.url ?? null) : null;
  const options = details?.options ?? [];
  const hasOptionControls = options.some((option) => option.type === 'color' || option.type === 'single-option');
  const panel = optionsOverImage && hasOptionControls;

  // A product with no tracked price shows nothing, or a dash when the store asks for one.
  const money = (value: number | string | null | undefined) =>
    value === null || value === undefined || value === '' || Number(value) === 0 ? null : format(value as number);

  let price;
  if (product.is_on_sale) {
    price = (
      <div className="s-product-card-sale-price">
        <h4>{money(product.sale_price)}</h4>
        <span>{money(product.regular_price)}</span>
      </div>
    );
  } else if (product.starting_price) {
    price = (
      <div className="s-product-card-starting-price">
        <p>{t('pages.products.starting_price', 'Starting from')}</p>
        <h4>{money(product.starting_price)}</h4>
      </div>
    );
  } else {
    price = <h4 className="s-product-card-price">{money(product.price)}</h4>;
  }

  const optionProps = {
    options,
    selection,
    onSelect: select,
    disabled: !onSale,
    colorLabel: t('blocks.product_card.color', 'Color'),
    sizeLabel: t('blocks.product_card.size', 'Size'),
  };

  // A product on sale adds from the card itself when options are on; anything else (sold out,
  // notify-me) and a store with options off use Salla's own button, which owns those states.
  const ownAdd = onSale && optionsOn;
  const roundAdd = ownAdd ? (
    <CardAddButton product={product} selection={selection} missing={missing} />
  ) : (
    <SallaAddProductButton
      fill="none"
      productId={product.id as never}
      productStatus={product.status}
      productType={product.type}
    >
      <i className={`sicon-${product.type === 'booking' ? 'calendar-time' : 'shopping-bag'}`} />
    </SallaAddProductButton>
  );

  return (
    <div
      id={String(product.id)}
      className={`s-product-card s-product-card-entry s-product-card-vertical tallah-card${outOfStock ? ' s-product-card-out-of-stock' : ''}`}
      onPointerEnter={load}
      onFocus={load}
    >
      <div className="s-product-card-image">
        <Link to={product.url} className="product-flip-wrapper" aria-label={product.image?.alt ? undefined : product.name}>
          <div className={`product-flip-inner${second ? ' has-flip' : ''}`}>
            {image && (
              <img
                className="product-flip-face front"
                src={image}
                alt={product.image?.alt || ''}
                loading={imagePriority ? 'eager' : 'lazy'}
                decoding="async"
              />
            )}
            {second && <img className="product-flip-face back" src={second} alt="" loading="lazy" decoding="async" />}
          </div>
          {badge && <div className="s-product-card-promotion-title min-w-fit">{badge}</div>}
        </Link>

        <div className="flex-action">
          <button
            type="button"
            className="s-product-card-quick-btn eye-model-style"
            aria-label={t('blocks.product_card.quick_view', 'Quick view')}
            aria-haspopup="dialog"
            data-id={productId}
            onClick={() => setQuickView(true)}
          >
            <i className="sicon-eye" aria-hidden="true" />
          </button>
          <WishlistHeartButton
            productId={productId}
            ariaLabel={t('pages.wishlist.toggle', 'Add or remove to wishlist')}
            className={`s-product-card-wishlist-btn animated ${inWishlist ? 's-product-card-wishlist-added pulse-anime' : 'not-added un-favorited'}`}
            onClick={() => wishlist.toggle(productId)}
          />
        </div>

        {outOfStock && <span className="tallah-card__out">{t('pages.products.out_of_stock', 'Out of Stock')}</span>}

        {panel && (
          <div className="card-floating-btn">
            <CardOptions {...optionProps} showLabels />
            {onSale ? (
              <CardAddButton product={product} selection={selection} missing={missing} wide />
            ) : (
              <SallaAddProductButton productId={product.id as never} productStatus={product.status} productType={product.type}>
                {product.add_to_cart_label || t('pages.products.out_of_stock', 'Out of Stock')}
              </SallaAddProductButton>
            )}
          </div>
        )}
      </div>

      <div className="s-product-card-content">
        {product.category?.name && (
          <div className="s-product-card-content-category">
            {/* Without a category URL the name is plain text: a link to `#` has no `href` and is not crawlable. */}
            <h3>
              {product.category.url ? (
                <Link to={product.category.url}>{product.category.name}</Link>
              ) : (
                product.category.name
              )}
            </h3>
          </div>
        )}
        <div className="s-product-card-content-main">
          {optionsOn && hasOptionControls && (
            // Over the image the same choices float on desktop; this copy is the phones' one.
            <div className={optionsOverImage ? 'md:hidden' : undefined}>
              <CardOptions {...optionProps} showLabels={optionsOverImage} />
            </div>
          )}
          <h3 className="s-product-card-content-title">
            <Link to={product.url}>{product.name}</Link>
          </h3>
        </div>
        <div className="s-product-card-content-sub">
          <span className="product-price">{price}</span>
          <div className="tallah-card__actions">
            {product.rating?.stars ? (
              <div className="s-product-card-rating">
                <i className="sicon-star2" aria-hidden="true" />
                <span>{product.rating.stars}</span>
              </div>
            ) : null}
            {/* With the choices over the image, the round button is the phones' (wide one is on the image). */}
            <div className={panel && onSale ? 'md:hidden' : undefined}>{roundAdd}</div>
          </div>
        </div>
      </div>

      {quickView && (
        <Suspense fallback={null}>
          <TallahQuickView productId={product.id} name={product.name} url={product.url} onClose={() => setQuickView(false)} />
        </Suspense>
      )}
    </div>
  );
});

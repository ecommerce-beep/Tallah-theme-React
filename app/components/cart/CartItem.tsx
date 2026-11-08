import { useCallback, useEffect, useRef, useState } from 'react';
import type { Money, CartItem as CartItemType } from '@salla.sa/twilight-theme-engine/types';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';
import { Link, Image } from '@salla.sa/twilight-theme-engine/common';
import { SallaCartItemOffers } from '@salla.sa/twilight-components-react/cart-item-offers';
import { useWishlist } from '@salla.sa/twilight-theme-engine/hooks/useWishlist';
import { WishlistHeartButton } from '../product/WishlistHeartButton';
import { Delete01Icon, MinusIcon, PlusIcon } from '../icons';

interface CartItemProps {
  item: CartItemType;
  isFirst?: boolean;
  /** Called after a successful quantity change / delete so the page can refetch. */
  onMutated?: () => void;
}

/**
 * Theme fork of the engine `CartItem`.
 *
 * Differences from upstream:
 *  - flat row (border-separated) instead of a padded `bg-white` card;
 *  - the "Total:" label is dropped (the cart-page column heading covers it);
 *  - the delete control is a plain trash icon at the row end, not a red icon
 *    button in the corner.
 * Upgrade notes: `FORKS.md`.
 */
function toNumber(value: number | Money | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  return value.amount;
}

function moneyCurrency(value: number | Money | undefined): string | undefined {
  if (typeof value !== 'object') return undefined;
  return value.currency;
}

/**
 * Plain-React quantity stepper — the `<salla-quantity-input>` web component
 * (deferred or Core) either stuck on its skeleton or never wired its buttons
 * here, so the pill (`.s-quantity-input-*`, styled in `quantity-stepper.scss`)
 * is rebuilt in React and the change is pushed straight to `salla.cart`.
 */
function CartQuantity({
  value,
  max,
  label,
  disabled = false,
  onChange,
}: {
  value: number;
  max?: number;
  label: string;
  /** Row is being removed — freeze the stepper and drop any pending commit. */
  disabled?: boolean;
  onChange: (quantity: number) => Promise<void>;
}) {
  const [qty, setQty] = useState(value);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // follow a server-corrected quantity on refetch, but not while the user is
  // mid-edit (a stale refetch would otherwise snap the number back)
  useEffect(() => {
    if (!pending.current) setQty(value);
  }, [value]);

  // Never let a debounced commit fire after the row is gone (deleted mid-edit)
  // or once it's being deleted — it would `updateItem` a stale / removed id.
  useEffect(() => {
    if (disabled) {
      clearTimeout(timer.current);
      pending.current = false;
    }
  }, [disabled]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = useCallback(
    (next: number) => {
      const clamped = Math.max(1, max ? Math.min(next, max) : next);
      setQty(clamped);
      pending.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        pending.current = false;
        // Revert to the server-confirmed `value`, not the locally-optimistic
        // chain — a failed update never changes it, and mid-burst edits (e.g.
        // 3 -> 4 before 2 -> 3 ever committed) would otherwise roll back to
        // an unconfirmed intermediate quantity instead of the real one.
        onChange(clamped).catch(() => setQty(value));
      }, 350);
    },
    [max, onChange, value]
  );

  return (
    <div className="s-quantity-input">
      <div className="s-quantity-input-container">
        <button
          type="button"
          className="s-quantity-input-increase-button s-quantity-input-button"
          aria-label={`${label} +`}
          disabled={disabled || (!!max && qty >= max)}
          onClick={() => commit(qty + 1)}
        >
          <PlusIcon aria-hidden="true" />
        </button>
        <input
          className="s-quantity-input-input"
          name="quantity"
          inputMode="numeric"
          aria-label={label}
          value={qty}
          disabled={disabled}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
            commit(Number.isFinite(n) ? n : 1);
          }}
        />
        <button
          type="button"
          className="s-quantity-input-decrease-button s-quantity-input-button"
          aria-label={`${label} -`}
          disabled={disabled || qty <= 1}
          onClick={() => commit(qty - 1)}
        >
          <MinusIcon aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * Regular / original / current price of a row, as `cart.twig`: the pre-offer price struck through, the
 * original price struck through when the product is on sale, then the price to pay. Shown twice (under the name on
 * phones, in the controls column from `md`), so each copy gets its own wrapper class.
 */
function CartItemPrice({ item, className }: { item: CartItemType; className: string }) {
  const { t } = useTranslation();
  const { format } = useMoney();
  // The cart API nests the product under the row, but the engine type doesn't declare it.
  const promotionTitle = (item as { product?: { promotion_title?: string } }).product?.promotion_title;

  return (
    <div className={`cart-item__price ${className}`}>
      {item.offer && (
        <span className="item-regular-price cart-item__strike">
          {format(toNumber(item.product_price), { currency: moneyCurrency(item.product_price) })}
        </span>
      )}

      {item.is_on_sale && (
        <span className="item-original-price cart-item__strike">
          {format(toNumber(item.original_price), { currency: moneyCurrency(item.original_price) })}
        </span>
      )}

      <span className={`item-price cart-item__now${item.has_discount ? '' : ' cart-item__now--plain'}`}>
        {format(toNumber(item.price), { currency: moneyCurrency(item.price) })}
      </span>

      {promotionTitle && (
        <span className="cart-item__promo">{promotionTitle}</span>
      )}

      {item.weight_label && (
        <p className="cart-item__weight">
          {t('pages.products.weight')}: <span>{item.weight_label}</span>
        </p>
      )}
    </div>
  );
}

/** The offers a row earned: the older single-line one, or the detailed list. */
function CartItemOffers({ item }: { item: CartItemType }) {
  return (
    <>
      {item.offer && !item.detailed_offers?.length && (
        <span className="old-offers flex items-center gap-1 mx-1.5">
          <i className="sicon-discount-calculator text-gray-500 offer-icon"></i>
          <span className="text-sm text-gray-500 offer-name">{item.offer.names}</span>
        </span>
      )}

      {item.detailed_offers && item.detailed_offers.length > 0 && (
        <SallaCartItemOffers
          quantity={item.quantity}
          itemId={String(item.id) as never}
          productPrice={toNumber(item.product_price) ?? 0}
          offers={JSON.stringify(item.detailed_offers)}
        />
      )}
    </>
  );
}

/** Donating rows have no control; hidden-quantity rows show a static number;
 * everything else gets the stepper. */
function CartItemQuantity({
  item,
  disabled,
  onChange,
}: {
  item: CartItemType;
  disabled: boolean;
  onChange: (quantity: number) => Promise<void>;
}) {
  const { t } = useTranslation();

  if (item.type === 'donating') return <span></span>;

  if (item.is_hidden_quantity) {
    return (
      <>
        <input
          type="hidden"
          value={item.quantity}
          name="quantity"
          aria-label={t('pages.products.quantity', 'Quantity')}
        />
        <span className="w-10 text-center">{item.quantity}</span>
      </>
    );
  }

  return (
    <CartQuantity
      value={item.quantity}
      max={item.max_quantity ?? undefined}
      label={t('pages.products.quantity', 'Quantity')}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

/** Out of stock beats any price; offers use their own special total. */
function cartItemTotalLabel(
  item: CartItemType,
  format: ReturnType<typeof useMoney>['format'],
  t: ReturnType<typeof useTranslation>['t']
) {
  if (!item.is_available) return t('pages.products.out_of_stock', 'Out of Stock');
  return item.detailed_offers?.length
    ? format(toNumber(item.total_special_price), {
        currency: moneyCurrency(item.total_special_price),
      })
    : format(toNumber(item.total), { currency: moneyCurrency(item.total) });
}

/** Heart toggle on the row (cart.twig's `btn--wishlist`), synced with the shared wishlist state. */
function CartItemWishlist({ productId }: { productId: number }) {
  const { t } = useTranslation();
  const wishlist = useWishlist();
  const inWishlist = wishlist.has(productId);

  return (
    <WishlistHeartButton
      productId={productId}
      ariaLabel={t('pages.wishlist.toggle', 'Add or remove to wishlist')}
      className={`btn--wishlist s-product-card-wishlist-btn animated ${inWishlist ? 's-product-card-wishlist-added is-added' : 'not-added un-favorited'}`}
      onClick={() => wishlist.toggle(productId)}
    />
  );
}

export function CartItem({ item, isFirst = false, onMutated }: CartItemProps) {
  const { t } = useTranslation();
  const { format } = useMoney();
  const [deleting, setDeleting] = useState(false);
  // Set once the item is deleted with no `onMutated` to refetch the cart.
  const [removed, setRemoved] = useState(false);
  // Belt-and-suspenders against `CartQuantity`'s debounced commit: it cancels
  // its pending timer once `disabled` propagates, but that's a render away —
  // a delete within the 350ms debounce window could otherwise still fire a
  // stale `updateItem` for an id that's already gone. Set synchronously in
  // `handleDelete`, before the delete request even starts.
  const deletingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const changeQuantity = useCallback(
    async (quantity: number) => {
      if (deletingRef.current) return;
      const form = formRef.current;
      // Like Twig, post the whole item form: the API rejects a quantity without the item's options.
      if (form && !form.reportValidity()) throw new Error('Required options are missing');
      const payload = form ? new FormData(form) : undefined;
      payload?.set('quantity', String(quantity));
      // Refetch only on success — on rejection the caller reverts the
      // optimistic quantity locally instead (server state didn't change).
      await window.salla?.cart.updateItem(payload ?? { id: item.id, quantity });
      onMutated?.();
    },
    [item.id, onMutated]
  );

  // Only the item's product-options run through the SDK form handler; the
  // quantity stepper posts to `salla.cart` itself (above).
  const handleChange = (e: React.ChangeEvent<HTMLFormElement>) => {
    if (!(e.target as HTMLElement)?.closest?.('salla-product-options')) return;
    window.salla?.form.onChange('cart.updateItem', e);
    window.setTimeout(() => onMutated?.(), 800);
  };

  const handleDelete = async () => {
    if (deleting) return;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await window.salla?.cart.deleteItem(item.id);
      // Prefer a refetch (also refreshes the summary); fall back to dropping the row.
      if (onMutated) onMutated();
      else setRemoved(true);
    } catch {
      deletingRef.current = false;
      setDeleting(false);
    }
  };

  if (removed) return null;

  const isFreeProduct = toNumber(item.price) === 0 && item.has_discount;

  return (
    <form ref={formRef} onChange={handleChange} id={`item-${item.id}`}>
      <section className="cart-item relative">
        <input type="hidden" name="id" value={item.id} />

        <div className="cart-item__row">
          <div className="cart-item__main">
            <Link to={item.url} className="cart-item__image relative overflow-hidden shrink-0">
              <Image
                src={item.product_image}
                alt={item.product_name}
                className="cart-item__img"
                priority={isFirst}
              />

              {isFreeProduct && (
                <div className="free-ribbon absolute top-[11px] right-[-38px] w-32 bg-red-600 text-white text-xs font-bold text-center py-1 rotate-45 shadow-md">
                  {t('pages.loyalty_program.free_product', 'Free')}
                </div>
              )}
            </Link>

            <div className="cart-item__info">
              <h2 className="cart-item__name">
                <Link to={item.url}>{item.product_name}</Link>
              </h2>

              {/* phones: the price sits under the name; from `md` it moves to the controls column */}
              <CartItemPrice item={item} className="cart-item__price--mobile" />
            </div>
          </div>

          <div className="cart-item__controls">
            <span className="cart-item__actions">
              <button
                type="button"
                className="cart-item__delete"
                aria-label={t('common.elements.remove', 'Remove from the cart')}
                aria-busy={deleting}
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? (
                  <span className="cart-item__delete-spinner" aria-hidden="true" />
                ) : (
                  <Delete01Icon aria-hidden="true" className="h-5 w-5" />
                )}
              </button>
              <CartItemWishlist productId={item.product_id} />
            </span>

            <CartItemQuantity item={item} disabled={deleting} onChange={changeQuantity} />

            <CartItemPrice item={item} className="cart-item__price--desktop" />

            {/* Twig keeps this line `hidden` but fills it; the out-of-stock label shows through it */}
            {!item.is_available && (
              <p className="cart-item__total">
                <span className="inline-block item-total">{cartItemTotalLabel(item, format, t)}</span>
              </p>
            )}
          </div>
        </div>

        {item.options && item.options.length > 0 && (
          // Raw element, not the React wrapper: the wrapper assigns `options` after the
          // element's constructor has run, so it falls back to fetching the product's
          // default options (nothing selected) instead of showing the cart item's
          // selection. As an attribute it is set before connect. The element also
          // parses `options` once, so key on the data to remount when it changes.
          <salla-product-options
            key={JSON.stringify(item.options)}
            options={JSON.stringify(item.options)}
            product-id={item.product_id}
          />
        )}

        <CartItemOffers item={item} />
      </section>
    </form>
  );
}

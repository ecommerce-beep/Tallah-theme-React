import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks/useMoney';
import { cart as cartApi } from '@salla.sa/twilight-theme-engine/api/cart';
import { CartItem } from '../../cart/CartItem';
import { CloseIcon } from '../../icons';
import { useDialogFocus } from '../../../hooks/useDialogFocus';
import { useScrollLock } from '../../../hooks/useScrollLock';

type EventBus = {
  on?: (name: string, cb: (...args: unknown[]) => void) => void;
  off?: (name: string, cb: (...args: unknown[]) => void) => void;
};

const CART_EVENTS = ['cart::updated', 'cart::item.deleted'] as const;
const ITEM_ADDED = 'cart::item.added';

/**
 * The side cart's data and open state (`enable_side_cart` + `cart_display_type`
 * = `side`). Reads the current cart through the engine's cart API, refetches on
 * the SDK's cart events, and opens when an item is added. Inert while `enabled`
 * is off: nothing is fetched or bound.
 */
export function useSideCart(enabled: boolean) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const idQuery = useQuery({ ...cartApi.queries.currentId(), enabled });
  const cartId = idQuery.data;
  const cartQuery = useQuery({ ...cartApi.queries.detail(cartId!), enabled: enabled && !!cartId });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: cartApi.queries.currentId().queryKey });
    if (cartId != null) {
      void queryClient.invalidateQueries({ queryKey: cartApi.queries.detail(cartId).queryKey });
    }
  }, [cartId, queryClient]);

  // The cart id only exists once the SDK is up. A page that asks for it earlier gets `null` and, with nothing
  // to retry it, would show an empty drawer for a cart that has items: ask again as soon as the SDK is ready.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const askAgain = () => {
      if (!cancelled) void queryClient.invalidateQueries({ queryKey: cartApi.queries.currentId().queryKey });
    };
    // The SDK script may not even exist yet: `theme::ready` covers that, `onReady` the SDK that is already there.
    document.addEventListener('theme::ready', askAgain);
    void (window.salla as { onReady?: () => Promise<unknown> } | undefined)?.onReady?.().then(askAgain);
    return () => {
      cancelled = true;
      document.removeEventListener('theme::ready', askAgain);
    };
  }, [enabled, queryClient]);

  useEffect(() => {
    if (!enabled) return;
    const onAdded = () => {
      refresh();
      setOpen(true);
    };
    // Bound to the emitter found now and removed from that same one, even if the SDK is re-initialised.
    let bound: EventBus | undefined;
    let cancelled = false;
    const bind = () => {
      if (bound || cancelled) return;
      const bus = (window.salla as { event?: EventBus } | undefined)?.event;
      if (!bus?.on) return;
      bound = bus;
      for (const name of CART_EVENTS) bus.on?.(name, refresh);
      bus.on?.(ITEM_ADDED, onAdded);
    };
    bind();
    document.addEventListener('theme::ready', bind);
    void (window.salla as { onReady?: () => Promise<unknown> } | undefined)?.onReady?.().then(bind);
    return () => {
      cancelled = true;
      document.removeEventListener('theme::ready', bind);
      for (const name of CART_EVENTS) bound?.off?.(name, refresh);
      bound?.off?.(ITEM_ADDED, onAdded);
    };
  }, [enabled, refresh]);

  return { open, setOpen, cart: cartQuery.data ?? null, refresh };
}

/** The platform's message has an `:amount` slot and may carry markup; show it as plain text. */
function freeShippingAlert(message: string, amount: string): string {
  return message.replace(':amount', amount).replace(/<[^>]*>/g, '');
}

interface SideCartProps {
  open: boolean;
  onClose: () => void;
  cart: ReturnType<typeof useSideCart>['cart'];
  refresh: () => void;
}

/**
 * The cart drawer (migrated from `#sidecart-panel` in `header.twig`): it slides
 * in from the inline-start edge over a dimmed page. Top to bottom: the free
 * shipping progress, the cart's rows ({@link CartItem}, the cart page's own),
 * then coupon, totals and the two buttons. Escape, the backdrop, the close
 * button and "continue shopping" close it; scroll is locked and focus kept
 * inside while open.
 */
export function SideCart({ open, onClose, cart, refresh }: SideCartProps) {
  const { t } = useTranslation();
  const { format } = useMoney();
  const { currency, store } = useTwilight();
  const panelRef = useRef<HTMLElement>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useScrollLock(open);
  useDialogFocus(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const items = cart?.items ?? [];
  const coupon = cart?.coupon ?? '';
  const bar = cart?.free_shipping_bar;
  const total = cart?.total;
  const filled = items.length > 0;
  // The Twig prints a "tax included" note under the total when the store's prices are taxable.
  const taxIncluded = (store?.settings as { tax?: { taxable_prices_enabled?: boolean } } | undefined)?.tax?.taxable_prices_enabled === true;
  const countLabel = cart
    ? t(cart.count === 1 ? 'pages.cart.sidecart_count_one' : 'pages.cart.sidecart_count_other', cart.count === 1 ? '(:count item)' : '(:count items)').replace(':count', String(cart.count))
    : '';

  const submitCoupon = async (event: FormEvent) => {
    event.preventDefault();
    const sallaCart = (window.salla as { cart?: Record<string, (code?: string) => Promise<unknown>> } | undefined)
      ?.cart;
    if (!coupon && !code.trim()) {
      setError(t('pages.cart.coupon_required', 'Please enter the coupon code'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (coupon) await sallaCart?.deleteCoupon?.();
      else await sallaCart?.addCoupon?.(code.trim());
      setCode('');
      refresh();
    } catch (err) {
      const message = (err as { response?: { data?: { error?: { message?: string } } } })?.response
        ?.data?.error?.message;
      setError(message || t('pages.cart.coupon_failed', 'The coupon could not be applied'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`tallah-sidecart${open ? ' is-open' : ''}`} inert={!open} data-testid="tallah-sidecart">
      <button type="button" className="tallah-sidecart__backdrop" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <aside
        ref={panelRef}
        className="tallah-sidecart__panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('pages.checkout.cart', 'Cart')}
        tabIndex={-1}
      >
        <button type="button" className="tallah-sidecart__close" aria-label={t('blocks.header.close', 'Close')} onClick={onClose}>
          <CloseIcon aria-hidden="true" />
        </button>

        <div className="tallah-sidecart__body">
          <h2>
            {t('pages.checkout.cart', 'Cart')}
            {cart && filled && <span> {countLabel}</span>}
          </h2>

          {bar && (
            <div className="tallah-sidecart__shipping" data-testid="tallah-sidecart-shipping">
              <p>
                {bar.has_free_shipping
                  ? freeShippingAlert(t('pages.cart.has_free_shipping', 'You have free shipping'), '')
                  : freeShippingAlert(
                      t('pages.cart.free_shipping_alert', 'Get free shipping when you add :amount more'),
                      `${bar.remaining} ${currency?.symbol ?? ''}`.trim()
                    )}
                {bar.has_free_shipping && <span aria-hidden="true"> 🎉</span>}
              </p>
              {!bar.has_free_shipping && (
                <div className="tallah-sidecart__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(bar.percent)}>
                  <div style={{ width: `${Math.min(100, Math.max(0, bar.percent))}%` }} />
                </div>
              )}
            </div>
          )}

          {items.length === 0 ? (
            <div className="tallah-sidecart__empty">
              <i className="sicon-shopping-bag" aria-hidden="true" />
              <p>{t('pages.cart.empty_cart', 'Your cart is empty')}</p>
            </div>
          ) : (
            <div className="tallah-sidecart__items">
              {items.map((item) => (
                <CartItem key={item.id} item={item} onMutated={refresh} />
              ))}
            </div>
          )}
        </div>

        <div className="tallah-sidecart__footer">
          <form onSubmit={submitCoupon} noValidate className="tallah-sidecart__coupon">
            <label htmlFor="tallah-sidecart-coupon">{t('pages.cart.have_coupon', 'Have a coupon?')}</label>
            <div className="tallah-sidecart__coupon-field">
              <input
                id="tallah-sidecart-coupon"
                value={coupon || code}
                disabled={!!coupon || busy}
                placeholder={t('pages.cart.coupon_placeholder', 'Coupon code')}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError('');
                }}
                aria-invalid={!!error}
                aria-describedby={error ? 'tallah-sidecart-coupon-error' : undefined}
              />
              <button type="submit" disabled={busy} className={coupon ? 'is-applied' : undefined}>
                {coupon ? t('pages.cart.remove_coupon', 'Remove') : t('pages.cart.save_coupon', 'Apply')}
              </button>
            </div>
            {error && (
              <span id="tallah-sidecart-coupon-error" role="alert" className="tallah-sidecart__error">
                {error}
              </span>
            )}
          </form>

          {/* As the Twig: the rows are always there; with an empty cart their values are blank. */}
          <dl className="tallah-sidecart__totals">
            <div>
              <dt>{t('pages.cart.items_total', 'Items total')}</dt>
              <dd>{filled && cart?.sub_total ? format(cart.sub_total) : ''}</dd>
            </div>
            <div>
              <dt>{t('pages.cart.discount', 'Discount')}</dt>
              <dd>{filled ? format(cart?.total_discount ?? cart?.discount ?? 0) : ''}</dd>
            </div>
            <div className="tallah-sidecart__final">
              <dt>
                <h5 className="font-semibold">{t('pages.cart.final_total', 'Total')}</h5>
                {taxIncluded && (
                  <small className="opacity-70">
                    <span className="text-red-600" aria-hidden="true">*</span> {t('pages.products.tax_included', 'Tax included')}
                  </small>
                )}
              </dt>
              <dd>{filled ? format(typeof total === 'string' ? Number(total) : total) : ''}</dd>
            </div>
          </dl>

          <div className="tallah-sidecart__actions">
            <button type="button" onClick={onClose}>
              {t('pages.offer.continue_shopping', 'Continue shopping')}
            </button>
            <Link to="/cart" className="is-primary" onClick={onClose}>
              {t('pages.cart.goToCartPage', 'Go to cart')}
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

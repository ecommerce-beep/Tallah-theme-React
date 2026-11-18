import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SallaFilters } from '@salla.sa/twilight-components-react/filters';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { checkPriceRange } from '../../lib/priceRange';

interface PriceMount {
  host: HTMLElement;
  mount: HTMLElement;
}

const INPUT = '.s-price-range-number-input';

/**
 * The `<salla-price-range>` widgets inside `root`, each with a node for the Apply button appended to it. They are
 * drawn by the SDK after the page is up (and again after a filters reset), so they are watched for.
 */
function usePriceMounts(root: React.RefObject<HTMLElement | null>): PriceMount[] {
  const [mounts, setMounts] = useState<PriceMount[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const known = new Map<HTMLElement, HTMLElement>();
    const scan = () => {
      const hosts = Array.from(el.querySelectorAll<HTMLElement>('salla-price-range'));
      let changed = false;
      hosts.forEach((host) => {
        if (known.has(host)) return;
        const mount = document.createElement('div');
        mount.className = 'tallah-price-apply';
        host.appendChild(mount);
        known.set(host, mount);
        changed = true;
      });
      known.forEach((mount, host) => {
        if (hosts.includes(host)) return;
        mount.remove();
        known.delete(host);
        changed = true;
      });
      if (changed) setMounts(Array.from(known, ([host, mount]) => ({ host, mount })));
    };
    scan();
    const observer = new MutationObserver(scan);
    observer.observe(el, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      known.forEach((mount) => mount.remove());
    };
  }, [root]);

  return mounts;
}

/**
 * The Apply button of one price range, and the checks before it commits.
 *
 * The SDK widget reads its two fields only when each loses focus (`blur`) and then applies through a small arrow
 * button. A tap on that button does not move focus in Safari / iOS, and Enter in a field does not apply, so the
 * range typed was dropped and the filter went out as `min 0, max ''`: nothing changed. Here the fields are
 * committed (a `blur` each) just before the SDK's own button is pressed, so its state, the address bar and the
 * `salla-filters::changed` event all carry what is on screen, through the one filtering mechanism there is.
 */
function PriceApply({ host, busy }: { host: HTMLElement; busy: boolean }) {
  const { t } = useTranslation();
  const [values, setValues] = useState({ min: '', max: '' });
  const messageId = useId();

  const inputs = useCallback(() => Array.from(host.querySelectorAll<HTMLInputElement>(INPUT)), [host]);
  const read = useCallback(() => {
    const [min, max] = inputs();
    setValues((prev) => {
      const next = { min: min?.value ?? '', max: max?.value ?? '' };
      return prev.min === next.min && prev.max === next.max ? prev : next;
    });
  }, [inputs]);

  const check = checkPriceRange(values.min, values.max);
  const canApply = check.canApply && !busy;

  const apply = useCallback(() => {
    const [min, max] = inputs();
    if (!min || !max) return;
    if (!checkPriceRange(min.value, max.value).canApply) return;
    min.dispatchEvent(new FocusEvent('blur'));
    max.dispatchEvent(new FocusEvent('blur'));
    (host.querySelector<HTMLElement>('salla-button button') ?? host.querySelector<HTMLElement>('salla-button'))?.click();
  }, [host, inputs]);

  // The fields belong to the SDK: follow them from the widget's own node, whichever way they change.
  useEffect(() => {
    read();
    const frame = requestAnimationFrame(read); // the SDK fills them (from the address bar) once it has rendered
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || !(event.target as HTMLElement)?.matches?.(INPUT)) return;
      event.preventDefault();
      read();
      apply();
    };
    host.addEventListener('input', read);
    host.addEventListener('change', read);
    host.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener('input', read);
      host.removeEventListener('change', read);
      host.removeEventListener('keydown', onKeyDown);
    };
  }, [host, read, apply]);

  // The SDK fixes each widget's height (`s-filters-widget-content`) when it loads, before this button (or the message
  // above it) is in the section, and clips what does not fit in it: have it measure again whenever that content changes.
  const wrong = check.problem !== null;
  useEffect(() => {
    inputs().forEach((input) => {
      input.setAttribute('aria-invalid', String(wrong));
      if (wrong) input.setAttribute('aria-describedby', messageId);
      else input.removeAttribute('aria-describedby');
    });
  }, [wrong, inputs, messageId, values]);

  const message =
    check.problem === 'order'
      ? t('blocks.catalog.price_range_order', 'The minimum price cannot be higher than the maximum')
      : check.problem === 'invalid'
        ? t('blocks.catalog.price_range_invalid', 'Enter a valid price')
        : '';

  useEffect(() => {
    const widget = host.closest<HTMLElement & { setWidgetHeight?: (delay?: number) => Promise<void> }>(
      'salla-filters-widget'
    );
    void widget?.setWidgetHeight?.(0);
  }, [host, message]);

  return (
    <>
      {message && (
        <p id={messageId} role="alert" className="tallah-price-apply__error">
          {message}
        </p>
      )}
      <button
        type="button"
        className="tallah-price-apply__btn"
        disabled={!canApply}
        aria-busy={busy}
        onClick={apply}
      >
        {t('pages.cart.apply_coupon_btn', 'Apply')}
      </button>
    </>
  );
}

/**
 * `<salla-filters>` with a labelled Apply button in its price section (see {@link PriceApply}). The other filter
 * widgets are the SDK's and apply as they always did; `busy` is the listing re-querying after a change.
 */
export function FiltersPanel({
  id,
  filters,
  busy,
}: {
  id: string;
  filters: unknown;
  busy: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const mounts = usePriceMounts(root);
  return (
    <div ref={root} className="tallah-filters-panel">
      <SallaFilters id={id} filters={filters as never} />
      {mounts.map(({ host, mount }, index) => createPortal(<PriceApply host={host} busy={busy} />, mount, String(index)))}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ProductOption } from '@salla.sa/twilight-theme-engine/types';

/** The product page's Salla options widget renders a `single-option` (the size) as a `<select>`. */
const SELECT_SELECTOR = '[data-option-type="single-option"] select';

/** Where the widget keeps the control; the buttons go beside the select, in the same container. */
const CONTENT_SELECTOR = '.s-product-options-option-content';

interface Choice {
  value: string;
  text: string;
  disabled: boolean;
}

/** The choices the select holds now, in its own order, without the empty "choose" prompt. */
function readChoices(select: HTMLSelectElement): Choice[] {
  return Array.from(select.options)
    .filter((option) => option.value.trim() !== '')
    .map((option) => ({ value: option.value, text: option.text.trim(), disabled: option.disabled }));
}

/** The value ids of this select's option, in the order the product lists them (`options[<id>]` is the select's name). */
function apiOrder(select: HTMLSelectElement, options: ProductOption[] | undefined): string[] {
  const optionId = /^options\[(\d+)\]/.exec(select.name)?.[1];
  if (!optionId || !options) return [];
  const option = options.find((candidate) => String(candidate.id) === optionId);
  return (option?.details ?? option?.values ?? []).map((value) => String((value as { id: number }).id));
}

/**
 * The choices in the product's own order. The select is the widget's to rebuild (a colour pick rewrites it with the
 * variants' stock), so its order is whatever the last rebuild made it; the product's list does not move. A value the
 * product does not list keeps its place in the select, after the listed ones.
 */
export function orderChoices(choices: Choice[], order: string[]): Choice[] {
  if (order.length === 0) return choices;
  const rank = new Map(order.map((value, index) => [value, index]));
  return choices
    .map((choice, index) => ({ choice, index }))
    .sort(
      (a, b) =>
        (rank.get(a.choice.value) ?? Number.POSITIVE_INFINITY) - (rank.get(b.choice.value) ?? Number.POSITIVE_INFINITY) ||
        a.index - b.index
    )
    .map(({ choice }) => choice);
}

const sameChoices = (a: Choice[], b: Choice[]) =>
  a.length === b.length && a.every((choice, i) => choice.value === b[i].value && choice.text === b[i].text && choice.disabled === b[i].disabled);

/**
 * One row of buttons for one `single-option` select: the choices as visible, directly selectable buttons, as the
 * Twig theme shows them (`initSizeOptionSingle` in its `app.js`).
 *
 * The select stays in the page, visually hidden, and stays the source of truth: a click sets its value and fires
 * its own `change`, so Salla's widget updates the variant, the price and the stock exactly as for a pick in the
 * list, and the `required` check still runs on it. The buttons follow it: when the widget rewrites its options
 * (labels, availability) they are read again, and they keep the product's own order throughout.
 */
function SingleOptionRow({
  select,
  container,
  options,
}: {
  select: HTMLSelectElement;
  container: Element;
  options: ProductOption[] | undefined;
}) {
  const [value, setValue] = useState(select.value);
  const [choices, setChoices] = useState(() => readChoices(select));
  const order = useMemo(() => apiOrder(select, options), [select, options]);

  useEffect(() => {
    const sync = () => {
      setValue(select.value);
      setChoices((previous) => {
        const next = readChoices(select);
        return sameChoices(previous, next) ? previous : next;
      });
    };
    const observer = new MutationObserver(sync);
    observer.observe(select, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['disabled', 'label'],
    });
    select.dataset.tallahButtons = 'true';
    select.tabIndex = -1;
    select.setAttribute('aria-hidden', 'true');
    select.addEventListener('change', sync);
    sync();
    return () => {
      observer.disconnect();
      select.removeEventListener('change', sync);
      delete select.dataset.tallahButtons;
      select.removeAttribute('aria-hidden');
      select.removeAttribute('tabindex');
    };
  }, [select]);

  const pick = useCallback(
    (next: string) => {
      select.value = next;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      setValue(select.value);
    },
    [select]
  );

  const shown = orderChoices(choices, order);

  return createPortal(
    <div className="tallah-size-options" role="radiogroup" aria-label={select.getAttribute('aria-label') ?? undefined}>
      {shown.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          disabled={option.disabled}
          className={`tallah-size-option${value === option.value ? ' is-active' : ''}`}
          onClick={() => pick(option.value)}
        >
          {option.text}
        </button>
      ))}
    </div>,
    container
  );
}

/**
 * Shows the product page's size (`single-option`) choices as buttons. The Salla options widget builds its markup after
 * the page does and rebuilds it when a variant changes, so the selects are looked for again whenever the page's
 * subtree changes.
 */
export function SingleOptionButtons({ rootId, options }: { rootId: string; options?: ProductOption[] }) {
  const [selects, setSelects] = useState<HTMLSelectElement[]>([]);

  useEffect(() => {
    const host = document.getElementById(rootId);
    if (!host) return;
    let frame = 0;
    const scan = () => {
      const found = Array.from(host.querySelectorAll<HTMLSelectElement>(SELECT_SELECTOR));
      setSelects((prev) => (prev.length === found.length && prev.every((s, i) => s === found[i]) ? prev : found));
    };
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    });
    observer.observe(host, { childList: true, subtree: true });
    scan();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [rootId]);

  return (
    <>
      {selects.map((select) => {
        const container = select.closest(CONTENT_SELECTOR);
        return container ? (
          <SingleOptionRow key={select.name || select.id} select={select} container={container} options={options} />
        ) : null;
      })}
    </>
  );
}

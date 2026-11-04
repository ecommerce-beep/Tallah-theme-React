import { useCallback, useMemo, useState } from 'react';
import type { Product, ProductOption } from '@salla.sa/twilight-theme-engine/types';

/** The Twig card showed at most this many values of an option, then a "+N" chip. */
const MAX_VISIBLE = 3;

type Selection = Record<string, number | string>;

/** The values of an option, from a detail response (`details`) or the older shape (`values`). */
const valuesOf = (option: ProductOption) =>
  (option.details ?? (option.values as unknown as NonNullable<ProductOption['details']>) ?? []) as NonNullable<
    ProductOption['details']
  >;

/**
 * The options a card lets the customer pick before adding to the cart: color swatches and
 * single-option (size) buttons. A `thumbnail` option has no control: its first value is chosen
 * for the customer, as the Twig card did.
 */
export function useCardOptions(options: ProductOption[] | undefined) {
  const [chosen, setChosen] = useState<Selection>({});

  const fixed = useMemo(() => {
    const picks: Selection = {};
    for (const option of options ?? []) {
      if (option.type === 'thumbnail') {
        const first = valuesOf(option)[0];
        if (first) picks[option.id] = first.id;
      }
    }
    return picks;
  }, [options]);

  const selection = useMemo(() => ({ ...fixed, ...chosen }), [fixed, chosen]);
  const select = useCallback((optionId: number, valueId: number) => setChosen((prev) => ({ ...prev, [optionId]: valueId })), []);
  /** The first required option still without a value. */
  const missing = (options ?? []).find((option) => option.required && !selection[option.id]);
  const ready = !missing;

  return { selection, select, missing, ready };
}

interface CardOptionsProps {
  options: ProductOption[];
  selection: Selection;
  onSelect: (optionId: number, valueId: number) => void;
  /** Only a product on sale takes a choice; the rest show the options greyed out. */
  disabled: boolean;
  /** "Color : Red" above the swatches, as when the options float over the image. */
  showLabels?: boolean;
  colorLabel: string;
  sizeLabel: string;
}

/** The color / size controls of one card. Other option types are not shown on the card. */
export function CardOptions({ options, selection, onSelect, disabled, showLabels, colorLabel, sizeLabel }: CardOptionsProps) {
  const shown = options.filter((option) => option.type === 'color' || option.type === 'single-option');
  if (!shown.length) return null;

  return (
    <div className="s-product-card-content-options flex flex-col mb-2">
      {shown.map((option) => {
        const values = valuesOf(option);
        const visible = values.slice(0, MAX_VISIBLE);
        const remaining = values.length - MAX_VISIBLE;
        const picked = values.find((value) => value.id === selection[option.id]);

        if (option.type === 'color') {
          return (
            <div key={option.id} className="colors-wrapper mb-3">
              {showLabels && (
                <span className="block">
                  {colorLabel} : <span className={`selected-color font-semibold${disabled ? ' pointer-events-none opacity-50' : ''}`}>{picked?.name}</span>
                </span>
              )}
              <div className="colors flex flex-wrap gap-2" data-color-option={option.id}>
                {visible.map((value) => (
                  <button
                    key={value.id}
                    type="button"
                    className={`tallah-card__swatch${picked?.id === value.id ? ' ring-2 ring-primary' : ''}`}
                    style={{ backgroundColor: value.color || value.image || undefined }}
                    title={value.name}
                    aria-label={value.name}
                    aria-pressed={picked?.id === value.id}
                    data-option-id={value.id}
                    disabled={disabled}
                    onClick={() => onSelect(option.id, value.id)}
                  />
                ))}
                {remaining > 0 && <span className="tallah-card__more">+{remaining}</span>}
              </div>
            </div>
          );
        }

        return (
          <div key={option.id} className={`sizes-wrapper mb-3${disabled ? ' pointer-events-none opacity-50' : ''}`}>
            {showLabels && (
              <span className="block">
                {sizeLabel} : <span className="selected-size font-semibold">{picked?.name}</span>
              </span>
            )}
            <div className="sizes flex flex-wrap gap-2" data-single-option={option.id}>
              {visible.map((value) => (
                <button
                  key={value.id}
                  type="button"
                  className={`tallah-card__size${picked?.id === value.id ? ' bg-primary text-background' : ''}${disabled ? ' strike-diagonal' : ''}`}
                  aria-pressed={picked?.id === value.id}
                  data-option-id={value.id}
                  disabled={disabled}
                  onClick={() => onSelect(option.id, value.id)}
                >
                  {value.name}
                </button>
              ))}
              {remaining > 0 && <span className="tallah-card__more tallah-card__more--size">+{remaining}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Convenience for callers that only need the product's option list typed. */
export type CardProduct = Pick<Product, 'id' | 'status' | 'type'>;

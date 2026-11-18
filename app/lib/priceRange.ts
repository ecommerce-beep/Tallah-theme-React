export type PriceRangeProblem = 'invalid' | 'order';

export interface PriceRangeCheck {
  /** Neither field has a value: there is nothing to apply. */
  empty: boolean;
  /** `invalid`: a value that is not a price (negative, not a number). `order`: the minimum is above the maximum. */
  problem: PriceRangeProblem | null;
  /** Something to apply, and nothing wrong with it. */
  canApply: boolean;
}

/** A field's price: `null` when blank, `NaN` when it holds something that is not a number. */
function priceOf(raw: string): number | null {
  const text = raw.trim();
  if (text === '') return null;
  return Number(text);
}

/**
 * The checks the price filter needs before a range is committed to the listing. Either bound may be left blank
 * (an open range); the ones given must be prices (zero or more) and, with both, the minimum may not pass the maximum.
 */
export function checkPriceRange(minRaw: string, maxRaw: string): PriceRangeCheck {
  const min = priceOf(minRaw);
  const max = priceOf(maxRaw);
  if (min === null && max === null) return { empty: true, problem: null, canApply: false };

  const bad = (value: number | null) => value !== null && (!Number.isFinite(value) || value < 0);
  if (bad(min) || bad(max)) return { empty: false, problem: 'invalid', canApply: false };
  if (min !== null && max !== null && min > max) return { empty: false, problem: 'order', canApply: false };
  return { empty: false, problem: null, canApply: true };
}

import { describe, it, expect } from 'vitest';
import { checkPriceRange } from '../../app/lib/priceRange';

describe('checkPriceRange', () => {
  it('has nothing to apply while both fields are blank', () => {
    expect(checkPriceRange('', '')).toEqual({ empty: true, problem: null, canApply: false });
    expect(checkPriceRange('  ', '')).toMatchObject({ empty: true, canApply: false });
  });

  it('accepts a full range, and an open one with either bound blank', () => {
    expect(checkPriceRange('50', '200').canApply).toBe(true);
    expect(checkPriceRange('50', '').canApply).toBe(true);
    expect(checkPriceRange('', '200').canApply).toBe(true);
    expect(checkPriceRange('0', '0').canApply).toBe(true);
    expect(checkPriceRange('10.5', '10.5').canApply).toBe(true);
  });

  it('rejects a minimum above the maximum', () => {
    expect(checkPriceRange('500', '100')).toEqual({ empty: false, problem: 'order', canApply: false });
  });

  it('rejects a negative or non numeric price', () => {
    expect(checkPriceRange('-5', '100')).toMatchObject({ problem: 'invalid', canApply: false });
    expect(checkPriceRange('10', 'abc')).toMatchObject({ problem: 'invalid', canApply: false });
    expect(checkPriceRange('Infinity', '')).toMatchObject({ problem: 'invalid', canApply: false });
  });
});

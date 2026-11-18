import { describe, it, expect } from 'vitest';
import { hasNoInstallmentProviders } from '../../app/lib/installments';

describe('hasNoInstallmentProviders', () => {
  it('is true only for an empty array', () => {
    expect(hasNoInstallmentProviders([])).toBe(true);
  });

  it('is false for a list of providers and for every value that could still hold some', () => {
    for (const value of [['tabby'], [{ name: 'tamara' }], {}, { tabby: true }, 'tabby', '', null, undefined]) {
      expect(hasNoInstallmentProviders(value)).toBe(false);
    }
  });
});

import { describe, it, expect } from 'vitest';
import { relatedSource, sideSource } from '../../app/lib/relatedSource';

describe('relatedSource (single_products / single_source)', () => {
  it('is the latest products when nothing is saved, as the TALLAH manifest defaults', () => {
    expect(relatedSource({})).toEqual({ source: 'latest' });
    expect(relatedSource({ single_products: true, single_source: [{ value: 'latest' }] })).toEqual({
      source: 'latest',
    });
  });

  it('is off when the merchant switched the block off', () => {
    expect(relatedSource({ single_products: false })).toBeNull();
  });

  it('maps "sales" to the best selling list', () => {
    expect(relatedSource({ single_source: 'sales' })).toEqual({ source: 'best_selling' });
  });

  it('uses the chosen categories or products, reading plain ids or { id } / { value } items', () => {
    expect(
      relatedSource({ single_source: 'categories', categories_single: [11, { id: 12 }, { value: '13' }] })
    ).toEqual({ source: 'categories', source_value: [11, 12, 13] });
    expect(relatedSource({ single_source: 'selected', products_single: [5, 6] })).toEqual({
      source: 'selected',
      source_value: [5, 6],
    });
  });

  it('falls back to the latest products when a categories / selected choice has nothing picked', () => {
    expect(relatedSource({ single_source: 'categories', categories_single: [] })).toEqual({
      source: 'latest',
    });
    expect(relatedSource({ single_source: 'selected' })).toEqual({ source: 'latest' });
  });
});

describe('sideSource (single_side_products / single_side_source)', () => {
  it('is off unless the merchant turned it on', () => {
    expect(sideSource({})).toBeNull();
    expect(sideSource({ single_side_products: false })).toBeNull();
  });

  it('is the latest products by default, and maps "sales" to offers', () => {
    expect(sideSource({ single_side_products: true })).toEqual({ source: 'latest' });
    expect(sideSource({ single_side_products: true, single_side_source: 'sales' })).toEqual({
      source: 'offers',
    });
  });

  it('uses the picked categories or products, and falls back to latest when none are picked', () => {
    expect(
      sideSource({ single_side_products: true, single_side_source: 'categories', categories_side_single: [3] })
    ).toEqual({ source: 'categories', source_value: [3] });
    expect(
      sideSource({ single_side_products: true, single_side_source: 'selected', products_side_single: [{ id: 8 }] })
    ).toEqual({ source: 'selected', source_value: [8] });
    expect(
      sideSource({ single_side_products: true, single_side_source: 'selected', products_side_single: [] })
    ).toEqual({ source: 'latest' });
  });
});

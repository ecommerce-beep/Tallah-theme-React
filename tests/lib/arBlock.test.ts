import { describe, it, expect } from 'vitest';
import { collectionItems, colorVar, cssUrl, isDefaultLight, pickerIds, plainText, resolveArProducts } from '../../app/lib/arBlock';

describe('cssUrl', () => {
  it('quotes a safe address and escapes quotes and backslashes in it', () => {
    expect(cssUrl('https://cdn.example/a.webp')).toBe('url("https://cdn.example/a.webp")');
    expect(cssUrl('https://x/a")b.webp')).toBe('url("https://x/a\\")b.webp")');
    expect(cssUrl('/images/a.png')).toBe('url("/images/a.png")');
  });

  it('refuses anything that is not http(s) or site-relative', () => {
    expect(cssUrl('javascript:alert(1)')).toBeUndefined();
    expect(cssUrl('//evil.example/a.png')).toBeUndefined();
    expect(cssUrl('')).toBeUndefined();
  });
});

describe('colors', () => {
  it('applies a filled color and drops an empty one', () => {
    expect(colorVar(' #112233 ')).toBe('#112233');
    expect(colorVar('')).toBeUndefined();
    expect(colorVar(undefined)).toBeUndefined();
  });

  it('treats empty, #fff and #ffffff as the default light text color', () => {
    expect(isDefaultLight(undefined)).toBe(true);
    expect(isDefaultLight(' #FFF ')).toBe(true);
    expect(isDefaultLight('#FAFAFA')).toBe(false);
  });
});

describe('plainText', () => {
  it('strips markup for an aria-label', () => {
    expect(plainText('<b>Winter</b> sale ')).toBe('Winter sale');
  });
});

describe('pickerIds', () => {
  it('reads ids from objects, bare numbers, numeric strings and a single object', () => {
    expect(pickerIds([{ id: 7 }, { value: 8 }, 9, '10'])).toEqual([7, 8, 9, 10]);
    expect(pickerIds({ id: 3 })).toEqual([3]);
  });

  it('ignores empty and unusable entries', () => {
    expect(pickerIds(undefined)).toEqual([]);
    expect(pickerIds('')).toEqual([]);
    expect(pickerIds([{ label: 'x' }, null, 'abc'])).toEqual([]);
  });
});

describe('resolveArProducts', () => {
  it('maps latest and sales without a value', () => {
    expect(resolveArProducts('latest', [], [])).toEqual({ source: 'latest' });
    expect(resolveArProducts('sales', [{ id: 1 }], [{ id: 2 }])).toEqual({ source: 'sales' });
  });

  it('takes the picked categories or products for the matching source', () => {
    expect(resolveArProducts('categories', [{ id: 5 }], [{ id: 9 }])).toEqual({ source: 'categories', sourceValue: [5] });
    expect(resolveArProducts('selected', [{ id: 5 }], [{ id: 9 }, { id: 10 }])).toEqual({
      source: 'selected',
      sourceValue: [9, 10],
    });
  });

  it('gives up when nothing is picked or the source is unknown', () => {
    expect(resolveArProducts('categories', [], [])).toBeUndefined();
    expect(resolveArProducts('selected', [], [])).toBeUndefined();
    expect(resolveArProducts('', [], [])).toBeUndefined();
    expect(resolveArProducts('best_selling', [], [])).toBeUndefined();
  });
});

describe('collectionItems', () => {
  it('returns bare keys for items keyed bare or prefixed with the collection id', () => {
    expect(
      collectionItems([{ block_title: 'a' }, { 'banner.block_title': 'b', 'banner.url': '/x' }], 'banner')
    ).toEqual([{ block_title: 'a' }, { block_title: 'b', url: '/x' }]);
  });

  it('prefers the bare key when an item carries both', () => {
    expect(collectionItems([{ 'banner.title': 'old', title: 'new' }], 'banner')).toEqual([{ title: 'new' }]);
  });

  it('is empty for anything that is not a list, and skips non-object entries', () => {
    expect(collectionItems(undefined, 'banner')).toEqual([]);
    expect(collectionItems('x', 'banner')).toEqual([]);
    expect(collectionItems([null, 'x', { a: 1 }], 'banner')).toEqual([{ a: 1 }]);
  });
});

describe('pickerIds with the Theme Editor\'s real picker shape', () => {
  it('takes the number from the url when the picked item carries a hashed text id', () => {
    expect(
      pickerIds([
        { id: 'oqrZBb', name: 'الأرائك', url: 'https://demostore.salla.sa/ar/dev-x/الأرائك-والكراسي/c1373748323', image: 'x', icon: null },
        { id: 'AbCdEf', url: 'https://store.example/ar/اسم/p743402068?x=1' },
      ])
    ).toEqual([1373748323, 743402068]);
  });

  it('prefers a numeric id, and drops an item with neither a number nor a recognisable url', () => {
    expect(pickerIds([{ id: 5, url: 'https://s/c9' }, { id: 'zzz', url: 'https://s/blog' }])).toEqual([5]);
  });

  it('resolves a category pick end to end', () => {
    expect(
      resolveArProducts('categories', [{ id: 'oqrZBb', url: 'https://s/ar/x/c1373748323' }], [])
    ).toEqual({ source: 'categories', sourceValue: [1373748323] });
  });
});

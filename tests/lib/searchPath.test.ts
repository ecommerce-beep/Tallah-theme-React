import { describe, it, expect } from 'vitest';
import { searchPath } from '../../app/lib/searchPath';

describe('searchPath', () => {
  it('builds the engine search route with an encoded ?q=', () => {
    expect(searchPath('جاكيت')).toBe('/search?q=%D8%AC%D8%A7%D9%83%D9%8A%D8%AA');
    expect(searchPath('white shirt')).toBe('/search?q=white%20shirt');
  });

  it('keeps special characters inside the one value', () => {
    expect(searchPath('a&b=c#d%e/?')).toBe('/search?q=a%26b%3Dc%23d%25e%2F%3F');
  });

  it('trims, and refuses empty or whitespace-only text', () => {
    expect(searchPath('  shirt ')).toBe('/search?q=shirt');
    expect(searchPath('')).toBeNull();
    expect(searchPath('  	 ')).toBeNull();
  });
});

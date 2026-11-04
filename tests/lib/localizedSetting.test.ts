import { describe, it, expect } from 'vitest';
import { dropdownSetting, imageSetting, linkSetting, localizedSetting, safeHref } from '../../app/lib/localizedSetting';

describe('localizedSetting', () => {
  it('returns a plain string as it is', () => {
    expect(localizedSetting('hello', 'ar')).toBe('hello');
  });

  it('picks the current language from a per-language map', () => {
    expect(localizedSetting({ ar: 'مرحبا', en: 'Hello' }, 'en')).toBe('Hello');
  });

  it('falls back to the first text when the language is missing', () => {
    expect(localizedSetting({ en: 'Hello' }, 'ar')).toBe('Hello');
  });

  it('is empty for anything else', () => {
    expect(localizedSetting(null, 'ar')).toBe('');
    expect(localizedSetting(undefined, 'ar')).toBe('');
    expect(localizedSetting(5, 'ar')).toBe('');
  });
});

describe('imageSetting', () => {
  it('reads a url string, an { url } object or a per-language url', () => {
    expect(imageSetting(' https://x/a.png ', 'ar')).toBe('https://x/a.png');
    expect(imageSetting({ url: 'https://x/b.png' }, 'ar')).toBe('https://x/b.png');
    expect(imageSetting({ ar: 'https://x/c.png' }, 'ar')).toBe('https://x/c.png');
    expect(imageSetting(null, 'ar')).toBe('');
  });
});

describe('safeHref', () => {
  it('keeps http(s) and site-relative links', () => {
    expect(safeHref('https://salla.sa/x')).toBe('https://salla.sa/x');
    expect(safeHref('/cart')).toBe('/cart');
  });

  it('drops scripts, protocol-relative and non-string values', () => {
    expect(safeHref('javascript:alert(1)')).toBe('');
    expect(safeHref('//evil.example')).toBe('');
    expect(safeHref(undefined)).toBe('');
  });
});

describe('dropdownSetting', () => {
  it('reads a string, a `[{ value }]` list, and nothing', () => {
    expect(dropdownSetting('start')).toBe('start');
    expect(dropdownSetting([{ value: 'end', label: 'نهاية' }])).toBe('end');
    expect(dropdownSetting(undefined)).toBe('');
    expect(dropdownSetting([])).toBe('');
  });
});

describe('linkSetting', () => {
  it('accepts a URL, a `{ url }` object and a per-language map, and drops unsafe ones', () => {
    expect(linkSetting('https://x.sa/p1', 'ar')).toBe('https://x.sa/p1');
    expect(linkSetting({ url: '/offers' }, 'ar')).toBe('/offers');
    expect(linkSetting({ ar: 'https://x.sa/ar', en: 'https://x.sa/en' }, 'en')).toBe('https://x.sa/en');
    expect(linkSetting('javascript:alert(1)', 'ar')).toBe('');
    expect(linkSetting(null, 'ar')).toBe('');
  });
});

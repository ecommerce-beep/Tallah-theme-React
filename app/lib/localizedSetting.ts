/**
 * A Theme Editor value that may be per-language (`multilanguage: true` settings
 * arrive as `{ ar: '…', en: '…' }`) or a plain string.
 */
export function localizedSetting(value: unknown, locale: string): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const map = value as Record<string, unknown>;
    const picked = map[locale] ?? Object.values(map).find((v) => typeof v === 'string');
    return typeof picked === 'string' ? picked : '';
  }
  return '';
}

/** An image setting is a URL string, or `{ url }` / a per-language map of them. */
export function imageSetting(value: unknown, locale: string): string {
  if (value && typeof value === 'object' && 'url' in value) {
    const url = (value as { url?: unknown }).url;
    return typeof url === 'string' ? url.trim() : '';
  }
  return localizedSetting(value, locale).trim();
}

/** Only http(s) and site-relative links are rendered from merchant-entered URLs. */
export function safeHref(url: unknown): string {
  if (typeof url !== 'string') return '';
  const value = url.trim();
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return /^https?:\/\//i.test(value) ? value : '';
}

/** A dropdown setting arrives as a string, or `[{ value }]`. */
export function dropdownSetting(raw: unknown): string {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first === 'string') return first;
  return (first as { value?: string } | undefined)?.value ?? '';
}

/** A `variable-list` link setting is a URL string, or `{ url }` / a per-language map of them. */
export function linkSetting(value: unknown, locale: string): string {
  if (value && typeof value === 'object' && 'url' in value) return safeHref((value as { url?: unknown }).url);
  return safeHref(localizedSetting(value, locale));
}

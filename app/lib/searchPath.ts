/**
 * The search results page for what was typed: the engine's `/search` route reads `?q=`.
 * Empty or whitespace-only text goes nowhere (`null`); the rest is trimmed and encoded
 * whole, so Arabic, spaces and `&`, `#` or `%` stay one value.
 */
export function searchPath(text: string): string | null {
  const query = text.trim();
  return query ? `/search?q=${encodeURIComponent(query)}` : null;
}

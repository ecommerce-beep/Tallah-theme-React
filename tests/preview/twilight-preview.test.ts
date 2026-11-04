// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (name: string) => JSON.parse(readFileSync(`${root}${name}`, 'utf8'));

/**
 * `pnpm dev` reads `twilight.preview.json` as its local theme state. The demo store's own homepage and
 * `header_layout = default` are Raed's, so when this file is missing, disabled or its layout is cleared the
 * normal localhost storefront turns back into Raed. This guards the file where it exists.
 */
const TALLAH_HOME = [
  'AR-Hero-section',
  'AR_our_products',
  'AR-special-banner',
  'AR-Products-banner',
  'AR-Hero-2',
  'Ar-Promo-banner',
  'AR-special-banner',
  'AR-Custom-testimonials',
];

// The file is local, per-developer state (gitignored): a fresh clone has none, so these checks only run where it exists.
const hasPreview = existsSync(`${root}twilight.preview.json`);

describe.skipIf(!hasPreview)('twilight.preview.json (the normal local storefront)', () => {
  const preview = hasPreview ? read('twilight.preview.json') : {};

  it('is enabled, so the local theme state overrides the demo store', () => {
    expect(preview.enabled).toBe(true);
  });

  it('lists exactly the eight TALLAH homepage blocks, in order', () => {
    expect(preview.layout.map((block: { path: string }) => block.path)).toEqual(TALLAH_HOME);
  });

  it('only uses blocks the manifest declares', () => {
    const declared = read('twilight.json').components.map((c: { path: string }) =>
      c.path.replace(/^home\./, '')
    );
    for (const path of new Set(TALLAH_HOME)) expect(declared).toContain(path);
  });

  it('keeps the TALLAH header layout and the side cart on', () => {
    expect(preview.settings.header_layout).toBe('tallah');
    expect(preview.settings.enable_side_cart).toBe(true);
  });
});

describe('twilight.json header_layout', () => {
  it('offers TALLAH only', () => {
    const fields = read('twilight.json').settings as { id?: string; options?: { value: string }[] }[];
    const layout = fields.find((f) => f.id === 'header_layout');
    expect(layout?.options?.map((o) => o.value)).toEqual(['tallah']);
  });
});

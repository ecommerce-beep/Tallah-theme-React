import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import manifest from '../../twilight.json';
import ar from '../../locales/ar.json';
import en from '../../locales/en.json';
import { readCartFeatures } from '../../app/components/cart/CartFeatures';

type Field = {
  id: string;
  type?: string;
  value?: unknown;
  maxLength?: string | number;
  conditions?: { id: string; operation: string; value: unknown }[];
  fields?: Field[];
};
const settings = (manifest as unknown as { settings: Field[] }).settings;
const byId = (id: string) => settings.find((s) => s.id === id);

describe('twilight.json — settings migrated from the original TALLAH theme', () => {
  it('has unique setting ids', () => {
    const ids = settings.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the original cart keys and defaults', () => {
    expect(byId('features_switch_cart')).toMatchObject({ type: 'boolean', value: true });
    expect(byId('sticky_cart_button')).toMatchObject({ type: 'boolean', value: true });
    const features = byId('cart_page_features')!;
    expect(features).toMatchObject({ type: 'collection', maxLength: '3', value: [] });
    expect(features.fields!.map((f) => f.id)).toEqual([
      'cart_page_features.cart_features_image',
      'cart_page_features.cart_features_content',
      'cart_page_features.cart_features_link',
    ]);
    expect(features.conditions).toEqual([
      { id: 'features_switch_cart', operation: '=', value: true },
    ]);
  });

  it('keeps the extra-gallery colour pair and its condition chain', () => {
    expect(byId('bg_color_gellary')).toMatchObject({ value: '#F5F6F7' });
    expect(byId('bg_color_gellary')!.conditions![0]).toMatchObject({ id: 'bg_gellary' });
    expect(byId('bg_gellary')!.conditions![0]).toMatchObject({ id: 'img_in_single' });
  });

  it('keeps the product popup settings, conditioned on their switches', () => {
    for (const id of [
      'newsletter_sp_add_image',
      'newsletter_sp_block_title',
      'newsletter_sp_sub_title',
    ]) {
      expect(byId(id)!.conditions![0]).toMatchObject({ id: 'newsletter_sp_view_modal' });
    }
    for (const id of ['collection_add_image', 'collection_sp_block_title', 'collection_categories']) {
      expect(byId(id)!.conditions![0]).toMatchObject({ id: 'collection_sp_view_modal' });
    }
  });

  it('keeps TALLAH the header layout (no Raed option was added back)', () => {
    expect(JSON.stringify(byId('header_layout'))).toContain('tallah');
  });

  it('has Arabic and English for the theme string this task added', () => {
    expect((ar as Record<string, string>)['pages.cart.features']).toBeTruthy();
    expect((en as Record<string, string>)['pages.cart.features']).toBeTruthy();
  });

  it('keeps the local preview file out of git', () => {
    const ignore = readFileSync(resolve(__dirname, '../../.gitignore'), 'utf8');
    expect(ignore).toContain('twilight.preview.json');
  });
});

describe('twilight.json — original TALLAH order, defaults and visibility (Task 10)', () => {
  const ids = settings.map((s) => s.id);
  const before = (a: string, b: string) => ids.indexOf(a) < ids.indexOf(b);

  it('keeps the original group order: header → product cards → footer/newsletter → cart → product page → popups', () => {
    expect(before('header_options', 'static-line1')).toBe(true);
    expect(before('static-line3', 'product_card_options')).toBe(true);
    expect(before('cart_settings', 'footer_logo_size')).toBe(true);
    expect(before('footer_logo_size', 'cart_settings2')).toBe(true);
    expect(before('cart_settings2', 'features_switch_cart')).toBe(true);
    expect(before('features_switch_cart', 'cart_page_features')).toBe(true);
    expect(before('cart_page_features', 'sticky_cart_button')).toBe(true);
    expect(before('sticky_cart_button', 'enable_side_cart')).toBe(true);
    expect(before('single-options', 'checkout_enable')).toBe(true);
    expect(before('gallery-options', 'slider_background_size')).toBe(true);
    expect(before('static-line2', 'img_in_single')).toBe(true);
    expect(before('image_collection', 'product-features-options')).toBe(true);
    expect(before('selling-points-view', 'static-line5')).toBe(true);
    expect(before('static-line5', 'newsletter_url_product')).toBe(true);
    expect(before('popup-options', 'collection_sp_view_modal')).toBe(true);
    expect(ids[0]).toBe('arabybrand-support-card');
  });

  it("restores the original section titles instead of the 'line' placeholders", () => {
    for (const id of ['static-line1', 'static-line3', 'static-line5']) {
      expect(byId(id)).toMatchObject({ type: 'static' });
      expect(JSON.stringify(byId(id))).toContain('flex-center');
    }
  });

  it('keeps the original default for header_is_sticky (on)', () => {
    expect(byId('header_is_sticky')).toMatchObject({ value: true, selected: true });
  });

  it('keeps the original conditions: no original setting is hidden behind the retired header_layout', () => {
    // These three exist only in this React theme (not in the original TALLAH manifest).
    const reactOnly = ['enable_more_menu', 'header_show_store_info', 'header_store_info_home_only'];
    for (const s of settings.filter((f) => !reactOnly.includes(f.id))) {
      const hit = (s.conditions ?? []).some((c) => c.id === 'header_layout');
      expect(hit, s.id).toBe(false);
    }
  });

  it('keeps the square-photos dropdown options in the original order (cover, contain)', () => {
    const f = byId('squar_photo_bg_image_size') as unknown as {
      options: { value: string }[];
      selected: { value: string }[];
    };
    expect(f.options.map((o) => o.value)).toEqual(['cover', 'contain']);
    expect(f.selected[0].value).toBe('contain');
  });
});

describe('readCartFeatures', () => {
  it('reads bare and collection-prefixed fields, per language, capped at 3', () => {
    const items = [
      { cart_features_content: { ar: 'أ', en: 'A' }, cart_features_link: 'https://x.sa' },
      { 'cart_page_features.cart_features_content': 'B' },
      { cart_features_content: 'C' },
      { cart_features_content: 'D' },
    ];
    expect(readCartFeatures(items, 'ar').map((f) => f.content)).toEqual(['أ', 'B', 'C']);
    expect(readCartFeatures(items, 'en')[0]).toMatchObject({ content: 'A', href: 'https://x.sa' });
  });

  it('drops empty rows and unsafe links, and tolerates a missing value', () => {
    expect(readCartFeatures(undefined, 'ar')).toEqual([]);
    expect(
      readCartFeatures([{}, { cart_features_content: 'x', cart_features_link: 'javascript:1' }], 'ar')
    ).toEqual([{ image: '', content: 'x', href: '' }]);
  });
});

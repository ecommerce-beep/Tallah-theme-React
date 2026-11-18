// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type Rule } from 'postcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));

async function rules(): Promise<Rule[]> {
  const { css } = sass.compile(`${themeRoot}app/styles/04-components/tallah-product-card.scss`);
  const root = (await postcss().process(css, { from: undefined })).root;
  const out: Rule[] = [];
  root.walkRules((rule) => void out.push(rule));
  return out;
}

const decl = (rule: Rule | undefined, prop: string) => {
  let value: string | undefined;
  rule?.walkDecls(prop, (d) => void (value = `${d.value}${d.important ? ' !important' : ''}`));
  return value;
};

const find = async (selectorEnd: string) =>
  (await rules()).find((r) => r.selector.endsWith(selectorEnd) && r.selector.includes('.tallah-card'));

describe('TALLAH product card colors (the Twig AR_product_card.scss)', () => {
  it('leaves the title in the card text color: the Twig defines no `graytext`', async () => {
    const title = await find('.s-product-card-content-title');
    expect(decl(title, 'color')).toBe('inherit');
  });

  it('prints a discounted price in the text color, with the Twig `!important` that beats the red rule', async () => {
    const price = await find('.s-product-card-sale-price h4');
    expect(decl(price, 'color')).toBe('var(--color-font) !important');
  });

  it('draws the promotion label as a square tag in the page background with a fixed #C70036 text', async () => {
    const badge = await find('.s-product-card-promotion-title');
    expect(decl(badge, 'background-color')).toBe('var(--color-background)');
    expect(decl(badge, 'color')).toBe('#c70036');
    expect(decl(badge, 'border-radius')).toBe('0');
    expect(decl(badge, 'padding')).toBe('8px 10px');
    expect(decl(badge, 'font-size')).toBe('12px');
  });

  it('draws the old price at full opacity in a 75% tint, since the shared 50% opacity left it at 1.72:1', async () => {
    const old = (await rules()).find((r) => r.selector.endsWith('.s-product-card-sale-price span'));
    expect(decl(old, 'opacity')).toBe('1');
    expect(decl(old, 'color')).toBe('color-mix(in srgb, var(--color-font) 75%, transparent)');
    expect(decl(old, 'text-decoration')).toBe('line-through');
  });

  it('reveals the hover buttons for keyboard focus too, without a mouse click leaving them showing', async () => {
    const reveal = (await rules()).find(
      (r) => r.selector.includes(':hover .flex-action') && r.selector.includes(':has(:focus-visible) .flex-action')
    );
    expect(decl(reveal, 'opacity')).toBe('1');
    expect(decl(reveal, 'top')).toBe('5px');
    expect(reveal?.selector).not.toContain(':focus-within');
  });
});

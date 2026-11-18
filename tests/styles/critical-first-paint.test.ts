// @vitest-environment node
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type AtRule, type Rule } from 'postcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));

/** The selectors (and their `@apply`s) of a critical sheet, as the inline first-paint CSS carries them. */
async function compile(file: string): Promise<Rule[]> {
  const { css } = sass.compile(`${themeRoot}app/styles/${file}`, { silenceDeprecations: ['import'] });
  const root = (await postcss().process(css, { from: undefined })).root;
  const out: Rule[] = [];
  root.walkRules((rule) => void out.push(rule));
  return out;
}

const has = (rules: Rule[], selector: string) => rules.some((r) => r.selector.split(',').map((s) => s.trim()).includes(selector));

const applies = (rules: Rule[], selector: string): string[] =>
  rules
    .filter((r) => r.selector.split(',').map((s) => s.trim()).includes(selector))
    .flatMap((r) => {
      const found: string[] = [];
      r.walkAtRules('apply', (a: AtRule) => void found.push(a.params));
      return found;
    });

describe('first-paint (critical) CSS', () => {
  it('keeps the side cart drawer closed from the first paint on the home page', async () => {
    const rules = await compile('critical.scss');
    // Without these the server-rendered drawer, with its coupon field, shows in the page flow until the full sheet loads.
    expect(applies(rules, '.tallah-sidecart').join(' ')).toMatch(/invisible/);
    expect(applies(rules, '.tallah-sidecart').join(' ')).toMatch(/fixed/);
    expect(has(rules, '.tallah-sidecart__panel')).toBe(true);
    expect(has(rules, '.tallah-header__cart-count')).toBe(true);
  });

  it('keeps the side cart drawer closed from the first paint on the product page', async () => {
    const rules = await compile('critical-product.scss');
    expect(applies(rules, '.tallah-sidecart').join(' ')).toMatch(/invisible/);
    expect(has(rules, '.tallah-sidecart__panel')).toBe(true);
  });

  it('sizes the product cards and the home blocks from the first paint', async () => {
    const rules = await compile('critical.scss');
    // The card's image box (without it the image takes its natural height, 1300px+) and the blocks below the hero.
    expect(has(rules, '.tallah-card.s-product-card-vertical .s-product-card-image')).toBe(true);
    expect(has(rules, '.ar-special__banner')).toBe(true);
    expect(has(rules, '.ar-our-products__grid')).toBe(true);
  });

  it('reserves no space for the "buy again" block (it is empty for most customers)', async () => {
    const rules = await compile('critical.scss');
    const rule = rules.find((r) => r.selector === '.s-block--products-slider.s-block--reorder');
    expect(rule).toBeTruthy();
    expect(rule!.toString()).toMatch(/min-height:\s*1px\s*!important/);
    expect(has(rules, '.s-block--products-slider.s-block--reorder > .s-skeleton-products-slider')).toBe(true);
  });

  it('does not define the closed drawer twice (the full sheet imports the shared partial)', async () => {
    const rules = await compile('app.scss');
    expect(rules.filter((r) => r.selector === '.tallah-sidecart')).toHaveLength(1);
  });
});

/** Source files of the components that are server-rendered into the first paint. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : /\.tsx$/.test(name) ? [path] : [];
  });
}

describe('responsive display utilities in first-paint components', () => {
  // The SDK injects its own bare `.hidden` / `.block` after the critical sheet, so on the first paint they beat a
  // `md:block` / `lg:hidden` on the same element, and both variants of a block show (or neither). `max-md:hidden`
  // style variants have no bare class to lose to.
  const bare = /className=["'`{][^"'`]*\b(hidden|block)\b[^"'`]*\b(sm|md|lg|xl):(block|hidden|flex)\b/;
  const reversed = /className=["'`{][^"'`]*\b(sm|md|lg|xl):(block|hidden|flex)\b[^"'`]*\b(hidden|block)\b/;

  it.each([
    ['home', 'app/components/home'],
    ['tallah layout', 'app/components/layout/tallah'],
  ])('pairs no bare hidden/block with a breakpoint display (%s)', (_name, dir) => {
    const offenders = sources(join(themeRoot, dir)).filter((file) => {
      const text = readFileSync(file, 'utf8');
      return bare.test(text) || reversed.test(text);
    });
    expect(offenders).toEqual([]);
  });
});

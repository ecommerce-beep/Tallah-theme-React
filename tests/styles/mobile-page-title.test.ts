// @vitest-environment node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type AtRule, type Root, type Rule } from 'postcss';
import tailwindcss from 'tailwindcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));
const tailwindConfig = createRequire(import.meta.url)(`${themeRoot}tailwind.config.cjs`);

async function compile(): Promise<Root> {
  const { css } = sass.compile(`${themeRoot}app/styles/04-components/mobile-page-title.scss`);
  const result = await postcss([
    tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] }),
  ]).process(css, { from: undefined });
  return result.root;
}

function rulesFor(root: Root, selector: string): Rule[] {
  const rules: Rule[] = [];
  root.walkRules((rule) => {
    if (rule.selectors.includes(selector)) rules.push(rule);
  });
  return rules;
}

function decl(rule: Rule, prop: string): string | undefined {
  let value: string | undefined;
  rule.walkDecls(prop, (d) => {
    value = d.value;
  });
  return value;
}

describe('account pages on phones', () => {
  // CustomerLayout's own `.main-content > h1` repeats the title bar's text.
  // `.profile-header` is rendered by that layout only; the engine sets no
  // `customer-*` body class on the /account/* routes to key off instead.
  const selector = 'body:has(.profile-header) .main-content > h1';

  it("hides the page's own heading below md, where the title bar names the page", async () => {
    const [rule] = rulesFor(await compile(), selector);
    expect(rule).toBeDefined();
    expect(decl(rule, 'display')).toBe('none');
    expect((rule.parent as AtRule).params).toBe('(max-width: 767px)');
  });

  it('keeps the heading from md up, where there is no title bar', async () => {
    // Every rule anywhere in the file that hides an account heading, under any
    // selector: each must be scoped to phones, or desktop would lose it too.
    const hiding: Rule[] = [];
    (await compile()).walkRules((rule) => {
      if (
        rule.selectors.some((sel) => /\.main-content\s*>\s*h1/.test(sel)) &&
        decl(rule, 'display') === 'none'
      ) {
        hiding.push(rule);
      }
    });
    expect(hiding.length).toBeGreaterThan(0);
    for (const rule of hiding) {
      expect(rule.parent?.type).toBe('atrule');
      expect((rule.parent as AtRule).params).toBe('(max-width: 767px)');
    }
  });
});

describe('breadcrumbs on phones', () => {
  async function compileFile(file: string): Promise<Root> {
    const { css } = sass.compile(`${themeRoot}app/styles/04-components/${file}`);
    const result = await postcss([
      tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] }),
    ]).process(css, { from: undefined });
    return result.root;
  }

  it('hides the breadcrumb bar below md, where the title bar names the page', async () => {
    const rules = rulesFor(await compileFile('breadcrumb.scss'), '.breadcrumbs').filter(
      (rule) => decl(rule, 'display') === 'none'
    );
    expect(rules).toHaveLength(1);
    expect((rules[0].parent as AtRule).params).toBe('(max-width: 767px)');
  });

  it('gives the title bar no bottom margin, so the page content sits right under it', async () => {
    const margins: string[] = [];
    (await compile()).walkRules((rule) => {
      if (!rule.selectors.some((sel) => sel.endsWith('.mobile-page-title'))) return;
      const value = decl(rule, 'margin-bottom') ?? decl(rule, 'margin');
      if (value !== undefined) margins.push(value);
    });
    expect(margins).toEqual([]);
  });
});

describe('category toolbar (TALLAH product/index.twig)', () => {
  async function listRoot(): Promise<Root> {
    const { css } = sass.compile(`${themeRoot}app/styles/04-components/product-list.scss`);
    return (
      await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] })]).process(css, {
        from: undefined,
      })
    ).root;
  }

  it('shows the filter trigger below lg and hides it from lg up', async () => {
    const root = await listRoot();
    const rules = rulesFor(root, '.AR-index .filters-trigger');
    const base = rules.find((r) => r.parent?.type === 'root');
    const desktop = rules.find((r) => (r.parent as AtRule).params === '(min-width: 1024px)');
    expect(decl(base as Rule, 'display')).toBe('inline-flex');
    expect(decl(desktop as Rule, 'display')).toBe('none');
  });

  it('switches the phone grid between one and two columns', async () => {
    const root = await listRoot();
    const [one] = rulesFor(root, '.s-products-list-wrapper.s-products-list-vertical-cards.tallah-list-grid.tallah-list-grid--one-column');
    const [two] = rulesFor(root, '.s-products-list-wrapper.s-products-list-vertical-cards.tallah-list-grid.tallah-list-grid--two-columns');
    expect((one.parent as AtRule).params).toBe('(max-width: 1023px)');
    expect(decl(one, 'grid-template-columns')).toBe('repeat(1, minmax(0, 1fr))');
    expect(decl(two, 'grid-template-columns')).toBe('repeat(2, minmax(0, 1fr))');
  });
});

describe('header search on phones', () => {
  it("is hidden below md, where the bottom bar has its own search tab", async () => {
    const { css } = sass.compile(`${themeRoot}app/styles/04-components/header.scss`);
    const root = (
      await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] })]).process(css, {
        from: undefined,
      })
    ).root;

    const rules = rulesFor(root, '.header-action.site-header__search');
    expect(rules).toHaveLength(1);
    expect(decl(rules[0], 'display')).toBe('none');
    expect((rules[0].parent as AtRule).params).toBe('(max-width: 767px)');
  });
});

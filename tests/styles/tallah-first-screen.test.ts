// @vitest-environment node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type AtRule, type Root, type Rule } from 'postcss';
import tailwindcss from 'tailwindcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));
const tailwindConfig = createRequire(import.meta.url)(`${themeRoot}tailwind.config.cjs`);

async function compile(file: string): Promise<Root> {
  const { css } = sass.compile(`${themeRoot}app/styles/${file}`);
  const result = await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] })]).process(css, {
    from: undefined,
  });
  return result.root;
}

/** Sass only: the critical files carry `@config`, which Tailwind resolves at build time. */
async function compileSassOnly(file: string): Promise<Root> {
  const { css } = sass.compile(`${themeRoot}app/styles/${file}`);
  return postcss.parse(css);
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** `prop` declared by rules matching `selector`, with the media query (or '') each sits in. */
function declsFor(root: Root, selector: string, prop: string): { media: string; value: string }[] {
  const found: { media: string; value: string }[] = [];
  root.walkRules((rule: Rule) => {
    if (!rule.selectors.map(norm).includes(selector)) return;
    rule.walkDecls(prop, (decl) => {
      const parent = rule.parent;
      const media = parent && parent.type === 'atrule' ? norm((parent as AtRule).params) : '';
      found.push({ media, value: `${norm(decl.value)}${decl.important ? ' !important' : ''}` });
    });
  });
  return found;
}

// The server paints skeletons, and the engine drops a block's reserved height on hydration; each placeholder must
// already be the size of what replaces it, or the page jumps (the layout shifts of the performance audit).
describe('home hero placeholder', () => {
  const hero = '.s-block--AR-Hero-section .s-skeleton-slider';

  it('is as tall as the slide: 100svh on phones, 90vh from md', async () => {
    const root = await compile('04-components/tallah-hero-first-screen.scss');
    expect(declsFor(root, hero, 'height')).toEqual([
      { media: '', value: '100svh' },
      { media: '(min-width: 768px)', value: '90vh' },
    ]);
    expect(declsFor(root, '.s-block--AR-Hero-section .s-skeleton-slider-image', 'height')).toEqual([
      { media: '', value: '100% !important' },
    ]);
  });

  it('is in the critical home CSS, so the first paint has it', async () => {
    const root = await compileSassOnly('critical.scss');
    expect(declsFor(root, hero, 'height')).toHaveLength(2);
    expect(declsFor(root, 'main .s-block.s-block--AR-Hero-section', 'margin-top')).toContainEqual({
      media: '',
      value: '0',
    });
  });

  it('is in the full stylesheet too', async () => {
    const root = await compile('04-components/tallah-home-sliders.scss');
    expect(declsFor(root, hero, 'height')).toHaveLength(2);
  });

  // The first banner is server-rendered over the skeleton (ArHeroSection), so its own rules must be in the first paint.
  it('carries the rules of the first banner copy in the critical CSS: its box, its button and its position', async () => {
    const root = await compileSassOnly('critical.scss');
    const banner = '.AR-slider-hero-section .ar-hero-slider__banner';
    expect(declsFor(root, banner, 'height')).toEqual([
      { media: '', value: '100svh' },
      { media: '(min-width: 768px)', value: '90vh' },
    ]);
    expect(declsFor(root, banner, 'display')).toEqual([{ media: '', value: 'flex' }]);
    expect(declsFor(root, '.ar-btn', 'background-color')).toHaveLength(1);
    expect(declsFor(root, '.ar-hero-poster', 'position')).toEqual([{ media: '', value: 'absolute' }]);
  });

  it('draws the image of the first banner copy as an <img> over a slide with no background of its own', async () => {
    const root = await compileSassOnly('critical.scss');
    expect(declsFor(root, '.AR-slider-hero-section .ar-hero-poster .ar-hero-slider__banner', 'background')).toEqual([
      { media: '', value: 'none' },
    ]);
    expect(declsFor(root, '.ar-hero-poster__img', 'object-fit')).toEqual([{ media: '', value: 'cover' }]);
    expect(declsFor(root, '.ar-hero-poster__media', 'position')).toEqual([{ media: '', value: 'absolute' }]);
    // the phone's dark layer, drawn over the image
    expect(
      declsFor(root, '.ar-hero-poster .ar-hero-slider__banner--scrim::after', 'background')
    ).toEqual([{ media: '(max-width: 767px)', value: 'rgba(0, 0, 0, 0.4)' }]);
  });

  it('emits each of those rules once in the full stylesheet', async () => {
    const root = await compile('app.scss');
    expect(declsFor(root, '.AR-slider-hero-section .ar-hero-slider__banner', 'display')).toHaveLength(1);
    expect(declsFor(root, '.ar-btn', 'background-color')).toHaveLength(1);
  }, 60_000);
});

describe('product page placeholders', () => {
  const image = '.tallah-pdp .product-gallery .s-skeleton-slider-image';
  const thumbs = '.tallah-pdp .product-gallery--thumbs .s-skeleton-slider';

  it('gives the gallery skeleton and the poster the 674px frame', async () => {
    const root = await compile('04-components/tallah-pdp-first-screen.scss');
    expect(declsFor(root, image, 'height')).toEqual([{ media: '', value: '674px !important' }]);
    expect(declsFor(root, '.tallah-pdp .product-gallery .product-gallery__poster', 'height')).toEqual([
      { media: '', value: '674px' },
    ]);
  });

  it('reserves the thumbnail row only below lg, as wide as one thumb plus the 16px gap', async () => {
    const root = await compile('04-components/tallah-pdp-first-screen.scss');
    expect(declsFor(root, thumbs, 'margin-bottom')).toEqual([
      { media: '(max-width: 1023px)', value: 'calc(25% + 10px)' },
      { media: '(min-width: 640px) and (max-width: 1023px)', value: 'calc(16.667% + 9.333px)' },
    ]);
  });

  it('hides the installment placeholder only under the wrapper that marks "no providers"', async () => {
    const root = await compile('04-components/tallah-pdp-first-screen.scss');
    expect(
      declsFor(root, '.tallah-pdp .product-details__installment--none .s-skeleton-card', 'display')
    ).toEqual([{ media: '', value: 'none' }]);
    expect(declsFor(root, '.tallah-pdp .product-details__installment', 'display')).toEqual([
      { media: '', value: 'contents' },
    ]);
    // no rule hides the placeholder without the marker, and none relies on sibling position
    root.walkRules((rule: Rule) => {
      if (rule.selectors.some((sel) => sel.includes('.s-skeleton-card'))) {
        expect(rule.selector).toContain('--none');
        expect(rule.selector).not.toContain('+');
      }
    });
  });

  it('is in the critical product CSS, together with the TALLAH header', async () => {
    const root = await compileSassOnly('critical-product.scss');
    expect(declsFor(root, image, 'height')).toHaveLength(1);
    const selectors: string[] = [];
    root.walkRules((rule: Rule) => void selectors.push(...rule.selectors.map(norm)));
    expect(selectors).toContain('.tallah-header__nav');
  });

  it('is in the full stylesheet too', async () => {
    const root = await compile('04-components/tallah-pdp.scss');
    expect(declsFor(root, image, 'height')).toHaveLength(1);
  });
});

describe('header menu skeleton', () => {
  it('shortens only the skeleton, and leaves the menu container unclipped', async () => {
    const root = await compile('04-components/tallah-header.scss');
    expect(declsFor(root, '.tallah-topnav__menu', 'overflow')).toEqual([]);
    expect(declsFor(root, '.tallah-topnav__menu', 'max-height')).toEqual([]);
    expect(
      declsFor(root, '.tallah-topnav__menu .s-skeleton-menu-columns .s-skeleton-wrapper', 'height')
    ).toEqual([{ media: '', value: '0.75rem !important' }]);
  });
});

describe('header search skeleton', () => {
  it('takes no room in the header while the modal loads', async () => {
    const root = await compile('04-components/tallah-header.scss');
    expect(declsFor(root, '.tallah-header .s-skeleton-search', 'display')).toEqual([{ media: '', value: 'none' }]);
  });
});

describe('home products placeholder', () => {
  const grid = '.ar-our-products__grid';
  const image = '.ar-our-products__skeleton-image';

  it('lays the placeholder out in the loaded grid: 2 columns, 3 from md, 4 from lg', async () => {
    const root = await compile('04-components/tallah-products-first-screen.scss');
    expect(declsFor(root, grid, 'grid-template-columns')).toEqual([
      { media: '', value: 'repeat(2, minmax(0, 1fr))' },
      { media: '(min-width: 768px)', value: 'repeat(3, minmax(0, 1fr))' },
      { media: '(min-width: 1024px)', value: 'repeat(4, minmax(0, 1fr))' },
    ]);
  });

  it('gives each placeholder the product card image height', async () => {
    const root = await compile('04-components/tallah-products-first-screen.scss');
    const card = await compile('04-components/tallah-product-card.scss');
    const cardHeight = declsFor(card, '.tallah-card.s-product-card-vertical .s-product-card-image', 'height');
    expect(declsFor(root, image, 'height')).toEqual([{ media: '', value: cardHeight[0].value }]);
  });

  it('is in the critical home CSS and the full stylesheet, once each', async () => {
    const critical = await compileSassOnly('critical.scss');
    expect(declsFor(critical, image, 'height')).toHaveLength(1);
    expect(declsFor(critical, grid, 'grid-template-columns')).toHaveLength(3);
    const full = await compile('04-components/tallah-home.scss');
    expect(declsFor(full, grid, 'grid-template-columns')).toHaveLength(3);
  });
});

describe('critical CSS leaves out the engine header', () => {
  const selectors = (root: Root) => {
    const found: string[] = [];
    root.walkRules((rule: Rule) => void found.push(...rule.selectors.map(norm)));
    return found;
  };

  // `TallahHeader` is the header the theme renders; the engine's `.site-header*` rules (about 40KB) match nothing in the
  // first paint, so they are not inlined, and the full stylesheet still carries them.
  it('has no `.site-header` rule in the home or the product critical CSS, but keeps the TALLAH header', async () => {
    for (const file of ['critical.scss', 'critical-product.scss']) {
      const found = selectors(await compileSassOnly(file));
      expect(found.some((s) => s.includes('.site-header'))).toBe(false);
      expect(found).toContain('.tallah-header__nav');
    }
  });

  it('still has them in the full stylesheet', async () => {
    expect(selectors(await compile('app.scss')).some((s) => s.includes('.site-header'))).toBe(true);
  }, 60_000);
});

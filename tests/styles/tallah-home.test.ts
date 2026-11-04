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
  const { css } = sass.compile(`${themeRoot}app/styles/04-components/${file}`);
  const result = await postcss([tailwindcss({ ...tailwindConfig, content: [{ raw: '' }] })]).process(css, {
    from: undefined,
  });
  return result.root;
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

/** `prop` declared by rules matching `selector`, with the media query (or '') each sits in. */
function declsFor(root: Root, selector: string, prop: string): { media: string; value: string }[] {
  const found: { media: string; value: string }[] = [];
  root.walkRules((rule: Rule) => {
    if (!rule.selectors.includes(selector)) return;
    rule.walkDecls(prop, (decl) => {
      const parent = rule.parent;
      const media = parent && parent.type === 'atrule' ? norm((parent as AtRule).params) : '';
      found.push({ media, value: norm(decl.value) });
    });
  });
  return found;
}

describe('mobile bottom bar clearance', () => {
  it('is zero everywhere except where the bar shows: the exact complement of its `md:hidden`', async () => {
    const bar = await compile('mobile-bottom-bar.scss');
    const clearance = declsFor(bar, ':root', '--mobile-bottom-bar-clearance');
    expect(clearance).toEqual([
      { media: '', value: '0px' },
      { media: 'not all and (min-width: 768px)', value: 'calc(76px + var(--safe-bottom))' },
    ]);

    // The bar itself is hidden from that same width up (`md:hidden`).
    const hidden = declsFor(bar, '.mobile-bottom-bar', 'display');
    expect(hidden).toContainEqual({ media: '(min-width: 768px)', value: 'none' });
  });

  it('is read by the AR-Hero-2 button without any breakpoint of its own, as a lift that leaves the text alone', async () => {
    const home = await compile('tallah-home.scss');
    expect(declsFor(home, '.ar-hero2__banner .ar-hero2__button', 'transform')).toEqual([
      { media: '', value: 'translateY(calc(-1 * var(--mobile-bottom-bar-clearance, 0px)))' },
    ]);
    expect(declsFor(home, '.ar-hero2__banner', 'padding-bottom')).toEqual([]);
  });
});

describe('AR-Hero-section slide layout', () => {
  it('keeps every slide a flex column, so a `button_bottom` CTA keeps its own width (Swiper sets `display: block` on slides)', async () => {
    const sliders = await compile('tallah-home-sliders.scss');
    const selector = '.AR-slider-hero-section .ar-hero-slider__banner';
    expect(declsFor(sliders, selector, 'display')).toEqual([{ media: '', value: 'flex' }]);
    expect(declsFor(sliders, selector, 'flex-direction')).toEqual([{ media: '', value: 'column' }]);
  });
});

describe('AR-Hero-section on phones (the full-width hero)', () => {
  const hero = '.AR-slider-hero-section';

  it("drops the engine carousel's side padding and negative margin, so a slide is as wide as the phone", async () => {
    const root = await compile('tallah-home-sliders.scss');
    const selector = `${hero} .carousel-slider .swiper`;
    expect(declsFor(root, selector, 'padding-inline')).toEqual([{ media: '', value: '0' }]);
    expect(declsFor(root, selector, 'margin-inline')).toEqual([{ media: '', value: '0' }]);
  });

  it('starts at the top of the page under the header: no margin from the block wrapper', async () => {
    const root = await compile('tallah-home-sliders.scss');
    expect(declsFor(root, 'main .s-block.s-block--AR-Hero-section', 'margin-top')).toEqual([
      { media: '', value: '0' },
    ]);
  });

  it('pads the slide the same above and below (py-16), so the text stays centred as in the Twig', async () => {
    const root = await compile('tallah-home-sliders.scss');
    expect(declsFor(root, `${hero} .ar-hero-slider__banner`, 'padding-block')).toEqual([
      { media: '', value: '4rem' },
    ]);
    // the old extra bottom padding for the bar must not come back
    expect(declsFor(root, `${hero} .ar-hero-slider__banner`, 'padding-bottom')).toEqual([]);
  });

  it('lifts only a bottom button above the mobile bottom bar, with a transform that leaves the text alone', async () => {
    const root = await compile('tallah-home-sliders.scss');
    const cta = `${hero} .ar-hero-slider__cta--bottom`;
    expect(declsFor(root, cta, 'transform')).toEqual([
      { media: '', value: 'translateY(calc(-1 * var(--mobile-bottom-bar-clearance, 0px)))' },
    ]);
    expect(declsFor(root, cta, 'margin-bottom')).toEqual([]);
  });

  it('keeps 100svh on phones and 90vh from md', async () => {
    const root = await compile('tallah-home-sliders.scss');
    expect(declsFor(root, `${hero} .ar-hero-slider__banner`, 'height')).toEqual([
      { media: '', value: '100svh' },
      { media: '(min-width: 768px)', value: '90vh' },
    ]);
  });
});

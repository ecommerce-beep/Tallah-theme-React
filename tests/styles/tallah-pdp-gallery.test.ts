// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type Rule } from 'postcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));

async function rules(): Promise<Rule[]> {
  const { css } = sass.compile(`${themeRoot}app/styles/04-components/tallah-pdp.scss`);
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

const find = async (selector: string) => (await rules()).find((r) => r.selector.replace(/\s+/g, ' ') === selector);

describe('TALLAH product gallery (the Twig AR_single.scss)', () => {
  it('frames the image at 674px with no container border or rounding', async () => {
    const container = await find('.tallah-pdp salla-slider.details-slider .s-slider-container');
    expect(decl(container, 'height')).toBe('674px !important');
    expect(decl(container, 'border-radius')).toBe('0');
    expect(decl(container, 'border')).toBe('0');
  });

  it('rounds the slide by 6px (Tailwind rounded-md), not the theme default', async () => {
    const slide = await find('.tallah-pdp salla-slider.details-slider .swiper-slide');
    expect(decl(slide, 'height')).toBe('674px !important');
    expect(decl(slide, 'border-radius')).toBe('0.375rem');
  });

  it('keeps the thumbnails square-cornered', async () => {
    const thumb = await find('.tallah-pdp salla-slider.details-slider .s-slider-thumbs .s-slider-thumbs-container .swiper-slide');
    expect(decl(thumb, 'border-radius')).toBe('0');
  });
});

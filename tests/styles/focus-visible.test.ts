// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import * as sass from 'sass';
import postcss, { type Rule } from 'postcss';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));

async function rules(): Promise<Rule[]> {
  const { css } = sass.compile(`${themeRoot}app/styles/02-generic/reset.scss`);
  const root = (await postcss().process(css, { from: undefined })).root;
  const out: Rule[] = [];
  root.walkRules((rule) => void out.push(rule));
  return out;
}

const decl = (rule: Rule, prop: string) => {
  let value: string | undefined;
  rule.walkDecls(prop, (d) => void (value = d.value));
  return value;
};

describe('keyboard focus indicator (TALLAH reset.scss)', () => {
  it('draws a 2px primary outline with a white gap on :focus-visible, for the interactive controls', async () => {
    const rule = (await rules()).find((r) => r.selector.includes(':focus-visible'));
    expect(rule).toBeTruthy();
    for (const control of ['a', 'button', 'summary', '[role=button]']) {
      expect(rule!.selector).toContain(control);
    }
    expect(decl(rule!, 'outline')).toBe('2px solid var(--color-primary)');
    expect(decl(rule!, 'outline-offset')).toBe('2px');
    expect(decl(rule!, 'box-shadow')).toBe('0 0 0 2px #fff');
  });

  it('keeps the rule weak (:where) so components with their own focus styles still win', async () => {
    const rule = (await rules()).find((r) => r.selector.includes(':focus-visible'))!;
    expect(rule.selector.startsWith(':where(')).toBe(true);
  });

  it('does not strip the outline of a focused link (that would beat the indicator)', async () => {
    const link = (await rules()).find((r) => r.selector === 'a:focus');
    expect(link && decl(link, 'outline')).toBeUndefined();
  });
});

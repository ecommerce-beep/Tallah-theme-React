// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const themeRoot = fileURLToPath(new URL('../../', import.meta.url));

describe('desktop navigation tabs (tallah-header.scss)', () => {
  it('does not `@apply cursor-pointer`: its `* { pointer-events: none }` made the links unclickable', () => {
    const scss = readFileSync(`${themeRoot}app/styles/04-components/tallah-header.scss`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const block = /\.tallah-menu__tab\s*\{([^}]*)\}/.exec(scss)?.[1] ?? '';
    expect(block).not.toMatch(/@apply[^;]*cursor-pointer/);
    expect(block).toMatch(/cursor:\s*pointer/);
  });
});

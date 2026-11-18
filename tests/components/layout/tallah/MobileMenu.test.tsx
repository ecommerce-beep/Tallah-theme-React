import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { MobileMenu } from '../../../../app/components/layout/tallah/MobileMenu';

interface Node {
  id: number;
  title: string;
  url: string;
  image?: string | null;
  children?: Node[];
}

const state = { items: [] as Node[] };

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: state.items }) }));
vi.mock('@salla.sa/twilight-theme-engine/api/menu', () => ({
  menu: { queries: { header: () => ({ queryKey: ['menu'] }) } },
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('../../../../app/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));
vi.mock('../../../../app/hooks/useDialogFocus', () => ({ useDialogFocus: vi.fn() }));

const leaf = (id: number, title: string, image?: string): Node => ({ id, title, url: `/c${id}`, image });

beforeEach(() => {
  state.items = [
    {
      id: 1,
      title: 'Women',
      url: '/women',
      children: [
        { ...leaf(11, 'Dresses'), children: [leaf(111, 'Maxi', 'a.png'), leaf(112, 'Mini')] },
        leaf(12, 'Sale'),
      ],
    },
    { id: 2, title: 'Men', url: '/men' },
  ];
});

const root = (c: HTMLElement) => c.querySelector('[data-testid="tallah-mobile-menu"]') as HTMLElement;
const rowLinks = (c: HTMLElement) => [...c.querySelectorAll('.tallah-mobile-menu__row > a')] as HTMLAnchorElement[];

describe('MobileMenu', () => {
  it('is inert while closed and open when asked', () => {
    const closed = render(<MobileMenu open={false} onClose={() => {}} />);
    expect(root(closed.container).hasAttribute('inert')).toBe(true);
    expect(root(closed.container).classList.contains('is-open')).toBe(false);

    const open = render(<MobileMenu open onClose={() => {}} />);
    expect(root(open.container).hasAttribute('inert')).toBe(false);
    expect(root(open.container).classList.contains('is-open')).toBe(true);
  });

  it('lists every root link of the store menu, one per row, with the store’s own titles and urls', () => {
    const { container } = render(<MobileMenu open onClose={() => {}} />);
    const roots = [...container.querySelectorAll('.tallah-mobile-menu__content > ul > li > .tallah-mobile-menu__row > a')];
    expect(roots.map((a) => a.textContent)).toEqual(['Women', 'Men']);
    expect(roots.map((a) => a.getAttribute('href'))).toEqual(['/women', '/men']);
    // No tabs any more: nothing is laid out in one horizontal row.
    expect(container.querySelector('[role="tablist"]')).toBeNull();
  });

  it('gives only an item with children a toggle, collapsed at first', () => {
    const { container } = render(<MobileMenu open onClose={() => {}} />);
    const toggles = [...container.querySelectorAll('.tallah-mobile-menu__toggle')] as HTMLElement[];
    // Women and Dresses have children; Men and Sale do not.
    expect(toggles).toHaveLength(2);
    expect(toggles[0].getAttribute('aria-expanded')).toBe('false');
    expect(toggles[0].getAttribute('aria-label')).toBe('Show or hide Women sub-categories');
    const panel = container.querySelector(`[id="${toggles[0].getAttribute('aria-controls')}"]`) as HTMLElement;
    expect(panel.hidden).toBe(true);
  });

  it('opens and closes the children under their parent, nested, without leaving the page', () => {
    const onClose = vi.fn();
    const { container } = render(<MobileMenu open onClose={onClose} />);
    const [women, dresses] = [...container.querySelectorAll('.tallah-mobile-menu__toggle')] as HTMLElement[];
    const panelOf = (t: HTMLElement) => container.querySelector(`[id="${t.getAttribute('aria-controls')}"]`) as HTMLElement;

    fireEvent.click(women);
    expect(women.getAttribute('aria-expanded')).toBe('true');
    expect(panelOf(women).hidden).toBe(false);
    expect([...panelOf(women).querySelectorAll(':scope > ul > li > .tallah-mobile-menu__row > a')].map((a) => a.textContent)).toEqual([
      'Dresses',
      'Sale',
    ]);
    expect(panelOf(dresses).hidden).toBe(true);

    fireEvent.click(dresses);
    expect([...panelOf(dresses).querySelectorAll('a')].map((a) => a.textContent)).toEqual(['Maxi', 'Mini']);
    expect(panelOf(dresses).hidden).toBe(false);

    fireEvent.click(women);
    expect(women.getAttribute('aria-expanded')).toBe('false');
    expect(panelOf(women).hidden).toBe(true);
    // Toggling is not navigation: the menu stayed open.
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps the parent link a real link to its own category', () => {
    const onClose = vi.fn();
    const { container } = render(<MobileMenu open onClose={onClose} />);
    const women = rowLinks(container)[0];
    expect(women.getAttribute('href')).toBe('/women');
    fireEvent.click(women);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.tallah-mobile-menu__toggle')!.getAttribute('aria-expanded')).toBe('false');
  });

  it('collapses everything again when the menu closes', () => {
    const { container, rerender } = render(<MobileMenu open onClose={() => {}} />);
    const women = container.querySelector('.tallah-mobile-menu__toggle')!;
    fireEvent.click(women);
    expect(women.getAttribute('aria-expanded')).toBe('true');
    rerender(<MobileMenu open={false} onClose={() => {}} />);
    rerender(<MobileMenu open onClose={() => {}} />);
    expect(container.querySelector('.tallah-mobile-menu__toggle')!.getAttribute('aria-expanded')).toBe('false');
  });

  it('is a labelled modal dialog around a labelled navigation', () => {
    const { container } = render(<MobileMenu open onClose={() => {}} />);
    const dialog = container.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Menu');
    expect(dialog.querySelector('nav')?.getAttribute('aria-label')).toBe('Menu');
  });

  it('closes from the backdrop, on Escape and when a link is followed', () => {
    const onClose = vi.fn();
    const { container } = render(<MobileMenu open onClose={onClose} />);

    fireEvent.click(container.querySelector('.tallah-mobile-menu__backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(rowLinks(container)[1]);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not listen for Escape while closed', () => {
    const onClose = vi.fn();
    render(<MobileMenu open={false} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

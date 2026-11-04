import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { MegaMenu } from '../../../../app/components/layout/tallah/MegaMenu';

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

const leaf = (id: number, title: string, image?: string): Node => ({
  id,
  title,
  url: `/c${id}`,
  image,
});

beforeEach(() => {
  vi.useFakeTimers();
  state.items = [
    {
      id: 1,
      title: 'Women',
      url: '/women',
      children: [
        { ...leaf(11, 'Dresses'), children: [leaf(111, 'Maxi', 'a.png'), leaf(112, 'Mini', 'b.png')] },
        { ...leaf(12, 'Shoes'), children: [leaf(121, 'Boots')] },
        leaf(13, 'Sale'),
      ],
    },
    { id: 2, title: 'Men', url: '/men' },
    { id: 3, title: 'Soon', url: '#', children: [leaf(31, 'Teaser')] },
  ];
});
afterEach(() => vi.useRealTimers());

const tab = (container: HTMLElement, i: number) =>
  container.querySelectorAll('.tallah-menu__tab')[i] as HTMLElement;
const texts = (nodes: NodeListOf<Element>) => [...nodes].map((n) => n.textContent);

describe('MegaMenu', () => {
  it('lists the header menu as tabs', () => {
    const { container } = render(<MegaMenu advanced={false} />);
    expect(texts(container.querySelectorAll('.tallah-menu__tabs .tallah-menu__link'))).toEqual(['Women', 'Men', 'Soon']);
  });

  it('renders no tabs for an empty menu', () => {
    state.items = [];
    const { container } = render(<MegaMenu advanced={false} />);
    expect(container.querySelector('.tallah-menu__tab')).toBeNull();
  });

  it('keeps a link with no url from navigating', () => {
    const { container } = render(<MegaMenu advanced={false} />);
    const link = tab(container, 2).querySelector('a')!;
    expect(fireEvent.click(link)).toBe(false); // preventDefault was called
  });

  describe('compact dropdown', () => {
    it('opens under the hovered tab and lists its children', () => {
      const { container } = render(<MegaMenu advanced={false} />);
      fireEvent.mouseEnter(tab(container, 0));
      expect(tab(container, 0).classList.contains('is-open')).toBe(true);
      expect(texts(container.querySelectorAll('.tallah-menu__dropdown a'))).toEqual([
        'Dresses',
        'Shoes',
        'Sale',
      ]);
    });

    it('does not open for a tab without children', () => {
      const { container } = render(<MegaMenu advanced={false} />);
      fireEvent.mouseEnter(tab(container, 1));
      expect(container.querySelector('.tallah-menu__dropdown')).toBeNull();
    });

    it('closes shortly after the pointer leaves, but not if it comes back', () => {
      const { container } = render(<MegaMenu advanced={false} />);
      const root = container.querySelector('.tallah-menu')!;
      fireEvent.mouseEnter(tab(container, 0));
      fireEvent.mouseLeave(root);
      act(() => {
        vi.advanceTimersByTime(100);
      });
      fireEvent.mouseEnter(root);
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(container.querySelector('.tallah-menu__dropdown')).not.toBeNull();

      fireEvent.mouseLeave(root);
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(container.querySelector('.tallah-menu__dropdown')).toBeNull();
    });

    it('opens on keyboard focus and closes on Escape, returning focus to the tab', () => {
      const { container } = render(<MegaMenu advanced={false} />);
      const link = tab(container, 0).querySelector('a')!;
      link.focus();
      fireEvent.focus(link);
      expect(container.querySelector('.tallah-menu__dropdown')).not.toBeNull();

      fireEvent.keyDown(link, { key: 'Escape' });
      expect(container.querySelector('.tallah-menu__dropdown')).toBeNull();
      expect(document.activeElement).toBe(link);
    });

    it('tells the header when a panel opens', () => {
      const onOpenChange = vi.fn();
      const { container } = render(<MegaMenu advanced={false} onOpenChange={onOpenChange} />);
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      fireEvent.mouseEnter(tab(container, 0));
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
    });

    it('closes when a link inside it is followed', () => {
      const { container } = render(<MegaMenu advanced={false} />);
      fireEvent.mouseEnter(tab(container, 0));
      fireEvent.click(container.querySelector('.tallah-menu__dropdown a')!);
      expect(container.querySelector('.tallah-menu__dropdown')).toBeNull();
    });
  });

  describe('full-width panel (advanced menu)', () => {
    it('lists the children and shows the first one with its sub-links and images', () => {
      const { container } = render(<MegaMenu advanced />);
      fireEvent.mouseEnter(tab(container, 0));
      const panel = container.querySelector('[data-testid="tallah-mega-panel"]')!;
      expect(texts(panel.querySelectorAll('.tallah-mega__children a'))).toEqual([
        'Dresses',
        'Shoes',
        'Sale',
      ]);
      expect(panel.querySelector('.tallah-mega__title')?.textContent).toBe('Dresses');
      expect(texts(panel.querySelectorAll('.tallah-mega__columns a'))).toEqual(['Maxi', 'Mini']);
      expect(panel.querySelectorAll('.tallah-mega__images img')).toHaveLength(2);
    });

    it('switches to another child on hover, and offers Shop All when it has no sub-links', () => {
      const { container } = render(<MegaMenu advanced />);
      fireEvent.mouseEnter(tab(container, 0));
      const children = container.querySelectorAll('.tallah-mega__children li');

      fireEvent.mouseEnter(children[1]);
      expect(container.querySelector('.tallah-mega__title')?.textContent).toBe('Shoes');
      expect(container.querySelector('.tallah-mega__columns a')?.textContent).toBe('Boots');

      fireEvent.mouseEnter(children[2]);
      expect(container.querySelector('.tallah-mega__columns a')?.textContent).toBe('Shop All');
    });

    it('splits more than ten sub-links into two columns and shows at most three images', () => {
      const many = Array.from({ length: 12 }, (_, i) => leaf(500 + i, `Sub ${i}`, `i${i}.png`));
      state.items = [
        { id: 1, title: 'Big', url: '/big', children: [{ ...leaf(10, 'Parent'), children: many }] },
      ];
      const { container } = render(<MegaMenu advanced />);
      fireEvent.mouseEnter(tab(container, 0));
      expect(container.querySelectorAll('.tallah-mega__columns ul')).toHaveLength(2);
      expect(container.querySelectorAll('.tallah-mega__images img')).toHaveLength(3);
    });
  });

  describe('one-line overflow', () => {
    let rowWidth = 350;

    beforeEach(() => {
      rowWidth = 350;
      state.items = [1, 2, 3, 4, 5].map((n) => ({ id: n, title: `Item ${n}`, url: `/i${n}`, children: n > 3 ? [leaf(900 + n, `Sub ${n}`)] : undefined }));
      // Every tab (and the "More" probe) is 100px wide.
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
        const width = this.classList.contains('tallah-menu__tab') ? 100 : 0;
        return { width, height: 40, top: 0, left: 0, right: width, bottom: 40, x: 0, y: 0 } as DOMRect;
      });
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
        return this.classList.contains('tallah-menu') ? rowWidth : 0;
      });
    });
    afterEach(() => vi.restoreAllMocks());

    it('moves the tabs that do not fit under a last More tab', () => {
      const { container } = render(<MegaMenu advanced={false} />);
      // Room for "More" plus two tabs.
      expect(texts(container.querySelectorAll('.tallah-menu__tabs .tallah-menu__link'))).toEqual(['Item 1', 'Item 2', 'More']);
      fireEvent.mouseEnter(tab(container, 2));
      expect(texts(container.querySelectorAll('.tallah-menu__dropdown a'))).toEqual(['Item 3', 'Item 4', 'Item 5']);
    });

    it('keeps every tab when they all fit', () => {
      rowWidth = 600;
      const { container } = render(<MegaMenu advanced={false} />);
      expect(container.querySelectorAll('.tallah-menu__tabs .tallah-menu__link')).toHaveLength(5);
    });

    it('keeps every tab while the row has no width (below lg the menu is hidden)', () => {
      rowWidth = 0;
      const { container } = render(<MegaMenu advanced={false} />);
      expect(container.querySelectorAll('.tallah-menu__tabs .tallah-menu__link')).toHaveLength(5);
    });

    it('lists the overflow tabs’ own children in the full-width panel', () => {
      const { container } = render(<MegaMenu advanced />);
      fireEvent.mouseEnter(tab(container, 2));
      expect(texts(container.querySelectorAll('.tallah-mega__children a'))).toEqual(['Item 3', 'Item 4', 'Item 5']);
      fireEvent.mouseEnter(container.querySelectorAll('.tallah-mega__children li')[1]);
      expect(texts(container.querySelectorAll('.tallah-mega__columns a'))).toEqual(['Sub 4']);
    });

    it('does not navigate from the More tab', () => {
      const { container } = render(<MegaMenu advanced={false} />);
      expect(fireEvent.click(tab(container, 2).querySelector('a')!)).toBe(false);
    });
  });
});

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

describe('MobileMenu', () => {
  it('is inert while closed and open when asked', () => {
    const closed = render(<MobileMenu open={false} onClose={() => {}} advanced={false} />);
    expect(root(closed.container).hasAttribute('inert')).toBe(true);
    expect(root(closed.container).classList.contains('is-open')).toBe(false);

    const open = render(<MobileMenu open onClose={() => {}} advanced={false} />);
    expect(root(open.container).hasAttribute('inert')).toBe(false);
    expect(root(open.container).classList.contains('is-open')).toBe(true);
  });

  it('shows the first tab’s children, and another tab’s on click', () => {
    const { container, getByRole } = render(<MobileMenu open onClose={() => {}} advanced={false} />);
    const rows = () => [...container.querySelectorAll('.tallah-mobile-menu__row')].map((r) => r.textContent);
    expect(rows()).toEqual(['Dresses', 'Sale']);

    fireEvent.click(getByRole('tab', { name: 'Men' }));
    // A tab with no children gets one "Show all" link to itself.
    expect(rows()).toEqual(['Show all']);
    expect(container.querySelector('a.tallah-mobile-menu__row')?.getAttribute('href')).toBe('/men');
  });

  it('marks the active tab for assistive technology', () => {
    const { getByRole } = render(<MobileMenu open onClose={() => {}} advanced={false} />);
    expect(getByRole('tab', { name: 'Women' }).getAttribute('aria-selected')).toBe('true');
    expect(getByRole('tab', { name: 'Men' }).getAttribute('aria-selected')).toBe('false');
  });

  it('opens a sub-panel for a child with its own children only with the advanced menu', () => {
    const plain = render(<MobileMenu open onClose={() => {}} advanced={false} />);
    expect(plain.container.querySelector('.tallah-mobile-menu__row button')).toBeNull();

    const { container } = render(<MobileMenu open onClose={() => {}} advanced />);
    const arrow = container.querySelector('.tallah-mobile-menu__row button')!;
    const sub = container.querySelector('.tallah-mobile-menu__sub')!;
    expect(sub.classList.contains('is-open')).toBe(false);

    fireEvent.click(arrow);
    expect(sub.classList.contains('is-open')).toBe(true);
    expect([...sub.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Maxi', 'Mini']);
    expect(sub.querySelectorAll('.tallah-mobile-menu__images img')).toHaveLength(1);

    fireEvent.click(sub.querySelector('.tallah-mobile-menu__back')!);
    expect(sub.classList.contains('is-open')).toBe(false);
  });

  it('closes from the backdrop, on Escape and when a link is followed', () => {
    const onClose = vi.fn();
    const { container } = render(<MobileMenu open onClose={onClose} advanced={false} />);

    fireEvent.click(container.querySelector('.tallah-mobile-menu__backdrop')!);
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.click(container.querySelector('.tallah-mobile-menu__row a')!);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not listen for Escape while closed', () => {
    const onClose = vi.fn();
    render(<MobileMenu open={false} onClose={onClose} advanced={false} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

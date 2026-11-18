import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { SearchPanel } from '../../../../app/components/layout/tallah/SearchPanel';

const state = {
  settings: {} as Record<string, unknown>,
  items: [] as { id: number; name: string; url: string; price: number; image?: { url: string } }[],
  queried: [] as { enabled?: boolean; params: unknown }[],
  navigate: vi.fn(),
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { enabled?: boolean; params: unknown }) => {
    state.queried.push({ enabled: options.enabled, params: options.params });
    return options.enabled
      ? { data: { items: state.items }, isFetching: false }
      : { data: undefined, isFetching: false };
  },
}));
vi.mock('@salla.sa/twilight-theme-engine/api/product', () => ({
  product: { queries: { list: (params: unknown) => ({ queryKey: ['p', params], params }) } },
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: state.settings }, store: {} }),
  useNavigate: () => state.navigate,
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: 'ar', t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({
  useMoney: () => ({ format: (n: number) => `${n} SAR` }),
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  vi.useFakeTimers();
  state.settings = {};
  state.queried = [];
  state.navigate.mockClear();
  state.items = [
    { id: 1, name: 'Chair', url: '/p1', price: 100 },
    { id: 2, name: 'Table', url: '/p2', price: 200 },
  ];
});
afterEach(() => vi.useRealTimers());

function setup(open = true) {
  const onClose = vi.fn();
  const inputRef = createRef<HTMLInputElement>();
  const utils = render(<SearchPanel open={open} onClose={onClose} inputRef={inputRef} />);
  const input = utils.container.querySelector('input[role="combobox"]') as HTMLInputElement;
  const type = (value: string) => {
    fireEvent.change(input, { target: { value } });
    act(() => {
      vi.advanceTimersByTime(300);
    });
  };
  return { ...utils, input, onClose, type };
}

describe('SearchPanel', () => {
  it('is inert and hidden from assistive technology while closed', () => {
    const { getByTestId } = setup(false);
    expect(getByTestId('tallah-search-panel').hasAttribute('inert')).toBe(true);
    expect(getByTestId('tallah-search-panel').getAttribute('aria-hidden')).toBe('true');
  });

  it('does not search until something is typed', () => {
    setup();
    expect(state.queried.every((q) => q.enabled === false)).toBe(true);
  });

  it('searches the typed words, debounced, and lists the suggestions with prices', () => {
    const { type, getAllByRole, input } = setup();
    type('chair');
    expect(state.queried.at(-1)).toMatchObject({
      enabled: true,
      params: { source: 'search', keyword: 'chair' },
    });
    const options = getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toContain('Chair');
    expect(options[0].textContent).toContain('100 SAR');
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  it('moves a highlight with the arrow keys, wrapping, and exposes it as the active descendant', () => {
    const { type, input, getAllByRole } = setup();
    type('x');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe(getAllByRole('option')[0].id);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(getAllByRole('option')[0].getAttribute('aria-selected')).toBe('true'); // wrapped

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(getAllByRole('option')[1].getAttribute('aria-selected')).toBe('true');
  });

  it('opens only a suggestion the user highlighted, on Enter', () => {
    const { type, input, getAllByRole } = setup();
    type('x');
    const clicked = vi.fn((event: Event) => event.preventDefault());
    getAllByRole('option').forEach((o) => o.querySelector('a')!.addEventListener('click', clicked));

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(clicked).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(clicked).toHaveBeenCalledTimes(1);
  });

  it('closes the suggestions on the first Escape and the panel on the second', () => {
    const { type, input, queryAllByRole, onClose } = setup();
    type('x');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(queryAllByRole('option')).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fills the field from a trending keyword and searches it', () => {
    state.settings = { 'trending-search-keywords': [{ 'search-keyword': { ar: 'عطر' } }] };
    const { getByText, input } = setup();
    fireEvent.click(getByText('عطر'));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(input.value).toBe('عطر');
    expect(state.queried.at(-1)).toMatchObject({ params: { keyword: 'عطر' } });
  });

  it('shows the popular categories that have an image, linking those with a link', () => {
    state.settings = {
      popular_categories: [
        { popular_categories_image: 'https://x/a.png', popular_categories_link: 'https://x/c1' },
        { popular_categories_image: 'https://x/b.png' },
        { popular_categories_image: '' },
      ],
    };
    const { container } = setup();
    expect(container.querySelectorAll('.tallah-search__popular li')).toHaveLength(2);
    expect(container.querySelectorAll('.tallah-search__popular a')).toHaveLength(1);
  });

  it('shows a no-results message when nothing matches', () => {
    state.items = [];
    const { type, getByRole } = setup();
    type('zzz');
    expect(getByRole('status').textContent).toContain('No results');
  });

  it('clears the field when it closes', () => {
    const { type, input, rerender } = setup();
    type('chair');
    expect(input.value).toBe('chair');
    rerender(<SearchPanel open={false} onClose={() => {}} inputRef={createRef()} />);
    expect(input.value).toBe('');
  });

  describe('submitting the typed query', () => {
    it('goes to the results page with the whole query encoded, from the search button', () => {
      const { type, getByRole, onClose } = setup();
      type('  جاكيت رجالي & نص #1 ');
      fireEvent.click(getByRole('button', { name: 'Search' }));
      expect(state.navigate).toHaveBeenCalledTimes(1);
      expect(state.navigate).toHaveBeenCalledWith(
        '/search?q=' + encodeURIComponent('جاكيت رجالي & نص #1')
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('lets Enter submit the form when no suggestion is highlighted, so the full text is searched', () => {
      const { type, input, container } = setup();
      type('shirt');
      // Enter is not prevented, so the browser submits the form (the button is its default).
      expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(true);
      fireEvent.submit(container.querySelector('form')!);
      expect(state.navigate).toHaveBeenCalledWith('/search?q=shirt');
    });

    it('opens the highlighted suggestion instead of searching, on Enter', () => {
      const { type, input } = setup();
      type('x');
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(fireEvent.keyDown(input, { key: 'Enter' })).toBe(false); // handled; the form does not submit
      expect(state.navigate).not.toHaveBeenCalled();
    });

    it('ignores an empty or whitespace-only query and keeps the focus in the field', () => {
      const { type, input, container, onClose } = setup();
      type('   ');
      fireEvent.submit(container.querySelector('form')!);
      expect(state.navigate).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(input);
    });
  });
});

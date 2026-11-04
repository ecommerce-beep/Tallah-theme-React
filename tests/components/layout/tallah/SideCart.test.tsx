import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, renderHook, waitFor } from '@testing-library/react';
import { SideCart, useSideCart } from '../../../../app/components/layout/tallah/SideCart';

const state = {
  cartId: 7 as number | null,
  cart: null as Record<string, unknown> | null,
  invalidated: [] as unknown[],
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: { queryKey: string[]; enabled?: boolean }) => {
    if (options.enabled === false) return { data: undefined };
    return { data: options.queryKey[0] === 'currentId' ? state.cartId : state.cart };
  },
  useQueryClient: () => ({
    invalidateQueries: (arg: unknown) => {
      state.invalidated.push(arg);
      return Promise.resolve();
    },
  }),
}));
vi.mock('@salla.sa/twilight-theme-engine/api/cart', () => ({
  cart: {
    queries: {
      currentId: () => ({ queryKey: ['currentId'] }),
      detail: (id: number) => ({ queryKey: ['detail', id] }),
    },
  },
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ currency: { symbol: 'SAR' } }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useMoney', () => ({
  useMoney: () => ({ format: (n: number) => `${n} SAR` }),
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('../../../../app/components/cart/CartItem', () => ({
  CartItem: ({ item, onMutated }: { item: { id: string; product_name: string }; onMutated: () => void }) => (
    <div data-testid="cart-item" onClick={onMutated}>
      {item.product_name}
    </div>
  ),
}));
vi.mock('../../../../app/hooks/useScrollLock', () => ({ useScrollLock: vi.fn() }));
vi.mock('../../../../app/hooks/useDialogFocus', () => ({ useDialogFocus: vi.fn() }));

const cart = (over: Record<string, unknown> = {}) => ({
  count: 3,
  items: [
    { id: '1', product_name: 'Chair' },
    { id: '2', product_name: 'Table' },
  ],
  sub_total: 300,
  total: 280,
  total_discount: 20,
  coupon: null,
  free_shipping_bar: null,
  ...over,
});

const sallaCart = { addCoupon: vi.fn(), deleteCoupon: vi.fn() };

beforeEach(() => {
  state.cartId = 7;
  state.cart = cart();
  state.invalidated = [];
  sallaCart.addCoupon.mockReset().mockResolvedValue({});
  sallaCart.deleteCoupon.mockReset().mockResolvedValue({});
  (window as unknown as { salla: unknown }).salla = { cart: sallaCart };
});
afterEach(() => {
  delete (window as unknown as { salla?: unknown }).salla;
});

const setup = (props: Partial<React.ComponentProps<typeof SideCart>> = {}) => {
  const onClose = vi.fn();
  const refresh = vi.fn();
  const utils = render(
    <SideCart open onClose={onClose} cart={state.cart as never} refresh={refresh} {...props} />
  );
  return { ...utils, onClose, refresh };
};

describe('SideCart', () => {
  it('is inert while closed', () => {
    const { getByTestId } = setup({ open: false });
    expect(getByTestId('tallah-sidecart').hasAttribute('inert')).toBe(true);
    expect(getByTestId('tallah-sidecart').classList.contains('is-open')).toBe(false);
  });

  it('lists the rows with the product count, the totals and the two buttons', () => {
    const { getAllByTestId, container, getByText } = setup();
    expect(getAllByTestId('cart-item').map((n) => n.textContent)).toEqual(['Chair', 'Table']);
    expect(container.querySelector('h2')?.textContent).toContain('(3)');
    const totals = container.querySelector('.tallah-sidecart__totals')!.textContent!;
    expect(totals).toContain('300 SAR');
    expect(totals).toContain('20 SAR');
    expect(totals).toContain('280 SAR');
    expect(getByText('View cart').getAttribute('href')).toBe('/cart');
  });

  it('shows an empty state with no totals', () => {
    state.cart = cart({ count: 0, items: [] });
    const { container } = setup();
    expect(container.querySelector('.tallah-sidecart__empty')).not.toBeNull();
    expect(container.querySelector('.tallah-sidecart__totals')).toBeNull();
  });

  it('shows the free-shipping progress, with the amount in the message and no markup', () => {
    state.cart = cart({
      free_shipping_bar: { has_free_shipping: false, percent: 40, remaining: 150, minimum_amount: 250 },
    });
    const { getByTestId, getByRole } = setup();
    expect(getByTestId('tallah-sidecart-shipping').textContent).toContain('150 SAR');
    expect(getByRole('progressbar').getAttribute('aria-valuenow')).toBe('40');
  });

  it('shows the free-shipping message instead of the bar once it is reached', () => {
    state.cart = cart({ free_shipping_bar: { has_free_shipping: true, percent: 100, remaining: 0, minimum_amount: 250 } });
    const { queryByRole, getByTestId } = setup();
    expect(queryByRole('progressbar')).toBeNull();
    expect(getByTestId('tallah-sidecart-shipping').textContent).toContain('free shipping');
  });

  it('applies a coupon through the SDK and refreshes', async () => {
    const { container, refresh } = setup();
    fireEvent.change(container.querySelector('input')!, { target: { value: 'SAVE10' } });
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(sallaCart.addCoupon).toHaveBeenCalledWith('SAVE10'));
    expect(refresh).toHaveBeenCalled();
  });

  it('asks for a code before sending an empty coupon', () => {
    const { container, getByRole } = setup();
    fireEvent.submit(container.querySelector('form')!);
    expect(sallaCart.addCoupon).not.toHaveBeenCalled();
    expect(getByRole('alert')).toBeTruthy();
  });

  it('shows the server message when the coupon is refused', async () => {
    sallaCart.addCoupon.mockRejectedValue({ response: { data: { error: { message: 'Expired coupon' } } } });
    const { container, findByRole } = setup();
    fireEvent.change(container.querySelector('input')!, { target: { value: 'OLD' } });
    fireEvent.submit(container.querySelector('form')!);
    expect((await findByRole('alert')).textContent).toBe('Expired coupon');
  });

  it('removes an applied coupon', async () => {
    state.cart = cart({ coupon: 'SAVE10' });
    const { container, refresh } = setup();
    const input = container.querySelector('input')!;
    expect(input.value).toBe('SAVE10');
    expect(input.disabled).toBe(true);
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(sallaCart.deleteCoupon).toHaveBeenCalledTimes(1));
    expect(refresh).toHaveBeenCalled();
  });

  it('closes from the backdrop, the close button, continue shopping and Escape', () => {
    const { container, getByLabelText, getByText, onClose } = setup();
    fireEvent.click(container.querySelector('.tallah-sidecart__backdrop')!);
    fireEvent.click(getByLabelText('Close'));
    fireEvent.click(getByText('Continue shopping'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it('refreshes after a row changes', () => {
    const { getAllByTestId, refresh } = setup();
    fireEvent.click(getAllByTestId('cart-item')[0]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe('useSideCart', () => {
  type Handler = (...args: unknown[]) => void;
  const bus = () => {
    const handlers = new Map<string, Set<Handler>>();
    return {
      handlers,
      on: (name: string, cb: Handler) => {
        if (!handlers.has(name)) handlers.set(name, new Set());
        handlers.get(name)!.add(cb);
      },
      off: (name: string, cb: Handler) => handlers.get(name)?.delete(cb),
      emit: (name: string, ...args: unknown[]) => handlers.get(name)?.forEach((cb) => cb(...args)),
    };
  };

  it('opens when an item is added, and refetches on cart updates', () => {
    const events = bus();
    (window as unknown as { salla: unknown }).salla = { event: events };
    const { result } = renderHook(() => useSideCart(true));
    expect(result.current.open).toBe(false);

    act(() => events.emit('cart::updated'));
    expect(state.invalidated.length).toBeGreaterThan(0);
    expect(result.current.open).toBe(false);

    act(() => events.emit('cart::item.added'));
    expect(result.current.open).toBe(true);
  });

  it('removes its listeners on unmount', () => {
    const events = bus();
    (window as unknown as { salla: unknown }).salla = { event: events };
    const { unmount } = renderHook(() => useSideCart(true));
    expect([...events.handlers.values()].some((set) => set.size > 0)).toBe(true);
    unmount();
    expect([...events.handlers.values()].every((set) => set.size === 0)).toBe(true);
  });

  it('binds nothing and returns no cart while disabled', () => {
    const events = bus();
    (window as unknown as { salla: unknown }).salla = { event: events };
    const { result } = renderHook(() => useSideCart(false));
    expect(events.handlers.size).toBe(0);
    expect(result.current.cart).toBeNull();
  });
});

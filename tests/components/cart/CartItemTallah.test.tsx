import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { CartItem as CartItemType } from '@salla.sa/twilight-theme-engine/types';
import { CartItem } from '../../../app/components/cart/CartItem';

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useMoney', () => ({
  useMoney: () => ({ format: (amount: unknown) => String(amount) }),
}));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children }: { to: string; children?: unknown }) => (
    <a href={to}>{children as never}</a>
  ),
  Image: ({ alt }: { alt?: string }) => <img alt={alt} />,
}));

const item = {
  id: 1,
  product_id: 2,
  product_name: 'Product',
  product_image: '',
  url: '/p2',
  quantity: 1,
  price: 10,
  product_price: 10,
  total: 10,
  is_available: true,
} as unknown as CartItemType;

describe('CartItem TALLAH card (cart.twig)', () => {
  it('links the name and the image to the product page', () => {
    const { container } = render(<CartItem item={item} />);
    expect(screen.getByRole('heading', { level: 2 }).querySelector('a')?.getAttribute('href')).toBe(
      '/p2'
    );
    expect(container.querySelectorAll('a[href="/p2"]')).toHaveLength(2);
  });

  it('shows the pre-offer, original and current price', () => {
    const sale = {
      ...item,
      offer: { names: 'Buy 2' },
      is_on_sale: true,
      has_discount: true,
      product_price: 30,
      original_price: 25,
      price: 10,
    } as unknown as CartItemType;
    const { container } = render(<CartItem item={sale} />);
    const desktop = container.querySelector('.cart-item__price--desktop')!;
    expect(desktop.querySelector('.item-regular-price')?.textContent).toBe('30');
    expect(desktop.querySelector('.item-original-price')?.textContent).toBe('25');
    expect(desktop.querySelector('.item-price')?.textContent).toBe('10');
    expect(container.querySelector('.cart-item__price--mobile .item-price')?.textContent).toBe(
      '10'
    );
  });

  it('omits the struck-through prices when there is no offer or sale', () => {
    const { container } = render(<CartItem item={item} />);
    expect(container.querySelector('.item-regular-price')).toBeNull();
    expect(container.querySelector('.item-original-price')).toBeNull();
  });

  it('renders the wishlist heart next to the trash button', () => {
    const { container } = render(<CartItem item={item} />);
    expect(container.querySelector('.cart-item__actions .btn--wishlist')).toBeTruthy();
    expect(container.querySelector('.cart-item__actions .cart-item__delete')).toBeTruthy();
  });

  it('shows the out-of-stock label for an unavailable row', () => {
    render(<CartItem item={{ ...item, is_available: false } as CartItemType} />);
    expect(screen.getByText('pages.products.out_of_stock')).toBeTruthy();
  });

  it('shows a hidden-quantity row as a static number and gives a donation no stepper', () => {
    const { container, rerender } = render(
      <CartItem item={{ ...item, is_hidden_quantity: true, quantity: 4 } as CartItemType} />
    );
    expect(screen.getByText('4')).toBeTruthy();
    expect(container.querySelector('.s-quantity-input')).toBeNull();
    rerender(<CartItem item={{ ...item, type: 'donating' } as CartItemType} />);
    expect(container.querySelector('.s-quantity-input')).toBeNull();
  });
});

describe('CartItem failures (automated; not triggerable safely in the browser)', () => {
  const original = (window as { salla?: unknown }).salla;
  afterEach(() => {
    (window as { salla?: unknown }).salla = original;
    vi.useRealTimers();
  });

  it('keeps the row and re-enables the trash button after a failed delete', async () => {
    const deleteItem = vi.fn(() => Promise.reject(new Error('boom')));
    (window as { salla?: unknown }).salla = { cart: { deleteItem } };
    const onMutated = vi.fn();
    const { container } = render(<CartItem item={item} onMutated={onMutated} />);
    const btn = screen.getByLabelText('common.elements.remove') as HTMLButtonElement;
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(deleteItem).toHaveBeenCalledOnce();
    expect(onMutated).not.toHaveBeenCalled();
    expect(container.querySelector('#item-1')).toBeTruthy();
    expect(btn.disabled).toBe(false);
  });

  it('puts the server quantity back after a failed quantity update', async () => {
    vi.useFakeTimers();
    const updateItem = vi.fn(() => Promise.reject(new Error('stock')));
    (window as { salla?: unknown }).salla = { cart: { updateItem } };
    const onMutated = vi.fn();
    render(<CartItem item={item} onMutated={onMutated} />);
    fireEvent.click(screen.getByLabelText('pages.products.quantity +'));
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(updateItem).toHaveBeenCalledOnce();
    expect(onMutated).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLInputElement>('pages.products.quantity').value).toBe('1');
  });

  it('never goes below 1 and disables "−" at the minimum', () => {
    render(<CartItem item={item} />);
    expect(screen.getByLabelText<HTMLButtonElement>('pages.products.quantity -').disabled).toBe(true);
  });

  it('stops "+" at max_quantity', () => {
    render(<CartItem item={{ ...item, quantity: 3, max_quantity: 3 } as CartItemType} />);
    expect(screen.getByLabelText<HTMLButtonElement>('pages.products.quantity +').disabled).toBe(true);
  });
});

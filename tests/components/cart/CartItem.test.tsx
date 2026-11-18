import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  weight_label: '2 kg',
} as unknown as CartItemType;

describe('CartItem weight', () => {
  it("labels the weight with Twig's pages.products.weight key", () => {
    render(<CartItem item={item} />);
    // shown twice, as in cart.twig: under the name on phones, in the controls column from `md`
    expect(screen.getAllByText(/pages\.products\.weight/)).toHaveLength(2);
    expect(screen.getAllByText('2 kg')).toHaveLength(2);
  });
});

describe('CartItem quantity', () => {
  const updateItem = vi.fn(() => Promise.resolve());
  let originalSalla: unknown;

  beforeEach(() => {
    vi.useFakeTimers();
    originalSalla = (window as { salla?: unknown }).salla;
    (window as { salla?: unknown }).salla = { cart: { updateItem } };
  });

  afterEach(() => {
    vi.useRealTimers();
    (window as { salla?: unknown }).salla = originalSalla;
    updateItem.mockClear();
  });

  function renderWithOption(value: string) {
    const { container } = render(<CartItem item={item} />);
    const form = container.querySelector('form')!;
    const option = document.createElement('input');
    option.name = 'options[7]';
    option.required = true;
    option.value = value;
    form.appendChild(option);
    fireEvent.click(screen.getByLabelText('pages.products.quantity +'));
    act(() => void vi.advanceTimersByTime(400));
  }

  it("posts the whole item form, so the item's options go with the new quantity", () => {
    renderWithOption('Red');
    expect(updateItem).toHaveBeenCalledOnce();
    const payload = (updateItem.mock.calls[0] as unknown[])[0] as FormData;
    expect(payload.get('id')).toBe('1');
    expect(payload.get('quantity')).toBe('2');
    expect(payload.get('options[7]')).toBe('Red');
  });

  it('keeps the quantity in the item form, so an option change does not reset it to 1', () => {
    const { container } = render(<CartItem item={{ ...item, quantity: 3 }} />);
    expect(new FormData(container.querySelector('form')!).get('quantity')).toBe('3');
  });

  it('keeps the quantity and sends nothing while a required option is empty', async () => {
    renderWithOption('');
    await act(async () => {});
    expect(updateItem).not.toHaveBeenCalled();
    expect(screen.getByLabelText<HTMLInputElement>('pages.products.quantity').value).toBe('1');
  });
});

describe('CartItem delete', () => {
  const deleteItem = vi.fn(() => Promise.resolve());
  let originalSalla: unknown;

  beforeEach(() => {
    originalSalla = (window as { salla?: unknown }).salla;
    (window as { salla?: unknown }).salla = { cart: { deleteItem } };
  });

  afterEach(() => {
    (window as { salla?: unknown }).salla = originalSalla;
    deleteItem.mockClear();
  });

  it('refetches through onMutated after a delete, keeping the row for the refetch to drop', async () => {
    const onMutated = vi.fn();
    const { container } = render(<CartItem item={item} onMutated={onMutated} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText('common.elements.remove'));
    });
    expect(deleteItem).toHaveBeenCalledWith(1);
    expect(onMutated).toHaveBeenCalledOnce();
    expect(container.querySelector('#item-1')).toBeTruthy();
  });

  it('drops its own row after a delete when nothing refetches the cart', async () => {
    const { container } = render(<CartItem item={item} />);
    await act(async () => {
      fireEvent.click(screen.getByLabelText('common.elements.remove'));
    });
    expect(deleteItem).toHaveBeenCalledWith(1);
    expect(container.querySelector('#item-1')).toBeNull();
  });
});

describe('CartItem note', () => {
  const updateItem = vi.fn(() => Promise.resolve());
  let originalSalla: unknown;

  beforeEach(() => {
    vi.useFakeTimers();
    originalSalla = (window as { salla?: unknown }).salla;
    (window as { salla?: unknown }).salla = { cart: { updateItem } };
  });

  afterEach(() => {
    vi.useRealTimers();
    (window as { salla?: unknown }).salla = originalSalla;
    updateItem.mockClear();
  });

  const noted = { ...item, notes: 'Please gift wrap\nsecond line' } as unknown as CartItemType;

  it('shows the note the customer left on the product page, under the name', () => {
    render(<CartItem item={noted} />);
    const note = screen.getByTestId('cart-item-note');
    expect(note.textContent).toContain('pages.cart.item_note');
    expect(note.textContent).toContain('Please gift wrap');
    expect(note.textContent).toContain('second line');
    expect(note.closest('.cart-item__info')).not.toBeNull();
  });

  it('shows nothing for a line without a note', () => {
    render(<CartItem item={item} />);
    expect(screen.queryByTestId('cart-item-note')).toBeNull();
  });

  it('sends the note with a quantity change: the API clears a note that an update does not send', () => {
    const { container } = render(<CartItem item={noted} />);
    expect(new FormData(container.querySelector('form')!).get('notes')).toBe('Please gift wrap\nsecond line');
    fireEvent.click(screen.getByLabelText('pages.products.quantity +'));
    act(() => void vi.advanceTimersByTime(400));
    expect(updateItem).toHaveBeenCalledOnce();
    const payload = (updateItem.mock.calls[0] as unknown[])[0] as FormData;
    expect(payload.get('quantity')).toBe('2');
    expect(payload.get('notes')).toBe('Please gift wrap\nsecond line');
  });

  it('adds no notes field to a line that has none', () => {
    const { container } = render(<CartItem item={item} />);
    expect(new FormData(container.querySelector('form')!).has('notes')).toBe(false);
  });
});

describe('CartItem note editing', () => {
  const updateItem = vi.fn(() => Promise.resolve());
  let originalSalla: unknown;

  beforeEach(() => {
    originalSalla = (window as { salla?: unknown }).salla;
    (window as { salla?: unknown }).salla = { cart: { updateItem } };
  });

  afterEach(() => {
    (window as { salla?: unknown }).salla = originalSalla;
    updateItem.mockReset();
    updateItem.mockImplementation(() => Promise.resolve());
  });

  const withNote = { ...item, notes: 'First note', can_add_note: true } as unknown as CartItemType;
  const withOption = (container: HTMLElement) => {
    const option = document.createElement('input');
    option.name = 'options[7]';
    option.value = 'Red';
    container.querySelector('form')!.appendChild(option);
  };

  it('offers no editor to a product that takes no note and has none', () => {
    render(<CartItem item={item} />);
    expect(screen.queryByRole('button', { name: /add_note|note_edit/ })).toBeNull();
  });

  it('offers to add a note to a product that takes one', () => {
    render(<CartItem item={{ ...item, can_add_note: true } as unknown as CartItemType} />);
    expect(screen.getByRole('button', { name: 'pages.products.add_note' })).toBeTruthy();
  });

  it('lets a line that already has a note change it even if its product no longer takes notes', () => {
    render(<CartItem item={{ ...item, notes: 'Old', can_add_note: false } as unknown as CartItemType} />);
    expect(screen.getByRole('button', { name: 'pages.cart.note_edit' })).toBeTruthy();
  });

  it('saves an edited note through the cart update, with the item form (options, quantity) and the new text', async () => {
    const onMutated = vi.fn();
    const { container } = render(<CartItem item={withNote} onMutated={onMutated} />);
    withOption(container);
    fireEvent.click(screen.getByRole('button', { name: 'pages.cart.note_edit' }));
    const input = screen.getByLabelText('pages.products.add_note') as HTMLTextAreaElement;
    expect(input.value).toBe('First note');
    fireEvent.change(input, { target: { value: '  Second note  ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'pages.cart.note_save' }));
    });

    expect(updateItem).toHaveBeenCalledOnce();
    const payload = (updateItem.mock.calls[0] as unknown[])[0] as FormData;
    expect(payload.get('id')).toBe('1');
    expect(payload.get('notes')).toBe('Second note');
    expect(payload.get('options[7]')).toBe('Red');
    expect(payload.get('quantity')).toBe('1');
    expect(payload.getAll('notes')).toHaveLength(1);
    expect(onMutated).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('cart-item-note-editor')).toBeNull();
  });

  it('clears a note by saving it empty (the API clears what an update sends blank)', async () => {
    render(<CartItem item={withNote} />);
    fireEvent.click(screen.getByRole('button', { name: 'pages.cart.note_edit' }));
    fireEvent.change(screen.getByLabelText('pages.products.add_note'), { target: { value: '   ' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'pages.cart.note_save' }));
    });
    const payload = (updateItem.mock.calls[0] as unknown[])[0] as FormData;
    expect(payload.get('notes')).toBe('');
  });

  it('does not report a save that failed: the editor stays open with the text and a message, nothing refetched', async () => {
    updateItem.mockRejectedValueOnce(new Error('offline'));
    const onMutated = vi.fn();
    render(<CartItem item={withNote} onMutated={onMutated} />);
    fireEvent.click(screen.getByRole('button', { name: 'pages.cart.note_edit' }));
    fireEvent.change(screen.getByLabelText('pages.products.add_note'), { target: { value: 'Unsaved' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'pages.cart.note_save' }));
    });
    expect(screen.getByRole('alert').textContent).toBe('pages.cart.note_failed');
    expect((screen.getByLabelText('pages.products.add_note') as HTMLTextAreaElement).value).toBe('Unsaved');
    expect(onMutated).not.toHaveBeenCalled();
  });

  it('keeps the editor open and busy until the save has gone through', async () => {
    let finish: () => void = () => {};
    updateItem.mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<CartItem item={withNote} />);
    fireEvent.click(screen.getByRole('button', { name: 'pages.cart.note_edit' }));
    fireEvent.change(screen.getByLabelText('pages.products.add_note'), { target: { value: 'New text' } });
    fireEvent.click(screen.getByRole('button', { name: 'pages.cart.note_save' }));
    expect(screen.getByRole('button', { name: 'pages.cart.note_save' }).getAttribute('aria-busy')).toBe('true');
    expect(screen.getByTestId('cart-item-note-editor')).toBeTruthy();
    await act(async () => finish());
    expect(screen.queryByTestId('cart-item-note-editor')).toBeNull();
  });

  it('cancel drops the draft and shows the saved note again', () => {
    render(<CartItem item={withNote} />);
    fireEvent.click(screen.getByRole('button', { name: 'pages.cart.note_edit' }));
    fireEvent.change(screen.getByLabelText('pages.products.add_note'), { target: { value: 'Draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'pages.cart.note_cancel' }));
    expect(updateItem).not.toHaveBeenCalled();
    expect(screen.getByTestId('cart-item-note').textContent).toContain('First note');
  });

  it('keeps two lines notes apart: each form carries its own', () => {
    const other = { ...item, id: 9, notes: 'Other note', can_add_note: true } as unknown as CartItemType;
    const { container } = render(
      <>
        <CartItem item={withNote} />
        <CartItem item={other} />
      </>
    );
    const forms = container.querySelectorAll('form');
    expect(new FormData(forms[0]).get('notes')).toBe('First note');
    expect(new FormData(forms[1]).get('notes')).toBe('Other note');
    expect(new FormData(forms[1]).get('id')).toBe('9');
  });
});

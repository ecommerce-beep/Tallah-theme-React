import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { TallahProductCard } from '../../../app/components/product/TallahProductCard';

const state = vi.hoisted(() => ({
  settings: { product_card_options: true, product_card_options_image: false } as Record<string, unknown>,
}));

vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: 'ar', t: (_k: string, fb?: string) => fb ?? _k }),
}));

vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, ...rest }: { to: string; children?: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: state.settings } }),
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks/useMoney', () => ({
  useMoney: () => ({ format: (value: number) => `${value} SAR` }),
}));

vi.mock('@salla.sa/twilight-theme-engine/hooks/useWishlist', () => ({
  useWishlist: () => ({ has: () => false, toggle: vi.fn() }),
}));

vi.mock('@salla.sa/twilight-components-react/add-product-button', () => ({
  SallaAddProductButton: ({ productId, productStatus, children }: Record<string, unknown>) => (
    <salla-add-product-button product-id={String(productId)} product-status={String(productStatus)}>
      {children as React.ReactNode}
    </salla-add-product-button>
  ),
}));

// The quick view has its own test; here it is only a stand-in that proves what the card opens.
vi.mock('../../../app/components/product/TallahQuickView', () => ({
  TallahQuickView: ({ productId, onClose }: { productId: number; onClose: () => void }) => (
    <div data-testid="quickview" data-product-id={productId}>
      <button onClick={onClose}>close</button>
    </div>
  ),
}));

const make = (over: Record<string, unknown> = {}) =>
  ({
    id: 743402068,
    name: 'الجاكيت',
    url: 'https://store.example/p743402068',
    status: 'sale',
    type: 'product',
    price: 200,
    regular_price: 200,
    sale_price: null,
    is_on_sale: false,
    image: { url: 'https://cdn.example/main.webp', alt: '' },
    ...over,
  }) as never;

const details = {
  data: {
    images: [{ url: 'https://cdn.example/main.webp' }, { url: 'https://cdn.example/back.webp' }],
    options: [
      {
        id: 11,
        name: 'اللون',
        type: 'color',
        required: true,
        details: [
          { id: 111, name: 'أحمر', color: '#ff0000' },
          { id: 112, name: 'أسود', color: '#000000' },
          { id: 113, name: 'أبيض', color: '#ffffff' },
          { id: 114, name: 'أزرق', color: '#0000ff' },
        ],
      },
      {
        id: 12,
        name: 'المقاس',
        type: 'single-option',
        required: true,
        details: [
          { id: 121, name: 'S' },
          { id: 122, name: 'M' },
        ],
      },
      { id: 13, name: 'صورة', type: 'thumbnail', required: false, details: [{ id: 131, name: 'x' }] },
    ],
  },
};

const getDetails = vi.fn();
const addItem = vi.fn();
const notifyError = vi.fn();

const swatches = (c: HTMLElement) => [...c.querySelectorAll('.tallah-card__swatch')] as HTMLElement[];
const sizes = (c: HTMLElement) => [...c.querySelectorAll('.tallah-card__size')] as HTMLElement[];
const ready = (c: HTMLElement) => waitFor(() => expect(swatches(c).length).toBe(3));

beforeEach(() => {
  state.settings = { product_card_options: true, product_card_options_image: false };
  getDetails.mockReset();
  getDetails.mockResolvedValue(details);
  addItem.mockReset();
  addItem.mockResolvedValue({ success: true });
  notifyError.mockReset();
  (window as unknown as { salla: unknown }).salla = {
    product: { getDetails },
    cart: { addItem },
    notify: { error: notifyError },
  };
  window.sessionStorage.clear();
});

describe('TallahProductCard options (product_card_options)', () => {
  it('loads the options on mount, and shows at most three values with a "+N" chip', async () => {
    const { container } = render(<TallahProductCard product={make()} />);
    await ready(container);
    expect(container.querySelector('.colors .tallah-card__more')?.textContent).toBe('+1');
    expect(sizes(container)).toHaveLength(2);
    expect(getDetails).toHaveBeenCalledWith(743402068, ['images', 'options']);
  });

  it('shows no options, and loads nothing until the card is touched, when the setting is off', () => {
    state.settings = { product_card_options: false };
    const { container } = render(<TallahProductCard product={make()} />);
    expect(container.querySelector('.s-product-card-content-options')).toBeNull();
    expect(getDetails).not.toHaveBeenCalled();
  });

  it('adds the second image for the hover flip from the same request', async () => {
    const { container } = render(<TallahProductCard product={make()} />);
    await waitFor(() => expect(container.querySelector('img.back')?.getAttribute('src')).toBe('https://cdn.example/back.webp'));
    expect(getDetails).toHaveBeenCalledTimes(1);
  });

  it('marks the chosen swatch and size', async () => {
    const { container } = render(<TallahProductCard product={make()} />);
    await ready(container);
    fireEvent.click(swatches(container)[1]);
    fireEvent.click(sizes(container)[0]);
    expect(swatches(container)[1].className).toContain('ring-primary');
    expect(sizes(container)[0].className).toContain('bg-primary');
  });

  it('asks for the first missing required option instead of adding', async () => {
    const { container } = render(<TallahProductCard product={make()} />);
    await ready(container);
    fireEvent.click(container.querySelector('button.tallah-card__add') as HTMLElement);
    expect(notifyError).toHaveBeenCalledWith('Please select اللون');
    expect(addItem).not.toHaveBeenCalled();
  });

  it('adds one unit with the chosen options, and the auto-chosen thumbnail, once every required one is picked', async () => {
    const { container } = render(<TallahProductCard product={make()} />);
    await ready(container);
    fireEvent.click(swatches(container)[1]);
    fireEvent.click(sizes(container)[1]);
    await act(async () => {
      fireEvent.click(container.querySelector('button.tallah-card__add') as HTMLElement);
    });
    expect(addItem).toHaveBeenCalledWith({ id: 743402068, quantity: 1, options: { 11: 112, 12: 122, 13: 131 } });
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('tells the customer when the cart refuses the item', async () => {
    addItem.mockResolvedValue({ success: false, error: 'no' });
    const { container } = render(<TallahProductCard product={make()} />);
    await ready(container);
    fireEvent.click(swatches(container)[0]);
    fireEvent.click(sizes(container)[0]);
    await act(async () => {
      fireEvent.click(container.querySelector('button.tallah-card__add') as HTMLElement);
    });
    expect(notifyError).toHaveBeenCalledWith('Something went wrong');
  });

  it('greys the options out and leaves the add button to Salla for a sold-out product', async () => {
    const { container } = render(<TallahProductCard product={make({ status: 'out' })} />);
    await ready(container);
    expect((swatches(container)[0] as HTMLButtonElement).disabled).toBe(true);
    expect(container.querySelector('button.tallah-card__add')).toBeNull();
    expect(container.querySelector('salla-add-product-button')).toBeTruthy();
  });

  it('floats the options and a wide add button over the image, with a phone copy under it, when the options go over the image', async () => {
    state.settings = { product_card_options: true, product_card_options_image: true };
    const { container } = render(<TallahProductCard product={make()} />);
    await waitFor(() => expect(container.querySelector('.card-floating-btn .tallah-card__swatch')).toBeTruthy());
    expect(container.querySelector('.card-floating-btn .selected-color')).toBeTruthy();
    expect(container.querySelector('.card-floating-btn .tallah-card__add--wide')).toBeTruthy();
    expect(container.querySelector('.s-product-card-content-main .md\\:hidden .tallah-card__swatch')).toBeTruthy();
  });

  it('shows the picked color in the label over the image', async () => {
    state.settings = { product_card_options: true, product_card_options_image: true };
    const { container } = render(<TallahProductCard product={make()} />);
    await waitFor(() => expect(container.querySelector('.card-floating-btn .tallah-card__swatch')).toBeTruthy());
    fireEvent.click(container.querySelectorAll('.card-floating-btn .tallah-card__swatch')[0]);
    expect(container.querySelector('.card-floating-btn .selected-color')?.textContent).toBe('أحمر');
  });
});

describe('TallahProductCard quick view', () => {
  it('opens the quick view for the product from the eye button, and closes it again', async () => {
    state.settings = { product_card_options: false };
    const { container, findByTestId, queryByTestId, getByText } = render(<TallahProductCard product={make()} />);
    const eye = container.querySelector('.s-product-card-quick-btn') as HTMLElement;
    expect(eye.getAttribute('aria-label')).toBe('Quick view');
    fireEvent.click(eye);
    expect((await findByTestId('quickview')).getAttribute('data-product-id')).toBe('743402068');
    fireEvent.click(getByText('close'));
    expect(queryByTestId('quickview')).toBeNull();
  });
});

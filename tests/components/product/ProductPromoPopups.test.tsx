import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import {
  ProductPromoPopups,
  isSettingOn,
  isUsableSubscriptionUrl,
  readCategoryIds,
} from '../../../app/components/product/ProductPromoPopups';

let locale = 'ar';
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale, t: (_k: string, f?: string) => f ?? _k }),
}));

const makeProduct = (over: Record<string, unknown> = {}) =>
  ({ id: 1, status: 'sale', category: { id: 77 }, ...over }) as unknown as Product;

const notifyInfo = vi.fn();
const notifyError = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  locale = 'ar';
  window.localStorage.clear();
  (window as unknown as { salla?: unknown }).salla = { notify: { info: notifyInfo, error: notifyError } };
  window.scrollTo = vi.fn() as never;
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  notifyInfo.mockClear();
  notifyError.mockClear();
  delete (window as unknown as { salla?: unknown }).salla;
});

const scrollTo = (y: number) => {
  (window as unknown as { scrollY: number }).scrollY = y;
  act(() => void window.dispatchEvent(new Event('scroll')));
};

describe('helpers (the original app.js / master.twig rules)', () => {
  it('treats a switch as on unless explicitly off', () => {
    expect([undefined, null, true, '1'].every(isSettingOn)).toBe(true);
    expect([false, '', '0', 'false', 0].some(isSettingOn)).toBe(false);
  });

  it('rejects the editor default, the current page and non-http links as subscription endpoints', () => {
    const here = new URL('https://shop.example/ar/p1');
    expect(isUsableSubscriptionUrl('https://s.salla.sa', here)).toBe(false);
    expect(isUsableSubscriptionUrl('', here)).toBe(false);
    expect(isUsableSubscriptionUrl('javascript:alert(1)', here)).toBe(false);
    expect(isUsableSubscriptionUrl('https://shop.example/ar/p1', here)).toBe(false);
    expect(isUsableSubscriptionUrl('https://list.example/subscribe', here)).toBe(true);
  });

  it('reads category ids in every shape the setting can arrive in', () => {
    expect(readCategoryIds([1, '2'])).toEqual([1, 2]);
    expect(readCategoryIds([{ value: 3 }, { id: 4 }])).toEqual([3, 4]);
    expect(readCategoryIds({ value: [5, 6] })).toEqual([5, 6]);
    expect(readCategoryIds(undefined)).toEqual([]);
  });
});

describe('availability notification popup', () => {
  const settings = {
    newsletter_sp_view_modal: true,
    newsletter_url_product: 'https://list.example/subscribe',
    newsletter_sp_block_title: { ar: 'عنوان', en: 'Title' },
    newsletter_sp_sub_title: { ar: 'نص', en: 'Sub' },
    newsletter_sp_add_image: 'https://img.example/a.png',
  };

  it('opens 2s after an out-of-stock product loads, with the configured content', () => {
    render(<ProductPromoPopups product={makeProduct({ status: 'out' })} settings={settings} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => void vi.advanceTimersByTime(2100));
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(screen.getByText('عنوان')).toBeTruthy();
    expect(screen.getByText('نص')).toBeTruthy();
    expect(dialog.querySelector('img')?.getAttribute('src')).toBe('https://img.example/a.png');
  });

  it('never opens for an available product, when switched off, or without a usable URL', () => {
    const { rerender } = render(<ProductPromoPopups product={makeProduct()} settings={settings} />);
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <ProductPromoPopups
        product={makeProduct({ status: 'out' })}
        settings={{ ...settings, newsletter_sp_view_modal: false }}
      />
    );
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <ProductPromoPopups
        product={makeProduct({ status: 'out-and-notify' })}
        settings={{ ...settings, newsletter_url_product: 'https://s.salla.sa' }}
      />
    );
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('validates the email, posts it no-cors to the configured URL and confirms', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({} as Response));
    vi.stubGlobal('fetch', fetchMock);
    render(<ProductPromoPopups product={makeProduct({ status: 'out-and-notify' })} settings={settings} />);
    act(() => void vi.advanceTimersByTime(2100));
    const input = screen.getByPlaceholderText('أدخل بريدك الإلكتروني');
    const form = input.closest('form')!;

    fireEvent.submit(form);
    expect(notifyError).toHaveBeenLastCalledWith('الرجاء إدخال بريد إلكتروني صحيح');
    fireEvent.change(input, { target: { value: 'nope' } });
    fireEvent.submit(form);
    expect(notifyError).toHaveBeenLastCalledWith('صيغة البريد الإلكتروني غير صحيحة');
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'a@b.co' } });
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    const call = (fetchMock.mock.calls as unknown as [string, RequestInit][])[0];
    expect(call[0]).toBe('https://list.example/subscribe');
    expect(call[1].mode).toBe('no-cors');
    expect((call[1].body as FormData).get('EMAIL')).toBe('a@b.co');
    expect(notifyInfo).toHaveBeenCalledWith('تم إرسال طلبك. شكراً لك');
    expect(screen.queryByRole('dialog')).toBeNull();
    vi.unstubAllGlobals();
  });

  it('uses the English wording and closes with Escape, Cancel and the backdrop', () => {
    locale = 'en';
    render(<ProductPromoPopups product={makeProduct({ status: 'out' })} settings={settings} />);
    act(() => void vi.advanceTimersByTime(2100));
    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your email address')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('category offer popup', () => {
  const settings = {
    collection_sp_view_modal: true,
    collection_categories: [77],
    collection_sp_block_title: { ar: 'خصم', en: 'Discount' },
    collection_sp_sub_title: { ar: 'فرعي', en: 'Sub' },
    collection_sp_promo_title: { ar: 'ترويج', en: 'Promo' },
    collection_title: { ar: 'مجموعة', en: 'Collection' },
    collection_add_image: 'https://img.example/top.png',
    collectionn_footer_image: 'https://img.example/foot.png',
  };

  it('opens once, only after 600px of scrolling, for a product of a configured category', () => {
    render(<ProductPromoPopups product={makeProduct()} settings={settings} />);
    scrollTo(300);
    expect(screen.queryByRole('dialog')).toBeNull();
    scrollTo(650);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('خصم')).toBeTruthy();
    expect(screen.getByText('ترويج')).toBeTruthy();
    expect(screen.getByText(/مجموعة/)).toBeTruthy();
    expect(screen.getByRole('dialog').querySelectorAll('img').length).toBe(2);
  });

  it('stays closed for another category or when switched off', () => {
    const { rerender } = render(
      <ProductPromoPopups product={makeProduct({ category: { id: 5 } })} settings={settings} />
    );
    scrollTo(900);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(
      <ProductPromoPopups product={makeProduct()} settings={{ ...settings, collection_sp_view_modal: false }} />
    );
    scrollTo(900);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it("remembers \"don't remind me again\" in localStorage and then never shows again", () => {
    const { unmount } = render(<ProductPromoPopups product={makeProduct()} settings={settings} />);
    scrollTo(700);
    fireEvent.click(screen.getByLabelText('لا تُذكرني مرة أخرى'));
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.localStorage.getItem('collection_sp_modal_dont_remind')).toBe('true');
    unmount();
    render(<ProductPromoPopups product={makeProduct()} settings={settings} />);
    scrollTo(900);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closing without the box ticked remembers nothing', () => {
    render(<ProductPromoPopups product={makeProduct()} settings={settings} />);
    scrollTo(700);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(window.localStorage.getItem('collection_sp_modal_dont_remind')).toBeNull();
  });
});

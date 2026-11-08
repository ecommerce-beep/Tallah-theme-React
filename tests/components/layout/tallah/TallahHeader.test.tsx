import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { TallahHeader } from '../../../../app/components/layout/tallah/TallahHeader';

const state = {
  settings: {} as Record<string, unknown>,
  routeId: '/{-$locale}/',
  loggedIn: true,
  store: { name: 'Shop', logo: 'https://x/logo.png', url: 'https://shop.example', settings: {} } as Record<
    string,
    unknown
  >,
};

vi.mock('@tanstack/react-router', () => ({
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ matches: [{ routeId: state.routeId }] }),
}));
vi.mock('@salla.sa/twilight-theme-engine/providers', () => ({
  useTwilight: () => ({ theme: { settings: state.settings }, store: state.store }),
}));
vi.mock('@salla.sa/twilight-theme-engine/i18n', () => ({
  useTranslation: () => ({ locale: 'ar', t: (_k: string, fb?: string) => fb ?? _k }),
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks', () => ({ HookSlot: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/layout', () => ({ PageAdvertisements: () => null }));
vi.mock('@salla.sa/twilight-theme-engine/common', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  Image: ({ src, className }: { src?: string; className?: string }) => (
    <img src={src} className={className} alt="" />
  ),
}));
vi.mock('@salla.sa/twilight-components-react/search', () => ({ SallaSearch: () => null }));
vi.mock('@salla.sa/twilight-components-react/user-menu', () => ({
  SallaUserMenu: () => <salla-user-menu />,
}));
vi.mock('@salla.sa/twilight-components-react/cart-summary', () => ({
  SallaCartSummary: ({ children }: { children?: React.ReactNode }) => (
    <salla-cart-summary>{children}</salla-cart-summary>
  ),
}));
vi.mock('../../../../app/components/layout/tallah/TallahTopnav', () => ({
  TallahTopnav: () => <div data-testid="topnav" />,
}));
vi.mock('@salla.sa/twilight-theme-engine/hooks/useUser', () => ({
  useUser: () => ({ isLoggedIn: state.loggedIn }),
}));
vi.mock('../../../../app/components/layout/tallah/TopLace', () => ({ TopLace: () => null }));
vi.mock('../../../../app/components/layout/tallah/MegaMenu', () => ({
  MegaMenu: ({
    advanced,
    onOpenChange,
  }: {
    advanced: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <button data-testid="mega" data-advanced={String(advanced)} onClick={() => onOpenChange(true)} />
  ),
}));
vi.mock('../../../../app/components/layout/tallah/MobileMenu', () => ({
  MobileMenu: ({ open }: { open: boolean }) => <div data-testid="mobile-menu" data-open={String(open)} />,
}));
const sideCart = { open: false, setOpen: vi.fn(), cart: null as null | { items: unknown[] }, refresh: vi.fn() };
vi.mock('../../../../app/components/layout/tallah/SideCart', () => ({
  useSideCart: (enabled: boolean) => (enabled ? sideCart : { ...sideCart, cart: null }),
  SideCart: ({ open }: { open: boolean }) => <div data-testid="sidecart" data-open={String(open)} />,
}));
vi.mock('../../../../app/components/layout/tallah/SearchPanel', () => ({
  SearchPanel: ({
    open,
    inputRef,
  }: {
    open: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) => (
    <div data-testid="search" data-open={String(open)}>
      <input ref={inputRef} />
    </div>
  ),
}));

const header = (c: HTMLElement) => c.querySelector('header')!;

beforeEach(() => {
  sideCart.open = false;
  sideCart.cart = null;
  sideCart.setOpen.mockReset();
  state.settings = {};
  state.routeId = '/{-$locale}/';
  state.loggedIn = true;
  state.store = { name: 'Shop', logo: 'https://x/logo.png', url: 'https://shop.example', settings: {} };
  window.scrollTo(0, 0);
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
});

describe('TallahHeader', () => {
  it('floats over the home page and sits in the flow elsewhere', () => {
    const home = render(<TallahHeader />).container;
    expect(header(home).classList.contains('tallah-header--home')).toBe(true);

    state.routeId = '/{-$locale}/cart';
    const page = render(<TallahHeader />).container;
    expect(header(page).classList.contains('tallah-header--page')).toBe(true);
  });

  it('hands the Theme Editor colors to CSS as custom properties, never as fixed values', () => {
    state.settings = { 'header-background-color': '#112233', 'header-text-color': '#ddeeff' };
    state.routeId = '/{-$locale}/cart';
    const style = header(render(<TallahHeader />).container).style;
    expect(style.getPropertyValue('--th-bg')).toBe('#112233');
    expect(style.getPropertyValue('--th-text')).toBe('#ddeeff');
    // Off the home page the bar rests in the header colors.
    expect(style.getPropertyValue('--th-rest-bg')).toBe('#112233');
    expect(style.getPropertyValue('--th-rest-text')).toBe('#ddeeff');
  });

  it('rests in a dark gradient with light text over the home hero when header-hover is on', () => {
    const style = header(render(<TallahHeader />).container).style;
    expect(style.getPropertyValue('--th-rest-bg')).toContain('linear-gradient');
    expect(style.getPropertyValue('--th-rest-text')).toBe('#ffffff');

    state.settings = { 'header-hover': false, 'header-background-color': '#abcdef' };
    const solid = header(render(<TallahHeader />).container).style;
    expect(solid.getPropertyValue('--th-rest-bg')).toBe('#abcdef');
  });

  it('renders both logos only when the secondary logo is on and set', () => {
    expect(render(<TallahHeader />).container.querySelector('.tallah-header__logo--secondary')).toBeNull();

    state.settings = { add_another_logo: true, another_logo_img: 'https://x/dark.png' };
    const { container } = render(<TallahHeader />);
    expect(container.querySelector('.tallah-header__logo--secondary')).not.toBeNull();
    expect(header(container).classList.contains('tallah-header--two-logos')).toBe(true);
  });

  it('gives a guest a login button and no account menu', () => {
    state.loggedIn = false;
    const dispatch = vi.fn();
    (window as unknown as { salla: unknown }).salla = { event: { dispatch } };
    const { container } = render(<TallahHeader />);
    expect(container.querySelector('salla-user-menu')).toBeNull();
    fireEvent.click(container.querySelector('button[aria-label="Login"]')!);
    expect(dispatch).toHaveBeenCalledWith('login::open');
    delete (window as unknown as { salla?: unknown }).salla;
  });

  it('mounts the account menu, wishlist and cart once, whatever the screen width', () => {
    const { container } = render(<TallahHeader />);
    expect(container.querySelectorAll('salla-user-menu')).toHaveLength(1);
    expect(container.querySelectorAll('salla-cart-summary')).toHaveLength(1);
    expect(container.querySelectorAll('a[href="/wishlist"]')).toHaveLength(1);
  });

  it('draws the cart icon the merchant picked', () => {
    state.settings = { cart_icon_choose: true, cart_icon_type: 'cart_3' };
    expect(render(<TallahHeader />).container.querySelector('i.sicon-shopping-bag')).not.toBeNull();
  });

  it('passes the advanced-menu switch on to the menu', () => {
    state.settings = { 'advanced-menu': true };
    expect(render(<TallahHeader />).getByTestId('mega').dataset.advanced).toBe('true');
  });

  it('opens the search panel from either search button, focuses the field and closes on Escape', () => {
    const { container, getByTestId } = render(<TallahHeader />);
    const buttons = container.querySelectorAll<HTMLButtonElement>('button[aria-controls="tallah-search-panel"]');
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[0]);
    expect(getByTestId('search').dataset.open).toBe('true');
    expect(header(container).classList.contains('is-open-panel')).toBe(true);
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(getByTestId('search').querySelector('input'));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(getByTestId('search').dataset.open).toBe('false');
  });

  it('takes the active colors while a menu panel is open', () => {
    const { container, getByTestId } = render(<TallahHeader />);
    expect(header(container).classList.contains('is-open-panel')).toBe(false);
    fireEvent.click(getByTestId('mega'));
    expect(header(container).classList.contains('is-open-panel')).toBe(true);
  });

  it('toggles the mobile menu through the lifted state, and closes the search first', () => {
    const onNavOpenChange = vi.fn();
    const { container, getByTestId, rerender } = render(
      <TallahHeader navOpen={false} onNavOpenChange={onNavOpenChange} />
    );
    const search = container.querySelector<HTMLButtonElement>('button[aria-controls="tallah-search-panel"]')!;
    fireEvent.click(search);
    expect(getByTestId('search').dataset.open).toBe('true');

    const burger = container.querySelector<HTMLButtonElement>('button[aria-label="Menu"]')!;
    fireEvent.click(burger);
    expect(onNavOpenChange).toHaveBeenLastCalledWith(true);
    expect(getByTestId('search').dataset.open).toBe('false');

    rerender(<TallahHeader navOpen onNavOpenChange={onNavOpenChange} />);
    expect(getByTestId('mobile-menu').dataset.open).toBe('true');
    expect(burger.getAttribute('aria-expanded')).toBe('true');
  });

  it('pins the bar after 100px of scroll', () => {
    // Run the frame callback at once, so the scroll handler's work is inside act().
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0; // a falsy handle: the handler treats it as "no frame pending"
    });
    const { container } = render(<TallahHeader />);
    expect(header(container).classList.contains('is-pinned')).toBe(false);

    Object.defineProperty(window, 'scrollY', { value: 150, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(header(container).classList.contains('is-pinned')).toBe(true);

    Object.defineProperty(window, 'scrollY', { value: 20, configurable: true });
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(header(container).classList.contains('is-pinned')).toBe(false);
    raf.mockRestore();
  });

  it('never pins, and drops sticky positioning, when header_is_sticky is off', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    state.settings = { header_is_sticky: false };
    Object.defineProperty(window, 'scrollY', { value: 300, configurable: true });
    const { container } = render(<TallahHeader />);
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(header(container).classList.contains('is-pinned')).toBe(false);
    expect(header(container).classList.contains('tallah-header--static')).toBe(true);
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true });
    raf.mockRestore();
  });

  it('shows the language button below lg only when the store has several languages or currencies', () => {
    expect(render(<TallahHeader />).container.querySelector('i.sicon-world')).toBeNull();

    state.store = { ...state.store, settings: { is_multilingual: true } };
    expect(render(<TallahHeader />).container.querySelector('i.sicon-world')).not.toBeNull();
  });

  describe('side cart', () => {
    const on = { enable_side_cart: true, cart_display_type: 'side' };

    it('keeps the SDK cart summary while the side cart is off', () => {
      const { container, queryByTestId } = render(<TallahHeader />);
      expect(container.querySelector('salla-cart-summary')).not.toBeNull();
      expect(queryByTestId('sidecart')).toBeNull();
    });

    it('swaps it for a button with the count when on, and opens the drawer', () => {
      state.settings = on;
      sideCart.cart = { items: [{}, {}] };
      const { container, getByTestId } = render(<TallahHeader />);
      expect(container.querySelector('salla-cart-summary')).toBeNull();
      expect(getByTestId('tallah-cart-count').textContent).toBe('2');
      expect(getByTestId('sidecart')).toBeTruthy();

      fireEvent.click(container.querySelector('.tallah-header__cart')!);
      expect(sideCart.setOpen).toHaveBeenCalledWith(true);
    });

    it('shows the cart quantity count, not the number of lines', () => {
      state.settings = on;
      sideCart.cart = { items: [{}, {}], count: 7 };
      const { getByTestId } = render(<TallahHeader />);
      expect(getByTestId('tallah-cart-count').textContent).toBe('7');
    });

    it('needs both switches', () => {
      state.settings = { enable_side_cart: true, cart_display_type: 'page' };
      expect(render(<TallahHeader />).container.querySelector('.tallah-header__cart')).toBeNull();
    });

    it('goes back to the plain cart link on the cart page', () => {
      state.settings = on;
      state.routeId = '/{-$locale}/cart';
      const { container, queryByTestId } = render(<TallahHeader />);
      expect(container.querySelector('salla-cart-summary')).not.toBeNull();
      expect(queryByTestId('sidecart')).toBeNull();
    });
  });
});

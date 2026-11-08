import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { SallaSearch } from '@salla.sa/twilight-components-react/search';
import { SallaUserMenu } from '@salla.sa/twilight-components-react/user-menu';
import { SallaCartSummary } from '@salla.sa/twilight-components-react/cart-summary';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { Image, Link } from '@salla.sa/twilight-theme-engine/common';
import { PageAdvertisements } from '@salla.sa/twilight-theme-engine/layout';
import { useUser } from '@salla.sa/twilight-theme-engine/hooks/useUser';
import { CART_ROUTE_ID, HOME_ROUTE_ID } from '../../../lib/routeIds';
import { MegaMenu } from './MegaMenu';
import { MobileMenu } from './MobileMenu';
import { SearchPanel } from './SearchPanel';
import { SideCart, useSideCart } from './SideCart';
import { TallahTopnav } from './TallahTopnav';
import { TopLace } from './TopLace';
import { useTallahSettings } from './settings';

/** Scroll distance after which the bar pins to the top of the viewport. */
const PIN_AT = 100;

const CART_ICONS: Record<string, string> = {
  cart_1: 'sicon-shopping',
  cart_2: 'sicon-shopping-basket',
  cart_3: 'sicon-shopping-bag',
  cart_4: 'sicon-luggage-cart',
  cart_5: 'sicon-cart-add',
};

function HeartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M16.2796 4.55371C17.9068 6.1809 17.9068 8.81908 16.2796 10.4463L10.7071 16.0188C10.3166 16.4093 9.68341 16.4093 9.29288 16.0188L3.72039 10.4463C2.0932 8.81908 2.0932 6.1809 3.72039 4.55371C5.014 3.2601 6.57547 2.86401 8.15104 3.6328C8.7764 3.93794 9.59634 4.55371 9.99999 5.35806C10.4036 4.55371 11.2236 3.93794 11.8489 3.6328C13.4245 2.86401 14.986 3.2601 16.2796 4.55371Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M9.16667 15.8333C12.8486 15.8333 15.8333 12.8486 15.8333 9.16667C15.8333 5.48477 12.8486 2.5 9.16667 2.5C5.48477 2.5 2.5 5.48477 2.5 9.16667C2.5 12.8486 5.48477 15.8333 9.16667 15.8333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 17.5L13.875 13.875" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M16.6673 17.5V15.8333C16.6673 14.9493 16.3161 14.1014 15.691 13.4763C15.0659 12.8512 14.218 12.5 13.334 12.5H6.66732C5.78326 12.5 4.93542 12.8512 4.31029 13.4763C3.68517 14.1014 3.33398 14.9493 3.33398 15.8333V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.99935 9.16667C11.8403 9.16667 13.3327 7.67428 13.3327 5.83333C13.3327 3.99238 11.8403 2.5 9.99935 2.5C8.1584 2.5 6.66602 3.99238 6.66602 5.83333C6.66602 7.67428 8.1584 9.16667 9.99935 9.16667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BurgerIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M15.625 4.375L4.375 15.625M15.625 15.625L4.375 4.375" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rtl:-scale-x-100" aria-hidden="true">
      <path d="M3.33398 15H9.16732M3.33398 5H16.6673M3.33398 10H16.6673" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Focuses the search field. A click on the search button right after load can
 * reach React before the header has hydrated (it is replayed once it has), and the
 * panel is `inert` until open, so the field may not exist or take focus yet:
 * retry for a few frames.
 */
function focusWhenReady(ref: { current: HTMLInputElement | null }, attempts = 10) {
  const input = ref.current;
  input?.focus({ preventScroll: true });
  if (document.activeElement !== input && attempts > 0) {
    requestAnimationFrame(() => focusWhenReady(ref, attempts - 1));
  }
}

interface TallahHeaderProps {
  /** Lifted state of the mobile menu: ThemeLayout shares it with the bottom bar's Categories tab. */
  navOpen?: boolean;
  onNavOpenChange?: (open: boolean) => void;
}

/**
 * TALLAH's header (migrated from `components/header/header.twig`), chosen by
 * `header_layout` = `tallah` (the default).
 *
 * Top to bottom: the ad slot, the announcement bar ({@link TopLace}), the
 * contacts / language bar ({@link HeaderTopnav}, `lg+`), then the main bar:
 * icons (search, account, wishlist, cart) · centered logo · the menu
 * ({@link MegaMenu}, `lg+`). Below `lg` the bar carries account, wishlist and
 * cart on one side and the menu button, language and search on the other, with
 * {@link MobileMenu} sliding in under it.
 *
 * On the home page the header floats over the first block, transparent under a
 * dark gradient with the secondary logo hidden; hovering it (or opening a panel,
 * or pinning it with `header-hover` on) turns it to `header-background-color` /
 * `header-text-color` and swaps in the secondary logo. Every other page starts
 * in those colors. After {@link PIN_AT}px the bar pins to the viewport edge.
 *
 * The search panel and the mega panel hang off the bar itself (absolutely under
 * it), so they follow it when it pins. Colors come from Theme Editor settings
 * through the `--th-*` custom properties on the root; the rules are in
 * `styles/04-components/tallah-header.scss`.
 */
export function TallahHeader({ navOpen: navOpenProp, onNavOpenChange }: TallahHeaderProps = {}) {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const { isLoggedIn } = useUser();
  const settings = useTallahSettings();
  const isHome = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === HOME_ROUTE_ID),
  });

  const isCartPage = useRouterState({
    select: (state) => state.matches.some((match) => match.routeId === CART_ROUTE_ID),
  });
  // On the cart page the cart button just goes to the cart, as in the Twig theme.
  const sideCartOn = settings.sideCart && !isCartPage;
  const sideCart = useSideCart(sideCartOn);

  const [navOpenState, setNavOpenState] = useState(false);
  const navOpen = navOpenProp ?? navOpenState;
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const [barBottom, setBarBottom] = useState(56);
  const innerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const setNavOpen = useCallback(
    (open: boolean) => {
      if (navOpenProp === undefined) setNavOpenState(open);
      onNavOpenChange?.(open);
    },
    [navOpenProp, onNavOpenChange]
  );

  const measureBar = () => {
    const rect = innerRef.current?.getBoundingClientRect();
    if (rect) setBarBottom(Math.round(rect.bottom));
  };

  const toggleSearch = () => {
    if (searchOpen) {
      setSearchOpen(false);
      return;
    }
    measureBar();
    setNavOpen(false);
    setSearchOpen(true);
  };

  useEffect(() => {
    if (searchOpen) focusWhenReady(searchInputRef);
  }, [searchOpen]);

  const toggleNav = () => {
    if (!navOpen) {
      measureBar();
      setSearchOpen(false);
    }
    setNavOpen(!navOpen);
  };

  // Pin the bar once the page has scrolled PIN_AT px, as the Twig theme does: the bar goes
  // `position: fixed` and the announcement and contacts bars are dropped. The header's own
  // height stays reserved in the flow (off the home page), so the content does not jump up.
  useEffect(() => {
    // `header_is_sticky` off: the bar stays in the flow and never pins.
    if (!settings.sticky) {
      setPinned(false);
      return;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = window.scrollY >= PIN_AT;
      setPinned((current) => {
        if (current !== next && next) setBarHeight(headerRef.current?.offsetHeight ?? 0);
        return next;
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [settings.sticky]);

  // Escape closes the search panel wherever focus is.
  useEffect(() => {
    if (!searchOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [searchOpen]);

  // A panel is open: Twig paints the whole header the header color then (the hover look,
  // `header:hover`, is plain CSS; pinned + `header-hover` too).
  const panelOpen = megaOpen || searchOpen || navOpen;
  const cartIconClass = CART_ICONS[settings.cartIcon] ?? CART_ICONS.cart_1;
  const hasSecondary = Boolean(settings.secondaryLogo);

  // The bar's resting look: a dark gradient with light text over the home hero
  // (when `header-hover` is on), the header colors everywhere else.
  const overHero = isHome && settings.hover;
  const style = {
    '--th-bg': settings.headerBg,
    '--th-text': settings.headerText,
    '--th-rest-bg': overHero
      ? 'linear-gradient(0deg, rgba(17, 16, 16, 0) 0%, rgba(17, 16, 16, 0.1) 10%, rgba(17, 16, 16, 0.6) 65%)'
      : settings.headerBg,
    '--th-rest-text': overHero ? '#ffffff' : settings.headerText,
    '--th-bar-bottom': `${barBottom}px`,
  } as CSSProperties;

  const logoAlt = store?.name || 'Store';
  const brand = (
    <Link to="/" className="tallah-header__brand">
      {/* Two logos on desktop only: the mobile bar always shows the store logo, as in Twig. */}
      {hasSecondary ? (
        <span className="tallah-header__logos">
          <Image src={store?.logo} alt="" priority width={140} height={48} className="tallah-header__logo tallah-header__logo--primary" />
          <img src={settings.secondaryLogo} alt="" className="tallah-header__logo tallah-header__logo--secondary" />
        </span>
      ) : (
        <Image src={store?.logo} alt="" priority width={140} height={48} className="tallah-header__logo" />
      )}
      {/* `h1` on the home page, `h2` elsewhere, as in header.twig. */}
      {isHome ? <h1 className="sr-only">{logoAlt}</h1> : <h2 className="sr-only">{logoAlt}</h2>}
    </Link>
  );

  // A guest gets a plain button that opens the login modal; a customer, the account menu.
  const accountButton = isLoggedIn ? (
    <SallaUserMenu avatarOnly showHeader relativeDropdown className="tallah-header__action" />
  ) : (
    <button
      type="button"
      className="tallah-header__action"
      aria-label={t('blocks.header.login', 'Login')}
      aria-haspopup="dialog"
      onClick={() => window.salla?.event?.dispatch('login::open')}
    >
      <UserSvg />
    </button>
  );
  const wishlistLink = (
    <Link to="/wishlist" className="tallah-header__action" aria-label={t('blocks.header.wishlist', 'Wishlist')}>
      <HeartIcon />
    </Link>
  );
  const cartLink = sideCartOn ? (
    <button
      type="button"
      className="tallah-header__action tallah-header__cart"
      aria-label={t('blocks.header.cart', 'Cart')}
      aria-haspopup="dialog"
      aria-expanded={sideCart.open}
      onClick={() => sideCart.setOpen(true)}
    >
      <i className={`${cartIconClass} text-xl`} aria-hidden="true" />
      <span className="tallah-header__cart-count" data-testid="tallah-cart-count">
        {/* Salla's own cart count (total quantity), like the SDK summary and the mobile bar — not the number of lines */}
        {sideCart.cart?.count ?? sideCart.cart?.items?.length ?? 0}
      </span>
    </button>
  ) : (
    <SallaCartSummary className="tallah-header__action tallah-header__cart-summary">
      <i slot="icon" className={`${cartIconClass} text-xl`} aria-hidden="true" />
    </SallaCartSummary>
  );
  const searchButton = (extra: string) => (
    <button
      type="button"
      className={`tallah-header__action ${extra}`}
      aria-label={t('blocks.header.open_search', 'Open search')}
      aria-expanded={searchOpen}
      aria-controls="tallah-search-panel"
      onClick={toggleSearch}
    >
      <SearchSvg />
    </button>
  );

  return (
    <header
      ref={headerRef}
      className={[
        'tallah-header',
        isHome ? 'tallah-header--home' : 'tallah-header--page',
        settings.hover ? 'tallah-header--hover' : '',
        settings.sticky ? '' : 'tallah-header--static',
        hasSecondary ? 'tallah-header--two-logos' : '',
        pinned ? 'is-pinned' : '',
        panelOpen ? 'is-open-panel' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={pinned && !isHome ? { ...style, minHeight: barHeight } : style}
      suppressHydrationWarning
    >
      <HookSlot name="header:start" />
      <div className="tallah-header__ad">
        <PageAdvertisements />
      </div>

      {/* `#mainnav` in Twig: the announcement strip, the contacts bar and the main bar. Its
          background (the dark gradient over the hero, else the header color) is one layer
          behind all three. */}
      <div className="tallah-header__nav">
        <TopLace />
        <TallahTopnav />

        <div ref={innerRef} className="tallah-header__inner">
          {/* One bar for every width, so the account menu, wishlist and cart are mounted once
              (the mobile bottom bar clicks the account trigger). `row-reverse` keeps the
              icons on the inline-end side on desktop; below `lg` the same cells read
              account · wishlist · cart | logo | menu · language · search. */}
          <div className="tallah-header__bar">
            <div className="tallah-header__icons">
              {searchButton('tallah-header__action--desktop')}
              {accountButton}
              {wishlistLink}
              {cartLink}
            </div>
            <div className="tallah-header__logo-cell">{brand}</div>
            <nav className="tallah-header__menu" aria-label={t('blocks.header.main_menu', 'Menu')}>
              <MegaMenu advanced={settings.advancedMenu} onOpenChange={setMegaOpen} />
            </nav>
            <div className="tallah-header__icons tallah-header__controls">
              <button
                type="button"
                className="tallah-header__action"
                aria-label={t('blocks.header.main_menu', 'Menu')}
                aria-expanded={navOpen}
                onClick={toggleNav}
              >
                <BurgerIcon open={navOpen} />
              </button>
              {(store?.settings?.is_multilingual || store?.settings?.currencies_enabled) && (
                <button
                  type="button"
                  className="tallah-header__action"
                  aria-label={t('blocks.header.change_language', 'Change language')}
                  onClick={() => window.salla?.event?.dispatch('localization::open')}
                >
                  <i className="sicon-world" aria-hidden="true" />
                </button>
              )}
              {searchButton('tallah-header__action--mobile')}
            </div>
          </div>

          <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} inputRef={searchInputRef} />
        </div>
      </div>

      <MobileMenu open={navOpen} onClose={() => setNavOpen(false)} advanced={settings.advancedMenu} />

      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        className={`tallah-header__backdrop${searchOpen ? ' is-clickable' : ''}`}
        data-visible={searchOpen || megaOpen}
        onClick={() => setSearchOpen(false)}
      />

      {sideCartOn && (
        <SideCart
          open={sideCart.open}
          onClose={() => sideCart.setOpen(false)}
          cart={sideCart.cart}
          refresh={sideCart.refresh}
        />
      )}

      <SallaSearch suppressHydrationWarning />
      <HookSlot name="header:end" />
    </header>
  );
}

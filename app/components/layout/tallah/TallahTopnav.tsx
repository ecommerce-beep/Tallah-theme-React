import { useEffect, useState } from 'react';
import { SallaContacts } from '@salla.sa/twilight-components-react/contacts';
import { SallaMenu } from '@salla.sa/twilight-components-react/menu';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useHydrated } from '../../../hooks/useHydrated';

/**
 * The store currency's symbol ("ر.س"), as `currency.symbol` in Twig. The engine's currency has no
 * symbol for SAR (its prices draw an icon), so after load it is read from the SDK's currency list,
 * and until then the currency code, when there is one, is shown.
 */
function useCurrencySymbol(code?: string, symbol?: string) {
  const [fromSdk, setFromSdk] = useState('');
  useEffect(() => {
    const read = () => {
      const config = window.salla?.config;
      // The engine's currency may carry neither a code nor a symbol; the SDK knows the user's.
      const current = code || (config?.get?.('user.currency_code') as string | undefined);
      const list = config?.get?.('currencies') as Record<string, { symbol?: string }> | undefined;
      const found = current ? list?.[current]?.symbol?.trim() : undefined;
      if (found) setFromSdk(found);
    };
    read();
    void (window.salla as { onReady?: () => Promise<unknown> } | undefined)?.onReady?.().then(read);
  }, [code]);
  return symbol || fromSdk || code || '';
}

/**
 * The bar under the announcement strip (`.top-navbar` in `header.twig`, `lg+`):
 * three columns of equal width. The footer menu on the inline-start side; the
 * contacts (phone, email) in the middle; the language and currency button on
 * the inline-end side. A branch button, when the store has branches, sits
 * after the menu.
 *
 * The language / currency button opens the store's localization modal, which
 * `ThemeLayout` mounts, and the branch button opens the scopes modal, through
 * the same events the Twig theme dispatched. Colors are the Twig ones: the page
 * `--color-background` at rest, `header-text-color` on the lit header (see
 * `tallah-header.scss`).
 */
export function TallahTopnav() {
  const { store, currency } = useTwilight();
  const { languageName } = useTranslation();
  // `<salla-contacts>` fills its own DOM once the SDK is ready: after hydration only.
  const hydrated = useHydrated();
  const dispatch = (name: string, payload?: unknown) => window.salla?.event?.dispatch(name, payload);
  const currencySymbol = useCurrencySymbol(currency?.code, currency?.symbol);
  const localize = !!store?.settings?.is_multilingual || !!store?.settings?.currencies_enabled;

  return (
    <div className="tallah-topnav">
      <div className="tallah-topnav__row">
        {/* `<salla-menu>` renders its own wrapper, so the column is a div of ours. */}
        <div className="tallah-topnav__menu">
          <SallaMenu source="footer" topnav suppressHydrationWarning />
        </div>

        {store?.scope && (
          <button
            type="button"
            className="btn--rounded-gray"
            aria-haspopup="dialog"
            onClick={() => dispatch('scopes::open', { mode: 'default' })}
          >
            <i className="sicon-location rtl:ml-1 ltr:mr-1" aria-hidden="true" />
            {store.scope.name}
          </button>
        )}

        <div className="tallah-topnav__contacts">
          {hydrated && (store?.contacts?.phone || store?.contacts?.email) && (
            <SallaContacts contacts={store.contacts} isHeader />
          )}
        </div>

        {localize && (
          <div className="tallah-topnav__localize">
            <button type="button" aria-haspopup="dialog" onClick={() => dispatch('localization::open')}>
              <i className="sicon-world" aria-hidden="true" />
              <span className="tallah-topnav__lang">{languageName}</span>
              <span className="tallah-topnav__dash">-</span>
              <span className="tallah-topnav__currency">{currencySymbol}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

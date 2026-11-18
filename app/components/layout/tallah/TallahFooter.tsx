import { useState } from 'react';
import { SallaAppsIcons } from '@salla.sa/twilight-components-react/apps-icons';
import { SallaContacts } from '@salla.sa/twilight-components-react/contacts';
import { SallaMenu } from '@salla.sa/twilight-components-react/menu';
import { SallaPayments } from '@salla.sa/twilight-components-react/payments';
import { SallaSocial } from '@salla.sa/twilight-components-react/social';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { HookSlot } from '@salla.sa/twilight-theme-engine/hooks';
import { Image, Link } from '@salla.sa/twilight-theme-engine/common';
import { ImageModal } from '@salla.sa/twilight-theme-engine/modal';
import { useHydrated } from '../../../hooks/useHydrated';
import { hasPaymentContent } from '../../../lib/footerPayments';
import { Newsletter } from './Newsletter';
import { useTallahSettings } from './settings';

/** Salla's tax badge (70x70), a platform asset shared by every store. */
const TAX_ICON_URL =
  'https://cdn.salla.network/cdn-cgi/image/fit=scale-down,width=70,height=70,onerror=redirect,format=auto/images/tax.png?v=2.0.5';

const LOGO_SIZE: Record<string, string> = {
  small: 'w-[55px] md:w-[50px]',
  medium: 'w-[74px] md:w-[69px]',
  large: 'w-[100px] md:w-[95px]',
};

/** The tax number, with the certificate (when there is one) opening full size in a modal. */
function TaxNumber() {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const number = store.settings?.tax?.number;
  const certificate = store.settings?.tax?.certificate;
  if (!number) return null;

  // As the Twig's modal: the tax number titles it, "Tax Number" labels the button.
  const label = t('common.elements.tax_number', 'Tax Number');
  return (
    <div className="tallah-footer__tax" data-testid="tallah-footer-tax">
      {certificate && (
        <>
          <button type="button" aria-label={label} aria-haspopup="dialog" onClick={() => setOpen(true)}>
            <img src={TAX_ICON_URL} alt="" width={40} height={50} loading="lazy" decoding="async" />
          </button>
          <ImageModal isOpen={open} onClose={() => setOpen(false)} src={certificate} alt={number} title={number} />
        </>
      )}
      <div>
        <p>{t('common.elements.tax_number', 'Tax Number')}</p>
        <b>{number}</b>
      </div>
    </div>
  );
}

/**
 * TALLAH's footer (migrated from `components/footer/footer.twig`), used with
 * `header_layout` = `tallah`. Replaces the engine `Footer`, whose columns
 * layout can't be turned into this one with CSS alone.
 *
 * Band one, on the store's primary color: the footer menu, the contacts and the
 * store block (logo sized by `footer_logo_size`, description, social links),
 * then the newsletter signup when `newsletter_view` is on. Band two: payment
 * icons, the tax number and the app-store buttons. On phones the menu sits
 * beside the contacts and the store block comes first.
 *
 * The `footer:start` / `footer:end` hook slots stay for installed apps. The
 * Twig copyright line was commented out, so none is shown. Web components that
 * fill their own DOM once the SDK is ready render after hydration only.
 */
export function TallahFooter() {
  const { store } = useTwilight();
  const { t } = useTranslation();
  const { footerLogoSize, newsletter } = useTallahSettings();
  const isClient = useHydrated();

  const hasContacts = Boolean(store.contacts?.phone || store.contacts?.email);
  const hasApps = Boolean(store.apps?.appstore || store.apps?.googleplay);
  const pagesLinks = t('blocks.footer.pages_links', 'Pages');
  const hasPayments = hasPaymentContent(store.settings);
  const hasTax = Boolean(store.settings?.tax?.number);
  // A store with no payment icons, tax number or app buttons gets no empty padded band.
  const showBottom = hasPayments || hasTax || hasApps;

  return (
    <footer className="tallah-footer" suppressHydrationWarning>
      <HookSlot name="footer:start" />

      <div aria-label="footer" className="tallah-footer__inner">
        <div className="container tallah-footer__grid">
          <div className="tallah-footer__links">
            <h3>{pagesLinks}</h3>
            <SallaMenu source="footer" suppressHydrationWarning />
          </div>

          <div className="tallah-footer__contacts">
            <div className="tallah-footer__links-mobile">
              <h3>{pagesLinks}</h3>
              <SallaMenu source="footer" suppressHydrationWarning />
            </div>
            {hasContacts && isClient && <SallaContacts contacts={store.contacts} />}
          </div>

          <div className="tallah-footer__brand">
            <Link to="/" className="tallah-footer__logo-link">
              <span className={`tallah-footer__logo ${LOGO_SIZE[footerLogoSize] ?? LOGO_SIZE.medium}`}>
                <Image src={store.logo} alt={store.name || 'Store'} width={100} height={100} objectFit="contain" />
              </span>
            </Link>
            {store.description && (
              <div
                className="tallah-footer__description"
                // Merchant-authored HTML, as the Twig theme's `store.description|raw`.
                dangerouslySetInnerHTML={{ __html: store.description }}
              />
            )}
            <SallaSocial className="block mb-6" />
          </div>
        </div>

        {newsletter.show && <Newsletter url={newsletter.url} />}
      </div>

      {showBottom && (
        <div className="tallah-footer__bottom">
          <div className="container tallah-footer__bottom-inner">
            {hasPayments && (
              <div className="tallah-footer__payments">
                <SallaPayments />
              </div>
            )}
            <TaxNumber />
            {hasApps && (
              <div className="tallah-footer__apps">{isClient && <SallaAppsIcons apps={store.apps} />}</div>
            )}
          </div>
        </div>
      )}

      <HookSlot name="footer:end" />
    </footer>
  );
}

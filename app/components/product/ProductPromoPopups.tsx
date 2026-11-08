import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { imageSetting, localizedSetting } from '../../lib/localizedSetting';

/**
 * The two marketing popups of the original TALLAH product page (`assets/js/product.js`, settings read in
 * `layouts/master.twig`):
 *  - availability notification: out-of-stock products only (`out` / `out-and-notify`), 2s after the page opens,
 *    an email form posted (no-cors) to `newsletter_url_product`;
 *  - category offer: products of `collection_categories`, once the visitor has scrolled 600px, with a
 *    "don't remind me again" box remembered in `localStorage`.
 * Both are driven only by the existing `newsletter_*` / `collection_*` settings.
 */

const DONT_REMIND_KEY = 'collection_sp_modal_dont_remind';

type Lang = 'ar' | 'en';

const MESSAGES: Record<Lang, Record<string, string>> = {
  ar: {
    placeholder: 'أدخل بريدك الإلكتروني',
    button: 'إرسال',
    cancel: 'إلغاء',
    email: 'البريد الإلكتروني',
    dont_remind_me_again: 'لا تُذكرني مرة أخرى',
    close: 'إغلاق',
    notify_dialog: 'إشعار عند توفر المنتج',
    offer_dialog: 'عرض خاص',
    required: 'الرجاء إدخال بريد إلكتروني صحيح',
    invalid: 'صيغة البريد الإلكتروني غير صحيحة',
    sent: 'تم إرسال طلبك. شكراً لك',
    unavailable: 'الخدمة غير متاحة حالياً',
    sending: 'جاري الإرسال...',
  },
  en: {
    placeholder: 'Enter your email address',
    button: 'Send',
    cancel: 'Cancel',
    email: 'Email',
    dont_remind_me_again: 'Don’t remind me again',
    close: 'Close',
    notify_dialog: 'Notify me when available',
    offer_dialog: 'Special offer',
    required: 'Please enter a valid email',
    invalid: 'Invalid email format',
    sent: 'Your request has been sent. Thank you',
    unavailable: 'This service is currently unavailable',
    sending: 'Sending...',
  },
};

/** A switch setting: on unless the merchant switched it off (the manifest default is on). */
export function isSettingOn(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  return !(value === false || value === 0 || value === '' || value === '0' || value === 'false');
}

/** app.js `isUsableSubscriptionUrl`: the editor default and links back to the current page are not endpoints. */
export function isUsableSubscriptionUrl(value: unknown, current: URL | Location): boolean {
  if (typeof value !== 'string' || !value.trim()) return false;
  let url: URL;
  try {
    url = new URL(value, current.href);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  const isEditorDefault = url.hostname === 's.salla.sa' && url.pathname === '/' && !url.search;
  const isCurrentPage = url.origin === current.origin && url.pathname === current.pathname;
  return !isEditorDefault && !isCurrentPage;
}

/** `collection_categories` arrives as ids, `{ value }` items, or `{ value: [...] }` (Twig's shape). */
export function readCategoryIds(raw: unknown): number[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { value?: unknown }).value)
      ? ((raw as { value: unknown[] }).value as unknown[])
      : [];
  return list
    .map((item) => {
      if (item && typeof item === 'object') {
        const record = item as { value?: unknown; id?: unknown };
        return Number(record.value ?? record.id);
      }
      return Number(item);
    })
    .filter((id) => Number.isFinite(id));
}

type Notify = { info?: (m: string) => void; error?: (m: string) => void };
const notify = (): Notify => (window as unknown as { salla?: { notify?: Notify } }).salla?.notify ?? {};

function CloseButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute top-3 flex items-center justify-center right-3 font-bold w-[24px] h-[24px] text-[#71717B] transition"
    >
      <i className="sicon-cancel text-[16px] font-bold" aria-hidden="true"></i>
    </button>
  );
}

/** Shared shell: backdrop, dialog semantics, focus trap + restore, Esc and backdrop-click to close. */
function Modal({
  id,
  titleId,
  descriptionId,
  label,
  onClose,
  children,
}: {
  id: string;
  titleId: string;
  descriptionId: string;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  useDialogFocus(ref, entered);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      id={id}
      className={`fixed inset-0 z-[99] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-500 ${entered ? 'opacity-100' : 'opacity-0'}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-label={label}
        tabIndex={-1}
        className={`bg-background rounded-[10px] p-6 w-[90%] max-w-[580px] mb-4 relative transform transition-transform duration-500 shadow-xl ${entered ? 'scale-100' : 'scale-90'}`}
      >
        {children}
      </div>
    </div>
  );
}

function NotifyPopup({
  settings,
  lang,
  locale,
  onClose,
}: {
  settings: Record<string, unknown>;
  lang: Lang;
  locale: string;
  onClose: () => void;
}) {
  const m = MESSAGES[lang];
  const uid = useId();
  const titleId = `${uid}-notify-title`;
  const descId = `${uid}-notify-desc`;
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const url = settings.newsletter_url_product as string;
  const image = imageSetting(settings.newsletter_sp_add_image, locale);
  const title = localizedSetting(settings.newsletter_sp_block_title, locale);
  const subtitle = localizedSetting(settings.newsletter_sp_sub_title, locale);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Never submit (or report success) when no real URL is configured
    if (!isUsableSubscriptionUrl(url, window.location)) {
      notify().error?.(m.unavailable);
      return;
    }
    const value = email.trim();
    if (!value) {
      notify().error?.(m.required);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      notify().error?.(m.invalid);
      return;
    }
    setSending(true);
    // The request is sent in no-cors mode, so the reply cannot be read: only confirm that it was sent
    const body = new FormData();
    body.append('EMAIL', value);
    fetch(url, { method: 'POST', body, mode: 'no-cors' })
      .then(() => {
        notify().info?.(m.sent);
        setEmail('');
        onClose();
      })
      .catch(() => {
        notify().error?.(m.unavailable);
        setSending(false);
      });
  };

  return (
    <Modal id="newsletter_sp-modal" titleId={titleId} descriptionId={descId} label={m.notify_dialog} onClose={onClose}>
      {image && (
        <div className="w-[70px] h-[70px] mx-auto">
          <img src={image} alt="" className="w-full h-auto" />
        </div>
      )}
      <CloseButton label={m.close} onClick={onClose} />
      <div className="text-center">
        <h2 id={titleId} className="text-primary mb-1 font-semibold text-lg leading-7 tracking-normal text-center align-middle">
          {title}
        </h2>
        <p id={descId} className="text-[#71717B] font-medium text-sm leading-5 tracking-wide text-center align-middle">
          {subtitle}
        </p>
      </div>
      <form
        onSubmit={submit}
        noValidate
        className="flex flex-col items-center justify-center gap-2 rounded-[10px] p-1 w-full mx-auto"
      >
        <div className="my-8 w-full">
          <label htmlFor={`${uid}-email`} className="text-primary mb-1 font-semibold text-lg leading-7 tracking-normal text-center align-middle">
            {m.email}
          </label>
          <input
            type="email"
            name="EMAIL"
            id={`${uid}-email`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={m.placeholder}
            className="flex-1 bg-gray-100 w-full px-4 py-3 border-none text-gray-700 placeholder-gray-400 rounded-[10px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            required
          />
        </div>
        <div className="flex gap-3 w-full">
          <button
            type="submit"
            disabled={sending}
            className="flex items-center justify-center rounded-[4px] hover:scale-105 px-3 py-3 bg-primary text-background active:scale-95 transition-transform w-[50%]"
          >
            {sending ? m.sending : m.button}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-primary border border-primary bg-background rounded-[4px] flex items-center justify-center hover:scale-105 px-3 py-3 active:scale-95 transition-transform w-[50%]"
          >
            {m.cancel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function OfferPopup({
  settings,
  lang,
  locale,
  onClose,
}: {
  settings: Record<string, unknown>;
  lang: Lang;
  locale: string;
  onClose: (dontRemind: boolean) => void;
}) {
  const m = MESSAGES[lang];
  const uid = useId();
  const titleId = `${uid}-offer-title`;
  const descId = `${uid}-offer-desc`;
  const [dontRemind, setDontRemind] = useState(false);
  const close = useCallback(() => onClose(dontRemind), [onClose, dontRemind]);
  const image = imageSetting(settings.collection_add_image, locale);
  const footerImage = imageSetting(settings.collectionn_footer_image, locale);

  return (
    <Modal id="collection_sp-modal" titleId={titleId} descriptionId={descId} label={m.offer_dialog} onClose={close}>
      {image && (
        <div className="w-[70px] h-[70px] mx-auto">
          <img src={image} alt="" className="w-full h-auto" />
        </div>
      )}
      <CloseButton label={m.close} onClick={close} />
      <div className="text-center mt-2 mb-10">
        <h2 id={titleId} className="text-primary mb-1 font-semibold text-lg leading-7 tracking-normal text-center align-middle">
          {localizedSetting(settings.collection_sp_block_title, locale)}
        </h2>
        <p id={descId} className="text-[#71717B] font-medium text-sm leading-5 tracking-wide text-center align-middle">
          {localizedSetting(settings.collection_sp_sub_title, locale)}
        </p>
      </div>
      <p className="text-[#52525C] font-medium text-sm leading-5 tracking-wide text-center align-middle mb-4">
        {localizedSetting(settings.collection_sp_promo_title, locale)}
      </p>
      <div className="min-w-[194px] py-6 max-w-[194px] flex flex-col items-center justify-center mx-auto mb-10 rounded-md border-[color-mix(in_srgb,var(--color-primary)_20%,transparent)] bg-[color-mix(in_srgb,var(--color-primary)_5%,transparent)] border">
        {footerImage && (
          <div className="w-[32px] h-[32px] mx-auto mb-2">
            <img src={footerImage} alt="" className="w-full h-auto" />
          </div>
        )}
        <span className="font-normal text-sm leading-5 tracking-wide">
          &quot;{localizedSetting(settings.collection_title, locale)}&quot;
        </span>
      </div>
      <div className="flex items-center justify-start gap-2">
        <input
          type="checkbox"
          id={`${uid}-dont-remind`}
          checked={dontRemind}
          onChange={(e) => setDontRemind(e.target.checked)}
          className="w-4 h-4 text-primary bg-white border-gray-300 rounded focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]"
        />
        <label htmlFor={`${uid}-dont-remind`}>{m.dont_remind_me_again}</label>
      </div>
    </Modal>
  );
}

export function ProductPromoPopups({
  product,
  settings,
}: {
  product: Product;
  settings: Record<string, unknown>;
}) {
  const { locale } = useTranslation();
  const lang: Lang = locale === 'en' ? 'en' : 'ar';
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  const status = String((product as { status?: unknown }).status ?? '');
  const categoryId = Number((product as { category?: { id?: unknown } }).category?.id);
  const notifyEnabled =
    ['out', 'out-and-notify'].includes(status) && isSettingOn(settings.newsletter_sp_view_modal);
  const categories = readCategoryIds(settings.collection_categories);
  const offerEnabled =
    isSettingOn(settings.collection_sp_view_modal) &&
    Number.isFinite(categoryId) &&
    categories.includes(categoryId);

  // Availability notification: only with a real subscription URL, 2s after the page opens.
  useEffect(() => {
    if (!notifyEnabled || !isUsableSubscriptionUrl(settings.newsletter_url_product, window.location)) return;
    const timer = window.setTimeout(() => setNotifyOpen(true), 2000);
    return () => window.clearTimeout(timer);
  }, [notifyEnabled, settings.newsletter_url_product, product.id]);

  // Category offer: once, after 600px of scrolling, unless the visitor asked not to be reminded.
  useEffect(() => {
    if (!offerEnabled) return;
    try {
      if (window.localStorage.getItem(DONT_REMIND_KEY) === 'true') return;
    } catch {
      /* site data blocked: the popup is simply shown */
    }
    let shown = false;
    const onScroll = () => {
      if (shown || window.scrollY < 600) return;
      shown = true;
      setOfferOpen(true);
      window.removeEventListener('scroll', onScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [offerEnabled, product.id]);

  const closeOffer = useCallback((dontRemind: boolean) => {
    if (dontRemind) {
      try {
        window.localStorage.setItem(DONT_REMIND_KEY, 'true');
      } catch {
        /* a failing write must never keep the popup open */
      }
    }
    setOfferOpen(false);
  }, []);
  const closeNotify = useCallback(() => setNotifyOpen(false), []);

  return (
    <>
      {notifyOpen && <NotifyPopup settings={settings} lang={lang} locale={locale} onClose={closeNotify} />}
      {offerOpen && <OfferPopup settings={settings} lang={lang} locale={locale} onClose={closeOffer} />}
    </>
  );
}

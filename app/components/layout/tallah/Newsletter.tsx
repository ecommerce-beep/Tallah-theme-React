import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The Theme Editor default (`https://s.salla.sa`) and a link back to this very
 * page are not subscription endpoints: the form must neither send to them nor
 * claim success. (The Twig script also accepted relative values, resolving them
 * against the page; those are refused here.)
 */
function isUsableSubscriptionUrl(value: string): boolean {
  if (!value.trim()) return false;
  try {
    const url = new URL(value); // absolute only: a relative value would post to this very site
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    const isEditorDefault = url.hostname === 's.salla.sa' && url.pathname === '/' && !url.search;
    const isCurrentPage =
      url.origin === window.location.origin && url.pathname === window.location.pathname;
    return !isEditorDefault && !isCurrentPage;
  } catch {
    return false;
  }
}

/**
 * Footer newsletter signup: posts the email, as the form field `EMAIL`, to the
 * merchant's `newsletter_url` (a Mailchimp-style endpoint). The request is
 * `no-cors`, so the reply can't be read: the notice says the request was sent,
 * not that the address was subscribed.
 */
export function Newsletter({ url }: { url: string }) {
  const { t } = useTranslation();
  const [sending, setSending] = useState(false);

  const notify = (kind: 'error' | 'info', message: string) => window.salla?.notify?.[kind]?.(message);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get('EMAIL') ?? '').trim();

    if (!isUsableSubscriptionUrl(url)) {
      notify('error', t('footer.newsletter_unavailable', 'Subscription is currently unavailable'));
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      notify('error', t('footer.newsletter_invalid', 'Please enter a valid email'));
      return;
    }

    setSending(true);
    try {
      await fetch(url, { method: 'POST', body: new FormData(form), mode: 'no-cors' });
      notify('info', t('footer.newsletter_sent', 'Your subscription request has been sent. Thank you'));
      form.reset();
    } catch {
      notify('error', t('footer.newsletter_failed', 'An error occurred during subscription'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="tallah-newsletter">
      <div className="container tallah-newsletter__inner">
        <h2>{t('footer.newsletter_title', 'Register your email and receive our latest news and offers')}</h2>
        <form onSubmit={onSubmit} noValidate>
          <input
            type="email"
            name="EMAIL"
            autoComplete="email"
            aria-label={t('footer.newsletter_input_placeholder', 'Enter your email')}
            placeholder={t('footer.newsletter_input_placeholder', 'Enter your email')}
          />
          {/* the label comes from the store's language pack, which can land after the server render */}
          <button type="submit" disabled={sending} suppressHydrationWarning>
            {sending
              ? t('footer.newsletter_sending', 'Sending...')
              : t('footer.newsletter_button', 'Subscribe')}
          </button>
        </form>
      </div>
    </div>
  );
}

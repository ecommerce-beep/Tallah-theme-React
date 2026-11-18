/** The slice of the store settings `<salla-payments>` draws from. */
interface PaymentSettings {
  payments?: string[] | null;
  made_in_ksa?: boolean;
  certificate?: { id?: string | number | null } | null;
}

/**
 * Whether `<salla-payments>` has anything to show. It lists `store.settings.payments`, plus the
 * Made-in-KSA and commercial-certificate badges (which appear even with no payment methods).
 * A missing `payments` list renders nothing, so it counts as empty, never as "unknown".
 */
export function hasPaymentContent(settings: PaymentSettings | null | undefined): boolean {
  return Boolean(settings?.payments?.length || settings?.made_in_ksa || settings?.certificate?.id);
}

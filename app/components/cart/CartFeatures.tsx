import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { imageSetting, localizedSetting, safeHref } from '../../lib/localizedSetting';

export interface CartFeature {
  image: string;
  content: string;
  href: string;
}

/**
 * `cart_page_features` (a `collection`, at most 3) as `cart.twig` reads it: an optional image, a per-language
 * text and an optional link. Item fields arrive under the bare name or the collection-prefixed one.
 */
export function readCartFeatures(raw: unknown, locale: string): CartFeature[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const record = (item ?? {}) as Record<string, unknown>;
      const field = (name: string) => record[name] ?? record[`cart_page_features.${name}`];
      return {
        image: imageSetting(field('cart_features_image'), locale),
        content: localizedSetting(field('cart_features_content'), locale).trim(),
        href: safeHref(field('cart_features_link')),
      };
    })
    .filter((feature) => feature.content || feature.image)
    .slice(0, 3);
}

/** The merchant's store features under the order summary (`features_switch_cart` on, none set → nothing). */
export function CartFeatures({ features }: { features: CartFeature[] }) {
  const { t } = useTranslation();
  if (features.length === 0) return null;
  return (
    <ul className="cart-features" aria-label={t('pages.cart.features', 'Store features')}>
      {features.map((feature, index) => {
        const text = feature.href ? (
          <Link to={feature.href} className="cart-features__text">
            {feature.content}
          </Link>
        ) : (
          <span className="cart-features__text">{feature.content}</span>
        );
        return (
          <li key={`${feature.content}-${index}`} className="cart-features__item">
            {feature.image && (
              <img src={feature.image} alt="" className="cart-features__image" loading="lazy" />
            )}
            {text}
          </li>
        );
      })}
    </ul>
  );
}

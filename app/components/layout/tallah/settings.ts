import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { imageSetting, localizedSetting, safeHref } from '../../../lib/localizedSetting';

/** The Theme Editor ids this theme's header and footer read (see `twilight.json`). */
export interface TallahSettings {
  header_layout?: unknown;
  'header-background-color'?: string;
  'header-text-color'?: string;
  'header-hover'?: boolean;
  header_is_sticky?: boolean;
  'advanced-menu'?: boolean;
  add_another_logo?: boolean;
  another_logo_img?: unknown;
  'header-topnav-background'?: string;
  'header-topnav-text-color'?: string;
  'header-topnav-text'?: unknown;
  'header-topnav-special-text'?: unknown;
  'header-topnav-special-text-color'?: string;
  header_topnav_icon_url?: string;
  header_topnav_link_url?: unknown;
  icon_color?: string;
  'header-topnav-count-down'?: string | null;
  'count-down-background'?: string;
  'count-down-text-color'?: string;
  'trending-search-keywords'?: unknown;
  popular_categories?: unknown;
  cart_icon_choose?: boolean;
  cart_icon_type?: unknown;
  enable_side_cart?: boolean;
  cart_display_type?: unknown;
  footer_logo_size?: unknown;
  newsletter_view?: boolean;
  newsletter_url?: string;
}

/** A dropdown setting arrives as a string, or `[{ value }]`. */
export function dropdownValue(raw: unknown): string {
  const first = Array.isArray(raw) ? raw[0] : raw;
  if (typeof first === 'string') return first;
  return (first as { value?: string } | undefined)?.value ?? '';
}

export interface TrendingKeyword {
  keyword: string;
}

export interface PopularCategory {
  image: string;
  link: string;
}

/** Collection items arrive keyed by the field id, bare or prefixed with the collection id. */
function field(item: unknown, id: string, collection: string): unknown {
  const record = (item ?? {}) as Record<string, unknown>;
  return record[id] ?? record[`${collection}.${id}`];
}

export function useTallahSettings() {
  const { theme } = useTwilight();
  const { locale } = useTranslation();
  const s = (theme?.settings ?? {}) as TallahSettings;

  const trendingRaw = s['trending-search-keywords'];
  const trending: TrendingKeyword[] = (Array.isArray(trendingRaw) ? trendingRaw : [])
    .map((item) => ({
      keyword: localizedSetting(field(item, 'search-keyword', 'trending-search-keywords'), locale).trim(),
    }))
    .filter((item) => item.keyword !== '');

  const popularRaw = s.popular_categories;
  const popular: PopularCategory[] = (Array.isArray(popularRaw) ? popularRaw : [])
    .map((item) => ({
      image: imageSetting(field(item, 'popular_categories_image', 'popular_categories'), locale),
      link: safeHref(
        localizedSetting(field(item, 'popular_categories_link', 'popular_categories'), locale)
      ),
    }))
    .filter((item) => item.image !== '');

  const headerBg = s['header-background-color'] || '#ffffff';
  const headerText = s['header-text-color'] || '#000000';
  const hover = s['header-hover'] !== false;

  return {
    locale,
    headerBg,
    headerText,
    hover,
    // Same default as the Raed header: on unless the merchant switched it off.
    sticky: s.header_is_sticky !== false,
    advancedMenu: s['advanced-menu'] === true,
    secondaryLogo: s.add_another_logo && imageSetting(s.another_logo_img, locale) ? imageSetting(s.another_logo_img, locale) : '',
    trending,
    popular,
    // The cart drawer needs both switches, as `cart_options.twig` checked.
    sideCart: s.enable_side_cart === true && (dropdownValue(s.cart_display_type) || 'side') === 'side',
    cartIcon: s.cart_icon_choose ? dropdownValue(s.cart_icon_type) || 'cart_1' : 'cart_1',
    footerLogoSize: dropdownValue(s.footer_logo_size) || 'medium',
    newsletter: { show: s.newsletter_view !== false, url: s.newsletter_url ?? '' },
    topLace: {
      bg: s['header-topnav-background'] || 'var(--600, #000)',
      color: localizedSetting(s['header-topnav-text-color'], locale),
      text: localizedSetting(s['header-topnav-text'], locale),
      special: localizedSetting(s['header-topnav-special-text'], locale),
      specialColor: s['header-topnav-special-text-color'] || '#666666',
      href: safeHref(localizedSetting(s.header_topnav_link_url, locale)),
      icon: /^[a-z0-9-]+$/i.test(s.header_topnav_icon_url ?? '') ? s.header_topnav_icon_url : '',
      iconColor: s.icon_color,
      countdown: s['header-topnav-count-down'] ?? null,
      countdownBg: s['count-down-background'] || '#3f3f46',
      countdownText: s['count-down-text-color'] || '#ffffff',
    },
  };
}

import type { ReactNode } from 'react';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useCountdown } from '../../../hooks/useCountdown';
import { useTallahSettings } from './settings';

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-baseline gap-0.5">
      <span className="text-sm font-bold">{value}</span>
      <span className="text-xs">{label}</span>
    </span>
  );
}

/**
 * The announcement bar above the header (`.top-lace` in `header.twig`): a strip
 * 38px tall in `header-topnav-background`, its content centered: the countdown,
 * the text (from `lg` up), the highlighted text and the icon, in that order. The
 * whole strip is a link when `header_topnav_link_url` is set.
 *
 * Like the Twig theme, the strip is always drawn, empty or not; every part of it
 * is a Theme Editor setting. The countdown is the one part that can vanish: it
 * shows only while its date is in the future.
 */
export function TopLace() {
  const { t } = useTranslation();
  const { topLace } = useTallahSettings();
  const left = useCountdown(topLace.countdown);

  const body: ReactNode = (
    <div
      className="tallah-top-lace"
      style={{ background: topLace.bg, color: topLace.color || undefined }}
    >
      <div className="tallah-top-lace__center">
        <div className="tallah-top-lace__row">
          {left && (
            <span
              className="tallah-top-lace__countdown"
              style={{ background: topLace.countdownBg, color: topLace.countdownText }}
              aria-hidden="true"
            >
              <Unit value={left.days} label={t('blocks.header.day', 'd')} />
              <span className="text-sm">:</span>
              <Unit value={left.hours} label={t('blocks.header.hour', 'h')} />
              <span className="text-sm">:</span>
              <Unit value={left.minutes} label={t('blocks.header.minute', 'm')} />
              <span className="text-sm">:</span>
              <Unit value={left.seconds} label={t('blocks.header.second', 's')} />
            </span>
          )}
          <span className="tallah-top-lace__text" style={{ color: topLace.color || undefined }}>
            {topLace.text}
          </span>
          <span className="tallah-top-lace__special" style={{ color: topLace.specialColor }}>
            {topLace.special}
          </span>
          <span className="tallah-top-lace__icon-box">
            {topLace.icon && (
              <i className={`${topLace.icon} text-sm`} style={{ color: topLace.iconColor }} aria-hidden="true" />
            )}
          </span>
        </div>
      </div>
    </div>
  );

  return topLace.href ? (
    <a href={topLace.href} target="_blank" rel="noopener noreferrer" className="block no-underline">
      {body}
    </a>
  ) : (
    body
  );
}

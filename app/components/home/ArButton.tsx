import type { CSSProperties } from 'react';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { colorVar } from '../../lib/arBlock';

export interface ArButtonProps {
  text: string;
  /** Already a safe address (`linkSetting` / `safeHref`); empty renders a link-less button. */
  href: string;
  /** Text and border color. */
  color?: string;
  /** Fill color; it becomes the text color on hover. */
  bg?: string;
  /** `transparent_button`: no fill until hover. */
  transparent?: boolean;
  className?: string;
}

/**
 * The outlined / filled button of TALLAH's `AR-*` banners. The Twig wrote its colors into
 * a per-block `<style>`; here they are variables on the button
 * (`styles/04-components/tallah-home.scss`), and an unset one falls back to the theme's look.
 */
export function ArButton({ text, href, color, bg, transparent, className = '' }: ArButtonProps) {
  const style = { '--ar-btn-color': colorVar(color), '--ar-btn-bg': colorVar(bg) } as CSSProperties;
  return (
    <Link
      to={href || '#'}
      className={`button ar-btn${transparent ? ' ar-btn--transparent' : ''} ${className}`.trim()}
      style={style}
    >
      {text}
    </Link>
  );
}

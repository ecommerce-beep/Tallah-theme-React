import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { menu } from '@salla.sa/twilight-theme-engine/api/menu';
import type { MenuItem } from '@salla.sa/twilight-theme-engine/types';
import { useDialogFocus } from '../../../hooks/useDialogFocus';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { pruneUntitled } from '../../../lib/menuOverflow';

const NO_ITEMS: MenuItem[] = [];

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 7L15 12L10 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  /** `advanced-menu`: children with their own children open a sub-panel. */
  advanced: boolean;
}

/**
 * The mobile menu (`< lg`): root links as tabs, the active one's children
 * below. With `advanced-menu`, a child that has children opens a second panel
 * (sliding in over it) listing them, with up to three images.
 *
 * It slides in from the inline-start under the header bar over a dimmed page.
 * `inert` while closed, scroll is locked while open, and Escape / the backdrop
 * close it. Sits in the bar's own stacking context, so the burger stays visible.
 */
export function MobileMenu({ open, onClose, advanced }: MobileMenuProps) {
  const { t } = useTranslation();
  const { data: rawItems = NO_ITEMS } = useQuery(menu.queries.header());
  const items = useMemo(() => pruneUntitled(rawItems), [rawItems]);
  const [tab, setTab] = useState(0);
  const [sub, setSub] = useState<MenuItem | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useScrollLock(open);
  useDialogFocus(panelRef, open);

  useEffect(() => {
    if (!open) {
      setSub(null);
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const current = items[Math.min(tab, items.length - 1)];
  const children = pruneUntitled(current?.children ?? NO_ITEMS);
  const subItems = sub ? pruneUntitled(sub.children ?? NO_ITEMS) : NO_ITEMS;
  const images = subItems.filter((item) => item.image).slice(0, 3);
  const showAll = t('blocks.header.show_all', 'Show all');
  const shopAll = t('blocks.header.shop_all', 'Shop all');

  return (
    <div
      className={`tallah-mobile-menu${open ? ' is-open' : ''}`}
      inert={!open}
      data-testid="tallah-mobile-menu"
    >
      <button
        type="button"
        className="tallah-mobile-menu__backdrop"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="tallah-mobile-menu__panel"
        role="dialog"
        aria-modal="true"
        aria-label={t('blocks.header.main_menu', 'Menu')}
        tabIndex={-1}
      >
        <div className="tallah-mobile-menu__tabs" role="tablist">
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={index === tab}
              className={index === tab ? 'is-active' : undefined}
              onClick={() => {
                setTab(index);
                setSub(null);
              }}
            >
              {item.title}
            </button>
          ))}
        </div>

        <div className="tallah-mobile-menu__content" role="tabpanel">
          {current && children.length === 0 ? (
            <Link to={current.url} className="tallah-mobile-menu__row" onClick={onClose}>
              {showAll}
            </Link>
          ) : (
            children.map((child) => {
              const hasSub = advanced && pruneUntitled(child.children ?? NO_ITEMS).length > 0;
              return (
                <div key={child.id} className="tallah-mobile-menu__row">
                  <Link to={child.url} onClick={onClose}>
                    {child.title}
                  </Link>
                  {hasSub && (
                    <button
                      type="button"
                      aria-label={child.title}
                      aria-haspopup="true"
                      onClick={() => setSub(child)}
                    >
                      <ChevronIcon className="rtl:rotate-180" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className={`tallah-mobile-menu__sub${sub ? ' is-open' : ''}`} inert={!sub}>
          {sub && (
            <>
              <button type="button" className="tallah-mobile-menu__back" onClick={() => setSub(null)}>
                <ChevronIcon className="ltr:rotate-180" />
                <span>{sub.title}</span>
              </button>
              <ul>
                {subItems.length === 0 ? (
                  <li>
                    <Link to={sub.url} onClick={onClose}>
                      {shopAll}
                    </Link>
                  </li>
                ) : (
                  subItems.map((item) => (
                    <li key={item.id}>
                      <Link to={item.url} onClick={onClose}>
                        {item.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
              {images.length > 0 && (
                <div className="tallah-mobile-menu__images">
                  {images.map((item) => (
                    <Link key={item.id} to={item.url} onClick={onClose}>
                      <img src={item.image ?? ''} alt={item.title} loading="lazy" />
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
}

interface BranchProps {
  items: MenuItem[];
  expanded: ReadonlySet<string | number>;
  onToggle: (id: string | number) => void;
  onNavigate: () => void;
  idPrefix: string;
  toggleLabel: (title: string) => string;
}

/** One level of the list; an item with children gets a toggle beside its link and a nested level under it. */
function Branch({ items, expanded, onToggle, onNavigate, idPrefix, toggleLabel }: BranchProps) {
  return (
    <ul className="tallah-mobile-menu__list">
      {items.map((item) => {
        const children = pruneUntitled(item.children ?? NO_ITEMS);
        const isOpen = expanded.has(item.id);
        const panelId = `${idPrefix}-${item.id}`;
        return (
          <li key={item.id} className="tallah-mobile-menu__item">
            <div className="tallah-mobile-menu__row">
              <Link to={item.url} onClick={onNavigate}>
                {item.title}
              </Link>
              {children.length > 0 && (
                <button
                  type="button"
                  className="tallah-mobile-menu__toggle"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  aria-label={toggleLabel(item.title)}
                  onClick={() => onToggle(item.id)}
                >
                  <ChevronIcon />
                </button>
              )}
            </div>
            {children.length > 0 && (
              <div id={panelId} hidden={!isOpen} className="tallah-mobile-menu__children">
                <Branch
                  items={children}
                  expanded={expanded}
                  onToggle={onToggle}
                  onNavigate={onNavigate}
                  idPrefix={idPrefix}
                  toggleLabel={toggleLabel}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The mobile menu (`< lg`): the store's header menu as one vertical list. A link with
 * children has a toggle beside it that opens them (nested, as deep as the menu goes)
 * beneath it; the link itself still goes to the category.
 *
 * It slides in from the inline-start under the header bar over a dimmed page, as a modal
 * drawer: `inert` while closed, scroll locked and focus kept inside while open, and
 * Escape / the backdrop close it, returning focus to the burger. Sits in the bar's own
 * stacking context, so the burger stays visible.
 */
export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const { t } = useTranslation();
  const { data: rawItems = NO_ITEMS } = useQuery(menu.queries.header());
  const items = useMemo(() => pruneUntitled(rawItems), [rawItems]);
  const [expanded, setExpanded] = useState<ReadonlySet<string | number>>(() => new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const idPrefix = useId();

  useScrollLock(open);
  useDialogFocus(panelRef, open);

  useEffect(() => {
    if (!open) {
      setExpanded(new Set());
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const toggle = (id: string | number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleLabel = (title: string) => t('blocks.header.toggle_submenu', 'Show or hide :name sub-categories').replace(':name', title);

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
        <nav className="tallah-mobile-menu__content" aria-label={t('blocks.header.main_menu', 'Menu')}>
          <Branch
            items={items}
            expanded={expanded}
            onToggle={toggle}
            onNavigate={onClose}
            idPrefix={idPrefix}
            toggleLabel={toggleLabel}
          />
        </nav>
      </div>
    </div>
  );
}

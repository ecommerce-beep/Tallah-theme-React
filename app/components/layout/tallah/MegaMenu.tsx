import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { menu } from '@salla.sa/twilight-theme-engine/api/menu';
import type { MenuItem } from '@salla.sa/twilight-theme-engine/types';
import { fitCount, pruneUntitled, splitMenu } from '../../../lib/menuOverflow';

const NO_ITEMS: MenuItem[] = [];
const CLOSE_DELAY_MS = 200;

/** Layout effects measure before paint; on the server there is nothing to measure. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** What one measurement of the full, one-line menu found. */
interface Measured {
  /** Which menu it measured, so a changed menu is measured again. */
  key: string;
  widths: number[];
  more: number;
  gap: number;
}

const menuKey = (items: MenuItem[]) =>
  items.map((item) => `${String(item.id)}:${item.title}:${item.children?.length ? 1 : 0}`).join('|');

/** A root link with nothing to open goes where it says; `#` or none goes nowhere. */
const isInert = (url?: string) => !url || url === '#';

interface MegaMenuProps {
  /** `advanced-menu`: the full-width panel with sub-categories and images. Off: a compact dropdown. */
  advanced: boolean;
  /** Tells the header a panel is open, so the bar takes its "active" colors. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * The header's desktop menu (`lg+`): the store's header menu as tabs with an
 * underline that grows on the active one. Hovering or focusing a tab opens its
 * panel; leaving the tabs and panel, or Escape, closes it after a short delay.
 *
 * - **advanced** (`advanced-menu`): a panel the full width of the bar. The first
 *   column lists the tab's children, the rest shows the sub-links of the one
 *   under the pointer, with up to three images.
 * - otherwise: a narrow dropdown under the tab listing its children.
 *
 * The panels are descendants of the tab list so keyboard focus moves into them
 * in reading order, and sit absolutely under the bar (the header's inner row is
 * their containing block), so they follow the bar when it pins on scroll.
 */
export function MegaMenu({ advanced, onOpenChange }: MegaMenuProps) {
  const { t } = useTranslation();
  const { data: rawItems = NO_ITEMS } = useQuery(menu.queries.header());
  const allItems = useMemo(() => pruneUntitled(rawItems), [rawItems]);

  // Keep the tabs on one line: the whole menu is measured once, before paint, then
  // the tabs that do not fit go under a last "More" tab as its children.
  const key = useMemo(() => menuKey(allItems), [allItems]);
  const rowRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const probeRef = useRef<HTMLLIElement>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const [available, setAvailable] = useState(0);
  const current = measured?.key === key ? measured : null;
  const fit = current ? fitCount(current.widths, available, current.more, current.gap) : allItems.length;
  const moreTitle = t('common.titles.more', 'More');
  const items = useMemo(
    () => (current ? splitMenu(allItems, fit, moreTitle) : allItems),
    [current, allItems, fit, moreTitle]
  );

  // Below `lg` the menu is hidden and measures 0: wait until the row has a width.
  useIsomorphicLayoutEffect(() => {
    const row = rowRef.current;
    const list = listRef.current;
    if (current || !row || !list || !allItems.length) return;
    const width = row.clientWidth;
    setAvailable(width);
    if (width === 0) return;
    setMeasured({
      key,
      widths: Array.from(list.querySelectorAll<HTMLElement>(':scope > .tallah-menu__tab'), (li) => li.getBoundingClientRect().width),
      more: probeRef.current?.getBoundingClientRect().width ?? 0,
      gap: parseFloat(getComputedStyle(list).columnGap) || 0,
    });
  }, [current, allItems, key, available]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setAvailable(row.clientWidth));
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  // Text measured before the web font loaded is narrower than it will be.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts || document.fonts.status === 'loaded') return;
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) setMeasured(null);
    });
    return () => {
      active = false;
    };
  }, []);

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [childIndex, setChildIndex] = useState(0);
  // Where the compact dropdown starts, measured from the bar's inline-start edge to its tab's.
  const [dropdownOffset, setDropdownOffset] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);

  const cancelClose = useCallback(() => clearTimeout(closeTimer.current), []);
  const close = useCallback(() => {
    cancelClose();
    setOpenIndex(null);
  }, [cancelClose]);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenIndex(null), CLOSE_DELAY_MS);
  }, [cancelClose]);
  const open = useCallback(
    (index: number) => {
      cancelClose();
      const tab = rootRef.current?.querySelector<HTMLElement>(`[data-tab="${index}"]`);
      const bar = rootRef.current?.closest<HTMLElement>('.tallah-header__inner');
      if (tab && bar) {
        const t = tab.getBoundingClientRect();
        const b = bar.getBoundingClientRect();
        setDropdownOffset(Math.max(0, Math.round(getComputedStyle(tab).direction === 'rtl' ? b.right - t.right : t.left - b.left)));
      }
      setOpenIndex((current) => {
        if (current !== index) setChildIndex(0);
        return index;
      });
    },
    [cancelClose]
  );

  useEffect(() => cancelClose, [cancelClose]);
  useEffect(() => {
    onOpenChange?.(openIndex !== null);
  }, [openIndex, onOpenChange]);

  // Client-side navigation keeps the header mounted; shut the panel when a link is followed.
  const onRootClick = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a[href]')) close();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || openIndex === null) return;
    event.stopPropagation();
    const tab = rootRef.current?.querySelector<HTMLElement>(`[data-tab="${openIndex}"] > a`);
    close();
    tab?.focus();
  };

  const onBlur = (event: FocusEvent) => {
    if (!rootRef.current?.contains(event.relatedTarget as Node | null)) scheduleClose();
  };

  if (!items.length) return <div className="tallah-menu" aria-hidden="true" />;

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        rowRef.current = node;
      }}
      className="tallah-menu"
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onClick={onRootClick}
    >
      <ul ref={listRef} className="tallah-menu__tabs">
        {items.map((item, index) => {
          const children = pruneUntitled(item.children ?? NO_ITEMS);
          const isOpen = openIndex === index && children.length > 0;
          return (
            <li
              key={item.id}
              data-tab={index}
              className={`tallah-menu__tab${isOpen ? ' is-open' : ''}${
                !advanced && children.length ? ' has-dropdown' : ''
              }`}
              // A tab with nothing to open leaves the current panel as it is (as `custom-menu.js`).
              onMouseEnter={() => (children.length ? open(index) : cancelClose())}
              // Focus bubbles from the link, so a keyboard user opens the panel too.
              onFocus={() => (children.length ? open(index) : close())}
            >
              <Link
                to={isInert(item.url) ? '#' : item.url}
                className="tallah-menu__link"
                aria-haspopup={children.length ? 'true' : undefined}
                aria-expanded={children.length ? isOpen : undefined}
                onClick={(event) => {
                  if (isInert(item.url)) event.preventDefault();
                }}
              >
                {item.title}
              </Link>
              <span className="tallah-menu__underline" aria-hidden="true" />

            </li>
          );
        })}
      </ul>

      {/* Sizes the "More" tab before it exists. */}
      <ul className="tallah-menu__probe" aria-hidden="true">
        <li ref={probeRef} className="tallah-menu__tab">
          <span className="tallah-menu__link">{moreTitle}</span>
        </li>
      </ul>

      {!advanced && openIndex !== null && (
        <Dropdown items={pruneUntitled(items[openIndex]?.children ?? NO_ITEMS)} offset={dropdownOffset} />
      )}

      {advanced && openIndex !== null && (
        <MegaPanel
          parent={items[openIndex]}
          activeIndex={childIndex}
          onActivate={setChildIndex}
          shopAll={t('blocks.header.shop_all', 'Shop All')}
        />
      )}
    </div>
  );
}

/** The compact dropdown under a tab (`advanced-menu` off). */
function Dropdown({ items, offset }: { items: MenuItem[]; offset: number }) {
  if (!items.length) return null;
  return (
    <div className="tallah-menu__dropdown" style={{ insetInlineStart: offset }}>
      <ul>
        {items.map((child) => (
          <li key={child.id}>
            {child.image && <img src={child.image} alt="" width={28} height={28} loading="lazy" />}
            <Link to={child.url}>{child.title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MegaPanel({
  parent,
  activeIndex,
  onActivate,
  shopAll,
}: {
  parent: MenuItem;
  activeIndex: number;
  onActivate: (index: number) => void;
  shopAll: string;
}) {
  const children = pruneUntitled(parent.children ?? NO_ITEMS);
  const active = children[Math.min(activeIndex, children.length - 1)];
  if (!active) return null;

  const subItems = pruneUntitled(active.children ?? NO_ITEMS);
  const columns = subItems.length > 10 ? 2 : 1;
  const perColumn = Math.max(1, Math.ceil(subItems.length / columns));
  const images = subItems.filter((sub) => sub.image).slice(0, 3);

  return (
    <div className="tallah-mega" data-testid="tallah-mega-panel">
      <ul className="tallah-mega__children">
        {children.map((child, index) => (
          <li key={child.id} onMouseEnter={() => onActivate(index)} onFocus={() => onActivate(index)}>
            <Link to={child.url}>
              {child.title}
            </Link>
          </li>
        ))}
      </ul>

      <div className="tallah-mega__content">
        <div className="tallah-mega__title">{active.title}</div>
        <div className="tallah-mega__body">
          <div className="tallah-mega__columns">
            {subItems.length === 0 ? (
              <ul>
                <li>
                  <Link to={active.url}>{shopAll}</Link>
                </li>
              </ul>
            ) : (
              Array.from({ length: columns }, (_, column) => (
                <ul key={column}>
                  {subItems.slice(column * perColumn, (column + 1) * perColumn).map((sub) => (
                    <li key={sub.id}>
                      <Link to={sub.url}>{sub.title}</Link>
                    </li>
                  ))}
                </ul>
              ))
            )}
          </div>
          {images.length > 0 && (
            <div className="tallah-mega__images">
              {images.map((sub) => (
                <Link key={sub.id} to={sub.url}>
                  <img src={sub.image ?? ''} alt={sub.title} loading="lazy" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

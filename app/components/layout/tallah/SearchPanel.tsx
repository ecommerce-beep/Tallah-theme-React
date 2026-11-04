import { useEffect, useId, useState } from 'react';
import type { RefObject } from 'react';
import type { KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { useMoney } from '@salla.sa/twilight-theme-engine/hooks';
import { product } from '@salla.sa/twilight-theme-engine/api/product';
import type { Product } from '@salla.sa/twilight-theme-engine/types';
import { SearchIcon } from '../../icons';
import { useTallahSettings } from './settings';

const DEBOUNCE_MS = 200;
const MAX_RESULTS = 8;

const isValid = (value: unknown) => Number.isFinite(Number(value)) && Number(value) > 0;

function useDebounced(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** The suggestion's price: the sale price (old one struck through), else the plain one. */
function ResultPrice({ item }: { item: Product }) {
  const { format } = useMoney();
  if (item.is_on_sale) {
    const current = [item.sale_price, item.price].find(isValid);
    if (current !== undefined) {
      const original =
        isValid(item.regular_price) && Number(item.regular_price) > Number(current);
      return (
        <>
          <span className="font-medium text-gray-900">{format(Number(current))}</span>
          {original && <span className="ms-1 line-through">{format(Number(item.regular_price))}</span>}
        </>
      );
    }
  }
  if (isValid(item.price)) return <>{format(Number(item.price))}</>;
  return null;
}

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  /** The header owns it, to focus the field inside the click that opens the panel. */
  inputRef: RefObject<HTMLInputElement | null>;
}

/**
 * The header's search panel: it slides down from the bar, with a live-suggestions
 * field (`product.queries.list` with `source: 'search'`), the merchant's trending
 * keywords and popular-category images. The field is a combobox; arrow keys move
 * through the suggestions, Enter opens the highlighted one (never one nobody
 * picked), and Escape closes the suggestions first, then the panel.
 */
export function SearchPanel({ open, onClose, inputRef }: SearchPanelProps) {
  const { t } = useTranslation();
  const { trending, popular } = useTallahSettings();
  const listId = useId();
  const [text, setText] = useState('');
  const [suggestionsHidden, setSuggestionsHidden] = useState(false);
  const [active, setActive] = useState(-1);
  const term = useDebounced(text.trim(), DEBOUNCE_MS);

  const { data, isFetching } = useQuery({
    ...product.queries.list({ source: 'search', keyword: term, perPage: MAX_RESULTS }),
    enabled: open && term.length > 0,
  });
  const results = term && !suggestionsHidden ? (data?.items ?? []) : [];
  const showEmpty = Boolean(term) && !suggestionsHidden && !isFetching && data && results.length === 0;
  const expanded = results.length > 0;

  // Reset on close. (Focus is moved by the header, inside the opening click.)
  useEffect(() => {
    if (open) return;
    setText('');
    setActive(-1);
    setSuggestionsHidden(false);
  }, [open]);

  const change = (value: string) => {
    setText(value);
    setActive(-1);
    setSuggestionsHidden(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!expanded) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) =>
        current === -1
          ? step === 1
            ? 0
            : results.length - 1
          : (current + step + results.length) % results.length
      );
    } else if (event.key === 'Enter') {
      if (expanded && results[active]) {
        event.preventDefault();
        document.getElementById(`${listId}-${active}`)?.querySelector('a')?.click();
      }
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      if (expanded || showEmpty) setSuggestionsHidden(true);
      else onClose();
    }
  };

  return (
    <div
      className={`tallah-search${open ? ' is-open' : ''}`}
      aria-hidden={!open}
      inert={!open}
      id="tallah-search-panel"
      data-testid="tallah-search-panel"
    >
      <div className="tallah-search__panel">
        <div className="tallah-search__inner">
          <div className="tallah-search__field">
            <SearchIcon aria-hidden="true" className="tallah-search__icon" />
            <div className="relative w-full">
              <input
                ref={inputRef}
                type="text"
                value={text}
                placeholder={t('blocks.header.search_label', 'Search')}
                aria-label={t('blocks.header.search_label', 'Search')}
                role="combobox"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-controls={listId}
                aria-expanded={expanded}
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                onChange={(event) => change(event.target.value)}
                onKeyDown={onKeyDown}
                className="tallah-search__input"
              />
              <div className="tallah-search__results" hidden={!expanded && !showEmpty}>
                <ul
                  id={listId}
                  role="listbox"
                  aria-label={t('blocks.header.search_label', 'Search')}
                  // A click must not move focus out of the field; links still open normally.
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {results.map((item, index) => (
                    <li
                      key={item.id}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={index === active}
                      className={index === active ? 'is-active' : undefined}
                    >
                      <Link to={item.url} onClick={onClose}>
                        {item.image?.url ? (
                          <img src={item.image.url} alt="" width={40} height={40} loading="lazy" />
                        ) : (
                          <span className="tallah-search__noimg" />
                        )}
                        <span>
                          <span className="tallah-search__name">{item.name}</span>
                          <span className="tallah-search__price">
                            <ResultPrice item={item} />
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {showEmpty && (
                  <div className="tallah-search__empty" role="status">
                    {t('blocks.header.no_results', 'No results found')}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="tallah-search__extras">
          {trending.length > 0 && (
            <div className="tallah-search__trending">
              <h4>{t('blocks.header.trending', 'Trending')}</h4>
              <div>
                {trending.map(({ keyword }) => (
                  <button
                    key={keyword}
                    type="button"
                    onClick={() => {
                      change(keyword);
                      inputRef.current?.focus();
                    }}
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </div>
          )}

          {popular.length > 0 && (
            <div className="tallah-search__popular">
              <h4>{t('blocks.header.featured_categories', 'Featured categories')}</h4>
              <ul>
                {popular.map(({ image, link }) => (
                  <li key={`${image}-${link}`}>
                    {link ? (
                      <Link to={link} onClick={onClose}>
                        <img src={image} alt={t('blocks.header.featured_categories', 'Featured categories')} loading="lazy" />
                      </Link>
                    ) : (
                      <img src={image} alt="" loading="lazy" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

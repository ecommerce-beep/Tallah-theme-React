import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { product as productApi } from '@salla.sa/twilight-theme-engine/api/product';
import { Link } from '@salla.sa/twilight-theme-engine/common';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { CloseIcon } from '../icons';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useScrollLock } from '../../hooks/useScrollLock';
import { AddToCartForm } from './AddToCartForm';

export interface TallahQuickViewProps {
  productId: number | string;
  /** Shown while the full product loads. */
  name: string;
  url: string;
  onClose: () => void;
}

/**
 * The card's quick-view window (the Twig theme's eye button / `eye-model.js`): the product's
 * images, name and price, its options, quantity and add-to-cart (the product page's own
 * `AddToCartForm`, so choices, validation and the cart request are the real ones), and a link to
 * the product page.
 */
export function TallahQuickView({ productId, name, url, onClose }: TallahQuickViewProps) {
  const { t } = useTranslation();
  const dialog = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { data: full, isError } = useQuery(productApi.queries.detail(String(productId)));

  useScrollLock(true);
  useDialogFocus(dialog, true);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const images = full?.images?.length ? full.images : full?.image ? [full.image] : [];
  const current = images[Math.min(active, Math.max(images.length - 1, 0))];

  return createPortal(
    <div className="tallah-quickview" data-testid="tallah-quickview">
      <button type="button" className="tallah-quickview__backdrop" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <div
        ref={dialog}
        className="tallah-quickview__dialog"
        role="dialog"
        aria-modal="true"
        aria-label={full?.name ?? name}
        tabIndex={-1}
      >
        <button type="button" className="tallah-quickview__close" aria-label={t('blocks.header.close', 'Close')} onClick={onClose}>
          <CloseIcon aria-hidden="true" />
        </button>

        <div className="tallah-quickview__grid">
          <div className="tallah-quickview__gallery">
            {current && <img src={current.url} alt={current.alt || full?.name || name} className="tallah-quickview__image" />}
            {images.length > 1 && (
              <div className="tallah-quickview__thumbs">
                {images.map((image, index) => (
                  <button
                    key={image.url}
                    type="button"
                    className={index === active ? 'is-active' : undefined}
                    aria-label={`${full?.name ?? name} ${index + 1}`}
                    aria-pressed={index === active}
                    onClick={() => setActive(index)}
                  >
                    <img src={image.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="tallah-quickview__info">
            <h3 className="tallah-quickview__title">
              <Link to={url}>{full?.name ?? name}</Link>
            </h3>
            {isError && <p role="alert">{t('blocks.product_card.quick_view_failed', 'The product could not be loaded')}</p>}
            {full && <AddToCartForm product={full} />}
            <Link to={url} className="tallah-quickview__details">
              {t('blocks.product_card.view_details', 'View product details')}
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

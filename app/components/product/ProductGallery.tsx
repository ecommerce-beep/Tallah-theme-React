import { type ComponentRef, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { SallaSlider } from '@salla.sa/twilight-components-react/slider';
import { useTwilight } from '@salla.sa/twilight-theme-engine/providers';
import { useTranslation } from '@salla.sa/twilight-theme-engine/i18n';
import { Image } from '@salla.sa/twilight-theme-engine/common';
import { isNativeApp } from '@salla.sa/twilight-theme-engine/native-app';
import type { Product, ProductImage } from '@salla.sa/twilight-theme-engine/types';
import { attachImageZoom } from '../../lib/imageZoom';

export interface ProductGalleryProps {
  product: Product;
}

type GalleryMedia = { url: string; type: 'image' | 'video' | '3d-image' };
// The engine's `SallaMobile` type lists `openGallery` only from twilight-platform #439.
type NativeGalleryBridge = {
  openGallery?: (images: ProductImage[], selected?: ProductImage) => boolean;
};

/**
 * The engine's own `mobile::gallery.open` payload from before `salla.mobile.openGallery`: a video's
 * link and a 3D model's file go in `url`, with no ids. Sent when the SDK has no `openGallery`
 * (Twilight before 2.14.569) or declines inside the app, so those stores keep the gallery they had.
 */
function legacyGalleryMedia(images: ProductImage[]): GalleryMedia[] {
  return images.flatMap<GalleryMedia>((image) => {
    if (image.three_d_image_url) return [{ url: image.three_d_image_url, type: '3d-image' }];
    if (image.video_url) return [{ url: image.video_url, type: 'video' }];
    return image.url ? [{ url: image.url, type: 'image' }] : [];
  });
}

/**
 * single.twig's `thumbs-config`: four thumbs below the image, six from `sm`, a vertical column of five from `lg`.
 * Slides are sized by the slider, so a product with few images keeps a short column.
 */
const THUMBS_CONFIG = {
  spaceBetween: 8,
  slidesPerView: 4,
  breakpoints: {
    640: { slidesPerView: 6 },
    1024: { slidesPerView: 5, direction: 'vertical', vertical: { enabled: true } },
  },
};

/**
 * Theme fork of the engine `ProductGallery`.
 *
 * Differs from upstream in three ways:
 *  - the thumbnails slider runs `slidesPerView: 'auto'` (`thumbsConfig`). The
 *    theme sizes thumbs to a fixed 80px in `slider.scss`; with the engine
 *    default (`slidesPerView: 4`) Swiper lays the track out for quarter-width
 *    slides, so a product with few images left a long, mostly empty track.
 *    `'auto'` makes Swiper measure the real CSS width instead.
 *  - `<SallaMetadata>` (specs table) renders here, below the slider, instead of
 *    in the buy-box column — so the column drops its `md:sticky` when a product
 *    has metadata.
 *  - the Salla app's gallery opens through `salla.mobile.openGallery` on the
 *    tapped item, as the engine does from twilight-platform #439 (not in an
 *    engine release yet).
 *
 * Upgrade notes: `FORKS.md`.
 */
export function ProductGallery({ product }: ProductGalleryProps) {
  const { t } = useTranslation();
  const { theme } = useTwilight();
  const sliderId = `details-slider-${product.id}`;
  const gallerySettings = theme.settings as {
    grid_or_slider_products_page?: boolean;
    grid_or_slider_in_mobile?: boolean;
  };
  // single.twig: on `lg` the images can be a two-column grid instead of the slider; phones keep the
  // slider when `grid_or_slider_in_mobile` is on, and get the grid otherwise.
  const gridDesktop = gallerySettings.grid_or_slider_products_page === true;
  const mobileSlider = gallerySettings.grid_or_slider_in_mobile === true;
  const hasAutoplay = (theme.settings as { enable_autoplay?: boolean }).enable_autoplay === true;
  const sliderRef = useRef<ComponentRef<typeof SallaSlider>>(null);
  const objectFit = theme.settings.slider_background_size ?? 'cover';
  // `onAfterInit` fires once Swiper actually finishes laying the slider out —
  // later than `hydrated` (which only means React has mounted; the slider web
  // component upgrades and initializes on its own, separate timeline).
  const [sliderReady, setSliderReady] = useState(false);

  // Twig Raed's fsLightbox; it reads `window` on import, so it loads once the slides are laid out.
  const lightboxReady = useRef(false);
  useEffect(() => {
    if (!sliderReady) return;
    let active = true;
    import('fslightbox')
      .then(() => active && window.refreshFsLightbox?.())
      // Without it the slides stay links to the file, as on Twig before its script runs.
      .catch(() => undefined)
      .finally(() => {
        if (active) lightboxReady.current = true;
      });
    return () => {
      active = false;
    };
  }, [sliderReady, product.id]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const el = sliderRef.current;
      if (!el?.parentElement) return;
      const { parentElement, nextSibling } = el;
      parentElement.removeChild(el);
      parentElement.insertBefore(el, nextSibling);
    });
    return () => cancelAnimationFrame(raf);
  }, [sliderId]);

  // The product-details API only returns `image` (singular).
  // Fall back so the main image always renders even without the full gallery array.
  const images: ProductImage[] =
    product.images && product.images.length > 0
      ? product.images
      : product.image?.url
        ? [product.image]
        : [];

  const { posterUrl, hidePoster } = useSliderPoster(images[0]);
  useModelViewer(images.some((image) => Boolean(image.three_d_image_url)));

  const hasManyImages = images.length > 1;
  useImageZoom(sliderRef, sliderReady && !gridDesktop && theme.settings.imageZoom === true, product.id);
  useReducedMotionAutoplay(sliderRef, sliderReady && hasAutoplay && hasManyImages);
  const sliderConfig = {
    watchOverflow: true,
    autoHeight: true,
    ...(hasAutoplay && hasManyImages
      ? {
          autoplay: {
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: theme.settings.imageZoom === true,
          },
        }
      : {}),
  };
  const openNativeGallery = (selected: ProductImage) => {
    if (!isNativeApp()) return false;
    const mobile = window.salla?.mobile as
      | (NonNullable<typeof window.salla>['mobile'] & NativeGalleryBridge)
      | undefined;
    if (mobile?.openGallery?.(images, selected)) return true;
    window.salla?.event.dispatch('mobile::gallery.open', { images: legacyGalleryMedia(images) });
    return true;
  };

  return (
    // Sticky only when there's nothing under the slider; with `<SallaMetadata>`
    // below it the column is tall, so let it scroll with the page instead.
    // `top-24` clears the sticky header once stuck — `md:` scoped to match
    // `md:sticky`. Unscoped, `relative` (below) made `top` apply on mobile
    // too, visually shifting the whole gallery down 96px while the content
    // after it (ProductDetails' title / tags) still flowed right where the
    // gallery would have sat unshifted — the two rendered on top of each other.
    <div className={galleryClassName(images[0], hasManyImages)}>
      {gridDesktop && (
        <div
          className={`tallah-gallery-grid grid-cols-2 gap-2 lg:gap-4 ${mobileSlider ? 'hidden lg:grid' : 'grid'}`}
        >
          {product.promotion_title && (
            <div className="promotion-title">{product.promotion_title}</div>
          )}
          {images.map((image, index) => (
            <div
              key={image.id ?? image.three_d_image_url ?? image.video_url ?? image.url}
              className={images.length === 1 ? 'col-span-2' : undefined}
            >
              <ImageSlide
                image={image}
                product={product}
                index={index}
                objectFit={objectFit}
                lightboxReady={lightboxReady}
                onNativeOpen={openNativeGallery}
              />
            </div>
          ))}
        </div>
      )}

      <div className={gridDesktop ? (mobileSlider ? 'lg:hidden' : 'hidden') : undefined}>
      <SallaSlider
        ref={sliderRef}
        id={sliderId}
        className="details-slider rounded image-slider"
        type="thumbs"
        loop={false}
        autoHeight
        listenToThumbnailsOption
        showControls={false}
        showThumbsControls={false}
        sliderConfig={sliderConfig}
        thumbsConfig={THUMBS_CONFIG}
        onAfterInit={() => {
          setSliderReady(true);
          hidePoster();
        }}
      >
        {product.promotion_title && (
          <div className="promotion-title">{product.promotion_title}</div>
        )}

        {product.calories && (
          <div className="absolute z-[2] top-4 rtl:left-4 ltr:right-4 bg-white shadow-sm flex flex-col justify-center items-center rounded-full w-20 h-20 md:w-24 md:h-24">
            <span className="text-red-500 text-xl leading-none font-bold">{product.calories}</span>
            <span className="text-xs text-gray-500">
              {t('pages.products.calories', 'Calories')}
            </span>
          </div>
        )}

        <div slot="items">
          {images.map((image, index) => (
            <ImageSlide
              key={image.id ?? image.three_d_image_url ?? image.video_url ?? image.url}
              image={image}
              product={product}
              index={index}
              objectFit={objectFit}
              lightboxReady={lightboxReady}
              onNativeOpen={openNativeGallery}
            />
          ))}
        </div>

        {hasManyImages && (
          // `hidden md:block` on the slot itself (not just the `.s-slider-thumbs`
          // wrapper Stencil renders after hydration, `04-components/slider.scss`)
          // — before hydration this content is still plain unstyled light-DOM
          // children of `salla-slider`, so it was briefly visible on mobile
          // until Stencil moved/wrapped it and the vendor-class rule could apply.
          <div slot="thumbs">
            {images.map((image, index) => (
              <ThumbSlide
                key={image.id ?? image.three_d_image_url ?? image.video_url ?? image.url}
                image={image}
                index={index}
              />
            ))}
          </div>
        )}
      </SallaSlider>
      </div>

      {posterUrl && !gridDesktop && (
        <div className="product-gallery__poster" aria-hidden="true">
          <Image
            src={posterUrl}
            alt=""
            className={`h-full w-full object-${objectFit}`}
            aspectRatio="1/1"
            priority
            noWrapper
          />
        </div>
      )}
    </div>
  );
}

function galleryClassName(first: ProductImage | undefined, hasThumbs: boolean): string {
  return [
    'product-gallery',
    first?.three_d_image_url && 'product-gallery--model',
    // Tells the server skeleton to leave room for the thumbnail row the slider adds below the frame.
    hasThumbs && 'product-gallery--thumbs',
    // single.twig: the gallery column is 66% of the row and sticks while the buy box scrolls.
    'sidebar relative !w-full lg:!w-[66%] lg:!sticky lg:top-8 lg:pb-16 shrink-0',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Desktop only (`lg`), as in Twig: a magnifier lens on the active image, moved along with the slider. */
function useImageZoom(
  sliderRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  productId: number | string
) {
  useEffect(() => {
    const root = sliderRef.current;
    if (!enabled || !root) return;
    let cleanups: Array<() => void> = [];
    let timer = 0;
    const apply = () => {
      if (window.innerWidth < 1024) return;
      const img = root.querySelector<HTMLImageElement>('.magnify-wrapper.swiper-slide-active img');
      if (img) cleanups.push(attachImageZoom(img, 2));
    };
    const schedule = () => {
      // wait for Swiper to set the active class / the resize to settle
      window.clearTimeout(timer);
      timer = window.setTimeout(apply, 250);
    };
    schedule();
    root.addEventListener('slideChange', schedule);
    window.addEventListener('resize', schedule);
    return () => {
      window.clearTimeout(timer);
      root.removeEventListener('slideChange', schedule);
      window.removeEventListener('resize', schedule);
      cleanups.forEach((cleanup) => cleanup());
      cleanups = [];
    };
  }, [sliderRef, enabled, productId]);
}

/** Autoplay is movement the visitor did not ask for: stop it when the system asks for reduced motion (product.js). */
function useReducedMotionAutoplay(sliderRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = sliderRef.current as (HTMLElement & { sliderInstance?: () => Promise<unknown> }) | null;
    if (!enabled || !root || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    let alive = true;
    let apply: (() => void) | undefined;
    void Promise.resolve(root.sliderInstance?.()).then((instance) => {
      const swiper = instance as { autoplay?: { start: () => void; stop: () => void }; params?: { autoplay?: unknown } } | undefined;
      if (!alive || !swiper?.autoplay || !swiper.params?.autoplay) return;
      apply = () => (query.matches ? swiper.autoplay?.stop() : swiper.autoplay?.start());
      apply();
      query.addEventListener('change', apply);
    });
    return () => {
      alive = false;
      if (apply) query.removeEventListener('change', apply);
    };
  }, [sliderRef, enabled]);
}

const MODEL_VIEWER_SRC = 'https://unpkg.com/@google/model-viewer@3.5.0/dist/model-viewer.min.js';

/**
 * `single.twig` loads Google's `<model-viewer>` only for a product with a 3D image (`has_3d_image`);
 * without it the 3D slide is an empty box. One module script for the whole session.
 */
function useModelViewer(needed: boolean) {
  useEffect(() => {
    if (!needed || customElements.get('model-viewer')) return;
    if (document.querySelector(`script[src="${MODEL_VIEWER_SRC}"]`)) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = MODEL_VIEWER_SRC;
    document.head.appendChild(script);
  }, [needed]);
}

/**
 * SSR copy of the first image over the slider until Swiper is up. SallaSlider renders only a
 * skeleton until hydration, so the main image (the LCP) used to be requested late.
 */
function useSliderPoster(first: ProductImage | undefined) {
  const url = first?.three_d_image_url ? undefined : first?.url;
  const [shown, setShown] = useState(Boolean(url));
  const hidePoster = useCallback(() => {
    const image = new window.Image();
    image.src = url ?? '';
    // Wait for the (already cached) image to decode so the swap never flashes.
    Promise.resolve(image.decode?.())
      .catch(() => undefined)
      .then(() => setShown(false));
  }, [url]);
  return { posterUrl: shown ? url : undefined, hidePoster };
}

function ImageSlide({
  image,
  product,
  index,
  objectFit,
  lightboxReady,
  onNativeOpen,
}: {
  image: ProductImage;
  product: Product;
  index: number;
  objectFit: 'cover' | 'contain';
  lightboxReady: RefObject<boolean>;
  onNativeOpen: (image: ProductImage) => boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  if (image.three_d_image_url) {
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: model-viewer is an interactive web component.
      <model-viewer
        style={{ minHeight: '500px' }}
        className="swiper-slide model-entry w-full h-full"
        loading="lazy"
        camera-controls
        touch-action="pan-y"
        auto-rotate
        poster={image.url || undefined}
        src={image.three_d_image_url}
        shadow-intensity="1"
        alt={image.alt}
        onClick={() => onNativeOpen(image)}
      ></model-viewer>
    );
  }

  return (
    <a
      data-fslightbox={`product_${product.id}`}
      data-img-id={image.id}
      data-slid-index={index}
      {...(image.video_url ? { 'data-video-src': image.video_url } : {})}
      data-caption={image.alt}
      data-infinite="false"
      data-type={image.video_type ?? (image.video_url ? 'youtube' : 'image')}
      href={image.video_url || image.url}
      // Capture runs before fsLightbox's own `onclick`, so the native app's gallery wins.
      onClickCapture={(event) => {
        if (!onNativeOpen(image)) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      // Until fsLightbox has loaded, the bare href would leave the page for the file.
      onClick={(event) => {
        if (!lightboxReady.current) event.preventDefault();
      }}
      aria-label={product.name}
      className={`swiper-slide magnify-wrapper homeslider__slide ${image.video_url ? 'video-entry' : ''}`}
    >
      <div className={`h-full w-full ${loaded ? '' : 'aspect-square bg-gray-100 animate-pulse'}`}>
        {/* The engine's `Image` brings its own `object-cover`, which beats the `object-contain` class: the fit is set inline. */}
        <Image
          id={String(image.id)}
          src={image.url}
          alt={image.alt || product.name}
          className="h-full w-full"
          style={{ objectFit }}
          priority={index === 0}
          noWrapper
          onLoad={() => setLoaded(true)}
        />
      </div>
    </a>
  );
}

function ThumbSlide({ image, index }: { image: ProductImage; index: number }) {
  return (
    <div
      className={`slide--one-fourth ${image.video_url ? 'video-entry' : ''} ${image.three_d_image_url ? 'model-entry' : ''}`}
      data-caption={image.alt}
    >
      <Image
        src={image.url}
        alt={image.alt || ''}
        className="object-cover w-full h-full bg-gray-100 rounded overflow-hidden"
        title={image.alt}
        priority={index < 5}
        noWrapper
      />
    </div>
  );
}

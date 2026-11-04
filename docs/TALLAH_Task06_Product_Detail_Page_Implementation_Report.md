# TALLAH Task 06 — Product Detail Page (PDP)

Backup of the working tree before the work: `C:\Users\abdelrahman\Desktop\tallah-react-backup-task06-1342` (includes the ignored `.env`; `twilight.preview.json` is now tracked). `twilight.preview.json` was verified unchanged (md5) at the end.

# Round 2 — closing the remaining PDP gaps

## 1. What was implemented in this round
- **Gallery grid mode** (`grid_or_slider_products_page`, `grid_or_slider_in_mobile`): a two-column grid of the lightbox links on `lg` (phones keep the slider when the second setting is on, otherwise get the grid), with the single-image `col-span-2` rule. `ProductGallery.tsx`, `tallah-pdp.scss`.
- **Image zoom** (`imageZoom`): the Twig magnifier lens ported to `app/lib/imageZoom.ts` and wired on `lg`+ for the active slide (re-applied on slide change and resize). The CSS for the lens already existed; the JS did not.
- **Reduced motion**: autoplay stops when the system asks for it (`product.js` `initGalleryReducedMotion`), through the slider instance.
- **Selected products carousel** (`single_side_products`, `single_side_source`, `categories_side_single`, `products_side_single`): four `TallahProductCard`s under the selling points; the heading disappears with an empty list. `sideSource` in `app/lib/relatedSource.ts`, the four settings copied from the original manifest, `pages.single.selected` in both locales.
- Colours stay dynamic: the promotion label now uses `var(--color-primary)`; buttons use the store primary. Only the neutral greys the original also hard-codes remain (price divider, struck price, image-strip band).
- Still not ported: the `pro2` floating card and the `checkout_enable` switch (the buy-now widget follows the store quick-buy setting, as before).

## 2. Browser QA of this round
Dev server freshly restarted for the PDP checks; production build for the width checks. A scan of the 20 latest products (`salla.product.getDetails`) found no product with a size option or a variant-priced option. Tested with the configurations that exist:

| Scenario | Product | Result |
|---|---|---|
| Simple product | `p2106933489` | **Passed**: adds, side cart shows 188 then the offer price |
| Colour option | `p73203761` | **Passed**: the in-stock colour adds (cart 2 to 3, listed in the side cart) |
| Multiple required options (colour + thumbnail + select) | `p1303461379` | **Passed**: add with nothing chosen is blocked (cart stays 1, 9 invalid fields); after choosing all three it adds the right product (cart 1 to 2, listed in the side cart with the store offer) |
| Variant image | same product | **Passed**: choosing a "layout" thumbnail option switches the main gallery image |
| Unavailable option | `p73203761` yellow / black / blue ("نفدت الكمية") | **Passed**: selecting one hides the price and shows the out-of-stock message; pressing add leaves the cart unchanged |
| Out-of-stock product | `p524759233` | **Passed** (round 1): label, no price, no sticky bar |
| Discounted product | `p2106933489` | **Passed**: 188 / 199 and the label "خصم 11 ر.س" |
| Size options | none in the catalog | **Not verified** |
| Variant-specific price or stock count | none in the catalog | **Not verified** |

Gallery (dev server): grid mode (temporary preview setting) gave two columns of 457px with 5 lightbox links and the slider hidden; the zoom lens (300px) appears and follows the pointer; a real click on the third thumbnail makes the third slide active; clicking the image opens fsLightbox and it closes. **Passed.** Swipe is Swiper's own and was not exercised. The temporary settings were restored; the md5 of `twilight.preview.json` matches the original.

Selected products (dev server, temporary setting): four cards under "منتجات مختارة". **Passed.** Related products: **Passed** on desktop (round 1, 16 cards). On the phone widths the lazy rail did not load in my probe, so the phone layout of the related and selected rails is **not verified**. The empty-list behaviour (wrapper and heading dropped at 0) is code-level, not browser-tested.

## 3. Responsive comparison with the original
Structure compared with the Twig; the original storefront was only opened at desktop width.

| Width | Result |
|---|---|
| 1440 AR and LTR | Gallery 66% beside a 34% buy column, vertical thumbs beside the image, mirrored in LTR. **Passed** |
| 768 | Stacked, thumbs under the image, wishlist/share row, sticky bar shown (original: `md` and up), no overflow. **Passed** |
| 390 AR, 390 EN, 375 | Square image, horizontal 80px thumbs under it, breadcrumb on top, no overflow. **Passed** |
| Mobile bottom bar overlap | Visible and not covering the form at 390px in the load view; the floating phone add bar while scrolling was **not re-verified** |
| Pixel-level match | **Not verified** (no side-by-side at 768 or 375) |

## 4. Development server and SDK initialisation: investigation
Observed:
1. Dev server A (mine) after a long editing session: `salla.onReady()` never resolved on product and category pages (home still resolved) and the options never mounted. The production build, and a fresh `pnpm dev` on the same code, were fine.
2. A second dev server on port 5174 (not started by me) stopped answering page requests.
3. The first request after a code change takes about 15 s; right after start about 40 s (cold SSR).
4. Every dev page load logs `The result of getServerSnapshot should be cached to avoid an infinite loop` and a hydration mismatch on `.app-inner` and the footer. The theme's own `useSyncExternalStore` callers return constants (`useHydrated`, `HeaderNav`). The other one on every page is the engine's dev-only settings store (`devSettingsStore.getServer`, behind `import.meta.env.DEV`). Neither message appears in the production build.

Conclusion: not the theme code and not the PDP changes (the stall also hit the untouched category page, and a restart cured it on identical code). The evidence points to the dev environment (Vite SSR runner / a long-lived dev process), with the engine's dev-only preview store as the likely source of the two console errors. The cause of the stall itself is **unresolved**. Workaround: restart `pnpm dev` after a long editing session. No architectural change was made.

## 5. Automated results of this round
- `pnpm typecheck` pass; `pnpm check:manifest` 0 errors, 0 warnings; `pnpm build` pass.
- `pnpm test`: **713 passed, 84 files** (703 at the end of round 1).
- New tests: `tests/lib/imageZoom.test.ts` (3), `sideSource` (3), gallery grid mode (3), `ProductPage` side carousel (1).

## 6. Remaining issues after round 2
- **Critical / High:** none.
- **Medium:** no size or variant-priced product exists in the catalog, so size selection and variant price updates are unverified; the phone view of the related and selected rails is not browser-verified; the dev-server stall cause is unresolved.
- **Low:** the `pro2` floating card is not ported; `checkout_enable` is not read; swipe not exercised; neutral grey literals copied from the original.

## 7. Final status
**PARTIALLY COMPLETE.** Every gallery, related / side-product and purchase-flow item that the catalog allows is implemented and verified. What is left depends on data the store does not have (sizes, priced variants) or on comparisons I could not make.

---

# Round 1 (original report)

## A. Original TALLAH PDP audit
Sources read: `src/views/pages/product/single.twig` (1132 lines), `partials/product/sticky_bar.twig`, `partials/product/options.twig`, `twilight.json` (product settings), plus the live original page `…/dev-ff8tnndomnlqddrf/x/p618818589` in Chrome (desktop only). `AR_single.scss` (964 lines) and `product.js` were consulted for structure, not ported line by line.

| # | Original element (single.twig) | Behaviour | React |
|---|---|---|---|
| 1 | Breadcrumb | top on phones, inside the buy column from `lg` | `ProductPage` (two placements) |
| 2 | Gallery | `salla-slider type=thumbs`, vertical thumbs from `lg` (5), 4 / 6 below; fsLightbox; promotion label; calories badge; `enable_autoplay` | `ProductGallery` |
| 3 | Gallery as grid | `grid_or_slider_products_page` / `grid_or_slider_in_mobile` | ported in round 2 |
| 4 | Brand logo, title, wishlist + share icons | icons beside the title from `lg`; wishlist + share row under the form on phones | `ProductDetails`, `MobileActions` |
| 5 | Rating, tax line, subtitle, tags, price (sale / regular / starting) | price row with bottom border | `ProductDetails` |
| 6 | Sold / remaining quantity, SKU (hidden), availability, installment | kept | `ProductDetails` (unchanged logic) |
| 7 | Options | `salla-product-options` | `AddToCartForm` (unchanged logic) |
| 8 | Price row + quantity + add to cart + buy-now (`checkout_enable`), gifting | label "Price" + live price, quantity beside the add button, buy-now below | `AddToCartForm` + `tallah-pdp.scss` |
| 9 | Quick order, payments | kept | `ProductPage` |
| 10 | Selling points (collection, `selling-points-view`) | column list on phones, row or list on `lg` | `SellingPoints` |
| 11 | Metadata (FAQ accordion) | bottom of the buy column | `ProductMetadata` |
| 12 | Side products (`single_side_products`) | carousel under the buy box | ported in round 2 (`SideProducts`) |
| 13 | Tabs: description (read more) / reviews | `salla-tabs` | `ProductTabs` |
| 14 | `salla-offer` | kept | `ProductPage` |
| 15 | Similar products (`single_products`, `single_source`) | slider, default latest | `RelatedProducts` + `relatedSource` + `TallahProductCard` |
| 16 | Extra image strip (`img_in_single`, `image_collection`) | carousel | `InspireGallery` (scroll-snap row) |
| 17 | Sticky bar (`sticky_is_true`, `product_pro = pro1`) | desktop bottom bar after the add button leaves view | `StickyBuyBar`; `pro2` (floating card) **not ported** |
| 18 | Mobile sticky add to cart (`sticky_add_to_cart`) | `support-sticky-bar` | existing floating bar kept (`product.scss`) |
| 19 | Hooks `product.single.*`, `product:single.*` | kept | `ProductPage` |

## B. Architecture
- Route unchanged: `app/routes/$slug.p$id.tsx` still calls the engine `Product.loader` and `withHead(Product)` (SEO, canonical, JSON-LD untouched) and keys `ProductPage` by product id so state resets.
- `ProductPage`, `ProductDetails`, `ProductGallery`, `AddToCartForm` were already theme forks of the engine (see `FORKS.md`, updated). I changed their layout and kept every piece of commerce logic: `useProduct` live product, `salla-product-options`, `salla.form.onSubmit('cart.addItem')`, price bump, the quick-buy widget, notify-when-available, gifting, comments, hook slots and merchant blocks. No new product API or cart code.
- The description became its own export (`ProductDescription`) rendered in the tab, and still goes through the existing lazy-iframe handling.
- `ProductsSlider` got a `tallahCards` prop so the similar-products rail renders `TallahProductCard`; the Homepage blocks are untouched.
- Raed header/footer stay out: nothing here brings them back; `ThemeLayout` was not touched.

## C. Implementation (files)
- `app/components/product/ProductPage.tsx` — TALLAH structure, settings-driven blocks.
- `app/components/product/TallahPdpParts.tsx` (new) — `SellingPoints`/`readSellingPoints`, `ProductTabs`, `InspireGallery`, `MobileActions`, `StickyBuyBar`.
- `app/components/product/ProductDetails.tsx`, `ProductGallery.tsx`, `AddToCartForm.tsx`, `app/components/home/ProductsSlider.tsx`.
- `app/lib/relatedSource.ts` (new).
- `app/styles/04-components/tallah-pdp.scss` (new, imported in `app.scss`).
- `twilight.json`: ported the TALLAH product settings `grid_or_slider_products_page`, `grid_or_slider_in_mobile`, `enable_autoplay`, `checkout_enable`, `sticky_is_true`, `product_pro`, `selling-points`, `selling-points-view`, `single_products`, `single_source`, `categories_single`, `products_single`, `img_in_single`, `image_collection` (copied from the original manifest; `check:manifest` clean). `grid_*` and `checkout_enable` are declared but not read yet.
- `locales/ar.json`, `locales/en.json`: `pages.single.*` keys.
- A bug fixed on the way: products with a 3D image showed an empty box because `<model-viewer>` was never loaded; `ProductGallery` now loads it (pinned 3.5.0 from unpkg, as Twig does) only when a 3D image exists.

## D. Visual QA
Browser, production build (`pnpm preview`) unless noted; dev server for the final regression.
- **Passed:** 1440 AR (gallery on the right, buy column on the left, vertical thumbs, tabs, offers, similar products, sticky bar); 1440 EN (columns mirror); 768 AR and 375 EN (stacked, no overflow); 390 AR (breadcrumb on top, image, title, price, options, bottom bar, no overflow). TALLAH header on all of them.
- **Not verified:** pixel parity with the original (I compared structure from the Twig and one desktop screenshot only; the original at 768/375 was not opened); 1440 LTR purchase block visually (measured positions only).
- **Known visual difference:** button/accents use the store's primary colour (red in the demo store), the original store uses black; that is a store setting, not theme code.

## E. Functional QA (real products of the connected store)
Passed:
- Product with required colour + text/number/select options (`p1361945446`): add without colour is blocked (cart count unchanged, validation shown); with colour, quantity + / − works (3 → 2, never below 1), add of quantity 2 raised the cart 2 → 4 with the add toast.
- Discounted product (`p2106933489`): 188 with 199 struck through and the "خصم 11 ر.س" label; also in the form price row.
- Sold-out product (`p524759233`): "نفدت الكمية" label and button, price hidden, no sticky bar.
- Product with 20 gallery images and a 3D first image (`p73203761`): vertical thumbs column, 3D model renders, tabs, similar products (16 TALLAH cards), offers, desktop sticky bar with the add button.
- Dev server (normal URL): add to cart opens the TALLAH Side Cart with the product (and the store offer price), header counter 0 → 1.
- Card → PDP navigation opens the right product with a clean state (the engine reloads the document for these pages, so quantity and scroll start fresh).
- Hard refresh of the PDP works; no hydration errors seen in the page.

Not verified:
- Variant-specific price, availability and images (the catalog has no variant products to test).
- Size selection, multiple required options together, products with unavailable options.
- Quantity maximum / stock limits, hidden-quantity products.
- Reviews with real data (the demo products have none; the tab and the comments widget render).
- Wishlist toggle (guest session; login not allowed), Buy-now checkout (not clicked: it leaves for checkout), notify-when-available.
- Mobile interactions after load (sticky floating bar, tapping thumbnails) — layout only.
- English PDP interactions.

## F. Regression QA (dev server, normal URL)
Passed: Homepage — 8 TALLAH blocks in order, TALLAH header/footer, no Raed elements, no overflow; Category page — 6 `TallahProductCard`s, sort, filters, Quick View opens; Side Cart from the PDP. Not re-run: Arabic/English navigation and the mobile bottom bar interplay on the PDP (visible, not overlapping in the 390px load view only).

## G. Automated validation
- `pnpm typecheck`: pass. `pnpm check:manifest`: 0 errors, 0 warnings. `pnpm build`: pass.
- `pnpm test`: **703 passed, 83 files** (672 before).
- New: `tests/components/product/ProductPage.test.tsx` (9), `TallahPdpParts.test.tsx` (15), `tests/lib/relatedSource.test.ts` (5), 2 model-viewer tests in `ProductGallery.test.tsx`.
- Two existing `ProductDetails` tests asserted the old structure (price in a `<p>`, description inside `ProductDetails`); I pointed them at the new elements with the same assertions. No timeouts changed.

## H. Remaining issues
- **Critical:** none.
- **High:** none known. (Dev server note below.)
- **Medium:** variant pricing/availability/images, size options, quantity limits and reviews are unverified in the browser; the desktop image grid mode and `checkout_enable` are settings that exist but do nothing yet; `single_side_products` (side carousel) and the `pro2` floating card are not ported.
- **Low:** `ProductPage` uses the generic label `common.rating` / "Reviews" for the second tab (the original used the same key); gallery thumbs on phones follow the original (visible under the image) but were not checked against the original on a phone.
- **Dev server:** a long-running `pnpm dev` degraded after many edits (the SDK never became ready on product and category pages, and a second dev server on port 5174 that is not mine hung). A fresh `pnpm dev` worked normally. Restart it after a long editing session. Also: right after a restart the first request opens the Theme Editor, not the storefront; the editor can rewrite `twilight.preview.json`, and it was unchanged here.
- **Pages still on starter (Raed) styling:** cart, blog, brands list, account pages, wishlist, loyalty, testimonials, thank-you, landing/page templates.

## I. Completion status
**PARTIALLY COMPLETE.** The TALLAH layout, gallery, details, purchase block, tabs, similar products, sticky bar, selling points and settings are implemented and verified for the scenarios listed as passed; the items under "Not verified" and the not-ported settings remain.

## J. Next step
Finish the PDP gaps (grid gallery mode, side products, variant/size QA on a catalog that has them), or move on to the cart page migration.

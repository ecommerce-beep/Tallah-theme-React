# TALLAH Task 05 — Category Pages & Product Cards

## 0. Task 04 closure (Homepage self-QA)
Checked on the production preview and the dev server:
- **Passed:** 8 sections in order (`AR-Hero-section`, `AR_our_products`, `AR-special-banner`, `AR-Products-banner`, `AR-Hero-2`, `Ar-Promo-banner`, `AR-special-banner`, `AR-Custom-testimonials`), Hero first, no Raed sections, no horizontal overflow at 1536px, no console errors.
- **Not re-verified here:** Hero CTA sizing and Homepage overflow at 375/390px (Task 04 report stands). Task 04: closed with that caveat.

## A. Original TALLAH reference
- `src/views/pages/product/index.twig`: `.AR-index`, `<salla-breadcrumb>`, hooks `product.index.before/after_products_group_with_filter`, filter column (`md:w-72 lg:sticky lg:top-20`, `hidden lg:block`) with a "Filters" header, title centred on `lg` with `#product-filter` sort at the end, mobile row with title + 1/2 column buttons (`localStorage.gridView`), `<salla-products-list>`, testimonials when `category.testimonial_enabled`.
- `AR-Index.scss`: filter styling. `products.js`: sort, count next to the title, empty-state actions (clear filters when some are applied, else continue shopping).
- The original category template has no category image/banner, description or subcategory navigation (only the brand header exists in the engine fork) — none added.
- Category-specific settings: `category.testimonial_enabled`, `product_index_show_breadcrumbs` only.

## B. Architecture decision
The starter already had a theme fork of the engine list page (`app/components/product/ProductListPage.tsx`, registered as `product:list-page`). Its data flow was kept (route loader, `sortOptions`, `useAppliedFilters`, cursor `ItemsList` loader, `SallaFilters`, hooks, brand header); only presentation changed. No generated route was edited.
- Scope: the registration is global, so brands, search, offers and tags share the layout and `TallahProductCard` (as the Twig `salla-products-list` did).
- Cards: `ProductCard` → `TallahProductCard` (reused). Home blocks and their components were not touched.

## C. Implemented
- Toolbar: centred h1 (+ count only when the full list is known), real sort `<select>`, mobile filter trigger, mobile 1/2 column switch persisted in `gridView`.
- Filter column from `lg` with the "Filters" header; mobile via `BottomSheet`; AR-Index filter styling.
- **New in this round:** "Clear filters" button (`blocks.catalog.clear_filters`, AR + EN) shown while filters are applied — in the sidebar, in the mobile sheet and under the empty state. It removes `filters*`/`page` from the URL, keeps `sort`, remounts the widgets and dispatches `salla-filters::changed` with `{}` because the engine's `useAppliedFilters` only resets through that event. (First attempt left the list empty; fixed and re-verified.)
- Restored the sidebar "Filters" header that I had removed by mistake.
- Removed things absent in the original: pill toolbar, list view, hide-filters toggle, sticky toolbar.
- Preserved: loading skeleton, empty state, filter error + retry, infinite scroll, hooks, testimonials.

## D. Visual QA (browser, production build)
| Viewport | Result |
|---|---|
| 1536px RTL / LTR | **Passed:** 4 columns with filters, sidebar flips side, sort at the end, no overflow |
| 1280px search (filters) / offers (no filters) | **Passed:** 4 / 5 columns, no overflow |
| 768px (iframe) | **Passed:** 2 columns, filter trigger shown, sidebar hidden, no overflow |
| 390px, 375px (iframe) | **Passed:** 2 columns, no overflow; 390px offers 2 columns |
| Mobile filter sheet | **Passed:** opens, scrolls; last filter ends at 664px above the bottom bar (706px) |
| Pixel parity with demostore | **Not verified** — no side-by-side comparison; parity is by Twig/SCSS rules |

## E. Functional QA
**Passed**
- Category (6 products): sort via URL and via `<select>` (price low→high and high→low reorder correctly), selection kept after refresh, Back/Forward restore the right sort and order.
- Filters: colour → 1 product; colour + price → 0 products with the empty message and a working "Clear filters" (back to 6, widgets unchecked, sort kept); price 100–400 → 5 products and the URL carries the filters.
- Pagination: `/products` (latest) loads 16 → 20 unique cards while scrolling, no duplicates, stops at the end.
- Cards inside a category: discounted price (188/199), sold-out card ("نفدت الكمية", no add button), colour-option card, card → PDP link opens the right product page.
- Quick View: opens with gallery/options/quantity; closes with X; Add to Cart without the required colour shows "Please select one of these options" (SDK message, English) and adds nothing; with colour selected it adds (toast "تمت الإضافة إلى سلة التسوق"); card Add to Cart on a simple product adds (cart badge 2).
- Search (12 results, filters, sort), search with no results ("لا توجد منتجات"), Offers (7 products, 5 columns), Brand page (header, 5 products, sort): no regressions seen.
- Console: no errors on the category page.

**Not verified**
- Wishlist toggle: as a guest the click leaves the card `not-added` and no login prompt appeared; a logged-in toggle can't be tested (I may not enter credentials). Unit tests cover the card's wishlist button.
- Loading skeleton: seen once (grid + filter placeholder, plausible), layout shift not measured.
- A truly empty category (none in the catalog): covered by unit test only. Tag pages: no tag in the catalog.
- Pagination together with an applied sort/filter on a list longer than one page (catalog too small).
- English `/en` Quick View and card interactions.

## F. Development server hang
- **Not reproduced.** The user's restarted dev server (PID 29136) stayed responsive through edits, `pnpm test` and `pnpm build` run in parallel.
- Measured: the first request after editing a file takes ~15 s (SSR re-evaluation), then 1–2 s again. The earlier hang (PID 36716, >60 s on every request, idle CPU) happened while the browser kept reloading right after edits, so it is most likely a stalled SSR module reload under load; root cause **not confirmed**. If it recurs, restart `pnpm dev` and wait ~15 s after saving before reloading.
- Side finding: a persisted `gridView=one-column` in `localStorage` made later checks show 1 column; this is expected behaviour (same key as Twig), not a bug.

## G. Automated tests (final run)
- `pnpm typecheck`: pass. `pnpm check:manifest`: 0 errors, 0 warnings. `pnpm build`: pass.
- `pnpm test`: **664 passed (79 files)** (661 before this round).
- `tests/components/product/ProductListPage.test.tsx` now has 12 tests, incl. clear button hidden without filters, clearing keeps the sort and dispatches `salla-filters::changed`, and the clear button in the empty state. No assertion weakened, no timeout changed.

## H. Remaining issues
- **Medium:** wishlist, empty category, tag page and multi-page sort/filter pagination not browser-verified (see E).
- **Low:** the add-to-cart validation message from the SDK is English on the Arabic page (SDK text, not theme).
- **Low:** `ProductListPage.tsx` indentation inside `toolbar={...}` is not prettier-formatted.
- **Low:** menu link `/-/c432786305` ("المزيد") returns 404 locally; it is a menu item, not part of this task.

## I. Completion status
**PARTIALLY COMPLETE** — every feasible check passed and the confirmed gap (no way to clear filters) is fixed; only the items listed as Not verified remain.

## J. Next step
Task 06 (not started): Product Detail Page migration.

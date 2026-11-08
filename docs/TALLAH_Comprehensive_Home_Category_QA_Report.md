# TALLAH — Comprehensive Home & Category QA Report

Read-only audit. No source file, `twilight.preview.json` (md5 `8212ff680bd9aa13f4da5afeaec8b323`, unchanged), or the Twig repo was modified. Nothing was committed, pushed or deployed.

**Test base.** The working tree holds an unfinished Task 07 edit (`app/components/cart/CartItem.tsx`) that breaks the dev storefront on :5173 and `pnpm typecheck`. As instructed it was left untouched. All checks ran on a clean export of commit `fa3ce67` (dev server :5190, production preview :4181), which contains Tasks 03–06 and the hero fixes.

**Limits.** The original storefront was behind a Cloudflare challenge / error page. It was not bypassed. Visual comparison with the original therefore relied on earlier captured measurements plus the Twig/SCSS source. Direct side-by-side parity is **NOT VERIFIED**, and nothing here claims pixel-perfect.

---

## A. Executive Summary

- Homepage: all 8 TALLAH blocks render in the expected order on the baseline, in RTL and LTR, at the tested widths. Settings and interactions work.
- Category pages: TALLAH list page, TALLAH product cards, sorting, filters, clear-filters and pagination work. Search / brand / offers routes use the same listing.
- Open defects: invalid category IDs in homepage CTAs (422), Raed pink breadcrumb band on category pages, Raed mobile account sheet / bottom bar, layout shift from reserved heights, accessibility gaps (card link focus ring), and dev-only console errors.
- Critical: the uncommitted Task 07 WIP breaks typecheck and the live dev storefront.
- Verdict: Homepage and Category work are **DONE WITH LIMITATIONS**, not fully closed.

## B. Homepage section by section

| Section | Rendering | Visual Parity | Responsive | Settings | Interactions | Raed Issues | Final Status |
|---|---|---|---|---|---|---|---|
| AR-Hero-section | PASS | PARTIAL (measured values only; header height 140 vs 94) | PASS 375–1536 AR/EN | PASS | PASS (bullets, pause/resume) | none in block | PASS WITH LIMITS |
| AR_our_products | PASS | NOT VERIFIED | PASS | PASS | PASS | none | PARTIAL (`is_moving` slider branch unsupported by design) |
| AR-special-banner | PASS | NOT VERIFIED | PASS | PASS | CTA links point to invalid category IDs (422) | none | FAIL (data/CTA) |
| AR-Products-banner | PASS | NOT VERIFIED | PASS | PASS | PASS | none | PASS WITH LIMITS |
| AR-Hero-2 | PASS | PARTIAL (button 75px higher on purpose) | PASS | PASS | PASS | none | PASS WITH LIMITS |
| Ar-Promo-banner | PASS | NOT VERIFIED | PASS | PASS | PASS | none | PASS WITH LIMITS |
| AR-special-banner (2nd) | PASS | NOT VERIFIED | PASS | PASS | same invalid-ID CTA issue | none | FAIL (data/CTA) |
| AR-Custom-testimonials | PASS | NOT VERIFIED | PASS | PASS | PASS | none | PASS WITH LIMITS |

## C. Category QA

| Check | Result |
|---|---|
| TALLAH layout and cards on several categories | PASS |
| Sorting | PASS |
| Filters, clear filters | PASS |
| Pagination | PASS |
| Empty state | PASS |
| Quick view dialog | PASS (opens, `aria-modal`, labelled, closes on Esc) |
| Card link keyboard focus ring | FAIL (outline `none`) |
| Breadcrumb band | FAIL (Raed pink full-bleed band) |
| Visual parity with original | NOT VERIFIED |
| Search / empty search / brand / offers | PASS (shared `ProductListPage`) |

## D. Raed legacy inventory

- **A — Active Raed on completed pages:** breadcrumb 5%-primary band (`breadcrumb.scss`) on category pages; mobile account sheet and mobile bottom bar styling.
- **B — Unused starter files:** leftover Raed home blocks still registered in `registerHomeComponents` and unused header/footer variants.
- **C — Raed on unmigrated pages:** cart, checkout-adjacent and account pages (Task 07+ scope).
- **D — Remote preview store content:** production build / preview read the demo store's Raed homepage; only the dev server uses `twilight.preview.json`.

## E. Visual consistency

Typography, colors and card styling are consistent across home, category and PDP on the baseline. The header on the baseline is taller than the original (140 vs 94px) because of the announcement bar. Raed breadcrumb and bottom-bar elements are the visible inconsistencies. Direct comparison with the original: NOT VERIFIED.

## F. Functional browser results

Sequence home → header → category → sort/filter → card → PDP → back → home → refresh → dev restart: PASS. After a dev restart the first request redirects to the Theme Editor (engine behaviour), the second renders TALLAH. Last probe on :5190 category page: card link focus outline `none` (FAIL), select focus visible, header button focus visible, quick view labelled `معاينة سريعة` and dismissible with Esc.

Console: dev-only `getServerSnapshot` warning (engine `devSettingsStore`) and a hydration mismatch on `.app-inner` / footer; neither occurs in the production build.

## G. Issue register

| ID | Severity | Page/Section | Issue | Expected | Actual | Evidence | Suspected Cause | Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| QA-01 | Critical | Cart / whole dev site (working tree) | `CartItemInfo` undefined | typecheck passes, site loads | 3 TS errors, "CartItemInfo is not defined" on :5173 | `pnpm typecheck`, browser | Interrupted Task 07 edit | Finish or revert Task 07 `CartItem.tsx` (user decision) |
| QA-02 | High | Homepage special banners | CTA links use invalid category IDs | open a category | Salla API 422 | `salla.product.fetch` probe | Preview config IDs | Replace with valid category IDs in Theme Editor |
| QA-03 | Medium | Category pages | Raed pink breadcrumb band | TALLAH look | full-bleed 5%-primary band | `breadcrumb.scss` | Raed style retained | Restyle breadcrumb |
| QA-04 | Medium | Mobile | Raed account sheet and bottom bar | TALLAH style | Raed styling | browser at 390 | Not yet migrated | Migrate in a later task |
| QA-05 | Medium | Home | Layout shift from reserved block heights | stable layout | hero measured 400 at cold start before hydration | measurement | reserved heights vs real | Tune `registerHomeComponentConfig` heights |
| QA-06 | Medium | Category cards | No visible focus ring on card link | visible focus | outline `none` | JS probe | reset styles | Add `:focus-visible` outline |
| QA-07 | Low | Hero | Header 140px vs 94px | match original | taller | measurement | announcement bar | Review header spec |
| QA-08 | Low | Home `AR_our_products` | `is_moving` slider unsupported | supported | not supported | code | design choice | Document or implement |
| QA-09 | Low | Dev only | `getServerSnapshot` and hydration errors | clean console | errors in dev | console | engine dev store | None (engine) |
| QA-10 | Low | Dev | Dev server stalls after long sessions | stable | stalls | PDP report | dev environment | Restart `pnpm dev` |

## H. Automated results (baseline `fa3ce67`)

- `pnpm typecheck`: PASS (after copying the generated route tree into the export)
- `pnpm check:manifest`: PASS
- `pnpm build`: PASS
- `pnpm test`: **720 / 720 PASS**
- Working tree (with Task 07 WIP): typecheck **FAIL** (3 errors).

## I. Remaining project scope

Cart (Task 07, paused), checkout and account pages, Raed breadcrumb / mobile sheet / bottom bar, and the remaining pages.

## J. Final acceptance decision

| Deliverable | Decision |
|---|---|
| A — Homepage | DONE WITH LIMITATIONS (fix QA-02, QA-05; parity NOT VERIFIED) |
| B — Category migration | DONE WITH LIMITATIONS (QA-03, QA-06) |
| C — Category self-QA | DONE WITH LIMITATIONS |

**Can we confidently close the three tasks?** Not yet. They work, but the open items above and the unverified original comparison remain. The Task 07 WIP must be resolved before the working tree is healthy again.

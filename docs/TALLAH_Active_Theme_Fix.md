# Making TALLAH the only active theme (local)

## Root cause
1. The demo store (`dev-vgckq3fssfhjewwi`) saves the Raed starter's `header_layout = default` and a Raed homepage. `ThemeLayout` only used TALLAH when `header_layout` was empty or `tallah`, so the store's saved value switched the header and footer back to Raed.
2. In `pnpm dev` the only thing overriding the store's Raed homepage and settings is `twilight.preview.json` (the engine's local theme state, read by the Vite plugin only when serving). It was gitignored, and `pnpm preview` / build never read it, so those showed the store's own Raed homepage. Nothing in the file's content was lost: it still has the 8 TALLAH blocks.
3. Earlier Task 05 browser checks on `pnpm preview` therefore ran under the Raed header (the list page itself is TALLAH).

## Changes
- `app/components/layout/ThemeLayout.tsx`: always `TallahHeader` + `TallahFooter`; `header_layout` no longer read. Removed the Raed `Header`, engine `Footer` and `MobilePageTitleBar` from the active layout.
- `app/components/layout/tallah/settings.ts`: removed `isTallahLayout`. `app/hooks/index.tsx`: side-cart check no longer depends on it.
- `twilight.json`: `header_layout` offers only TALLAH.
- `.gitignore`: `twilight.preview.json` stays ignored (per-developer local state with demo-store content); `tests/preview` guards it wherever it exists and skips on a fresh clone.
- Tests: `tests/components/layout/ThemeLayout.test.tsx` (TALLAH for any saved value), `tests/preview/twilight-preview.test.ts` (enabled, exact 8 blocks in order, declared in the manifest, header_layout tallah), settings test cleaned.
- Backup before changes: `C:\Users\abdelrahman\Desktop\tallah-react-backup-20261104-1323` (working tree, ignored preview/env files, `working-tree.patch`).

## Known limits
- Homepage blocks are merchant/store data. `pnpm dev` shows the 8 TALLAH blocks from `twilight.preview.json`; `pnpm preview` and production use the store's own homepage (Raed in this demo store) with the TALLAH header and footer. Not changed because it is live merchant content.
- Keep Theme Editor tabs closed or on the same state: the editor auto-saves back to `twilight.preview.json`.

## Not migrated to TALLAH yet
Product page, cart, blog, brands list, customer account pages, wishlist, loyalty, testimonials, thank-you, landing/page templates, and the home blocks outside the 8 `AR-*` ones still use the Raed starter components (inactive on the Homepage). Raed `Header.tsx`, `MobilePageTitleBar.tsx` and engine `Footer` are no longer rendered but their files remain (own tests).

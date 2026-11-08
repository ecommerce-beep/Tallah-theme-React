# Engine forks

These theme components are copies of engine components, changed for Raed. The engine does not
update them, so each upgrade of `@salla.sa/twilight-theme-engine` can leave them behind. This file
records where each one came from, so you can see what changed upstream.

**Base** is the engine version in the repo when the fork was last edited. It is the oldest
upstream change the fork might have taken in, not proof that it was synced then.

| Fork (`app/components/…`)     | Engine source (`tailwind/…` in the engine)    | Wired in by                                        | Base   | What the fork changes                                                                                      |
| ----------------------------- | --------------------------------------------- | -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `product/ProductPage.tsx`     | `routes/product/ProductPage.tsx`              | `app/routes/$slug.p$id.tsx`                        | 1.0.78 | TALLAH `single.twig` layout: 66/34 columns, description / reviews tabs, `single_*` similar products with `TallahProductCard`, selling points, extra image strip, desktop sticky bar |
| `product/ProductDetails.tsx`  | `components/product/ProductDetails.tsx`       | `ProductPage`                                      | 1.0.85 | Title row, rating + tax, subtitle, price with bottom border; the description is its own export (tab panel) |
| `product/ProductGallery.tsx`  | `components/product/ProductGallery.tsx`       | `ProductPage`                                      | 1.0.89 | 66% sticky column, vertical thumbs from `lg` (single.twig `thumbs-config`), autoplay setting, `<model-viewer>` loaded for 3D; no floating mobile bar, specs moved to the buy column |
| `product/AddToCartForm.tsx`   | `components/product/AddToCartForm.tsx`        | `ProductPage`                                      | 1.0.78 | Adds the "Price" label; layout via `tallah-pdp.scss` (price row, quantity beside a square add button, buy-now below) |
| `product/ProductListPage.tsx` | `routes/product-listing/ProductListPage.tsx`  | `registry` `product:list-page` in `app/router.tsx` | 1.0.83 | TALLAH `product/index.twig` layout: centred title + sort, filter column from `lg`, phone 1/2 column switch (`gridView` in `localStorage`), `TallahProductCard` for every listing |
| `cart/CartPage.tsx`           | `routes/cart/CartPage.tsx`                    | `app/routes/cart.tsx`                              | 1.0.78 | TALLAH `cart.twig` layout (grey page, 419px summary, no heading row); renders the `CartItem` fork; an error state with retry instead of a skeleton that never ends when the cart can't be loaded |
| `cart/CartItem.tsx`           | `components/cart/CartItem.tsx`                | `CartPage`                                         | 1.0.64 | TALLAH `cart.twig` white card: 120x140 image, trash + wishlist heart, React quantity stepper, mobile/desktop price copies |
| `page/PageSingle.tsx`         | `routes/page/PageSingle.tsx`                  | `app/routes/$slug.page-$id.tsx`                    | 1.0.78 | `customised` pages render only the `information_page.information_page` hook                                |
| `home/FixedProducts.tsx`      | `components/home/FixedProducts.tsx`           | `registerHomeComponents` in `app/router.tsx`       | 1.0.47 | Same markup, uses the theme `ProductCard`, and shows the block's `limit` products instead of always 4        |
| `layout/tallah/TallahFooter.tsx` | `components/layout/Footer.tsx` | `ThemeLayout`, when `header_layout` is `tallah` (the default) | 1.0.141 | TALLAH's footer: the Twig theme's three columns (menu, contacts, store block), newsletter form and primary-color bottom bar; no trust badges / SBC / copyright (the Twig footer had none) |

## Upgrading the engine

The engine package ships each component's source as `tailwind/<path>.tsx.txt`, under the path in
**Engine source**. For each fork, compare that file between **Base** and the new version and port
what applies:

```bash
for v in 1.0.86 1.0.90; do
  mkdir -p engine-$v && tar -xzf "$(npm pack @salla.sa/twilight-theme-engine@$v --silent)" -C engine-$v
done
diff -u engine-1.0.86/package/tailwind/routes/product/ProductPage.tsx.txt \
  engine-1.0.90/package/tailwind/routes/product/ProductPage.tsx.txt
```

Then set **Base** to the new version. Packages before 1.0.86 have no source copy, so for an older
**Base** compare the fork with the 1.0.86 source in full.

## Adding a fork

Add a row here, and say at the top of the file's doc comment what differs from the engine. Fork
only when a hook slot, the `registry`, or a home-component key can't do the job: every fork is
code you now maintain by hand. See
[Fork a built-in route](https://docs.salla.dev/twilight/react/recipes/fork-a-built-in-route).

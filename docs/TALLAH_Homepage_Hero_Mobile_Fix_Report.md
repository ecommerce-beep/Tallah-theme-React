# TALLAH Homepage Hero — mobile fix

## 1. Original mobile behaviour (`AR-Hero-section.twig`, measured on the original storefront)
Measured in Chrome with the original page in iframes of 390 and 430px (the window itself could not be resized; an iframe gives real media-query behaviour). Both slides were stopped and shown one at a time.

- One `<salla-slider>` carousel; each slide is `.banner` with `h-[100svh] md:h-[90vh]`, `py-16`, `px-2`, cover background, **`mobile_bg` below 768px and `desktop_bg` from 768px**, plus a 40% dark scrim on phones when the text keeps its default light colour. The merchant sets text alignment (horizontal and vertical), colours, and `button_bottom`.
- The header is `position: absolute` over the hero: the hero starts at y = 0 and is exactly one viewport tall (390x844: slide 844 tall, section 375 wide next to the 15px scrollbar).
- Text block centred: title y = 353 (33 tall), subtext y = 395 (52 tall). A `button_bottom` CTA (84x44, 12px, 6px radius) sits at y = 736, i.e. 64px above the slide bottom. Bullets: 2px bars, 25% wide, `bottom: 2rem` (y = 810).
- The Twig `<style>` includes `.carousel-slider .swiper:where([dir=rtl]) { padding-left: 0 }`, which makes each slide as wide as the phone. Its pause/play button comes from `home.js`.
- In the original store the second slide has an empty `mobile_bg` (the computed background is `url("")`), so it is blank on phones there too.

## 2. What was different in React (390x844, before the fix)
| Item | Original | React before |
|---|---|---|
| Slide width | full (375) | **342**, next slide peeking at the side |
| Hero top | y = 0 | **y = 20** (block wrapper margin) |
| Slide padding | 64 / 64 | 64 / **140** (bar clearance added) |
| Title position (bottom-CTA slide) | y = 353 | **y = 308-328** (shifted up ~38px) |
| Slide with no phone image | blank | blank (white text on white) |

## 3. Root causes
1. **Slide width.** The engine's carousel container (`.swiper.s-slider-container`) pads its start side by 3rem and has `margin: 0 -10px`. The Twig neutralises it only for RTL with `padding-left: 0`; that rule was not ported, so slides were 342px and the second banner showed next to the first. This is the visible "broken mobile hero".
2. **Hero not at the top.** `.s-block:first-of-type { margin-top: 1.25rem }` from the home block styles moved the hero 20px down.
3. **Text shifted up.** A previous fix kept the bottom-bar clearance as `padding-bottom` (4rem + 76px), which moved the centred text up by half the clearance on every phone.
4. **Blank slide.** A banner with no `mobile_bg` rendered no image on phones.

The earlier `100svh`, flex and CTA-width fixes were checked and are correct: heights are 100svh below `md` and 90vh above (844 / 932 / 693 measured), the CTA is 79-84x44 and centred.

## 4. Files changed
- `app/styles/04-components/tallah-home-sliders.scss`: carousel padding/margin removed for the hero in both directions; hero block margin-top 0; symmetric `padding-block: 4rem`; the bottom CTA lifted with `transform` instead of padding.
- `app/styles/04-components/tallah-home.scss`: same transform approach for `AR-Hero-2` (the old `padding-bottom` clearance removed).
- `app/components/home/ArHeroSection.tsx`: bottom CTA gets `ar-hero-slider__cta--bottom`; a banner without `mobile_bg` uses its desktop image.
- `app/components/home/ArHero2.tsx`: same phone-image fallback.
- Tests: `tests/styles/tallah-home.test.ts` (new hero rules; the AR-Hero-2 assertion that guarded the old padding now guards the transform), `tests/components/home/ArHeroSection.test.tsx` (2 new).
- The Theme Editor data, `twilight.preview.json` (md5 unchanged), the header, footer and the other sections were not touched.

## 5. Screenshots (saved by the browser tool)
- Original, 390 and 430 side by side: `C:\Users\ABDELR~1\AppData\Local\Temp\claude-chrome-screenshots-ycZjXC\screenshot-1793796697679-0.jpg`
- React before the fix (slide narrowed, second slide peeking, blank slide): `...\screenshot-1793796775242-2.jpg`
- React after the fix, 390 and 430: `...\screenshot-1793797053481-3.jpg`
Second "after" screenshot (390, slide 1, after restarting the dev server): `...screenshot-1793798648671-4.jpg`.

## 6. QA results after the fix (dev server, Chrome iframes)
| Viewport | Result |
|---|---|
| 390x844 AR | slide 375x844 at y = 0, no overflow; title y = 346 / 354 (original 353); CTA 79x44, 12px |
| 430x932 AR | slide full width, CTA lifted above the bottom bar, no overlap with the bullets or pause button |
| 375x812 AR | slide 360 (+15px scrollbar), 812 tall, padding 64 / 64, no overflow |
| 768x1024 AR | slide 753x922 (= 90vh), CTA 110x44, no overflow |
| 390 EN (LTR) | slide 375x844, no overflow (the fix works in LTR too) |
| 1536x770 AR (desktop) | section 1521x693 (= 90vh), `cover`, no overflow |
| Not measured | EN 1280 (the batch did not finish), and 1440 exactly (1536 measured) |

Mobile bottom bar: the lifted bottom CTA and bullets clear the 72px bar. Header: still `position: absolute` over the hero as in the original; its height (140px, with the store announcement bar and top strip) differs from the original's 94px, which is the header, not the hero, and was left as is.

## 7. Slider interaction results
- Bullets: clicking each bullet moves to that slide and the active bullet follows (checked with autoplay stopped).
- Pause / resume: pause stops autoplay and changes the label; the slide does not change while paused; resume restarts it and the slide advances.
- Autoplay runs by default; reduced-motion stop is the existing, tested behaviour (unit tests), not re-tested in the browser.
- After a client-side visit to a category and back: 8 blocks, the hero at its correct size, autoplay running.
- Hard refresh and a dev server restart: the hero keeps 1521x693, 2 bullets, pause control shown (after the cold start of the dev server, which takes about 40 s).

## 8. Tests
`pnpm typecheck` pass, `pnpm check:manifest` 0 errors / 0 warnings, `pnpm build` pass, `pnpm test` **720 passed, 84 files** (713 before; 7 new). No assertion weakened except the AR-Hero-2 padding one, which was replaced by its transform counterpart because the behaviour it guarded was the bug.

## 9. Remaining differences and limits
- A banner without a phone image now shows its desktop image; the original shows nothing. This is a deliberate improvement; the merchant can still set a phone image.
- Header height and the announcement bar differ from the original (outside this task).
- AR-Hero-2 was re-measured after the change (iframe 390x844, dev server restarted): banner 375x844, padding 24/8, title y = 371 and subtext y = 404 from the banner top (original: 370 and 404). The button sits 75px above the original position (701 vs 776) on purpose, to clear the 72px mobile bottom bar.
- The original reference could be compared only for the hero values listed; the original storefront data differs slightly from the local preview (the slide with the inline CTA is swapped), so positions of text were compared per slide type, not per index.
- Pixel-level comparison was not done.

## 10. Follow-up check (second pass)
- State confirmed: every fix above is in the working tree (carousel padding/margin, hero margin-top 0, symmetric padding, transform lift, phone-image fallback in both heroes); nothing was reset.
- **Spacing around the hero:** hero top = 0 with margin-top 0; the gap to the next block is 32px (`mt-8` on the next `.s-block`), the same rule as the original (`.s-block { mt-8 sm:mt-16 }`, first block `mt-0`), in both RTL and LTR at 390px. No extra white band remains above or below the hero.
- **Original storefront:** during this pass it answered with a Cloudflare "Just a moment..." challenge. I did not try to bypass it; the comparison therefore uses the values measured before (section 1) and the original SCSS.
- Dev server: restarted safely (no project file touched); preview file md5 unchanged.
- Final automated run: typecheck pass, manifest 0 errors, build pass, **720 tests passed**.

## 11. Third pass — remaining widths re-measured after the AR-Hero-2 change (dev server, single iframe each)
| Viewport | Result |
|---|---|
| 430x932 AR | slides 415x932 (full width), title y = 389 / 397 (original 397), CTA 80x44, no overflow |
| 375x812 EN (LTR) | slide 360x812 (+15px scrollbar), 8 blocks, CTA 79x44, no overflow |
| 768x1024 AR | slides 753x922 (= 90vh), `cover`, CTA 110x44, no overflow |
| 390 AR / EN, 1536 desktop | measured in the earlier passes with the same code |
Not re-measured: 1440 exactly and EN 1280 (the 1536 desktop run and the LTR phone runs cover the same rules); the original storefront was behind a Cloudflare challenge, so no new side-by-side was possible.

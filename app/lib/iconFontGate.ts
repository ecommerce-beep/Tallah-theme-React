/**
 * Keeps the icon glyphs from showing as boxes while the icon font is on its way.
 *
 * Salla's icon font (`sallaicons`) is a private-use font: every `sicon-*` icon, the Saudi riyal sign beside every price
 * included, is one character drawn by that font. Its stylesheet is loaded after the first paint (`media="print"` until
 * it arrives) and the font file only after that, with `font-display: swap`, so for the length of that second request the
 * browser draws the characters in a fallback font: empty boxes (in some browsers the character's hex code). The cart,
 * where each row has prices and the page is built after a request, shows them most.
 *
 * This script, run in the head before anything is painted, marks the page `data-icons="pending"`; `common.scss` hides the
 * glyphs (not the boxes they sit in, so nothing moves) while it stands. It is taken off as soon as the font has loaded.
 * If the font fails to load the mark goes too, so the icons show what the browser can make of them rather than staying
 * out of sight for good. There is no timer: the font's own load events decide.
 */
export const ICON_FONT_GATE = `(function(){var r=document.documentElement,f=document.fonts;if(!f||!f.addEventListener)return;function loaded(){var ok=false;f.forEach(function(x){if(String(x.family).replace(/["']/g,'')==='sallaicons'&&x.status==='loaded')ok=true});return ok}if(loaded())return;r.setAttribute('data-icons','pending');function clear(){r.removeAttribute('data-icons');f.removeEventListener('loadingdone',done);f.removeEventListener('loadingerror',clear)}function done(){if(loaded())clear()}f.addEventListener('loadingdone',done);f.addEventListener('loadingerror',clear)})();`;

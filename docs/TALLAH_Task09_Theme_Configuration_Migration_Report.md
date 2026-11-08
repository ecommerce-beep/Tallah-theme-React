# Task 09 — نقل إعدادات ثيم TALLAH (التقرير)

**حالة Cart QA السابقة:** COMPLETE WITH LIMITATIONS (731 اختباراً وقتها؛ الكوبون وإتمام الطلب الفعلي Not Verified). لم تُعَد اختباراتها.

## A. ملفات الأصل التي فُحصت
`TALLAH-fork/twilight.json` (223 حقلاً، 182 مفتاحاً فريداً)، وبحث `grep` في كل `src/` عن استهلاك كل مفتاح:
`views/pages/cart.twig`، `views/pages/product/single.twig`، `views/layouts/master.twig`، `assets/js/product.js`، `assets/js/app.js`، `views/components/home/square-photos.twig`، `views/components/home/fixed-products.twig`، `featured-products-style2.twig`، `landing-page.twig`، و`assets/styles/02-generic/common.scss`.
وفي React: `twilight.json`، `twilight.preview.json`، `locales/ar|en.json`، ومكوّنات `app/components/{cart,product,layout}`.

## B. جرد الإعدادات (مقارنة مفاتيح الأصل مع React)
المنهجية: سكربت يقارن كل `id` في المانيفست الأصلي بمانيفست React، ثم `grep` لاستهلاك كل مفتاح.

| المفتاح | الافتراضي الأصلي | النوع | حالة React قبل | المكوّن المتأثر | بعد |
|---|---|---|---|---|---|
| `features_switch_cart` | true | boolean | مفقود | صفحة السلة | **أُضيف + مُستهلَك** |
| `cart_page_features` | [] (حد 3) | collection (صورة/نص متعدد اللغات/رابط) | مفقود | صفحة السلة | **أُضيف + مُستهلَك** |
| `sticky_cart_button` | true | boolean | مفقود | زر إتمام الطلب على الجوال | **أُضيف + مُستهلَك** |
| `bg_gellary` / `bg_color_gellary` | true / #F5F6F7 | boolean / color | مفقود | معرض الصور الإضافي في PDP | **أُضيف + مُستهلَك** |
| `checkout_enable` | (قديم في React) | boolean | مسجَّل بلا تأثير | صف "اشترِ الآن" في PDP | **صار مُستهلَكاً** |
| `newsletter_url_product`, `newsletter_sp_view_modal/add_image/block_title/sub_title` | متنوعة | url/boolean/image/string | مفقودة | نافذة إشعار التوفر (PDP) | **أُضيفت للمانيفست فقط — غير مُستهلَكة** |
| `collection_sp_view_modal/add_image/block_title/sub_title/promo_title`, `collection_categories`, `collectionn_footer_image`, `collection_title` | متنوعة | متنوعة | مفقودة | النافذة التسويقية (PDP) | **أُضيفت للمانيفست فقط — غير مُستهلَكة** |
| عناوين الأقسام (`cart_settings2`, `popup-options`) | static | static | مفقودة | محرر الثيم | أُضيفت |
| `squar_photo_bg_image_size` | contain | items | مسجَّل | قسم الصور المربعة | **بلا تأثير** (مكوّن المحرك لا يقرؤه) |
| `vertical_fixed_products`, `notify_when_available_in_card` | — | boolean | مسجَّلة | المحرك يقرؤها | تعمل (من المحرك) |
| `show_selected_products`, `static-line-32`, `cart_settings`, `single-options`, `gallery-options`, `static-line2`, `product-features-options`, `arabybrand-support-card` | — | boolean/static | مفقودة | — | **لم تُنقل عمداً** (انظر H) |
| `header_is_sticky` | true | boolean | افتراضي React `false` | الهيدر | **لم يُغيَّر** (قيمة محفوظة/قرار سابق؛ تغييره قد يكسر القيم المحفوظة) |

مفاتيح موجودة في React وليست في الأصل (`header_layout`، `enable_more_menu`، `product_show_breadcrumbs`…): بقيت كما هي؛ `header_layout` يعرض خيار TALLAH فقط ولم أُعِد أي خيار Raed.

## C. الإعدادات المنقولة
أُضيفت إلى `twilight.json` بالنسخ الحرفي من الأصل (مفاتيح، افتراضيات، أنواع، شروط الظهور): **+370 سطراً، 0 حذف**. `pnpm check:manifest` ✅ (0 أخطاء/0 تحذيرات).
التنفيذ في الكود:
- `app/components/cart/CartFeatures.tsx` (جديد) + `CartPage.tsx`: شبكة المميزات (حد 3، نص حسب اللغة، رابط آمن، صورة اختيارية)، وصنف `cart-page--sticky-cta` لتثبيت الزر على الجوال فوق الشريط السفلي.
- `TallahPdpParts.tsx` + `ProductPage.tsx`: لون خلفية المعرض الإضافي.
- `AddToCartForm.tsx`: `checkout_enable` يخفي صف الشراء السريع.
- `cart.scss`: عمود جانبي 419px (`cart-page__aside`)، تثبيت الزر، شبكة المميزات.

## D. الافتراضيات والقيم المحفوظة
- لا حذف ولا إعادة تسمية لأي مفتاح؛ كل الإضافات تتبع افتراضيات الأصل، فلا تغيّر قيماً محفوظة.
- `twilight.preview.json` نُسخ احتياطياً (`../tallah-backup-task09/`)، عُدّل مؤقتاً لاختبار التأثيرات، ثم **أُعيد مطابقاً بايت ببايت** (`cmp`)؛ ما زال 46 إعداداً وبلوكات الصفحة الرئيسية الثمانية (`layout`) كما هي، ولا يزال خارج git.
- المفاتيح الجديدة غير موجودة في ملف المعاينة، فتأخذ الافتراضيات من المانيفست.

## E. الترجمة
- نص الثيم الجديد `pages.cart.features` أُضيف في `locales/ar.json` و`locales/en.json`.
- **قيد:** تسميات حقول المحرر في `twilight.json` نصوص عربية فقط (كما في الأصل)؛ صيغة المانيفست (`label` نص) لا تدعم لغتين، فلا يمكن توفير تسمية إنجليزية للحقول. لم تظهر مفاتيح ترجمة خام في المحرر (فُحص نص اللوحة).
- القيم متعددة اللغات (`cart_features_content`) تُقرأ بحسب لغة الصفحة.

## F. RTL / LTR
- العمود الجانبي يستخدم `margin-inline-start` وزر التثبيت `inset-inline` (لا left/right ثابتة).
- لم أختبر LTR لصفحة السلة بعد هذا التغيير في المتصفح → **Not Verified** (التقارير السابقة اختبرت LTR قبل إضافة العمود الجانبي).

## G. اختبار محرر الثيم والتأثير الفعلي
| الإعداد | الاختبار | النتيجة |
|---|---|---|
| لوحة الإعدادات في المحرر | فُتحت؛ ظهرت الإعدادات الجديدة بتسمياتها العربية (مميزات المتجر في السلة، تثبيت زر الإتمام، خلفية المعرض، النافذة التسويقية…)، وخيار الهيدر "طلة (TALLAH)" فقط | PASS |
| الصفحة الرئيسية في المحرر | ثمانية عناصر TALLAH كما هي | PASS |
| `cart_page_features` + `features_switch_cart` | تفعيل: ظهر عنصران ("شحن سريع لجميع المدن"، "دفع آمن") والرابط صحيح؛ إيقاف: اختفت | PASS |
| `sticky_cart_button` | مفعّل (iframe 390): الزر `fixed` على 76px فوق الشريط السفلي؛ مُوقَف: `static` وبلا الصنف | PASS |
| `bg_color_gellary` | `#FFE4E6` ← الخلفية `rgb(255,228,230)` على المعرض | PASS |
| `checkout_enable` | منطق مُغطّى بالكود فقط؛ المتجر لا يعرض الشراء السريع أصلاً | NOT VERIFIED |
| تعديل القيمة عبر واجهة المحرر نفسها ثم حفظها | عدّلتُ ملف المعاينة مباشرة (ثم استعدته) بدل التحرير عبر الواجهة | NOT VERIFIED عبر الواجهة |
| إعدادات الهيدر/الفوتر/الفئات/بطاقة المنتج | لم تُعدَّل في هذه المهمة ولم تُختبر | NOT VERIFIED |

ملاحظة: خلال الاختبار تعطّل خادم التطوير لدقائق ثم عاد؛ ولوحظ أن معاينة المحرر على الجوال أظهرت مرة خطأ CSS من تعديلي (`@apply sticky` دائري) — **أُصلح** (استبداله بـ `position: sticky`).

## H. القيود التقنية
1. **نوافذ المنتج التسويقية** (إشعار توفر المنتج + العرض حسب التصنيف): مفاتيحها منقولة للمانيفست لتبقى القيم متوافقة، **لكن لا يوجد مكوّن React يعرض النافذة** (في الأصل مبنية بـ JavaScript في `product.js` مع نموذج بريد ومنطق "لا تذكّرني"). هذا يحتاج مهمة مستقلة.
2. `squar_photo_bg_image_size`: مسجَّل لكن مكوّن `SquarePhotos` في المحرك لا يطبّقه؛ التطبيق يحتاج fork للمكوّن.
3. `features: component-featured-products` موجود في الأصل وغائب في React (قرار سابق للتوافق مع المحرك).
4. `show_selected_products` معلَن في الأصل ولا يُستهلَك في أي Twig/JS؛ لم يُنقل.
5. شبكة مميزات السلة تظهر كبطاقة تحت صندوق الملخص لا داخله (الملخص مكوّن المحرك ولا يمكن إدخال محتوى في منتصفه دون fork).
6. `bg_gellary`: في Twig الأصلي لا يُقرأ فعلياً (الشرط على `bg_color`)؛ طبّقتُ المعنى المقصود: إيقافه يُرجع اللون الافتراضي.
7. حقل التاريخ (عدّاد الهيدر) في React نصّي — كما في مهمة سابقة، لا تغيير.

## I. الاختبارات الآلية
- `pnpm typecheck` ✅
- `pnpm check:manifest` ✅ (0/0)
- `pnpm build` ✅
- `pnpm test` ✅ **744/744** (كانت 731): جديدها `tests/config/themeManifest.test.ts` (مفاتيح/افتراضيات/شروط/ترجمة/خروج المعاينة من git/قارئ المميزات) و`tests/components/cart/CartPageSettings.test.tsx` (الصنف الثابت وظهور/إخفاء المميزات).

## J. المشاكل المتبقية
| الخطورة | المشكلة |
|---|---|
| High | نوافذ المنتج التسويقية: إعدادات منقولة لكن بلا مكوّن يستهلكها |
| Medium | `squar_photo_bg_image_size` بلا تأثير؛ تسميات المحرر بالعربية فقط؛ LTR لصفحة السلة بعد العمود الجانبي لم يُختبر؛ `checkout_enable` لم يُختبر في المتصفح |
| Low | المميزات خارج بطاقة الملخص؛ تعديل الإعدادات عبر واجهة المحرر نفسها لم يُجرَّب |

## K. حالة الإكمال
**PARTIALLY COMPLETE** — نُقلت كل إعدادات الأصل المستخدمة وفُعّلت إعدادات السلة والمعرض و`checkout_enable`؛ تبقى النوافذ التسويقية و`squar_photo_bg_image_size` بلا استهلاك.

## L. الخطوة التالية
**Theme Configuration & Editor Settings Self-QA.** لم أبدأها.

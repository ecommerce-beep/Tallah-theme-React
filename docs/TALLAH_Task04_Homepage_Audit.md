# Task 04: جرد الصفحة الرئيسية وخطة الترحيل

> مرحلة الجرد فقط. لم يُعدَّل أي مكوّن من الصفحة الرئيسية.
> المراجع: `C:\Users\abdelrahman\Desktop\arabybrand\TALLAH-fork` (المصدر الفعلي، مستودع git)، والمتجر الحي `demostore.salla.sa/ar/dev-ff8tnndomnlqddrf`، والمعاينة المحلية `localhost:5173/dev-vgckq3fssfhjewwi`.
> المسارات بالنسبة لـ `TALLAH-fork/src` ما لم يُذكر غير ذلك.

## 0) ملاحظات حاسمة قبل البدء

1. **مرجع Task 03 كان `TALLAH-master.zip` وليس `TALLAH-fork`.** الـ fork فيه إصلاحات أحدث (a11y وأمان) ولا يطابق الـ zip. الفروق في ملفات Task 03 (بعد تجاهل نهايات الأسطر):
   - `header.twig`: 46 سطرًا. أبرزها إخفاء العد التنازلي عند غياب التاريخ، وأسماء `aria-label`، و`alt=""` بدل اسم المتجر.
   - `footer.twig`: 15 سطرًا.
   - `custom-search-panel.js`: 227 سطرًا.
   - `custom-top-nav.js`: 22 سطرًا.
   - `master.twig`: 22 سطرًا.
   - الـ manifest: إعدادان إضافيان في الـ fork (`arabybrand-support-card` و`search-popular-section-title`).
   - **التوصية:** مراجعة فروق الهيدر والفوتر (قراءة فقط) قبل الإقفال النهائي لـ Task 03. لم أعدّل أي شيء فيهما.
2. **كل مقارنات هذا التقرير مبنية على الـ fork.** عند الاختلاف أعتمد الـ fork.
3. **الصفحة الرئيسية الحالية في React هي صفحة Raed**، وليست طلة. المعاينة المحلية تحمل بيانات Raed التجريبية في `twilight.preview.json` (`layout`)، والكتل السبع المخصصة لطلة غير موجودة.

## A) جرد الصفحة الرئيسية الأصلية

### كتل المتجر الحي (بالترتيب، عرض 1536)

| # | الصنف | العنوان الظاهر | الارتفاع |
|---|---|---|---|
| 0 | `AR-slider-hero-section` | اكتشف الفخامة الخالدة | 743 |
| 1 | `AR-products products-slider` | القطع المفضّلة عند الجميع | 744 |
| 2 | `Ar-special-banner` | تشكيلة الشتاء | 1414 (يشمل الكتلة 3 بسبب وسم غير مغلق في الأصل) |
| 3 | `Ar-products-banner` | أستايل بلا مجهود، مختار خصيصًا | 714 |
| 4 | `AR-hero-section` | عروض حصرية لك | 743 |
| 5 | `AR-promo-banner` | ستايل سهل وأنيق، مختار بعناية | 714 |
| 6 | `Ar-special-banner` | الأساسيات الراقية | 1838 |
| 7 | `AR-testimonials` | (بدون عنوان) | 689 |

المتجر الحي يستعمل 7 أنواع `AR-*` كلها، وليس فيه كتل Raed الافتراضية.

### كتل مخصصة لطلة (7)

| الكتلة | ملف Twig | الغرض | الإعدادات (`twilight.json`) | التفاعلات |
|---|---|---|---|---|
| `home.AR-Hero-section` | `AR-Hero-section.twig` + `home.js` | بانر رئيسي متحرك | مجموعة `banner` (2-5 بانرات): صورة سطح مكتب وجوال، محاذاة أفقية وعمودية، عنوان ونص ولون كل منهما، زر (نص ولون وخلفية وشفاف وفي الأسفل)، رابط | سلايدر Swiper بـ parallax وتقسيم شريطي، تمرير تلقائي كل 2 ثانية، توقف عند hover. الـ fork يضيف زر إيقاف/تشغيل (WCAG 2.2.2)، و`prefers-reduced-motion`، وشبكة سوداء 40% على الجوال، ويعطّل التمرير عند بانر واحد |
| `home.AR-Hero-2` | `AR-Hero-2.twig` | بانر رئيسي ثابت | خلفية سطح مكتب وجوال، محاذاة، عنوان ونص وألوانهما، زر وألوانه وشفاف وفي الأسفل، رابط | ارتفاع `90vh` (`100svh` على الجوال)، الزر يتحول عند hover، والبانر كله رابط إن لم يوجد زر |
| `home.AR-special-banner` | `AR-special-banner.twig` | بانران متجاوران | `center_text` + مجموعة `banner`: خلفية سطح مكتب وجوال، عنوان ونص وألوانهما، زر وألوانه وشفاف، رابط | نصفان على سطح المكتب وعموديان على الجوال، النص أسفل البانر |
| `home.Ar-Promo-banner` | `Ar-Promo-banner.twig` | بانر ترويجي بصورة | صورة، عنوان ولونه، نص ولونه، رابط ولون النص | لا شيء (CSS) |
| `home.AR-Products-banner` | `AR-Products-banner.twig` (189 سطرًا) | صورة جانبية مع سلايدر منتجات | صورة، عنوان ولونه، رابط ولونه، `source_type`، `categories`، `products` | شبكة 3 أعمدة: سلايدر 2 منتج + صورة. أسهم للجوال وللسطح. `salla-products-slider` |
| `home.AR_our_products` | `AR_our_products.twig` (152 سطرًا) | منتجاتنا | عنوان وعنوان فرعي ورابط، `source_type`، تصنيف أو منتجات يدوية، `grid_cols_number` (3-4) | قائمة منتجات `salla-products-list` أو سلايدر. حركات `data-sal` |
| `home.AR-Custom-testimonials` | `AR-Custom-testimonials.twig` | آراء بصور | عنوان ولونه، نص ولونه، رابط، مجموعة `testimonials`: صورة، اسم المنتج، تقييم 1-5 (`slider`)، نص الرأي، ألوانها | سلايدر 1.5 إلى 4 بطاقات حسب العرض، `salla-rating-stars` |

### كتل Raed المضمّنة في manifest الأصل (6)

| الكتلة | ملف Twig | الغرض |
|---|---|---|
| `home.enhanced-slider` | `enhanced-slider.twig` | سلايدر صور |
| `home.main-links` | `main-links.twig` | روابط وتصنيفات سريعة |
| `home.slider-products-with-header` | `slider-products-with-header.twig` | منتجات متحركة مع خلفية |
| `home.enhanced-square-banners` | `enhanced-square-banners.twig` | بانرات مربعة |
| `home.brands` | `brands.twig` | الماركات |
| `home.custom-testimonials` | `custom-testimonials.twig` | آراء مخصصة |

### كتل المنصة الافتراضية (حسب `features`، بلا حقول في manifest)

`photos-slider`، `fixed-banner`، `fixed-products`، `products-slider`، `testimonials`، `square-photos`، `store-features`، `youtube`، `parallax-background`، وملفات `featured-products-style1/2/3` و`latest-products` الموجودة في الثيم. لكل منها ملف Twig في الأصل. `home.js` يحتوي أيضًا على تبويبات المنتجات المميزة (`initFeaturedTabs`).

### ما لا أعرفه
- لا يظهر في المتجر الحي أي من الكتل الافتراضية، فسلوكها بصريًا في طلة لم يُرَ.
- كتل الجوال والتابلت في المتجر الحي لم تُلتقط (لا أستطيع تغيير عرض نافذة المتصفح، والأصل على نطاق آخر ولا يُحمَّل داخل iframe).

## B) حالة الترحيل في React

الـ route: `app/routes/index.tsx` (مولَّد تلقائيًا، يستعمل `Home` من المحرك). التسجيل: `app/router.tsx` بـ `registerHomeComponents({...DefaultHomeComponents, ...})` و`registerHomeComponentConfig`. المكوّنات: `app/components/home/`. لكل كتلة منها ملف اختبار في `tests/components/home/`.

| الكتلة | التنفيذ الحالي | الحالة | المتبقي |
|---|---|---|---|
| `AR-Hero-section` | لا يوجد | ناقص | مكوّن جديد + manifest + تسجيل + زر الإيقاف + شبكة الجوال |
| `AR-Hero-2` | `ArHero2.tsx` | **منفَّذ (اكتمل واختُبر)** | لا شيء. انظر القسم G |
| `AR-special-banner` | لا يوجد | ناقص | مكوّن جديد + manifest + تسجيل |
| `Ar-Promo-banner` | لا يوجد | ناقص | مكوّن جديد + manifest + تسجيل |
| `AR-Products-banner` | لا يوجد | ناقص | مكوّن جديد + سلايدر منتجات وأسهم RTL/LTR |
| `AR_our_products` | لا يوجد | ناقص | مكوّن جديد + قائمة/سلايدر + `source_type` |
| `AR-Custom-testimonials` | لا يوجد | ناقص | مكوّن جديد + سلايدر وتقييم |
| `enhanced-slider` | `EnhancedSlider.tsx` (308 سطرًا) | موجود (منقول من Raed) | مقارنة بصرية مع طلة. حقول manifest أكثر من الأصل (`in_container`، `auto_play`، فيديو، زر) |
| `main-links` | `MainLinks.tsx` | موجود | مقارنة بصرية |
| `slider-products-with-header` | `SliderProductsWithHeader.tsx` | موجود | مقارنة بصرية |
| `enhanced-square-banners` | `EnhancedSquareBanners.tsx` | موجود | مقارنة بصرية |
| `brands` | `Brands.tsx` | موجود | مقارنة بصرية |
| `custom-testimonials` | `CustomTestimonials.tsx` (35 سطرًا) | موجود | مقارنة بصرية |
| `photos-slider` / `products-slider` / `fixed-products` | مستبدلة في `router.tsx` | موجود | مقارنة بصرية |
| `featured-products` (+ `special-offer`، `special-product`) | `FeaturedProducts.tsx` (438 سطرًا) | موجود لكنه **غير موجود في manifest الأصل** | قرار: إبقاء أم إزالة (انظر C) |
| `photos-slider-with-text` | `PhotosSliderWithText.tsx` | موجود لكنه غير موجود في الأصل | قرار |
| `blog` | `Blog.tsx` | موجود لكنه غير موجود في الأصل | قرار |
| `fixed-banner`، `store-features`، `youtube`، `square-photos`، `parallax-background`، `latest-products`، `testimonial` | من `DefaultHomeComponents` في المحرك | متاحة من المحرك | تحتاج فحصًا بصريًا وتنسيقًا. لم أفحصها في المتصفح |
| بطاقة المنتج | `ProductCard.tsx` (غلاف فوق بطاقة المحرك) | **لا تطابق بطاقة طلة** | انظر D |

كل ما سبق مبني على قراءة الكود والـ manifest، وليس على مقارنة بصرية، إلا ما ذُكر في D.

## C) توافق محرر الثيم

### المكوّنات الستة المشتركة (Raed)
- **مدعومة بالكامل على مستوى المعرّفات:** كل حقل في الـ fork موجود في React. نسخة React فيها حقول زائدة فقط (`in_container`، `auto_play`، `video`، `btnname`، `without_overlay`، `links.image`، ملاحظات).
- **القيم الافتراضية والشروط والإلزام:** متطابقة في 4 كتل. اختلافان فقط:
  - `enhanced-slider.slides`: القيمة الافتراضية للمجموعة.
  - `brands.title`: في الأصل قيمة متعددة اللغات `{ar, en}`، وفي React نص عربي فقط.
- `key` و`icon` و`image` موجودة في الستة.

### الكتل السبع الناقصة
- **غير مدعومة (ليست في manifest React):** `AR-Hero-section` و`AR-Hero-2` و`AR-special-banner` و`Ar-Promo-banner` و`AR-Products-banner` و`AR_our_products` و`AR-Custom-testimonials`. المجموع 7 كتل: 80 حقلًا (تشمل الحقول الفرعية)، منها 3 مجموعات (`banner` مرتان و`testimonials`).
- **عيوب في manifest الأصل** تحتاج قرارًا قبل النقل:
  - `AR_our_products`: شرط يعتمد على حقل غير موجود `is_moving`. والـ Twig يقرأ `is_moving` و`isp_autoPlay` و`center_block_ttitle` و`enable_controls` وكلها غير معرّفة، فكتلة السلايدر لا تُفعَّل أبدًا.
  - `Ar-Promo-banner`: شرط على حقل غير موجود `component_type`.
  - `AR-Hero-2`: شرط على حقل غير موجود `use_custom_colors`.
  - الشرط على حقل غير موجود لا يتحقق، فالحقول المقيَّدة به لا تظهر للتاجر في المحرر.
- **قيود المجموعات:** مجموعة بانرات الـ Hero فيها `minLength: 2` و`maxLength: 5` (مكتوبة كنص).
- **كتل في React ليست في الأصل:** `featured-products` والنوعان الآخران، `photos-slider-with-text`، `blog`. إبقاؤها يعني أن التاجر يرى كتلًا لم تكن في طلة.

### قابلية الإضافة والحذف والترتيب في محرر Salla
مصدر ذلك المحرر نفسه عبر `twilight.json`، لكني لم أختبره على محرر Salla الحقيقي. اختبرت المحرر المحلي فقط ولم أضف كتلة منه.

### إعدادات متعلقة بالبطاقة والصفحة الرئيسية (الأصل غير موجود في React)
`product_card_options` و`product_card_options_image` غير موجودين في manifest React. يقرؤهما `partials/product-card.js` في الأصل لإظهار خيارات المنتج داخل البطاقة.

## D) الفروق البصرية

مقارنة المتجر الحي مع المعاينة المحلية على سطح المكتب فقط (1536). تابلت (768) وجوال (390) **Not Verified**.

| الفرق | السبب | التصنيف |
|---|---|---|
| كتل الصفحة (7 مخصصة مقابل بيانات Raed) | المعاينة المحلية تحمل تخطيط Raed التجريبي | بيانات (ليس خللًا) + ناقص تنفيذ |
| بطاقة المنتج: الأصل بلا زر "أضف للسلة" ظاهر، مع تصنيف صغير فوق الاسم وشارة خصم وحواف مستقيمة. React: زر أحمر "أضف إلى السلة" وقلب المفضلة | بطاقة React هي بطاقة Raed. الأصل يبني بطاقته في `product-card.js` (≈650 سطرًا) و`AR_product_card.scss` (551 سطرًا): صورة خلفية عند hover، وزر عائم، وعين المعاينة، وخط خصم قطري | تنفيذ ناقص (C) |
| الخط والألوان الأساسية | إعدادات المتجر (`fonts` و`color`) | إعداد متجر |
| شريط التمرير في Hero | الأصل بثلاثة أشرطة تقسيم رفيعة | تنفيذ ناقص (الكتلة غير موجودة) |

لم أقارن: المسافات بين الكتل، وأحجام الخطوط في الكتل، وأحجام الصور.

## E) ترتيب التنفيذ المقترح

التعقيد نسبي (Low / Medium / High). كل كتلة تُنفَّذ وتُختبر وحدها.

| # | العمل | التعقيد | السبب |
|---|---|---|---|
| 0 | حسم القرارات: (1) اعتماد الـ fork وإعادة قياس فروق Task 03؛ (2) إبقاء كتل React الإضافية أم لا؛ (3) معالجة الشروط المعلّقة (`is_moving` و`component_type` و`use_custom_colors`) | Low | تمنع إعادة العمل |
| 1 | `AR-Hero-2` + استخراج أجزاء مشتركة (زر البانر، ألوان العنوان والنص عبر متغيرات CSS بدل وسم `<style>`، محاذاة النص، خلفية سطح مكتب/جوال) | Low | أبسط كتلة وبدون سلايدر، وتثبّت عقد البيانات |
| 2 | `Ar-Promo-banner` | Low | نفس الأجزاء المشتركة |
| 3 | `AR-special-banner` | Medium | مجموعة بانرات وتخطيط متجاور |
| 4 | `AR-Hero-section` | Medium | سلايدر + زر الإيقاف + `prefers-reduced-motion` + شبكة الجوال. أعلى ظهورًا في الصفحة |
| 5 | `AR-Custom-testimonials` | Medium | سلايدر وتقييم نجوم وألوان لكل عنصر |
| 6 | بطاقة المنتج بطلة (`product:card`) | High | تعتمد عليها كتل المنتجات وبقية الصفحات. تُنفَّذ قبل أو مع كتل المنتجات |
| 7 | `AR_our_products` | Medium | مصادر المنتجات والقائمة |
| 8 | `AR-Products-banner` | High | شبكة 3 أعمدة، وأسهم RTL/LTR، وسلايدر 2 منتج |
| 9 | فحص بصري للكتل الستة المشتركة والكتل الافتراضية في المحرك وتعديل الأنماط عند الحاجة | Medium | بعد اكتمال الكتل المخصصة |

## F) أول كتلة مقترحة: `AR-Hero-2`

**لماذا:** هي الأبسط (Low) وبلا سلايدر ولا منتجات، وتؤسس الأجزاء التي تعتمد عليها بقية الكتل المخصصة (الزر، وألوان العنوان والنص، والمحاذاة، وخلفيتا سطح المكتب والجوال). بعدها مباشرة `Ar-Promo-banner` و`AR-special-banner` و`AR-Hero-section` بجهد أقل.

**الملفات:**
- `app/components/home/ArHero2.tsx` (جديد) و`app/components/home/index.ts` (تصدير).
- `app/router.tsx`: تسجيل المفتاح `'AR-Hero-2'` (يطابق `path` بعد حذف `home.`، مع مراعاة حالة الأحرف).
- `twilight.json`: إضافة المكوّن من الـ fork، بتعديل الشرط المعلّق `use_custom_colors`.
- `app/styles/04-components/` (ملف جديد للكتل المخصصة) + استيراده في `app.scss`.
- `tests/components/home/ArHero2.test.tsx`.
- `twilight.preview.json` (`layout`): إدخال تجريبي للمعاينة، ويُستعاد بعد الاختبار.

**الاعتماديات:** `Link` و`Image` من `@salla.sa/twilight-theme-engine/common`، وقراءة ألوان المحرر. لا حاجة لمكتبات جديدة. الصور تأتي من حقول المحرر، فلا بيانات وهمية.

**نقاط تحتاج حذرًا:**
- وسم `<style>` المضمّن في Twig لا يصلح في React كما هو: يُستبدل بمتغيرات CSS على العنصر.
- `data-swiper-parallax` يرتبط بـ Swiper، فلا يُنقل إلى كتلة ثابتة.
- في الـ fork `h2` بدل `h1`، وعنصر الرابط الكامل يحمل `aria-label`.

## غير مُتحقَّق منه
- أي كتلة في Raed أو المنصة على الجوال والتابلت، ومقارنة المسافات والخطوط.
- سلوك محرر Salla الحقيقي (إضافة الكتل وحذفها وإعادة ترتيبها وتحميل `twilight.json`).
- فروق الهيدر والفوتر بين الـ fork والـ zip (قراءة فقط، مُبلَّغ عنها في القسم 0).
- كتل المنصة الافتراضية في المتجر المحلي.

## G) تحديث بعد مراجعة `TALLAH-fork` وتنفيذ `AR-Hero-2`

### تصحيحات على الجرد بعد قراءة الـ fork مباشرة
- المتجر الحي `demostore.salla.sa` يعمل بنسخة **أقدم** من الـ fork: عنوان البانر فيه `<h1>` بينما الـ fork `<h2>`، ولا توجد طبقة الجوال السوداء (scrim). عند التعارض اعتمدت الـ fork.
- الفروق بين الـ fork والـ zip في كتل الصفحة الرئيسية (إمكانية الوصول فقط): `AR-Hero-section` (58 سطرًا: زر الإيقاف وscrim)، و`AR-Hero-2` (19)، وأربع كتل بفروق من 2 إلى 6 أسطر. لا فروق في الحقول سوى إعداد الهيدر المذكورين في القسم 0.
- فروق الهيدر والفوتر في الـ fork (مراجعة قراءة فقط): `aria-label` للبحث والسلة، ونص بديل للشعار، وإخفاء العد التنازلي عند غياب التاريخ أو عدم صحته، وزر بدل رابط لشهادة الضريبة مع نافذة، ودعم لوحة المفاتيح في اقتراحات البحث (combobox). **كلها موجودة في React** (`useCountdown` و`SearchPanel` و`TaxNumber`). لا تراجع حرج في Task 03.
- الإعداد `arabybrand-support-card` في الـ fork بطاقة دعم ثابتة (HTML) في المحرر، وليست إعدادًا وظيفيًا. لم تُنقل. القرار للتاجر/الفريق.

### `AR-Hero-2`: ما نُفِّذ
- المكوّن: `app/components/home/ArHero2.tsx` (مسجّل بالمفتاح `AR-Hero-2` في `app/router.tsx` مع حجز ارتفاع `90vh`).
- الأنماط: `app/styles/04-components/tallah-home.scss` (ألوان وخلفيات كمتغيرات CSS بدل وسم `<style>`).
- الـ manifest: المكوّن مُضاف من الـ fork بنفس `key` وكل حقوله الـ13 وقيمه.
- أدوات مساعدة: `dropdownSetting` و`linkSetting` في `app/lib/localizedSetting.ts`.
- اختبارات: `tests/components/home/ArHero2.test.tsx` (11) وإضافة في `tests/lib/localizedSetting.test.ts`.

### انحرافات مقصودة عن الأصل (موثّقة)
1. **شرط `use_custom_colors` المعلّق حُذف** من حقول الألوان الأربعة، فتظهر للتاجر في المحرر. في الأصل لم تكن تظهر أبدًا. الألوان مطبَّقة في الأصل دائمًا، فلا تغيير في العرض.
2. **الحقل `button_bottom` محفوظ في الـ manifest لكن لا أثر له**، كما في Twig الأصل (الزر دائمًا في الأسفل).
3. **لا يُرسم رابط فارغ** عندما لا يوجد زر ولا رابط (الأصل يرسم `href=""` يعيد تحميل الصفحة).
4. **حشوة سفلية على الجوال** (76px + المساحة الآمنة) حتى لا يغطي الشريط السفلي للثيم (`.mobile-bottom-bar`) الزر. الأصل بلا هذا الشريط. هذا انحراف تكاملي ويمكن إلغاؤه بسطر واحد.
5. `data-swiper-parallax` لم يُنقل (لا Swiper في هذه الكتلة).

<div dir="rtl">

# خريطة ترحيل المكونات من Twig إلى React

> مسارات Twig نسبية إلى `C:\Users\abdelrahman\Desktop\arabybrand\TALLAH-fork\src` (قراءة فقط).
> مسارات React نسبية إلى `app/`. دراسة الترحيل التفصيلية في `arabybrand\TALLAH_Migration_Research.md` ولا تتكرر هنا.
> المقصود بـ«الاستراتيجية»: **Engine** (يكفي المحرك)، **Override** (استبدال عبر registry أو Fork)، **Wrapper** (مكوّن `twilight-components-react`)، **Custom** (مكوّن من الصفر).

## ١. المرحلة والأولويات

| المرحلة | المحتوى |
| --- | --- |
| مهمة ٣ (بعد Self-QA) | الهيدر والفوتر وDesign Tokens |
| مرحلة ٤ | بلوكات الرئيسية وبطاقة المنتج |
| مرحلة ٥ | المنتج والسلة والتصنيفات والبحث |
| مرحلة ٦ | صفحات العميل والمدونة والبقية |

## ٢. التخطيط والعناصر العامة (مهمة ٣)

| المكوّن | مكانه في Twig | مكانه المقترح في React | بديل المحرك | الاستراتيجية | إعادة كتابة؟ | ملاحظات |
| --- | --- | --- | --- | --- | --- | --- |
| Master Layout | `views/layouts/master.twig` | `components/layout/ThemeLayout.tsx` (موجود) و`routes/__root.tsx` | `MasterLayout` | Override قائم | جزئيًا | يحتوي المودالات العامة؛ يضبط نسبة صورة البطاقة من الإعداد |
| الهيدر | `views/components/header/header.twig` (43KB) | `components/layout/Header*.tsx` (موجود من Raed) | `Header` | Override قائم | نعم، لتطابق هوية طلة | يحوي topnav وmain menu وبحث وحساب؛ إعدادات `header_layout` و`enable_more_menu` في `twilight.json`. JS القديم: `custom-menu*.js` و`custom-search-panel.js` و`custom-top-nav.js` |
| قائمة الجوال والشريط السفلي | `custom-menu-mobile.js` | `MobileBottomBar.tsx` و`MobileAccountSheet.tsx` و`MobilePageTitleBar.tsx` (موجودة) | لا | Custom قائم | مراجعة | لا يوجد ما يقابلها في Twig بالشكل نفسه؛ قرار تصميم في مهمة ٣ |
| الفوتر | `views/components/footer/footer.twig` | `Footer` من المحرك (مستخدم في `ThemeLayout`)؛ Fork مستقبلي في `components/layout/Footer.tsx` إن لزم | `Footer` | Engine الآن، Override لاحقًا | يُحسم في مهمة ٣ | الأنماط في `styles/04-components/footer.scss`؛ النشرة البريدية في `pages/partials/newslatter.twig` |
| Design Tokens | `assets/styles/01-settings/*` | `styles/01-settings/global.scss` + `tailwind.config.cjs` + إعدادات `color` و`fonts` | `@salla.sa/twilight-tailwind-theme` | Custom | نقل انتقائي | بنية SCSS الحالية تطابق Twig (01 إلى 05)، فالنقل ممكن ملفًا بملف |
| الأيقونات | قوالب Twig + `sicon` | `components/icons.tsx` | مكتبة `sicon` | Custom قائم | لا | |
| الترجمة | `locales/ar.json`, `en.json` | `locales/ar.json`, `en.json` | مفاتيح النظام | Custom | دمج المفاتيح | تُكتب بالعربية والإنجليزية معًا |
| إعدادات الثيم | `twilight.json` | `twilight.json` | — | Custom | مقارنة | يوجد `TALLAH_Settings_Inventory.csv` في `arabybrand` لتحديد المفقود. تذكير: `pnpm check:manifest` بعد كل تعديل |

## ٣. الرئيسية والبلوكات (مرحلة ٤)

بلوكات Twig في `views/components/home/`. المقابل في React داخل `components/home/` ومسجل في `router.tsx`.

| بلوك Twig | مقابل React | الاستراتيجية | ملاحظات |
| --- | --- | --- | --- |
| `enhanced-slider` | `EnhancedSlider.tsx` | Override قائم | |
| `main-links` / `square-links` | `MainLinks.tsx` | Override قائم | |
| `featured-products-style1/2/3` | `FeaturedProducts.tsx` | Override قائم | يجب تسجيل `styleN` بالصيغتين |
| `products-slider` | `ProductsSlider.tsx` | Override قائم | |
| `photos-slider` | `PhotosSlider.tsx` و`PhotosSliderWithText.tsx` | Override قائم | |
| `fixed-products` | `FixedProducts.tsx` | Override قائم (Fork) | |
| `slider-products-with-header` | `SliderProductsWithHeader.tsx` | Override قائم | |
| `enhanced-square-banners` | `EnhancedSquareBanners.tsx` | Override قائم | |
| `brands` | `Brands.tsx` | Override قائم | |
| `custom-testimonials` | `CustomTestimonials.tsx` | Override قائم | |
| `testimonials` | `TestimonialsCarousel` في `common/` + المحرك | Engine/Override | |
| blog (بلوك الرئيسية) | `Blog.tsx` | Override قائم | |
| `fixed-banner`, `parallax-background`, `store-features`, `youtube`, `square-photos`, `latest-products` | لا يوجد في الثيم | Engine | تأكد في Self-QA أن مفاتيحها في `DefaultHomeComponents` |
| بلوكات طلة المخصصة: `AR-Hero-2`, `AR-Hero-section`, `AR-Products-banner`, `Ar-Promo-banner`, `AR-special-banner`, `AR_our_products`, `AR-Custom-testimonials` | لا يوجد | Custom | **جديدة بالكامل ولا مقابل جاهز لها.** تحتاج مراجعة تصميم، ثم بلوك + إدخال في `twilight.json` + تسجيل. هذه أكبر فجوة ترحيل |

## ٤. المنتج والتصنيفات والسلة (مرحلة ٥)

| المكوّن | Twig | React | الاستراتيجية | ملاحظات |
| --- | --- | --- | --- | --- |
| بطاقة المنتج | `assets/js/partials/product-card.js` + `salla-product-card` | `components/product/ProductCard.tsx` | Override | تذكير: `registry.register` ثم `registry.override` لمفتاح `product:card`. يُتحقق منه في Self-QA |
| صفحة المنتج | `pages/product/single.twig` (62KB) | `ProductPage.tsx` وDetails وGallery وAddToCartForm | Override (Fork) | الخيارات والشريط اللاصق والحجوزات في `pages/partials/product/*` تقابل `AddToCartForm.tsx`؛ `eye-model.js` وimage-zoom قد تحتاج بديلًا |
| قائمة المنتجات / التصنيف | `pages/product/index.twig` | `ProductListPage.tsx` | Override (Fork) | الفلاتر من المحرك |
| السلة | `pages/cart.twig` (42KB) | `CartPage.tsx` و`CartItem.tsx` | Override (Fork) | خيارات المنتج في `partials/cart_options.twig` |
| تنبيه الإضافة للسلة | — | `AddProductToast.tsx` | Custom قائم (Hook) | |
| قلب المفضلة | `wishlist-card.js` | `WishlistHeartButton.tsx` | Custom قائم | |
| درج السلة (Cart Drawer) | داخل `header.twig` | ضمن `Header*.tsx` | يُحسم في مهمة ٣ | **غير محسوم:** هل يوجد Drawer مستقل أم يكتفى بصفحة السلة |
| البحث | `custom-search-panel.js` | لوحة في الهيدر + مسار `/search` من المحرك | Engine + Custom | |

## ٥. العميل والمدونة والبقية (مرحلة ٦)

| المكوّن | Twig | React | الاستراتيجية | ملاحظات |
| --- | --- | --- | --- | --- |
| الحساب (Profile, Orders, Wishlist, Wallet, Notifications) | `pages/customer/*` + `layouts/customer.twig` | `routes/account.*` (المحرك) | Engine | الطلب المفرد (45KB في Twig) يحوي منطقًا مخصصًا، يُراجع قبل الاعتماد على المحرك |
| الشكر | `pages/thank-you.twig` | `routes/thankyou.$orderId.tsx` | Engine | أنماطه موجودة |
| المدونة | `pages/blog/*` | `routes/blog*.tsx` | Engine | |
| الماركات | `pages/brands/*` | `routes/brands.tsx` وغيره | Engine | |
| الولاء | `pages/loyalty.twig` | `routes/loyalty*.tsx` | Engine | `styles/04-components/loyalty.scss` موجود |
| آراء العملاء | `pages/testimonials.twig` | `routes/testimonials.tsx` | Engine | |
| صفحة معلومات | `pages/page-single.twig` | `PageSingle.tsx` | Override قائم | |
| صفحة هبوط | `pages/landing-page.twig` | لا يوجد | غير محسوم | يُحسم مع المدير |

## ٦. ما يمكن إعادة استخدامه وما يحتاج إعادة بناء

- **يُعاد استخدامه كما هو:** بنية الأنماط (ITCSS)، وبلوكات الرئيسية المسجلة، وForks المنتج والسلة والقائمة، والاختبارات (436 اختبارًا).
- **يحتاج إعادة بناء بهوية طلة:** الهيدر والفوتر، والـDesign Tokens، وبلوكات `AR-*` الخاصة، وأنماط الصفحات.
- **يعتمد على قرار:** صفحة الهبوط، وCart Drawer، وبقايا Raed في `twilight.json` و`FORKS.md`.

## ٧. اعتماديات تقنية

- كل Fork جديد يُسجَّل في `FORKS.md` مع Base الإصدار.
- أي إعداد تاجر جديد يلزمه `twilight.json` ثم `pnpm check:manifest`.
- السكربتات القديمة (`app.js`, `home.js` ...) لا تُنقل؛ منطقها يقابله React وhooks المحرك.

</div>
